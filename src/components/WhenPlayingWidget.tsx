import React, { useState, useEffect, useRef } from 'react';
import { Music } from 'lucide-react';
import { Track } from '../types/music';

interface WhenPlayingWidgetProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
}

export const WhenPlayingWidget: React.FC<WhenPlayingWidgetProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPreviousTrack,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [autoHidden, setAutoHidden] = useState<boolean>(false);
  const pauseTimerRef = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      setAutoHidden(false);
      setIsDismissed(false);
    } else if (currentTrack) {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
      pauseTimerRef.current = window.setTimeout(() => {
        setAutoHidden(true);
      }, 4000);
    }

    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, [isPlaying, currentTrack]);

  if (!currentTrack) {
    return null;
  }

  const isVisible = !isDismissed && !autoHidden;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;

    if (deltaY > 25 && isVisible) {
      setIsDismissed(true);
    } else if (deltaY < -20 && !isVisible) {
      setIsDismissed(false);
      setAutoHidden(false);
    }
  };

  const isTitleLong = currentTrack.title.length > 10;

  return (
    <>
      {/* iPhone-style Lock Screen Grabber Handle (When widget is tucked under navbar) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          setIsDismissed(false);
          setAutoHidden(false);
        }}
        className={`absolute bottom-[114px] left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out cursor-pointer flex flex-col items-center gap-1 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-lg ${
          !isVisible
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-6 scale-90 pointer-events-none'
        }`}
        title="Swipe up or tap to show player"
      >
        <div className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-white/90 animate-pulse" />
          <span className="text-[11px] font-roboto font-medium text-white/80 max-w-[140px] truncate">
            {currentTrack.title}
          </span>
        </div>
        <div className="w-10 h-1 bg-white/50 rounded-full hover:bg-white transition-colors" />
      </div>

      {/* Main Figma Node 78:21 "When is playing" (width: 307, height: 135, top: 709, z-index: 10 behind navbar at 809) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`absolute top-[709px] left-1/2 -translate-x-1/2 w-[307px] h-[135px] z-10 transition-all duration-500 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-44 pointer-events-none'
        }`}
      >
        {/* Swipe down grabber bar on top */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer z-40 group"
          aria-label="Swipe down to hide"
        >
          <div className="w-9 h-1 rounded-full bg-white/25 group-hover:bg-white/60 transition-colors" />
        </button>

        {/* Node 78:4 "info" Frame: width: 307, height: 69, top: 27px, borderRadius: 20, bg: #212121, inner-shadows */}
        <div className="absolute top-[27px] left-0 w-[307px] h-[69px] rounded-[20px] shadow-figma-playing-info flex items-center justify-between px-[13px]">
          {/* Name Text: x: 13, y: 27, Roboto Bold 13.3px, letter-spacing: 1.33px, #FFFFFF */}
          <div className="w-[64px] overflow-hidden flex items-center justify-center">
            <span
              className={`font-roboto font-bold text-[13.3px] text-white tracking-[1.33px] ${
                isTitleLong ? 'animate-marquee-text' : 'truncate text-center'
              }`}
              title={currentTrack.title}
            >
              {currentTrack.title}
            </span>
          </div>

          {/* Artis Text: x: 230, y: 27, Roboto Bold 13.3px, letter-spacing: 1.33px, #FFFFFF */}
          <div className="w-[64px] overflow-hidden flex items-center justify-center">
            <span
              className="font-roboto font-bold text-[13.3px] text-white tracking-[1.33px] truncate text-center"
              title={currentTrack.artist}
            >
              {currentTrack.artist}
            </span>
          </div>
        </div>

        {/* Node 78:2 "Ellipse 1": width: 135, height: 135, centered horizontally at left: 86px (138 - 52), top: 0 */}
        <div
          className="absolute left-[86px] top-0 w-[135px] h-[135px] rounded-full overflow-hidden shadow-figma-ellipse select-none"
          style={{ backgroundColor: '#D9D9D9' }}
        >
          {/* Rotating Album Artwork */}
          <div
            className={`absolute inset-0 w-full h-full rounded-full overflow-hidden animate-spin-vinyl ${
              isPlaying ? '' : 'animation-paused'
            }`}
          >
            {currentTrack.coverUrl && (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Frosted Metallic Spherical Shading Overlay matching #D9D9D9 spec */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 32%, rgba(245, 247, 250, 0.72) 0%, rgba(217, 217, 217, 0.76) 55%, rgba(145, 150, 160, 0.85) 100%)',
              boxShadow:
                'inset 0 3px 6px rgba(255, 255, 255, 0.6), inset 0 -3px 6px rgba(0, 0, 0, 0.35)',
            }}
          />

          {/* Center Playback Controls: Pause (47x47), Next (43x43), Prev (43x43) */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 z-10 text-[#40434a]">
            {/* Skip Previous (|◀) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviousTrack();
              }}
              className="w-[36px] h-[36px] flex items-center justify-center hover:text-black transition-colors active:scale-90 cursor-pointer"
              aria-label="Previous track"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Pause / Play in Center */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              className="w-[47px] h-[47px] flex items-center justify-center hover:text-black transition-colors active:scale-95 cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip Next (▶|) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNextTrack();
              }}
              className="w-[36px] h-[36px] flex items-center justify-center hover:text-black transition-colors active:scale-90 cursor-pointer"
              aria-label="Next track"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
