export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  sourcePath: string;
  coverArt?: string;
  mimeType?: string;
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface PlaylistItem {
  id: string;
  trackId: string;
  title: string;
  sourcePath: string;
  addedAt: string;
}

export interface EqualizerPreset {
  name: string;
  gains: number[];
}

export interface LibraryScanResult {
  tracks: AudioTrack[];
  errors: string[];
}

export type AudioImportStatus = 'imported' | 'unsupported' | 'unavailable' | 'cancelled';

export interface AudioImportError {
  code: 'unsupported-extension' | 'empty-file' | 'not-regular-file' | 'not-readable' | 'signature-mismatch' | 'not-accessible' | 'cancelled';
  message: string;
  path?: string;
}

export interface LibraryImportEntry {
  id: string;
  path: string;
  name: string;
  extension: string;
  sizeBytes?: number;
  status: AudioImportStatus;
  reason?: string;
  addedAt: string;
}

export interface LibraryImportResult {
  cancelled: boolean;
  files: LibraryImportEntry[];
  errors: AudioImportError[];
  importedCount: number;
  unsupportedCount: number;
  source: 'files' | 'directory' | 'none';
}

export interface PersistedLibraryRecord {
  version: number;
  lastUpdated: string;
  entries: LibraryImportEntry[];
}

export type AppThemeMode = 'dark' | 'light' | 'system';
export type AppLanguage = 'en' | 'ar';

export interface AppSettings {
  theme: AppThemeMode;
  accentColor: string;
  volume: number;
  equalizerPreset: string;
  language: AppLanguage;
  reducedMotion: boolean;
  visualizerMode: 'real' | 'demo' | 'off';
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized?: boolean;
  };
  muted: boolean;
  lastTrackId?: string;
  lastPlaybackPosition?: number;
  lastPlaylistId?: string;
  customEq?: number[];
}

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

export type LibrarySortMode = 'name' | 'artist' | 'album' | 'duration' | 'addedAt';
export type LibrarySearchTarget = 'title' | 'artist' | 'album' | 'filename';
export type LibraryAvailability = 'available' | 'unavailable' | 'missing';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
  fileName?: string;
  mimeType?: string;
  coverArt?: string;
  addedAt: string;
  sourcePath: string;
  isMissing?: boolean;
  availability: LibraryAvailability;
}

export interface LibraryEntry extends AudioMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  filename: string;
  durationSeconds: number;
  trackNumber?: number;
  genre?: string;
  coverArt?: string;
}

export interface PlaylistEntry {
  id: string;
  libraryId: string;
  order: number;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  isSmart?: boolean;
}

export interface PlaylistSnapshot {
  playlistId: string;
  playlistName: string;
  tracks: LibraryEntry[];
  currentTrackId?: string;
  currentIndex: number;
  lastUpdated: string;
}

export interface LibraryStoreState {
  entries: LibraryEntry[];
  playlists: Playlist[];
  currentPlaylistId?: string;
  currentTrackId?: string;
  searchTerm: string;
  sortMode: LibrarySortMode;
  activeFilters: string[];
}

export interface PresetDefinition {
  id: string;
  name: string;
  gains: number[];
  isCustom?: boolean;
}

export interface EqualizerBandConfig {
  frequency: number;
  label: string;
  q: number;
  gainDb: number;
  type: BiquadFilterType;
}

export interface SavedEqualizerPreset extends PresetDefinition {
  createdAt: string;
  updatedAt: string;
}

export interface EqualizerRuntimeState {
  enabled: boolean;
  activePresetId: string;
  bands: number[];
  clipped: boolean;
  clipProtectionApplied: boolean;
  error?: string;
}

export interface FrostSettingsRecord extends AppSettings {
  schemaVersion: number;
  updatedAt: string;
}

export interface FrostSettingsMigrationPlan {
  fromVersion: number;
  toVersion: number;
  notes: string[];
}

export interface FrostSettingsStoreState {
  schemaVersion: number;
  data: FrostSettingsRecord;
  lastError?: string;
}

export interface MediaSessionMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  artwork?: string;
}

export interface MediaSessionStatus {
  isPlaying: boolean;
  canPause: boolean;
  canSeek: boolean;
  metadata: MediaSessionMetadata;
  state: 'playing' | 'paused' | 'stopped' | 'idle';
}

export interface LinuxMediaIntegrationState {
  available: boolean;
  backend: 'none' | 'media-session' | 'mpris';
  hasDbus: boolean;
  needsUserAction: boolean;
  message?: string;
}

export type VisualizerMode = 'real' | 'demo' | 'idle';

export interface AlbumArtVisualizerState {
  enabled: boolean;
  visible: boolean;
  rotationVelocity: number;
  amplitude: number;
  mode: VisualizerMode;
  reducedMotion: boolean;
  isPlaying: boolean;
}

export interface AudioSpectrumSample {
  frequencyBinCount: number;
  average: number;
  peak: number;
  low: number;
  mid: number;
  high: number;
  normalized: number;
}

export interface LyricsMetadata {
  title?: string;
  artist?: string;
  album?: string;
  offset?: number;
}

export interface LyricsLineRecord {
  index: number;
  time: number;
  text: string;
  raw: string;
}

export interface LyricsParseError {
  lineNumber: number;
  message: string;
  raw?: string;
}

export interface ParsedLyricsDocument {
  metadata: LyricsMetadata;
  lines: LyricsLineRecord[];
  errors: LyricsParseError[];
  status: 'ready' | 'empty' | 'invalid';
}

export interface LyricsServiceState {
  activeIndex: number;
  activeTime: number;
  isAutoScrollEnabled: boolean;
  hasLyrics: boolean;
  message: string | null;
}

export interface LocalLyricsAssociation {
  trackId: string;
  lrcPath: string;
  title?: string;
  artist?: string;
  updatedAt: string;
}
