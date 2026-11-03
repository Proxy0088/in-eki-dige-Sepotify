import React, { useState, useEffect } from 'react';
import { Play, Pause, Heart, Download, Check, Music, SlidersHorizontal } from 'lucide-react';
import { Track } from '../types/music';

interface MusicRowProps {
  track: Track;
  isPlaying: boolean;
  isCurrent: boolean;
  onPlay: (track: Track) => void;
  onToggleLike?: (track: Track) => void;
  onToggleDownload?: (track: Track) => void;
  onOpenManualMatch?: (track: Track) => void;
  isLiked?: boolean;
  isDownloaded?: boolean;
  isDownloading?: boolean;
}

export const MusicRow: React.FC<MusicRowProps> = ({
  track,
  isPlaying,
  isCurrent,
  onPlay,
  onToggleLike,
  onToggleDownload,
  onOpenManualMatch,
  isLiked,
  isDownloaded,
  isDownloading,
}) => {
  const [imgError, setImgError] = useState(false);
  const activePlaying = isCurrent && isPlaying;

  useEffect(() => {
    setImgError(false);
  }, [track.coverUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onClick={() => onPlay(track)}
      className={`w-full h-16 rounded-xl flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150 active:scale-[0.99] select-none ${
        isCurrent
          ? 'bg-white/[0.08] border border-white/10 shadow-sm'
          : 'hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Squircle artwork with nested radius (row radius 12 - padding 8 = 4px or standard 8px) */}
        <div className="relative w-11 h-11 rounded-lg bg-[#181a24] border border-white/5 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
          {track.coverUrl && !imgError ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-[#14161f] flex items-center justify-center">
              <Music className="w-4 h-4 text-[#71717a]" />
            </div>
          )}

          {/* Calm equalizer indicator */}
          {activePlaying ? (
            <div className="relative z-10 flex items-end gap-0.5 h-4 bg-black/60 px-1.5 py-1 rounded-md">
              <span className="w-0.5 h-2 bg-cyan-400 rounded-full" />
              <span className="w-0.5 h-3.5 bg-cyan-400 rounded-full" />
              <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full" />
            </div>
          ) : isCurrent ? (
            <div className="relative z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
              <Pause className="w-3 h-3 text-white fill-white" />
            </div>
          ) : (
            <div className="relative z-10 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="flex flex-col min-w-0 pr-2 justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm font-medium truncate tracking-tight leading-snug ${
                isCurrent ? 'text-cyan-400' : 'text-[#ededed]'
              }`}
            >
              {track.title}
            </span>
            {track.isNationalNet && (
              <span className="text-[9px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                نت ملی
              </span>
            )}
          </div>
          <span className="text-xs text-[#a1a1a6] truncate font-normal leading-snug">
            {track.artist}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div
        className="flex items-center gap-1.5 shrink-0 pl-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-mono text-[#71717a] shrink-0 font-normal tabular-nums mr-1">
          {formatDuration(track.duration)}
        </span>

        {onOpenManualMatch && !track.isDownloaded && (
          <button
            type="button"
            onClick={() => onOpenManualMatch(track)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#71717a] hover:text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Manual match"
            title="اصلاح نسخه پخش"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        )}

        {onToggleLike && (
          <button
            type="button"
            onClick={() => onToggleLike(track)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#71717a] hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isLiked ? 'text-rose-400 fill-rose-400' : 'stroke-[1.8]'
              }`}
            />
          </button>
        )}

        {onToggleDownload && (
          <button
            type="button"
            onClick={() => onToggleDownload(track)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#71717a] hover:text-[#ededed] hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={isDownloaded ? 'Downloaded' : 'Download for offline'}
          >
            {isDownloading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : isDownloaded ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
            ) : (
              <Download className="w-3.5 h-3.5 stroke-[1.8]" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
