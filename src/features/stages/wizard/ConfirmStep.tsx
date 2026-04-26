import { useMemo } from 'react';
import { Calendar, Flag, MapPin, Zap } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { calcResultPoints } from '@/lib/standingsCalc';
import type { Driver, ScoringSystem, StageType, Team } from '@/types';

interface Props {
  name: string;
  track: string;
  date: string;
  type: StageType;
  typeLabel: string;
  scoring: ScoringSystem;
  orderedIds: string[];
  driverMap: Map<string, Driver>;
  teamMap: Map<string, Team>;
  poleId: string | null;
  fastestLapId: string | null;
}

export function ConfirmStep({
  name,
  track,
  date,
  typeLabel,
  scoring,
  orderedIds,
  driverMap,
  teamMap,
  poleId,
  fastestLapId,
}: Props) {
  const rows = useMemo(() => {
    return orderedIds.map((id, idx) => {
      const driver = driverMap.get(id);
      const team = driver?.teamId ? teamMap.get(driver.teamId) ?? null : null;
      const position = idx + 1;
      const pole = id === poleId;
      const fl = id === fastestLapId;
      const points = calcResultPoints(scoring, position, pole, fl);
      return { id, position, driver, team, pole, fl, points };
    });
  }, [orderedIds, driverMap, teamMap, poleId, fastestLapId, scoring]);

  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-ink-card border border-ink-border rounded p-4">
        <h3 className="text-base font-bold tracking-section uppercase mb-3">
          {name || '—'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat icon={<MapPin size={14} />} label="Трасса" value={track || '—'} />
          <Stat icon={<Calendar size={14} />} label="Дата" value={formattedDate} />
          <Stat icon={<Flag size={14} />} label="Тип" value={typeLabel} />
          <Stat icon={<Zap size={14} />} label="Очки" value={scoring.name} />
        </div>
      </div>

      <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
        <div className="px-4 py-2 border-b border-ink-border flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-badge text-text-secondary">
            Финиш ({rows.length} участников)
          </h4>
          <span className="text-xs uppercase tracking-badge text-text-secondary">
            Сумма очков:{' '}
            <span className="text-lime-primary tabular font-bold">{totalPoints}</span>
          </span>
        </div>
        <div className="max-h-[45vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-badge text-text-muted bg-ink-elevated sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 w-10">№</th>
                <th className="text-left px-3 py-2">Пилот</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">Команда</th>
                <th className="text-center px-2 py-2 w-12">Pole</th>
                <th className="text-center px-2 py-2 w-12">FL</th>
                <th className="text-right px-3 py-2 w-16 tabular">Очки</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                if (!r.driver) return null;
                const isTop3 = r.position <= 3;
                return (
                  <tr
                    key={r.id}
                    className={[
                      'border-t border-ink-border transition',
                      isTop3 ? 'bg-lime-primary/5' : idx % 2 === 0 ? 'bg-ink-card' : 'bg-ink-elevated/40',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2 tabular font-bold text-lime-primary">
                      {r.position}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={r.driver.photo}
                          name={`${r.driver.firstName} ${r.driver.lastName}`}
                          size={24}
                        />
                        <span className="font-bold">
                          {r.driver.firstName} {r.driver.lastName}
                        </span>
                        {r.driver.country && (
                          <CountryFlag code={r.driver.country} size={11} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      {r.team ? (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <span
                            className="w-1 h-4 rounded-sm shrink-0"
                            style={{ backgroundColor: r.team.color }}
                          />
                          <span className="truncate">{r.team.name}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {r.pole && <Flag size={12} className="inline text-lime-primary" />}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {r.fl && <Zap size={12} className="inline text-lime-primary" />}
                    </td>
                    <td className="px-3 py-2 text-right tabular font-bold">
                      {r.points > 0 ? `+${r.points}` : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-text-muted">
        После сохранения очки будут автоматически добавлены в общие таблицы пилотов и команд.
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-badge text-text-muted flex items-center gap-1 mb-0.5">
        {icon} {label}
      </div>
      <div className="text-sm font-bold truncate">{value}</div>
    </div>
  );
}
