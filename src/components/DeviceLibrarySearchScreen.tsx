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
  onImportDeviceTracks?: (files: FileList) => Promise<number>;
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
  onImportDeviceTracks,
}) => {
  const [query, setQuery] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportDeviceTracks) {
      const count = await onImportDeviceTracks(e.target.files);
      setImportStatus(`${count} آهنگ با موفقیت از گوشی اضافه شد`);
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex-1 flex flex-col px-7 pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-36 overflow-y-auto no-scrollbar">
      {/* Hidden native input for audio files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
        multiple
        className="hidden"
      />

      {/* Header bar with Back button and search input */}
      <div className="w-full relative mb-3 flex items-center gap-2">
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

      {/* Device Scan / Import Action Card */}
      <div className="w-full mb-4 p-3 rounded-2xl bg-[#262626] border border-white/10 flex items-center justify-between shadow-md">
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-white">انتخاب آهنگ‌های دانلود شده در گوشی</span>
          <span className="text-[11px] text-[#9aa0a6]">پوشه Download یا Music گوشی شما</span>
        </div>
        <button
          type="button"
          onClick={handleOpenPicker}
          className="px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 shadow"
        >
          انتخاب فایل‌ها
        </button>
      </div>

      {importStatus && (
        <div className="w-full mb-3 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium animate-fadeIn">
          {importStatus}
        </div>
      )}

      {/* Auto-Scanned Device Music Status Badge */}
      <div className="flex items-center justify-between px-1 mb-4 text-xs text-[#9aa0a6]">
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <Smartphone className="w-3.5 h-3.5" />
          <span>آهنگ‌های گوشی ({filtered.length})</span>
        </span>
        <button
          type="button"
          onClick={handleOpenPicker}
          className="text-xs text-emerald-400 hover:underline cursor-pointer"
        >
          + افزودن آهنگ بیشتر
        </button>
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
