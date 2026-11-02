export type NavTab = 'home' | 'search' | 'library';

export type ScreenState = 'home' | 'online_search' | 'library_main' | 'library_search' | 'device_library_search' | 'player' | 'setting';

export type MoodType = 'Feels good' | 'Gaming' | 'Chill' | 'Focus';

export type AppLanguage = 'fa' | 'en';
export type AppTheme = 'dark' | 'light';

export interface AppSettings {
  isNationalNet: boolean;
  language: AppLanguage;
  theme: AppTheme;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url: string;
  mood: MoodType;
  coverColor?: string;
  coverUrl?: string;
  isLiked?: boolean;
  isDownloaded?: boolean;
  collection?: string;
  dateAdded?: number; // timestamp in seconds
  audioSynthFrequency?: number; // fallback synth tone
  audiusId?: string;
  isAudius?: boolean;
  isNationalNet?: boolean;
  isFullLength?: boolean;
  isStreamable?: boolean;
  isDownloadable?: boolean;
  downloadUrl?: string;
}
