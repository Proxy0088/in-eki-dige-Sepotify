import React from 'react';
import { Search, Home as HomeIcon, Library as LibraryIcon } from 'lucide-react';
import { NavTab, AppLanguage } from '../types/music';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isPlaying?: boolean;
  language?: AppLanguage;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isPlaying,
  language = 'en',
}) => {
  const tabs: Array<{ id: NavTab; labelEn: string; labelFa: string; icon: React.ReactNode }> = [
    {
      id: 'home',
      labelEn: 'Home',
      labelFa: 'خانه',
      icon: (
        <div className="relative">
          <HomeIcon className="w-5 h-5 stroke-[2]" />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse" />
          )}
        </div>
      ),
    },
    {
      id: 'search',
      labelEn: 'Search',
      labelFa: 'جست‌وجو',
      icon: <Search className="w-5 h-5 stroke-[2]" />,
    },
    {
      id: 'library',
      labelEn: 'Playlists',
      labelFa: 'پلی‌لیست',
      icon: <LibraryIcon className="w-5 h-5 stroke-[2]" />,
    },
  ];

  return (
    <nav
      aria-label="Floating Navigation Bar"
      className="fixed sm:absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto"
    >
      {/* LastWave Floating Dock Container (DockShape: RoundedCornerShape(32.dp)) */}
      <div className="lastwave-glass-dock rounded-full p-1.5 flex items-center gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const label = language === 'fa' ? tab.labelFa : tab.labelEn;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                isActive
                  ? 'lastwave-glass-active rounded-full px-4 py-2 text-white font-semibold gap-2 shadow-md'
                  : 'w-11 h-10 rounded-full text-white/55 hover:text-white/90 hover:bg-white/10'
              }`}
              aria-label={label}
            >
              {tab.icon}
              {isActive && (
                <span className="text-xs tracking-tight font-medium whitespace-nowrap animate-in fade-in duration-200">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
