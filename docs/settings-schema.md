# Frost Player Settings and Restore Policy

## Scope

This document describes the persistable user preferences for Frost Player and the rules that prevent unsafe writes or hidden state restoration.

## Storage model

The current architecture uses the browser localStorage-backed settings store exposed through the safe preload API. This is intentionally limited to:

- playback preferences
- appearance preferences
- language and motion preferences
- last active playlist metadata
- last track metadata and current time snapshot
- current equalizer settings
- window bounds

No full audio files or media playlists are stored as binary blobs. The app stores references only, not file content.

## Persisted schema

```ts
interface FrostSettingsRecord {
  schemaVersion: number;
  theme: 'dark' | 'light' | 'system';
  language: 'en' | 'ar';
  volume: number;
  muted: boolean;
  equalizerPreset: string;
  customEq?: number[];
  reducedMotion: boolean;
  visualizerMode: 'real' | 'demo' | 'off';
  accentColor: string;
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized?: boolean;
  };
  lastTrackId?: string;
  lastPlaybackPosition?: number;
  lastPlaylistId?: string;
  updatedAt: string;
}
```

## Validation rules

- values outside allowed ranges are clamped or reset to default
- malformed JSON triggers a safe fallback to default settings
- invalid theme or language values fall back to dark and English
- window dimensions are clamped to safe minimums and cannot be restored outside the visible screen area
- playback restore is opt-in and never replays a stale track without user confirmation

## Restore policy

### UI settings restore

The UI restores theme, language, motion preferences, and equalizer values automatically because these are harmless and deterministic.

### Library and playlist restore

The app restores only metadata such as the last playlist id and track id, not the full library state from a stale, previously deleted collection. It never auto-resumes a track that may have been removed from the current library.

### Safe defaults

If settings are missing, invalid, or partially corrupt, Frost Player uses the following defaults:

- theme: dark
- language: en
- volume: 80
- muted: false
- visualizerMode: real
- reducedMotion: false
- equalizerPreset: Flat

## Reset logic

The Reset Settings action clears user preferences only. It does not delete the music library, playlist definitions, or local song metadata already indexed by the app.

### Reset vs clear library

- Reset Settings: clears UI preferences and playback state
- Clear Library Data: removes only the user-history references such as last track, last playlist, and saved playback position
- Delete library or playlists: removes the actual library entries and playlists, which is a separate destructive action and should be explicit

## Security and boundary rules

- no arbitrary filesystem writes are allowed from renderer code
- only safe JSON under localStorage is written
- no full file paths from the library are persisted as executable data
- no music file content is stored in settings
- settings access is exposed only through the secure preload bridge
