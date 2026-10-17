import { describe, expect, it } from 'vitest';
import { FrostLibraryService } from './FrostLibraryService';

describe('FrostLibraryService', () => {
  it('deduplicates entries and searches by title and artist', () => {
    const service = new FrostLibraryService();
    const entries = [
      {
        id: '1',
        title: 'Signal',
        artist: 'Luna',
        album: 'Night Drive',
        filename: 'signal.mp3',
        durationSeconds: 230,
        addedAt: '2024-01-01T12:00:00.000Z',
        sourcePath: '/music/signal.mp3',
        availability: 'available' as const,
        mimeType: 'audio/mpeg'
      },
      {
        id: '2',
        title: 'Signal',
        artist: 'Luna',
        album: 'Night Drive',
        filename: 'signal.mp3',
        durationSeconds: 230,
        addedAt: '2024-01-01T12:00:00.000Z',
        sourcePath: '/music/signal.mp3',
        availability: 'available' as const,
        mimeType: 'audio/mpeg'
      },
      {
        id: '3',
        title: 'Drift',
        artist: 'Orbit',
        album: 'Echoes',
        filename: 'drift.mp3',
        durationSeconds: 310,
        addedAt: '2024-01-02T12:00:00.000Z',
        sourcePath: '/music/drift.mp3',
        availability: 'available' as const,
        mimeType: 'audio/mpeg'
      }
    ];

    service.seed(entries);
    const deduped = service.dedupeEntries(entries);
    expect(deduped).toHaveLength(2);

    const search = service.search({ term: 'luna', targets: ['artist'] });
    expect(search[0].title).toBe('Signal');
  });

  it('creates playlists, adds and reorders tracks, and handles removals', () => {
    const service = new FrostLibraryService();
    service.seed([
      { id: 'a', title: 'A', artist: 'X', album: 'Y', filename: 'a.mp3', durationSeconds: 100, addedAt: '2024-01-01Z', sourcePath: '/music/a.mp3', availability: 'available', mimeType: 'audio/mpeg' },
      { id: 'b', title: 'B', artist: 'X', album: 'Y', filename: 'b.mp3', durationSeconds: 100, addedAt: '2024-01-01Z', sourcePath: '/music/b.mp3', availability: 'available', mimeType: 'audio/mpeg' },
      { id: 'c', title: 'C', artist: 'X', album: 'Y', filename: 'c.mp3', durationSeconds: 100, addedAt: '2024-01-01Z', sourcePath: '/music/c.mp3', availability: 'available', mimeType: 'audio/mpeg' }
    ]);

    const playlist = service.createPlaylist('Test playlist');
    service.addTrackToPlaylist(playlist.id, 'a');
    service.addTrackToPlaylist(playlist.id, 'b');
    service.addTrackToPlaylist(playlist.id, 'c');

    expect(service.getPlaylistSnapshot(playlist.id)?.tracks).toHaveLength(3);

    expect(service.reorderPlaylist(playlist.id, 0, 2)).toBe(true);
    const snapshot = service.getPlaylistSnapshot(playlist.id);
    expect(snapshot?.tracks[0].id).toBe('b');

    expect(service.removeTrackFromPlaylist(playlist.id, 'b')).toBe(true);
    expect(service.getPlaylistSnapshot(playlist.id)?.tracks).toHaveLength(2);
  });

  it('marks missing or unavailable entries and sanitizes metadata', () => {
    const service = new FrostLibraryService();
    service.seed([
      { id: 'm1', title: 'Missing', artist: 'A', album: 'B', filename: 'missing.mp3', durationSeconds: 120, addedAt: '2024-01-01Z', sourcePath: '/music/missing.mp3', availability: 'available', mimeType: 'audio/mpeg' }
    ]);

    expect(service.markUnavailable('m1', 'file removed')).toBe(true);
    expect(service.getState().entries[0].isMissing).toBe(true);

    const metadata = service.sanitizeMetadata({
      title: '   ',
      artist: '',
      album: '  ',
      fileName: 'demo track.mp3',
      durationSeconds: 0,
      sourcePath: '/music/demo track.mp3',
      addedAt: '2024-01-01Z',
      availability: 'available'
    });

    expect(metadata.title).toBe('demo track');
    expect(metadata.artist).toBe('Unknown artist');
    expect(metadata.album).toBe('Local library');
  });
});
