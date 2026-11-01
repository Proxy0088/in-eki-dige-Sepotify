import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Globe, FolderDown } from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';
import { AudiusService } from '../services/audius';

interface OnlineSearchScreenProps {
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onToggleDownload: (track: Track) => void;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
  downloadingIds?: Set<string>;
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
}) => {
  const [searchMode, setSearchMode] = useState<'online' | 'local'>('online');
  const [query, setQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 350ms debounced search for Audius decentralized music
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
        const results = await AudiusService.searchTracks(trimmed, controller.signal, 10);
        setOnlineResults(results);
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('Audius search error:', err);
          setSearchError('خطا در برقراری ارتباط با نودهای غیرمتمرکز');
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchMode]);

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
      // Show default catalog suggestions if search input is empty
      return allTracks.slice(0, 5);
    } else {
      return localFiltered;
    }
  }, [searchMode, query, onlineResults, allTracks, localFiltered]);

  const toggleSearchMode = () => {
    setSearchMode((prev) => (prev === 'online' ? 'local' : 'online'));
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
              searchMode === 'online'
                ? 'Search for song'
                : 'Search in downloads & folders'
            }
            className="w-full bg-transparent text-sm text-[#e5e7eb] placeholder-[#7d828c] outline-none font-medium pr-10"
          />
          <button
            type="button"
            onClick={toggleSearchMode}
            className="absolute right-4 flex items-center justify-center p-1 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer active:scale-90"
            title={
              searchMode === 'online'
                ? 'حالت آنلاین Audius (کلیک برای سوئیچ به پوشه‌ها و آهنگ‌های دانلودی)'
                : 'حالت پوشه‌ها و دانلودها (کلیک برای سوئیچ به جستجوی آنلاین)'
            }
            aria-label="Toggle Search Mode"
          >
            {searchMode === 'online' ? (
              <Globe className="w-5 h-5 stroke-[1.8]" />
            ) : (
              <FolderDown className="w-5 h-5 stroke-[1.8] text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Music Rows matching Figma proportions */}
      <div className="flex flex-col gap-4">
        {isSearching && displayRows.length === 0 ? (
          <div className="py-12 text-center text-[#7e828d] text-sm animate-pulse">
            در حال جستجو در Audius...
          </div>
        ) : displayRows.length > 0 ? (
          displayRows.map((track) => (
            <MusicRow
              key={track.id}
              track={track}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={onPlayTrack}
              onToggleLike={onToggleLike}
              onToggleDownload={onToggleDownload}
              isLiked={likedIds.has(track.id)}
              isDownloaded={downloadedIds.has(track.id)}
              isDownloading={downloadingIds.has(track.id)}
            />
          ))
        ) : (
          <div className="py-12 text-center text-[#7e828d] text-sm">
            {searchError ||
              (searchMode === 'online'
                ? `No online tracks found for "${query}"`
                : `هیچ قطعه‌ای در پوشه‌ها و دانلودها یافت نشد`)}
          </div>
        )}
      </div>
    </div>
  );
};
