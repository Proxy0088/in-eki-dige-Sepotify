import React, { useState, useEffect, useMemo } from 'react';
import {
  Search as SearchIcon,
  Heart,
  Bookmark,
  Star,
  Download,
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
    <div className="flex-1 flex flex-col px-4 sm:px-5 pt-[72px] sm:pt-[80px] pb-36 overflow-y-auto no-scrollbar select-none">
      {/* ── Top Header matching screenshot_4.png ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        {selectedCollection ? (
          <button
            type="button"
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-2 lastwave-glass-pill px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Playlists</span>
          </button>
        ) : (
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">
              Playlists
            </h1>
            <span className="text-xs font-medium text-white/50 mt-1">
              {userLibraries.length} Playlists • {tracks.length} Tracks
            </span>
          </div>
        )}

        {/* Action icons on right: Add + Sort / Search */}
        <div className="flex items-center gap-2">
          {!selectedCollection && (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="w-9 h-9 rounded-full lastwave-glass-pill flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all shadow-sm"
                title="Create new playlist"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                className="lastwave-glass-pill px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white cursor-pointer active:scale-95 transition-all shadow-sm"
              >
                <ListFilter className="w-3.5 h-3.5 stroke-[2]" />
                <span>Sort</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenLibrarySearch}
            className="w-9 h-9 rounded-full lastwave-glass-pill flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all shadow-sm"
            aria-label="Search within library"
          >
            <SearchIcon className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {selectedCollection === null ? (
        /* ── Playlists List Cards (matching screenshot_4.png) ── */
        <div className="flex flex-col gap-2.5">
          {userLibraries.map((libName) => {
            const colTracks = getTracksForCollection(libName);
            const cover = getCollectionArtwork(libName);

            return (
              <div
                key={libName}
                onClick={() => setSelectedCollection(libName)}
                className="w-full h-[76px] rounded-[24px] bg-[#14151c] border border-white/5 p-3 flex items-center justify-between gap-3 shadow-md hover:bg-[#181a24] active:scale-[0.99] transition-all cursor-pointer group"
              >
                {/* Cover Preview squircle */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative w-13 h-13 rounded-[16px] overflow-hidden bg-[#1a1c26] shrink-0 border border-white/5 shadow-sm flex items-center justify-center">
                    {cover ? (
                      <img
                        src={cover}
                        alt={libName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Music className="w-6 h-6 text-white/40" />
                    )}
                  </div>

                  {/* Title & Count */}
                  <div className="flex flex-col min-w-0 justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-white truncate tracking-tight">
                        {libName}
                      </span>
                      {libName.toLowerCase().includes('like') && (
                        <Pin className="w-3 h-3 text-cyan-400 rotate-45 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-white/50 font-medium">
                      {colTracks.length} tracks
                    </span>
                  </div>
                </div>

                {/* Right Actions: Play circular button & 3-dots */}
                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (colTracks.length > 0) {
                        onPlayTrack(colTracks[0], colTracks);
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-md hover:bg-slate-100 active:scale-90 transition-all cursor-pointer"
                    aria-label={`Play ${libName}`}
                  >
                    <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCollection(libName)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Collection Tracks Detail View ── */
        <div className="flex flex-col gap-2">
          {/* Header row with Play All button */}
          <div className="flex items-center justify-between pb-2 px-1">
            <span className="text-lg font-bold text-white">
              {selectedCollection}
            </span>
            {activeTracks.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayTrack(activeTracks[0], activeTracks)}
                className="lastwave-glass-active px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Play All</span>
              </button>
            )}
          </div>

          <div className="rounded-[24px] bg-[#14161f] border border-white/5 p-3 flex flex-col gap-1.5 shadow-xl">
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
              <div className="flex flex-col items-center justify-center py-16 text-center text-white/50 px-4">
                <Music className="w-10 h-10 mb-2 text-white/20" />
                <p className="text-sm font-semibold text-white/80">
                  این پلی‌لیست در حال حاضر خالی است
                </p>
                <p className="text-xs text-white/45 mt-1">
                  می‌توانید آهنگ‌ها را هنگام پخش با کلیک روی افزودن به پلی‌لیست به اینجا اضافه کنید.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Playlist Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="lastwave-card p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Create New Playlist</h3>
            <p className="text-xs text-white/60 mb-4">Enter a name for your new playlist folder:</p>

            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Playlist name..."
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm outline-none focus:border-cyan-400 mb-5"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-white/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="lastwave-glass-active px-5 py-2 rounded-full text-xs font-bold text-white disabled:opacity-40 cursor-pointer shadow-md"
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
