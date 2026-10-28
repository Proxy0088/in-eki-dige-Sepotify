import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Track } from '../types/music';
import { MusicRow } from './MusicRow';

interface OnlineSearchScreenProps {
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onToggleDownload: (track: Track) => void;
  likedIds: Set<string>;
  downloadedIds: Set<string>;
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
}) => {
  const [query, setQuery] = useState('');

  // Online search filters songs or queries catalog
  const filtered = query.trim()
    ? allTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          t.mood.toLowerCase().includes(query.toLowerCase()) ||
          t.album.toLowerCase().includes(query.toLowerCase())
      )
    : allTracks;

  // Display exactly 5 rows matching the 5-row reference in Figma screenshot
  const displayRows = filtered.slice(0, 5);

  return (
    <div className="flex-1 flex flex-col px-7 pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-36 overflow-y-auto no-scrollbar">
      {/* Rounded Search Bar with Globe Icon matching reference */}
      <div className="w-full relative mb-7">
        <div className="w-full h-13 rounded-full neumorph-input border border-white/5 flex items-center px-5 py-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for song"
            className="w-full bg-transparent text-sm text-[#e5e7eb] placeholder-[#7d828c] outline-none font-medium pr-10"
          />
          <div className="absolute right-4.5 flex items-center pointer-events-none text-[#9aa0a6]">
            <Globe className="w-5 h-5 stroke-[1.8]" />
          </div>
        </div>
      </div>

      {/* 5 Vertically Stacked Music Rows matching Figma proportions */}
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
          <div className="py-12 text-center text-[#7e828d] text-sm">
            No online tracks found for &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
};
