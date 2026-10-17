import type { AudioTrack } from '../../../shared/types';

export type AudioEngineState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioEngineSnapshot {
  state: AudioEngineState;
  currentTrack: AudioTrack | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  error: string | null;
}

export class FrostAudioEngine {
  private readonly audio: HTMLAudioElement;
  private readonly listeners = new Set<(snapshot: AudioEngineSnapshot) => void>();
  private readonly eventHandlers: Record<string, EventListener>;
  private readonly fallbackTrackSource = 'file://';

  private tracks: AudioTrack[] = [];
  private currentIndex = -1;
  private volumePercent = 80;
  private muted = false;
  private repeatMode: RepeatMode = 'off';
  private shuffle = false;
  private state: AudioEngineState = 'idle';
  private errorMessage: string | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destroyed = false;
  private playbackGuard: Promise<void> | null = null;

  constructor(initialTracks: AudioTrack[] = [], listener?: (snapshot: AudioEngineSnapshot) => void) {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = 0.8;

    this.eventHandlers = {
      timeupdate: () => {
        if (this.state === 'loading' && this.audio.currentTime > 0) {
          this.state = 'playing';
        }
        this.emit();
      },
      loadedmetadata: () => {
        this.state = this.state === 'loading' ? 'paused' : this.state;
        this.emit();
      },
      play: () => {
        this.state = 'playing';
        this.errorMessage = null;
        this.emit();
      },
      pause: () => {
        if (this.audio.currentTime >= (this.audio.duration || 0) && this.audio.duration > 0) {
          this.state = 'ended';
        } else if (this.state !== 'error') {
          this.state = 'paused';
        }
        this.emit();
      },
      ended: () => {
        this.handleEnded();
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = this.describeAudioError();
        this.emit();
      },
      waiting: () => {
        if (this.state !== 'error') {
          this.state = 'loading';
          this.emit();
        }
      },
      canplay: () => {
        if (this.state === 'loading') {
          this.state = 'paused';
        }
        this.emit();
      }
    };

    Object.entries(this.eventHandlers).forEach(([eventName, handler]) => {
      this.audio.addEventListener(eventName, handler);
    });

    if (listener) {
      this.listeners.add(listener);
    }

    this.setPlaylist(initialTracks, 0);
  }

  public subscribe(listener: (snapshot: AudioEngineSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  public getSnapshot(): AudioEngineSnapshot {
    const duration = Number.isFinite(this.audio.duration) && this.audio.duration > 0 ? this.audio.duration : 0;
    return {
      state: this.state,
      currentTrack: this.getCurrentTrack(),
      currentTime: Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0,
      duration,
      volume: this.volumePercent,
      muted: this.muted,
      repeatMode: this.repeatMode,
      shuffle: this.shuffle,
      error: this.errorMessage
    };
  }

  public setPlaylist(tracks: AudioTrack[], startIndex = 0): void {
    if (this.destroyed) {
      return;
    }

    const validTracks = Array.isArray(tracks)
      ? tracks.filter((track) => Boolean(track) && typeof track.sourcePath === 'string' && track.sourcePath.length > 0)
      : [];

    this.tracks = validTracks;

    if (validTracks.length === 0) {
      this.currentIndex = -1;
      this.state = 'idle';
      this.errorMessage = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.emit();
      return;
    }

    this.currentIndex = Math.min(Math.max(startIndex, 0), validTracks.length - 1);
    void this.loadTrack(validTracks[this.currentIndex], false);
  }

  public async play(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    if (this.playbackGuard) {
      await this.playbackGuard;
      return;
    }

    if (this.tracks.length === 0) {
      this.state = 'idle';
      this.errorMessage = 'No playable track is available.';
      this.emit();
      return;
    }

    if (this.currentIndex < 0) {
      this.currentIndex = 0;
    }

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) {
      this.state = 'error';
      this.errorMessage = 'The active track is missing.';
      this.emit();
      return;
    }

    if (!this.audio.src) {
      this.audio.src = this.normalizeFileSource(currentTrack.sourcePath);
      this.audio.load();
    }

    const operation = (async () => {
      try {
        await this.ensureAudioGraph();
        this.state = 'loading';
        this.errorMessage = null;
        this.emit();
        await this.audio.play();
        this.state = 'playing';
        this.errorMessage = null;
        this.emit();
      } catch (error) {
        this.state = 'error';
        this.errorMessage = this.describePlaybackError(error);
        this.emit();
      } finally {
        this.playbackGuard = null;
      }
    })();

    this.playbackGuard = operation;
    await operation;
  }

  public pause(): void {
    if (this.destroyed || this.audio.paused) {
      return;
    }

    this.audio.pause();
    this.state = 'paused';
    this.errorMessage = null;
    this.emit();
  }

  public async resume(): Promise<void> {
    if (this.destroyed || this.state === 'playing') {
      return;
    }

    if (this.playbackGuard) {
      await this.playbackGuard;
      return;
    }

    const track = this.getCurrentTrack();
    if (!track) {
      return;
    }

    if (!this.audio.src) {
      this.audio.src = this.normalizeFileSource(track.sourcePath);
      this.audio.load();
    }

    await this.play();
  }

  public stop(): void {
    if (this.destroyed) {
      return;
    }

    this.audio.pause();
    this.audio.currentTime = 0;
    this.state = 'idle';
    this.errorMessage = null;
    this.emit();
  }

  public async playTrack(index: number, autoPlay = true): Promise<void> {
    if (this.destroyed || this.tracks.length === 0) {
      return;
    }

    const safeIndex = Math.min(Math.max(index, 0), this.tracks.length - 1);
    this.currentIndex = safeIndex;
    await this.loadTrack(this.tracks[safeIndex], autoPlay);
  }

  public async next(): Promise<void> {
    if (this.destroyed || this.tracks.length === 0) {
      return;
    }

    const nextIndex = this.resolveNextIndex();
    if (nextIndex === -1) {
      this.state = 'ended';
      this.errorMessage = null;
      this.emit();
      return;
    }

    this.currentIndex = nextIndex;
    await this.loadTrack(this.tracks[nextIndex], true);
  }

  public async previous(): Promise<void> {
    if (this.destroyed || this.tracks.length === 0) {
      return;
    }

    const previousIndex = this.resolvePreviousIndex();
    if (previousIndex === -1) {
      this.audio.currentTime = 0;
      this.state = 'paused';
      this.emit();
      return;
    }

    this.currentIndex = previousIndex;
    await this.loadTrack(this.tracks[previousIndex], true);
  }

  public seekTo(seconds: number): void {
    if (this.destroyed || !Number.isFinite(seconds)) {
      return;
    }

    const maxSeconds = Number.isFinite(this.audio.duration) && this.audio.duration > 0 ? this.audio.duration : 0;
    const safeTarget = maxSeconds > 0 ? Math.min(Math.max(seconds, 0), maxSeconds) : Math.max(seconds, 0);
    this.audio.currentTime = safeTarget;
    this.emit();
  }

  public setVolume(value: number): void {
    const clamped = Math.min(Math.max(value, 0), 100);
    this.volumePercent = clamped;
    const normalized = this.muted ? 0 : clamped / 100;
    this.audio.volume = normalized;
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(normalized, this.audioContext.currentTime);
    }
    this.emit();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    const normalized = muted ? 0 : this.volumePercent / 100;
    this.audio.volume = normalized;
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(normalized, this.audioContext.currentTime);
    }
    this.emit();
  }

  public toggleMute(): void {
    this.setMuted(!this.muted);
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
    this.emit();
  }

  public setShuffle(value: boolean): void {
    this.shuffle = value;
    this.emit();
  }

  public destroy(): void {
    this.destroyed = true;
    this.playbackGuard = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();

    Object.entries(this.eventHandlers).forEach(([eventName, handler]) => {
      this.audio.removeEventListener(eventName, handler);
    });

    this.mediaSourceNode?.disconnect();
    this.analyserNode?.disconnect();
    this.gainNode?.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }

    this.audioContext = null;
    this.gainNode = null;
    this.mediaSourceNode = null;
    this.analyserNode = null;
    this.listeners.clear();
  }

  private async loadTrack(track: AudioTrack, autoPlay: boolean): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.state = 'loading';
    this.errorMessage = null;
    this.audio.src = this.normalizeFileSource(track.sourcePath);
    this.audio.load();
    this.audio.currentTime = 0;
    this.emit();

    if (autoPlay) {
      await this.play();
    }
  }

  private async ensureAudioGraph(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioCtor();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.volumePercent / 100;
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.82;
      this.mediaSourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.mediaSourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private resolveNextIndex(): number {
    if (this.tracks.length === 0) {
      return -1;
    }

    if (this.shuffle) {
      const nextIndex = Math.floor(Math.random() * this.tracks.length);
      return nextIndex === this.currentIndex ? (this.currentIndex + 1) % this.tracks.length : nextIndex;
    }

    if (this.currentIndex >= this.tracks.length - 1) {
      return this.repeatMode === 'all' ? 0 : -1;
    }

    return this.currentIndex + 1;
  }

  private resolvePreviousIndex(): number {
    if (this.tracks.length === 0) {
      return -1;
    }

    if (this.shuffle) {
      const randomIndex = Math.floor(Math.random() * this.tracks.length);
      return randomIndex === this.currentIndex ? (this.currentIndex + this.tracks.length - 1) % this.tracks.length : randomIndex;
    }

    if (this.currentIndex <= 0) {
      return this.repeatMode === 'all' ? this.tracks.length - 1 : 0;
    }

    return this.currentIndex - 1;
  }

  private getCurrentTrack(): AudioTrack | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) {
      return null;
    }

    return this.tracks[this.currentIndex] ?? null;
  }

  private handleEnded(): void {
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      void this.play();
      return;
    }

    if (this.tracks.length === 0) {
      this.state = 'ended';
      this.errorMessage = null;
      this.emit();
      return;
    }

    const nextIndex = this.resolveNextIndex();
    if (nextIndex === -1) {
      this.state = 'ended';
      this.errorMessage = null;
      this.emit();
      return;
    }

    this.currentIndex = nextIndex;
    void this.loadTrack(this.tracks[nextIndex], true);
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  private normalizeFileSource(sourcePath: string): string {
    if (!sourcePath) {
      return this.fallbackTrackSource;
    }

    if (sourcePath.startsWith('file://')) {
      return sourcePath;
    }

    const normalized = sourcePath.replace(/\\/g, '/');

    if (normalized.startsWith('/')) {
      return `file://${normalized}`;
    }

    if (/^[A-Za-z]:\//.test(normalized)) {
      return `file:///${normalized}`;
    }

    return sourcePath;
  }

  private describePlaybackError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to start audio playback. The file may be damaged or unsupported.';
  }

  private describeAudioError(): string {
    const nativeError = this.audio.error;
    if (nativeError) {
      switch (nativeError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          return 'Playback was aborted.';
        case MediaError.MEDIA_ERR_NETWORK:
          return 'There was a network problem while loading the file.';
        case MediaError.MEDIA_ERR_DECODE:
          return 'The audio file could not be decoded.';
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          return 'This file format is not supported by the player.';
        default:
          return 'The audio file is not available or is corrupted.';
      }
    }

    return this.errorMessage ?? 'The audio file could not be played.';
  }

  private emit(): void {
    if (this.destroyed) {
      return;
    }

    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
