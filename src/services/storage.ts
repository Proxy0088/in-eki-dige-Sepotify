import { INITIAL_TRACKS } from '../data/initialTracks';
import { Track } from '../types/music';

const STORAGE_KEYS = {
  TRACKS: 'mp_tracks_data_v1',
  LIKED_IDS: 'mp_liked_ids_v1',
  DOWNLOADED_IDS: 'mp_downloaded_ids_v1',
  RECENT_IDS: 'mp_recent_ids_v1',
  ACTIVE_MOOD: 'mp_active_mood_v1',
};

export class StorageService {
  public static loadTracks(): Track[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRACKS);
      if (stored) {
        const parsed: Track[] = JSON.parse(stored);
        return parsed.map((track) => {
          if (!track.coverUrl) {
            const initial = INITIAL_TRACKS.find((it) => it.id === track.id);
            if (initial?.coverUrl) {
              return { ...track, coverUrl: initial.coverUrl };
            }
          }
          return track;
        });
      }
    } catch (e) {
      console.warn('Failed to load tracks from storage:', e);
    }
    return INITIAL_TRACKS;
  }

  public static saveTracks(tracks: Track[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(tracks));
    } catch (e) {
      console.warn('Failed to save tracks to storage:', e);
    }
  }

  public static getLikedIds(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LIKED_IDS);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set(INITIAL_TRACKS.filter((t) => t.isLiked).map((t) => t.id));
  }

  public static setLikedIds(ids: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED_IDS, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  }

  public static getDownloadedIds(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOWNLOADED_IDS);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set(INITIAL_TRACKS.filter((t) => t.isDownloaded).map((t) => t.id));
  }

  public static setDownloadedIds(ids: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOWNLOADED_IDS, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  }
}
