import { Track } from '../types/music';

interface MusicDelItem {
  id: string;
  postUrl: string;
  coverUrl?: string;
  title: string;
  artist: string;
}

const postMp3Cache = new Map<string, string>();

function getBaseFetchUrl(pathOrUrl: string): string {
  // If we're on local dev / local network, route through Vite proxy to eliminate CORS
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    if (isLocal) {
      if (pathOrUrl.startsWith('https://musicdel.ir')) {
        return pathOrUrl.replace('https://musicdel.ir', '/api/musicdel');
      }
      if (pathOrUrl.startsWith('/api/musicdel')) {
        return pathOrUrl;
      }
      return `/api/musicdel${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    }
  }

  return pathOrUrl.startsWith('http') ? pathOrUrl : `https://musicdel.ir/${pathOrUrl}`;
}

async function safeFetchHtml(url: string, signal?: AbortSignal): Promise<string> {
  const targetUrl = getBaseFetchUrl(url);

  try {
    const res = await fetch(targetUrl, {
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') throw err;
    console.warn(`Direct fetch to ${targetUrl} failed, trying open fallback:`, err);
  }

  // Fallback: in case standalone browser blocks direct cross-origin call
  try {
    const directUrl = url.startsWith('http') ? url : `https://musicdel.ir/${url}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(proxyUrl, { signal });
    if (res.ok) {
      return await res.text();
    }
  } catch (e: unknown) {
    if ((e as Error)?.name === 'AbortError') throw e;
  }

  return '';
}

export const MusicDelService = {
  /**
   * Search for songs and artists on musicdel.ir (National Net verified source).
   * Extracts real 320kbps / 128kbps full-length MP3 streams hosted on Iranian CDNs.
   */
  async searchTracks(
    query: string,
    signal?: AbortSignal,
    limit: number = 10
  ): Promise<Track[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const html = await safeFetchHtml(`/?s=${encodeURIComponent(trimmed)}`, signal);
      if (!html) return [];

      const figureRegex = /<figure[^>]*class="[^"]*result[^"]*"[\s\S]*?<\/figure>/gi;
      const figures = html.match(figureRegex) || [];

      const items: MusicDelItem[] = [];

      for (const fig of figures) {
        const linkMatch = fig.match(/<a[^>]+href="([^"]+)"/i);
        const imgMatch = fig.match(/<img[^>]+src="([^"]+)"/i);
        const spans = fig.match(/<span>([\s\S]*?)<\/span>/gi) || [];

        const postUrl = linkMatch ? linkMatch[1] : null;
        if (!postUrl) continue;

        const coverUrl = imgMatch ? imgMatch[1] : undefined;
        const title = spans[0]
          ? spans[0].replace(/<[^>]+>/g, '').replace(/^دانلود آهنگ/i, '').trim()
          : 'آهنگ جدید';
        const artist = spans[1]
          ? spans[1].replace(/<[^>]+>/g, '').trim()
          : 'خواننده';

        const postIdMatch = postUrl.match(/single-tracks\/(\d+)/i);
        const id = postIdMatch ? postIdMatch[1] : Math.random().toString(36).substring(7);

        items.push({
          id,
          postUrl,
          coverUrl,
          title,
          artist,
        });

        if (items.length >= limit) break;
      }

      // Pre-resolve the top 3 tracks concurrently so playback starts instantly
      const preResolved = await Promise.allSettled(
        items.slice(0, 3).map((item) => this.resolvePostMp3(item.postUrl, signal))
      );

      return items.map((item, idx) => {
        let streamUrl = item.postUrl;
        if (idx < 3 && preResolved[idx]?.status === 'fulfilled') {
          streamUrl = (preResolved[idx] as PromiseFulfilledResult<string | null>).value || item.postUrl;
        }

        return {
          id: `musicdel-${item.id}`,
          title: item.title,
          artist: item.artist,
          album: 'MusicDel.ir (نت ملی)',
          duration: 220,
          url: streamUrl,
          mood: 'Feels good',
          coverUrl: item.coverUrl,
          isNationalNet: true,
          isFullLength: true,
          isStreamable: true,
          isDownloadable: true,
          downloadUrl: streamUrl.endsWith('.mp3') ? streamUrl : undefined,
          collection: 'موزیکدل (نت ملی)',
          dateAdded: Math.floor(Date.now() / 1000),
        };
      });
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('MusicDel search error:', err);
      }
      return [];
    }
  },

  /**
   * Resolve the direct 320kbps MP3 stream URL from a musicdel post page.
   */
  async resolvePostMp3(postUrl: string, signal?: AbortSignal): Promise<string | null> {
    const cached = postMp3Cache.get(postUrl);
    if (cached) return cached;

    try {
      const html = await safeFetchHtml(postUrl, signal);
      if (!html) return null;

      const mp3Regex = /href="([^"]+\.mp3)"/gi;
      const mp3s: string[] = [];
      let m;
      while ((m = mp3Regex.exec(html)) !== null) {
        if (!mp3s.includes(m[1])) mp3s.push(m[1]);
      }

      if (mp3s.length === 0) {
        // Check <audio src="...mp3">
        const audioMatch = html.match(/<audio[^>]+src="([^"]+\.mp3)"/i);
        if (audioMatch) mp3s.push(audioMatch[1]);
      }

      // Prefer 320kbps quality over 128kbps
      const best320 = mp3s.find((u) => u.includes('320')) || mp3s[0];
      if (best320) {
        postMp3Cache.set(postUrl, best320);
        return best320;
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') throw e;
      console.warn('MusicDel resolve MP3 error:', e);
    }

    return null;
  },

  /**
   * Upgrades a Track by resolving its post URL into a direct 320kbps MP3 stream.
   */
  async resolveTrack(track: Track, signal?: AbortSignal): Promise<Track> {
    if (track.url.endsWith('.mp3') || track.url.includes('.mp3?')) {
      return { ...track, isFullLength: true };
    }

    // If url is still the post URL (https://musicdel.ir/single-tracks/...)
    const mp3 = await this.resolvePostMp3(track.url, signal);
    if (mp3) {
      return {
        ...track,
        url: mp3,
        downloadUrl: mp3,
        isStreamable: true,
        isFullLength: true,
      };
    }

    return track;
  },
};
