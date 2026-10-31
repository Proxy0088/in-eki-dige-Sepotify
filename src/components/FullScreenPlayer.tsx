import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Music } from 'lucide-react';
import { Track, NavTab } from '../types/music';
import { audioService, PlaybackCycleMode } from '../services/audioPlayer';
import { AskListLibraryModal } from './AskListLibraryModal';
import { NextMusicPreview } from './NextMusicPreview';

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
  onTabChange,
}) => {
  // Secondary Controls State
  const [cycleMode, setCycleMode] = useState<PlaybackCycleMode>(() =>
    audioService.getPlaybackCycleMode()
  );
  const [isMuted, setIsMuted] = useState<boolean>(() => audioService.getIsMuted());
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [coverError, setCoverError] = useState<boolean>(false);

  // Dragging / Scrubbing State for fluid seeking
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
      setIsMuted(audioService.getIsMuted());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCoverError(false);
  }, [currentTrack?.coverUrl]);

  const isLiked = currentTrack ? likedIds.has(currentTrack.id) : false;

  // Cycle Repeat / Shuffle Modes
  const handleCyclePlaybackMode = () => {
    const next = audioService.cyclePlaybackMode();
    setCycleMode(next);
  };

  // Toggle Mute / Unmute
  const handleToggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  // Next button pointer events for long-press preview
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

  // Save to Library modal selection handler
  const handleCloseLibraryModal = useCallback(() => {
    setShowLibraryModal(false);
  }, []);

  const handleSelectLibrary = useCallback((libraryName: string) => {
    if (onSaveToLibrary && currentTrack) {
      onSaveToLibrary(currentTrack, libraryName);
    }
    if (!isLiked && currentTrack) {
      onToggleLike(currentTrack);
    }
  }, [onSaveToLibrary, currentTrack, isLiked, onToggleLike]);

  // Progress Bar Arc Geometry
  const R = 126;
  const cx = 144;
  const cy = 144;
  const arcLength = Math.PI * R;

  const trackDuration = duration || currentTrack?.duration || 180;
  const actualRatio = trackDuration > 0 ? Math.min(Math.max(currentTime / trackDuration, 0), 1) : 0;
  const displayRatio = scrubRatio !== null ? scrubRatio : actualRatio;

  const strokeDashoffset = arcLength * (1 - displayRatio);
  const knobAngle = Math.PI * (1 - displayRatio);
  const knobX = cx + R * Math.cos(knobAngle);
  const knobY = cy + R * Math.sin(knobAngle);

  // Accurate angle & ratio calculator based on screen coordinates
  const calculateSeekRatio = useCallback((clientX: number, clientY: number, target: SVGSVGElement): number => {
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx);

    // If pointer is above the horizontal line
    if (dy < 0) {
      const halfW = rect.width * 0.44;
      const ratioFromX = (dx + halfW) / (2 * halfW);
      return Math.max(0, Math.min(1, ratioFromX));
    }

    // In bottom half: Left (angle = Math.PI) -> ratio = 0; Right (angle = 0) -> ratio = 1
    const ratio = (Math.PI - angle) / Math.PI;
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingProgressRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const ratio = calculateSeekRatio(e.clientX, e.clientY, e.currentTarget);
    setScrubRatio(ratio);
    const targetTime = ratio * trackDuration;
    audioService.seek(targetTime);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingProgressRef.current) return;
    const ratio = calculateSeekRatio(e.clientX, e.clientY, e.currentTarget);
    setScrubRatio(ratio);

    // Throttle audio seek during dragging to keep playback responsive without overloading MediaPlayer
    const now = performance.now();
    if (now - lastSeekTimeRef.current > 120) {
      lastSeekTimeRef.current = now;
      const targetTime = ratio * trackDuration;
      audioService.seek(targetTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingProgressRef.current) {
      const ratio = calculateSeekRatio(e.clientX, e.clientY, e.currentTarget);
      isDraggingProgressRef.current = false;
      setScrubRatio(null);
      const targetTime = ratio * trackDuration;
      audioService.seek(targetTime);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="w-full h-full bg-[#212121] relative overflow-hidden select-none animate-in fade-in duration-300 flex flex-col justify-between">
      {/* 
        Figma Node 114:289 "Back Page":
        Positioned at top-left with high z-index
      */}
      <button
        type="button"
        onClick={onBack}
        className="absolute left-[20px] sm:left-[25px] top-[24px] sm:top-[44px] z-30 w-11 h-11 flex items-center justify-center text-[#E4E4E4] hover:text-white transition-colors cursor-pointer active:scale-90"
        aria-label="Back to previous page"
      >
        <svg
          width="13"
          height="22"
          viewBox="0 0 12 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2L2 10L10 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 
        HERO SECTION:
        1) Music Profile Pill: Top extends beyond frame (-top-[90px]/117px), top is NOT curved (rounded-t-none), bottom is curved (rounded-b-[140px]/158px)
        2) Progress Bar: Placed OUTSIDE the music profile frame as an independent layer, completely unclipped and visible!
      */}
      <div className="relative mx-auto w-[276px] h-[min(54vh,580px)] min-h-[350px] flex-shrink-0 z-10">
        {/* 
          Node 112:129 "music profile":
          Top extends above frame without curve, bottom curved gracefully
        */}
        <div
          className="absolute -top-[90px] sm:-top-[117px] left-0 w-full h-[calc(100%+90px)] sm:h-[calc(100%+117px)] rounded-b-[140px] sm:rounded-b-[158px] rounded-t-none bg-[#212121] overflow-hidden select-none pointer-events-none"
          style={{
            boxShadow: '-2px -15px 30px #3C3C3C, 17px 15px 30px #191919',
          }}
        >
          {/* Full Album Artwork covering the pill */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            {currentTrack.coverUrl && !coverError ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                onError={() => setCoverError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#1c1c1c] flex items-center justify-center">
                <Music className="w-24 h-24 text-[#999999]" />
              </div>
            )}

            {/* Dark Glass / Gradient Vignette Overlay to enhance contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/75" />
          </div>
        </div>

        {/* 
          Progress Bar Group: OUTSIDE the Music Profile frame!
          Anchored right over the bottom curve, fully visible and unclipped
        */}
        <div
          className="absolute -bottom-[8px] sm:-bottom-[4px] left-1/2 -translate-x-1/2 w-[288px] h-[288px] z-20 pointer-events-auto select-none"
          style={{ width: 288, height: 288 }}
        >
          <svg
            className="w-full h-full cursor-pointer touch-none select-none drop-shadow-lg"
            viewBox="0 0 288 288"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Background Track Arc (#757575) */}
            <path
              d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${cx + R} ${cy}`}
              fill="none"
              stroke="#757575"
              strokeWidth="9"
              strokeLinecap="round"
            />

            {/* Progress Arc (#D9D9D9) */}
            <path
              d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 0 ${cx + R} ${cy}`}
              fill="none"
              stroke="#D9D9D9"
              strokeWidth="9"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={scrubRatio !== null ? '' : 'transition-[stroke-dashoffset] duration-150 ease-linear'}
            />

            {/* Knob Dot (18x18) */}
            <circle
              cx={knobX}
              cy={knobY}
              r="9"
              fill="#212121"
              stroke="#D9D9D9"
              strokeWidth="2.5"
              className={`drop-shadow-md ${scrubRatio !== null ? 'scale-115' : 'transition-all duration-150 ease-linear'}`}
            />
          </svg>

          {/* Song Name & Artist centered inside the progress curve */}
          <div className="absolute left-[47px] top-[19px] w-[182px] h-[116px] flex flex-col items-center justify-center pointer-events-none px-2 text-center">
            <h1
              className="font-roboto text-white text-[22px] sm:text-[24px] font-normal leading-tight tracking-normal line-clamp-2 drop-shadow-md"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h1>
            <p className="font-roboto text-[#E4E4E4]/90 text-[12px] sm:text-[13px] font-normal mt-1 truncate max-w-[160px] drop-shadow">
              {currentTrack.artist}
            </p>
          </div>
        </div>
      </div>

      {/* 
        Figma Node 119:720 "What is the next music ?" popup
        Appears above controls when holding Next button
      */}
      <NextMusicPreview nextTrack={nextTrack} isVisible={showNextPreview} />

      {/* 
        BOTTOM CONTROLS SECTION:
        1) Secondary Controls Row (Like, Repeat/Shuffle, Mute)
        2) Primary Playback Capsule (Prev, Play/Pause, Next)
        3) Bottom Navbar
        Positioned relative to bottom to guarantee 100% visibility on all screen heights
      */}
      <div className="w-full flex flex-col items-center pb-3 sm:pb-6 z-20 gap-3 sm:gap-4 mt-auto">
        {/* SECONDARY CONTROLS ROW */}
        <div className="w-[300px] sm:w-[320px] max-w-[calc(100%-48px)] flex items-center justify-between px-2">
          {/* Like Button */}
          <button
            type="button"
            onClick={() => setShowLibraryModal(true)}
            className="w-[48px] h-[48px] rounded-full bg-[#212121] border border-[#212121] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              boxShadow: '-6px -6px 12px #2F2F2F, 6px 6px 12px #0A0A0A',
            }}
            aria-label={isLiked ? 'Liked' : 'Add to favorites'}
          >
            {isLiked ? (
              <svg className="w-[20px] h-[18.35px] fill-[#E4E4E4]" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg
                className="w-[20px] h-[18.35px] text-[#E4E4E4]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </button>

          {/* Repeat / Shuffle Button */}
          <button
            type="button"
            onClick={handleCyclePlaybackMode}
            className="w-[48px] h-[48px] rounded-full bg-[#212121] border border-[#212121] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              boxShadow: '-6px -6px 12px #2F2F2F, 6px 6px 12px #0A0A0A',
            }}
            aria-label={`Playback mode: ${cycleMode}`}
            title={`Playback mode: ${cycleMode}`}
          >
            {cycleMode === 'repeat_all' && (
              <svg className="w-[24px] h-[24px] fill-[#E4E4E4]" viewBox="0 0 24 24">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            )}

            {cycleMode === 'repeat_one' && (
              <svg className="w-[24px] h-[24px] fill-[#E4E4E4]" viewBox="0 0 24 24">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                <text
                  x="12"
                  y="14.5"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#E4E4E4"
                >
                  1
                </text>
              </svg>
            )}

            {cycleMode === 'shuffle' && (
              <svg className="w-[24px] h-[24px] fill-[#E4E4E4]" viewBox="0 0 24 24">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            )}

            {cycleMode === 'off' && (
              <svg className="w-[24px] h-[24px] fill-[#757575]" viewBox="0 0 24 24">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            )}
          </button>

          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="w-[48px] h-[48px] rounded-full bg-[#212121] border border-[#212121] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              boxShadow: '-6px -6px 12px #2F2F2F, 6px 6px 12px #0A0A0A',
            }}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-[24px] h-[24px] fill-[#E4E4E4]" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-[24px] h-[24px] fill-[#E4E4E4]" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </div>

        {/* PRIMARY PLAYBACK CAPSULE (Node 112:153 Group 1) */}
        <div
          className="relative w-[272px] h-[74px] flex items-center justify-between"
          style={{ width: 272, height: 74 }}
        >
          {/* Skip Back Button */}
          <button
            type="button"
            onClick={onPreviousTrack}
            className="w-[110px] h-[66px] rounded-l-full rounded-r-none border border-[#292929] flex items-center justify-start pl-[26px] cursor-pointer active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(180deg, #171717 0%, #242424 100%)',
              boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.4), 0px 2px 4px rgba(0, 0, 0, 1)',
            }}
            aria-label="Previous Track"
          >
            <div className="w-[37px] h-[37px] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="5" width="3.08" height="14" rx="1" fill="#999999" />
                <polygon points="20,5 9,12 20,19" fill="#999999" />
              </svg>
            </div>
          </button>

          {/* Skip Forward Button with Long-press detection */}
          <button
            type="button"
            onPointerDown={handleNextPointerDown}
            onPointerUp={handleNextPointerUp}
            onPointerLeave={handleNextPointerLeave}
            className="w-[110px] h-[66px] rounded-r-full rounded-l-none border border-[#292929] flex items-center justify-end pr-[26px] cursor-pointer active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(180deg, #171717 0%, #242424 100%)',
              boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.4), 0px 2px 4px rgba(0, 0, 0, 1)',
            }}
            aria-label="Next Track (Hold to preview)"
          >
            <div className="w-[37px] h-[37px] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon points="4,5 15,12 4,19" fill="#999999" />
                <rect x="17" y="5" width="3.08" height="14" rx="1" fill="#999999" />
              </svg>
            </div>
          </button>

          {/* Central Play/Pause Capsule */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="absolute left-1/2 -translate-x-1/2 -top-[7px] w-[88px] h-[88px] rounded-full border border-[#333333] flex items-center justify-center cursor-pointer active:scale-95 transition-all z-10 hover:border-[#4d4d4d]"
            style={{
              background: 'linear-gradient(180deg, #181818 0%, #262626 100%)',
              boxShadow:
                '0px 14px 28px rgba(0, 0, 0, 0.55), 0px 4px 10px rgba(0, 0, 0, 0.9), inset 0px 1.5px 2px rgba(255, 255, 255, 0.22)',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <div className="flex items-center gap-[7px]">
                <div className="w-[10.5px] h-[32px] bg-[#E4E4E4] rounded-[2px]" />
                <div className="w-[10.5px] h-[32px] bg-[#E4E4E4] rounded-[2px]" />
              </div>
            ) : (
              <svg className="w-[34px] h-[34px] fill-[#E4E4E4] ml-1.5" viewBox="0 0 24 24">
                <polygon points="7,4 21,12 7,20" />
              </svg>
            )}
          </button>
        </div>

        {/* BOTTOM NAVBAR */}
        <div
          className="w-[342px] max-w-[calc(100%-32px)] h-[69px] rounded-[20px] bg-[#212121] flex items-center justify-between px-[28px] select-none"
          style={{
            boxShadow: '-23px -13px 23px #2A2A2A, 23px 23px 46px #181818',
          }}
        >
          {/* Search Tab */}
          <button
            type="button"
            onClick={() => onTabChange('search')}
            className="flex flex-col items-center justify-center gap-1 cursor-pointer text-[#999999] hover:text-[#E4E4E4] transition-colors"
            aria-label="Search"
          >
            <svg className="w-[22px] h-[22px] stroke-[2] fill-none stroke-current" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="font-roboto text-[12px] font-normal leading-none tracking-tight">
              Search
            </span>
          </button>

          {/* Home Tab */}
          <button
            type="button"
            onClick={() => onTabChange('home')}
            className="flex flex-col items-center justify-center gap-1 cursor-pointer text-[#999999] hover:text-[#E4E4E4] transition-colors"
            aria-label="Home"
          >
            <svg className="w-[24px] h-[24px] stroke-[2] fill-none stroke-current" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="font-roboto text-[12px] font-normal leading-none tracking-tight">
              Home
            </span>
          </button>

          {/* Library Tab */}
          <button
            type="button"
            onClick={() => onTabChange('library')}
            className="flex flex-col items-center justify-center gap-1 cursor-pointer text-[#E4E4E4] hover:text-white transition-colors"
            aria-label="Library"
          >
            <svg className="w-[24px] h-[24px] stroke-[2] fill-none stroke-current" viewBox="0 0 24 24">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="font-roboto text-[12px] font-normal leading-none tracking-tight">
              Library
            </span>
          </button>
        </div>
      </div>

      {/* Save to Library Modal */}
      <AskListLibraryModal
        isOpen={showLibraryModal}
        onClose={handleCloseLibraryModal}
        onSelectLibrary={handleSelectLibrary}
      />
    </div>
  );
};
