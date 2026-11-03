import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Music,
  Clock,
  MoreVertical,
  ShieldCheck,
  ChevronRight,
  Disc3,
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

const PLAYLISTS = [
  {
    id: 'ambient',
    name: 'Ambient',
    nameFa: 'امبینت',
    gradient: 'from-violet-700/85 via-purple-800/70 to-indigo-950/90',
    border: 'border-violet-500/35',
  },
  {
    id: 'rock',
    name: 'Rock',
    nameFa: 'راک',
    gradient: 'from-red-600/85 via-rose-700/70 to-red-950/90',
    border: 'border-rose-500/35',
  },
  {
    id: 'pop',
    name: 'Pop Music',
    nameFa: 'پاپ',
    gradient: 'from-sky-500/85 via-blue-600/70 to-cyan-950/90',
    border: 'border-sky-500/35',
  },
  {
    id: 'hiphop',
    name: 'Hip Hop',
    nameFa: 'هیپ‌هاپ',
    gradient: 'from-purple-600/85 via-fuchsia-700/70 to-indigo-950/90',
    border: 'border-purple-500/35',
  },
  {
    id: 'blues',
    name: 'Blues',
    nameFa: 'بلوز',
    gradient: 'from-emerald-600/85 via-teal-700/70 to-emerald-950/90',
    border: 'border-emerald-500/35',
  },
  {
    id: 'electronic',
    name: 'Electronic',
    nameFa: 'الکترونیک',
    gradient: 'from-amber-600/85 via-orange-700/70 to-amber-950/90',
    border: 'border-amber-500/35',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recentTracks,
  allTracks = [],
  currentTrack,
  isPlaying,
  selectedMood,
  onPlayTrack,
  onOpenDeviceLibrary,
  isNationalNet = false,
  language = 'en',
}) => {
  const [sortMode, setSortMode] = useState<'recent' | 'popular'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Group tracks into distinct albums for the Albums carousel
  const albums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; coverUrl?: string; tracks: Track[] }>();
    const source = allTracks.length > 0 ? allTracks : recentTracks;
    for (const t of source) {
      const albumName = t.album?.trim() || 'Featured Album';
      if (!map.has(albumName)) {
        map.set(albumName, {
          name: albumName,
          artist: t.artist,
          coverUrl: t.coverUrl,
          tracks: [t],
        });
      } else {
        map.get(albumName)!.tracks.push(t);
      }
    }
    return Array.from(map.values());
  }, [allTracks, recentTracks]);

  // Featured track for the hero card at the top
  const featuredTrack = useMemo(() => {
    return currentTrack || (allTracks.length > 0 ? allTracks[0] : recentTracks[0]);
  }, [currentTrack, allTracks, recentTracks]);

  // Tracks for the List section
  const displayTracks = useMemo(() => {
    let list = allTracks.length > 0 ? allTracks : recentTracks;
    if (selectedMood) {
      list = list.filter((t) => t.mood === selectedMood);
    }
    if (selectedGenre) {
      const g = selectedGenre.toLowerCase();
      list = list.filter(
        (t) =>
          t.mood?.toLowerCase().includes(g) ||
          t.genre?.toLowerCase().includes(g) ||
          t.album?.toLowerCase().includes(g) ||
          t.title?.toLowerCase().includes(g)
      );
    }
    if (sortMode === 'popular') {
      return [...list].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }
    return [...list];
  }, [allTracks, recentTracks, selectedMood, selectedGenre, sortMode]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '3:45';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 overflow-y-auto no-scrollbar pt-24 sm:pt-28 pb-32 select-none animate-screen-enter">
      {/* ── 1. Featured / Frequently Played Hero Card (Image 1 reference) ── */}
      {featuredTrack && (
        <div
          onClick={() => onPlayTrack(featuredTrack, displayTracks)}
          className="relative w-full h-44 sm:h-52 rounded-[28px] overflow-hidden mb-6 cursor-pointer group shadow-2xl border border-white/[0.08] active:scale-[0.99] transition-transform shrink-0"
        >
          {/* Background Artwork with rich ambient fallback */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/80 via-[#24162a] to-[#12141c]" />
          {featuredTrack.coverUrl && (
            <img
              src={featuredTrack.coverUrl}
              alt={featuredTrack.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}

          {/* Cinematic Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25" />

          {/* Top Right Circular Play Button */}
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg group-hover:scale-110 active:scale-95 transition-transform">
            {isPlaying && currentTrack?.id === featuredTrack.id ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </div>

          {/* Bottom Card Info: Artist Title & Badge */}
          <div className="absolute bottom-4 left-5 right-16 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight truncate drop-shadow-md">
              {featuredTrack.artist || featuredTrack.title}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] sm:text-xs font-semibold text-white/70 uppercase tracking-widest drop-shadow">
                {language === 'fa' ? 'پیشنهادی برای شما' : 'FREQUENTLY PLAYED'}
              </span>
              <span className="text-[10px] text-white/50">•</span>
              <span className="text-[11px] text-white/85 font-medium truncate">
                {featuredTrack.title}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Albums Section (Image 1 reference) ── */}
      <section className="mb-6 shrink-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#ededed] tracking-tight">
              {language === 'fa' ? 'آلبوم‌ها' : 'Albums'}
            </h2>
            <span className="w-2 h-2 rounded-full bg-white/70 inline-block" />
          </div>

          <button
            type="button"
            onClick={onOpenDeviceLibrary}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer"
            title="Browse all albums"
          >
            <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Horizontal Scrolling Albums Carousel */}
        <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1">
          {albums.map((album, idx) => (
            <div
              key={album.name + idx}
              onClick={() => onPlayTrack(album.tracks[0], album.tracks)}
              className="w-32 sm:w-36 shrink-0 cursor-pointer group active:scale-[0.98] transition-transform"
            >
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1e2232] to-[#12141c] border border-white/10 shadow-lg group-hover:border-white/20 transition-all flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-cyan-400/40 stroke-[1.5]" />
                {album.coverUrl && (
                  <img
                    src={album.coverUrl}
                    alt={album.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-md">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <span className="block text-xs font-semibold text-[#ededed] truncate mt-2 leading-tight">
                {album.name}
              </span>
              <span className="block text-[11px] text-[#a1a1a6] truncate mt-0.5 leading-tight">
                {album.artist}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Playlists / Genres Section (Image 1 reference) ── */}
      <section className="mb-6 shrink-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#ededed] tracking-tight">
              {language === 'fa' ? 'پلی‌لیست‌ها' : 'Playlists'}
            </h2>
            <span className="w-2 h-2 rounded-full bg-white/70 inline-block" />
          </div>

          {selectedGenre && (
            <button
              type="button"
              onClick={() => setSelectedGenre(null)}
              className="text-[11px] text-cyan-400 hover:underline px-2 py-0.5"
            >
              {language === 'fa' ? 'نمایش همه' : 'Show all'}
            </button>
          )}
        </div>

        {/* Horizontal Scrolling Playlist Cards with vibrant frosted gradients */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {PLAYLISTS.map((pl) => {
            const isSelected = selectedGenre === pl.name;
            return (
              <div
                key={pl.id}
                onClick={() => setSelectedGenre(isSelected ? null : pl.name)}
                className={`w-28 sm:w-32 h-18 sm:h-20 shrink-0 rounded-2xl flex items-center justify-center px-3 py-2 cursor-pointer transition-all active:scale-95 shadow-lg border relative overflow-hidden bg-gradient-to-br ${
                  pl.gradient
                } ${pl.border} ${
                  isSelected ? 'ring-2 ring-white scale-[1.03]' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <span className="text-xs sm:text-sm font-semibold text-white tracking-tight drop-shadow-md text-center leading-tight">
                  {language === 'fa' ? pl.nameFa : pl.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Main Songs List Container (Preserved with clean modern styling) ── */}
      <div className="rounded-3xl bg-[#14161f] border border-white/[0.06] p-4 flex-1 shadow-2xl">
        {/* List Header */}
        <div className="flex items-center justify-between mb-3 px-1 relative">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#ededed] tracking-tight">
              {language === 'fa' ? 'آهنگ‌ها' : 'Songs'}
            </h2>
            {selectedGenre && (
              <span className="text-xs text-cyan-400 font-medium">({selectedGenre})</span>
            )}
            {isNationalNet && (
              <span className="text-[9px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 stroke-[1.8]" />
                نت ملی
              </span>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="lastwave-glass-pill px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-normal text-[#a1a1a6] hover:text-[#ededed] cursor-pointer shadow-sm active:scale-95 transition-transform"
            >
              <Clock className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>{sortMode === 'recent' ? 'Recent ▾' : 'Popular ▾'}</span>
            </button>

            {/* Dropdown Menu with spring physics animation */}
            {showSortDropdown && (
              <div className="absolute right-0 top-8 w-32 rounded-xl bg-[#1c1e28]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1 z-30 animate-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setSortMode('recent');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left rounded-lg font-medium transition-colors cursor-pointer ${
                    sortMode === 'recent' ? 'bg-white/10 text-[#ededed]' : 'text-[#a1a1a6] hover:bg-white/[0.06]'
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
                  className={`w-full px-3 py-1.5 text-xs text-left rounded-lg font-medium transition-colors cursor-pointer ${
                    sortMode === 'popular' ? 'bg-white/10 text-[#ededed]' : 'text-[#a1a1a6] hover:bg-white/[0.06]'
                  }`}
                >
                  🔥 Popular
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Pinned Now Playing Row (Calm hairline glass card) ── */}
        {currentTrack && (
          <div
            onClick={() => onPlayTrack(currentTrack, displayTracks)}
            className="rounded-2xl p-3 mb-3 flex items-center justify-between cursor-pointer bg-[#181d28] border border-cyan-400/25 shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10 shadow-sm">
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-cyan-400" />
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/35 flex items-end justify-center pb-1.5 gap-0.5">
                    <span className="w-0.5 h-2 bg-cyan-300 rounded-full" />
                    <span className="w-0.5 h-3.5 bg-cyan-300 rounded-full" />
                    <span className="w-0.5 h-2.5 bg-cyan-300 rounded-full" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-400">
                    Now Playing
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#ededed] truncate leading-snug">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-[#a1a1a6] truncate leading-snug">
                  {currentTrack.artist}
                </span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-cyan-400/15 text-cyan-400 flex items-center justify-center shrink-0">
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* ── Track Rows ── */}
        <div className="flex flex-col gap-1">
          {displayTracks.slice(0, 16).map((track, idx) => {
            const isThisCurrent = currentTrack?.id === track.id;

            return (
              <div
                key={track.id || idx}
                onClick={() => onPlayTrack(track, displayTracks)}
                className={`w-full h-15 rounded-xl px-2.5 flex items-center justify-between cursor-pointer transition-colors duration-150 active:scale-[0.99] ${
                  isThisCurrent
                    ? 'bg-white/[0.08] border border-white/10'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#181a24] shrink-0 border border-white/5 shadow-sm">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-[#71717a]" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 pr-2 justify-center">
                    <span
                      className={`text-sm font-medium truncate leading-snug ${
                        isThisCurrent ? 'text-cyan-400' : 'text-[#ededed]'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="text-xs text-[#a1a1a6] truncate leading-snug">
                      {track.artist}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-[#71717a] font-normal tabular-nums">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track, displayTracks);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#71717a] hover:text-[#ededed] transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5 stroke-[1.8]" />
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
