import React from 'react';

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
    <nav
      aria-label="Top Navigation"
      className="absolute right-5 sm:right-[27px] top-[max(calc(env(safe-area-inset-top,0px)+16px),24px)] sm:top-[45px] w-[236px] h-[48px] rounded-[36px] bg-[#212121]/90 backdrop-blur-md shrink-0 select-none z-30 pointer-events-auto shadow-figma-top-navbar"
    >
      {/* Home (28:57): x: 31, y: 12, w: 55, h: 24 - Audex 400 20px */}
      <span
        className="absolute left-[31px] top-[12px] h-[24px] flex items-center font-audex text-[20px] font-normal tracking-tight text-[#999999] leading-none select-none pointer-events-none"
      >
        {title || 'Home'}
      </span>

      {/* People alt (28:59): x: 126, y: 12, w: 24, h: 24 */}
      <button
        type="button"
        onClick={onGroupClick}
        className="absolute left-[126px] top-[12px] w-[24px] h-[24px] flex items-center justify-center text-[#999999] hover:text-white transition-colors cursor-pointer"
        aria-label="Friends and group"
        title="گروه و دوستان"
      >
        <svg
          className="w-[22px] h-[22px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Main user */}
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          {/* Second user behind */}
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </button>

      {/* Account circle (28:78): x: 181, y: 12, w: 24, h: 24 */}
      <button
        type="button"
        onClick={onProfileClick}
        className="absolute left-[181px] top-[12px] w-[24px] h-[24px] flex items-center justify-center text-[#999999] hover:text-white transition-colors cursor-pointer"
        aria-label="User profile"
        title="پروفایل کاربری"
      >
        <svg
          className="w-[22px] h-[22px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
        </svg>
      </button>
    </nav>
  );
};
