export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface SongLyrics {
  isSynced: boolean;
  lines: LyricLine[];
  plainLyrics?: string;
}

export const LyricsService = {
  /**
   * Fetch millisecond-synchronized lyrics from LRCLIB (same provider as LastWave)
   */
  async getLyrics(artist: string, title: string, durationSec?: number): Promise<SongLyrics | null> {
    try {
      const cleanArtist = artist.replace(/\(.*?\)/g, '').trim();
      const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

      let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      if (durationSec && durationSec > 0) {
        url += `&duration=${Math.round(durationSec)}`;
      }

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Sepotify/1.0' },
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();

      // If synced lyrics available: parse [mm:ss.xx] lines
      if (data.syncedLyrics && typeof data.syncedLyrics === 'string') {
        const rawLines = data.syncedLyrics.split('\n');
        const lines: LyricLine[] = [];

        for (const line of rawLines) {
          const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/);
          if (match) {
            const minutes = parseFloat(match[1]);
            const seconds = parseFloat(match[2]);
            const time = minutes * 60 + seconds;
            const text = match[3].trim();
            if (text) {
              lines.push({ time, text });
            }
          }
        }

        if (lines.length > 0) {
          return {
            isSynced: true,
            lines,
            plainLyrics: data.plainLyrics || undefined,
          };
        }
      }

      // Plain lyrics fallback
      if (data.plainLyrics && typeof data.plainLyrics === 'string') {
        const plainLines = data.plainLyrics
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean);

        return {
          isSynced: false,
          lines: plainLines.map((text: string, idx: number) => ({ time: idx * 4, text })),
          plainLyrics: data.plainLyrics,
        };
      }

      return null;
    } catch (e) {
      console.warn('Lyrics fetch error:', e);
      return null;
    }
  },
};
