import { Track } from '../types/music';

type Listener = () => void;

export type RepeatMode = 'off' | 'all' | 'one';

class AudioService {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private listeners: Set<Listener> = new Set();

  // Playlist Queue management
  private queue: Track[] = [];
  private isShuffle: boolean = false;
  private repeatMode: RepeatMode = 'all';

  // Web Audio synth fallback (for corrupted files or test files)
  private audioCtx: AudioContext | null = null;
  private synthInterval: number | null = null;
  private isUsingSynth: boolean = false;

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

      this.audio.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audio.addEventListener('error', (err) => {
        console.warn('Audio playback error, falling back if needed:', err);
        // Only fallback to synth if url is invalid/mock
        if (!this.currentTrack?.url || this.currentTrack.url.startsWith('http')) {
          this.startSynthPlayback();
        }
      });

      this.setupMediaSessionHandlers();
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

  public toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.notify();
  }

  public toggleRepeat() {
    if (this.repeatMode === 'off') this.repeatMode = 'all';
    else if (this.repeatMode === 'all') this.repeatMode = 'one';
    else this.repeatMode = 'off';
    this.notify();
  }

  public async playTrack(track: Track, newQueue?: Track[]) {
    this.stopSynthPlayback();

    if (newQueue && newQueue.length > 0) {
      this.queue = newQueue;
    } else if (this.queue.length === 0 || !this.queue.some((t) => t.id === track.id)) {
      this.queue = [track, ...this.queue.filter((t) => t.id !== track.id)];
    }

    if (this.currentTrack?.id === track.id && this.audio) {
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

    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration || 0;

    if (this.audio) {
      try {
        this.audio.src = track.url;
        this.audio.load();
        await this.audio.play();
        this.isPlaying = true;
      } catch (err) {
        console.warn('Direct audio play failed, falling back to synth if necessary:', err);
        this.startSynthPlayback();
      }
    } else {
      this.startSynthPlayback();
    }

    this.updateMediaSessionMetadata(track);
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
    this.currentTime = time;
    if (this.audio && !this.isUsingSynth) {
      this.audio.currentTime = time;
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
      const remaining = this.queue.filter((t) => t.id !== this.currentTrack?.id);
      if (remaining.length > 0) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        nextTrack = remaining[randomIndex];
      } else {
        nextTrack = this.queue[0];
      }
    } else {
      const currentIndex = this.currentTrack
        ? this.queue.findIndex((t) => t.id === this.currentTrack?.id)
        : -1;
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.queue.length) {
        nextTrack = this.queue[nextIndex];
      } else if (this.repeatMode === 'all') {
        nextTrack = this.queue[0];
      }
    }

    if (nextTrack) {
      this.playTrack(nextTrack);
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
      ? this.queue.findIndex((t) => t.id === this.currentTrack?.id)
      : 0;
    const prevIndex = (currentIndex - 1 + this.queue.length) % this.queue.length;
    this.playTrack(this.queue[prevIndex]);
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
        if (!this.audioCtx || !this.isPlaying || !this.isUsingSynth) return;

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
