import React, { useState, useEffect, useMemo } from 'react';
import {
  Search as SearchIcon,
  ArrowLeft,
  Plus,
  Play,
  MoreVertical,
  Music,
  Pin,
  ListFilter,
} from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';
import { StorageService } from '../services/storage';

interface LibraryScreenProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDownload: (track: Track) => void;
  onOpenLibrarySearch: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  likedIds,
  downloadedIds,
  onPlayTrack,
  onToggleLike,
  onToggleDownload,
  onOpenLibrarySearch,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [userLibraries, setUserLibraries] = useState<string[]>(() =>
    StorageService.getUserLibraries()
  );
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [sortOption, setSortOption] = useState<'default' | 'name' | 'count'>('default');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);

  // Keep libraries synchronized
  useEffect(() => {
    const stored = StorageService.getUserLibraries();
    const trackCollections = new Set(
      tracks
        .map((t) => t.collection?.trim())
        .filter((c): c is string => Boolean(c && c !== 'recents'))
    );
    const combined = Array.from(new Set([...stored, ...Array.from(trackCollections)]));
    setUserLibraries(combined);
  }, [tracks]);

  // Compute track count per library
  const getTracksForCollection = useMemo(() => {
    return (name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'liked' || lower.includes('like') || lower.includes('علاقه')) {
        return tracks.filter((t) => likedIds.has(t.id));
      }
      if (lower === 'downloads' || lower.includes('دانلود')) {
        return tracks.filter(
          (t) =>
            downloadedIds.has(t.id) ||
            t.id.startsWith('android-media-') ||
            t.id.startsWith('device-file-') ||
            t.id.startsWith('device-')
        );
      }
      return tracks.filter((t) => (t.collection || '').trim().toLowerCase() === lower);
    };
  }, [tracks, likedIds, downloadedIds]);

  // Sorted libraries
  const displayedLibraries = useMemo(() => {
    const list = [...userLibraries];
    if (sortOption === 'name') {
      return list.sort((a, b) => a.localeCompare(b));
    }
    if (sortOption === 'count') {
      return list.sort((a, b) => getTracksForCollection(b).length - getTracksForCollection(a).length);
    }
    return list;
  }, [userLibraries, sortOption, getTracksForCollection]);

  // Tracks for active collection
  const activeTracks = useMemo(() => {
    if (!selectedCollection) return [];
    return getTracksForCollection(selectedCollection).sort(
      (a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)
    );
  }, [selectedCollection, getTracksForCollection]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (trimmed) {
      const updated = StorageService.addUserLibrary(trimmed);
      setUserLibraries(updated);
      setNewFolderName('');
      setShowAddModal(false);
      setSelectedCollection(trimmed);
    }
  };

  const getCollectionArtwork = (name: string) => {
    const colTracks = getTracksForCollection(name);
    const firstWithCover = colTracks.find((t) => Boolean(t.coverUrl));
    return firstWithCover?.coverUrl || null;
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 pt-24 sm:pt-28 pb-32 overflow-y-auto no-scrollbar select-none animate-screen-enter">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        {selectedCollection ? (
          <button
            type="button"
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-1.5 lastwave-glass-pill px-3 py-1 rounded-full text-xs font-medium text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Playlists</span>
          </button>
        ) : (
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#ededed] tracking-tight leading-none">
              Playlists
            </h1>
            <span className="text-xs font-normal text-[#a1a1a6] mt-1 tabular-nums">
              {userLibraries.length} playlists • {tracks.length} tracks
            </span>
          </div>
        )}

        {/* Action icons on right */}
        <div className="flex items-center gap-1.5">
          {!selectedCollection && (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="w-8 h-8 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
                title="Create new playlist"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="lastwave-glass-pill px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
                >
                  <ListFilter className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span>Sort ▾</span>
                </button>

                {showSortDropdown && (
                  <div className="absolute right-0 top-8 w-36 rounded-xl bg-[#1c1e28]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1 z-30 animate-dropdown">
                    <button
                      type="button"
                      onClick={() => {
                        setSortOption('default');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left rounded-lg font-medium transition-colors cursor-pointer ${
                        sortOption === 'default' ? 'bg-white/10 text-[#ededed]' : 'text-[#a1a1a6] hover:bg-white/[0.06]'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortOption('name');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left rounded-lg font-medium transition-colors cursor-pointer ${
                        sortOption === 'name' ? 'bg-white/10 text-[#ededed]' : 'text-[#a1a1a6] hover:bg-white/[0.06]'
                      }`}
                    >
                      Name (A-Z)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortOption('count');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left rounded-lg font-medium transition-colors cursor-pointer ${
                        sortOption === 'count' ? 'bg-white/10 text-[#ededed]' : 'text-[#a1a1a6] hover:bg-white/[0.06]'
                      }`}
                    >
                      Track Count
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onOpenLibrarySearch}
            className="w-8 h-8 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
            aria-label="Search within library"
          >
            <SearchIcon className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        </div>
      </div>

      {selectedCollection === null ? (
        /* ── Playlists List Cards ── */
        <div className="flex flex-col gap-2">
          {displayedLibraries.map((libName) => {
            const colTracks = getTracksForCollection(libName);
            const cover = getCollectionArtwork(libName);

            return (
              <div
                key={libName}
                onClick={() => setSelectedCollection(libName)}
                className="w-full h-16 rounded-2xl bg-[#12141c] border border-white/[0.06] p-2.5 flex items-center justify-between gap-3 shadow-sm hover:bg-[#161822] active:scale-[0.99] transition-colors cursor-pointer group"
              >
                {/* Cover Preview */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#181a24] shrink-0 border border-white/5 shadow-sm flex items-center justify-center">
                    {cover ? (
                      <img
                        src={cover}
                        alt={libName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-[#71717a]" />
                    )}
                  </div>

                  {/* Title & Count */}
                  <div className="flex flex-col min-w-0 justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#ededed] truncate tracking-tight">
                        {libName}
                      </span>
                      {libName.toLowerCase().includes('like') && (
                        <Pin className="w-3 h-3 text-cyan-400 rotate-45 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-[#a1a1a6] font-normal tabular-nums">
                      {colTracks.length} tracks
                    </span>
                  </div>
                </div>

                {/* Right Actions */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (colTracks.length > 0) {
                        onPlayTrack(colTracks[0], colTracks);
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-[#ededed] text-[#090a0f] flex items-center justify-center shadow-sm hover:bg-white active:scale-95 transition-transform cursor-pointer"
                    aria-label={`Play ${libName}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCollection(libName)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#71717a] hover:text-[#ededed]"
                  >
                    <MoreVertical className="w-3.5 h-3.5 stroke-[1.8]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Collection Tracks Detail View ── */
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1 px-1">
            <span className="text-base font-semibold text-[#ededed]">
              {selectedCollection}
            </span>
            {activeTracks.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayTrack(activeTracks[0], activeTracks)}
                className="lastwave-glass-active px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium text-[#ededed] shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play all</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl bg-[#14161f] border border-white/[0.06] p-3 flex flex-col gap-1 shadow-xl">
            {activeTracks.length > 0 ? (
              activeTracks.map((track) => (
                <MusicRow
                  key={track.id}
                  track={track}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onPlay={(t) => onPlayTrack(t, activeTracks)}
                  onToggleLike={() => onToggleLike(track)}
                  onToggleDownload={() => onToggleDownload(track)}
                  isLiked={likedIds.has(track.id)}
                  isDownloaded={
                    downloadedIds.has(track.id) ||
                    track.id.startsWith('android-media-') ||
                    track.id.startsWith('device-file-') ||
                    track.id.startsWith('device-')
                  }
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[#71717a] px-4">
                <Music className="w-8 h-8 mb-2 text-[#71717a]/30" />
                <p className="text-sm font-medium text-[#a1a1a6]">
                  این پلی‌لیست خالی است
                </p>
                <p className="text-xs text-[#71717a] mt-1">
                  می‌توانید آهنگ‌ها را هنگام پخش به این پلی‌لیست اضافه کنید.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Playlist Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="lastwave-card p-5 w-full max-w-xs border border-white/10 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-[#ededed] mb-1">New playlist</h3>
            <p className="text-xs text-[#a1a1a6] mb-3">Enter a name for the folder:</p>

            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Playlist name..."
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[#ededed] placeholder-[#71717a] text-xs outline-none focus:border-cyan-400 mb-4"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-normal text-[#a1a1a6] hover:text-[#ededed] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="lastwave-glass-active px-4 py-1.5 rounded-full text-xs font-medium text-[#ededed] disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
