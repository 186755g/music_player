import type { LinuxMediaIntegrationState, MediaSessionMetadata, MediaSessionStatus } from '../../../../shared/types';

export interface FrostMediaSessionOptions {
  enabled?: boolean;
  hasDbus?: boolean;
  isLinux?: boolean;
}

export class FrostMediaSession {
  private readonly enabled: boolean;
  private readonly hasDbus: boolean;
  private readonly isLinux: boolean;
  private status: MediaSessionStatus = {
    isPlaying: false,
    canPause: true,
    canSeek: true,
    metadata: {},
    state: 'idle'
  };

  constructor(options: FrostMediaSessionOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.hasDbus = options.hasDbus ?? false;
    this.isLinux = options.isLinux ?? true;
  }

  public getIntegrationState(): LinuxMediaIntegrationState {
    if (!this.isLinux) {
      return {
        available: false,
        backend: 'none',
        hasDbus: false,
        needsUserAction: false,
        message: 'Linux media integration is unavailable outside Linux.'
      };
    }

    if (!this.enabled) {
      return {
        available: false,
        backend: 'none',
        hasDbus: this.hasDbus,
        needsUserAction: false,
        message: 'Media session integration is disabled in this build.'
      };
    }

    if (!this.hasDbus) {
      return {
        available: false,
        backend: 'none',
        hasDbus: false,
        needsUserAction: true,
        message: 'D-Bus is not available; local playback remains functional without Linux integration.'
      };
    }

    return {
      available: true,
      backend: 'media-session',
      hasDbus: true,
      needsUserAction: false,
      message: 'Media Session integration is supported when a compatible Linux session is active.'
    };
  }

  public updateStatus(next: Partial<MediaSessionStatus>): void {
    this.status = {
      ...this.status,
      ...next,
      metadata: next.metadata ?? this.status.metadata
    };
  }

  public setMetadata(metadata: MediaSessionMetadata): void {
    this.status.metadata = metadata;
  }

  public setPlaying(isPlaying: boolean): void {
    this.status.isPlaying = isPlaying;
    this.status.state = isPlaying ? 'playing' : 'paused';
  }

  public getStatus(): MediaSessionStatus {
    return { ...this.status, metadata: { ...this.status.metadata } };
  }

  public supportsMpris(): boolean {
    return this.enabled && this.hasDbus && this.isLinux;
  }

  public canUseMediaControl(): boolean {
    return this.supportsMpris() && this.status.isPlaying;
  }
}
