import type {
  LyricsMetadata,
  LyricsParseError,
  LyricsLineRecord,
  ParsedLyricsDocument,
  LyricsServiceState,
  LocalLyricsAssociation
} from '../../../shared/types';

export interface LyricsLoadOptions {
  fileName?: string;
  trackId?: string;
  autoScroll?: boolean;
}

export class FrostLyricsService {
  private readonly associations = new Map<string, LocalLyricsAssociation>();
  private activeIndex = -1;
  private isAutoScrollEnabled = true;
  private lastActiveTime = -1;
  private currentDocument: ParsedLyricsDocument = {
    metadata: {},
    lines: [],
    errors: [],
    status: 'empty'
  };

  public parseLrc(raw: string): ParsedLyricsDocument {
    const text = raw ?? '';
    if (!text.trim()) {
      return {
        metadata: {},
        lines: [],
        errors: [],
        status: 'empty'
      };
    }

    const lines: LyricsLineRecord[] = [];
    const errors: LyricsParseError[] = [];
    const metadata: LyricsMetadata = {};

    const normalized = text.replace(/\r/g, '');
    const entries = normalized.split('\n');

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index].trim();
      if (!entry) {
        continue;
      }

      const metadataMatch = /^\[(ti|ar|al|offset|by)\s*:\s*(.*)\]$/i.exec(entry);
      if (metadataMatch) {
        const key = metadataMatch[1].toLowerCase();
        const value = metadataMatch[2].trim();
        if (key === 'ti') {
          metadata.title = value;
        } else if (key === 'ar') {
          metadata.artist = value;
        } else if (key === 'al') {
          metadata.album = value;
        } else if (key === 'offset') {
          const offset = Number.parseFloat(value);
          metadata.offset = Number.isFinite(offset) ? offset : undefined;
        }
        continue;
      }

      const timeMatch = /^\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]\s*(.*)$/i.exec(entry);
      if (!timeMatch) {
        errors.push({
          lineNumber: index + 1,
          message: 'Line is not a valid LRC timestamp.',
          raw: entry
        });
        continue;
      }

      const stamp = timeMatch[1];
      const label = timeMatch[2].trim();
      const seconds = this.parseTimestamp(stamp);
      if (!Number.isFinite(seconds)) {
        errors.push({
          lineNumber: index + 1,
          message: 'Timestamp could not be converted to seconds.',
          raw: stamp
        });
        continue;
      }

      lines.push({
        index: lines.length,
        time: seconds + (metadata.offset ?? 0) / 1000,
        text: label || '',
        raw: entry
      });
    }

    this.currentDocument = {
      metadata,
      lines: lines.sort((a, b) => a.time - b.time),
      errors,
      status: lines.length > 0 ? 'ready' : 'empty'
    };

    return this.currentDocument;
  }

  public getState(): LyricsServiceState {
    const hasLyrics = this.currentDocument.lines.length > 0;
    return {
      activeIndex: this.activeIndex,
      activeTime: this.lastActiveTime,
      isAutoScrollEnabled: this.isAutoScrollEnabled,
      hasLyrics,
      message: hasLyrics ? null : 'No lyrics available for this track.'
    };
  }

  public setAutoScroll(enabled: boolean): void {
    this.isAutoScrollEnabled = enabled;
  }

  public findActiveIndex(currentTimeSeconds: number): number {
    if (!this.currentDocument.lines.length) {
      this.activeIndex = -1;
      this.lastActiveTime = currentTimeSeconds;
      return -1;
    }

    let active = 0;
    for (let index = this.currentDocument.lines.length - 1; index >= 0; index -= 1) {
      const line = this.currentDocument.lines[index];
      if (line.time <= currentTimeSeconds) {
        active = index;
        break;
      }
    }

    this.activeIndex = active;
    this.lastActiveTime = currentTimeSeconds;
    return this.activeIndex;
  }

  public getActiveLine(currentTimeSeconds: number): LyricsLineRecord | null {
    const index = this.findActiveIndex(currentTimeSeconds);
    if (index < 0) {
      return null;
    }

    return this.currentDocument.lines[index] ?? null;
  }

  public getNextLine(currentTime: number): LyricsLineRecord | null {
    const nextIndex = this.currentDocument.lines.findIndex((line) => line.time > currentTime);
    return nextIndex >= 0 ? this.currentDocument.lines[nextIndex] : null;
  }

  public bindTrack(trackId: string, lrcPath: string, metadata?: Partial<LyricsMetadata>): void {
    this.associations.set(trackId, {
      trackId,
      lrcPath,
      title: metadata?.title,
      artist: metadata?.artist,
      updatedAt: new Date().toISOString()
    });
  }

  public getAssociation(trackId: string): LocalLyricsAssociation | null {
    return this.associations.get(trackId) ?? null;
  }

  public resetForTrack(): void {
    this.currentDocument = {
      metadata: {},
      lines: [],
      errors: [],
      status: 'empty'
    };
    this.activeIndex = -1;
    this.lastActiveTime = -1;
  }

  private parseTimestamp(value: string): number {
    const match = /^((\d+):)?(\d{1,2})(?:\.(\d{1,3}))?$/.exec(value.trim());
    if (!match) {
      return Number.NaN;
    }

    const minutes = Number.parseInt(match[2] ?? '0', 10);
    const seconds = Number.parseInt(match[3], 10);
    const milliseconds = match[4] ? Number.parseInt(match[4].padEnd(3, '0').slice(0, 3), 10) : 0;
    return minutes * 60 + seconds + milliseconds / 1000;
  }
}
