import { Track } from '../types/music';

const DB_NAME = 'MusicPlayerDeviceAudioDB';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

interface StoredAudioRecord {
  id: string;
  file: Blob;
  buffer?: ArrayBuffer;
  metadata?: Track;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbAudioService {
  // Save audio blob / arrayBuffer with track metadata to IndexedDB
  public static async saveAudioFile(id: string, file: Blob, metadata?: Track): Promise<void> {
    try {
      const db = await openDB();
      const arrayBuffer = await file.arrayBuffer();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: StoredAudioRecord = {
          id,
          file,
          buffer: arrayBuffer,
          metadata,
          timestamp: Date.now(),
        };
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Failed to save audio file to IndexedDB:', e);
      throw e;
    }
  }

  // Get raw audio blob from IndexedDB
  public static async getAudioFile(id: string): Promise<Blob | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result?.file) {
            resolve(request.result.file);
          } else if (request.result?.buffer) {
            const blob = new Blob([request.result.buffer], { type: 'audio/mpeg' });
            resolve(blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  // Check if a track is downloaded in IndexedDB
  public static async isAudioDownloaded(id: string): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count(id);

        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // Download real audio file and store in IndexedDB
  public static async downloadAndSaveTrack(
    track: Track
  ): Promise<{ success: boolean; error?: string; localUrl?: string }> {
    // 1. Strict permission check
    if (!track.isDownloadable) {
      return {
        success: false,
        error: 'این قطعه توسط هنرمند اجازه دانلود داده نشده است.',
      };
    }

    const downloadEndpoint = track.downloadUrl || track.url;
    if (!downloadEndpoint) {
      return {
        success: false,
        error: 'لینک دانلود معتبری برای این قطعه یافت نشد.',
      };
    }

    try {
      // 2. Fetch real audio bytes
      const response = await fetch(downloadEndpoint);
      if (!response.ok) {
        throw new Error(`خطا در دانلود قطعه (کد: ${response.status})`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('فایل دانلودشده خالی است.');
      }

      // 3. Save to IndexedDB with ArrayBuffer & metadata
      await this.saveAudioFile(track.id, blob, track);

      // 4. Create offline local object URL
      const localUrl = URL.createObjectURL(blob);
      return { success: true, localUrl };
    } catch (err: unknown) {
      console.warn('Download and save error:', err);
      return {
        success: false,
        error: (err as Error)?.message || 'خطایی در هنگام دانلود و ذخیره رخ داد.',
      };
    }
  }

  public static downloadAndSaveAudiusTrack(track: Track) {
    return this.downloadAndSaveTrack(track);
  }

  // Delete audio from IndexedDB
  public static async deleteAudioFile(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Failed to delete audio file from IndexedDB:', e);
    }
  }

  // Restore Blob URLs for local device & downloaded Audius tracks upon app load
  public static async hydrateDeviceTracks(tracks: Track[]): Promise<Track[]> {
    const updated = await Promise.all(
      tracks.map(async (t) => {
        if (
          t.isDownloaded ||
          t.isAudius ||
          t.id.startsWith('audius-') ||
          t.id.startsWith('local-device-') ||
          t.id.startsWith('device-file-') ||
          t.id.startsWith('device-')
        ) {
          const blob = await IndexedDbAudioService.getAudioFile(t.id);
          if (blob) {
            return {
              ...t,
              url: URL.createObjectURL(blob),
              isDownloaded: true,
            };
          }
        }
        return t;
      })
    );
    return updated;
  }
}
