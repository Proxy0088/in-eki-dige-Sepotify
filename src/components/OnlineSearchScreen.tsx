import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Globe, FolderDown, ShieldCheck } from 'lucide-react';
import { AppLanguage, Track } from '../types/music';
import { IranMusicService } from '../services/iranMusicService';
import { OfficialMusicService } from '../services/officialMusicService';
import { MusicDelService } from '../services/musicDelService';
import { YouTubeMusicProvider } from '../services/youtubeMusicProvider';
import { TrackMatcher } from '../services/trackMatcher';
import { TrackMatchCache } from '../services/trackMatchCache';
import { apiUrl } from '../services/apiConfig';
import { MusicRow } from './MusicRow';
import { ManualMatchModal } from './ManualMatchModal';

interface OnlineSearchScreenProps {
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDownload: (track: Track) => void;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
  downloadingIds?: Set<string>;
  isNationalNet?: boolean;
  language?: AppLanguage;
}

export const OnlineSearchScreen: React.FC<OnlineSearchScreenProps> = ({
  allTracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleLike,
  onToggleDownload,
  likedIds,
  downloadedIds,
  downloadingIds = new Set(),
  isNationalNet = false,
  language = 'en',
}) => {
  const [searchMode, setSearchMode] = useState<'online' | 'local'>('online');
  const [query, setQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchingTrack, setMatchingTrack] = useState<Track | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 350ms debounced search for online original music
  useEffect(() => {
    if (searchMode !== 'online') {
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setOnlineResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        if (isNationalNet) {
          // National Net mode: Direct search on musicdel.ir
          const results = await MusicDelService.searchTracks(trimmed, controller.signal, 15);
          if (results.length > 0) {
            setOnlineResults(results);
          } else {
            const fallback = await IranMusicService.searchTracks(trimmed, controller.signal, 10);
            setOnlineResults(fallback);
          }
        } else {
          // Standard Global Mode: Canonical iTunes Catalog + on-demand verified YouTube Music InnerTube streaming
          const officialTracks = await OfficialMusicService.searchOriginalTracks(
            trimmed,
            controller.signal,
            12
          );

          if (officialTracks.length > 0) {
            // Map canonical tracks with existing high-confidence cached streams
            const matchedTracks: Track[] = officialTracks.map((track) => {
              const cached = TrackMatchCache.getMatch(track.artist, track.title);
              if (cached?.videoId && (cached.score >= 65 || cached.manualOverride)) {
                return {
                  ...track,
                  url: apiUrl(`/api/stream?v=${cached.videoId}`),
                  youtubeId: cached.videoId,
                  isYouTube: true,
                  isFullLength: true,
                  isStreamable: true,
                };
              }
              // Authentic track - will be matched with 100% precision specifically for this artist+title on playback
              return track;
            });

            setOnlineResults(matchedTracks);
          } else {
            // Fallback for rare indie or Persian tracks not in iTunes: search YouTube Music directly
            const ytmCandidates = await YouTubeMusicProvider.searchCandidates(
              trimmed,
              controller.signal,
              12
            );

            const directTracks: Track[] = [];
            for (const cand of ytmCandidates) {
              if (cand.isSong || (cand.duration && cand.duration > 40 && cand.duration < 900)) {
                directTracks.push({
                  id: `yt-${cand.videoId}`,
                  title: cand.title,
                  artist: cand.artist,
                  album: cand.album || 'YouTube Music',
                  duration: cand.duration || 210,
                  url: apiUrl(`/api/stream?v=${cand.videoId}`),
                  mood: 'Feels good',
                  coverUrl: cand.thumbnailUrl,
                  youtubeId: cand.videoId,
                  isYouTube: true,
                  isFullLength: true,
                  isStreamable: true,
                  collection: 'YouTube Music Original',
                  dateAdded: Math.floor(Date.now() / 1000),
                });
              }
            }

            setOnlineResults(directTracks);
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('Online search error:', err);
          setSearchError(
            language === 'fa'
              ? 'خطا در برقراری ارتباط با سرور آنلاین'
              : 'Error connecting to online music server'
          );
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchMode, isNationalNet]);

  // Local/Downloaded tracks catalog
  const localCatalog = useMemo(() => {
    return allTracks.filter(
      (t) =>
        downloadedIds.has(t.id) ||
        t.isDownloaded ||
        t.collection === 'Downloads' ||
        t.collection === 'library 1' ||
        t.collection === 'library 2' ||
        t.id.startsWith('android-media-') ||
        t.id.startsWith('device-file-') ||
        t.id.startsWith('local-device-') ||
        t.id.startsWith('device-')
    );
  }, [allTracks, downloadedIds]);

  // Local filtered tracks
  const localFiltered = useMemo(() => {
    if (!query.trim()) return localCatalog;
    const q = query.toLowerCase();
    return localCatalog.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q)
    );
  }, [localCatalog, query]);

  // Selected tracks for rendering
  const displayRows = useMemo(() => {
    if (searchMode === 'online') {
      if (query.trim()) {
        return onlineResults;
      }
      return allTracks.slice(0, 5);
    } else {
      return localFiltered;
    }
  }, [searchMode, query, onlineResults, allTracks, localFiltered]);

  const toggleSearchMode = () => {
    setSearchMode((prev) => (prev === 'online' ? 'local' : 'online'));
  };

  const handleMatchSelected = (targetTrack: Track, newVideoId: string) => {
    const streamUrl = apiUrl(`/api/stream?v=${newVideoId}`);
    const updated: Track = {
      ...targetTrack,
      url: streamUrl,
      youtubeId: newVideoId,
      isYouTube: true,
      isFullLength: true,
      isStreamable: true,
    };

    setOnlineResults((prev) =>
      prev.map((item) => (item.id === targetTrack.id ? updated : item))
    );

    onPlayTrack(updated, displayRows);
  };

  return (
    <div className="flex-1 flex flex-col px-7 pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-36 overflow-y-auto no-scrollbar">
      {/* Rounded Search Bar with Mode Toggle Icon */}
      <div className="w-full relative mb-7">
        <div className="w-full h-13 rounded-full neumorph-input border border-white/5 flex items-center px-5 py-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchMode === 'local'
                ? (language === 'fa' ? 'جست‌وجو در دانلودها و پوشه‌ها...' : 'Search downloads & folders...')
                : isNationalNet
                ? (language === 'fa' ? 'جست‌وجو در موزیکدل musicdel.ir (نت ملی)...' : 'Search on musicdel.ir (National Net)...')
                : (language === 'fa' ? 'جست‌وجوی آنلاین نام آهنگ یا خواننده...' : 'Search online tracks (YouTube Music)...')
            }
            className="w-full bg-transparent text-sm text-[#e5e7eb] placeholder-[#7d828c] outline-none font-medium pr-10"
          />
          <button
            type="button"
            onClick={toggleSearchMode}
            className="absolute right-4 flex items-center justify-center p-1 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer active:scale-90"
            title={
              searchMode === 'online'
                ? 'حالت آنلاین YouTube Music (کلیک برای سوئیچ به پوشه‌ها و آهنگ‌های دانلودی)'
                : 'حالت پوشه‌ها و دانلودها (کلیک برای سوئیچ به جستجوی آنلاین)'
            }
            aria-label="Toggle Search Mode"
          >
            {searchMode === 'local' ? (
              <FolderDown className="w-5 h-5 stroke-[1.8] text-white" />
            ) : isNationalNet ? (
              <ShieldCheck className="w-5 h-5 stroke-[2] text-emerald-400" />
            ) : (
              <Globe className="w-5 h-5 stroke-[1.8]" />
            )}
          </button>
        </div>
      </div>

      {/* Music Rows matching Figma proportions */}
      <div className="flex flex-col gap-4">
        {isSearching && displayRows.length === 0 ? (
          <div className="py-12 text-center text-[#7e828d] text-sm animate-pulse">
            {language === 'fa' ? 'در حال جستجو در آرشیو آنلاین...' : 'Searching online tracks...'}
          </div>
        ) : displayRows.length > 0 ? (
          displayRows.map((track) => (
            <MusicRow
              key={track.id}
              track={track}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={(t) => onPlayTrack(t, displayRows)}
              onToggleLike={onToggleLike}
              onToggleDownload={onToggleDownload}
              onOpenManualMatch={(t) => setMatchingTrack(t)}
              isLiked={likedIds.has(track.id)}
              isDownloaded={downloadedIds.has(track.id)}
              isDownloading={downloadingIds.has(track.id)}
            />
          ))
        ) : (
          <div className="py-12 text-center text-[#7e828d] text-sm">
            {searchError ||
              (searchMode === 'online'
                ? (language === 'fa' ? `هیچ آهنگی برای "${query}" یافت نشد` : `No online tracks found for "${query}"`)
                : (language === 'fa' ? 'هیچ قطعه‌ای در پوشه‌ها و دانلودها یافت نشد' : 'No tracks found in downloads or folders'))}
          </div>
        )}
      </div>

      {/* Manual Match Modal */}
      {matchingTrack && (
        <ManualMatchModal
          track={matchingTrack}
          isOpen={Boolean(matchingTrack)}
          onClose={() => setMatchingTrack(null)}
          onMatchSelected={handleMatchSelected}
        />
      )}
    </div>
  );
};
