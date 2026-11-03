import React from 'react';
import { Shield, Globe, Sun, Moon, Radio } from 'lucide-react';
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
    <div className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-24 sm:pt-28 pb-32 overflow-y-auto no-scrollbar select-none animate-screen-enter">
      <div className="w-full max-w-[384px] flex flex-col gap-3">
        {/* Header Title */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#ededed] tracking-tight">Settings</h1>
            <span className="text-xs text-[#a1a1a6] font-normal">Preferences and streaming</span>
          </div>
          <span className="text-xs font-mono font-normal text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full tabular-nums">
            v2.4
          </span>
        </div>

        {/* ── CARD 1: IR Net Mode ── */}
        <div className="w-full rounded-2xl bg-[#12141c] border border-white/[0.06] p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isNationalNet
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.04] border-white/10 text-[#a1a1a6]'
            }`}>
              <Shield className="w-4 h-4 stroke-[1.8]" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#ededed] tracking-tight">
                IR Net Shield
              </span>
              <span className="text-xs text-[#71717a] leading-relaxed mt-0.5">
                Stream via domestic servers (musicdel.ir) without VPN
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isNationalNet}
            onClick={() => onToggleNationalNet(!isNationalNet)}
            className={`w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 cursor-pointer p-0.5 flex items-center ${
              isNationalNet ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isNationalNet ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* ── CARD 2: Language ── */}
        <div className="w-full rounded-2xl bg-[#12141c] border border-white/[0.06] p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 stroke-[1.8]" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#ededed] tracking-tight">
                Language
              </span>
              <span className="text-xs text-[#71717a] mt-0.5">
                Default interface language
              </span>
            </div>
          </div>

          <div className="lastwave-glass-pill px-3 py-1 rounded-full text-xs font-normal text-[#ededed]">
            English
          </div>
        </div>

        {/* ── CARD 3: Theme Toggle ── */}
        <div className="w-full rounded-2xl bg-[#12141c] border border-white/[0.06] p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-amber-400 flex items-center justify-center shrink-0">
              {theme === 'light' ? (
                <Sun className="w-4 h-4 stroke-[1.8]" />
              ) : (
                <Moon className="w-4 h-4 stroke-[1.8]" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#ededed] tracking-tight">
                Theme
              </span>
              <span className="text-xs text-[#71717a] mt-0.5">
                {theme === 'light' ? 'Light mode (Clean frost)' : 'Dark mode (OLED)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
            className={`w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 cursor-pointer p-0.5 flex items-center ${
              theme === 'light' ? 'bg-amber-400' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                theme === 'light' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* ── App Info Card ── */}
        <div className="w-full rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col gap-1.5 mt-2">
          <div className="flex items-center gap-2 text-[#a1a1a6]">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-[#ededed]">Sepotify x LastWave</span>
          </div>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            High-fidelity audio streaming client inspired by LastWave Native with Liquid Glass materials and verified YouTube Music streaming.
          </p>
        </div>
      </div>
    </div>
  );
};
