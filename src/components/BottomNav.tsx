import React from 'react';
import { motion } from 'motion/react';
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
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
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
      {/* 
        Native Apple Liquid Glass Floating Tab Bar (Philipp Lackner / iOS Architecture)
        Clean optical backdrop blur + saturation boost + physical glass inset bevel
      */}
      <div className="lastwave-glass-dock relative rounded-full p-1.5 flex items-center gap-1.5 shadow-2xl transition-[box-shadow,border-color,background] duration-300">
        {/* Top-edge optical specular catch-light */}
        <div
          className="absolute inset-x-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full"
          aria-hidden="true"
        />

        {/* Ambient top-down glass meniscus sheen */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Tab Buttons */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const label = language === 'fa' ? tab.labelFa : tab.labelEn;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative z-10 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isActive
                  ? 'rounded-full px-3.5 py-1.5 text-white font-medium gap-2 shadow-sm'
                  : 'w-10 h-9 rounded-full text-[#9ca3af] hover:text-[#ededed] hover:bg-white/[0.05]'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Native Apple Liquid Glass Active Pill with fluid spring animation */}
              {isActive && (
                <motion.div
                  layoutId="native-liquid-pill"
                  className="absolute inset-0 rounded-full overflow-hidden pointer-events-none lastwave-glass-active"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 30,
                    mass: 0.8,
                  }}
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    boxShadow:
                      'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.15), 0 4px 14px rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Internal meniscus specular reflection */}
                  <div className="absolute inset-x-2 top-0.5 h-1 rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                </motion.div>
              )}

              {/* Icon */}
              <span className="relative z-10 flex items-center justify-center transition-transform duration-150">
                {tab.icon}
              </span>

              {/* Animated Label */}
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.92, x: -3 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, x: -3 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="relative z-10 text-xs tracking-tight font-medium whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
