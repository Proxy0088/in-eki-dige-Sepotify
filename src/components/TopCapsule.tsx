import React from 'react';
import { Radio } from 'lucide-react';
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
 * Dimensions: 236×48
 * Border radius: 36px
 * Background: #212121 with opacity 0.2
 * Neumorphic drop shadows: -17px -17px 34px #2B2B2B, 17px 17px 34px #171717
 * Material: Realistic WebGL Liquid Glass with specular catch-light and calm hover interaction
 * Children:
 *  - Home: Audex 400 20px (#999999) positioned 31px from left
 *  - People alt: Material Design 24×24 icon
 *  - Account circle: Material Design 24×24 icon positioned 31px from right
 */
export const TopCapsule: React.FC<TopCapsuleProps> = ({
  title,
  onProfileClick,
  onGroupClick,
  onLogoClick,
}) => {
  const handleProfileClick = () => {
    triggerHaptic('light');
    if (onProfileClick) onProfileClick();
  };

  const handleGroupClick = () => {
    triggerHaptic('light');
    if (onGroupClick) onGroupClick();
  };

  const handleLogoClick = () => {
    triggerHaptic('light');
    if (onLogoClick) onLogoClick();
  };

  return (
    <header
      aria-label="Application Top Header"
      className="fixed sm:absolute top-0 inset-x-0 pt-[max(env(safe-area-inset-top),14px)] px-3.5 sm:px-4 flex items-center justify-between z-30 select-none pointer-events-none"
    >
      {/* Brand logo badge on left */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleLogoClick}
          className="w-10 h-10 rounded-full lastwave-glass-dock flex items-center justify-center text-cyan-400 cursor-pointer active:scale-95 transition-transform shadow-md"
          title="Sepotify"
          aria-label="Sepotify Home"
        >
          <Radio className="w-4.5 h-4.5 stroke-[1.8]" />
        </button>
      </div>

      {/* Pixel-perfect Figma Liquid Glass Navbar on right (236px × 48px, radius 36px) */}
      <div className="pointer-events-auto">
        <div
          className="lastwave-glass-top-navbar relative w-[236px] h-[48px] rounded-[36px] flex items-center justify-between pl-[31px] pr-[31px] select-none transition-[box-shadow,border-color] duration-300"
        >
          {/* Interactive WebGL Liquid Glass Canvas with refraction & subtle sheen */}
          <LiquidGlassCanvas />

          {/* Top edge physical specular highlight catch-light */}
          <div
            className="absolute inset-x-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-full"
            style={{ zIndex: 2 }}
          />

          {/* Home / Current Screen Title */}
          <span className="relative z-10 font-audex text-[20px] font-normal leading-none text-[#999999] hover:text-[#ededed] transition-colors cursor-default">
            {title || 'Home'}
          </span>

          {/* Action icons: People alt & Account circle */}
          <div className="relative z-10 flex items-center gap-[31px]">
            {/* People alt (Friends / Group Listening) */}
            <button
              type="button"
              onClick={handleGroupClick}
              className="w-6 h-6 flex items-center justify-center text-[#999999] hover:text-[#ededed] active:scale-90 transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-full"
              aria-label="Friends and group listening"
              title="گوش دادن با رفیق‌ها"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M16.67 13.13C18.04 14.06 19 15.32 19 17v3h4v-3c0-2.18-3.57-3.47-6.33-3.87z" />
                <circle cx="9" cy="8" r="4" />
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4c-.47 0-.91.1-1.33.24C14.5 5.27 15 6.58 15 8s-.5 2.73-1.33 3.76c.42.14.86.24 1.33.24z" />
                <path d="M9 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </button>

            {/* Account circle (Profile & Settings) */}
            <button
              type="button"
              onClick={handleProfileClick}
              className="w-6 h-6 flex items-center justify-center text-[#999999] hover:text-[#ededed] active:scale-90 transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-full"
              aria-label="User profile and settings"
              title="پروفایل کاربری و تنظیمات"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
