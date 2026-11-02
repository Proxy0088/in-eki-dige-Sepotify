import { AppLanguage } from '../types/music';

export const translations = {
  fa: {
    // Nav tabs
    home: 'خانه',
    search: 'جست‌وجو',
    library: 'کتابخانه',

    // Top Capsule & Headers
    recents: 'اخیر',
    onlineSearch: 'جست‌وجوی آنلاین',
    deviceAudio: 'آهنگ‌های گوشی',
    libraryMain: 'کتابخانه‌ها',
    nationalNetShield: 'سپر نت ملی',
    nationalNetActiveBadge: 'سپر اینترنت ملی فعال است (پخش بدون فیلترشکن)',
    nationalNetDisabledBadge: 'اینترنت بین‌الملل (YouTube Music)',

    // Search screen
    searchPlaceholderOnline: 'جست‌وجوی آنلاین نام آهنگ یا خواننده...',
    searchPlaceholderLocal: 'جست‌وجو در آهنگ‌های دانلودشده و حافظه گوشی...',
    searchPlaceholderIran: 'جست‌وجو در سایت‌های ایرانی (بدون فیلترشکن)...',
    searching: 'در حال جست‌وجو...',
    noResults: 'هیچ آهنگی یافت نشد',
    audiusSource: 'منبع: YouTube Music Original',
    iranSource: 'منبع: سرورهای داخلی ایران (نت ملی)',
    downloadedFolder: 'پوشه دانلودها و فایل‌های محلی',

    // Settings
    settings: 'تنظیمات',
    settingsTitle: 'تنظیمات اپلیکیشن',
    settingsSubtitle: 'سفارشی‌سازی حالت شبکه، زبان و ظاهر برنامه',
    nationalNetOption: 'نت ملی برای اپلیکیشن',
    nationalNetOptionDesc: 'در شرایط قطعی اینترنت بین‌الملل، جست‌وجو و پخش آهنگ‌ها از سایت‌ها و سرورهای داخلی ایران انجام می‌شود.',
    languageOption: 'زبان برنامه',
    languageOptionDesc: 'انتخاب زبان رابط کاربری نرم‌افزار',
    langFa: 'فارسی',
    langEn: 'English',
    lightModeOption: 'حالت روشن (لایت مود)',
    lightModeOptionDesc: 'تبدیل تم، پس‌زمینه‌ها و دراپ‌شدWindowهای نئومورفیک از حالت شب به روز.',
    active: 'فعال',
    inactive: 'غیرفعال',
    close: 'بستن',

    // Social modal
    account: 'اکانت',
    friends: 'رفیق‌ها',
    mobileApp: 'نسخه گوشی',
    syncCode: 'کد همگام‌سازی',
    copied: 'کپی شد!',
    copyLink: 'کپی لینک اشتراک',
    likedSongs: 'آهنگ‌های موردعلاقه',
    savedTracks: 'ترک‌های ذخیره‌شده',

    // Player
    nowPlaying: 'در حال پخش',
    nextTrack: 'آهنگ بعدی',
    savedToLibrary: 'ذخیره در کتابخانه',
    saveLibraryPrompt: 'کدام کتابخانه را برای ذخیره انتخاب می‌کنید؟',
  },
  en: {
    // Nav tabs
    home: 'Home',
    search: 'Search',
    library: 'Library',

    // Top Capsule & Headers
    recents: 'recents',
    onlineSearch: 'Online Search',
    deviceAudio: 'Device Audio',
    libraryMain: 'Libraries',
    nationalNetShield: 'National Shield',
    nationalNetActiveBadge: 'National Net Shield Active (No VPN required)',
    nationalNetDisabledBadge: 'Global Network (YouTube Music)',

    // Search screen
    searchPlaceholderOnline: 'Search online track or artist...',
    searchPlaceholderLocal: 'Search downloaded & device audio...',
    searchPlaceholderIran: 'Search Iranian music sites (No VPN)...',
    searching: 'Searching...',
    noResults: 'No tracks found',
    audiusSource: 'Source: YouTube Music Original',
    iranSource: 'Source: Iranian National Servers',
    downloadedFolder: 'Downloads & Local Audio',

    // Settings
    settings: 'Settings',
    settingsTitle: 'Application Settings',
    settingsSubtitle: 'Customize network fallback, language and theme',
    nationalNetOption: 'National Intranet Mode',
    nationalNetOptionDesc: 'Search and stream tracks from Iranian internal servers without needing a VPN during international network outages.',
    languageOption: 'App Language',
    languageOptionDesc: 'Choose interface display language',
    langFa: 'فارسی (Persian)',
    langEn: 'English',
    lightModeOption: 'Light Mode',
    lightModeOptionDesc: 'Switch all neumorphic drop-shadows and colors from dark to sleek light mode.',
    active: 'Active',
    inactive: 'Inactive',
    close: 'Close',

    // Social modal
    account: 'Account',
    friends: 'Friends',
    mobileApp: 'Mobile App',
    syncCode: 'Sync Code',
    copied: 'Copied!',
    copyLink: 'Copy Share Link',
    likedSongs: 'Liked Songs',
    savedTracks: 'Saved Tracks',

    // Player
    nowPlaying: 'Now Playing',
    nextTrack: 'Next track',
    savedToLibrary: 'Save to library',
    saveLibraryPrompt: 'Which library do you want to save to?',
  },
} as const;

export type TranslationKey = keyof typeof translations.fa;

export function getTranslation(lang: AppLanguage, key: TranslationKey): string {
  const dict = translations[lang] || translations.fa;
  return dict[key] || translations.fa[key] || key;
}
