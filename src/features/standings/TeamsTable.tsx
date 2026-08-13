import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import type { Driver, Stage, Standings, Team } from '@/types';

interface Props {
  teams: Team[];
  drivers: Driver[];
  standings: Standings | null;
  stages?: Stage[];
}

export function TeamsTable({ teams, drivers, standings, stages = [] }: Props) {
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  function avgTeamPosition(teamId: string): number {
    if (stages.length === 0) return Infinity;
    const positions: number[] = [];
    for (const stage of stages) {
      for (const res of stage.results) {
        if (res.teamId === teamId) {
          positions.push(res.position);
        }
      }
    }
    if (positions.length === 0) return Infinity;
    return positions.reduce((a, b) => a + b, 0) / positions.length;
  }

  const rows = teams
    .map((t) => {
      const points = standings?.teamPoints[t.id] ?? 0;
      const teamDrivers = t.driverIds
        .map((id) => driverMap.get(id))
        .filter((d): d is Driver => !!d);
      return { team: t, points, drivers: teamDrivers, avgPos: avgTeamPosition(t.id), eligible: standings ? t.id in (standings.teamPoints) : true };
    })
    .filter((r) => r.eligible)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.avgPos - b.avgPos;
    });

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted text-sm uppercase tracking-badge">
        Нет данных
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-2xs uppercase tracking-badge text-text-secondary">
            <th className="text-left px-3 py-3 w-14">№</th>
            <th className="text-left px-3 py-3">Команда</th>
            <th className="text-left px-3 py-3 hidden md:table-cell">Пилоты</th>
            <th className="text-right px-3 py-3 tabular w-20">Очки</th>
          </tr>
        </thead>
        <motion.tbody layout>
          <AnimatePresence initial={false}>
          {rows.map((r, idx) => {
            const place = idx + 1;
            const isTop3 = place <= 3;
            return (
              <motion.tr
                key={r.team.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className={[
                  'border-t border-ink-border',
                  idx % 2 === 0 ? 'bg-ink-card' : 'bg-ink-elevated',
                  'hover:bg-ink-surface',
                ].join(' ')}
              >
                <td className="px-3 py-3">
                  <span
                    className={[
                      'inline-block tabular font-bold',
                      isTop3 ? 'text-lime-primary text-2xl leading-none' : 'text-text-secondary text-lg leading-none',
                    ].join(' ')}
                  >
                    {place}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-1 h-8 rounded-sm shrink-0"
                      style={{ backgroundColor: r.team.color }}
                    />
                    <Avatar src={r.team.logo} name={r.team.name} size={32} />
                    <span className="font-bold">{r.team.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {r.drivers.length === 0 && (
                      <span className="text-text-muted text-sm">—</span>
                    )}
                    {r.drivers.map((d) => (
                      <span
                        key={d.id}
                        className="text-xs bg-ink-elevated border border-ink-border rounded px-2 py-0.5"
                      >
                        {d.firstName} {d.lastName}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular font-bold">{r.points}</td>
              </motion.tr>
            );
          })}
          </AnimatePresence>
        </motion.tbody>
      </table>
    </div>
  );
}
