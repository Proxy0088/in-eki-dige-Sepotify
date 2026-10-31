import React from 'react';
import { Music } from 'lucide-react';
import { Track } from '../types/music';

interface NextMusicPreviewProps {
  nextTrack: Track | null;
  isVisible: boolean;
}

export const NextMusicPreview: React.FC<NextMusicPreviewProps> = ({
  nextTrack,
  isVisible,
}) => {
  if (!nextTrack) return null;

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 bottom-[210px] z-30 transition-all duration-300 ease-out select-none pointer-events-none ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-10 scale-90'
      }`}
      style={{
        width: 233,
        height: 79,
      }}
    >
      {/* 
        Figma Node 119:720 "What is the next music ?":
        width: 233px, height: 79px, borderRadius: 24px,
        border: 1px solid #292929,
        background: linear-gradient(#171717 0%, #242424 100%),
        shadows: 0 10px 20px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,1)
      */}
      <div
        className="w-full h-full rounded-[24px] border border-[#292929] relative flex items-center px-[10px] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #171717 0%, #242424 100%)',
          boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.4), 0px 2px 4px rgba(0, 0, 0, 1)',
        }}
      >
        {/* Node 119:718 "div.card" Artwork Thumbnail */}
        <div
          className="w-[55px] h-[57px] rounded-[22px] bg-[#212121] overflow-hidden flex-shrink-0 flex items-center justify-center relative"
          style={{
            boxShadow: '-6px -6px 12px #3C3C3C, 6px 6px 12px #191919',
          }}
        >
          {nextTrack.coverUrl ? (
            <img
              src={nextTrack.coverUrl}
              alt={nextTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#1b1b1b] flex items-center justify-center">
              <Music className="w-6 h-6 text-[#999999]" />
            </div>
          )}
        </div>

        {/* Text Info: Song Title and Artist */}
        <div className="flex-1 min-w-0 pl-3 pr-1 flex flex-col justify-center">
          {/* Node 119:721 "name of song" */}
          <span
            className="text-white text-[15px] font-medium leading-tight truncate text-left"
            title={nextTrack.title}
          >
            {nextTrack.title}
          </span>
          {/* Node 119:722 "Artis name" */}
          <span
            className="text-[#A0A0A0] text-[10px] font-normal leading-tight truncate text-left mt-1"
            title={nextTrack.artist}
          >
            {nextTrack.artist}
          </span>
        </div>
      </div>
    </div>
  );
};
