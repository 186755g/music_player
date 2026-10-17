import type { EqualizerPreset } from '../../shared/types';

export class EqualizerService {
  public static readonly defaultPreset: EqualizerPreset = {
    name: 'Frost Default',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };

  public createPreset(name: string, gains: number[]): EqualizerPreset {
    return {
      name,
      gains: gains.slice(0, 10).map((value) => Number(value) || 0)
    };
  }
}
