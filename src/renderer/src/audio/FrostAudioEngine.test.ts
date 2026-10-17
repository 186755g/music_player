import { beforeEach, describe, expect, it } from 'vitest';
import type { AudioTrack } from '../../../shared/types';
import { FrostAudioEngine } from './FrostAudioEngine';

class FakeGainNode {
  public gain = {
    value: 1,
    setValueAtTime: () => undefined
  };

  public connect = () => undefined;
  public disconnect = () => undefined;
}

class FakeAnalyserNode {
  public fftSize = 2048;
  public smoothingTimeConstant = 0.82;
  public frequencyBinCount = 512;
  public connect = () => undefined;
  public disconnect = () => undefined;
  public getByteFrequencyData = () => undefined;
}

class FakeMediaElementSourceNode {
  public connect = () => undefined;
  public disconnect = () => undefined;
}

class FakeAudioContext {
  public state: 'running' | 'suspended' | 'closed' = 'running';
  public currentTime = 0;
  public destination = {};

  public createGain() {
    return new FakeGainNode();
  }

  public createAnalyser() {
    return new FakeAnalyserNode();
  }

  public createMediaElementSource() {
    return new FakeMediaElementSourceNode();
  }

  public async resume() {
    this.state = 'running';
  }

  public async close() {
    this.state = 'closed';
  }
}

class FakeAudio {
  public currentTime = 0;
  public duration = 0;
  public preload = 'auto';
  public volume = 1;
  public paused = true;
  public src = '';
  public error: MediaError | null = null;
  public listeners = new Map<string, Set<EventListener>>();

  public addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  public removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  public async play() {
    this.paused = false;
    this.dispatch('play');
  }

  public pause() {
    this.paused = true;
    this.dispatch('pause');
  }

  public load() {
    this.dispatch('loadedmetadata');
  }

  private dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }
}

describe('FrostAudioEngine', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'Audio', {
      configurable: true,
      writable: true,
      value: FakeAudio
    });

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext
    });
  });

  it('chooses the next and previous tracks while honoring repeat and shuffle rules', async () => {
    const tracks: AudioTrack[] = [
      { id: '1', title: 'One', artist: 'A', album: 'Alpha', duration: 100, sourcePath: '/music/one.mp3' },
      { id: '2', title: 'Two', artist: 'B', album: 'Alpha', duration: 120, sourcePath: '/music/two.mp3' },
      { id: '3', title: 'Three', artist: 'C', album: 'Alpha', duration: 140, sourcePath: '/music/three.mp3' }
    ];

    const engine = new FrostAudioEngine(tracks);
    (engine as any).currentIndex = 0;

    await engine.next();
    expect((engine as any).currentIndex).toBe(1);

    await engine.previous();
    expect((engine as any).currentIndex).toBe(0);

    engine.setRepeatMode('all');
    await engine.next();
    await engine.next();
    await engine.next();
    expect((engine as any).currentIndex).toBe(0);

    engine.setShuffle(true);
    const index = (engine as any).currentIndex;
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(tracks.length);
  });

  it('keeps time and progress within safe bounds and updates snapshots', () => {
    const engine = new FrostAudioEngine([{
      id: '1',
      title: 'Time',
      artist: 'A',
      album: 'B',
      duration: 210,
      sourcePath: '/music/time.mp3'
    }]);

    const audio = (engine as any).audio as FakeAudio;
    audio.duration = 210;
    audio.currentTime = 75;

    engine.seekTo(999);
    expect(audio.currentTime).toBe(210);

    engine.seekTo(-3);
    expect(audio.currentTime).toBe(0);

    const snapshot = engine.getSnapshot();
    expect(snapshot.currentTime).toBe(0);
    expect(snapshot.duration).toBe(210);
  });

  it('stores repeat and shuffle settings without mutating the playlist', () => {
    const engine = new FrostAudioEngine([
      { id: '1', title: 'A', artist: 'X', album: 'Y', duration: 100, sourcePath: '/music/a.mp3' },
      { id: '2', title: 'B', artist: 'X', album: 'Y', duration: 80, sourcePath: '/music/b.mp3' }
    ]);

    engine.setRepeatMode('one');
    engine.setShuffle(true);

    const snapshot = engine.getSnapshot();
    expect(snapshot.repeatMode).toBe('one');
    expect(snapshot.shuffle).toBe(true);
    expect((engine as any).tracks).toHaveLength(2);
  });
});
