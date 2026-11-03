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
  FolderPlus,
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
    const next = audioService.cyclePlaybackMode();
    setCycleMode(next);
  };

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
    <div className="w-full h-full bg-[#0a0b0e] relative overflow-hidden select-none flex flex-col justify-between animate-in fade-in duration-200">
      {/* ── Calm Blurred Backdrop ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentTrack.coverUrl && !coverError ? (
          <img
            src={currentTrack.coverUrl}
            alt=""
            className="w-full h-full object-cover scale-125 blur-3xl opacity-30 brightness-75 transition-opacity duration-500"
          />
        ) : (
          <div className="w-full h-full bg-[#0d0f15]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#0a0b0e]/75 to-[#0a0b0e]" />
      </div>

      {/* ── Top Header Bar ── */}
      <div className="relative z-30 w-full h-15 px-4 sm:px-6 flex items-center justify-between pt-2">
        {/* Collapse Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Center: Context & Playlist */}
        <div className="flex flex-col items-center justify-center max-w-[200px]">
          <span className="text-[11px] font-semibold tracking-wider text-[#a1a1a6] uppercase leading-none">
            {showLyrics ? 'Lyrics' : 'Now Playing'}
          </span>
          <span className="text-xs text-[#71717a] font-normal truncate mt-1 leading-none">
            {currentTrack.collection || 'Sepotify'}
          </span>
        </div>

        {/* Options Button */}
        <button
          type="button"
          onClick={() => setShowMatchModal(true)}
          className="w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
          aria-label="Song options and match"
        >
          <MoreVertical className="w-4 h-4 stroke-[1.8]" />
        </button>
      </div>

      {/* ── Center Content: Squircle Artwork or Synced Lyrics ── */}
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
                        ? 'text-[#ededed] text-2xl sm:text-3xl'
                        : 'text-[#71717a] text-lg sm:text-xl hover:text-[#a1a1a6]'
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
          <div className="relative flex items-center justify-center my-auto">
            {/* Squircle Album Artwork Frame */}
            <div className="relative w-64 h-64 sm:w-76 sm:h-76 rounded-3xl overflow-hidden bg-[#14161f] shadow-2xl border border-white/10 shrink-0">
              {currentTrack.coverUrl && !coverError ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#12141c]">
                  <Music className="w-16 h-16 text-[#71717a]" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Section ── */}
      <div className="relative z-30 w-full px-6 sm:px-8 pb-7 flex flex-col gap-3">
        {/* Track Title, Artist & Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed] tracking-tight truncate leading-tight">
              {currentTrack.title}
            </h1>
            <span className="text-sm font-medium text-[#a1a1a6] truncate mt-0.5 leading-snug">
              {currentTrack.artist}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Heart / Like Button */}
            <button
              type="button"
              onClick={() => onToggleLike(currentTrack)}
              className={`w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
                isLiked ? 'text-rose-400' : 'text-[#a1a1a6] hover:text-[#ededed]'
              }`}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : 'stroke-[1.8]'}`}
              />
            </button>

            {/* Lyrics Quote Button */}
            <button
              type="button"
              onClick={() => setShowLyrics(!showLyrics)}
              className={`w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
                showLyrics ? 'text-cyan-400 bg-white/10' : 'text-[#a1a1a6] hover:text-[#ededed]'
              }`}
              aria-label="Toggle Lyrics"
              title="Lyrics"
            >
              <Quote className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* ── Seekbar ── */}
        <div className="w-full flex flex-col gap-1.5 pt-1">
          <div
            onPointerDown={handleSeekbarPointerDown}
            onPointerMove={handleSeekbarPointerMove}
            onPointerUp={handleSeekbarPointerUp}
            className="w-full h-4 flex items-center cursor-pointer relative group touch-none"
          >
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${effectiveRatio * 100}%` }}
              />
            </div>
            {/* Scrub thumb */}
            <div
              className="absolute w-3 h-3 rounded-full bg-white shadow-md pointer-events-none -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${effectiveRatio * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#71717a] font-normal tabular-nums px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatRemainingTime(currentTime, duration)}</span>
          </div>
        </div>

        {/* ── Audio Quality Badge ── */}
        <div className="flex items-center justify-center my-0.5">
          <div
            onClick={() => setShowMatchModal(true)}
            className="lastwave-glass-pill px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-medium text-[#a1a1a6] tracking-wider uppercase cursor-pointer hover:text-[#ededed] tabular-nums"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>HQ 320 KBPS • Lossless</span>
          </div>
        </div>

        {/* ── Primary Playback Controls Row ── */}
        <div className="flex items-center justify-center gap-6 pt-1">
          {/* Previous Track */}
          <button
            type="button"
            onClick={onPreviousTrack}
            className="w-12 h-12 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform"
            aria-label="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-[#ededed] text-[#090a0f] hover:bg-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Track Button */}
          <button
            type="button"
            onPointerDown={handleNextPointerDown}
            onPointerUp={handleNextPointerUp}
            onPointerLeave={handleNextPointerLeave}
            className="w-12 h-12 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform"
            aria-label="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* ── Secondary Controls Row (3 Wide Pills) ── */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {/* Shuffle Toggle */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className={`lastwave-glass-pill py-2 px-3 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform text-xs font-medium ${
              cycleMode === 'shuffle'
                ? 'text-cyan-400 border-cyan-400/30'
                : 'text-[#a1a1a6]'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Shuffle</span>
          </button>

          {/* Add to Library */}
          <button
            type="button"
            onClick={() => setShowLibraryModal(true)}
            className="lastwave-glass-pill py-2 px-3 rounded-full flex items-center justify-center gap-1.5 text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform text-xs font-medium"
          >
            <FolderPlus className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Library</span>
          </button>

          {/* Repeat Mode */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className={`lastwave-glass-pill py-2 px-3 rounded-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform text-xs font-medium ${
              cycleMode === 'repeat_all' || cycleMode === 'repeat_one'
                ? 'text-cyan-400 border-cyan-400/30'
                : 'text-[#a1a1a6]'
            }`}
          >
            {cycleMode === 'repeat_one' ? (
              <Repeat1 className="w-3.5 h-3.5 stroke-[1.8]" />
            ) : (
              <Repeat className="w-3.5 h-3.5 stroke-[1.8]" />
            )}
            <span>{cycleMode === 'repeat_one' ? 'One' : 'Repeat'}</span>
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
