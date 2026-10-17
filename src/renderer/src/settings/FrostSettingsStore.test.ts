import { describe, expect, it } from 'vitest';
import { FrostSettingsStore } from './FrostSettingsStore';

function createStorage(initialValue?: string): Storage {
  const map = new Map<string, string>();
  if (initialValue) {
    map.set('frost-player.settings', initialValue);
  }

  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    length: map.size
  } as Storage;
}

describe('FrostSettingsStore', () => {
  it('loads defaults and applies valid updates', () => {
    const store = new FrostSettingsStore(createStorage());
    const defaults = store.load();

    expect(defaults.data.theme).toBe('dark');
    expect(defaults.data.volume).toBe(80);
    expect(defaults.data.language).toBe('en');

    const updated = store.save({ language: 'ar', volume: 62, reducedMotion: true });
    expect(updated.language).toBe('ar');
    expect(updated.volume).toBe(62);
    expect(updated.reducedMotion).toBe(true);
  });

  it('resets invalid data and clamps out-of-range values', () => {
    const store = new FrostSettingsStore(createStorage(JSON.stringify({
      theme: 'neon',
      language: 'fr',
      volume: 900,
      customEq: [20, 0, -30, 200],
      windowBounds: { width: 400, height: 200 }
    })));

    const loaded = store.load();
    expect(loaded.data.theme).toBe('dark');
    expect(loaded.data.language).toBe('en');
    expect(loaded.data.volume).toBe(100);
    expect(loaded.data.customEq).toEqual([12, 0, -12, 12]);
    expect(loaded.data.windowBounds.width).toBeGreaterThanOrEqual(900);
  });

  it('clears only playback library references while keeping preferences', () => {
    const store = new FrostSettingsStore(createStorage());
    store.save({ lastTrackId: 'track-1', lastPlaylistId: 'playlist-1', lastPlaybackPosition: 124 });
    store.clearLibraryData();

    const loaded = store.load();
    expect(loaded.data.lastTrackId).toBeUndefined();
    expect(loaded.data.lastPlaylistId).toBeUndefined();
    expect(loaded.data.lastPlaybackPosition).toBe(0);
  });

  it('returns versioned migration metadata', () => {
    const store = new FrostSettingsStore(createStorage());
    expect(store.migrationPlan()).toEqual([
      expect.objectContaining({
        fromVersion: 0,
        toVersion: 1,
        notes: expect.any(Array)
      })
    ]);
  });
});
