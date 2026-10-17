import { describe, expect, it } from 'vitest';
import { FrostLyricsService } from './FrostLyricsService';

describe('FrostLyricsService', () => {
  it('parses LRC metadata and sorts lyrics chronologically', () => {
    const service = new FrostLyricsService();
    const document = service.parseLrc(`
[ti:Night Echo]
[ar:Moonlight]
[al:Afterglow]
[00:12.340]I see the stars
[00:18.200]in your eyes
[00:24.000]and I am home
`);

    expect(document.status).toBe('ready');
    expect(document.metadata.title).toBe('Night Echo');
    expect(document.lines).toHaveLength(3);
    expect(document.lines[0].text).toBe('I see the stars');
    expect(document.lines[0].time).toBeCloseTo(12.34, 2);
    expect(document.lines[2].text).toBe('and I am home');
  });

  it('records malformed lines as parse errors and keeps valid lines', () => {
    const service = new FrostLyricsService();
    const document = service.parseLrc(`
[00:15.000]Valid line
bad line
[invalid]
[00:26.000]Another valid line
`);

    expect(document.lines).toHaveLength(2);
    expect(document.errors).toHaveLength(2);
    expect(document.errors[0].raw).toBe('bad line');
    expect(document.lines[1].text).toBe('Another valid line');
  });

  it('selects the active line and next line based on current time', () => {
    const service = new FrostLyricsService();
    service.parseLrc(`
[00:10.000]First line
[00:20.000]Second line
[00:30.000]Third line
`);

    expect(service.getActiveLine(15)).toMatchObject({ text: 'First line' });
    expect(service.getActiveLine(25)).toMatchObject({ text: 'Second line' });
    expect(service.getNextLine(20)?.text).toBe('Third line');
    expect(service.getNextLine(35)).toBeNull();
  });

  it('binds track lyrics associations and resets cleanly', () => {
    const service = new FrostLyricsService();
    service.bindTrack('track-1', '/music/song.lrc', { title: 'Song', artist: 'Artist' });

    expect(service.getAssociation('track-1')).toMatchObject({ trackId: 'track-1', lrcPath: '/music/song.lrc' });

    service.resetForTrack();
    expect(service.getState()).toMatchObject({ activeIndex: -1, hasLyrics: false, message: 'No lyrics available for this track.' });
  });
});
