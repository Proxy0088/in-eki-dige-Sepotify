export type NavTab = 'home' | 'search' | 'library';

export type ScreenState = 'home' | 'online_search' | 'library_main' | 'library_search' | 'device_library_search';

export type MoodType = 'Feels good' | 'Gaming' | 'Chill' | 'Focus';

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
  collection?: 'library 1' | 'library 2' | 'recents' | 'Downloads';
  audioSynthFrequency?: number; // fallback synth tone
}
