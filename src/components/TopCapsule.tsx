import React from 'react';
import { Users, User, Radio } from 'lucide-react';

interface TopCapsuleProps {
  title: string;
  onProfileClick?: () => void;
  onGroupClick?: () => void;
}

export const TopCapsule: React.FC<TopCapsuleProps> = ({
  title,
  onProfileClick,
  onGroupClick,
}) => {
  return (
    <header
      aria-label="App Top Navigation"
      className="absolute top-0 left-0 right-0 h-[64px] sm:h-[72px] px-5 sm:px-6 flex items-center justify-between z-30 select-none pointer-events-auto bg-gradient-to-b from-[#0a0b0e]/90 via-[#0a0b0e]/50 to-transparent backdrop-blur-md"
    >
      {/* Brand title on left matching LastWave ExpressiveHeader */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-[0_2px_12px_rgba(14,165,233,0.35)]">
          <Radio className="w-4 h-4 text-white stroke-[2.2]" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans text-[20px] sm:text-[22px] font-black tracking-tight text-white leading-none">
            Sepotify
          </span>
          <span className="text-[10px] font-medium text-white/50 tracking-wider uppercase mt-0.5">
            {title || 'LastWave'}
          </span>
        </div>
      </div>

      {/* Action buttons on right: Group/Friends & Profile avatar */}
      <div className="flex items-center gap-2.5">
        {/* Listen with Friends button */}
        <button
          type="button"
          onClick={onGroupClick}
          className="w-10 h-10 rounded-full lastwave-glass-pill flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all"
          aria-label="Friends and group"
          title="گوش دادن با رفیق‌ها"
        >
          <Users className="w-[18px] h-[18px] stroke-[1.8]" />
        </button>

        {/* Profile Avatar circle */}
        <button
          type="button"
          onClick={onProfileClick}
          className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 hover:brightness-110 active:scale-90 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.35)] cursor-pointer"
          aria-label="User profile"
          title="پروفایل کاربری و تنظیمات"
        >
          <div className="w-full h-full rounded-full bg-[#13151d] flex items-center justify-center overflow-hidden">
            <User className="w-[18px] h-[18px] text-white/90 stroke-[2]" />
          </div>
        </button>
      </div>
    </header>
  );
};
