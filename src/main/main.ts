import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { accessSync, constants, closeSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FrostSettingsStore } from '../shared/settings/FrostSettingsStore';
import type { AudioImportError, LibraryImportEntry, LibraryImportResult, PersistedLibraryRecord } from '../shared/types';

const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus']);
const LIBRARY_STORAGE_FILE = join(app.getPath('userData'), 'frost-library.json');
const SETTINGS_STORAGE_FILE = join(app.getPath('userData'), 'frost-settings.json');

const isDev = !app.isPackaged;
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const preloadPath = join(__dirname, '..', 'preload', 'index.js');

const settingsAdapter = {
  getItem: (key: string): string | null => {
    try {
      const path = join(app.getPath('userData'), `${key}.json`);
      const raw = readFileSync(path, 'utf-8');
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      const dir = app.getPath('userData');
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `${key}.json`);
      writeFileSync(path, value, 'utf-8');
    } catch {
      // no-op to keep persistence best effort without blocking UI
    }
  },
  removeItem: (key: string): void => {
    try {
      const path = join(app.getPath('userData'), `${key}.json`);
      const file = readFileSync(path, 'utf-8');
      if (file) {
        // intentionally no-op if read fails; the file will be ignored as stale
      }
    } catch {
      // no-op
    }
  }
} as Storage;

const frostSettingsStore = new FrostSettingsStore(settingsAdapter);

function getAppIconPath(): string {
  const candidates = [
    join(app.getAppPath(), 'resources', 'frost-player-icon.png'),
    join(app.getAppPath(), 'build', 'icons', 'frost-player.png'),
    join(app.getAppPath(), 'build', 'icons', 'icon.png')
  ];

  return candidates.find((candidate) => candidate && candidate.length > 0) ?? '';
}

function isCancelledError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'message' in error && String((error as { message?: string }).message).includes('cancelled');
}

function detectAudioSignature(filePath: string): boolean {
  try {
    const handle = openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const bytesRead = readSync(handle, buffer, 0, 12, 0);
    closeSync(handle);

    if (bytesRead < 4) {
      return false;
    }

    const ext = extname(filePath).toLowerCase();
    const header = buffer.toString('ascii', 0, 4);

    if (ext === '.mp3') {
      return (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
    }

    if (ext === '.wav') {
      return header === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
    }

    if (ext === '.flac') {
      return header === 'fLaC';
    }

    if (ext === '.ogg') {
      return header === 'OggS';
    }

    if (ext === '.opus') {
      return buffer.toString('ascii', 0, 8) === 'OpusHea';
    }

    if (ext === '.m4a' || ext === '.aac') {
      return header === 'ftyp' || buffer.toString('ascii', 4, 8) === 'ftyp';
    }

    return false;
  } catch {
    return false;
  }
}

function validateAudioPath(filePath: string): { valid: boolean; error?: AudioImportError; sizeBytes?: number } {
  const extension = extname(filePath).toLowerCase();

  if (!SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: {
        code: 'unsupported-extension',
        message: `Unsupported audio format for ${basename(filePath)}.`,
        path: filePath
      }
    };
  }

  try {
    const info = statSync(filePath);
    if (!info.isFile()) {
      return {
        valid: false,
        error: {
          code: 'not-regular-file',
          message: `Path is not a regular file: ${filePath}`,
          path: filePath
        }
      };
    }

    if (info.size <= 0) {
      return {
        valid: false,
        error: {
          code: 'empty-file',
          message: `File is empty: ${basename(filePath)}`,
          path: filePath
        }
      };
    }

    try {
      accessSync(filePath, constants.R_OK);
    } catch {
      return {
        valid: false,
        error: {
          code: 'not-readable',
          message: `File is not readable: ${basename(filePath)}`,
          path: filePath
        }
      };
    }

    if (!detectAudioSignature(filePath)) {
      return {
        valid: false,
        error: {
          code: 'signature-mismatch',
          message: `File signature does not match a supported audio format: ${basename(filePath)}`,
          path: filePath
        }
      };
    }

    return { valid: true, sizeBytes: info.size };
  } catch {
    return {
      valid: false,
      error: {
        code: 'not-accessible',
        message: `File cannot be accessed: ${filePath}`,
        path: filePath
      }
    };
  }
}

function createLibraryImportResult(source: 'files' | 'directory' | 'none', cancelled: boolean, files: LibraryImportEntry[], errors: AudioImportError[]): LibraryImportResult {
  return {
    cancelled,
    files,
    errors,
    importedCount: files.filter((entry) => entry.status === 'imported').length,
    unsupportedCount: files.filter((entry) => entry.status === 'unsupported').length,
    source
  };
}

function normalizeLibraryPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function sanitizePersistedLibrary(entries: LibraryImportEntry[]): LibraryImportEntry[] {
  const seen = new Set<string>();
  return entries
    .filter((entry) => Boolean(entry?.path) && typeof entry.path === 'string')
    .map((entry) => ({
      ...entry,
      id: entry.id || `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: basename(entry.path) || entry.name || 'Unknown track',
      extension: extname(entry.path).toLowerCase() || entry.extension || '',
      status: entry.status === 'imported' || entry.status === 'unsupported' || entry.status === 'unavailable' ? entry.status : 'unavailable',
      reason: entry.reason || undefined,
      addedAt: entry.addedAt || new Date().toISOString()
    }))
    .filter((entry) => {
      const key = normalizeLibraryPath(entry.path);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function readPersistedLibrary(): PersistedLibraryRecord & { error?: string } {
  try {
    const raw = readFileSync(LIBRARY_STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedLibraryRecord>;
    const entries = Array.isArray(parsed.entries) ? sanitizePersistedLibrary(parsed.entries) : [];

    return {
      version: 1,
      lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
      entries: entries.map((entry) => {
        try {
          const info = statSync(entry.path);
          return info.isFile() ? entry : { ...entry, status: 'unavailable' as const };
        } catch {
          return { ...entry, status: 'unavailable' as const };
        }
      })
    };
  } catch (error) {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      entries: [],
      error: error instanceof Error ? error.message : 'Stored library data was invalid and could not be restored.'
    };
  }
}

function writePersistedLibrary(entries: LibraryImportEntry[]): { record: PersistedLibraryRecord; error?: string } {
  const safeEntries = sanitizePersistedLibrary(entries);
  const record: PersistedLibraryRecord = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: safeEntries
  };

  try {
    mkdirSync(app.getPath('userData'), { recursive: true });
    writeFileSync(LIBRARY_STORAGE_FILE, JSON.stringify(record, null, 2), 'utf-8');
    return { record };
  } catch (error) {
    return {
      record,
      error: error instanceof Error ? error.message : 'Stored library data could not be written.'
    };
  }
}

function getDisplayTitle(filePath: string): string {
  const baseName = basename(filePath, extname(filePath)).trim();
  return baseName || basename(filePath).trim() || 'Unknown track';
}

function getDisplayArtist(filePath: string): string {
  const baseName = basename(filePath, extname(filePath));
  const segments = baseName
    .split(/[-_–—]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    return segments[0];
  }

  return 'Local library';
}

function buildImportEntry(filePath: string, status: LibraryImportEntry['status'], reason?: string): LibraryImportEntry {
  const extension = extname(filePath).toLowerCase();
  const stats = statSync(filePath);
  return {
    id: `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    path: filePath,
    name: basename(filePath),
    extension,
    sizeBytes: stats.size,
    status,
    reason: reason ?? (status === 'imported' ? undefined : 'Unsupported or unreadable file'),
    addedAt: new Date().toISOString()
  };
}

function scanDirectoryForAudio(directoryPath: string, maxDepth = 2): { files: LibraryImportEntry[]; errors: AudioImportError[] } {
  const results: LibraryImportEntry[] = [];
  const errors: AudioImportError[] = [];
  const seenPaths = new Set<string>();

  const walk = (currentPath: string, depth: number): void => {
    if (depth > maxDepth) {
      return;
    }

    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      errors.push({
        code: 'not-accessible',
        message: `Folder could not be accessed: ${currentPath}`,
        path: currentPath
      });
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const normalized = fullPath.replace(/\\/g, '/').toLowerCase();
      if (seenPaths.has(normalized)) {
        continue;
      }
      seenPaths.add(normalized);

      try {
        if (entry.isDirectory()) {
          walk(fullPath, depth + 1);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const ext = extname(fullPath).toLowerCase();
        if (!SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
          results.push({
            id: `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            path: fullPath,
            name: basename(fullPath),
            extension: ext,
            status: 'unsupported',
            reason: 'Unsupported audio format',
            addedAt: new Date().toISOString()
          });
          continue;
        }

        const validation = validateAudioPath(fullPath);
        if (validation.valid) {
          results.push({
            id: `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            path: fullPath,
            name: basename(fullPath),
            extension: ext,
            sizeBytes: validation.sizeBytes,
            status: 'imported',
            reason: undefined,
            addedAt: new Date().toISOString()
          });
          continue;
        }

        const error = validation.error ?? {
          code: 'not-accessible',
          message: 'File could not be read.',
          path: fullPath
        };

        errors.push(error);
        results.push({
          id: `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          path: fullPath,
          name: basename(fullPath),
          extension: ext,
          sizeBytes: validation.sizeBytes,
          status: 'unavailable',
          reason: error.message,
          addedAt: new Date().toISOString()
        });
      } catch {
        errors.push({
          code: 'not-accessible',
          message: `File could not be read: ${fullPath}`,
          path: fullPath
        });
      }
    }
  };

  walk(directoryPath, 0);

  return { files: results, errors };
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    title: 'Frost Player',
    icon: getAppIconPath() || undefined,
    backgroundColor: '#090b12',
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    roundedCorners: true,
    hasShadow: true,
    trafficLightPosition: { x: 18, y: 16 },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    // This placeholder intentionally leaves lifecycle management explicit.
  });
}

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('library:load', async () => {
  const record = readPersistedLibrary();
  return {
    version: record.version,
    lastUpdated: record.lastUpdated,
    entries: record.entries,
    error: record.error
  };
});

ipcMain.handle('library:save', async (_event, entries: LibraryImportEntry[]) => {
  const safeEntries = sanitizePersistedLibrary(Array.isArray(entries) ? entries : []);
  const result = writePersistedLibrary(safeEntries);
  return {
    version: result.record.version,
    lastUpdated: result.record.lastUpdated,
    entries: result.record.entries,
    error: result.error
  };
});

ipcMain.handle('library:clear', async () => {
  const result = writePersistedLibrary([]);
  return {
    version: result.record.version,
    lastUpdated: result.record.lastUpdated,
    entries: result.record.entries,
    error: result.error
  };
});

ipcMain.handle('settings:load', async () => frostSettingsStore.load());

ipcMain.handle('settings:save', async (_event, partial: Partial<Record<string, unknown>>) => {
  return frostSettingsStore.save(partial as Record<string, unknown>);
});

ipcMain.handle('settings:reset', async () => frostSettingsStore.reset());

ipcMain.handle('settings:clearLibraryData', async () => {
  frostSettingsStore.clearLibraryData();
  return frostSettingsStore.load();
});

ipcMain.handle('library:select-files', async (): Promise<LibraryImportResult> => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Import music files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio files', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return createLibraryImportResult('files', true, [], [{ code: 'cancelled', message: 'File selection was cancelled.' }]);
    }

    const collected: LibraryImportEntry[] = [];
    const errors: AudioImportError[] = [];
    const seenPaths = new Set<string>();

    for (const filePath of result.filePaths) {
      const normalized = filePath.replace(/\\/g, '/').toLowerCase();
      if (seenPaths.has(normalized)) {
        continue;
      }
      seenPaths.add(normalized);

      const validation = validateAudioPath(filePath);
      if (validation.valid) {
        collected.push({
          id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          path: filePath,
          name: basename(filePath),
          extension: extname(filePath).toLowerCase(),
          sizeBytes: validation.sizeBytes,
          status: 'imported',
          addedAt: new Date().toISOString()
        });
        continue;
      }

      const unsupported: LibraryImportEntry = {
        id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        path: filePath,
        name: basename(filePath),
        extension: extname(filePath).toLowerCase(),
        status: 'unsupported',
        reason: validation.error?.message ?? 'Unsupported file',
        addedAt: new Date().toISOString()
      };

      collected.push(unsupported);
      if (validation.error) {
        errors.push(validation.error);
      }
    }

    const finalEntries = sanitizePersistedLibrary(collected);
    writePersistedLibrary(finalEntries);
    return createLibraryImportResult('files', false, finalEntries, errors);
  } catch (error) {
    return createLibraryImportResult('files', false, [], [{
      code: 'not-accessible',
      message: isCancelledError(error) ? 'Selection cancelled.' : 'The import dialog could not be opened.',
      path: undefined
    }]);
  }
});

ipcMain.handle('library:select-folder', async (): Promise<LibraryImportResult> => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Choose music library folder',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return createLibraryImportResult('directory', true, [], [{ code: 'cancelled', message: 'Directory selection was cancelled.' }]);
    }

    const selectedDirectory = result.filePaths[0];
    const directoryInfo = statSync(selectedDirectory);

    if (!directoryInfo.isDirectory()) {
      return createLibraryImportResult('directory', false, [], [{
        code: 'not-regular-file',
        message: 'Selected path is not a directory.',
        path: selectedDirectory
      }]);
    }

    const { files, errors } = scanDirectoryForAudio(selectedDirectory, 2);
    const finalEntries = sanitizePersistedLibrary(files);
    writePersistedLibrary(finalEntries);
    return createLibraryImportResult('directory', false, finalEntries, errors);
  } catch (error) {
    return createLibraryImportResult('directory', false, [], [{
      code: 'not-accessible',
      message: isCancelledError(error) ? 'Selection cancelled.' : 'The library folder could not be opened.',
      path: undefined
    }]);
  }
});

ipcMain.handle('library:scan', async (_event, directory: string) => {
  if (!directory || typeof directory !== 'string') {
    return { tracks: [], errors: ['Directory path is missing or invalid.'] };
  }

  try {
    const info = statSync(directory);
    if (!info.isDirectory()) {
      return { tracks: [], errors: ['Selected path is not a directory.'] };
    }

    const { files, errors } = scanDirectoryForAudio(directory, 2);
    const validFiles = sanitizePersistedLibrary(files);
    const tracks = validFiles
      .filter((entry) => entry.status === 'imported')
      .map((entry) => ({
        id: entry.id,
        title: getDisplayTitle(entry.path),
        artist: getDisplayArtist(entry.path),
        album: 'Imported library',
        duration: 0,
        sourcePath: entry.path,
        mimeType: entry.extension ? `audio/${entry.extension.replace('.', '')}` : 'audio/mpeg'
      }));

    return { tracks, errors: errors.map((error) => error.message) };
  } catch {
    return { tracks: [], errors: ['The selected directory could not be scanned.'] };
  }
});

ipcMain.handle('player:play', async (_event, trackId: string) => ({
  ok: true,
  trackId,
  status: 'deferred'
}));

ipcMain.handle('player:pause', async () => ({ ok: true, status: 'deferred' }));
ipcMain.handle('lyrics:sync', async (_event, trackId: string) => ({
  ok: true,
  trackId,
  lines: []
}));

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
