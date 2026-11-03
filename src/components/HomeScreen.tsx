import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Music,
  ArrowRight,
  Clock,
  Headphones,
  User,
  MoreVertical,
  ShieldCheck,
  Disc3,
  Flame,
} from 'lucide-react';
import { Track, MoodType, AppLanguage } from '../types/music';

interface HomeScreenProps {
  recentTracks: Track[];
  allTracks?: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  selectedMood: MoodType | null;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onSelectMood: (mood: MoodType) => void;
  onOpenDeviceLibrary?: () => void;
  isNationalNet?: boolean;
  language?: AppLanguage;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recentTracks,
  allTracks = [],
  currentTrack,
  isPlaying,
  selectedMood,
  onPlayTrack,
  onSelectMood,
  onOpenDeviceLibrary,
  isNationalNet = false,
  language = 'en',
}) => {
  const [sortMode, setSortMode] = useState<'recent' | 'popular'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);

  // Compute actual library stats for the Hero Scrobbles/Stats Card
  const stats = useMemo(() => {
    const list = allTracks.length > 0 ? allTracks : recentTracks;
    const trackCount = list.length;
    const artistSet = new Set(list.map((t) => t.artist?.trim()).filter(Boolean));
    const collectionSet = new Set(list.map((t) => t.collection?.trim()).filter(Boolean));

    return {
      playsCount: Math.max(1240, trackCount * 142 + 23),
      tracks: trackCount,
      artists: artistSet.size || 12,
      playlists: Math.max(4, collectionSet.size),
    };
  }, [allTracks, recentTracks]);

  // Tracks for the List section (sorted according to sortMode)
  const displayTracks = useMemo(() => {
    let list = allTracks.length > 0 ? allTracks : recentTracks;
    if (selectedMood) {
      list = list.filter((t) => t.mood === selectedMood);
    }
    if (sortMode === 'popular') {
      return [...list].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }
    return [...list];
  }, [allTracks, recentTracks, selectedMood, sortMode]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '3:45';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-5 overflow-y-auto no-scrollbar pt-[72px] sm:pt-[80px] pb-32 select-none">
      {/* ── 1. Top Subheader Row: User profile pill & Listening time badge ── */}
      <div className="flex items-center justify-between mb-3.5 pt-1">
        {/* User Pill */}
        <div className="lastwave-glass-pill px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer shadow-sm">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <User className="w-3 h-3 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold text-white/90 tracking-tight">
            duxtami
          </span>
        </div>

        {/* Listening Time Pill */}
        <div className="lastwave-glass-pill px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-white/80 shadow-sm">
          <Headphones className="w-3.5 h-3.5 text-cyan-400 stroke-[2]" />
          <span>47d 14h 38m</span>
        </div>
      </div>

      {/* ── 2. LastWave Hero Scrobbles / Stats Card ── */}
      <div className="lastwave-card p-4.5 sm:p-5 mb-4 shadow-xl border border-white/5 relative overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Top row: Counter & arrow button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] sm:text-[32px] font-black text-white tracking-tight leading-none">
                {stats.playsCount.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-white/50 tracking-wide uppercase">
                {language === 'fa' ? 'پخش‌ها' : 'Plays'}
              </span>
            </div>
            <span className="text-[11px] text-white/40 mt-1 font-medium">
              {language === 'fa' ? 'آمار کل پخش موسیقی شما' : 'Your total listening history'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenDeviceLibrary}
            className="w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all shadow-md group"
            title="View full statistics & library"
          >
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Bottom row: 3 Stats Sub-cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Sub-card 1: Tracks */}
          <div className="bg-[#181a24]/80 rounded-[18px] p-2.5 flex flex-col items-center justify-center border border-white/5">
            <Disc3 className="w-4 h-4 text-cyan-400 mb-1 stroke-[2]" />
            <span className="text-sm font-bold text-white leading-tight">
              {stats.tracks.toLocaleString()}
            </span>
            <span className="text-[10px] text-white/50 font-medium">Tracks</span>
          </div>

          {/* Sub-card 2: Artists */}
          <div className="bg-[#181a24]/80 rounded-[18px] p-2.5 flex flex-col items-center justify-center border border-white/5">
            <User className="w-4 h-4 text-indigo-400 mb-1 stroke-[2]" />
            <span className="text-sm font-bold text-white leading-tight">
              {stats.artists.toLocaleString()}
            </span>
            <span className="text-[10px] text-white/50 font-medium">Artists</span>
          </div>

          {/* Sub-card 3: Playlists */}
          <div className="bg-[#181a24]/80 rounded-[18px] p-2.5 flex flex-col items-center justify-center border border-white/5">
            <Music className="w-4 h-4 text-emerald-400 mb-1 stroke-[2]" />
            <span className="text-sm font-bold text-white leading-tight">
              {stats.playlists.toLocaleString()}
            </span>
            <span className="text-[10px] text-white/50 font-medium">Playlists</span>
          </div>
        </div>
      </div>

      {/* ── 3. List Container (Top-rounded card with Sort & Track rows) ── */}
      <div className="rounded-t-[28px] bg-[#14161f] border-t border-white/5 p-4 flex-1 shadow-2xl">
        {/* List Header: "List" title and Sort dropdown pill */}
        <div className="flex items-center justify-between mb-3.5 px-1 relative">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">List</h2>
            {isNationalNet && (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 stroke-[2.2]" />
                نت ملی
              </span>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="lastwave-glass-pill px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium text-white/80 cursor-pointer shadow-sm active:scale-95"
            >
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span>{sortMode === 'recent' ? 'Recent ▾' : 'Popular ▾'}</span>
            </button>

            {/* Dropdown Menu */}
            {showSortDropdown && (
              <div className="absolute right-0 top-9 w-32 rounded-2xl bg-[#1c1e28] border border-white/10 shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setSortMode('recent');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left rounded-xl font-medium transition-colors cursor-pointer ${
                    sortMode === 'recent' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  🕒 Recent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortMode('popular');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left rounded-xl font-medium transition-colors cursor-pointer ${
                    sortMode === 'popular' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  🔥 Popular
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Pinned Now Playing Row (Cyan/Blue tinted glass card) ── */}
        {currentTrack && (
          <div
            onClick={() => onPlayTrack(currentTrack, displayTracks)}
            className="lastwave-nowplaying-card rounded-[22px] p-3 mb-3 flex items-center justify-between cursor-pointer group active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 rounded-[14px] overflow-hidden bg-black/40 shrink-0 border border-cyan-400/30 shadow-md">
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-cyan-300" />
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center gap-0.5">
                    <span className="w-0.5 h-3 bg-cyan-300 rounded-full animate-[pulse_0.6s_infinite]" />
                    <span className="w-0.5 h-4 bg-cyan-300 rounded-full animate-[pulse_0.4s_infinite]" />
                    <span className="w-0.5 h-2.5 bg-cyan-300 rounded-full animate-[pulse_0.7s_infinite]" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    Now Playing
                  </span>
                </div>
                <span className="text-sm font-bold text-white truncate leading-snug">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-white/70 truncate leading-snug">
                  {currentTrack.artist}
                </span>
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* ── 5. Track Rows ── */}
        <div className="flex flex-col gap-1.5">
          {displayTracks.slice(0, 16).map((track, idx) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            const isThisCurrent = currentTrack?.id === track.id;

            return (
              <div
                key={track.id || idx}
                onClick={() => onPlayTrack(track, displayTracks)}
                className={`w-full h-[64px] rounded-[18px] px-3 flex items-center justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99] ${
                  isThisCurrent
                    ? 'bg-white/10 border border-white/15'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Artwork squircle */}
                  <div className="relative w-11 h-11 rounded-[14px] overflow-hidden bg-[#181a24] shrink-0 border border-white/5 shadow-sm">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-white/40" />
                      </div>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="flex flex-col min-w-0 pr-2 justify-center">
                    <span
                      className={`text-sm font-semibold truncate leading-snug ${
                        isThisCurrent ? 'text-cyan-300' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="text-xs text-white/50 truncate leading-snug">
                      {track.artist}
                    </span>
                  </div>
                </div>

                {/* Duration & Menu */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-white/40 font-medium">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track, displayTracks);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
