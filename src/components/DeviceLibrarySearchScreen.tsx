import React, { useState } from 'react';
import { Search, ArrowLeft, Smartphone, RefreshCw, AlertCircle, FolderPlus } from 'lucide-react';
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
  onScanDeviceAudio?: () => Promise<number>;
  onScanDirectory?: () => Promise<number>;
  isScanning?: boolean;
  permissionDenied?: boolean;
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
  onScanDeviceAudio,
  onScanDirectory,
  isScanning = false,
  permissionDenied = false,
}) => {
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Live filter over real device tracks
  const filtered = query.trim()
    ? deviceTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          t.album.toLowerCase().includes(query.toLowerCase())
      )
    : deviceTracks;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportDeviceTracks) {
      const count = await onImportDeviceTracks(e.target.files);
      setStatusMessage(`${count} آهنگ از حافظه دستگاه اضافه شد`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleManualScan = async () => {
    if (onScanDeviceAudio) {
      const count = await onScanDeviceAudio();
      if (count > 0) {
        setStatusMessage(`${count} آهنگ جدید شناسایی شد`);
      } else {
        setStatusMessage('اسکن پایان یافت؛ برای انتخاب دستی از دکمه زیر استفاده کنید');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDirectoryScan = async () => {
    if (onScanDirectory) {
      const count = await onScanDirectory();
      if (count > 0) {
        setStatusMessage(`${count} آهنگ از پوشه انتخاب‌شده اضافه شد`);
      }
      setTimeout(() => setStatusMessage(null), 4000);
    }
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

      {/* Status banner */}
      {statusMessage && (
        <div className="w-full mb-3 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium animate-fadeIn">
          {statusMessage}
        </div>
      )}

      {/* Permission Denied Notice */}
      {permissionDenied && (
        <div className="w-full mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-right">
          <div className="flex items-center gap-2 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>مجوز دسترسی به حافظه داده نشده است.</span>
          </div>
          <button
            type="button"
            onClick={handleManualScan}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[11px] font-bold hover:bg-amber-300 transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Action / Scan Card */}
      <div className="w-full mb-4 p-3 rounded-2xl bg-[#262626] border border-white/10 flex items-center justify-between shadow-md">
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-white">آهنگ‌های واقعی حافظه گوشی</span>
          <span className="text-[11px] text-[#9aa0a6]">پوشه Download و Music گوشی شما</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleManualScan}
            disabled={isScanning}
            className="p-2 rounded-xl bg-[#1c1c1c] text-[#d1d5db] hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="بروزرسانی و اسکن مجدد حافظه"
            aria-label="Refresh and scan storage"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
            <button
              type="button"
              onClick={handleDirectoryScan}
              className="p-2 rounded-xl bg-[#1c1c1c] text-[#d1d5db] hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="انتخاب کل پوشه موزیک"
              aria-label="Select music directory"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 shadow"
          >
            + انتخاب فایل‌ها
          </button>
        </div>
      </div>

      {/* Auto-Scanned Device Music Status Badge */}
      <div className="flex items-center justify-between px-1 mb-4 text-xs text-[#9aa0a6]">
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <Smartphone className="w-3.5 h-3.5" />
          <span>آهنگ‌های دستگاه ({filtered.length})</span>
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-emerald-400 hover:underline cursor-pointer"
        >
          + افزودن آهنگ
        </button>
      </div>

      {/* Vertically Stacked Music Rows */}
      <div className="flex flex-col gap-4">
        {isScanning ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center text-[#7e828d]">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <p className="text-sm">در حال اسکن فایل‌های صوتی گوشی...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((track) => (
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
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-[#7e828d] text-sm">
              {query ? `هیچ آهنگی با عنوان "${query}" در حافظه گوشی یافت نشد` : 'هنوز آهنگی از حافظه گوشی بارگذاری نشده است'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleManualScan}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
              >
                اسکن فایل‌های صوتی گوشی
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#2a2a2a] text-white font-semibold text-xs hover:bg-[#333333] border border-white/10 transition-colors cursor-pointer"
              >
                انتخاب دستی فایل‌ها
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
