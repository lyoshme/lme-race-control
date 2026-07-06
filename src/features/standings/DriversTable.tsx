import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { useRouter } from '@/router';
import type { Driver, Stage, Standings, Team } from '@/types';

interface Props {
  drivers: Driver[];
  teams: Team[];
  standings: Standings | null;
  stages?: Stage[];
  championshipId: string;
}

export function DriversTable({ drivers, teams, standings, stages = [], championshipId }: Props) {
  const { goDriverProfile } = useRouter();
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  function avgPosition(driverId: string): number {
    if (stages.length === 0) return Infinity;
    const positions: number[] = [];
    for (const stage of stages) {
      const res = stage.results.find((r) => r.driverId === driverId);
      if (res) positions.push(res.position);
    }
    if (positions.length === 0) return Infinity;
    return positions.reduce((a, b) => a + b, 0) / positions.length;
  }

  const rows = drivers
    .map((d) => {
      const row = standings?.driverPoints[d.id];
      return {
        driver: d,
        team: d.teamId ? teamMap.get(d.teamId) ?? null : null,
        points: row?.points ?? 0,
        wins: row?.wins ?? 0,
        podiums: row?.podiums ?? 0,
        avgPos: avgPosition(d.id),
        eligible: standings
          ? !!row || (!!d.teamId && standings.selectedTeamIds.includes(d.teamId))
          : true,
      };
    })
    .filter((r) => r.eligible)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.podiums !== a.podiums) return b.podiums - a.podiums;
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
          <tr className="text-[11px] uppercase tracking-badge text-text-secondary">
            <th className="text-left px-3 py-3 w-14">№</th>
            <th className="text-left px-3 py-3">Пилот</th>
            <th className="text-left px-3 py-3 hidden sm:table-cell">Команда</th>
            <th className="text-right px-3 py-3 tabular w-20">Очки</th>
            <th className="text-right px-3 py-3 tabular w-20 hidden md:table-cell">Победы</th>
            <th className="text-right px-3 py-3 tabular w-24 hidden md:table-cell">Подиумы</th>
          </tr>
        </thead>
        <motion.tbody layout>
          <AnimatePresence initial={false}>
          {rows.map((r, idx) => {
            const place = idx + 1;
            const isTop3 = place <= 3;
            return (
              <motion.tr
                key={r.driver.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className={[
                  'border-t border-ink-border cursor-pointer',
                  idx % 2 === 0 ? 'bg-ink-card' : 'bg-ink-elevated',
                  'hover:bg-ink-surface',
                ].join(' ')}
                onClick={() => goDriverProfile(championshipId, r.driver.id)}
              >
                <td className="px-3 py-3">
                  <span className={['inline-block tabular font-bold', isTop3 ? 'text-lime-primary text-2xl leading-none' : 'text-text-secondary text-lg leading-none'].join(' ')}>
                    {place}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={r.driver.photo} name={`${r.driver.firstName} ${r.driver.lastName}`} size={32} />
                    <div className="min-w-0">
                      <div className="text-sm truncate flex items-center gap-1.5">
                        <span className="text-text-secondary tabular text-xs">#{r.driver.number}</span>
                        <span className="font-bold hover:text-lime-primary transition">{r.driver.firstName} {r.driver.lastName}</span>
                        {r.driver.country && <CountryFlag code={r.driver.country} size={12} />}
                      </div>
                      <div className="text-[11px] text-text-muted sm:hidden flex items-center gap-1.5">
                        {r.team && (
                          <>
                            <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: r.team.color }} />
                            {r.team.name}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  {r.team ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1 h-6 rounded-sm" style={{ backgroundColor: r.team.color }} />
                      <span className="text-sm">{r.team.name}</span>
                    </div>
                  ) : (
                    <span className="text-text-muted text-sm">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular font-bold">{r.points}</td>
                <td className="px-3 py-3 text-right tabular text-text-secondary hidden md:table-cell">{r.wins}</td>
                <td className="px-3 py-3 text-right tabular text-text-secondary hidden md:table-cell">{r.podiums}</td>
              </motion.tr>
            );
          })}
          </AnimatePresence>
        </motion.tbody>
      </table>
    </div>
  );
}
