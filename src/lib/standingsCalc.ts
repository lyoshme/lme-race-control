import type { ScoringSystem, Stage, StageResultRow } from '@/types';

/**
 * Подсчёт очков за позицию + бонусы pole/fastestLap.
 */
export function calcResultPoints(
  scoring: ScoringSystem,
  position: number,
  pole: boolean,
  fastestLap: boolean,
): number {
  const base = scoring.points[position - 1] ?? 0;
  return (
    base +
    (pole ? scoring.bonusPole : 0) +
    (fastestLap ? scoring.bonusFastestLap : 0)
  );
}

/**
 * Готовит результаты этапа из упорядоченного списка участников.
 * `orderedDriverIds[i]` → позиция i+1.
 *
 * NOTE: применением/откатом очков к standings занимается БД (RPC
 * confirm_stage / delete_stage, миграция 0030) — клиентские
 * apply/revert-функции удалены, накопление ошибок невозможно.
 */
export function buildStageResults(args: {
  scoring: ScoringSystem;
  orderedDriverIds: string[];
  poleDriverId: string | null;
  fastestLapDriverId: string | null;
  driverTeamMap: Map<string, string | null>;
}): StageResultRow[] {
  const { scoring, orderedDriverIds, poleDriverId, fastestLapDriverId, driverTeamMap } =
    args;
  return orderedDriverIds.map((driverId, idx) => {
    const position = idx + 1;
    const pole = driverId === poleDriverId;
    const fastestLap = driverId === fastestLapDriverId;
    return {
      driverId,
      teamId: driverTeamMap.get(driverId) ?? null,
      position,
      points: calcResultPoints(scoring, position, pole, fastestLap),
      pole: pole || undefined,
      fastestLap: fastestLap || undefined,
    };
  });
}

/** Возвращает топ-N результатов по позиции (для подиума). */
export function getPodium(stage: Stage, n = 3): StageResultRow[] {
  return [...stage.results].sort((a, b) => a.position - b.position).slice(0, n);
}
