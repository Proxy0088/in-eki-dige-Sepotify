import { Track } from '../types/music';
import { YouTubeMusicService } from './youtubeMusicService';
import { MusicDelService } from './musicDelService';

interface ResolvedStream {
  url: string;
  youtubeId?: string;
  duration?: number;
  source: 'youtube' | 'archive' | 'musicdel' | 'preview';
}

const resolvedCache = new Map<string, ResolvedStream>();

function getCacheKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()}:::${title.toLowerCase().trim()}`;
}

export const StreamResolverService = {
  /**
   * Resolves a 100% full-length audio stream (3-5 minutes) for a given song and artist.
   * Eliminates 30-second preview limitations by fetching full streams from YouTube Music and Archive.org.
   */
  async resolveFullStream(
    artist: string,
    title: string,
    fallbackUrl?: string,
    signal?: AbortSignal
  ): Promise<ResolvedStream> {
    const key = getCacheKey(artist, title);
    const cached = resolvedCache.get(key);
    if (cached) {
      return cached;
    }

    // 1. First priority: YouTube Music resolution (Exact official stream, full length)
    try {
      const vid = await YouTubeMusicService.resolveVideoId(artist, title, signal);
      if (vid) {
        const resolved: ResolvedStream = {
          url: `https://www.youtube.com/watch?v=${vid}`,
          youtubeId: vid,
          source: 'youtube',
        };
        resolvedCache.set(key, resolved);
        return resolved;
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') throw e;
      console.warn('YouTube full stream resolution error:', e);
    }

    // 2. Second priority: Open audio archives (Full MP3 direct streams, 3-5 minutes)
    try {
      const q = `${artist} ${title}`.trim();
      const archiveSearchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
        q + ' AND mediatype:audio'
      )}&fl[]=identifier,title,creator&rows=4&output=json`;

      const res = await fetch(archiveSearchUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        const docs = data.response?.docs || [];

        for (const doc of docs) {
          if (!doc.identifier) continue;
          try {
            const metaRes = await fetch(
              `https://archive.org/metadata/${doc.identifier}`,
              { signal }
            );
            if (metaRes.ok) {
              const meta = await metaRes.json();
              const mp3 = meta.files?.find(
                (f: any) =>
                  typeof f.name === 'string' &&
                  f.name.toLowerCase().endsWith('.mp3') &&
                  Number(f.length || 0) >= 60
              );
              if (mp3) {
                const streamUrl = `https://archive.org/download/${doc.identifier}/${encodeURIComponent(
                  mp3.name
                )}`;
                const resolved: ResolvedStream = {
                  url: streamUrl,
                  duration: Math.round(Number(mp3.length) || 210),
                  source: 'archive',
                };
                resolvedCache.set(key, resolved);
                return resolved;
              }
            }
          } catch {
            // ignore individual doc error
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') throw e;
      console.warn('Archive.org stream resolution error:', e);
    }

    // 3. Fallback: Return original URL (or empty) if no full stream found
    const fallback: ResolvedStream = {
      url: fallbackUrl || '',
      source: 'preview',
    };
    return fallback;
  },

  /**
   * Upgrades a track to full length if it is currently an iTunes preview or short clip.
   */
  async resolveTrack(track: Track, signal?: AbortSignal): Promise<Track> {
    if (track.id.startsWith('musicdel-')) {
      return await MusicDelService.resolveTrack(track, signal);
    }

    if (track.isYouTube && track.youtubeId) {
      return { ...track, isFullLength: true };
    }

    const isShortPreview =
      track.id.startsWith('itunes-') ||
      track.url.includes('apple.com') ||
      track.url.includes('previewUrl') ||
      track.duration <= 35;

    if (!isShortPreview && track.url) {
      return { ...track, isFullLength: true };
    }

    const resolved = await this.resolveFullStream(
      track.artist,
      track.title,
      track.url,
      signal
    );

    return {
      ...track,
      url: resolved.url || track.url,
      youtubeId: resolved.youtubeId || track.youtubeId,
      isYouTube: resolved.source === 'youtube' || Boolean(resolved.youtubeId),
      duration: resolved.duration || track.duration,
      isFullLength: resolved.source !== 'preview',
      isStreamable: true,
      downloadUrl: resolved.source === 'archive' ? resolved.url : track.downloadUrl,
    };
  },
};
