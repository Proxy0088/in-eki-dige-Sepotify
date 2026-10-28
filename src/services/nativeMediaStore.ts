import { registerPlugin, Capacitor } from '@capacitor/core';
import { Track } from '../types/music';
import { ID3Parser } from './id3Parser';
import { IndexedDbAudioService } from './indexedDbAudio';

export interface NativeAudioItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in milliseconds or seconds
  uri: string;      // content:// or file://
  albumArtUri?: string;
}

export interface MediaStorePlugin {
  checkPermissions(): Promise<{ audio: 'granted' | 'denied' | 'prompt' }>;
  requestPermissions(): Promise<{ audio: 'granted' | 'denied' | 'prompt' }>;
  queryAudioFiles(): Promise<{ tracks: NativeAudioItem[] }>;
}

const NativeMediaStore = registerPlugin<MediaStorePlugin>('MediaStorePlugin');

export class NativeAudioScanner {
  public static isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  // Check storage / audio permissions
  public static async checkPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    if (this.isNativeAndroid()) {
      try {
        const res = await NativeMediaStore.checkPermissions();
        return res.audio;
      } catch (e) {
        console.warn('Native checkPermissions error:', e);
        return 'prompt';
      }
    }
    return 'granted';
  }

  // Request audio read permission
  public static async requestPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    if (this.isNativeAndroid()) {
      try {
        const res = await NativeMediaStore.requestPermissions();
        return res.audio;
      } catch (e) {
        console.warn('Native requestPermissions error:', e);
        return 'denied';
      }
    }
    return 'granted';
  }

  // Scan real audio files from Android MediaStore or Web File API
  public static async scanDeviceAudio(): Promise<{ tracks: Track[]; error?: string; permissionDenied?: boolean }> {
    if (this.isNativeAndroid()) {
      try {
        const perm = await this.requestPermissions();
        if (perm === 'denied') {
          return { tracks: [], permissionDenied: true, error: 'مجوز دسترسی به فایل‌های صوتی داده نشد' };
        }

        const res = await NativeMediaStore.queryAudioFiles();
        if (res && res.tracks && res.tracks.length > 0) {
          const mapped: Track[] = res.tracks.map((t) => ({
            id: `android-media-${t.id}`,
            title: t.title || 'Unknown Title',
            artist: t.artist || 'Unknown Artist',
            album: t.album || 'Phone Storage',
            duration: t.duration > 1000 ? Math.round(t.duration / 1000) : Math.round(t.duration),
            url: Capacitor.convertFileSrc(t.uri),
            mood: 'Feels good',
            coverUrl: t.albumArtUri ? Capacitor.convertFileSrc(t.albumArtUri) : undefined,
            isDownloaded: true,
            collection: 'Downloads',
          }));
          return { tracks: mapped };
        }
      } catch (e) {
        console.warn('Native queryAudioFiles failed or plugin not installed yet:', e);
      }
    }

    // In web environment or if native plugin is not yet registered, load cached files from IndexedDB
    return { tracks: [] };
  }

  // Process raw file objects from file input or directory picker
  public static async processFileObjects(files: FileList | File[]): Promise<Track[]> {
    const tracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (
        file.type.startsWith('audio/') ||
        file.name.match(/\.(mp3|m4a|wav|flac|ogg|aac|opus)$/i)
      ) {
        const id = `device-file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const blobUrl = URL.createObjectURL(file);

        // Read real ID3 tags
        let title = file.name.replace(/\.[^/.]+$/, '');
        let artist = 'Unknown Artist';
        let album = 'Phone Storage';
        let coverUrl: string | undefined = undefined;

        try {
          const id3 = await ID3Parser.parseBlob(file);
          if (id3.title && id3.title.trim()) title = id3.title.trim();
          if (id3.artist && id3.artist.trim()) artist = id3.artist.trim();
          if (id3.album && id3.album.trim()) album = id3.album.trim();
          if (id3.pictureUrl) coverUrl = id3.pictureUrl;
        } catch (e) {
          console.warn('ID3 parse error:', e);
        }

        // If artist wasn't in ID3, check filename formatting e.g. "Artist - Song"
        if (artist === 'Unknown Artist' && title.includes(' - ')) {
          const parts = title.split(' - ');
          if (parts.length >= 2) {
            artist = parts[0].replace(/^\d+[\s.-]*/, '').trim() || 'Unknown Artist';
            title = parts.slice(1).join(' - ').trim();
          }
        }

        // Measure real audio duration
        let duration = 0;
        try {
          const tempAudio = new Audio(blobUrl);
          await new Promise((resolve) => {
            tempAudio.onloadedmetadata = () => {
              if (tempAudio.duration && Number.isFinite(tempAudio.duration)) {
                duration = Math.round(tempAudio.duration);
              }
              resolve(true);
            };
            tempAudio.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 500);
          });
        } catch {
          // Duration will remain 0 or be updated on first playback
        }

        const track: Track = {
          id,
          title,
          artist,
          album,
          duration: duration || 180,
          url: blobUrl,
          mood: 'Feels good',
          coverUrl,
          isDownloaded: true,
          collection: 'Downloads',
        };

        tracks.push(track);
        await IndexedDbAudioService.saveAudioFile(id, file);
      }
    }

    return tracks;
  }

  // Scan via modern File System Directory Picker (Chrome/Edge on Android/Desktop)
  public static async scanViaDirectoryPicker(): Promise<Track[]> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const files: File[] = [];

        async function readDir(handle: FileSystemDirectoryHandle) {
          const asyncEntries = (handle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values();
          for await (const entry of asyncEntries) {
            if (entry.kind === 'file') {
              const fileHandle = entry as unknown as FileSystemFileHandle;
              if (entry.name.match(/\.(mp3|m4a|wav|flac|ogg|aac|opus)$/i)) {
                try {
                  const file = await fileHandle.getFile();
                  files.push(file);
                } catch {
                  // Ignore
                }
              }
            } else if (entry.kind === 'directory') {
              try {
                await readDir(entry as unknown as FileSystemDirectoryHandle);
              } catch {
                // Ignore
              }
            }
          }
        }

        await readDir(dirHandle);
        if (files.length > 0) {
          return await this.processFileObjects(files);
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.warn('Directory picker cancelled or error:', e);
        }
      }
    }
    return [];
  }
}

