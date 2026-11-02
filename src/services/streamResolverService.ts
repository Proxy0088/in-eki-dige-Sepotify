import { Track } from '../types/music';
import { AudiusService } from './audius';

interface ResolvedStream {
  url: string;
  duration?: number;
  source: 'audius' | 'archive' | 'preview';
}

const resolvedCache = new Map<string, ResolvedStream>();

function getCacheKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()}:::${title.toLowerCase().trim()}`;
}

export const StreamResolverService = {
  /**
   * Resolves a 100% full-length audio stream (3-5 minutes) for a given song and artist.
   * Eliminates 30-second preview limitations by fetching full streams from Audius and Archive.org.
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

    // 1. First priority: Audius decentralized streaming (Full songs, high-fidelity)
    try {
      const q = `${artist} ${title}`.trim();
      const audiusNode = AudiusService.getActiveNode();
      const endpoint = `${audiusNode}/tracks/search?query=${encodeURIComponent(
        q
      )}&limit=6&app_name=MyApp`;

      const res = await fetch(endpoint, {
        signal,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const items: Array<{
          id: string;
          title: string;
          duration: number;
          is_streamable?: boolean;
          access?: { stream?: boolean };
        }> = Array.isArray(data?.data) ? data.data : [];

        // Match tracks with realistic song duration (between 60s and 700s)
        const match = items.find(
          (t) =>
            t.duration >= 60 &&
            t.duration <= 700 &&
            t.is_streamable !== false &&
            t.access?.stream !== false
        );

        if (match) {
          const resolved: ResolvedStream = {
            url: AudiusService.getStreamUrl(match.id),
            duration: match.duration,
            source: 'audius',
          };
          resolvedCache.set(key, resolved);
          return resolved;
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') throw e;
      console.warn('Audius full stream resolution error:', e);
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
    // If it's already an Audius stream or local blob or verified Iranian stream, it's already full length
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
      duration: resolved.duration || track.duration,
      isFullLength: resolved.source !== 'preview',
      isStreamable: Boolean(resolved.url || track.url),
      downloadUrl: resolved.url || track.downloadUrl,
    };
  },
};
