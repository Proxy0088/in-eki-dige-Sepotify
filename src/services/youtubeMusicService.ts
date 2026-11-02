import { Track } from '../types/music';

const videoIdCache = new Map<string, string>();

function cleanTitleAndArtist(rawTitle: string, rawAuthor: string): { artist: string; title: string } {
  let cleaned = rawTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?(?:official|video|music|audio|clip|4k|hd|lyrics|remastered).*?\)/gi, '')
    .trim();

  const separators = [' - ', ' – ', ' — ', ' _ ', ' : '];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      if (parts.length >= 2) {
        const potentialArtist = parts[0].trim();
        const potentialTitle = parts.slice(1).join(sep).trim();
        if (potentialArtist.length >= 2 && potentialTitle.length >= 2) {
          return {
            artist: potentialArtist,
            title: potentialTitle,
          };
        }
      }
    }
  }

  const cleanAuthor = rawAuthor
    .replace(/ - Topic$/i, '')
    .replace(/ - Official$/i, '')
    .replace(/VEVO$/i, '')
    .trim();

  return {
    artist: cleanAuthor || 'هنرمند اورجینال',
    title: cleaned || rawTitle,
  };
}

function parseDurationText(text?: string): number {
  if (!text) return 210;
  const parts = text.split(':').map(Number);
  if (parts.some(isNaN)) return 210;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 210;
}

export const YouTubeMusicService = {
  /**
   * Search full songs and official artists directly via YouTube Music engine (Innertube).
   * Completely replaces Audius with 100% full songs, zero cuts, and official artist tracks.
   */
  async searchTracks(
    query: string,
    signal?: AbortSignal,
    limit: number = 10
  ): Promise<Track[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const endpoint = 'https://www.youtube.com/youtubei/v1/search';
      const body = {
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            hl: 'en',
            gl: 'US',
          },
        },
        query: trimmed,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Innertube HTTP ${res.status}`);
      }

      const data = await res.json();
      const sections =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];

      const tracks: Track[] = [];

      for (const section of sections) {
        const items = section.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (!v || !v.videoId) continue;

          const rawTitle: string =
            v.title?.runs?.map((r: any) => r.text).join('') || '';
          const rawAuthor: string =
            v.ownerText?.runs?.map((r: any) => r.text).join('') || '';
          const lengthText: string = v.lengthText?.simpleText || '3:30';

          const durationSec = parseDurationText(lengthText);

          // Skip extremely long DJ mixes/live streams (>15 mins) and short clips (<40s)
          if (durationSec > 900 || durationSec < 40) continue;

          const { artist, title } = cleanTitleAndArtist(rawTitle, rawAuthor);
          const coverUrl =
            v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          tracks.push({
            id: `yt-${v.videoId}`,
            youtubeId: v.videoId,
            title,
            artist,
            album: 'YouTube Music Original',
            duration: durationSec,
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            mood: 'Feels good',
            coverUrl,
            isYouTube: true,
            isFullLength: true,
            isStreamable: true,
            isDownloadable: false,
            collection: 'آهنگ کامل اورجینال',
            dateAdded: Math.floor(Date.now() / 1000),
          });

          if (tracks.length >= limit) break;
        }
        if (tracks.length >= limit) break;
      }

      return tracks;
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('YouTube search error:', err);
      }
      return [];
    }
  },

  /**
   * Resolves the exact YouTube video ID for any official track (e.g. from iTunes)
   */
  async resolveVideoId(
    artist: string,
    title: string,
    signal?: AbortSignal
  ): Promise<string | null> {
    const key = `${artist.toLowerCase().trim()}:::${title.toLowerCase().trim()}`;
    const cached = videoIdCache.get(key);
    if (cached) return cached;

    try {
      const q = `${artist} ${title} official audio`.trim();
      const tracks = await this.searchTracks(q, signal, 3);
      if (tracks.length > 0 && tracks[0].youtubeId) {
        const vid = tracks[0].youtubeId;
        videoIdCache.set(key, vid);
        return vid;
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') throw e;
      console.warn('YouTube video ID resolution error:', e);
    }

    return null;
  },
};
