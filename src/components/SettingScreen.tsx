import React from 'react';
import { Shield, Globe, Sun, Moon, Info, Radio, Sparkles } from 'lucide-react';
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
    <div className="flex-1 flex flex-col items-center px-4 sm:px-5 pt-[72px] sm:pt-[80px] pb-32 overflow-y-auto no-scrollbar select-none">
      <div className="w-full max-w-[390px] flex flex-col gap-3.5">
        {/* Header Title */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
            <span className="text-xs text-white/50 font-medium">Preferences & network</span>
          </div>
          <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full">
            v2.4
          </span>
        </div>

        {/* ── CARD 1: IR Net Mode (National Net Shield) ── */}
        <div className="w-full rounded-[24px] bg-[#14151c] border border-white/5 p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 border ${
              isNationalNet
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-white/5 border-white/10 text-white/60'
            }`}>
              <Shield className="w-5 h-5 stroke-[2]" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight">
                IR Net Shield
              </span>
              <span className="text-xs text-white/50 leading-relaxed mt-0.5">
                Stream via domestic servers (musicdel.ir) without VPN
              </span>
            </div>
          </div>

          {/* iOS-style toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isNationalNet}
            onClick={() => onToggleNationalNet(!isNationalNet)}
            className={`w-12 h-7 rounded-full transition-colors duration-300 relative shrink-0 cursor-pointer p-0.5 flex items-center ${
              isNationalNet
                ? 'bg-emerald-500'
                : 'bg-white/20'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                isNationalNet ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* ── CARD 2: Language ── */}
        <div className="w-full rounded-[24px] bg-[#14151c] border border-white/5 p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-[16px] bg-white/5 border border-white/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 stroke-[2]" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight">
                Language
              </span>
              <span className="text-xs text-white/50 mt-0.5">
                Default display language
              </span>
            </div>
          </div>

          {/* En fixed badge (per user specification) */}
          <div className="lastwave-glass-pill px-3 py-1.5 rounded-full text-xs font-bold text-white/80">
            English
          </div>
        </div>

        {/* ── CARD 3: Theme Toggle ── */}
        <div className="w-full rounded-[24px] bg-[#14151c] border border-white/5 p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-[16px] bg-white/5 border border-white/10 text-amber-400 flex items-center justify-center shrink-0">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 stroke-[2]" />
              ) : (
                <Moon className="w-5 h-5 stroke-[2]" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight">
                Theme
              </span>
              <span className="text-xs text-white/50 mt-0.5">
                {theme === 'light' ? 'Light Theme (Clean Frost)' : 'Dark Theme (OLED Black)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
            className={`w-12 h-7 rounded-full transition-colors duration-300 relative shrink-0 cursor-pointer p-0.5 flex items-center ${
              theme === 'light'
                ? 'bg-amber-400'
                : 'bg-white/20'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                theme === 'light' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* ── App Info Card ── */}
        <div className="w-full rounded-[24px] bg-[#14151c]/60 border border-white/5 p-4 flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2 text-white/70">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">Sepotify x LastWave Native</span>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            High-fidelity audio streaming client inspired by LastWave Native with Liquid Glass materials and verified YouTube Music streaming.
          </p>
        </div>
      </div>
    </div>
  );
};
