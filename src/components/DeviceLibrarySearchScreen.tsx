import React, { useState } from 'react';
import { Search, ArrowLeft, X } from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';

interface DeviceLibrarySearchScreenProps {
  deviceTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDownload: (track: Track) => void;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
  onBackToHome: () => void;
}

export const DeviceLibrarySearchScreen: React.FC<DeviceLibrarySearchScreenProps> = ({
  deviceTracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleLike,
  onToggleDownload,
  likedIds,
  downloadedIds,
  onBackToHome,
}) => {
  const [query, setQuery] = useState('');

  // Live filter over real device tracks
  const filtered = query.trim()
    ? deviceTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          t.album.toLowerCase().includes(query.toLowerCase())
      )
    : deviceTracks;

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-5 pt-24 sm:pt-28 pb-36 overflow-y-auto no-scrollbar select-none animate-screen-enter">
      {/* Header bar with Back button and search input */}
      <div className="w-full relative mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToHome}
          className="w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer active:scale-90 shrink-0"
          title="Back to Home"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex-1 h-12 rounded-full lastwave-glass px-4 flex items-center gap-3 border border-white/10 shadow-md">
          <Search className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search device audio files..."
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

      {/* Vertically Stacked Music Rows inside LastWave Card */}
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
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-white/45 text-sm">
              {query ? `هیچ آهنگی با عنوان "${query}" در حافظه گوشی یافت نشد` : 'هنوز آهنگی از حافظه گوشی بارگذاری نشده است'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
