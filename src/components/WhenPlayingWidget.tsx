import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { Track } from '../types/music';
import { audioService } from '../services/audioPlayer';
import { triggerHaptic } from '../utils/haptics';

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

  // Subscribe to time updates
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
        triggerHaptic('medium');
        onOpenPlayer();
      } else if (deltaY > 30) {
        triggerHaptic('light');
        setIsDismissed(true);
      }
    } else {
      if (deltaX < -40) {
        triggerHaptic('light');
        onNextTrack();
      }
    }
  };

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    onTogglePlay();
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onNextTrack();
  };

  const handleWidgetClick = () => {
    triggerHaptic('light');
    if (onOpenPlayer) {
      onOpenPlayer();
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed sm:absolute bottom-[72px] sm:bottom-20 left-3.5 right-3.5 sm:left-4 sm:right-4 z-40 max-w-[384px] mx-auto select-none pointer-events-auto"
    >
      <div
        onClick={handleWidgetClick}
        className="w-full h-15 rounded-full lastwave-glass-dock px-2.5 pr-3.5 flex items-center justify-between gap-3 shadow-xl cursor-pointer group active:scale-[0.99] transition-[border-color,transform,box-shadow] duration-200 relative overflow-hidden"
        role="button"
        aria-label="Open playback controls"
      >
        {/* Top edge physical specular highlight catch-light */}
        <div
          className="absolute inset-x-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none rounded-full"
          style={{ zIndex: 2 }}
        />

        {/* Track Artwork squircle */}
        <div className="relative z-10 w-10 h-10 rounded-xl overflow-hidden bg-[#181a24] shrink-0 border border-white/10 shadow-sm">
          {currentTrack.coverUrl && !coverError ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-4 h-4 text-[#71717a]" />
            </div>
          )}

          {/* Equalizer indicator */}
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-2 gap-0.5">
              <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full" />
              <span className="w-0.5 h-3.5 bg-cyan-400 rounded-full" />
              <span className="w-0.5 h-2 bg-cyan-400 rounded-full" />
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="relative z-10 flex flex-col min-w-0 flex-1 justify-center pr-1">
          <span className="text-[13px] font-medium text-[#ededed] tracking-tight truncate leading-snug">
            {currentTrack.title}
          </span>
          <span className="text-[11px] font-normal text-[#a1a1a6] truncate leading-snug">
            {currentTrack.artist}
          </span>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={handlePlayToggle}
            className="w-9 h-9 rounded-full bg-[#ededed] text-[#090a0f] hover:bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNextClick}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[#ededed] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            aria-label="Next track"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Mini Progress Line along bottom */}
        <div
          className="absolute bottom-0 left-4 right-4 h-0.5 bg-white/10 overflow-hidden rounded-full"
          style={{ zIndex: 10 }}
        >
          <div
            className="h-full bg-cyan-400 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
