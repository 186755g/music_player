import type { AudioTrack } from '../shared/types';

export class AudioEngine {
  private tracks: AudioTrack[] = [];

  public loadTrack(track: AudioTrack): AudioTrack {
    this.tracks.push(track);
    return track;
  }

  public getCurrentTrack(): AudioTrack | null {
    return this.tracks[0] ?? null;
  }
}
