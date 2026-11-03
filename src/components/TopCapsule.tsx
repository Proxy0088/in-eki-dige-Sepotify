import React from 'react';
import { LiquidGlassCanvas } from './LiquidGlassCanvas';
import { triggerHaptic } from '../utils/haptics';

interface TopCapsuleProps {
  title: string;
  onProfileClick?: () => void;
  onGroupClick?: () => void;
  onLogoClick?: () => void;
}

/**
 * Pixel-perfect Figma Rebuild: Navbar
 * Geometry & Tokens from spec:
 *  - Target size: 430×129 viewport (visible dock height 68px, radius 36px)
 *  - Background: Exactly like bottom navbar (.lastwave-glass-dock, no heavy drop shadows)
 *  - Typography: Audex 400 36px (#999999)
 *  - Account circle: 37px × 37px frame with 30.83 × 30.83 vector
 *  - Material: Liquid Glass WebGL shader with top catch-light line and translucent blur
 */
export const TopCapsule: React.FC<TopCapsuleProps> = ({
  title,
  onProfileClick,
}) => {
  const handleProfileClick = () => {
    triggerHaptic('light');
    if (onProfileClick) onProfileClick();
  };

  return (
    <header
      aria-label="Application Top Header"
      className="fixed sm:absolute top-[max(env(safe-area-inset-top),14px)] left-3.5 right-3.5 sm:left-4 sm:right-4 z-30 max-w-[400px] mx-auto select-none pointer-events-auto"
    >
      <div
        className="lastwave-glass-dock relative w-full h-[66px] sm:h-[68px] rounded-[36px] px-6 sm:px-8 flex items-center justify-between shadow-xl transition-[box-shadow,border-color] duration-300 overflow-hidden"
      >
        {/* Interactive WebGL Liquid Glass Canvas with refraction & subtle sheen (same as bottom nav) */}
        <LiquidGlassCanvas />

        {/* Top edge physical specular highlight catch-light */}
        <div
          className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full"
          style={{ zIndex: 2 }}
        />

        {/* Home / Current Screen Title - Audex 400 36px */}
        <span className="relative z-10 font-audex text-[30px] sm:text-[36px] font-normal leading-none text-[#999999] hover:text-[#ededed] transition-colors cursor-default select-none tracking-tight">
          {title || 'Home'}
        </span>

        {/* Account circle - 37px × 37px with 30.83 × 30.83 vector */}
        <button
          type="button"
          onClick={handleProfileClick}
          className="relative z-10 w-[37px] h-[37px] flex items-center justify-center text-[#999999] hover:text-[#ededed] active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-full"
          aria-label="User profile and settings"
          title="پروفایل کاربری و تنظیمات"
        >
          <svg viewBox="0 0 24 24" width="31" height="31" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
