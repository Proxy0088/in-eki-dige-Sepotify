import React from 'react';
import { AppTheme } from '../types/music';

interface SettingScreenProps {
  isNationalNet: boolean;
  onToggleNationalNet: (enabled: boolean) => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const SettingScreen: React.FC<SettingScreenProps> = ({
  isNationalNet,
  onToggleNationalNet,
  theme,
  onThemeChange,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center px-5 pt-[max(calc(env(safe-area-inset-top,0px)+96px),108px)] sm:pt-[118px] pb-32 overflow-y-auto no-scrollbar select-none">
      {/* 
        Figma Node 133:108 "Setting list"
        Geometry & Shadows:
        - width: 370px, max-w-full
        - borderRadius: 30px
        - background: #212121
        - shadows: -15px -15px 100px 0px rgba(60,60,60,0.27), 15px 15px 30px 0px #191919
      */}
      <div className="w-full max-w-[370px] rounded-[30px] shadow-setting-list p-[13px] flex flex-col gap-[25px]">
        {/* ========================================================
            CARD 1: Node 133:133 "div.card" -> "IR net mode"
            ======================================================== */}
        <div className="w-full h-[102px] rounded-[30px] shadow-setting-card relative flex items-center justify-between px-[17px] transition-all">
          <div className="flex flex-col min-w-0 pr-3">
            {/* Node 133:109 "IR net mode": Audex 400 24px, #999999 */}
            <span className="font-audex text-[24px] font-normal leading-tight text-[#999999] tracking-tight truncate">
              IR net mode
            </span>
            {/* Node 134:167 "this is for iranian when the internet shuts down": Audex 400 12px, #999999 */}
            <span className="font-audex text-[12px] font-normal leading-[1.25] text-[#999999] tracking-tight mt-1 whitespace-pre-line opacity-90">
              {'this is for iranian \nwhen the internet shuts down '}
            </span>
          </div>

          {/* Node 133:130 "Label": Toggle Frame w: 71.5, h: 34, r: 50, border 2px #414141 */}
          <button
            type="button"
            role="switch"
            aria-checked={isNationalNet}
            onClick={() => onToggleNationalNet(!isNationalNet)}
            className={`w-[71.5px] h-[34px] rounded-[50px] border-2 transition-all duration-300 relative shrink-0 cursor-pointer p-[3px] flex items-center ${
              isNationalNet
                ? 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'border-[#414141] bg-transparent'
            }`}
          >
            {/* Node 133:131 "::before": Knob w: 23.8, h: 23.8, r: 50, bg #979797 */}
            <div
              className={`w-[23.8px] h-[23.8px] rounded-[50px] transition-transform duration-300 transform shadow-md ${
                isNationalNet
                  ? 'translate-x-[36px] bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'translate-x-[2px] bg-[#979797]'
              }`}
            />
          </button>
        </div>

        {/* ========================================================
            CARD 2: Node 133:135 "div.card" -> "language"
            ======================================================== */}
        <div className="w-full h-[102px] rounded-[30px] shadow-setting-card relative flex items-center justify-between px-[15px] transition-all">
          <div className="flex flex-col min-w-0 pr-3">
            {/* Node 133:136 "language": Audex 400 24px, #999999 */}
            <span className="font-audex text-[24px] font-normal leading-tight text-[#999999] tracking-tight">
              language
            </span>
          </div>

          {/* 
            Node 134:161 "div.card": Dropdown container w: 159, h: 42, r: 30, bg #212121
            User requirement: "گذینه زبان رو کلا غیر فعال کن . گذینه اش باشه ها ولی هیچ کاری انجام نده"
          */}
          <div
            className="w-[159px] h-[42px] rounded-[30px] shadow-setting-dropdown flex items-center justify-between px-5 select-none cursor-default shrink-0 opacity-80"
            title="Language selector (Fixed to English)"
          >
            {/* Node 134:166 "En": Audex 400 20px, #999999 */}
            <span className="font-audex text-[20px] font-normal text-[#999999] leading-none">
              En
            </span>

            {/* Node 134:163 "icon-park-outline:left": rotated -90deg (downward arrow) */}
            <svg
              width="25"
              height="25"
              viewBox="0 0 25 25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="rotate-[-90deg] shrink-0"
            >
              {/* Node 134:164 Vector: 6.25 x 12.5 */}
              <path
                d="M15.5 6.25L9.25 12.5L15.5 18.75"
                stroke="#999999"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* ========================================================
            CARD 3: Node 133:139 "div.card" -> "Light mode"
            ======================================================== */}
        <div className="w-full h-[102px] rounded-[30px] shadow-setting-card relative flex items-center justify-between px-[15px] transition-all">
          <div className="flex flex-col min-w-0 pr-3">
            {/* Node 133:140 "Light mode": Audex 400 24px, #999999 */}
            <span className="font-audex text-[24px] font-normal leading-tight text-[#999999] tracking-tight">
              Light mode
            </span>
          </div>

          {/* Node 133:141 "Label": Toggle Frame w: 71.5, h: 34, r: 50, border 2px #414141 */}
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
            className={`w-[71.5px] h-[34px] rounded-[50px] border-2 transition-all duration-300 relative shrink-0 cursor-pointer p-[3px] flex items-center ${
              theme === 'light'
                ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'border-[#414141] bg-transparent'
            }`}
          >
            {/* Node 133:142 "::before": Knob w: 23.8, h: 23.8, r: 50, bg #979797 */}
            <div
              className={`w-[23.8px] h-[23.8px] rounded-[50px] transition-transform duration-300 transform shadow-md ${
                theme === 'light'
                  ? 'translate-x-[36px] bg-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                  : 'translate-x-[2px] bg-[#979797]'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
