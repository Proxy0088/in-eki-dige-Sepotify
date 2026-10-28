import { Track } from '../types/music';

type Listener = () => void;

class AudioService {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private listeners: Set<Listener> = new Set();
  
  // Web Audio synth fallback
  private audioCtx: AudioContext | null = null;
  private synthInterval: number | null = null;
  private isUsingSynth: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';

      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio) {
          this.currentTime = this.audio.currentTime;
          this.duration = this.audio.duration || this.currentTrack?.duration || 0;
          this.notify();
        }
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.currentTime = 0;
        this.notify();
      });

      this.audio.addEventListener('error', () => {
        // Fallback to Web Audio synthesis engine so audio plays uninterrupted
        console.warn('Direct stream error or CORS restriction, engaging fallback ambient synthesis.');
        this.startSynthPlayback();
      });
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

  public async playTrack(track: Track) {
    this.stopSynthPlayback();

    if (this.currentTrack?.id === track.id && this.audio) {
      if (this.isPlaying) {
        this.pause();
        return;
      } else {
        try {
          await this.audio.play();
          this.isPlaying = true;
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
    this.duration = track.duration;

    if (this.audio) {
      this.audio.src = track.url;
      this.audio.load();
      try {
        await this.audio.play();
        this.isPlaying = true;
      } catch (err) {
        console.warn('HTML5 audio play blocked or offline, using WebAudio synth:', err);
        this.startSynthPlayback();
      }
    } else {
      this.startSynthPlayback();
    }

    this.notify();
  }

  public pause() {
    if (this.isUsingSynth) {
      this.stopSynthPlayback();
    } else if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
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
      this.notify();
    }
  }

  public seek(time: number) {
    this.currentTime = time;
    if (this.audio && !this.isUsingSynth) {
      this.audio.currentTime = time;
    }
    this.notify();
  }

  // Web Audio generative ambient melodic synthesis for offline/fallback playback
  private startSynthPlayback() {
    this.isUsingSynth = true;
    this.isPlaying = true;

    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const rootFreq = this.currentTrack?.audioSynthFrequency || 220;
      const moodNotes = this.currentTrack?.mood === 'Gaming'
        ? [0, 3, 7, 10, 12]
        : this.currentTrack?.mood === 'Chill'
        ? [0, 4, 7, 11, 14]
        : this.currentTrack?.mood === 'Focus'
        ? [0, 2, 7, 9, 12]
        : [0, 4, 7, 9, 12]; // Feels good

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

        osc.type = this.currentTrack?.mood === 'Gaming' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, this.audioCtx.currentTime + 0.1);
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
