import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { Track } from '../types/music';
import { audioService } from '../services/audioPlayer';

interface WhenPlayingWidgetProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onOpenPlayer?: () => void;
}

export const WhenPlayingWidget: React.FC<WhenPlayingWidgetProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onOpenPlayer,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [coverError, setCoverError] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setCoverError(false);
  }, [currentTrack?.coverUrl]);

  // Subscribe to time updates for the thin progress indicator
  useEffect(() => {
    const unsub = audioService.subscribe(() => {
      const cur = audioService.getCurrentTime();
      const dur = audioService.getDuration();
      if (dur > 0) {
        setProgress(Math.min(100, Math.max(0, (cur / dur) * 100)));
      } else {
        setProgress(0);
      }
    });
    return () => unsub();
  }, []);

  if (!currentTrack || isDismissed) {
    return null;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartY.current = null;
    touchStartX.current = null;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY < -24 && onOpenPlayer) {
        // Swipe up opens full player
        onOpenPlayer();
      } else if (deltaY > 30) {
        // Swipe down dismisses mini player
        setIsDismissed(true);
      }
    } else {
      if (deltaX < -40) {
        onNextTrack();
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed sm:absolute bottom-[72px] sm:bottom-[82px] left-3.5 right-3.5 sm:left-4 sm:right-4 z-40 max-w-[392px] mx-auto select-none pointer-events-auto transition-transform duration-300 ease-out"
    >
      {/* LastWave Floating Mini-Player Pill */}
      <div
        onClick={onOpenPlayer}
        className="w-full h-[62px] rounded-full lastwave-glass px-2.5 pr-3.5 flex items-center justify-between gap-3 shadow-[0_16px_40px_rgba(0,0,0,0.6)] cursor-pointer group hover:border-white/20 transition-all duration-200 relative overflow-hidden active:scale-[0.99]"
        role="button"
        aria-label="Open full player"
      >
        {/* Track Artwork */}
        <div className="relative w-11 h-11 rounded-[14px] overflow-hidden bg-[#181a22] shrink-0 shadow-md border border-white/10">
          {currentTrack.coverUrl && !coverError ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-5 h-5 text-white/50" />
            </div>
          )}

          {/* Equalizer animation when playing */}
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
              <span className="w-0.5 h-3 bg-white rounded-full animate-[pulse_0.6s_infinite]" />
              <span className="w-0.5 h-4 bg-white rounded-full animate-[pulse_0.4s_infinite]" />
              <span className="w-0.5 h-2.5 bg-white rounded-full animate-[pulse_0.7s_infinite]" />
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="flex flex-col min-w-0 flex-1 justify-center pr-1">
          <span className="text-[13px] font-bold text-white tracking-tight truncate leading-snug">
            {currentTrack.title}
          </span>
          <span className="text-[11px] font-medium text-white/60 truncate leading-snug">
            {currentTrack.artist}
          </span>
        </div>

        {/* Action Controls */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Play/Pause Button - Light/White Circular */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_4px_14px_rgba(255,255,255,0.25)] hover:bg-slate-100 active:scale-90 transition-all cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            )}
          </button>

          {/* Next Track Button */}
          <button
            type="button"
            onClick={onNextTrack}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-white/85 hover:text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Mini Progress Line along the bottom of the capsule */}
        <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/10 overflow-hidden rounded-full">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
