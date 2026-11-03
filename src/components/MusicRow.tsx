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
      className={`w-full h-[68px] rounded-[18px] flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200 group active:scale-[0.99] select-none ${
        isCurrent
          ? 'bg-white/10 border border-white/15 shadow-sm'
          : 'hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Squircle artwork matching LastWave ArtworkShape (RoundedCornerShape(14.dp)) */}
        <div className="relative w-12 h-12 rounded-[14px] bg-[#181a24] border border-white/5 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
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
            <div className="absolute inset-0 w-full h-full bg-[#1b1b22] flex items-center justify-center">
              <Music className="w-5 h-5 text-white/40" />
            </div>
          )}

          {/* Equalizer animation when playing */}
          {activePlaying ? (
            <div className="relative z-10 flex items-end gap-0.5 h-4 bg-black/60 px-1.5 py-1 rounded-md backdrop-blur-xs">
              <span className="w-0.5 bg-cyan-300 animate-[pulse_0.7s_infinite] h-2.5 rounded-full" />
              <span className="w-0.5 bg-cyan-300 animate-[pulse_0.5s_infinite] h-4 rounded-full" />
              <span className="w-0.5 bg-cyan-300 animate-[pulse_0.9s_infinite] h-3 rounded-full" />
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
        <div className="flex flex-col min-w-0 pr-2 justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm font-semibold truncate tracking-tight leading-snug ${
                isCurrent ? 'text-cyan-300' : 'text-white'
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
          <span className="text-xs text-white/55 truncate font-medium leading-snug">
            {track.artist}
          </span>
        </div>
      </div>

      {/* Right controls: Duration, Match options, Like, Download */}
      <div
        className="flex items-center gap-1.5 shrink-0 pl-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-mono text-white/40 shrink-0 font-medium mr-1">
          {formatDuration(track.duration)}
        </span>

        {onOpenManualMatch && !track.isDownloaded && (
          <button
            type="button"
            onClick={() => onOpenManualMatch(track)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer"
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
