import type { ScoringSystem, Stage, StageResultRow, Standings } from '@/types';

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
 * Применяет результаты этапа к standings (увеличивает очки/победы/подиумы).
 * Не мутирует переданный объект — возвращает новую копию.
 */
export function applyStageToStandings(
  standings: Standings,
  results: StageResultRow[],
): Standings {
  const next = cloneStandings(standings);
  for (const r of results) {
    applyRow(next, r, +1);
  }
  return next;
}

/**
 * Откат результатов этапа из standings (для удаления / редактирования).
 * Не уходит ниже нуля по победам/подиумам — защита от ручных правок.
 */
export function revertStageFromStandings(
  standings: Standings,
  results: StageResultRow[],
): Standings {
  const next = cloneStandings(standings);
  for (const r of results) {
    applyRow(next, r, -1);
  }
  return next;
}

function applyRow(s: Standings, r: StageResultRow, sign: 1 | -1): void {
  let row = s.driverPoints[r.driverId];
  if (!row && sign === 1) {
    row = { points: 0, wins: 0, podiums: 0 };
    s.driverPoints[r.driverId] = row;
  }
  if (row) {
    row.points = Math.max(0, row.points + sign * r.points);
    if (r.position === 1) {
      row.wins = Math.max(0, row.wins + sign * 1);
    }
    if (r.position >= 1 && r.position <= 3) {
      row.podiums = Math.max(0, row.podiums + sign * 1);
    }
  }
  if (r.teamId && r.teamId in s.teamPoints) {
    s.teamPoints[r.teamId] = Math.max(
      0,
      s.teamPoints[r.teamId] + sign * r.points,
    );
  }
}

function cloneStandings(s: Standings): Standings {
  return {
    ...s,
    driverPoints: Object.fromEntries(
      Object.entries(s.driverPoints).map(([k, v]) => [k, { ...v }]),
    ),
    teamPoints: { ...s.teamPoints },
  };
}

/**
 * Готовит результаты этапа из упорядоченного списка участников.
 * `orderedDriverIds[i]` → позиция i+1.
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
