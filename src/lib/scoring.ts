import type { ScoringSystem } from '@/types';
import { uuid } from './id';

export interface ScoringPreset {
  key: string;
  label: string;
  points: number[];
  bonusPole?: number;
  bonusFastestLap?: number;
}

export const SCORING_PRESETS: ScoringPreset[] = [
  {
    key: 'f1',
    label: 'Formula 1',
    points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    bonusFastestLap: 1,
  },
  {
    key: 'sprint',
    label: 'Sprint',
    points: [8, 7, 6, 5, 4, 3, 2, 1],
  },
  {
    key: 'custom',
    label: 'Своя',
    points: [10, 8, 6, 4, 2, 1],
  },
];

export function makeScoringFromPreset(
  championshipId: string,
  preset: ScoringPreset,
): ScoringSystem {
  return {
    id: uuid(),
    championshipId,
    seasonId: '',
    name: preset.label,
    points: [...preset.points],
    bonusPole: 0,
    bonusFastestLap: preset.bonusFastestLap ?? 0,
  };
}

export function pointsForPosition(scoring: ScoringSystem, position: number): number {
  if (position < 1) return 0;
  return scoring.points[position - 1] ?? 0;
}
