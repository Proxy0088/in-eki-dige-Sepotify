export interface YouTubeMusicCandidate {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number; // duration in seconds
  thumbnailUrl: string;
  isSong: boolean;
  isVideo: boolean;
  channelTitle?: string;
  viewCountText?: string;
}

export interface TrackMatchScore {
  candidate: YouTubeMusicCandidate;
  score: number;
  reasons: string[];
  isManualOverride?: boolean;
}

export interface TrackMatchCacheEntry {
  canonicalKey: string;
  videoId: string;
  title: string;
  artist: string;
  duration?: number;
  thumbnailUrl?: string;
  score: number;
  matchedAt: number; // timestamp ms
  manualOverride: boolean;
}
