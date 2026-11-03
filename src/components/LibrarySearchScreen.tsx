import React, { useState } from 'react';
import { Search, ArrowLeft, X } from 'lucide-react';
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

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-5 pt-[72px] sm:pt-[80px] pb-36 overflow-y-auto no-scrollbar select-none">
      {/* Header with back button and search input */}
      <div className="w-full relative mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToMainLibrary}
          className="w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer active:scale-90 shrink-0"
          title="Back to Library"
          aria-label="Back to Library"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex-1 h-12 rounded-full lastwave-glass px-4 flex items-center gap-3 border border-white/10 shadow-md">
          <Search className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search within library..."
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-white/45 outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Music Rows container */}
      <div className="rounded-[24px] bg-[#14161f] border border-white/5 p-3 flex-1 flex flex-col gap-1.5 shadow-xl">
        {filtered.length > 0 ? (
          filtered.map((track) => (
            <MusicRow
              key={track.id}
              track={track}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={(t) => onPlayTrack(t, filtered)}
              onToggleLike={onToggleLike}
              onToggleDownload={onToggleDownload}
              isLiked={likedIds.has(track.id)}
              isDownloaded={downloadedIds.has(track.id)}
            />
          ))
        ) : (
          <div className="py-16 text-center text-white/45 text-sm">
            هیچ آهنگی مطابق با &quot;{query}&quot; در کتابخانه یافت نشد
          </div>
        )}
      </div>
    </div>
  );
};
