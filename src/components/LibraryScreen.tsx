import React, { useState, useEffect, useMemo } from 'react';
import {
  Search as SearchIcon,
  Heart,
  Bookmark,
  Star,
  Download,
  ArrowLeft,
  FolderPlus,
  Music,
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

  // Keep libraries synchronized from storage & tracks
  useEffect(() => {
    const stored = StorageService.getUserLibraries();
    // Also include any distinct collection names found on tracks
    const trackCollections = new Set(
      tracks
        .map((t) => t.collection?.trim())
        .filter((c): c is string => Boolean(c && c !== 'recents'))
    );
    const combined = Array.from(new Set([...stored, ...Array.from(trackCollections)]));
    setUserLibraries(combined);
  }, [tracks]);

  // Filter tracks for the active collection, strictly sorted by date (dateAdded DESC)
  const collectionTracks = useMemo(() => {
    if (!selectedCollection) return [];
    const lower = selectedCollection.toLowerCase();
    let list: Track[] = [];

    if (lower === 'liked' || lower.includes('like') || lower.includes('علاقه')) {
      list = tracks.filter((t) => likedIds.has(t.id));
    } else if (lower === 'downloads' || lower.includes('دانلود')) {
      list = tracks.filter(
        (t) =>
          downloadedIds.has(t.id) ||
          t.id.startsWith('android-media-') ||
          t.id.startsWith('device-file-') ||
          t.id.startsWith('device-')
      );
    } else {
      // Dynamic matching for any custom folder / library created by user
      list = tracks.filter(
        (t) => (t.collection || '').trim().toLowerCase() === lower
      );
    }
    return list.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  }, [selectedCollection, tracks, likedIds, downloadedIds]);

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

  const getCollectionIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'liked' || lower.includes('like') || lower.includes('علاقه')) {
      return <Heart className="w-12 h-12 text-[#d1d5db] fill-[#d1d5db]" />;
    }
    if (lower === 'downloads' || lower.includes('دانلود')) {
      return <Download className="w-12 h-12 text-[#d1d5db] stroke-[2.5]" />;
    }
    if (lower.includes('2')) {
      return <Star className="w-12 h-12 text-[#d1d5db] fill-[#d1d5db]" />;
    }
    return <Bookmark className="w-12 h-12 text-[#d1d5db] fill-[#d1d5db]" />;
  };

  return (
    <div className="flex-1 flex flex-col px-7 pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-36 overflow-y-auto no-scrollbar">
      {/* Top action row: Back button & Magnifying glass */}
      <div className="w-full flex items-center justify-between mb-4 px-1">
        {selectedCollection ? (
          <button
            type="button"
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-1.5 text-xs text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-tech uppercase tracking-wider">Back</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onOpenLibrarySearch}
          className="p-2 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer ml-auto"
          aria-label="Search within library"
        >
          <SearchIcon className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {selectedCollection === null ? (
        /* Collection Tiles Grid - Shows all user libraries dynamically with identical neumorphic design */
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 pb-4">
          {userLibraries.map((libName) => (
            <div key={libName} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setSelectedCollection(libName)}
                className="w-full aspect-square rounded-[34px] p-2 neumorph-tile-outer border border-white/5 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center"
                aria-label={`Open ${libName} folder`}
              >
                <div className="w-full h-full rounded-[25px] bg-black border border-[#444850] flex items-center justify-center shadow-inner">
                  {getCollectionIcon(libName)}
                </div>
              </button>
              <span className="font-tech text-base md:text-lg font-bold text-[#9aa0a6] mt-3 tracking-wide select-none text-center truncate max-w-[140px]">
                {libName}
              </span>
            </div>
          ))}

          {/* Add New Folder Tile */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full aspect-square rounded-[34px] p-2 neumorph-tile-outer border border-dashed border-white/10 hover:border-white/30 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center group"
              aria-label="Add new folder"
            >
              <div className="w-full h-full rounded-[25px] bg-black/60 border border-[#444850]/50 flex items-center justify-center shadow-inner group-hover:bg-black/80 transition-colors">
                <FolderPlus className="w-11 h-11 text-[#7e828d] group-hover:text-white transition-colors" />
              </div>
            </button>
            <span className="font-tech text-base md:text-lg font-bold text-[#7e828d] mt-3 tracking-wide select-none">
              + new folder
            </span>
          </div>
        </div>
      ) : (
        /* Collection Tracks List */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 px-1">
            <span className="font-tech text-lg text-[#d1d5db] font-semibold">
              {selectedCollection}
            </span>
            <span className="text-xs text-[#7e828d]">
              {collectionTracks.length} tracks
            </span>
          </div>

          {collectionTracks.length > 0 ? (
            collectionTracks.map((track) => (
              <MusicRow
                key={track.id}
                track={track}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                onPlay={(t) => onPlayTrack(t, collectionTracks)}
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
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#7e828d] px-4">
              <Music className="w-12 h-12 mb-3 text-white/20" />
              <p className="text-sm font-roboto mb-1 text-white/70">
                این پوشه در حال حاضر خالی است
              </p>
              <p className="text-xs text-[#7e828d]">
                هنگام پخش هر موزیک روی دکمه قلب کلیک کرده و این پوشه را انتخاب کنید
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Folder Modal inside LibraryScreen */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-[320px] max-w-[calc(100%-24px)] rounded-[32px] bg-[#1e1e1e] border border-white/15 p-6 flex flex-col items-center select-none shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-['Orbitron',sans-serif] font-bold text-white text-[17px] mb-4 text-center">
              Create New Folder
            </h3>
            <form onSubmit={handleCreateFolder} className="w-full flex flex-col gap-3.5">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                autoFocus
                className="w-full bg-[#141414] border border-white/20 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/60 text-center"
              />
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-bold font-['Orbitron',sans-serif] hover:bg-[#E4E4E4] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
