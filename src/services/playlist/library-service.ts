import type { AudioTrack, LibraryScanResult, PlaylistItem } from '../../shared/types';

export class LibraryService {
  public async scanDirectory(directory: string): Promise<LibraryScanResult> {
    const safeDirectory = directory.trim();

    if (!safeDirectory) {
      return { tracks: [], errors: ['Directory is empty.'] };
    }

    return {
      tracks: [] as AudioTrack[],
      errors: [`Library scanning is deferred for ${safeDirectory}.`]
    };
  }

  public async createPlaylistEntry(track: AudioTrack): Promise<PlaylistItem> {
    return {
      id: `playlist-${Date.now()}`,
      trackId: track.id,
      title: track.title,
      sourcePath: track.sourcePath,
      addedAt: new Date().toISOString()
    };
  }
}
