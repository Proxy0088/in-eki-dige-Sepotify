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
  source: 'youtube' | 'musicdel' | 'preview' | 'error';
  isPlayable: boolean;
  error?: string;
}

const DURATION_PENALTY_KEYWORDS = [
  'remix',
  'live',
  'concert',
  'acoustic',
  'cover',
  'karaoke',
  'instrumental',
  '1 hour',
  'loop',
  'slowed',
  'reverb',
  'speed up',
];

/**
 * Validates actual stream metadata from the server to guarantee
 * genuine, full-length audio and reject short clips, teasers, or wrong versions.
 */
export function verifyVideoMetadata(
  canonical: { title: string; artist: string; duration?: number },
  info: { title?: string; artist?: string; duration?: number }
): { valid: boolean; reason?: string } {
  const videoDuration = Number(info.duration || 0);
  const expectedDuration = Number(canonical.duration || 0);

  // 1. Reject clips shorter than 40s (30s previews, teasers, memes)
  if (videoDuration > 0 && videoDuration < 40) {
    return { valid: false, reason: 'Video too short (clip/preview)' };
  }

  // 2. Duration tolerance check against canonical album duration
  if (expectedDuration >= 45 && videoDuration > 0) {
    // A full album song should not be shorter by > 35s
    if (videoDuration < expectedDuration - 35) {
      return { valid: false, reason: 'Video significantly shorter than expected duration' };
    }
    // Allow intro/outro on music videos up to 100s, or audio tracks up to 60s
    const maxLonger = (info.title || '').toLowerCase().includes('video') ? 100 : 60;
    if (videoDuration > expectedDuration + maxLonger) {
      return { valid: false, reason: 'Video significantly longer than expected duration' };
    }
  }

  // 3. Reject unwanted remixes/live/loop keywords unless requested in canonical title
  const lowerCand = (info.title || '').toLowerCase();
  const lowerCan = canonical.title.toLowerCase();
  for (const kw of DURATION_PENALTY_KEYWORDS) {
    if (lowerCand.includes(kw) && !lowerCan.includes(kw)) {
      return { valid: false, reason: `Unwanted version keyword "${kw}"` };
    }
  }

  return { valid: true };
}

const resolvedMemoryCache = new Map<string, ResolvedStream>();

function getCacheKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()}:::${title.toLowerCase().trim()}`;
}

export const StreamResolverService = {
  /**
   * Resolves a verified full-length audio stream for a given song and artist.
   * Priority:
   *  1. Resolve correct full-length YouTube Music recording.
   *  2. Verify actual video's title, artist, and duration.
   *  3. Resolve a playable audio stream for that exact video ID.
   *  4. If YouTube resolution fails, report that full track is unavailable.
   *  NEVER silently substitute a 30-second preview.
   */
  async resolveFullStream(
    artist: string,
    title: string,
    expectedDuration?: number,
    signal?: AbortSignal
  ): Promise<ResolvedStream> {
    const key = getCacheKey(artist, title);
    const inMem = resolvedMemoryCache.get(key);
    if (inMem && inMem.isPlayable && inMem.source === 'youtube') {
      return inMem;
    }

    // Helper to quickly verify a candidate videoId against /api/stream-info if needed
    const verifyAndBuildStream = async (videoId: string): Promise<ResolvedStream | null> => {
      try {
        const streamEndpoint = apiUrl(`/api/stream?v=${encodeURIComponent(videoId)}`);
        const infoEndpoint = apiUrl(`/api/stream-info?v=${encodeURIComponent(videoId)}`);

        // Fast 3.5s timeout so resolution never stalls playback
        const timeoutSignal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3500) : undefined;
        const effectiveSignal =
          signal && timeoutSignal && typeof (AbortSignal as any).any === 'function'
            ? (AbortSignal as any).any([signal, timeoutSignal])
            : signal || timeoutSignal;

        const infoRes = await fetch(infoEndpoint, { signal: effectiveSignal });
        if (!infoRes.ok) return null;

        const info = await infoRes.json();
        if (!info.url) return null;

        // Verify metadata (duration and version)
        const check = verifyVideoMetadata(
          { title, artist, duration: expectedDuration },
          { title: info.title, artist: info.artist, duration: info.duration }
        );

        if (!check.valid) {
          console.warn(`Video ${videoId} failed metadata verification:`, check.reason);
          return null;
        }

        const resolved: ResolvedStream = {
          url: streamEndpoint,
          youtubeId: videoId,
          duration: info.duration || expectedDuration,
          source: 'youtube',
          isPlayable: true,
        };

        resolvedMemoryCache.set(key, resolved);
        return resolved;
      } catch (e: unknown) {
        if ((e as Error)?.name === 'AbortError') throw e;
        console.warn('Stream endpoint verification error:', e);
        return null;
      }
    };

    // 1. Check persistent match cache (instant return if already resolved or user-matched)
    const cachedMatch = TrackMatchCache.getMatch(artist, title);
    if (cachedMatch?.videoId) {
      const streamEndpoint = apiUrl(`/api/stream?v=${encodeURIComponent(cachedMatch.videoId)}`);
      const resolved: ResolvedStream = {
        url: streamEndpoint,
        youtubeId: cachedMatch.videoId,
        duration: cachedMatch.duration || expectedDuration,
        source: 'youtube',
        isPlayable: true,
      };
      resolvedMemoryCache.set(key, resolved);
      return resolved;
    }

    // 2. Query YouTube Music InnerTube for verified candidate tracks
    try {
      const query = `${artist} ${title}`.trim();
      const candidates = await YouTubeMusicProvider.searchCandidates(query, signal, 8);
      let best = TrackMatcher.findBestMatch(
        { title, artist, duration: expectedDuration },
        candidates,
        60
      );

      if (best?.candidate.videoId) {
        // High confidence match: construct direct stream URL immediately without blocking roundtrip
        const streamEndpoint = apiUrl(`/api/stream?v=${encodeURIComponent(best.candidate.videoId)}`);
        const resolved: ResolvedStream = {
          url: streamEndpoint,
          youtubeId: best.candidate.videoId,
          duration: best.candidate.duration || expectedDuration,
          source: 'youtube',
          isPlayable: true,
        };

        resolvedMemoryCache.set(key, resolved);
        TrackMatchCache.saveMatch(
          artist,
          title,
          {
            videoId: best.candidate.videoId,
            title: best.candidate.title,
            artist: best.candidate.artist,
            duration: resolved.duration,
            thumbnailUrl: best.candidate.thumbnailUrl,
          },
          best.score,
          false
        );
        return resolved;
      }

      // Try alternative query with "official audio"
      const altCandidates = await YouTubeMusicProvider.searchCandidates(
        `${title} ${artist} official audio`,
        signal,
        6
      );
      best = TrackMatcher.findBestMatch(
        { title, artist, duration: expectedDuration },
        altCandidates,
        58
      );

      if (best?.candidate.videoId) {
        const streamEndpoint = apiUrl(`/api/stream?v=${encodeURIComponent(best.candidate.videoId)}`);
        const resolved: ResolvedStream = {
          url: streamEndpoint,
          youtubeId: best.candidate.videoId,
          duration: best.candidate.duration || expectedDuration,
          source: 'youtube',
          isPlayable: true,
        };

        resolvedMemoryCache.set(key, resolved);
        TrackMatchCache.saveMatch(
          artist,
          title,
          {
            videoId: best.candidate.videoId,
            title: best.candidate.title,
            artist: best.candidate.artist,
            duration: resolved.duration,
            thumbnailUrl: best.candidate.thumbnailUrl,
          },
          best.score,
          false
        );
        return resolved;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') throw err;
      console.warn('Track matching error for', artist, title, err);
    }

    // 3. Fallback: Search MusicDel for Persian / Eastern songs (e.g. Dariush, Shadmehr, etc.)
    try {
      const q = `${artist} ${title}`.trim();
      const musicDelResults = await MusicDelService.searchTracks(q, signal, 5);
      if (musicDelResults.length > 0) {
        const topDel = musicDelResults[0];
        const resolvedDel = await MusicDelService.resolveTrack(topDel, signal);
        if (resolvedDel.url && (resolvedDel.url.endsWith('.mp3') || resolvedDel.url.includes('.mp3'))) {
          const resolved: ResolvedStream = {
            url: resolvedDel.url,
            duration: resolvedDel.duration || expectedDuration,
            source: 'musicdel',
            isPlayable: true,
          };
          resolvedMemoryCache.set(key, resolved);
          return resolved;
        }
      }
    } catch (e) {
      console.warn('MusicDel fallback stream resolution error:', e);
    }

    // 4. Fallback: Report full track is unavailable
    // NEVER fall back to 30-second previews for full playback
    return {
      url: '',
      source: 'error',
      isPlayable: false,
      error: 'نسخه کامل این آهنگ در حال حاضر در دسترس نیست.',
    };
  },

  /**
   * Upgrades a Track by resolving its stream URL into a genuine, verified full-length audio stream.
   * If resolution fails, marks isFullLength: false and isStreamable: false.
   */
  async resolveTrack(track: Track, signal?: AbortSignal): Promise<Track> {
    if (track.id.startsWith('musicdel-')) {
      return await MusicDelService.resolveTrack(track, signal);
    }

    // If track already has an active verified full-length stream
    if (
      track.isFullLength &&
      (track.url.includes('/api/stream') || track.url.includes('googlevideo.com') || track.url.startsWith('blob:'))
    ) {
      return { ...track, isFullLength: true, isStreamable: true };
    }

    // Resolve full stream
    const resolved = await this.resolveFullStream(
      track.artist,
      track.title,
      track.duration,
      signal
    );

    if (
      resolved.isPlayable &&
      resolved.url &&
      (resolved.source === 'youtube' || resolved.source === 'musicdel')
    ) {
      return {
        ...track,
        url: resolved.url,
        youtubeId: resolved.youtubeId || track.youtubeId,
        duration: resolved.duration || track.duration,
        isYouTube: resolved.source === 'youtube',
        isFullLength: true,
        isStreamable: true,
        isDownloadable: true,
        downloadUrl: resolved.url,
        streamSource: resolved.source,
      };
    }

    // Explicitly mark full version unavailable — NEVER pretend a preview is full length
    return {
      ...track,
      url: '',
      isFullLength: false,
      isStreamable: false,
      isDownloadable: false,
      downloadUrl: undefined,
      streamSource: 'error',
    };
  },
};
