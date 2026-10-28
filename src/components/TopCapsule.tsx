import React from 'react';
import { Users, User, Smartphone } from 'lucide-react';

interface TopCapsuleProps {
  title: string;
  onProfileClick?: () => void;
  onGroupClick?: () => void;
  onMobileClick?: () => void;
}

export const TopCapsule: React.FC<TopCapsuleProps> = ({
  title,
  onProfileClick,
  onGroupClick,
  onMobileClick,
}) => {
  return (
    <div className="w-full flex justify-end pr-[27px] pt-[45px] pb-3">
      {/* Navbar Rectangle 5: 236px x 48px, rounded-[36px], #212121 with exact Figma shadows */}
      <div className="w-[236px] h-[48px] rounded-[36px] shadow-figma-top-navbar flex items-center justify-between px-5">
        {/* Title: Audex 20px, #999999 */}
        <span className="font-audex text-[20px] font-normal tracking-tight text-[#999999] select-none">
          {title}
        </span>

        {/* Icons: 24x24, #999999 */}
        <div className="flex items-center gap-[14px] text-[#999999]">
          <button
            type="button"
            onClick={onMobileClick}
            className="w-6 h-6 flex items-center justify-center hover:text-white transition-colors cursor-pointer"
            title="نصب و تست در گوشی"
            aria-label="Install on mobile"
          >
            <Smartphone className="w-4 h-4 stroke-[1.8]" />
          </button>
          <button
            type="button"
            onClick={onGroupClick}
            className="w-6 h-6 flex items-center justify-center hover:text-white transition-colors cursor-pointer"
            aria-label="Friends and group"
          >
            <Users className="w-4 h-4 stroke-[1.8]" />
          </button>
          <button
            type="button"
            onClick={onProfileClick}
            className="w-6 h-6 flex items-center justify-center hover:text-white transition-colors cursor-pointer"
            aria-label="User profile"
          >
            <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center p-0.5">
              <User className="w-3 h-3 stroke-[2]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

