import { Track } from '../types/music';

const DISCOVERY_NODES = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1',
  'https://audius-discovery-1.cultur3stake.com/v1',
  'https://dn1.monophonic.digital/v1',
];

const APP_NAME = 'MyApp';

interface AudiusUser {
  id: string;
  name: string;
  handle: string;
}

interface AudiusArtwork {
  '150x150'?: string;
  '480x480'?: string;
  '1000x1000'?: string;
}

interface AudiusAccess {
  stream?: boolean;
  download?: boolean;
}

interface AudiusApiTrack {
  id: string;
  title: string;
  duration: number;
  user?: AudiusUser;
  artwork?: AudiusArtwork;
  is_streamable?: boolean;
  is_downloadable?: boolean;
  access?: AudiusAccess;
  genre?: string;
}

export class AudiusService {
  private static activeNodeIndex = 0;

  public static getActiveNode(): string {
    return DISCOVERY_NODES[this.activeNodeIndex % DISCOVERY_NODES.length];
  }

  public static rotateNode(): string {
    this.activeNodeIndex = (this.activeNodeIndex + 1) % DISCOVERY_NODES.length;
    return this.getActiveNode();
  }

  // Official stream URL
  public static getStreamUrl(trackId: string): string {
    return `${this.getActiveNode()}/tracks/${encodeURIComponent(trackId)}/stream?app_name=${APP_NAME}`;
  }

  // Official download URL
  public static getDownloadUrl(trackId: string): string {
    return `${this.getActiveNode()}/tracks/${encodeURIComponent(trackId)}/download?app_name=${APP_NAME}`;
  }

  // Sanitize filename for local storage: "Artist - Title.mp3"
  public static sanitizeFilename(artist: string, title: string): string {
    const raw = `${artist} - ${title}.mp3`;
    return raw.replace(/[/\\?%*:|"<>]/g, '_').trim();
  }

  // Search tracks with signal support and node fallback
  public static async searchTracks(query: string, signal?: AbortSignal, limit: number = 10): Promise<Track[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    let attempts = 0;
    while (attempts < DISCOVERY_NODES.length) {
      const baseNode = this.getActiveNode();
      const endpoint = `${baseNode}/tracks/search?query=${encodeURIComponent(trimmed)}&limit=${limit}&app_name=${APP_NAME}`;

      try {
        const response = await fetch(endpoint, {
          signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        const items: AudiusApiTrack[] = Array.isArray(data?.data) ? data.data : [];

        return items.map((item) => this.mapApiTrackToTrack(item));
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          throw err;
        }
        console.warn(`Audius search failed on ${baseNode}, trying next node:`, err);
        this.rotateNode();
        attempts++;
      }
    }

    return [];
  }

  // Map API response to application Track model
  private static mapApiTrackToTrack(item: AudiusApiTrack): Track {
    const artwork = item.artwork;
    const coverUrl =
      artwork?.['480x480'] ||
      artwork?.['150x150'] ||
      artwork?.['1000x1000'] ||
      undefined;

    const artistName = (item.user?.name || item.user?.handle || 'Audius Artist').trim();
    const isStreamable = item.is_streamable !== false && item.access?.stream !== false;
    const isDownloadable = Boolean(item.is_downloadable && item.access?.download !== false);

    const streamUrl = this.getStreamUrl(item.id);
    const downloadUrl = this.getDownloadUrl(item.id);

    return {
      id: `audius-${item.id}`,
      audiusId: item.id,
      title: item.title?.trim() || 'Untitled Track',
      artist: artistName,
      album: item.genre || 'Audius Decentralized Music',
      duration: item.duration || 180,
      url: streamUrl,
      mood: 'Feels good',
      coverUrl,
      isAudius: true,
      isStreamable,
      isDownloadable,
      downloadUrl,
      isDownloaded: false,
      collection: 'Downloads',
      dateAdded: Math.floor(Date.now() / 1000),
    };
  }
}
