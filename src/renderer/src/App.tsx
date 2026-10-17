import { useEffect, useMemo, useRef, useState } from 'react';
import type { AudioTrack, LibraryImportEntry } from '../../shared/types';
import { FrostAudioEngine, type AudioEngineSnapshot, type RepeatMode } from './audio/FrostAudioEngine';
import { ControlButton } from './components/ControlButton';
import { TabButton } from './components/TabButton';
import {
  EqualizerIcon,
  LyricsIcon,
  MuteIcon,
  MusicIcon,
  NextIcon,
  PlayIcon,
  PreviousIcon,
  SearchIcon,
  VolumeIcon
} from './components/Icons';
import coverArt from '../assets/cover-frost.svg';

const bandLevels = [12, 18, 26, 40, 63, 76, 68, 42, 23, 18];

const lyricLines = [
  'I keep the lights low, but the shadows still race',
  'A voice in the haze says, “You are not the same.”',
  'The room tilts softly, and the night keeps its tune.'
];

const copy = {
  en: {
    library: 'Library',
    favorites: 'Favorites',
    discover: 'Discover',
    radio: 'Radio',
    nowPlaying: 'Now playing',
    queue: 'Queue',
    search: 'Search music',
    device: 'Audio device',
    deviceValue: 'Built-in output',
    lyrics: 'Lyrics',
    equalizer: 'Equalizer',
    volume: 'Volume',
    muted: 'Muted',
    trackStatus: 'Preview state',
    noSong: 'No song selected',
    noCover: 'No cover art',
    loading: 'Loading track',
    error: 'Track error',
    ready: 'Ready',
    locale: 'AR',
    currentTime: '1:42',
    totalTime: '4:28',
    importFiles: 'Import files',
    importFolder: 'Import library folder',
    imported: 'Imported files',
    cancelled: 'Selection cancelled',
    importedCount: 'Imported',
    unsupported: 'Unsupported',
    noFiles: 'No files added yet',
    repeat: 'Repeat',
    shuffle: 'Shuffle',
    state: 'State'
  },
  ar: {
    library: 'المكتبة',
    favorites: 'المفضلات',
    discover: 'اكتشف',
    radio: 'الراديو',
    nowPlaying: 'يشتغل الآن',
    queue: 'قائمة التشغيل',
    search: 'ابحث عن الموسيقى',
    device: 'جهاز الصوت',
    deviceValue: 'الإخراج الداخلي',
    lyrics: 'الكلمات',
    equalizer: 'الموازن',
    volume: 'الصوت',
    muted: 'مكتوم',
    trackStatus: 'حالة المعاينة',
    noSong: 'لا توجد أغنية محددة',
    noCover: 'لا يوجد غلاف',
    loading: 'تحميل المسار',
    error: 'خطأ في المسار',
    ready: 'جاهز',
    locale: 'EN',
    currentTime: '١:٤٢',
    totalTime: '٤:٢٨',
    importFiles: 'استيراد ملفات',
    importFolder: 'استيراد مجلد المكتبة',
    imported: 'الملفات المستوردة',
    cancelled: 'تم إلغاء الاختيار',
    importedCount: 'المستورد',
    unsupported: 'غير مدعوم',
    noFiles: 'لا توجد ملفات بعد',
    repeat: 'تكرار',
    shuffle: 'خلط',
    state: 'الحالة'
  }
};

const formatClock = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function App() {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [activeTab, setActiveTab] = useState<'equalizer' | 'lyrics'>('equalizer');
  const [importedFiles, setImportedFiles] = useState<LibraryImportEntry[]>([]);
  const [libraryTracks, setLibraryTracks] = useState<AudioTrack[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importNotice, setImportNotice] = useState('');
  const [playback, setPlayback] = useState<AudioEngineSnapshot>({
    state: 'idle',
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 80,
    muted: false,
    repeatMode: 'off',
    shuffle: false,
    error: null
  });
  const engineRef = useRef<FrostAudioEngine | null>(null);
  const labels = useMemo(() => copy[locale], [locale]);
  const isRtl = locale === 'ar';
  const currentTrack = playback.currentTrack ?? libraryTracks[0] ?? null;

  useEffect(() => {
    void window.frost.settings.save({ language: locale }).catch(() => undefined);
  }, [locale]);

  useEffect(() => {
    const engine = new FrostAudioEngine([], (snapshot) => setPlayback(snapshot));
    engineRef.current = engine;

    const restoreState = async () => {
      try {
        const savedSettings = await window.frost.settings.load();
        if (savedSettings?.data?.language) {
          setLocale(savedSettings.data.language);
        }
        if (typeof savedSettings?.data?.volume === 'number') {
          engine.setVolume(savedSettings.data.volume);
        }
        if (typeof savedSettings?.data?.muted === 'boolean') {
          engine.setMuted(savedSettings.data.muted);
        }
      } catch {
        // no-op: the app will keep defaults if no persisted settings exist
      }

      try {
        const libraryRecord = await window.frost.library.load();
        if (libraryRecord?.error) {
          setImportNotice(libraryRecord.error);
          return;
        }

        const validEntries = Array.isArray(libraryRecord?.entries) ? libraryRecord.entries : [];
        setImportedFiles(validEntries);
        const importedTracks: AudioTrack[] = validEntries
          .filter((file) => file.status === 'imported')
          .map((file) => ({
            id: file.id,
            title: file.name.replace(/\.[^/.]+$/, '') || file.name,
            artist: 'Local library',
            album: 'Imported audio',
            duration: 0,
            sourcePath: file.path,
            coverArt,
            mimeType: file.extension ? `audio/${file.extension.replace('.', '')}` : 'audio/mpeg'
          }));

        setLibraryTracks(importedTracks);
        if (engineRef.current) {
          engineRef.current.setPlaylist(importedTracks, 0);
        }
      } catch {
        // no-op: the app stays empty until the user imports files
      }
    };

    void restoreState();

    return () => {
      engine.destroy();
    };
  }, []);

  const persistLibraryEntries = async (files: LibraryImportEntry[]) => {
    try {
      const result = await window.frost.library.save(files);
      if (result?.error) {
        setImportNotice(result.error);
      }
    } catch {
      setImportNotice('Library could not be saved. The current session remains available.');
    }
  };

  const pushLibraryTracks = (files: LibraryImportEntry[]) => {
    const importedTracks: AudioTrack[] = files
      .filter((file) => file.status === 'imported')
      .map((file) => ({
        id: file.id,
        title: file.name.replace(/\.[^/.]+$/, '') || file.name,
        artist: 'Local library',
        album: 'Imported audio',
        duration: 0,
        sourcePath: file.path,
        coverArt,
        mimeType: file.extension ? `audio/${file.extension.replace('.', '')}` : 'audio/mpeg'
      }));

    setLibraryTracks(importedTracks);

    if (engineRef.current) {
      if (importedTracks.length > 0) {
        engineRef.current.setPlaylist(importedTracks, 0);
      } else {
        engineRef.current.setPlaylist([], 0);
      }
    }
  };

  const visibleQueue = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return libraryTracks;
    }

    return libraryTracks.filter((track) => {
      const haystacks = [track.title, track.artist, track.album].filter(Boolean);
      return haystacks.some((value) => value.toLowerCase().includes(normalizedTerm));
    });
  }, [libraryTracks, searchTerm]);

  const queueItems: Array<[string, string, string]> = visibleQueue.length > 0
    ? visibleQueue.map((track) => [track.title, track.artist, track.id] as [string, string, string])
    : [];

  const handleFileImport = async () => {
    const result = await window.frost.library.selectFiles();

    if (result.cancelled) {
      setImportNotice(labels.cancelled);
      return;
    }

    setImportedFiles(result.files);
    pushLibraryTracks(result.files);
    void persistLibraryEntries(result.files);
    setImportNotice(`${labels.importedCount}: ${result.importedCount}`);
  };

  const handleDirectoryImport = async () => {
    const result = await window.frost.library.selectFolder();

    if (result.cancelled) {
      setImportNotice(labels.cancelled);
      return;
    }

    setImportedFiles(result.files);
    pushLibraryTracks(result.files);
    void persistLibraryEntries(result.files);
    setImportNotice(`${labels.importedCount}: ${result.importedCount}`);
  };

  const handleQueueTrackSelect = async (trackId: string) => {
    if (!engineRef.current || libraryTracks.length === 0) {
      return;
    }

    const actualIndex = libraryTracks.findIndex((track) => track.id === trackId);
    if (actualIndex < 0) {
      return;
    }

    await engineRef.current.playTrack(actualIndex, true);
  };

  const handlePlayback = async () => {
    if (!engineRef.current) {
      return;
    }

    if (playback.state === 'playing') {
      engineRef.current.pause();
      return;
    }

    if (playback.state === 'paused') {
      await engineRef.current.resume();
      return;
    }

    if (libraryTracks.length > 0) {
      const currentIndex = playback.currentTrack
        ? libraryTracks.findIndex((track) => track.id === playback.currentTrack?.id)
        : -1;

      if (currentIndex >= 0) {
        await engineRef.current.playTrack(currentIndex, true);
        return;
      }

      await engineRef.current.playTrack(0, true);
      return;
    }

    await engineRef.current.play();
  };

  const handlePrevious = async () => {
    await engineRef.current?.previous();
  };

  const handleNext = async () => {
    await engineRef.current?.next();
  };

  const handleVolumeChange = (nextValue: number) => {
    engineRef.current?.setVolume(nextValue);
    void window.frost.settings.save({ volume: nextValue, muted: playback.muted }).catch(() => undefined);
  };

  const cycleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const index = modes.indexOf(playback.repeatMode);
    const nextMode = modes[(index + 1) % modes.length];
    engineRef.current?.setRepeatMode(nextMode);
    void window.frost.settings.save({ volume: playback.volume, muted: playback.muted }).catch(() => undefined);
  };

  const toggleShuffle = () => {
    engineRef.current?.setShuffle(!playback.shuffle);
    void window.frost.settings.save({ volume: playback.volume, muted: playback.muted }).catch(() => undefined);
  };

  return (
    <div className={['app-shell', isRtl ? 'rtl' : 'ltr'].join(' ')} dir={isRtl ? 'rtl' : 'ltr'} lang={locale}>
      <aside className="sidebar glass-panel">
        <div className="brand-row">
          <div className="brand-mark">F</div>
          <div>
            <p className="eyebrow">Desktop Player</p>
            <h1>Frost Player</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main menu">
          <button className="nav-item active" type="button">{labels.library}</button>
          <button className="nav-item" type="button">{labels.favorites}</button>
          <button className="nav-item" type="button">{labels.discover}</button>
          <button className="nav-item" type="button">{labels.radio}</button>
        </nav>

        <div className="import-panel">
          <button type="button" className="action-button" onClick={handleFileImport}>
            {labels.importFiles}
          </button>
          <button type="button" className="action-button secondary" onClick={handleDirectoryImport}>
            {labels.importFolder}
          </button>
        </div>

        <button className="locale-toggle" type="button" onClick={() => setLocale((current) => (current === 'en' ? 'ar' : 'en'))}>
          {labels.locale}
        </button>
      </aside>

      <main className="content-panel">
        <header className="topbar glass-panel">
          <label className="search-box" aria-label={labels.search}>
            <SearchIcon width={16} height={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={labels.search}
              aria-label={labels.search}
            />
          </label>

          <div className="topbar-meta">
            <span className="status-pill">Linux Mint</span>
            <span className="status-pill muted">{playback.state.toUpperCase()}</span>
          </div>
        </header>

        <section className="hero glass-panel">
          <div className="album-frame" aria-label={labels.noCover}>
            <img src={currentTrack?.coverArt ?? coverArt} alt={currentTrack?.title ?? 'Frost Player cover'} />
          </div>

          <div className="track-info">
            <p className="eyebrow">{labels.nowPlaying}</p>
            <h2>{currentTrack?.title ?? labels.noSong}</h2>
            <p className="meta-line">{currentTrack?.artist || 'Local track'} • {currentTrack?.album || 'Imported audio'}</p>

            <div className="track-status-row" aria-label={labels.trackStatus}>
              <span className="meta-badge success">{playback.state === 'playing' ? 'Playing' : playback.state === 'paused' ? 'Paused' : labels.ready}</span>
              <span className="meta-badge">{labels.noSong}</span>
              <span className="meta-badge">{labels.noCover}</span>
              <span className="meta-badge warning">{playback.state === 'loading' ? labels.loading : labels.ready}</span>
              {playback.error ? <span className="meta-badge error">{labels.error}</span> : null}
            </div>

            <div className="equalizer" aria-label="Static equalizer preview">
              {bandLevels.map((level, index) => (
                <span key={index} style={{ height: `${level}%` }} />
              ))}
            </div>

            <div className="device-line">
              <span>{labels.device}</span>
              <strong>{labels.deviceValue}</strong>
            </div>
          </div>
        </section>

        <section className="tab-panel glass-panel">
          <div className="tab-bar" role="tablist" aria-label="Playback details tabs">
            <TabButton active={activeTab === 'equalizer'} onClick={() => setActiveTab('equalizer')}>
              <EqualizerIcon width={16} height={16} />
              <span>{labels.equalizer}</span>
            </TabButton>
            <TabButton active={activeTab === 'lyrics'} onClick={() => setActiveTab('lyrics')}>
              <LyricsIcon width={16} height={16} />
              <span>{labels.lyrics}</span>
            </TabButton>
          </div>

          {activeTab === 'equalizer' ? (
            <div className="tab-content" aria-live="polite">
              <div className="mini-eq" aria-label="Equalizer bars preview">
                {bandLevels.map((level, index) => (
                  <span key={index} style={{ height: `${level}%` }} />
                ))}
              </div>
              <p className="tab-note">No active dynamic equalizer is implemented in this phase. The engine controls only the real playback state and safe local-file handling.</p>
            </div>
          ) : (
            <div className="tab-content lyric-content" aria-live="polite">
              <p className="active-line">{playback.error ?? lyricLines[0]}</p>
              {playback.error ? null : lyricLines.slice(1).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </section>
      </main>

      <aside className="queue-panel glass-panel">
        <div className="queue-header">
          <h3>{labels.queue}</h3>
          <span>{visibleQueue.length || libraryTracks.length || importedFiles.filter((file) => file.status === 'imported').length || 0} tracks</span>
        </div>

        <div className="import-results">
          <div className="import-results-header">
            <strong>{labels.imported}</strong>
            {importNotice ? <small>{importNotice}</small> : null}
          </div>

          {importedFiles.length === 0 ? (
            <p className="empty-state">{labels.noFiles}</p>
          ) : (
            <ul className="import-list">
              {importedFiles.map((item) => (
                <li key={item.id} className={`import-item status-${item.status}`}>
                  <div className="import-item-meta">
                    <strong>{item.name}</strong>
                    <small>{item.status}</small>
                  </div>
                  {item.reason ? <span>{item.reason}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {visibleQueue.length === 0 && searchTerm.trim() ? (
          <p className="empty-state">No tracks match your search.</p>
        ) : (
          <ul className="queue-list" aria-label={labels.queue}>
            {queueItems.map(([title, artist, trackId]) => {
              const isActive = playback.currentTrack?.id === trackId;
              return (
                <li
                  key={trackId}
                  className={`queue-item${isActive ? ' active' : ''}`}
                  onClick={() => void handleQueueTrackSelect(trackId)}
                  style={{ cursor: libraryTracks.length > 0 ? 'pointer' : 'default' }}
                >
                  <div className="queue-cover">
                    <MusicIcon width={18} height={18} />
                  </div>
                  <div>
                    <strong>{title}</strong>
                    <small>{artist}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <footer className="player-bar glass-panel">
        <div className="engine-actions">
          <button type="button" className="mode-button" onClick={cycleRepeat}>
            {labels.repeat}: {playback.repeatMode}
          </button>
          <button type="button" className="mode-button" onClick={toggleShuffle}>
            {labels.shuffle}: {playback.shuffle ? 'On' : 'Off'}
          </button>
        </div>

        <div className="controls" aria-label="Playback controls">
          <ControlButton variant="ghost" aria-label="Previous track" onClick={handlePrevious}>
            <PreviousIcon width={18} height={18} />
          </ControlButton>
          <ControlButton variant="primary" aria-label="Play or pause" onClick={handlePlayback}>
            <PlayIcon width={18} height={18} />
          </ControlButton>
          <ControlButton variant="ghost" aria-label="Next track" onClick={handleNext}>
            <NextIcon width={18} height={18} />
          </ControlButton>
        </div>

        <div className="progress-wrap" aria-label="Playback progress">
          <span>{formatClock(playback.currentTime)}</span>
          <input
            className="player-slider progress-slider"
            type="range"
            min={0}
            max={playback.duration || 0}
            step={0.1}
            value={playback.currentTime}
            onChange={(event) => engineRef.current?.seekTo(Number(event.target.value))}
            aria-label="Seek through audio"
          />
          <span>{formatClock(playback.duration)}</span>
        </div>

        <div className="volume-box" aria-label={labels.volume}>
          <button type="button" className="icon-toggle" aria-label={labels.muted} onClick={() => engineRef.current?.toggleMute()}>
            <MuteIcon width={16} height={16} />
          </button>
          <VolumeIcon width={18} height={18} />
          <input
            className="player-slider volume-slider"
            type="range"
            min={0}
            max={100}
            value={playback.muted ? 0 : playback.volume}
            onChange={(event) => handleVolumeChange(Number(event.target.value))}
            aria-label="Adjust volume"
          />
        </div>
      </footer>
    </div>
  );
}
