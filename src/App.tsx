import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SocialAccountModal } from './components/SocialAccountModal';
import { DeviceAudioScanner } from './services/deviceAudioScanner';
import { NativeAudioScanner } from './services/nativeMediaStore';
import { IndexedDbAudioService } from './services/indexedDbAudio';

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [tracks, setTracks] = useState<Track[]>(() => StorageService.loadTracks());
  const [likedIds, setLikedIds] = useState<Set<string>>(() => StorageService.getLikedIds());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(() => StorageService.getDownloadedIds());
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);

  // Audio Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [, setCurrentTime] = useState<number>(0);
  const [, setDuration] = useState<number>(0);

  // Scan state for local phone storage
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

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

  // Scan phone audio files
  const handleScanDeviceAudio = useCallback(async (): Promise<number> => {
    setIsScanning(true);
    setPermissionDenied(false);

    try {
      const res = await DeviceAudioScanner.autoDiscoverDeviceTracks();
      if (res.permissionDenied) {
        setPermissionDenied(true);
        setIsScanning(false);
        return 0;
      }

      if (res.tracks && res.tracks.length > 0) {
        setTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newItems = res.tracks.filter((t) => !existingIds.has(t.id));
          return [...newItems, ...prev];
        });

        setDownloadedIds((prev) => {
          const next = new Set(prev);
          res.tracks.forEach((t) => next.add(t.id));
          return next;
        });

        setIsScanning(false);
        return res.tracks.length;
      }
    } catch (e) {
      console.warn('Error discovering device tracks:', e);
    }

    setIsScanning(false);
    return 0;
  }, []);

  // Scan via Directory Picker
  const handleScanDirectory = useCallback(async (): Promise<number> => {
    setIsScanning(true);
    try {
      const dirTracks = await NativeAudioScanner.scanViaDirectoryPicker();
      if (dirTracks.length > 0) {
        setTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newItems = dirTracks.filter((t) => !existingIds.has(t.id));
          return [...newItems, ...prev];
        });

        setDownloadedIds((prev) => {
          const next = new Set(prev);
          dirTracks.forEach((t) => next.add(t.id));
          return next;
        });

        setIsScanning(false);
        return dirTracks.length;
      }
    } catch (e) {
      console.warn('Directory scan error:', e);
    }
    setIsScanning(false);
    return 0;
  }, []);

  // Hydrate device tracks and run automated phone MP3 discovery
  useEffect(() => {
    IndexedDbAudioService.hydrateDeviceTracks(tracks).then((hydrated) => {
      setTracks(hydrated);
    });

    // Auto discover upon startup
    handleScanDeviceAudio();
  }, [handleScanDeviceAudio]);

  // Handle Playback with Queue
  const handlePlayTrack = (track: Track, customQueue?: Track[]) => {
    const queueToUse = customQueue || tracks;
    audioService.playTrack(track, queueToUse);

    // Update recents in track list
    setTracks((prev) => {
      const remaining = prev.filter((t) => t.id !== track.id);
      return [{ ...track, collection: 'recents' }, ...remaining];
    });
  };

  // Import local phone MP3 files
  const handleImportDeviceTracks = async (files: FileList): Promise<number> => {
    const imported = await DeviceAudioScanner.processFiles(files);
    if (imported.length > 0) {
      setTracks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newItems = imported.filter((t) => !existingIds.has(t.id));
        return [...newItems, ...prev];
      });
      setDownloadedIds((prev) => {
        const next = new Set(prev);
        imported.forEach((t: Track) => next.add(t.id));
        return next;
      });
    }
    return imported.length;
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

  // Toggle Download for offline play
  const handleToggleDownload = (track: Track) => {
    setDownloadedIds((prev) => {
      const next = new Set(prev);
      if (next.has(track.id)) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });
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
    if (screenState === 'home') return 'Home';
    if (screenState === 'online_search') return 'Search';
    return 'Library';
  }, [screenState]);

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

  return (
    <div className="h-[100dvh] min-h-[100dvh] sm:min-h-screen w-full bg-[#141414] flex items-center justify-center sm:py-6 select-none font-sans overflow-hidden">
      {/* 412 x 917 Android Compact - 1 root container matching Figma exact composition */}
      <div className="w-full sm:max-w-[412px] h-[100dvh] sm:h-[917px] max-h-[100dvh] sm:max-h-[917px] bg-[#212121] sm:rounded-[44px] sm:border sm:border-white/5 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Dynamic Screen Content strictly aligned with the 4 screen states - takes full screen from top 0 to bottom */}
        <div className="w-full h-full flex flex-col overflow-hidden relative">
          {screenState === 'home' && (
            <HomeScreen
              recentTracks={tracks.length > 0 ? tracks : INITIAL_TRACKS}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              selectedMood={selectedMood}
              onPlayTrack={(t) => handlePlayTrack(t, tracks)}
              onSelectMood={handleSelectMood}
              onOpenDeviceLibrary={() => setScreenState('device_library_search')}
            />
          )}

          {screenState === 'device_library_search' && (
            <DeviceLibrarySearchScreen
              deviceTracks={deviceTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={(t) => handlePlayTrack(t, deviceTracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              onBackToHome={() => setScreenState('home')}
              onImportDeviceTracks={handleImportDeviceTracks}
              onScanDeviceAudio={handleScanDeviceAudio}
              onScanDirectory={handleScanDirectory}
              isScanning={isScanning}
              permissionDenied={permissionDenied}
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
            />
          )}

          {screenState === 'library_main' && (
            <LibraryScreen
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              onPlayTrack={(t) => handlePlayTrack(t, localLibraryTracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              onOpenLibrarySearch={() => setScreenState('library_search')}
              onImportDeviceTracks={handleImportDeviceTracks}
              onScanDeviceAudio={handleScanDeviceAudio}
              onScanDirectory={handleScanDirectory}
              isScanning={isScanning}
              permissionDenied={permissionDenied}
            />
          )}

          {screenState === 'library_search' && (
            <LibrarySearchScreen
              libraryTracks={localLibraryTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={(t) => handlePlayTrack(t, localLibraryTracks)}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              onBackToMainLibrary={() => setScreenState('library_main')}
            />
          )}
        </div>

        {/* Top Navigation Capsule floating over screen content matching Figma exact coordinates */}
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

        {/* Floating When-is-playing Controller Widget */}
        <WhenPlayingWidget
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onNextTrack={handleNextTrack}
          onPreviousTrack={handlePreviousTrack}
        />

        {/* Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isPlaying={isPlaying}
        />

        {/* Modal for Account & Listening with Friends ("گوش دادن با رفیق‌ها") */}
        <SocialAccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          initialTab={accountModalType}
          likedCount={likedIds.size}
          downloadedCount={downloadedIds.size}
        />
      </div>
    </div>
  );
}
