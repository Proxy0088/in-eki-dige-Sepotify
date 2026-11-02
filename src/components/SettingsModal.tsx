import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Languages,
  Sun,
  Moon,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';
import { AppLanguage, AppTheme } from '../types/music';
import { getTranslation } from '../services/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNationalNet: boolean;
  onToggleNationalNet: (enabled: boolean) => void;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isNationalNet,
  onToggleNationalNet,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}) => {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsLangDropdownOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const isRtl = language === 'fa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 
        Neumorphic Liquid Glass Container 
        Strictly preserves project's specular refraction design system
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[370px] rounded-[38px] p-6 transition-all duration-300 max-h-[90vh] overflow-y-auto no-scrollbar"
        style={{
          background:
            theme === 'light'
              ? 'rgba(255, 255, 255, 0.92)'
              : 'radial-gradient(130% 110% at 50% 0%, rgba(42, 42, 42, 0.92) 0%, rgba(26, 26, 26, 0.96) 50%, rgba(18, 18, 18, 0.99) 100%)',
          backdropFilter: 'blur(35px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(35px) saturate(190%) contrast(105%)',
          border:
            theme === 'light'
              ? '1px solid rgba(255, 255, 255, 0.8)'
              : '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow:
            theme === 'light'
              ? '0 25px 50px -12px rgba(100, 116, 139, 0.35), inset 0 1.5px 2px rgba(255, 255, 255, 0.95), -8px -8px 20px #ffffff, 8px 8px 20px #cbd5e1'
              : '0 30px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1.5px 2px rgba(255, 255, 255, 0.35), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Top specular liquid reflection edge */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Close Button: Glass Pill */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-5 ${
            isRtl ? 'left-5' : 'right-5'
          } w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer z-10 active:scale-95 shadow-xs`}
          aria-label={t('close')}
        >
          <X className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Header Title with Settings Icon */}
        <div className="flex items-center gap-2.5 mb-5 select-none">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background:
                theme === 'light'
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <SettingsIcon className="w-5 h-5 text-white/90 stroke-[2] animate-spin-slow" />
          </div>
          <div>
            <h2 className="font-audex text-[19px] font-bold text-white leading-tight">
              {t('settingsTitle')}
            </h2>
            <p className="text-[11px] text-white/60 leading-tight mt-0.5">
              {t('settingsSubtitle')}
            </p>
          </div>
        </div>

        {/* Settings Options List */}
        <div className="flex flex-col gap-3.5">
          {/* OPTION 1: نت ملی برای اپلیکیشن (National Intranet Shield) */}
          <div
            className={`p-3.5 rounded-[24px] border transition-all duration-200 ${
              isNationalNet
                ? 'bg-emerald-950/25 border-emerald-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isNationalNet
                      ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  {isNationalNet ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 stroke-[2]" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-white/60 stroke-[1.8]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-semibold text-white">
                      {t('nationalNetOption')}
                    </span>
                    {isNationalNet && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/50 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                        {t('active')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed mt-1">
                    {t('nationalNetOptionDesc')}
                  </p>
                </div>
              </div>

              {/* Neumorphic Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isNationalNet}
                onClick={() => onToggleNationalNet(!isNationalNet)}
                className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 shrink-0 cursor-pointer p-0.5 border ${
                  isNationalNet
                    ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'bg-black/40 border-white/15'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    isNationalNet
                      ? isRtl
                        ? '-translate-x-[22px]'
                        : 'translate-x-[22px]'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* OPTION 2: زبان برنامه (App Language Dropdown List) */}
          <div className="p-3.5 rounded-[24px] bg-white/5 border border-white/10 relative">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white/70 border border-white/10 flex items-center justify-center shrink-0">
                  <Languages className="w-5 h-5 text-white/80 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-white">
                    {t('languageOption')}
                  </span>
                  <p className="text-[10px] text-white/60 leading-tight">
                    {t('languageOptionDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Dropdown Selector Button */}
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                className="w-full py-2 px-3 rounded-2xl bg-black/30 hover:bg-black/40 border border-white/15 flex items-center justify-between text-xs text-white font-medium transition-all cursor-pointer active:scale-[0.99] shadow-inner"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {language === 'fa' ? '🇮🇷' : '🇬🇧'}
                  </span>
                  <span>{language === 'fa' ? t('langFa') : t('langEn')}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
                    isLangDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Options Popup */}
              {isLangDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 inset-x-0 rounded-2xl bg-[#1f2024]/95 border border-white/20 p-1.5 z-30 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onLanguageChange('fa');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      language === 'fa'
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇮🇷</span>
                      <span>فارسی (Persian)</span>
                    </div>
                    {language === 'fa' && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLanguageChange('en');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors mt-0.5 ${
                      language === 'en'
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇬🇧</span>
                      <span>English (انگلیسی)</span>
                    </div>
                    {language === 'en' && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* OPTION 3: لایت مود (Light Mode Toggle) */}
          <div
            className={`p-3.5 rounded-[24px] border transition-all duration-200 ${
              theme === 'light'
                ? 'bg-amber-950/20 border-amber-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    theme === 'light'
                      ? 'bg-amber-500/25 text-amber-400 border border-amber-500/40'
                      : 'bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-amber-400 stroke-[2] animate-spin-slow" />
                  ) : (
                    <Moon className="w-5 h-5 text-white/60 stroke-[1.8]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-semibold text-white">
                      {t('lightModeOption')}
                    </span>
                    {theme === 'light' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-900/50 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                        {t('active')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed mt-1">
                    {t('lightModeOptionDesc')}
                  </p>
                </div>
              </div>

              {/* Neumorphic Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={theme === 'light'}
                onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 shrink-0 cursor-pointer p-0.5 border ${
                  theme === 'light'
                    ? 'bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-black/40 border-white/15'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    theme === 'light'
                      ? isRtl
                        ? '-translate-x-[22px]'
                        : 'translate-x-[22px]'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info tag */}
        <div className="mt-5 text-center">
          <p className="text-[10px] text-white/40 tracking-wider">
            Sepotify v2.4 • Neumorphic Engine
          </p>
        </div>
      </div>
    </div>
  );
};
