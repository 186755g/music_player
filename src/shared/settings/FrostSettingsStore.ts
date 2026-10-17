import type {
  AppLanguage,
  AppSettings,
  AppThemeMode,
  FrostSettingsMigrationPlan,
  FrostSettingsRecord,
  FrostSettingsStoreState
} from '../types';

const STORAGE_KEY = 'frost-player.settings';
const STORAGE_VERSION = 1;
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#7cc8ff',
  volume: 80,
  equalizerPreset: 'Flat',
  language: 'en',
  reducedMotion: false,
  visualizerMode: 'real',
  windowBounds: {
    width: 1400,
    height: 900,
    x: 100,
    y: 90,
    isMaximized: false
  },
  muted: false,
  lastTrackId: undefined,
  lastPlaybackPosition: 0,
  lastPlaylistId: undefined,
  customEq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

export class FrostSettingsStore {
  private readonly storage: Storage;

  constructor(storage: Storage = globalThis.localStorage) {
    this.storage = storage;
  }

  public load(): FrostSettingsStoreState {
    const fallback: FrostSettingsRecord = {
      ...DEFAULT_SETTINGS,
      schemaVersion: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    };

    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        return { schemaVersion: STORAGE_VERSION, data: fallback };
      }

      const parsed = JSON.parse(raw) as Partial<FrostSettingsRecord>;
      const merged = this.mergeWithDefaults(parsed, fallback);
      return {
        schemaVersion: STORAGE_VERSION,
        data: merged
      };
    } catch {
      return {
        schemaVersion: STORAGE_VERSION,
        data: fallback,
        lastError: 'Stored settings were invalid and were reset to defaults.'
      };
    }
  }

  public save(value: Partial<AppSettings>): FrostSettingsRecord {
    const current = this.load().data;
    const merged = this.mergeWithDefaults(value, current);
    const record: FrostSettingsRecord = {
      ...merged,
      schemaVersion: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    };

    this.storage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  }

  public update<K extends keyof AppSettings>(key: K, value: AppSettings[K]): FrostSettingsRecord {
    return this.save({ [key]: value } as Partial<AppSettings>);
  }

  public reset(): FrostSettingsRecord {
    const reset = {
      ...DEFAULT_SETTINGS,
      schemaVersion: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    };

    this.storage.setItem(STORAGE_KEY, JSON.stringify(reset));
    return reset;
  }

  public clearLibraryData(): void {
    const current = this.load().data;
    const next = {
      ...current,
      lastTrackId: undefined,
      lastPlaybackPosition: 0,
      lastPlaylistId: undefined,
      updatedAt: new Date().toISOString()
    };
    this.storage.setItem(STORAGE_KEY, JSON.stringify({ ...next, schemaVersion: STORAGE_VERSION }));
  }

  public getTheme(): AppThemeMode {
    return this.load().data.theme ?? 'dark';
  }

  public getLanguage(): AppLanguage {
    return this.load().data.language ?? 'en';
  }

  public sanitizeWindowBounds(bounds: Partial<AppSettings['windowBounds']>): AppSettings['windowBounds'] {
    const safeWidth = clampNumber(bounds.width ?? DEFAULT_SETTINGS.windowBounds.width, 900, 2200);
    const safeHeight = clampNumber(bounds.height ?? DEFAULT_SETTINGS.windowBounds.height, 640, 1600);
    const safeX = Number.isFinite(bounds.x) ? bounds.x! : DEFAULT_SETTINGS.windowBounds.x;
    const safeY = Number.isFinite(bounds.y) ? bounds.y! : DEFAULT_SETTINGS.windowBounds.y;

    return {
      width: safeWidth,
      height: safeHeight,
      x: safeX,
      y: safeY,
      isMaximized: Boolean(bounds.isMaximized)
    };
  }

  public migrationPlan(): FrostSettingsMigrationPlan[] {
    return [{
      fromVersion: 0,
      toVersion: STORAGE_VERSION,
      notes: [
        'Initial settings schema for Frost Player.',
        'Added theme, language, playback restore policy, and media visualizer preferences.',
        'Library state remains separate from user preferences and is never auto-recreated from old settings.'
      ]
    }];
  }

  private mergeWithDefaults(partial: Partial<FrostSettingsRecord>, fallback: FrostSettingsRecord): FrostSettingsRecord {
    const next: FrostSettingsRecord = {
      ...fallback,
      ...partial,
      theme: this.normalizeTheme(partial.theme ?? fallback.theme),
      language: this.normalizeLanguage(partial.language ?? fallback.language),
      accentColor: typeof partial.accentColor === 'string' ? partial.accentColor : fallback.accentColor,
      volume: clampNumber(partial.volume ?? fallback.volume, 0, 100),
      equalizerPreset: typeof partial.equalizerPreset === 'string' ? partial.equalizerPreset : fallback.equalizerPreset,
      reducedMotion: Boolean(partial.reducedMotion),
      visualizerMode: partial.visualizerMode === 'demo' || partial.visualizerMode === 'off' || partial.visualizerMode === 'real'
        ? partial.visualizerMode
        : fallback.visualizerMode,
      windowBounds: this.sanitizeWindowBounds(partial.windowBounds ?? fallback.windowBounds),
      muted: Boolean(partial.muted),
      lastPlaybackPosition: clampNumber(partial.lastPlaybackPosition ?? fallback.lastPlaybackPosition ?? 0, 0, Number.MAX_SAFE_INTEGER),
      customEq: Array.isArray(partial.customEq) ? partial.customEq.slice(0, 10).map((value) => clampNumber(value, -12, 12)) : fallback.customEq ?? DEFAULT_SETTINGS.customEq,
      schemaVersion: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    };

    return next;
  }

  private normalizeTheme(theme: AppThemeMode | undefined): AppThemeMode {
    return theme === 'dark' || theme === 'light' || theme === 'system' ? theme : 'dark';
  }

  private normalizeLanguage(language: AppLanguage | undefined): AppLanguage {
    return language === 'ar' || language === 'en' ? language : 'en';
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
