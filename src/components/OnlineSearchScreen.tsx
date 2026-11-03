import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search as SearchIcon, Globe, FolderDown, ShieldCheck, X, Sparkles } from 'lucide-react';
import { AppLanguage, Track } from '../types/music';
import { IranMusicService } from '../services/iranMusicService';
import { OfficialMusicService } from '../services/officialMusicService';
import { MusicDelService } from '../services/musicDelService';
import { TrackMatchCache } from '../services/trackMatchCache';
import { StreamResolverService } from '../services/streamResolverService';
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
  query?: string;
  onQueryChange?: (q: string) => void;
  onlineResults?: Track[];
  onOnlineResultsChange?: (res: Track[]) => void;
  searchMode?: 'online' | 'local';
  onSearchModeChange?: (mode: 'online' | 'local') => void;
  selectedCategory?: string;
  onCategoryChange?: (cat: string) => void;
}

const CATEGORY_CHIPS = ['All', 'Ambient', 'Electronic', 'Pop', 'Rock', 'Classical', 'Lo-Fi'];

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
  query: propQuery,
  onQueryChange,
  onlineResults: propOnlineResults,
  onOnlineResultsChange,
  searchMode: propSearchMode,
  onSearchModeChange,
  selectedCategory: propCategory,
  onCategoryChange,
}) => {
  const [localSearchMode, setLocalSearchMode] = useState<'online' | 'local'>('online');
  const [localQuery, setLocalQuery] = useState('');
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string>('All');
  const [localOnlineResults, setLocalOnlineResults] = useState<Track[]>([]);

  const searchMode = propSearchMode !== undefined ? propSearchMode : localSearchMode;
  const setSearchMode = onSearchModeChange || setLocalSearchMode;

  const query = propQuery !== undefined ? propQuery : localQuery;
  const setQuery = onQueryChange || setLocalQuery;

  const selectedCategory = propCategory !== undefined ? propCategory : localSelectedCategory;
  const setSelectedCategory = onCategoryChange || setLocalSelectedCategory;

  const onlineResults = propOnlineResults !== undefined ? propOnlineResults : localOnlineResults;
  const setOnlineResults = onOnlineResultsChange || setLocalOnlineResults;

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchingTrack, setMatchingTrack] = useState<Track | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedQueryRef = useRef<string>(query && onlineResults.length > 0 ? query.trim() : '');

  // 350ms debounced search
  useEffect(() => {
    if (searchMode !== 'online') {
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      if (onlineResults.length > 0) {
        setOnlineResults([]);
      }
      setIsSearching(false);
      setSearchError(null);
      lastFetchedQueryRef.current = '';
      return;
    }

    // If we already have results for this query (e.g. returning from player screen or switching tabs), preserve them
    if (trimmed === lastFetchedQueryRef.current && onlineResults.length > 0) {
      setIsSearching(false);
      return;
    }

    lastFetchedQueryRef.current = trimmed;

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
          const results = await MusicDelService.searchTracks(trimmed, controller.signal, 15);
          if (results.length > 0) {
            setOnlineResults(results);
          } else {
            const fallback = await IranMusicService.searchTracks(trimmed, controller.signal, 10);
            setOnlineResults(fallback);
          }
        } else {
          const officialTracks = await OfficialMusicService.searchOriginalTracks(
            trimmed,
            controller.signal,
            15
          );

          if (officialTracks.length > 0) {
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
              return track;
            });
            setOnlineResults(matchedTracks);
            // Pre-resolve top search candidates silently in the background so clicks are instantaneous
            matchedTracks.slice(0, 3).forEach((track) => {
              if (!track.isFullLength && !track.url.includes('/api/stream')) {
                StreamResolverService.resolveTrack(track).catch(() => {});
              }
            });
          } else {
            setOnlineResults([]);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Online search error:', err);
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
  }, [query, searchMode, isNationalNet, language]);

  // Local/Downloaded tracks catalog
  const localCatalog = useMemo(() => {
    return allTracks.filter(
      (t) =>
        downloadedIds.has(t.id) ||
        t.isDownloaded ||
        t.collection === 'Downloads' ||
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
    let list: Track[] = [];
    if (searchMode === 'online') {
      list = query.trim() ? onlineResults : allTracks.slice(0, 8);
    } else {
      list = localFiltered;
    }

    if (selectedCategory !== 'All' && !query.trim()) {
      list = list.filter(
        (t) =>
          t.mood?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          t.genre?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    return list;
  }, [searchMode, query, onlineResults, allTracks, localFiltered, selectedCategory]);

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
    <div className="flex-1 flex flex-col px-4 sm:px-6 pt-24 sm:pt-28 pb-32 overflow-hidden select-none animate-screen-enter">
      {/* ── Pinned Search & Filter Controls (Never scrolls or hides behind top navbar) ── */}
      <div className="shrink-0 mb-3">
        {/* Search Input Bar */}
        <div className="w-full relative mb-3">
          <div className="w-full h-12 rounded-full lastwave-glass px-4 flex items-center gap-3 shadow-sm border border-white/10">
            <SearchIcon className="w-4 h-4 text-[#71717a] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchMode === 'local'
                  ? (language === 'fa' ? 'جست‌وجو در فایل‌های دستگاه...' : 'Search downloads & device files...')
                  : isNationalNet
                  ? (language === 'fa' ? 'جست‌وجو در موزیکدل (نت ملی)...' : 'Search musicdel.ir (National Net)...')
                  : (language === 'fa' ? 'جست‌وجوی آنلاین آهنگ یا خواننده...' : 'Search artists, songs, albums...')
              }
              className="w-full bg-transparent text-sm text-[#ededed] placeholder-[#71717a] outline-none font-normal"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-[#71717a] hover:text-[#ededed]"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleSearchMode}
              className="flex items-center justify-center p-1.5 rounded-full hover:bg-white/[0.06] text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer active:scale-95 shrink-0"
              title={
                searchMode === 'online'
                  ? 'حالت آنلاین YouTube Music'
                  : 'حالت دانلودها و فایل‌های محلی'
              }
            >
              {searchMode === 'local' ? (
                <FolderDown className="w-4 h-4 text-cyan-400 stroke-[1.8]" />
              ) : isNationalNet ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2]" />
              ) : (
                <Globe className="w-4 h-4 text-[#a1a1a6] stroke-[1.8]" />
              )}
            </button>
          </div>
        </div>

        {/* Category Filter Chips with flex-shrink prevention and dedicated horizontal scrolling */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORY_CHIPS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedCategory(cat);
                  if (cat !== 'All') {
                    setQuery(cat.toLowerCase());
                  } else {
                    setQuery('');
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0 ${
                  isSelected
                    ? 'lastwave-glass-active text-[#ededed] shadow-sm'
                    : 'lastwave-glass-pill text-[#a1a1a6] hover:text-[#ededed]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Results Container ── */}
      <div className="rounded-2xl bg-[#14161f] border border-white/[0.06] p-3 flex-1 flex flex-col gap-1 shadow-xl overflow-y-auto no-scrollbar">
        {isSearching && displayRows.length === 0 ? (
          <div className="py-14 text-center text-[#a1a1a6] text-xs flex flex-col items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>{language === 'fa' ? 'در حال جستجو...' : 'Searching...'}</span>
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
              onOpenManualMatch={
                searchMode === 'online' ? (t) => setMatchingTrack(t) : undefined
              }
              isLiked={likedIds.has(track.id)}
              isDownloaded={downloadedIds.has(track.id) || track.isDownloaded}
              isDownloading={downloadingIds.has(track.id)}
            />
          ))
        ) : (
          <div className="py-16 text-center text-[#71717a] text-xs flex flex-col items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-[#71717a]/40" />
            <span>{language === 'fa' ? 'نتیجه‌ای یافت نشد' : 'No tracks found'}</span>
          </div>
        )}
      </div>

      {/* Manual Stream Match Modal */}
      {matchingTrack && (
        <ManualMatchModal
          track={matchingTrack}
          isOpen={Boolean(matchingTrack)}
          onClose={() => setMatchingTrack(null)}
          onMatched={(newVideoId) => handleMatchSelected(matchingTrack, newVideoId)}
        />
      )}
    </div>
  );
};
