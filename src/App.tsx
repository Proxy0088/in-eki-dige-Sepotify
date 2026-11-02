import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { NavTab, ScreenState, Track, MoodType } from './types/music';
import { INITIAL_TRACKS } from './data/initialTracks';
import { audioService } from './services/audioPlayer';
import { StorageService } from './services/storage';
import { TopCapsule } from './components/TopCapsule';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { OnlineSearchScreen } from './components/OnlineSearchScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { LibrarySearchScreen } from './components/LibrarySearchScreen';
import { DeviceLibrarySearchScreen } from './components/DeviceLibrarySearchScreen';
import { WhenPlayingWidget } from './components/WhenPlayingWidget';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { SocialAccountModal } from './components/SocialAccountModal';
import { SettingsModal } from './components/SettingsModal';
import { SettingScreen } from './components/SettingScreen';
import { SettingsService, AppSettings } from './services/settingsService';
import { AppLanguage, AppTheme } from './types/music';
import { DeviceAudioScanner } from './services/deviceAudioScanner';
import { IndexedDbAudioService } from './services/indexedDbAudio';
import { StreamResolverService } from './services/streamResolverService';

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [tracks, setTracks] = useState<Track[]>(() => {
    const loaded = StorageService.loadTracks();
    return loaded.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  });
  const [likedIds, setLikedIds] = useState<Set<string>>(() => StorageService.getLikedIds());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(() => StorageService.getDownloadedIds());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([]);

  // App Settings state (National Net, Language, Light Theme)
  const [settings, setSettings] = useState<AppSettings>(() => SettingsService.getSettings());
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  useEffect(() => {
    SettingsService.saveSettings(settings);
    SettingsService.applyTheme(settings.theme);
    SettingsService.applyLanguage(settings.language);
  }, [settings]);

  const handleToggleNationalNet = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, isNationalNet: enabled }));
  }, []);

  const handleLanguageChange = useCallback((language: AppLanguage) => {
    setSettings((prev) => ({ ...prev, language }));
  }, []);

  const handleThemeChange = useCallback((theme: AppTheme) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);
  const previousScreenRef = useRef<ScreenState>('home');

  // Audio Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Info modal state
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [accountModalType, setAccountModalType] = useState<'profile' | 'group' | 'mobile'>('profile');

  // Subscribe to audio engine updates
  useEffect(() => {
    const unsubscribe = audioService.subscribe(() => {
      setCurrentTrack(audioService.getTrack());
      setIsPlaying(audioService.getIsPlaying());
      setCurrentTime(audioService.getCurrentTime());
      setDuration(audioService.getDuration());
    });
    return () => unsubscribe();
  }, []);

  // Save changes to storage
  useEffect(() => {
    StorageService.saveTracks(tracks);
  }, [tracks]);

  useEffect(() => {
    StorageService.setLikedIds(likedIds);
  }, [likedIds]);

  useEffect(() => {
    StorageService.setDownloadedIds(downloadedIds);
  }, [downloadedIds]);

  // Scan phone audio files automatically
  const handleScanDeviceAudio = useCallback(async (): Promise<number> => {
    try {
      const res = await DeviceAudioScanner.autoDiscoverDeviceTracks();
      if (res.tracks && res.tracks.length > 0) {
        setTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newItems = res.tracks.filter((t) => !existingIds.has(t.id));
          const combined = [...newItems, ...prev];
          // Strictly sort by download time (dateAdded descending)
          return combined.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        });

        setDownloadedIds((prev) => {
          const next = new Set(prev);
          res.tracks.forEach((t) => next.add(t.id));
          return next;
        });

        return res.tracks.length;
      }
    } catch (e) {
      console.warn('Error discovering device tracks:', e);
    }

    return 0;
  }, []);

  // Hydrate device tracks and run automated phone MP3 discovery
  useEffect(() => {
    IndexedDbAudioService.hydrateDeviceTracks(tracks).then((hydrated) => {
      setTracks((prev) => {
        const merged = hydrated.length > 0 ? hydrated : prev;
        return [...merged].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      });
    });

    // Auto discover upon startup
    handleScanDeviceAudio();
  }, [handleScanDeviceAudio]);

  // Handle Playback with Queue - Keep queue and tracks array stable!
  const handlePlayTrack = async (track: Track, customQueue?: Track[], openPlayer: boolean = true) => {
    let playableTrack = track;

    try {
      const offlineBlob = await IndexedDbAudioService.getAudioFile(track.id);
      if (offlineBlob) {
        playableTrack = {
          ...track,
          url: URL.createObjectURL(offlineBlob),
          isDownloaded: true,
        };
      }
    } catch (e) {
      console.warn('Offline blob check error:', e);
    }

    // Resolve full stream if track is an iTunes preview (30s) or unverified stream
    if (!playableTrack.isDownloaded && (playableTrack.id.startsWith('itunes-') || playableTrack.url.includes('apple.com') || playableTrack.duration <= 35)) {
      try {
        playableTrack = await StreamResolverService.resolveTrack(playableTrack);
      } catch (err) {
        console.warn('Full stream resolution error:', err);
      }
    }

    if (playableTrack.isAudius && playableTrack.isStreamable === false && !playableTrack.isDownloaded) {
      alert('پخش این قطعه توسط هنرمند در شبکه غیرمتمرکز محدود شده است.');
      return;
    }

    setTracks((prev) => {
      if (!prev.some((t) => t.id === playableTrack.id)) {
        return [playableTrack, ...prev];
      }
      return prev.map((t) => (t.id === playableTrack.id ? playableTrack : t));
    });

    const queueToUse = customQueue || tracks;
    audioService.playTrack(playableTrack, queueToUse);

    setRecentTrackIds((prev) => [playableTrack.id, ...prev.filter((id) => id !== playableTrack.id)].slice(0, 8));

    if (openPlayer) {
      if (screenState !== 'player') {
        previousScreenRef.current = screenState;
      }
      setScreenState('player');
    }
  };

  // Toggle Like
  const handleToggleLike = (track: Track) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(track.id)) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });
  };

  // Save to Library Folder
  const handleSaveToLibrary = (track: Track, libraryName: string) => {
    const trimmedName = libraryName.trim();
    StorageService.addUserLibrary(trimmedName);

    // If saving to Liked
    if (trimmedName.toLowerCase() === 'liked') {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.add(track.id);
        return next;
      });
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isLiked: true } : t))
      );
      return;
    }

    // Save folder name in collection
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, collection: trimmedName, isLiked: true } : t))
    );

    setLikedIds((prev) => {
      const next = new Set(prev);
      next.add(track.id);
      return next;
    });
  };

  // Toggle Download for offline play
  const handleToggleDownload = async (track: Track) => {
    const isDownloaded = downloadedIds.has(track.id);

    if (isDownloaded) {
      await IndexedDbAudioService.deleteAudioFile(track.id);
      setDownloadedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isDownloaded: false } : t))
      );
      return;
    }

    if (track.isAudius || track.audiusId) {
      if (track.isDownloadable === false) {
        alert('این قطعه توسط هنرمند اجازه دانلود داده نشده است.');
        return;
      }

      setDownloadingIds((prev) => new Set(prev).add(track.id));
      const res = await IndexedDbAudioService.downloadAndSaveAudiusTrack(track);
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });

      if (!res.success) {
        alert(res.error || 'خطا در دانلود قطعه');
        return;
      }

      const updatedTrack: Track = {
        ...track,
        url: res.localUrl || track.url,
        isDownloaded: true,
        collection: 'Downloads',
      };

      setTracks((prev) => {
        const exists = prev.some((t) => t.id === track.id);
        if (exists) {
          return prev.map((t) => (t.id === track.id ? updatedTrack : t));
        }
        return [updatedTrack, ...prev];
      });

      setDownloadedIds((prev) => new Set(prev).add(track.id));
      return;
    }

    setDownloadedIds((prev) => {
      const next = new Set(prev);
      next.add(track.id);
      return next;
    });
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isDownloaded: true } : t))
    );
  };

  // Filter or activate Mood
  const handleSelectMood = (mood: MoodType) => {
    if (selectedMood === mood) {
      setSelectedMood(null);
    } else {
      setSelectedMood(mood);
      const moodTrack = tracks.find((t) => t.mood === mood);
      if (moodTrack) {
        handlePlayTrack(moodTrack);
      }
    }
  };

  // Determine current active navigation tab
  const activeTab: NavTab = useMemo(() => {
    if (screenState === 'home' || screenState === 'device_library_search') return 'home';
    if (screenState === 'online_search') return 'search';
    return 'library';
  }, [screenState]);

  // Handle bottom navigation tab clicks
  const handleTabChange = (tab: NavTab) => {
    if (tab === 'home') setScreenState('home');
    else if (tab === 'search') setScreenState('online_search');
    else if (tab === 'library') setScreenState('library_main');
  };

  // Top Capsule Title
  const capsuleTitle = useMemo(() => {
    if (screenState === 'setting') return 'Setting';
    if (screenState === 'home') return settings.language === 'fa' ? 'خانه' : 'Home';
    if (screenState === 'online_search') return settings.language === 'fa' ? 'جست‌وجو' : 'Search';
    return settings.language === 'fa' ? 'کتابخانه' : 'Library';
  }, [screenState, settings.language]);

  // Real local tracks from phone memory or imported files
  const deviceTracks = useMemo(() => {
    return tracks.filter(
      (t) =>
        t.id.startsWith('android-media-') ||
        t.id.startsWith('device-file-') ||
        t.id.startsWith('device-') ||
        t.id.startsWith('local-device-')
    );
  }, [tracks]);

  // Tracks for local library: all tracks marked as liked, in library 1/2, or downloaded
  const localLibraryTracks = useMemo(() => {
    return tracks.filter(
      (t) =>
        likedIds.has(t.id) ||
        downloadedIds.has(t.id) ||
        t.collection === 'library 1' ||
        t.collection === 'library 2' ||
        t.id.startsWith('android-media-') ||
        t.id.startsWith('device-file-')
    );
  }, [tracks, likedIds, downloadedIds]);

  const handleTogglePlay = () => {
    audioService.togglePlay();
  };

  const handleNextTrack = () => {
    audioService.playNext();
  };

  const handlePreviousTrack = () => {
    audioService.playPrevious();
  };

  // Computed 4 recent tracks for HomeScreen
  const recentTracks = useMemo(() => {
    if (recentTrackIds.length === 0) return tracks.slice(0, 4);
    const result: Track[] = [];
    for (const id of recentTrackIds) {
      const found = tracks.find((t) => t.id === id);
      if (found) result.push(found);
      if (result.length === 4) break;
    }
    for (const t of tracks) {
      if (result.length >= 4) break;
      if (!result.some((r) => r.id === t.id)) {
        result.push(t);
      }
    }
    return result;
  }, [recentTrackIds, tracks]);

  return (
    <div className="h-[100dvh] min-h-[100dvh] sm:min-h-screen w-full bg-[var(--bg-outer)] flex items-center justify-center sm:py-6 select-none font-sans overflow-hidden transition-colors duration-300">
      {/* 412 x 917 Android Compact - 1 root container matching Figma exact composition */}
      <div className="w-full sm:max-w-[412px] h-[100dvh] sm:h-[917px] max-h-[100dvh] sm:max-h-[917px] bg-[var(--bg-app)] sm:rounded-[44px] sm:border sm:border-white/5 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden transition-colors duration-300">
        {/* Dynamic Screen Content strictly aligned with the 4 screen states - takes full screen from top 0 to bottom */}
        <div className="w-full h-full flex flex-col overflow-hidden relative">
                    {screenState === 'setting' && (
            <SettingScreen
              isNationalNet={settings.isNationalNet}
              onToggleNationalNet={handleToggleNationalNet}
              theme={settings.theme}
              onThemeChange={handleThemeChange}
            />
          )}

{screenState === 'home' && (
            <HomeScreen
              recentTracks={recentTracks.length > 0 ? recentTracks : INITIAL_TRACKS}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              selectedMood={selectedMood}
              onPlayTrack={(t) => handlePlayTrack(t, tracks)}
              onSelectMood={handleSelectMood}
              onOpenDeviceLibrary={() => setScreenState('device_library_search')}
              isNationalNet={settings.isNationalNet}
              language={settings.language}
            />
          )}

          {screenState === 'device_library_search' && (
            <DeviceLibrarySearchScreen
              deviceTracks={deviceTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={(t, q) => handlePlayTrack(t, q || deviceTracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              onBackToHome={() => setScreenState('home')}
            />
          )}

          {screenState === 'online_search' && (
            <OnlineSearchScreen
              allTracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={(t) => handlePlayTrack(t, tracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              isNationalNet={settings.isNationalNet}
              language={settings.language}
            />
          )}

          {screenState === 'library_main' && (
            <LibraryScreen
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              onPlayTrack={(t, q) => handlePlayTrack(t, q || localLibraryTracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              onOpenLibrarySearch={() => setScreenState('library_search')}
            />
          )}

          {screenState === 'library_search' && (
            <LibrarySearchScreen
              libraryTracks={localLibraryTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={(t, q) => handlePlayTrack(t, q || localLibraryTracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              onBackToMainLibrary={() => setScreenState('library_main')}
            />
          )}

          {screenState === 'player' && (
            <FullScreenPlayer
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              likedIds={likedIds}
              onBack={() => setScreenState(previousScreenRef.current || 'home')}
              onTogglePlay={handleTogglePlay}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              onToggleLike={handleToggleLike}
              onSaveToLibrary={handleSaveToLibrary}
              onTabChange={handleTabChange}
            />
          )}
        </div>

        {/* Top Navigation Capsule floating over screen content (hidden on player screen) */}
        {screenState !== 'player' && (
          <TopCapsule
            title={capsuleTitle}
            onProfileClick={() => {
              setAccountModalType('profile');
              setShowAccountModal(true);
            }}
            onGroupClick={() => {
              setAccountModalType('group');
              setShowAccountModal(true);
            }}
          />
        )}

        {/* Floating When-is-playing Controller Widget (hidden on player screen) */}
        {screenState !== 'player' && (
          <WhenPlayingWidget
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onNextTrack={handleNextTrack}
            onPreviousTrack={handlePreviousTrack}
            onOpenPlayer={() => {
              previousScreenRef.current = screenState;
              setScreenState('player');
            }}
          />
        )}

        {/* Bottom Navigation Bar (hidden on player screen as it has its own Figma navbar) */}
        {screenState !== 'player' && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isPlaying={isPlaying}
            language={settings.language}
          />
        )}

                {/* Modal for Account & Listening with Friends ("گوش دادن با رفیق‌ها") */}
        <SocialAccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          onOpenSettings={() => setScreenState('setting')}
          initialTab={accountModalType}
          likedCount={likedIds.size}
          downloadedCount={downloadedIds.size}
        />

        {/* Modal for Settings ("تنظیمات برنامه") */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          isNationalNet={settings.isNationalNet}
          onToggleNationalNet={handleToggleNationalNet}
          language={settings.language}
          onLanguageChange={handleLanguageChange}
          theme={settings.theme}
          onThemeChange={handleThemeChange}
        />
      </div>
    </div>
  );
}
