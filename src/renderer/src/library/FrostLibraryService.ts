import type {
  AudioMetadata,
  LibraryEntry,
  LibrarySortMode,
  LibraryStoreState,
  Playlist,
  PlaylistEntry,
  PlaylistSnapshot
} from '../../../shared/types';

export type LibrarySearchToken = 'title' | 'artist' | 'album' | 'filename';

export interface LibraryMatchQuery {
  term: string;
  targets: LibrarySearchToken[];
}

export interface MetadataExtractionResult extends AudioMetadata {
  entry: LibraryEntry;
}

export class FrostLibraryService {
  private store: LibraryStoreState = {
    entries: [],
    playlists: [],
    currentPlaylistId: undefined,
    currentTrackId: undefined,
    searchTerm: '',
    sortMode: 'name',
    activeFilters: []
  };

  public getState(): LibraryStoreState {
    return structuredClone(this.store);
  }

  public seed(entries: LibraryEntry[]): void {
    this.store.entries = entries
      .filter((entry) => !!entry?.sourcePath)
      .map((entry) => ({
        ...entry,
        availability: entry.availability ?? 'available'
      }));
  }

  public setSearch(term: string, targets: LibrarySearchToken[] = ['title', 'artist', 'album', 'filename']): void {
    this.store.searchTerm = term.trim();
    this.store.activeFilters = targets;
  }

  public setSort(mode: LibrarySortMode): void {
    this.store.sortMode = mode;
  }

  public search(query: LibraryMatchQuery): LibraryEntry[] {
    const term = query.term.trim().toLowerCase();
    if (!term) {
      return this.sortEntries(this.store.entries);
    }

    return this.sortEntries(
      this.store.entries.filter((entry) => {
        const haystacks = [
          query.targets.includes('title') ? entry.title : '',
          query.targets.includes('artist') ? entry.artist : '',
          query.targets.includes('album') ? entry.album : '',
          query.targets.includes('filename') ? entry.filename : ''
        ];

        return haystacks.some((value) => value.toLowerCase().includes(term));
      })
    );
  }

  public createPlaylist(name: string): Playlist {
    const normalized = name.trim();
    const playlist: Playlist = {
      id: `playlist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: normalized || 'Untitled playlist',
      trackIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSmart: false
    };

    this.store.playlists.push(playlist);
    this.store.currentPlaylistId = playlist.id;
    return playlist;
  }

  public renamePlaylist(playlistId: string, name: string): Playlist | undefined {
    const playlist = this.store.playlists.find((item) => item.id === playlistId);
    if (!playlist) {
      return undefined;
    }

    playlist.name = name.trim() || playlist.name;
    playlist.updatedAt = new Date().toISOString();
    return playlist;
  }

  public deletePlaylist(playlistId: string): boolean {
    const index = this.store.playlists.findIndex((playlist) => playlist.id === playlistId);
    if (index === -1) {
      return false;
    }

    this.store.playlists.splice(index, 1);
    if (this.store.currentPlaylistId === playlistId) {
      this.store.currentPlaylistId = this.store.playlists[0]?.id;
    }
    return true;
  }

  public addTrackToPlaylist(playlistId: string, libraryId: string): PlaylistEntry | undefined {
    const playlist = this.store.playlists.find((item) => item.id === playlistId);
    const libraryEntry = this.store.entries.find((entry) => entry.id === libraryId);
    if (!playlist || !libraryEntry) {
      return undefined;
    }

    if (playlist.trackIds.includes(libraryId)) {
      return undefined;
    }

    const order = playlist.trackIds.length;
    playlist.trackIds.push(libraryId);
    playlist.updatedAt = new Date().toISOString();

    return {
      id: `playlist-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      libraryId,
      order,
      addedAt: new Date().toISOString()
    };
  }

  public removeTrackFromPlaylist(playlistId: string, libraryId: string): boolean {
    const playlist = this.store.playlists.find((item) => item.id === playlistId);
    if (!playlist) {
      return false;
    }

    const before = playlist.trackIds.length;
    playlist.trackIds = playlist.trackIds.filter((trackId) => trackId !== libraryId);
    playlist.updatedAt = new Date().toISOString();
    return before !== playlist.trackIds.length;
  }

  public reorderPlaylist(playlistId: string, fromIndex: number, toIndex: number): boolean {
    const playlist = this.store.playlists.find((item) => item.id === playlistId);
    if (!playlist) {
      return false;
    }

    const safeFrom = clampIndex(fromIndex, playlist.trackIds.length);
    const safeTo = clampIndex(toIndex, playlist.trackIds.length);
    if (safeFrom === safeTo) {
      return false;
    }

    const [item] = playlist.trackIds.splice(safeFrom, 1);
    playlist.trackIds.splice(safeTo, 0, item);
    playlist.updatedAt = new Date().toISOString();
    return true;
  }

  public getPlaylistSnapshot(playlistId: string): PlaylistSnapshot | undefined {
    const playlist = this.store.playlists.find((item) => item.id === playlistId);
    if (!playlist) {
      return undefined;
    }

    const tracks = playlist.trackIds
      .map((trackId) => this.store.entries.find((entry) => entry.id === trackId))
      .filter((entry): entry is LibraryEntry => Boolean(entry));

    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      tracks,
      currentTrackId: this.store.currentTrackId,
      currentIndex: Math.max(0, tracks.findIndex((track) => track.id === this.store.currentTrackId)),
      lastUpdated: playlist.updatedAt
    };
  }

  public dedupeEntries(entries: LibraryEntry[]): LibraryEntry[] {
    const map = new Map<string, LibraryEntry>();

    for (const entry of entries) {
      const key = `${entry.sourcePath}:${entry.filename}`.toLowerCase();
      if (!map.has(key)) {
        map.set(key, entry);
      }
    }

    return Array.from(map.values());
  }

  public markUnavailable(entryId: string, reason?: string): boolean {
    const entry = this.store.entries.find((item) => item.id === entryId);
    if (!entry) {
      return false;
    }

    entry.availability = 'unavailable';
    entry.isMissing = true;
    if (reason) {
      entry.album = `${entry.album || 'Unavailable'} — ${reason}`;
    }
    return true;
  }

  public async extractMetadataFromFile(file: File): Promise<MetadataExtractionResult> {
    const sourcePath = file.name;
    const fallbackTitle = sourcePath.replace(/\.[^/.]+$/, '') || sourcePath;

    const entry: LibraryEntry = {
      id: `library-${crypto.randomUUID()}`,
      title: fallbackTitle,
      artist: 'Unknown artist',
      album: 'Local library',
      filename: file.name,
      durationSeconds: 0,
      sourcePath,
      addedAt: new Date().toISOString(),
      availability: 'available',
      mimeType: file.type || 'audio/mpeg'
    };

    return {
      entry,
      title: entry.title,
      artist: entry.artist,
      album: entry.album,
      durationSeconds: entry.durationSeconds,
      fileName: entry.filename,
      mimeType: entry.mimeType,
      sourcePath: entry.sourcePath,
      addedAt: entry.addedAt,
      availability: entry.availability
    };
  }

  public extractEmbeddedCoverFromMetadata(metadata: Partial<AudioMetadata>): string | undefined {
    if (metadata.coverArt) {
      return metadata.coverArt;
    }

    return undefined;
  }

  public sanitizeMetadata(metadata: Partial<AudioMetadata>): AudioMetadata {
    const title = metadata.title?.trim() || metadata.fileName?.replace(/\.[^/.]+$/, '') || 'Unknown title';
    return {
      title,
      artist: metadata.artist?.trim() || 'Unknown artist',
      album: metadata.album?.trim() || 'Local library',
      durationSeconds: metadata.durationSeconds ?? 0,
      fileName: metadata.fileName || 'unknown-file',
      mimeType: metadata.mimeType || 'audio/mpeg',
      coverArt: metadata.coverArt,
      sourcePath: metadata.sourcePath || '',
      addedAt: metadata.addedAt || new Date().toISOString(),
      availability: metadata.availability ?? 'available'
    };
  }

  private sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
    const sorted = [...entries];

    switch (this.store.sortMode) {
      case 'artist':
        return sorted.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
      case 'album':
        return sorted.sort((a, b) => a.album.localeCompare(b.album) || a.title.localeCompare(b.title));
      case 'duration':
        return sorted.sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
      case 'addedAt':
        return sorted.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
      case 'name':
      default:
        return sorted.sort((a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist));
    }
  }
}

function clampIndex(index: number, length: number): number {
  if (length === 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), length - 1);
}
