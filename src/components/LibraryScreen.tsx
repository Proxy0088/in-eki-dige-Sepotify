import React, { useState } from 'react';
import {
  Search as SearchIcon,
  Heart,
  Bookmark,
  Star,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';

interface LibraryScreenProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
  onPlayTrack: (track: Track) => void;
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
  const [selectedCollection, setSelectedCollection] = useState<
    'liked' | 'library 1' | 'library 2' | 'Downloads' | null
  >(null);

  // Filter tracks for the active collection
  const collectionTracks = React.useMemo(() => {
    if (!selectedCollection) return [];
    if (selectedCollection === 'liked') {
      return tracks.filter((t) => likedIds.has(t.id));
    }
    if (selectedCollection === 'Downloads') {
      return tracks.filter((t) => downloadedIds.has(t.id));
    }
    if (selectedCollection === 'library 1') {
      return tracks.filter((t) => t.collection === 'library 1');
    }
    if (selectedCollection === 'library 2') {
      return tracks.filter((t) => t.collection === 'library 2');
    }
    return [];
  }, [selectedCollection, tracks, likedIds, downloadedIds]);

  return (
    <div className="flex-1 flex flex-col px-7 pt-1 pb-6 overflow-y-auto no-scrollbar">
      {/* Top action row: Magnifying glass button on the right to open Library Search */}
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
        /* 4 Collection Tiles Grid (2x2) strictly matching Figma reference */
        <div className="grid grid-cols-2 gap-x-5 gap-y-7">
          {/* Tile 1: liked */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedCollection('liked')}
              className="w-full aspect-square rounded-[34px] p-2 neumorph-tile-outer border border-white/5 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center"
              aria-label="Liked songs"
            >
              <div className="w-full h-full rounded-[25px] bg-black border border-[#444850] flex items-center justify-center shadow-inner">
                <Heart className="w-12 h-12 text-[#d1d5db] fill-[#d1d5db]" />
              </div>
            </button>
            <span className="font-tech text-base md:text-lg font-bold text-[#9aa0a6] mt-3 tracking-wide select-none lowercase">
              liked
            </span>
          </div>

          {/* Tile 2: library 1 */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedCollection('library 1')}
              className="w-full aspect-square rounded-[34px] p-2 neumorph-tile-outer border border-white/5 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center"
              aria-label="Library 1 playlist"
            >
              <div className="w-full h-full rounded-[25px] bg-black border border-[#444850] flex items-center justify-center shadow-inner">
                <Bookmark className="w-12 h-12 text-[#d1d5db] fill-[#d1d5db]" />
              </div>
            </button>
            <span className="font-tech text-base md:text-lg font-bold text-[#9aa0a6] mt-3 tracking-wide select-none lowercase">
              library 1
            </span>
          </div>

          {/* Tile 3: library 2 */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedCollection('library 2')}
              className="w-full aspect-square rounded-[34px] p-2 neumorph-tile-outer border border-white/5 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center"
              aria-label="Library 2 playlist"
            >
              <div className="w-full h-full rounded-[25px] bg-black border border-[#444850] flex items-center justify-center shadow-inner">
                <Star className="w-12 h-12 text-[#d1d5db] fill-[#d1d5db]" />
              </div>
            </button>
            <span className="font-tech text-base md:text-lg font-bold text-[#9aa0a6] mt-3 tracking-wide select-none lowercase">
              library 2
            </span>
          </div>

          {/* Tile 4: Downloads */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedCollection('Downloads')}
              className="w-full aspect-square rounded-[34px] p-2 neumorph-tile-outer border border-white/5 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center"
              aria-label="Downloaded offline songs"
            >
              <div className="w-full h-full rounded-[25px] bg-black border border-[#444850] flex items-center justify-center shadow-inner">
                <Download className="w-12 h-12 text-[#d1d5db] stroke-[2.5]" />
              </div>
            </button>
            <span className="font-tech text-base md:text-lg font-bold text-[#9aa0a6] mt-3 tracking-wide select-none">
              Downloads
            </span>
          </div>
        </div>
      ) : (
        /* Collection Tracks List reusing the 5-row architecture */
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
                onPlay={onPlayTrack}
                onToggleLike={onToggleLike}
                onToggleDownload={onToggleDownload}
                isLiked={likedIds.has(track.id)}
                isDownloaded={downloadedIds.has(track.id)}
              />
            ))
          ) : (
            <div className="py-16 text-center text-[#7e828d] text-sm">
              No tracks in {selectedCollection} yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
