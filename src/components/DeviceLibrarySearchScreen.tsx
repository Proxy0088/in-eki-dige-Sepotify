import React, { useState } from 'react';
import { Search, ArrowLeft, Smartphone } from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';

interface DeviceLibrarySearchScreenProps {
  deviceTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
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

  // Live filter over auto-scanned device tracks
  const filtered = query.trim()
    ? deviceTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          t.album.toLowerCase().includes(query.toLowerCase())
      )
    : deviceTracks;

  // Render 5 result rows matching Figma geometry
  const displayRows = filtered.slice(0, 5);

  return (
    <div className="flex-1 flex flex-col px-7 pt-2 pb-6 overflow-y-auto no-scrollbar">
      {/* Header bar with Back button and search input */}
      <div className="w-full relative mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToHome}
          className="p-1.5 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
          title="Back to Home"
          aria-label="Back to Home"
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

      {/* Auto-Scanned Device Music Status Badge */}
      <div className="flex items-center justify-between px-1 mb-4 text-xs text-[#9aa0a6]">
        <span className="flex items-center gap-1.5 font-medium text-teal-400">
          <Smartphone className="w-3.5 h-3.5" />
          <span>آهنگ‌های شناسایی‌شده در گوشی</span>
        </span>
        <span className="font-mono text-[11px] text-[#e5e7eb]">
          {filtered.length} فایل صوتی
        </span>
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
              onPlay={onPlayTrack}
              onToggleLike={onToggleLike}
              onToggleDownload={onToggleDownload}
              isLiked={likedIds.has(track.id)}
              isDownloaded={downloadedIds.has(track.id)}
            />
          ))
        ) : (
          <div className="py-16 text-center text-[#7e828d] text-sm">
            هیچ آهنگی با عنوان &quot;{query}&quot; در حافظه گوشی یافت نشد
          </div>
        )}
      </div>
    </div>
  );
};
