import React, { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';

interface LibrarySearchScreenProps {
  libraryTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDownload: (track: Track) => void;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
  onBackToMainLibrary: () => void;
}

export const LibrarySearchScreen: React.FC<LibrarySearchScreenProps> = ({
  libraryTracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleLike,
  onToggleDownload,
  likedIds,
  downloadedIds,
  onBackToMainLibrary,
}) => {
  const [query, setQuery] = useState('');

  // Local-only search over the user's saved library
  const filtered = query.trim()
    ? libraryTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          t.album.toLowerCase().includes(query.toLowerCase())
      )
    : libraryTracks;

  // Render exactly 5 rows to match Figma reference geometry
  const displayRows = filtered.slice(0, 5);

  return (
    <div className="flex-1 flex flex-col px-7 pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-36 overflow-y-auto no-scrollbar">
      {/* Search Field with Magnifying Glass icon on the right (matching right screenshot) */}
      <div className="w-full relative mb-7 flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToMainLibrary}
          className="p-1.5 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
          title="Back to Library main screen"
          aria-label="Back to Library"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 h-13 rounded-full neumorph-input border border-white/5 flex items-center px-5 py-2 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for song"
            autoFocus
            className="w-full bg-transparent text-sm text-[#e5e7eb] placeholder-[#7d828c] outline-none font-medium pr-8"
          />
          <div className="absolute right-4.5 flex items-center pointer-events-none text-[#9aa0a6]">
            <Search className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 5 Vertically Stacked Music Rows */}
      <div className="flex flex-col gap-4">
        {displayRows.length > 0 ? (
          displayRows.map((track) => (
            <MusicRow
              key={track.id}
              track={track}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={(t) => onPlayTrack(t, displayRows)}
              onToggleLike={onToggleLike}
              onToggleDownload={onToggleDownload}
              isLiked={likedIds.has(track.id)}
              isDownloaded={downloadedIds.has(track.id)}
            />
          ))
        ) : (
          <div className="py-16 text-center text-[#7e828d] text-sm">
            No local songs matching &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
};
