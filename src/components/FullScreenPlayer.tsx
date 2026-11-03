import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  FolderPlus,
  SlidersHorizontal,
  Music,
} from 'lucide-react';
import { Track, NavTab } from '../types/music';
import { audioService, PlaybackCycleMode } from '../services/audioPlayer';
import { AskListLibraryModal } from './AskListLibraryModal';
import { NextMusicPreview } from './NextMusicPreview';
import { LyricsService, SongLyrics } from '../services/lyricsService';
import { ManualMatchModal } from './ManualMatchModal';

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

  // Auto-scroll lyrics to active line
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
    const next = audioService.cyclePlaybackMode();
    setCycleMode(next);
  };

  // Next button pointer events for preview
  const handleNextPointerDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
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

  // Seekbar scrubbing
  const effectiveRatio = useMemo(() => {
    if (scrubRatio !== null) return scrubRatio;
    if (!duration || duration <= 0) return 0;
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [scrubRatio, currentTime, duration]);

  const handleSeekbarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    <div className="w-full h-full bg-[#0a0b0e] relative overflow-hidden select-none flex flex-col justify-between animate-in fade-in duration-300">
      {/* ── Dynamic Ambient Artwork Backdrop (LastWave / Apple Music style) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentTrack.coverUrl && !coverError ? (
          <img
            src={currentTrack.coverUrl}
            alt=""
            className="w-full h-full object-cover scale-150 blur-[70px] opacity-40 brightness-75 transition-opacity duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#181a24] to-[#0a0b0e]" />
        )}
        {/* Darkening Scrims */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#0a0b0e]/70 to-[#0a0b0e]" />
      </div>

      {/* ── Top Header Bar ── */}
      <div className="relative z-30 w-full h-[64px] sm:h-[72px] px-5 sm:px-6 flex items-center justify-between pt-2">
        {/* Collapse Button (Chevron Down) */}
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 rounded-full lastwave-glass-pill flex items-center justify-center text-white/90 hover:text-white cursor-pointer active:scale-90 transition-all shadow-md"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Center: "NOW PLAYING" & Source Title */}
        <div className="flex flex-col items-center justify-center max-w-[200px]">
          <span className="text-[11px] font-bold tracking-[2px] text-white/90 uppercase leading-none">
            {showLyrics ? 'LYRICS' : 'NOW PLAYING'}
          </span>
          <span className="text-xs text-white/60 font-medium truncate mt-1 leading-none">
            {currentTrack.collection || 'Sepotify'}
          </span>
        </div>

        {/* Options Button (3-dots) */}
        <button
          type="button"
          onClick={() => setShowMatchModal(true)}
          className="w-11 h-11 rounded-full lastwave-glass-pill flex items-center justify-center text-white/90 hover:text-white cursor-pointer active:scale-90 transition-all shadow-md"
          aria-label="Song options & match"
        >
          <MoreVertical className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* ── Center Content: Artwork or Lyrics ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {showLyrics ? (
          /* Lyrics View */
          <div
            ref={lyricsContainerRef}
            className="w-full h-[min(48vh,420px)] overflow-y-auto no-scrollbar py-12 px-4 flex flex-col items-center gap-6 text-center select-none"
          >
            {loadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/60">
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm">در حال بارگذاری متن ترانه...</span>
              </div>
            ) : lyrics?.lines && lyrics.lines.length > 0 ? (
              lyrics.lines.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                return (
                  <p
                    key={idx}
                    onClick={() => audioService.seek(line.time)}
                    className={`cursor-pointer transition-all duration-300 font-bold leading-relaxed max-w-md ${
                      isActive
                        ? 'text-white text-2xl sm:text-3xl scale-105 filter drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)]'
                        : 'text-white/40 text-lg sm:text-xl hover:text-white/70'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-white/50">
                <p className="text-base font-medium">متن ترانه برای این آهنگ یافت نشد.</p>
              </div>
            )}
          </div>
        ) : (
          /* Main Squircle Artwork Hero */
          <div className="relative flex items-center justify-center my-auto">
            {/* Ambient artwork glow behind squircle */}
            {isPlaying && (
              <div className="absolute inset-0 w-full h-full rounded-[36px] bg-cyan-500/25 blur-3xl scale-110 pointer-events-none transition-all duration-700" />
            )}

            {/* Squircle Album Artwork Frame */}
            <div className="relative w-[270px] h-[270px] sm:w-[310px] sm:h-[310px] rounded-[32px] sm:rounded-[38px] overflow-hidden bg-[#161822] shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-white/10 shrink-0">
              {currentTrack.coverUrl && !coverError ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#151720]">
                  <Music className="w-20 h-20 text-white/30" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Section ── */}
      <div className="relative z-30 w-full px-6 sm:px-7 pb-8 flex flex-col gap-3">
        {/* Track Title, Artist & Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-[21px] sm:text-[23px] font-black text-white tracking-tight truncate leading-tight">
              {currentTrack.title}
            </h1>
            <span className="text-sm font-semibold text-white/65 truncate mt-0.5 leading-snug">
              {currentTrack.artist}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Heart / Like Button */}
            <button
              type="button"
              onClick={() => onToggleLike(currentTrack)}
              className={`w-11 h-11 rounded-full lastwave-glass-pill flex items-center justify-center cursor-pointer active:scale-90 transition-all ${
                isLiked ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' : 'text-white/80'
              }`}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-5 h-5 ${isLiked ? 'fill-rose-400 text-rose-400' : 'stroke-[2]'}`}
              />
            </button>

            {/* Lyrics Quote Button */}
            <button
              type="button"
              onClick={() => setShowLyrics(!showLyrics)}
              className={`w-11 h-11 rounded-full lastwave-glass-pill flex items-center justify-center cursor-pointer active:scale-90 transition-all ${
                showLyrics ? 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' : 'text-white/80'
              }`}
              aria-label="Toggle Lyrics"
              title="Lyrics"
            >
              <Quote className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* ── LastWave Seekbar ── */}
        <div className="w-full flex flex-col gap-1.5 pt-1">
          <div
            onPointerDown={handleSeekbarPointerDown}
            onPointerMove={handleSeekbarPointerMove}
            onPointerUp={handleSeekbarPointerUp}
            className="w-full h-4 flex items-center cursor-pointer relative group touch-none"
          >
            <div className="w-full h-1.5 group-hover:h-2 rounded-full bg-white/15 overflow-hidden transition-all relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 rounded-full"
                style={{ width: `${effectiveRatio * 100}%` }}
              />
            </div>
            {/* Scrub thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg pointer-events-none -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${effectiveRatio * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-white/50 font-medium px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatRemainingTime(currentTime, duration)}</span>
          </div>
        </div>

        {/* ── Apple Music / LastWave Audio Quality Badge ── */}
        <div className="flex items-center justify-center my-0.5">
          <div
            onClick={() => setShowMatchModal(true)}
            className="lastwave-glass-pill px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-white/75 tracking-wider uppercase cursor-pointer hover:text-white"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>HQ 320 KBPS • LOSSLESS</span>
          </div>
        </div>

        {/* ── Primary Controls Row (Prev, HUGE Play/Pause, Next) ── */}
        <div className="flex items-center justify-center gap-7 pt-1">
          {/* Previous Track Button */}
          <button
            type="button"
            onClick={onPreviousTrack}
            className="w-14 h-14 rounded-full lastwave-glass-pill flex items-center justify-center text-white/90 hover:text-white cursor-pointer active:scale-90 transition-all shadow-md"
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* HUGE White Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_10px_35px_rgba(255,255,255,0.3)] hover:bg-slate-100 active:scale-90 transition-all cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black text-black" />
            ) : (
              <Play className="w-8 h-8 fill-black text-black ml-1" />
            )}
          </button>

          {/* Next Track Button with long-press preview */}
          <button
            type="button"
            onPointerDown={handleNextPointerDown}
            onPointerUp={handleNextPointerUp}
            onPointerLeave={handleNextPointerLeave}
            className="w-14 h-14 rounded-full lastwave-glass-pill flex items-center justify-center text-white/90 hover:text-white cursor-pointer active:scale-90 transition-all shadow-md"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* ── Secondary Bottom Row (3 Wide Frosted Glass Pills) ── */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {/* Shuffle Toggle Pill */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className={`lastwave-glass-pill py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-xs font-semibold ${
              cycleMode === 'shuffle'
                ? 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
                : 'text-white/70'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Shuffle</span>
          </button>

          {/* Add to Library Pill */}
          <button
            type="button"
            onClick={() => setShowLibraryModal(true)}
            className="lastwave-glass-pill py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-white/75 hover:text-white cursor-pointer active:scale-95 transition-all text-xs font-semibold"
          >
            <FolderPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Library</span>
          </button>

          {/* Repeat Mode Pill */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className={`lastwave-glass-pill py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-xs font-semibold ${
              cycleMode === 'repeat_all' || cycleMode === 'repeat_one'
                ? 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
                : 'text-white/70'
            }`}
          >
            {cycleMode === 'repeat_one' ? (
              <Repeat1 className="w-3.5 h-3.5 stroke-[2.2]" />
            ) : (
              <Repeat className="w-3.5 h-3.5 stroke-[2.2]" />
            )}
            <span>{cycleMode === 'repeat_one' ? 'One' : 'Repeat'}</span>
          </button>
        </div>
      </div>

      {/* Next Track Long-Press Preview Floating Overlay */}
      {showNextPreview && nextTrack && (
        <NextMusicPreview nextTrack={nextTrack} isVisible={showNextPreview} />
      )}

      {/* Manual Match Modal for stream replacement */}
      {showMatchModal && (
        <ManualMatchModal
          track={currentTrack}
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          onMatched={() => {
            setShowMatchModal(false);
          }}
        />
      )}

      {/* Add to Library Modal */}
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
