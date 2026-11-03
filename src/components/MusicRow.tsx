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
      className={`w-full h-[74px] rounded-[24px] neumorph-row-outer border border-white/5 flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-all duration-200 group ${
        isCurrent ? 'ring-1 ring-white/20' : 'hover:scale-[1.01]'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Rounded square artwork with music cover art or music note icon */}
        <div className="relative w-14 h-14 rounded-[18px] bg-black border border-[#444850] shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
          {track.coverUrl && !imgError ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-[#1b1b1b] flex items-center justify-center">
              <Music className="w-6 h-6 text-[#8e929b]" />
            </div>
          )}
          {/* Subtle dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors pointer-events-none" />

          {activePlaying ? (
            <div className="relative z-10 flex items-end gap-0.5 h-4 bg-black/60 px-1.5 py-1 rounded-md backdrop-blur-xs">
              <span className="w-1 bg-white animate-[pulse_0.7s_infinite] h-2.5 rounded-full" />
              <span className="w-1 bg-white animate-[pulse_0.5s_infinite] h-4 rounded-full" />
              <span className="w-1 bg-white animate-[pulse_0.9s_infinite] h-3 rounded-full" />
            </div>
          ) : isCurrent ? (
            <div className="relative z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
              <Pause className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          ) : (
            <div className="relative z-10 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm font-semibold truncate tracking-tight ${
                isCurrent ? 'text-white' : 'text-[#dedfe4]'
              }`}
            >
              {track.title}
            </span>
            {track.isNationalNet && (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                نت ملی
              </span>
            )}
          </div>
          <span className="text-xs text-[#7f838c] truncate font-medium">
            {track.artist}
          </span>
        </div>
      </div>

      {/* Right controls: Duration, Match options, Like, Download */}
      <div
        className="flex items-center gap-2 shrink-0 pl-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-mono text-[#8a8f99] shrink-0 font-medium">
          {formatDuration(track.duration)}
        </span>

        {onOpenManualMatch && !track.isDownloaded && (
          <button
            type="button"
            onClick={() => onOpenManualMatch(track)}
            className="p-1.5 text-[#7f838c] hover:text-emerald-400 transition-colors cursor-pointer"
            aria-label="Manual match"
            title="اصلاح نسخه پخش (تطبیق دستی یوتیوب موزیک)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        )}

        {onToggleLike && (
          <button
            type="button"
            onClick={() => onToggleLike(track)}
            className="p-1.5 text-[#7f838c] hover:text-rose-400 transition-colors cursor-pointer"
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
          >
            <Heart
              className={`w-4 h-4 ${
                isLiked ? 'text-rose-400 fill-rose-400' : 'stroke-[1.8]'
              }`}
            />
          </button>
        )}

        {onToggleDownload && (
          <button
            type="button"
            onClick={() => onToggleDownload(track)}
            className="p-1.5 text-[#7f838c] hover:text-white transition-colors cursor-pointer"
            aria-label={isDownloaded ? 'Downloaded' : 'Download for offline'}
          >
            {isDownloading ? (
              <Download className="w-4 h-4 text-white animate-bounce" />
            ) : isDownloaded ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Download className="w-4 h-4 stroke-[1.8]" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
