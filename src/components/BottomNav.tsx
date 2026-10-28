import React from 'react';
import { Search, Home as HomeIcon, Library as LibraryIcon } from 'lucide-react';
import { NavTab } from '../types/music';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isPlaying?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isPlaying,
}) => {
  return (
    /* Figma Node 12:10 "bottem navbar": pinned to bottom for mobile responsiveness */
    <div className="fixed sm:absolute bottom-4 sm:bottom-[39px] left-1/2 -translate-x-1/2 w-[342px] max-w-[calc(100%-32px)] h-[69px] rounded-[20px] bg-[#212121] shadow-figma-bottom-navbar flex items-center justify-between px-[28px] z-30">
      {/* Search Tab (Node 20:3): width: 33, height: 34 */}
      <button
        type="button"
        onClick={() => onTabChange('search')}
        className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
          activeTab === 'search' ? 'text-white' : 'text-[#999999] hover:text-[#E4E4E4]'
        }`}
        aria-label="Online Search"
      >
        <Search
          className={`w-[22px] h-[22px] ${
            activeTab === 'search' ? 'stroke-[2.2] scale-105' : 'stroke-[1.8]'
          }`}
        />
        <span className="font-roboto text-[12px] font-normal leading-none tracking-tight">
          Search
        </span>
      </button>

      {/* Home Tab (Node 20:10): width: 33, height: 36 */}
      <button
        type="button"
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center justify-center gap-1 cursor-pointer relative transition-colors ${
          activeTab === 'home' ? 'text-white' : 'text-[#999999] hover:text-[#E4E4E4]'
        }`}
        aria-label="Home"
      >
        <div className="relative">
          <HomeIcon
            className={`w-[24px] h-[24px] ${
              activeTab === 'home' ? 'stroke-[2.2] scale-105' : 'stroke-[1.8]'
            }`}
          />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <span className="font-roboto text-[12px] font-normal leading-none tracking-tight">
          Home
        </span>
      </button>

      {/* Library Tab (Node 20:4): width: 46, height: 36 */}
      <button
        type="button"
        onClick={() => onTabChange('library')}
        className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
          activeTab === 'library' ? 'text-white' : 'text-[#999999] hover:text-[#E4E4E4]'
        }`}
        aria-label="Library"
      >
        <LibraryIcon
          className={`w-[24px] h-[24px] ${
            activeTab === 'library' ? 'stroke-[2.2] scale-105' : 'stroke-[1.8]'
          }`}
        />
        <span className="font-roboto text-[12px] font-normal leading-none tracking-tight">
          Library
        </span>
      </button>
    </div>
  );
};
