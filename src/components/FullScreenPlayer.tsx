import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  MoreVertical,
  Heart,
  Quote,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
} from 'lucide-react';
import { Track, NavTab } from '../types/music';
import { audioService, PlaybackCycleMode } from '../services/audioPlayer';
import { AskListLibraryModal } from './AskListLibraryModal';
import { NextMusicPreview } from './NextMusicPreview';
import { LyricsService, SongLyrics } from '../services/lyricsService';
import { ManualMatchModal } from './ManualMatchModal';
import { triggerHaptic } from '../utils/haptics';

interface FullScreenPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  likedIds: Set<string>;
  onBack: () => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onToggleLike: (track: Track) => void;
  onSaveToLibrary?: (track: Track, libraryName: string) => void;
  onTabChange: (tab: NavTab) => void;
}

/**
 * Liquid Waveform inside the played progress scrubber track
 */
const ScrubberWaveform: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 320 20"
        preserveAspectRatio="none"
      >
        {/* Secondary soft wave */}
        <path
          d="M 0 10 Q 20 2, 40 10 T 80 10 T 120 10 T 160 10 T 200 10 T 240 10 T 280 10 T 320 10"
          fill="none"
          stroke="rgba(251, 146, 60, 0.95)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Core flowing wave */}
        <path
          d="M 0 10 Q 20 18, 40 10 T 80 10 T 120 10 T 160 10 T 200 10 T 240 10 T 280 10 T 320 10"
          fill="none"
          stroke="rgba(245, 158, 11, 0.75)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Center guidance sheen */}
        <path
          d="M 0 10 L 320 10"
          stroke="rgba(255, 237, 213, 0.55)"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
};

/**
 * Very subtle, low-intensity artwork color reflection strictly inside the button frame
 */
const ButtonGlassTint: React.FC<{ coverUrl?: string; hasError?: boolean }> = ({
  coverUrl,
  hasError,
}) => {
  if (!coverUrl || hasError) return null;
  return (
    <img
      src={coverUrl}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover object-bottom blur-[10px] opacity-[0.16] saturate-[160%] scale-150 pointer-events-none"
    />
  );
};

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  likedIds,
  onBack,
  onTogglePlay,
  onNextTrack,
  onPreviousTrack,
  onToggleLike,
  onSaveToLibrary,
}) => {
  const [cycleMode, setCycleMode] = useState<PlaybackCycleMode>(() =>
    audioService.getPlaybackCycleMode()
  );
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [coverError, setCoverError] = useState<boolean>(false);
  const [showMatchModal, setShowMatchModal] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [lyrics, setLyrics] = useState<SongLyrics | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Dragging / Scrubbing State
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const isDraggingProgressRef = useRef<boolean>(false);
  const lastSeekTimeRef = useRef<number>(0);

  // Long-press state for Next Button preview
  const [showNextPreview, setShowNextPreview] = useState<boolean>(false);
  const nextTrack = useMemo(() => audioService.getNextTrack(), [currentTrack]);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  // Sync state from audio engine
  useEffect(() => {
    const unsub = audioService.subscribe(() => {
      setCycleMode(audioService.getPlaybackCycleMode());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCoverError(false);
  }, [currentTrack?.coverUrl]);

  // Fetch lyrics
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      return;
    }
    setLoadingLyrics(true);
    let cancelled = false;
    LyricsService.getLyrics(currentTrack.artist, currentTrack.title, duration).then((res) => {
      if (!cancelled) {
        setLyrics(res);
        setLoadingLyrics(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.title, currentTrack?.artist, duration]);

  // Active line index
  const activeLineIndex = useMemo(() => {
    if (!lyrics?.lines?.length) return -1;
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.lines[i].time) {
        return i;
      }
    }
    return 0;
  }, [currentTime, lyrics]);

  // Auto-scroll lyrics
  useEffect(() => {
    if (showLyrics && activeLineIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLineIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex, showLyrics]);

  const isLiked = currentTrack ? likedIds.has(currentTrack.id) : false;

  const handleCyclePlaybackMode = () => {
    triggerHaptic('light');
    const next = audioService.cyclePlaybackMode();
    setCycleMode(next);
  };

  const handleNextPointerDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic('medium');
      setShowNextPreview(true);
    }, 380);
  };

  const handleNextPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressRef.current) {
      setShowNextPreview(false);
      isLongPressRef.current = false;
    } else {
      triggerHaptic('light');
      onNextTrack();
    }
  };

  const handleNextPointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setShowNextPreview(false);
    isLongPressRef.current = false;
  };

  const handlePrevClick = () => {
    triggerHaptic('light');
    onPreviousTrack();
  };

  const handlePlayClick = () => {
    triggerHaptic('medium');
    onTogglePlay();
  };

  const handleBackClick = () => {
    triggerHaptic('light');
    onBack();
  };

  const handleLikeClick = () => {
    triggerHaptic('light');
    if (currentTrack) onToggleLike(currentTrack);
  };

  const handleLyricsClick = () => {
    triggerHaptic('light');
    setShowLyrics(!showLyrics);
  };

  // Seekbar scrubbing
  const effectiveRatio = useMemo(() => {
    if (scrubRatio !== null) return scrubRatio;
    if (!duration || duration <= 0) return 0;
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [scrubRatio, currentTime, duration]);

  const handleSeekbarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    triggerHaptic('light');
    isDraggingProgressRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubRatio(ratio);
    audioService.seek(ratio * duration);
  };

  const handleSeekbarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingProgressRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubRatio(ratio);

    const now = performance.now();
    if (now - lastSeekTimeRef.current > 100) {
      lastSeekTimeRef.current = now;
      audioService.seek(ratio * duration);
    }
  };

  const handleSeekbarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingProgressRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      isDraggingProgressRef.current = false;
      setScrubRatio(null);
      audioService.seek(ratio * duration);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatRemainingTime = (cur: number, dur: number) => {
    if (isNaN(dur) || dur <= 0) return '-0:00';
    const remaining = Math.max(0, dur - cur);
    return `-${formatTime(remaining)}`;
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="w-full h-full bg-[#07080b] relative overflow-hidden select-none flex flex-col justify-between animate-in fade-in duration-200">
      {/* ── Full-Size Crisp Artwork Background (Fades into pitch black) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Crisp full-bleed artwork taking the upper screen */}
        {currentTrack.coverUrl && !coverError ? (
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            referrerPolicy="no-referrer"
            onError={() => setCoverError(true)}
            className="w-full h-[64%] sm:h-[68%] object-cover object-center select-none"
          />
        ) : (
          <div className="w-full h-[64%] sm:h-[68%] bg-gradient-to-b from-[#1f1610] via-[#120d09] to-[#07080b]" />
        )}

        {/* Subtle top gradient for header clarity and smooth bottom fade into pitch-black controls */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent via-25% via-black/20 via-48% to-[#07080b] to-64% pointer-events-none" />
      </div>

      {/* ── Top Header Bar ── */}
      <div className="relative z-30 w-full h-16 px-5 sm:px-6 flex items-center justify-between pt-3">
        {/* Circular Collapse Button */}
        <button
          type="button"
          onClick={handleBackClick}
          className="w-11 h-11 rounded-full lastwave-player-btn flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden"
          aria-label="Collapse player"
        >
          <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
          <div className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full" />
          <ChevronDown className="w-5 h-5 stroke-[2.2] relative z-10" />
        </button>

        {/* Center: NOW PLAYING & Source */}
        <div className="flex flex-col items-center justify-center max-w-[200px]">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#a1a1a6] uppercase leading-none">
            {showLyrics ? 'LYRICS' : 'NOW PLAYING'}
          </span>
          <span className="text-xs text-white/90 font-medium truncate mt-1 leading-none">
            {currentTrack.collection || 'Search'}
          </span>
        </div>

        {/* Circular Options Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowMatchModal(true);
          }}
          className="w-11 h-11 rounded-full lastwave-player-btn flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden"
          aria-label="Song options and match"
        >
          <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
          <div className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full" />
          <MoreVertical className="w-4.5 h-4.5 stroke-[2] relative z-10" />
        </button>
      </div>

      {/* ── Center Content: Artwork showcase or Synced Lyrics ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {showLyrics ? (
          <div
            ref={lyricsContainerRef}
            className="w-full h-[min(48vh,420px)] overflow-y-auto no-scrollbar py-12 px-4 flex flex-col items-center gap-6 text-center select-none"
          >
            {loadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[#a1a1a6]">
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-xs">در حال بارگذاری متن ترانه...</span>
              </div>
            ) : lyrics?.lines && lyrics.lines.length > 0 ? (
              lyrics.lines.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                return (
                  <p
                    key={idx}
                    onClick={() => audioService.seek(line.time)}
                    className={`cursor-pointer transition-colors duration-200 font-semibold leading-relaxed max-w-md ${
                      isActive
                        ? 'text-white text-2xl sm:text-3xl drop-shadow-md'
                        : 'text-[#71717a] text-lg sm:text-xl'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[#71717a]">
                <p className="text-sm font-normal">متن ترانه برای این قطعه یافت نشد</p>
              </div>
            )}
          </div>
        ) : (
          /* Open center stage allowing the full-size artwork to shine through edge-to-edge */
          <div
            onClick={handleLyricsClick}
            className="w-full flex-1 flex items-center justify-center cursor-pointer"
            title="برای مشاهده متن آهنگ کلیک کنید"
          />
        )}
      </div>

      {/* ── Bottom Controls Section (Pixel-matched to reference image) ── */}
      <div className="relative z-30 w-full flex flex-col gap-3 pb-6">
        {/* Track Title, Artist & Circular Action Buttons */}
        <div className="flex items-end justify-between gap-4 w-full px-6">
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-tight truncate">
              {currentTrack.title}
            </h1>
            <p className="text-sm sm:text-base font-normal text-[#999999] truncate mt-1 leading-snug">
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Heart / Like Button (circular glass) */}
            <button
              type="button"
              onClick={handleLikeClick}
              className="w-11 h-11 rounded-full lastwave-player-btn flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden"
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
              <div className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full" />
              <Heart
                className={`w-5 h-5 relative z-10 ${isLiked ? 'fill-rose-500 text-rose-500' : 'stroke-[1.8] text-white'}`}
              />
            </button>

            {/* Lyrics Quote Button (circular glass) */}
            <button
              type="button"
              onClick={handleLyricsClick}
              className={`w-11 h-11 rounded-full lastwave-player-btn flex items-center justify-center cursor-pointer active:scale-95 transition-transform relative overflow-hidden ${
                showLyrics ? 'text-amber-400' : 'text-white'
              }`}
              aria-label="Toggle Lyrics"
              title="Lyrics"
            >
              <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
              <div className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full" />
              <Quote className="w-4.5 h-4.5 stroke-[2] fill-current relative z-10" />
            </button>
          </div>
        </div>

        {/* ── Liquid Waveform Scrubber ── */}
        <div className="w-full flex flex-col gap-1.5 px-6 select-none">
          <div
            onPointerDown={handleSeekbarPointerDown}
            onPointerMove={handleSeekbarPointerMove}
            onPointerUp={handleSeekbarPointerUp}
            className="w-full h-6 flex items-center cursor-pointer relative touch-none group"
          >
            {/* Rail Background */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
              {/* Played Liquid Waveform Track */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600/80 via-amber-500 to-amber-400 relative overflow-hidden"
                style={{ width: `${effectiveRatio * 100}%` }}
              >
                <ScrubberWaveform />
              </div>
            </div>

            {/* Glowing Scrubber Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.9)] border-2 border-white flex items-center justify-center -translate-x-1/2 pointer-events-none transition-transform"
              style={{ left: `${effectiveRatio * 100}%` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
            </div>
          </div>

          {/* Time Labels: Current and Remaining Negative */}
          <div className="flex items-center justify-between text-xs font-mono text-[#a1a1a6] font-normal tabular-nums px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatRemainingTime(currentTime, duration)}</span>
          </div>
        </div>

        {/* ── Primary Playback Controls Row (Row 1) ── */}
        <div className="flex items-center justify-between gap-3 w-full px-6 pt-1">
          {/* Previous Track (Circular Glass) */}
          <button
            type="button"
            onClick={handlePrevClick}
            className="w-14 h-14 rounded-full lastwave-player-btn flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden shrink-0"
            aria-label="Previous track"
          >
            <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full" />
            <SkipBack className="w-6 h-6 fill-current relative z-10" />
          </button>

          {/* Main Play/Pause Capsule Pill (Translucent Glass with NO solid color fill) */}
          <button
            type="button"
            onClick={handlePlayClick}
            className="flex-1 h-14 rounded-full lastwave-player-btn flex items-center justify-center gap-2.5 text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
            <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full" />
            {isPlaying ? (
              <>
                <Pause className="w-5.5 h-5.5 fill-current relative z-10" />
                <span className="font-semibold text-base tracking-wide select-none relative z-10">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5.5 h-5.5 fill-current ml-0.5 relative z-10" />
                <span className="font-semibold text-base tracking-wide select-none relative z-10">Play</span>
              </>
            )}
          </button>

          {/* Next Track (Circular Glass with Long-Press) */}
          <button
            type="button"
            onPointerDown={handleNextPointerDown}
            onPointerUp={handleNextPointerUp}
            onPointerLeave={handleNextPointerLeave}
            className="w-14 h-14 rounded-full lastwave-player-btn flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden shrink-0"
            aria-label="Next track"
          >
            <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full" />
            <SkipForward className="w-6 h-6 fill-current relative z-10" />
          </button>
        </div>

        {/* ── Secondary Controls Row (Row 2: Shuffle, Audio, Repeat) ── */}
        <div className="grid grid-cols-3 gap-3 w-full px-6 pt-1">
          {/* Shuffle Toggle */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className={`h-12 rounded-full lastwave-player-btn flex items-center justify-center cursor-pointer active:scale-95 transition-transform relative overflow-hidden ${
              cycleMode === 'shuffle' ? 'text-amber-400' : 'text-white'
            }`}
            aria-label="Shuffle mode"
            title="Shuffle"
          >
            <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full" />
            <Shuffle className="w-5 h-5 stroke-[2] relative z-10" />
          </button>

          {/* Audio Quality / Match Modal Pill */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowMatchModal(true);
            }}
            className="h-12 rounded-full lastwave-player-btn flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase text-white cursor-pointer active:scale-95 transition-transform relative overflow-hidden"
            aria-label="Audio settings and match"
            title="Audio Quality"
          >
            <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full" />
            <Music className="w-4 h-4 stroke-[2] relative z-10" />
            <span className="select-none font-sans font-bold relative z-10">AUDIO</span>
          </button>

          {/* Repeat Mode */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className={`h-12 rounded-full lastwave-player-btn flex items-center justify-center cursor-pointer active:scale-95 transition-transform relative overflow-hidden ${
              cycleMode === 'repeat_all' || cycleMode === 'repeat_one' ? 'text-amber-400' : 'text-white'
            }`}
            aria-label="Repeat mode"
            title="Repeat"
          >
            <ButtonGlassTint coverUrl={currentTrack.coverUrl} hasError={coverError} />
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full" />
            {cycleMode === 'repeat_one' ? (
              <Repeat1 className="w-5 h-5 stroke-[2] relative z-10" />
            ) : (
              <Repeat className="w-5 h-5 stroke-[2] relative z-10" />
            )}
          </button>
        </div>
      </div>

      {/* Overlays */}
      {showNextPreview && nextTrack && (
        <NextMusicPreview nextTrack={nextTrack} isVisible={showNextPreview} />
      )}

      {showMatchModal && (
        <ManualMatchModal
          track={currentTrack}
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          onMatched={() => setShowMatchModal(false)}
        />
      )}

      {showLibraryModal && (
        <AskListLibraryModal
          isOpen={showLibraryModal}
          onClose={() => setShowLibraryModal(false)}
          onSelectLibrary={(lib) => {
            if (onSaveToLibrary && currentTrack) {
              onSaveToLibrary(currentTrack, lib);
            }
            setShowLibraryModal(false);
          }}
        />
      )}
    </div>
  );
};
