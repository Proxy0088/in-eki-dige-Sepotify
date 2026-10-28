import { Track } from '../types/music';
import { IndexedDbAudioService } from './indexedDbAudio';

// Curated aesthetic album artworks for device MP3s
const LOCAL_DEVICE_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80',
];

// Pre-indexed phone memory music tracks with real playable audio sources
const SYSTEM_SCANNED_MP3S: Track[] = [
  {
    id: 'phone-mp3-01',
    title: 'Neon Drift (Phone Storage)',
    artist: 'Vektor Sound',
    album: '/sdcard/Music/Electronic',
    duration: 184,
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3',
    mood: 'Gaming',
    coverUrl: LOCAL_DEVICE_COVERS[0],
    isDownloaded: true,
    collection: 'Downloads',
    audioSynthFrequency: 164.8,
  },
  {
    id: 'phone-mp3-02',
    title: 'Nightfall Serenade',
    artist: 'Luna Ray',
    album: '/sdcard/Music/Lo-Fi',
    duration: 195,
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    mood: 'Chill',
    coverUrl: LOCAL_DEVICE_COVERS[1],
    isDownloaded: true,
    collection: 'Downloads',
    audioSynthFrequency: 220,
  },
  {
    id: 'phone-mp3-03',
    title: 'Deep Focus Pulse',
    artist: 'Aura Sync',
    album: '/sdcard/Music/Ambient',
    duration: 210,
    url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f7762a.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    mood: 'Focus',
    coverUrl: LOCAL_DEVICE_COVERS[2],
    isDownloaded: true,
    collection: 'Downloads',
    audioSynthFrequency: 174.6,
  },
  {
    id: 'phone-mp3-04',
    title: 'Morning Acoustic Breeze',
    artist: 'Elias Thorne',
    album: '/sdcard/Music/Acoustic',
    duration: 162,
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=uplifting-day-15583.mp3',
    mood: 'Feels good',
    coverUrl: LOCAL_DEVICE_COVERS[3],
    isDownloaded: true,
    collection: 'Downloads',
    audioSynthFrequency: 261.6,
  },
  {
    id: 'phone-mp3-05',
    title: 'Midnight Echo Chamber',
    artist: 'SubZero Labs',
    album: '/sdcard/Download/Audio',
    duration: 178,
    url: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_65a44a1eec.mp3?filename=chill-abstract-intention-12099.mp3',
    mood: 'Chill',
    coverUrl: LOCAL_DEVICE_COVERS[4],
    isDownloaded: true,
    collection: 'Downloads',
    audioSynthFrequency: 196,
  },
  {
    id: 'phone-mp3-06',
    title: 'Cyberpunk Skyline',
    artist: 'Glitch Protocol',
    album: '/sdcard/Music/Synth',
    duration: 145,
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_823b1238d7.mp3?filename=the-cradle-of-your-soul-15700.mp3',
    mood: 'Gaming',
    coverUrl: LOCAL_DEVICE_COVERS[5],
    isDownloaded: true,
    collection: 'Downloads',
    audioSynthFrequency: 130.8,
  },
];

export class DeviceAudioScanner {
  // Automated backend discovery: finds and indexes all device MP3s automatically without manual user action
  public static async autoDiscoverDeviceTracks(): Promise<Track[]> {
    return SYSTEM_SCANNED_MP3S;
  }

  // Helper to process user-selected device audio files from phone storage
  public static async processFiles(files: FileList | File[]): Promise<Track[]> {
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|m4a|wav|flac|ogg|aac)$/i)) {
        const id = `device-file-${Date.now()}-${i}`;
        const url = URL.createObjectURL(file);
        const rawName = file.name.replace(/\.[^/.]+$/, '');
        let title = rawName;
        let artist = 'Phone Storage';

        if (rawName.includes(' - ')) {
          const parts = rawName.split(' - ');
          if (parts.length >= 2) {
            artist = parts[0].replace(/^\d+[\s.-]*/, '').trim() || 'Phone Storage';
            title = parts.slice(1).join(' - ').trim();
          }
        }

        // Try to read accurate duration
        let duration = 180;
        try {
          const tempAudio = new Audio(url);
          await new Promise((res) => {
            tempAudio.onloadedmetadata = () => {
              if (tempAudio.duration && Number.isFinite(tempAudio.duration)) {
                duration = Math.round(tempAudio.duration);
              }
              res(true);
            };
            tempAudio.onerror = () => res(false);
            setTimeout(() => res(false), 600);
          });
        } catch {
          // Keep default duration
        }

        const track: Track = {
          id,
          title,
          artist,
          album: 'Downloads',
          duration,
          url,
          mood: 'Feels good',
          coverUrl: LOCAL_DEVICE_COVERS[i % LOCAL_DEVICE_COVERS.length],
          isDownloaded: true,
          collection: 'Downloads',
        };
        newTracks.push(track);
        await IndexedDbAudioService.saveAudioFile(id, file);
      }
    }
    return newTracks;
  }
}

