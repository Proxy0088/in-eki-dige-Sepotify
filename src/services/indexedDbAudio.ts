import { Track } from '../types/music';

const DB_NAME = 'MusicPlayerDeviceAudioDB';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

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
  public static async saveAudioFile(id: string, file: Blob): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ id, file, timestamp: Date.now() });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Failed to save audio file to IndexedDB:', e);
    }
  }

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

  // Restore Blob URLs for local device tracks upon app load
  public static async hydrateDeviceTracks(tracks: Track[]): Promise<Track[]> {
    const updated = await Promise.all(
      tracks.map(async (t) => {
        if (
          t.id.startsWith('local-device-') ||
          t.id.startsWith('device-file-') ||
          t.id.startsWith('device-')
        ) {
          const blob = await IndexedDbAudioService.getAudioFile(t.id);
          if (blob) {
            return {
              ...t,
              url: URL.createObjectURL(blob),
            };
          }
        }
        return t;
      })
    );
    return updated;
  }
}
