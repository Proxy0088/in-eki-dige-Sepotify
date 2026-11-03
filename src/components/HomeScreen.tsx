import React from 'react';
import { Play, Pause, Music, ShieldCheck } from 'lucide-react';
import { Track, MoodType, AppLanguage } from '../types/music';
import { FigmaLibraryIcon } from './FigmaLibraryIcon';

interface HomeScreenProps {
  recentTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  selectedMood: MoodType | null;
  onPlayTrack: (track: Track) => void;
  onSelectMood: (mood: MoodType) => void;
  onOpenDeviceLibrary?: () => void;
  isNationalNet?: boolean;
  language?: AppLanguage;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recentTracks,
  currentTrack,
  isPlaying,
  selectedMood,
  onPlayTrack,
  onSelectMood,
  onOpenDeviceLibrary,
  isNationalNet = false,
  language = 'en',
}) => {
  // Exactly 4 recent tiles matching Figma
  const tiles = recentTracks.slice(0, 4);

  return (
    <div className="flex-1 flex flex-col px-[25px] overflow-y-auto no-scrollbar pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-36">
      {/* Top Header Row: "recents" (Audex 40px, left 35, top 129) & Figma Node 88:39 Library Icon (x: 340, y: 140) */}
      <div className="flex items-center justify-between pl-[10px] pr-[15px] mt-[11px] mb-[23px]">
        <h1 className="font-audex text-[40px] leading-tight text-[#999999] select-none lowercase">
          recents
        </h1>

        {/* National Intranet Shield indicator on HOME screen */}
        {isNationalNet && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-semibold backdrop-blur-xs animate-in fade-in select-none shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            title={language === 'fa' ? 'سپر اینترنت ملی فعال است (بدون نیاز به فیلترشکن)' : 'National Net Shield Active (No VPN needed)'}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2.2] animate-pulse" />
            <span className="text-[11px] font-medium leading-none">
              {language === 'fa' ? 'سپر نت ملی' : 'Shield Active'}
            </span>
          </div>
        )}


        {/* Node 88:39 "Library" Component: width: 24, height: 24, x: 340, y: 140 */}
        <button
          type="button"
          onClick={onOpenDeviceLibrary}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title="Open Device Music Library"
          aria-label="Device Music Library"
        >
          <FigmaLibraryIcon className="w-6 h-6 hover:brightness-125 transition-all" color="#999999" />
        </button>
      </div>

      {/* 4 Large Recent Music Cards in exact Figma 2x2 grid (170x161, inner 153x146, r:36) */}
      <div className="grid grid-cols-2 gap-x-[20px] gap-y-[39px] mb-[39px]">
        {tiles.map((track, idx) => {
          const isThisPlaying = currentTrack?.id === track.id && isPlaying;
          const isThisCurrent = currentTrack?.id === track.id;

          return (
            <button
              key={track.id || idx}
              type="button"
              onClick={() => onPlayTrack(track)}
              className={`group relative w-full h-[161px] rounded-[36px] p-[7px] shadow-figma-card cursor-pointer transition-transform duration-200 active:scale-[0.98] flex items-center justify-center ${
                isThisCurrent ? 'ring-1 ring-white/30' : ''
              }`}
              aria-label={`Play recent track ${track.title}`}
            >
              {/* Inner pitch-black rounded square (153x146, r:36, border 1px #999999) */}
              <div className="w-full h-full rounded-[30px] bg-black border border-[#999999] flex flex-col items-center justify-between p-3 relative overflow-hidden shadow-inner">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-[#181818] flex items-center justify-center">
                    <Music className="w-10 h-10 text-[#777777]" />
                  </div>
                )}
                {/* Subtle dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

                {/* Status Badge */}
                <div className="relative z-10 w-full flex justify-between items-start">
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider text-white/80 bg-black/50 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-xs">
                    {track.mood}
                  </span>
                </div>

                {/* Track Title and Artist */}
                <div className="relative z-10 w-full text-left">
                  <p className="text-xs font-semibold text-white truncate drop-shadow-md">
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/70 truncate drop-shadow-sm font-medium">
                    {track.artist}
                  </p>
                </div>

                {/* Center play/pause indicator on hover or while playing */}
                <div className="absolute inset-0 z-10 flex items-center justify-center transition-opacity">
                  {isThisPlaying ? (
                    <div className="w-9 h-9 rounded-full bg-black/75 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-lg animate-pulse">
                      <Pause className="w-4 h-4 fill-white" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* "what is your mood ?" Heading: Audex 24px, #999999, top 598 */}
      <h2 className="font-audex text-[24px] leading-tight text-[#999999] mb-[24px] select-none">
        what is your mood&nbsp;&nbsp;?
      </h2>

      {/* 4 Mood Buttons: 115.91px x 41.66px, r: 14.67, Roboto Bold 13.3px, letter-spacing 1.33px */}
      <div className="grid grid-cols-2 gap-x-[24px] gap-y-[30px] w-full max-w-[270px]">
        {/* Feels good */}
        <button
          type="button"
          onClick={() => onSelectMood('Feels good')}
          className={`w-[115.91px] h-[41.66px] rounded-[14.67px] shadow-figma-button flex items-center justify-center px-2 cursor-pointer transition-all duration-200 ${
            selectedMood === 'Feels good'
              ? 'ring-1 ring-white/50 bg-[#2d2d2d]'
              : 'hover:brightness-110'
          }`}
        >
          <span className="font-roboto font-bold text-[13.3px] text-white tracking-[1.33px] text-center whitespace-nowrap">
            Feels good
          </span>
        </button>

        {/* Gaming */}
        <button
          type="button"
          onClick={() => onSelectMood('Gaming')}
          className={`w-[115.91px] h-[41.66px] rounded-[14.67px] shadow-figma-button flex items-center justify-center px-2 cursor-pointer transition-all duration-200 ${
            selectedMood === 'Gaming'
              ? 'ring-1 ring-white/50 bg-[#2d2d2d]'
              : 'hover:brightness-110'
          }`}
        >
          <span className="font-roboto font-bold text-[13.3px] text-white tracking-[1.33px] text-center whitespace-nowrap">
            Gaming
          </span>
        </button>

        {/* Chill */}
        <button
          type="button"
          onClick={() => onSelectMood('Chill')}
          className={`w-[115.91px] h-[41.66px] rounded-[14.67px] shadow-figma-button flex items-center justify-center px-2 cursor-pointer transition-all duration-200 ${
            selectedMood === 'Chill'
              ? 'ring-1 ring-white/50 bg-[#2d2d2d]'
              : 'hover:brightness-110'
          }`}
        >
          <span className="font-roboto font-bold text-[13.3px] text-white tracking-[1.33px] text-center whitespace-nowrap">
            Chill
          </span>
        </button>

        {/* Focus */}
        <button
          type="button"
          onClick={() => onSelectMood('Focus')}
          className={`w-[115.91px] h-[41.66px] rounded-[14.67px] shadow-figma-button flex items-center justify-center px-2 cursor-pointer transition-all duration-200 ${
            selectedMood === 'Focus'
              ? 'ring-1 ring-white/50 bg-[#2d2d2d]'
              : 'hover:brightness-110'
          }`}
        >
          <span className="font-roboto font-bold text-[13.3px] text-white tracking-[1.33px] text-center whitespace-nowrap">
            Focus
          </span>
        </button>
      </div>
    </div>
  );
};
