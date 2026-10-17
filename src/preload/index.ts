import { contextBridge, ipcRenderer } from 'electron';
import type { FrostBridge } from '../shared/frost-bridge';
import type { AppSettings, LibraryImportEntry, LibraryImportResult } from '../shared/types';

const frostApi = {
  app: {
    getVersion: async (): Promise<string> => ipcRenderer.invoke('app:get-version')
  },
  library: {
    scan: async (directory: string) => ipcRenderer.invoke('library:scan', directory),
    selectFiles: async (): Promise<LibraryImportResult> => ipcRenderer.invoke('library:select-files'),
    selectFolder: async (): Promise<LibraryImportResult> => ipcRenderer.invoke('library:select-folder'),
    load: async (): Promise<{ entries: LibraryImportEntry[]; lastUpdated: string; version: number; error?: string }> => ipcRenderer.invoke('library:load'),
    save: async (entries: LibraryImportEntry[]) => ipcRenderer.invoke('library:save', entries),
    clear: async () => ipcRenderer.invoke('library:clear')
  },
  player: {
    play: async (trackId: string) => ipcRenderer.invoke('player:play', trackId),
    pause: async () => ipcRenderer.invoke('player:pause')
  },
  lyrics: {
    sync: async (trackId: string) => ipcRenderer.invoke('lyrics:sync', trackId)
  },
  settings: {
    load: async () => ipcRenderer.invoke('settings:load'),
    save: async (partial: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', partial),
    reset: async () => ipcRenderer.invoke('settings:reset'),
    clearLibraryData: async () => ipcRenderer.invoke('settings:clearLibraryData')
  }
};

contextBridge.exposeInMainWorld('frost', frostApi);

export type { FrostBridge };

export {};
