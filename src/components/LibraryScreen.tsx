import React, { useState } from 'react';
import {
  Search as SearchIcon,
  Heart,
  Bookmark,
  Star,
  Download,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  FolderPlus,
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
  onImportDeviceTracks?: (files: FileList) => Promise<number>;
  onScanDeviceAudio?: () => Promise<number>;
  onScanDirectory?: () => Promise<number>;
  isScanning?: boolean;
  permissionDenied?: boolean;
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
  onImportDeviceTracks,
  onScanDeviceAudio,
  onScanDirectory,
  isScanning = false,
  permissionDenied = false,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<
    'liked' | 'library 1' | 'library 2' | 'Downloads' | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter tracks for the active collection
  const collectionTracks = React.useMemo(() => {
    if (!selectedCollection) return [];
    if (selectedCollection === 'liked') {
      return tracks.filter((t) => likedIds.has(t.id));
    }
    if (selectedCollection === 'Downloads') {
      // In Downloads, show all real downloaded/device tracks
      return tracks.filter(
        (t) =>
          downloadedIds.has(t.id) ||
          t.id.startsWith('android-media-') ||
          t.id.startsWith('device-file-') ||
          t.id.startsWith('device-')
      );
    }
    if (selectedCollection === 'library 1') {
      return tracks.filter((t) => t.collection === 'library 1');
    }
    if (selectedCollection === 'library 2') {
      return tracks.filter((t) => t.collection === 'library 2');
    }
    return [];
  }, [selectedCollection, tracks, likedIds, downloadedIds]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportDeviceTracks) {
      const count = await onImportDeviceTracks(e.target.files);
      setStatusMessage(`${count} آهنگ با موفقیت از گوشی اضافه شد`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleManualScan = async () => {
    if (onScanDeviceAudio) {
      const count = await onScanDeviceAudio();
      if (count > 0) {
        setStatusMessage(`${count} آهنگ جدید از گوشی شناسایی شد`);
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
        setStatusMessage(`${count} آهنگ از پوشه انتخاب‌شده افزوده شد`);
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualScan}
              disabled={isScanning}
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="اسکن خودکار حافظه"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>اسکن آهنگ‌های گوشی</span>
            </button>
            {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
              <button
                type="button"
                onClick={handleDirectoryScan}
                className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="انتخاب پوشه موزیک"
              >
                <FolderPlus className="w-3 h-3" />
                <span>پوشه موزیک</span>
              </button>
            )}
          </div>
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

      {statusMessage && (
        <div className="w-full mb-3 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium animate-fadeIn">
          {statusMessage}
        </div>
      )}

      {permissionDenied && (
        <div className="w-full mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-right">
          <div className="flex items-center gap-2 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>مجوز دسترسی به فایل‌های صوتی تایید نشد.</span>
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7e828d]">
                {collectionTracks.length} tracks
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                + افزودن فایل
              </button>
            </div>
          </div>

          {isScanning ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <p className="text-sm text-[#7e828d]">در حال بررسی آهنگ‌های گوشی...</p>
            </div>
          ) : collectionTracks.length > 0 ? (
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
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <p className="text-[#7e828d] text-sm">
                هیچ آهنگی در بخش {selectedCollection} یافت نشد
              </p>
              <div className="flex items-center gap-2 mt-1">
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
                  انتخاب فایل (MP3)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
