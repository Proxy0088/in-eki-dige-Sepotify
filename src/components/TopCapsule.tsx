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
      aria-label="Application Top Header"
      className="absolute top-0 left-0 right-0 h-15 px-4 sm:px-6 flex items-center justify-between z-30 select-none pointer-events-auto bg-[#090a0f]/80 backdrop-blur-md border-b border-white/[0.04]"
    >
      {/* Brand logo & screen context */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-cyan-400 shadow-sm">
          <Radio className="w-4 h-4 stroke-[1.8]" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight text-[#ededed] leading-none">
            Sepotify
          </span>
          <span className="text-[11px] font-medium text-[#a1a1a6] mt-1 leading-none">
            {title || 'Player'}
          </span>
        </div>
      </div>

      {/* Action buttons on right */}
      <div className="flex items-center gap-2">
        {/* Listen with Friends */}
        <button
          type="button"
          onClick={onGroupClick}
          className="w-9 h-9 rounded-full lastwave-glass-pill flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] cursor-pointer active:scale-95 transition-transform"
          aria-label="Friends and group listening"
          title="گوش دادن با رفیق‌ها"
        >
          <Users className="w-4 h-4 stroke-[1.8]" />
        </button>

        {/* Profile and Settings */}
        <button
          type="button"
          onClick={onProfileClick}
          className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-[#ededed] cursor-pointer active:scale-95 transition-transform shadow-sm"
          aria-label="User profile and settings"
          title="پروفایل کاربری و تنظیمات"
        >
          <User className="w-4 h-4 stroke-[1.8]" />
        </button>
      </div>
    </header>
  );
};
