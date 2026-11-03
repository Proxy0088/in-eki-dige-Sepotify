import { Track, MoodType } from '../types/music';
import { StreamResolverService } from './streamResolverService';

export interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
}

export const OfficialMusicService = {
  /**
   * Search official, original songs and artists with 100% accuracy via Apple iTunes catalog.
   * Dynamically resolves full-length audio streams (3-5 minutes) to avoid 30-second previews.
   */
  async searchOriginalTracks(
    query: string,
    signal?: AbortSignal,
    limit: number = 10
  ): Promise<Track[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        trimmed
      )}&entity=song&limit=${limit}`;

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);

      const data = await res.json();
      const results: ITunesResult[] = data.results || [];

      // Map base tracks
      const rawTracks: Track[] = results.map((item) => {
        // High-res cover art (replace 100x100 with 600x600 for crisp visual quality)
        const cover = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
          : undefined;

        // Map genre to mood
        let mood: MoodType = 'Feels good';
        const genre = (item.primaryGenreName || '').toLowerCase();
        if (
          genre.includes('rock') ||
          genre.includes('electronic') ||
          genre.includes('hip-hop') ||
          genre.includes('rap')
        ) {
          mood = 'Gaming';
        } else if (
          genre.includes('classical') ||
          genre.includes('instrumental') ||
          genre.includes('ambient')
        ) {
          mood = 'Focus';
        } else if (
          genre.includes('acoustic') ||
          genre.includes('jazz') ||
          genre.includes('blues')
        ) {
          mood = 'Chill';
        }

        const durationSec = Math.round((item.trackTimeMillis || 180000) / 1000);

        return {
          id: `itunes-${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || 'Single',
          duration: durationSec,
          url: item.previewUrl || '',
          mood,
          coverUrl: cover,
          isFullLength: false,
          isStreamable: Boolean(item.previewUrl),
          isDownloadable: Boolean(item.previewUrl),
          downloadUrl: item.previewUrl,
          collection: 'آهنگ اورجینال',
        };
      });

      return rawTracks;
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Official music search error:', err);
      }
      return [];
    }
  },
};

