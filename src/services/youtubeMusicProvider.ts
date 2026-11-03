import { YouTubeMusicCandidate } from '../types/trackMatcher';
import { apiUrl } from './apiConfig';

function parseDurationText(text?: string): number {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function parseSubtitleRuns(runs: any[]): {
  valid: boolean;
  isSong: boolean;
  isVideo: boolean;
  artist: string;
  album: string;
  durationText: string;
} {
  const groups: string[][] = [];
  let currentGroup: string[] = [];

  for (const r of runs || []) {
    const text = (r?.text || '').trim();
    if (!text) continue;
    if (text === '•') {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    } else {
      currentGroup.push(r.text);
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const typeStr = (groups[0]?.join('') || '').toLowerCase();
  const isSong = typeStr.includes('song') || typeStr.includes('single') || typeStr.includes('آهنگ');
  const isVideo = typeStr.includes('video') || typeStr.includes('ویدیو');

  // Ignore podcasts, episodes, profiles, playlists
  if (
    typeStr.includes('podcast') ||
    typeStr.includes('episode') ||
    typeStr.includes('profile') ||
    typeStr.includes('playlist')
  ) {
    return { valid: false, isSong: false, isVideo: false, artist: '', album: '', durationText: '' };
  }

  let artist = '';
  let album = '';
  let durationText = '';

  if (groups.length > 1) {
    artist = groups[1].join('').trim();
  }
  if (groups.length > 2) {
    for (let i = 2; i < groups.length; i++) {
      const gText = groups[i].join('').trim();
      if (gText.includes(':')) {
        durationText = gText;
      } else if (
        !album &&
        !gText.includes('views') &&
        !gText.includes('plays') &&
        !gText.includes('subscribers') &&
        !gText.includes('بازدید')
      ) {
        album = gText;
      }
    }
  }

  return { valid: true, isSong, isVideo, artist, album, durationText };
}

function extractCandidatesFromShelves(
  items: any[],
  candidates: YouTubeMusicCandidate[],
  seenIds: Set<string>
): void {
  for (const item of items || []) {
    const r = item.musicResponsiveListItemRenderer;
    if (!r) continue;

    const flexCols = r.flexColumns || [];
    const titleCol = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    const subtitleRuns = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

    const title = titleCol.map((x: any) => x.text).join('').trim();
    const videoId =
      r.playlistItemData?.videoId ||
      titleCol[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

    if (!videoId || !title || seenIds.has(videoId)) continue;

    const parsedSub = parseSubtitleRuns(subtitleRuns);
    if (!parsedSub.valid) continue;

    seenIds.add(videoId);

    // Check fixed columns for duration if not in subtitle (e.g. "3:45")
    let durationText = parsedSub.durationText;
    if (!durationText && r.fixedColumns?.[0]) {
      const fixedText =
        r.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
      if (fixedText && fixedText.includes(':')) {
        durationText = fixedText;
      }
    }

    const duration = parseDurationText(durationText);
    const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail =
      thumbs[thumbs.length - 1]?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    candidates.push({
      videoId,
      title,
      artist: parsedSub.artist || 'Official Artist',
      album: parsedSub.album || undefined,
      duration: duration > 0 ? duration : undefined,
      thumbnailUrl: thumbnail,
      isSong: parsedSub.isSong,
      isVideo: parsedSub.isVideo,
      channelTitle: parsedSub.artist || undefined,
    });
  }
}

export const YouTubeMusicProvider = {
  /**
   * Search YouTube Music InnerTube directly for candidate tracks.
   */
  async searchCandidates(
    query: string,
    signal?: AbortSignal,
    limit: number = 15
  ): Promise<YouTubeMusicCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const endpoint = apiUrl('/api/ytmusic/youtubei/v1/search');

    const postBody = {
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240101.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
      query: trimmed,
    };

    try {
      const timeoutSignal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4500) : undefined;
      const effectiveSignal = signal && timeoutSignal && typeof (AbortSignal as any).any === 'function'
        ? (AbortSignal as any).any([signal, timeoutSignal])
        : signal || timeoutSignal;

      const res = await fetch(endpoint, {
        method: 'POST',
        signal: effectiveSignal,
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://music.youtube.com/',
        },
        body: JSON.stringify(postBody),
      });

      if (!res.ok) {
        throw new Error(`InnerTube HTTP ${res.status}`);
      }

      const data = await res.json();
      const candidates: YouTubeMusicCandidate[] = [];
      const seenIds = new Set<string>();

      const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs || [];
      const sectionList =
        tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const sec of sectionList) {
        if (sec.musicCardShelfRenderer) {
          const card = sec.musicCardShelfRenderer;
          const videoId =
            card.onTap?.watchEndpoint?.videoId ||
            card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
          const title = card.title?.runs?.map((x: any) => x.text).join('').trim();

          if (videoId && title && !seenIds.has(videoId)) {
            const parsedSub = parseSubtitleRuns(card.subtitle?.runs || []);
            if (parsedSub.valid) {
              seenIds.add(videoId);
              const duration = parseDurationText(parsedSub.durationText);
              const thumbs = card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
              const thumbnail =
                thumbs[thumbs.length - 1]?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              candidates.push({
                videoId,
                title,
                artist: parsedSub.artist || 'Official Artist',
                duration: duration > 0 ? duration : undefined,
                thumbnailUrl: thumbnail,
                isSong: parsedSub.isSong,
                isVideo: parsedSub.isVideo,
              });
            }
          }
        }
        if (sec.musicShelfRenderer?.contents) {
          extractCandidatesFromShelves(
            sec.musicShelfRenderer.contents,
            candidates,
            seenIds
          );
        }
        if (sec.itemSectionRenderer?.contents) {
          extractCandidatesFromShelves(
            sec.itemSectionRenderer.contents,
            candidates,
            seenIds
          );
        }

        if (candidates.length >= limit) break;
      }

      return candidates;
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('YouTubeMusicProvider search error:', err);
      }
      return [];
    }
  },
};
