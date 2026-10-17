import type { AppSettings, LibraryImportEntry, LibraryImportResult } from './types';

export interface FrostBridge {
  app: {
    getVersion: () => Promise<string>;
  };
  library: {
    scan: (directory: string) => Promise<unknown>;
    selectFiles: () => Promise<LibraryImportResult>;
    selectFolder: () => Promise<LibraryImportResult>;
    load: () => Promise<{ entries: LibraryImportEntry[]; lastUpdated: string; version: number; error?: string }>;
    save: (entries: LibraryImportEntry[]) => Promise<{ entries: LibraryImportEntry[]; lastUpdated: string; version: number; error?: string }>;
    clear: () => Promise<{ entries: LibraryImportEntry[]; lastUpdated: string; version: number; error?: string }>;
  };
  player: {
    play: (trackId: string) => Promise<unknown>;
    pause: () => Promise<unknown>;
  };
  lyrics: {
    sync: (trackId: string) => Promise<unknown>;
  };
  settings: {
    load: () => Promise<unknown>;
    save: (partial: Partial<AppSettings>) => Promise<unknown>;
    reset: () => Promise<unknown>;
    clearLibraryData: () => Promise<unknown>;
  };
}

declare global {
  interface Window {
    frost: FrostBridge;
  }
}

export {};
