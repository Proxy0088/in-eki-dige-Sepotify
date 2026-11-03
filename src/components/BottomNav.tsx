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
          <HomeIcon className="w-[18px] h-[18px] stroke-[1.8]" />
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          )}
        </div>
      ),
    },
    {
      id: 'search',
      labelEn: 'Search',
      labelFa: 'جست‌وجو',
      icon: <Search className="w-[18px] h-[18px] stroke-[1.8]" />,
    },
    {
      id: 'library',
      labelEn: 'Playlists',
      labelFa: 'پلی‌لیست',
      icon: <LibraryIcon className="w-[18px] h-[18px] stroke-[1.8]" />,
    },
  ];

  return (
    <nav
      aria-label="Floating Navigation Bar"
      className="fixed sm:absolute bottom-5 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto"
    >
      <div className="lastwave-glass-dock rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const label = language === 'fa' ? tab.labelFa : tab.labelEn;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center transition-[color,background-color,transform] duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'lastwave-glass-active rounded-full px-3.5 py-1.5 text-[#ededed] font-medium gap-2 shadow-sm'
                  : 'w-10 h-9 rounded-full text-[#a1a1a6] hover:text-[#ededed] hover:bg-white/[0.06]'
              }`}
              aria-label={label}
            >
              {tab.icon}
              {isActive && (
                <span className="text-xs tracking-tight font-medium whitespace-nowrap">
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
