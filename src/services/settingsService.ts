import { AppLanguage, AppTheme } from '../types/music';

export interface AppSettings {
  isNationalNet: boolean;
  language: AppLanguage;
  theme: AppTheme;
}

const SETTINGS_KEY = 'sepotify_app_settings_v3';

const DEFAULT_SETTINGS: AppSettings = {
  isNationalNet: false, // Standard Online Meld/YouTube Music streaming by default
  language: 'en', // Default to English as explicitly requested by user
  theme: 'dark',
};

export const SettingsService = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          isNationalNet: Boolean(parsed.isNationalNet),
          language: parsed.language === 'fa' ? 'fa' : 'en',
          theme: parsed.theme === 'light' ? 'light' : 'dark',
        };
      }
    } catch (e) {
      console.warn('Failed to read settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  },

  applyTheme(theme: AppTheme): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      }
    }
  },

  applyLanguage(language: AppLanguage): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('lang', language);
      root.setAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
      if (language === 'fa') {
        root.classList.add('lang-fa');
        root.classList.remove('lang-en');
      } else {
        root.classList.add('lang-en');
        root.classList.remove('lang-fa');
      }
    }
  },
};
