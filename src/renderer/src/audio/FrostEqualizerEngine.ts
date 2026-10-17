import type { EqualizerBandConfig, EqualizerRuntimeState, SavedEqualizerPreset } from '../../../shared/types';

export type FilterPresetName = 'Flat' | 'Bass' | 'Treble' | 'Vocal' | 'Pop' | 'Rock' | 'Jazz' | 'Classic';

export const EQUALIZER_BAND_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const DEFAULT_EQUALIZER_BANDS: EqualizerBandConfig[] = [
  { frequency: 31, label: '31Hz', q: 0.8, gainDb: 0, type: 'lowshelf' },
  { frequency: 62, label: '62Hz', q: 0.9, gainDb: 0, type: 'peaking' },
  { frequency: 125, label: '125Hz', q: 1, gainDb: 0, type: 'peaking' },
  { frequency: 250, label: '250Hz', q: 1.1, gainDb: 0, type: 'peaking' },
  { frequency: 500, label: '500Hz', q: 1.2, gainDb: 0, type: 'peaking' },
  { frequency: 1000, label: '1kHz', q: 1.2, gainDb: 0, type: 'peaking' },
  { frequency: 2000, label: '2kHz', q: 1.3, gainDb: 0, type: 'peaking' },
  { frequency: 4000, label: '4kHz', q: 1.5, gainDb: 0, type: 'peaking' },
  { frequency: 8000, label: '8kHz', q: 1.6, gainDb: 0, type: 'peaking' },
  { frequency: 16000, label: '16kHz', q: 1.8, gainDb: 0, type: 'highshelf' }
];

export const PRESET_MAP: Record<FilterPresetName, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bass: [4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
  Treble: [0, 0, 0, 0, 1, 2, 3, 4, 5, 4],
  Vocal: [0, 0, 1, 2, 4, 4, 3, 2, 1, 0],
  Pop: [2, 2, 2, 3, 3, 2, 2, 1, 1, 0],
  Rock: [3, 3, 2, 1, 0, 1, 2, 4, 4, 3],
  Jazz: [2, 2, 1, 0, 1, 2, 3, 4, 3, 2],
  Classic: [3, 2, 1, 0, 0, 1, 2, 3, 4, 4]
};

export interface CustomPresetRecord extends SavedEqualizerPreset {
  id: string;
}

export class FrostEqualizerEngine {
  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private chainNode: GainNode | null = null;
  private bandNodes: BiquadFilterNode[] = [];
  private presetBank: Map<string, number[]> = new Map();
  private activePresetId = 'preset-flat';
  private runtimeState: EqualizerRuntimeState = {
    enabled: true,
    activePresetId: 'preset-flat',
    bands: Array(DEFAULT_EQUALIZER_BANDS.length).fill(0),
    clipped: false,
    clipProtectionApplied: false
  };

  constructor() {
    this.presetBank = new Map(
      (Object.entries(PRESET_MAP) as [FilterPresetName, number[]][]).map(([name, gains]) => [`preset-${name.toLowerCase()}`, gains])
    );
    this.runtimeState.bands = [...PRESET_MAP.Flat];
  }

  public connectAudioSource(source: MediaElementAudioSourceNode): void {
    if (!this.context) {
      throw new Error('AudioContext was not created. Ensure the player connected a valid source first.');
    }

    this.disconnectPreviousChain();
    this.sourceNode = source;
    this.chainNode = this.context.createGain();
    this.chainNode.gain.value = 1;
    this.bandNodes = DEFAULT_EQUALIZER_BANDS.map((band, index) => {
      const filter = this.context!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.Q.value = band.q;
      filter.gain.value = this.runtimeState.bands[index] ?? 0;
      return filter;
    });

    this.sourceNode.disconnect();
    this.sourceNode.connect(this.bandNodes[0]);
    for (let index = 0; index < this.bandNodes.length - 1; index += 1) {
      this.bandNodes[index].connect(this.bandNodes[index + 1]);
    }
    this.bandNodes[this.bandNodes.length - 1].connect(this.chainNode);
    this.chainNode.connect(this.context.destination);
  }

  public getBands(): EqualizerBandConfig[] {
    return DEFAULT_EQUALIZER_BANDS.map((band, index) => ({
      ...band,
      gainDb: this.runtimeState.bands[index] ?? 0
    }));
  }

  public getRuntimeState(): EqualizerRuntimeState {
    return { ...this.runtimeState };
  }

  public setEnabled(enabled: boolean): void {
    this.runtimeState.enabled = enabled;
    if (this.chainNode) {
      this.chainNode.gain.value = enabled ? 1 : 0.0001;
    }
  }

  public async createContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (!this.context) {
      this.context = new AudioCtor();
      this.runtimeState.error = undefined;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  public setBandGain(index: number, gainDb: number): void {
    const safeIndex = clampIndex(index, this.bandNodes.length || DEFAULT_EQUALIZER_BANDS.length);
    const safeGain = this.safeClampGain(gainDb);

    if (this.bandNodes[safeIndex]) {
      this.bandNodes[safeIndex].gain.value = safeGain;
    }

    this.runtimeState.bands[safeIndex] = safeGain;
    this.runtimeState.clipped = safeGain !== gainDb;
    this.runtimeState.clipProtectionApplied = safeGain !== gainDb;
  }

  public applyPreset(name: FilterPresetName): void {
    const values = PRESET_MAP[name] ?? PRESET_MAP.Flat;
    this.activePresetId = `preset-${name.toLowerCase()}`;
    this.runtimeState.activePresetId = this.activePresetId;

    values.forEach((gain, index) => {
      this.setBandGain(index, gain);
    });
  }

  public setCustomPreset(name: string, gains: number[]): SavedEqualizerPreset {
    const normalized = name.trim() || `Custom ${this.presetBank.size + 1}`;
    const safeGains = gains.map((value) => this.safeClampGain(value));
    const preset: SavedEqualizerPreset = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: normalized,
      gains: safeGains,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true
    };

    this.presetBank.set(preset.id, safeGains);
    this.activePresetId = preset.id;
    this.runtimeState.activePresetId = preset.id;
    this.applyPresetGains(safeGains);
    return preset;
  }

  public renamePreset(presetId: string, newName: string): boolean {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return false;
    }

    preset.name = newName.trim() || preset.name;
    preset.updatedAt = new Date().toISOString();
    return true;
  }

  public deletePreset(presetId: string): boolean {
    if (presetId.startsWith('preset-')) {
      return false;
    }

    return this.presetBank.delete(presetId);
  }

  public reset(): void {
    this.applyPresetGains(PRESET_MAP.Flat);
    this.activePresetId = 'preset-flat';
    this.runtimeState.activePresetId = 'preset-flat';
    this.runtimeState.clipProtectionApplied = false;
    this.runtimeState.clipped = false;
  }

  public getPresetById(presetId: string): SavedEqualizerPreset | undefined {
    const presetEntries = [...this.presetBank.entries()].map(([id, gains]) => ({
      id,
      name: id.replace(/^preset-/, '').replace(/-/g, ' '),
      gains,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: !id.startsWith('preset-')
    }));

    return presetEntries.find((preset) => preset.id === presetId);
  }

  public applyPresetGains(values: number[]): void {
    values.forEach((gain, index) => this.setBandGain(index, gain));
  }

  public disableRouting(): void {
    if (this.chainNode) {
      this.chainNode.gain.value = 0;
    }
    this.setEnabled(false);
  }

  public restoreRouting(): void {
    if (this.chainNode) {
      this.chainNode.gain.value = 1;
    }
    this.setEnabled(true);
  }

  public destroy(): void {
    this.disconnectPreviousChain();

    if (this.context && this.context.state !== 'closed') {
      void this.context.close();
    }

    this.context = null;
    this.sourceNode = null;
    this.chainNode = null;
  }

  private disconnectPreviousChain(): void {
    if (this.bandNodes.length > 0) {
      this.bandNodes.forEach((band) => band.disconnect());
      this.bandNodes = [];
    }

    this.chainNode?.disconnect();
    this.sourceNode?.disconnect();
  }

  private safeClampGain(gainDb: number): number {
    const minimum = -12;
    const maximum = 12;
    const safeValue = Math.min(Math.max(gainDb, minimum), maximum);

    if (safeValue !== gainDb) {
      this.runtimeState.clipProtectionApplied = true;
      this.runtimeState.clipped = true;
    }

    return safeValue;
  }
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}
