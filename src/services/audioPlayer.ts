import { Track } from '../types/music';

type Listener = () => void;

export type RepeatMode = 'off' | 'all' | 'one';
export type PlaybackCycleMode = 'off' | 'repeat_all' | 'repeat_one' | 'shuffle';

class AudioService {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private isMuted: boolean = false;
  private listeners: Set<Listener> = new Set();

  // Playlist Queue management
  private queue: Track[] = [];
  private isShuffle: boolean = false;
  private repeatMode: RepeatMode = 'all';
  private trackResolver: ((track: Track) => Promise<Track | null>) | null = null;
  private failedSkipCount: number = 0;

  // Web Audio synth fallback (for corrupted files or test files)
  private audioCtx: AudioContext | null = null;
  private synthInterval: number | null = null;
  private isUsingSynth: boolean = false;

  // YouTube Audio Background Engine (LastWave style)
  private ytPlayer: any = null;
  private isYtReady: boolean = false;
  private isPlayingYt: boolean = false;
  private ytInterval: any = null;
  private pendingYtTrack: Track | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.audio.preload = 'auto';

      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.updateMediaSessionPlaybackState('playing');
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updateMediaSessionPlaybackState('paused');
        this.notify();
      });

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio) {
          this.currentTime = this.audio.currentTime;
          if (this.audio.duration && Number.isFinite(this.audio.duration)) {
            this.duration = this.audio.duration;
          } else if (this.currentTrack?.duration) {
            this.duration = this.currentTrack.duration;
          }
          this.updateMediaSessionPositionState();
          this.notify();
        }
      });

      this.audio.addEventListener('durationchange', () => {
        if (this.audio && this.audio.duration && Number.isFinite(this.audio.duration)) {
          this.duration = this.audio.duration;
          this.notify();
        }
      });

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.audio && this.audio.duration && Number.isFinite(this.audio.duration)) {
          this.duration = this.audio.duration;
          this.notify();
        }
      });

      this.audio.addEventListener('canplay', () => {
        if (this.audio && this.audio.duration && Number.isFinite(this.audio.duration)) {
          this.duration = this.audio.duration;
          this.notify();
        }
      });

      this.audio.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audio.addEventListener('error', (err) => {
        console.warn('Audio playback error (keeping current track):', err);
        this.isPlaying = false;
        this.updateMediaSessionPlaybackState('paused');
        this.notify();
        // Do NOT loop-skip to next track on network interruption!
        // Stay on current track so user can resume when internet returns.
      });

      if (typeof window !== 'undefined') {
        window.addEventListener('offline', () => {
          console.log('Network offline detected in AudioService: pausing playback');
          if (this.isPlaying) {
            this.pause();
          }
        });
      }

      this.setupMediaSessionHandlers();
      this.initYouTubePlayer();
    }
  }

  private initYouTubePlayer() {
    if (typeof window === 'undefined') return;

    const setupPlayer = () => {
      const w = window as any;
      if (!w.YT || !w.YT.Player) return false;
      const el = document.getElementById('yt-hidden-audio-player');
      if (!el) return false;

      try {
        this.ytPlayer = new w.YT.Player('yt-hidden-audio-player', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              this.isYtReady = true;
              if (this.pendingYtTrack) {
                const t = this.pendingYtTrack;
                this.pendingYtTrack = null;
                this.playTrack(t);
              }
            },
            onStateChange: (event: any) => {
              const state = event.data;
              const w = window as any;
              const YTState = w.YT?.PlayerState;
              if (!YTState) return;

              if (state === YTState.PLAYING) {
                this.isPlaying = true;
                this.isPlayingYt = true;
                this.startYtProgressTimer();
                this.updateMediaSessionPlaybackState('playing');
                this.notify();
              } else if (state === YTState.PAUSED) {
                this.isPlaying = false;
                this.stopYtProgressTimer();
                this.updateMediaSessionPlaybackState('paused');
                this.notify();
              } else if (state === YTState.ENDED) {
                this.stopYtProgressTimer();
                this.handleTrackEnded();
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player playback warning:', err);
            },
          },
        });
        return true;
      } catch (e) {
        console.warn('Could not initialize YT player yet:', e);
        return false;
      }
    };

    if (!setupPlayer()) {
      const orig = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof orig === 'function') orig();
        setupPlayer();
      };
      // Retry in 1s if script loads asynchronously
      setTimeout(setupPlayer, 1200);
    }
  }

  private startYtProgressTimer() {
    this.stopYtProgressTimer();
    this.ytInterval = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || 0;
        this.currentTime = cur;
        if (dur > 0) this.duration = dur;
        this.updateMediaSessionPositionState();
        this.notify();
      }
    }, 250);
  }

  private stopYtProgressTimer() {
    if (this.ytInterval) {
      clearInterval(this.ytInterval);
      this.ytInterval = null;
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public getTrack(): Track | null {
    return this.currentTrack;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration || this.currentTrack?.duration || 180;
  }

  public getQueue(): Track[] {
    return this.queue;
  }

  public getIsShuffle(): boolean {
    return this.isShuffle;
  }

  public getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  public setQueue(tracks: Track[]) {
    this.queue = tracks;
    this.notify();
  }

  public setTrackResolver(resolver: (track: Track) => Promise<Track | null>) {
    this.trackResolver = resolver;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
      this.audio.volume = this.isMuted ? 0 : 1;
    }
    this.notify();
    return this.isMuted;
  }

  public getPlaybackCycleMode(): PlaybackCycleMode {
    if (this.isShuffle) return 'shuffle';
    if (this.repeatMode === 'one') return 'repeat_one';
    if (this.repeatMode === 'all') return 'repeat_all';
    return 'off';
  }

  public cyclePlaybackMode(): PlaybackCycleMode {
    const current = this.getPlaybackCycleMode();
    if (current === 'off') {
      // 1. Repeat playlist (loops folder/queue)
      this.repeatMode = 'all';
      this.isShuffle = false;
    } else if (current === 'repeat_all') {
      // 2. Repeat 1 (repeats single song indefinitely)
      this.repeatMode = 'one';
      this.isShuffle = false;
    } else if (current === 'repeat_one') {
      // 3. Shuffle (random song order)
      this.repeatMode = 'all';
      this.isShuffle = true;
    } else {
      // 4. Off
      this.repeatMode = 'off';
      this.isShuffle = false;
    }
    this.notify();
    return this.getPlaybackCycleMode();
  }

  public getNextTrack(): Track | null {
    if (!this.queue || this.queue.length === 0) return null;
    if (this.queue.length === 1) return this.queue[0];

    if (this.isShuffle) {
      const remaining = this.queue.filter((t) => String(t.id) !== String(this.currentTrack?.id));
      return remaining.length > 0 ? remaining[0] : this.queue[0];
    }

    const currentIndex = this.currentTrack
      ? this.queue.findIndex((t) => String(t.id) === String(this.currentTrack?.id))
      : -1;
    const nextIndex = (currentIndex + 1) % this.queue.length;
    return this.queue[nextIndex];
  }

  public async playTrack(track: Track, newQueue?: Track[]) {
    this.stopSynthPlayback();

    if (newQueue && newQueue.length > 0) {
      this.queue = [...newQueue];
    } else if (this.queue.length === 0) {
      this.queue = [track];
    } else if (!this.queue.some((t) => String(t.id) === String(track.id))) {
      this.queue.push(track);
    }

    let playableTrack = track;

    // Resolve unplayable / unresolved track via registered trackResolver (e.g. during queue playback)
    if (
      !playableTrack.isDownloaded &&
      !playableTrack.isFullLength &&
      (!playableTrack.url || (!playableTrack.url.includes('/api/stream') && !playableTrack.url.includes('googlevideo.com') && !playableTrack.url.startsWith('blob:'))) &&
      this.trackResolver
    ) {
      try {
        const resolved = await this.trackResolver(playableTrack);
        if (resolved && resolved.isFullLength && resolved.url) {
          playableTrack = resolved;
          this.queue = this.queue.map((t) => (t.id === playableTrack.id ? playableTrack : t));
        } else {
          console.warn('Queue track resolution failed for:', playableTrack.title);
          this.isPlaying = false;
          this.notify();
          return;
        }
      } catch (err) {
        console.warn('Queue track resolution error (keeping track):', err);
        this.isPlaying = false;
        this.notify();
        return;
      }
    }

    this.failedSkipCount = 0;

    if (this.currentTrack?.id === playableTrack.id && this.audio) {
      if (this.isPlaying) {
        this.pause();
        return;
      } else {
        try {
          await this.audio.play();
          this.isPlaying = true;
          this.updateMediaSessionPlaybackState('playing');
          this.notify();
          return;
        } catch {
          this.startSynthPlayback();
          return;
        }
      }
    }

    this.currentTrack = playableTrack;
    this.currentTime = 0;
    this.duration = playableTrack.duration || 0;

    if (this.audio) {
      try {
        this.audio.src = playableTrack.url;
        this.audio.muted = this.isMuted;
        this.audio.volume = this.isMuted ? 0 : 1;
        this.audio.load();
        await this.audio.play();
        this.isPlaying = true;
      } catch (err) {
        console.warn('Direct audio play failed (keeping current track):', err);
        this.isPlaying = false;
        this.updateMediaSessionPlaybackState('paused');
        this.notify();
        return;
      }
    } else {
      this.startSynthPlayback();
    }

    this.updateMediaSessionMetadata(playableTrack);
    this.updateMediaSessionPlaybackState(this.isPlaying ? 'playing' : 'paused');
    this.notify();
  }

  public pause() {
    if (this.isUsingSynth) {
      this.stopSynthPlayback();
    } else if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.updateMediaSessionPlaybackState('paused');
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else if (this.currentTrack) {
      this.resume();
    }
  }

  public resume() {
    if (this.currentTrack) {
      if (this.isUsingSynth) {
        this.startSynthPlayback();
      } else if (this.audio && this.audio.src) {
        this.audio.play().catch(() => this.startSynthPlayback());
      } else {
        this.startSynthPlayback();
      }
      this.isPlaying = true;
      this.updateMediaSessionPlaybackState('playing');
      this.notify();
    }
  }

  public seek(time: number) {
    if (!Number.isFinite(time)) return;
    const safeDuration = this.getDuration();
    const clampedTime = Math.max(0, Math.min(time, safeDuration));
    this.currentTime = clampedTime;

    if (this.audio) {
      try {
        if (!this.isUsingSynth) {
          this.audio.currentTime = clampedTime;
        }
      } catch (err) {
        console.warn('Error setting audio currentTime:', err);
      }
    }
    this.updateMediaSessionPositionState();
    this.notify();
  }

  public playNext() {
    if (!this.queue.length) return;
    if (this.repeatMode === 'one' && this.currentTrack) {
      this.seek(0);
      this.resume();
      return;
    }

    let nextTrack: Track | null = null;
    if (this.isShuffle) {
      const remaining = this.queue.filter((t) => String(t.id) !== String(this.currentTrack?.id));
      if (remaining.length > 0) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        nextTrack = remaining[randomIndex];
      } else {
        nextTrack = this.queue[0];
      }
    } else {
      const currentIndex = this.currentTrack
        ? this.queue.findIndex((t) => String(t.id) === String(this.currentTrack?.id))
        : -1;
      const nextIndex = currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < this.queue.length) {
        nextTrack = this.queue[nextIndex];
      } else if (this.repeatMode === 'all' && this.queue.length > 0) {
        nextTrack = this.queue[0];
      }
    }

    if (nextTrack) {
      this.playTrack(nextTrack, this.queue);
    } else {
      this.pause();
      this.currentTime = 0;
      this.notify();
    }
  }

  public playPrevious() {
    if (!this.queue.length) return;

    // If current time > 3s, restart song
    if (this.currentTime > 3) {
      this.seek(0);
      return;
    }

    const currentIndex = this.currentTrack
      ? this.queue.findIndex((t) => String(t.id) === String(this.currentTrack?.id))
      : 0;
    const prevIndex = (currentIndex - 1 + this.queue.length) % this.queue.length;
    this.playTrack(this.queue[prevIndex], this.queue);
  }

  private handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.resume();
    } else {
      this.playNext();
    }
  }

  // --- Background Playback & MediaSession API Integration ---
  private setupMediaSessionHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.max(this.currentTime - offset, 0));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.min(this.currentTime + offset, this.duration));
      });
    } catch (e) {
      console.warn('Error setting up MediaSession handlers:', e);
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const artwork = track.coverUrl
        ? [
            { src: track.coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork,
      });
    } catch (e) {
      console.warn('Error updating MediaSession metadata:', e);
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused') {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.playbackState = state;
    } catch {
      // Ignore
    }
  }

  private updateMediaSessionPositionState() {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !navigator.mediaSession.setPositionState
    ) {
      return;
    }

    try {
      if (this.duration && Number.isFinite(this.duration) && this.duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: this.duration,
          playbackRate: 1.0,
          position: Math.min(Math.max(this.currentTime, 0), this.duration),
        });
      }
    } catch {
      // Ignore
    }
  }

  // Web Audio generative synthesis fallback
  private startSynthPlayback() {
    this.isUsingSynth = true;
    this.isPlaying = true;

    try {
      if (!this.audioCtx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const rootFreq = this.currentTrack?.audioSynthFrequency || 220;
      const moodNotes = [0, 4, 7, 11, 14];

      let step = 0;
      if (this.synthInterval) {
        clearInterval(this.synthInterval);
      }

      const playTone = () => {
        if (!this.audioCtx || !this.isPlaying || !this.isUsingSynth || this.isMuted) return;

        const semitone = moodNotes[step % moodNotes.length];
        const freq = rootFreq * Math.pow(2, semitone / 12);
        step++;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, this.audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.9);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.0);

        this.currentTime = Math.min((this.currentTime || 0) + 1, this.duration || 180);
        this.notify();
      };

      playTone();
      this.synthInterval = window.setInterval(playTone, 1000);
    } catch (e) {
      console.error('Synth initialization error:', e);
    }

    this.notify();
  }

  private stopSynthPlayback() {
    this.isUsingSynth = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
}

export const audioService = new AudioService();
