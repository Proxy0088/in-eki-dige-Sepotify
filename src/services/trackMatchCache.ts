import { TrackMatchCacheEntry } from '../types/trackMatcher';

const CACHE_STORAGE_KEY = 'sepotify_track_match_cache_v3';

// Clear old corrupt cache from previous versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('sepotify_track_match_cache_v1');
    localStorage.removeItem('sepotify_track_match_cache_v2');
  } catch {
    // Ignore storage errors
  }
}

export function makeCanonicalKey(artist: string, title: string): string {
  const normArtist = artist.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '').trim();
  const normTitle = title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '').trim();
  return `${normArtist}:::${normTitle}`;
}

export const TrackMatchCache = {
  getMatch(artist: string, title: string): TrackMatchCacheEntry | null {
    if (typeof window === 'undefined') return null;
    const key = makeCanonicalKey(artist, title);

    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return null;
      const dict: Record<string, TrackMatchCacheEntry> = JSON.parse(raw);
      const match = dict[key];
      if (match && match.videoId && (match.score >= 65 || match.manualOverride)) {
        return match;
      }
    } catch (e) {
      console.warn('TrackMatchCache read error:', e);
    }
    return null;
  },

  saveMatch(
    artist: string,
    title: string,
    candidate: {
      videoId: string;
      title: string;
      artist: string;
      duration?: number;
      thumbnailUrl?: string;
    },
    score: number = 100,
    manualOverride: boolean = false
  ): void {
    if (typeof window === 'undefined') return;
    // Strictly prevent caching low-confidence matches
    if (score < 65 && !manualOverride) return;

    const key = makeCanonicalKey(artist, title);

    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      const dict: Record<string, TrackMatchCacheEntry> = raw ? JSON.parse(raw) : {};

      dict[key] = {
        canonicalKey: key,
        videoId: candidate.videoId,
        title: candidate.title,
        artist: candidate.artist,
        duration: candidate.duration,
        thumbnailUrl: candidate.thumbnailUrl,
        score,
        matchedAt: Date.now(),
        manualOverride,
      };

      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(dict));
    } catch (e) {
      console.warn('TrackMatchCache save error:', e);
    }
  },

  saveManualOverride(
    artist: string,
    title: string,
    videoId: string,
    customTitle?: string,
    customArtist?: string
  ): void {
    this.saveMatch(
      artist,
      title,
      {
        videoId,
        title: customTitle || title,
        artist: customArtist || artist,
      },
      100,
      true
    );
  },

  removeMatch(artist: string, title: string): void {
    if (typeof window === 'undefined') return;
    const key = makeCanonicalKey(artist, title);

    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return;
      const dict: Record<string, TrackMatchCacheEntry> = JSON.parse(raw);
      delete dict[key];
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(dict));
    } catch (e) {
      console.warn('TrackMatchCache remove error:', e);
    }
  },

  getAllOverrides(): TrackMatchCacheEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return [];
      const dict: Record<string, TrackMatchCacheEntry> = JSON.parse(raw);
      return Object.values(dict).filter((e) => e.manualOverride);
    } catch {
      return [];
    }
  },
};
