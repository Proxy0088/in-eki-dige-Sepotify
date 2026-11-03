import { Track } from '../types/music';
import { YouTubeMusicProvider } from './youtubeMusicProvider';
import { TrackMatcher } from './trackMatcher';
import { TrackMatchCache } from './trackMatchCache';
import { MusicDelService } from './musicDelService';
import { apiUrl } from './apiConfig';

export interface ResolvedStream {
  url: string;
  youtubeId?: string;
  duration?: number;
  source: 'youtube' | 'archive' | 'musicdel' | 'preview' | 'error';
  isPlayable: boolean;
  error?: string;
}

const resolvedMemoryCache = new Map<string, ResolvedStream>();

function getCacheKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()}:::${title.toLowerCase().trim()}`;
}

export const StreamResolverService = {
  /**
   * Resolves a 100% full-length audio stream for a given song and artist using Meld-inspired matching.
   */
  async resolveFullStream(
    artist: string,
    title: string,
    expectedDuration?: number,
    fallbackUrl?: string,
    signal?: AbortSignal
  ): Promise<ResolvedStream> {
    const key = getCacheKey(artist, title);
    const inMem = resolvedMemoryCache.get(key);
    if (inMem && inMem.isPlayable) {
      return inMem;
    }

    // 1. Check persistent match cache (including user manual overrides)
    const cachedMatch = TrackMatchCache.getMatch(artist, title);
    let targetVideoId = cachedMatch?.videoId;

    // 2. If not cached, query YouTube Music InnerTube and run Meld track matching
    if (!targetVideoId) {
      try {
        const query = `${artist} ${title}`.trim();
        const candidates = await YouTubeMusicProvider.searchCandidates(query, signal, 10);
        let best = TrackMatcher.findBestMatch(
          { title, artist, duration: expectedDuration },
          candidates,
          65
        );

        if (!best) {
          const altCandidates = await YouTubeMusicProvider.searchCandidates(
            `${title} ${artist} official audio`,
            signal,
            8
          );
          best = TrackMatcher.findBestMatch(
            { title, artist, duration: expectedDuration },
            altCandidates,
            65
          );
        }

        if (best && best.candidate.videoId) {
          targetVideoId = best.candidate.videoId;
          TrackMatchCache.saveMatch(
            artist,
            title,
            {
              videoId: targetVideoId,
              title: best.candidate.title,
              artist: best.candidate.artist,
              duration: best.candidate.duration,
              thumbnailUrl: best.candidate.thumbnailUrl,
            },
            best.score,
            false
          );
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') throw err;
        console.warn('Track matching error for', artist, title, err);
      }
    }

    // 3. If a YouTube videoId was matched, verify and resolve stream via stream endpoint
    if (targetVideoId) {
      try {
        const streamEndpoint = apiUrl(`/api/stream?v=${encodeURIComponent(targetVideoId)}`);
        const infoEndpoint = apiUrl(`/api/stream-info?v=${encodeURIComponent(targetVideoId)}`);

        const timeoutSignal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(5000) : undefined;
        const effectiveSignal = signal && timeoutSignal && typeof (AbortSignal as any).any === 'function'
          ? (AbortSignal as any).any([signal, timeoutSignal])
          : signal || timeoutSignal;

        const infoRes = await fetch(infoEndpoint, {
          signal: effectiveSignal,
        });

        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.url) {
            const resolved: ResolvedStream = {
              url: streamEndpoint,
              youtubeId: targetVideoId,
              duration: info.duration || expectedDuration,
              source: 'youtube',
              isPlayable: true,
            };
            resolvedMemoryCache.set(key, resolved);
            return resolved;
          }
        }
      } catch (e: unknown) {
        if ((e as Error)?.name === 'AbortError') throw e;
        console.warn('Stream endpoint verification error:', e);
      }
    }

    // 4. Fallback to authentic iTunes preview or original recording
    // NEVER fall back to random Archive.org podcasts/audio
    if (fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://') || fallbackUrl.startsWith('blob:'))) {
      return {
        url: fallbackUrl,
        source: 'preview',
        isPlayable: true,
      };
    }

    return {
      url: '',
      source: 'error',
      isPlayable: false,
      error: 'جریان صوتی معتبر برای این قطعه یافت نشد.',
    };
  },

  /**
   * Upgrades a Track by resolving its stream URL into a genuine, full-length audio stream.
   */
  async resolveTrack(track: Track, signal?: AbortSignal): Promise<Track> {
    if (track.id.startsWith('musicdel-')) {
      return await MusicDelService.resolveTrack(track, signal);
    }

    // If track already has an active stream endpoint or direct stream
    if (track.url.includes('/api/stream') || track.url.includes('googlevideo.com')) {
      return { ...track, isFullLength: true, isStreamable: true };
    }

    // Resolve full stream
    const resolved = await this.resolveFullStream(
      track.artist,
      track.title,
      track.duration,
      track.url,
      signal
    );

    if (resolved.isPlayable && resolved.url) {
      return {
        ...track,
        url: resolved.url,
        youtubeId: resolved.youtubeId || track.youtubeId,
        duration: resolved.duration || track.duration,
        isYouTube: resolved.source === 'youtube',
        isFullLength: true,
        isStreamable: true,
      };
    }

    return track;
  },
};
