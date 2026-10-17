import { describe, expect, it } from 'vitest';
import { FrostEqualizerEngine } from './FrostEqualizerEngine';

describe('FrostEqualizerEngine', () => {
  it('applies a preset and clamps gains to the safe range', () => {
    const engine = new FrostEqualizerEngine();
    engine.applyPreset('Bass');

    const bands = engine.getBands();
    expect(bands[0].gainDb).toBe(4);
    expect(bands[9].gainDb).toBe(0);

    engine.setBandGain(0, 99);
    expect(engine.getRuntimeState().bands[0]).toBe(12);
    expect(engine.getRuntimeState().clipped).toBe(true);
  });

  it('creates, renames, and deletes custom presets', () => {
    const engine = new FrostEqualizerEngine();
    const preset = engine.setCustomPreset('Night Mix', [1, 2, 3, 4, 5, 4, 3, 2, 1, 0]);

    expect(preset.name).toBe('Night Mix');
    expect(engine.getPresetById(preset.id)?.name).toBe('Night Mix');
    expect(engine.renamePreset(preset.id, 'Night Mix v2')).toBe(true);
    expect(engine.getPresetById(preset.id)?.name).toBe('Night Mix v2');
    expect(engine.deletePreset(preset.id)).toBe(true);
  });

  it('resets the equalizer to the flat preset safely', () => {
    const engine = new FrostEqualizerEngine();
    engine.applyPreset('Treble');
    engine.reset();

    expect(engine.getRuntimeState().activePresetId).toBe('preset-flat');
    expect(engine.getBands().every((band) => band.gainDb === 0)).toBe(true);
    expect(engine.getRuntimeState().clipped).toBe(false);
  });
});
