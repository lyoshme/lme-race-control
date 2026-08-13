import { Calendar, Flag, MapPin, Users, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import type { Driver, Stage, StageType, Team } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  stage: Stage;
  drivers: Driver[];
  teams: Team[];
}

const TYPE_LABELS: Record<StageType, string> = {
  race: 'Гонка',
  qualifying: 'Квалификация',
  sprint: 'Спринт',
};

export function StageDetailsModal({ open, onClose, stage, drivers, teams }: Props) {
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const sorted = [...stage.results].sort((a, b) => a.position - b.position);
  const formattedDate = new Date(stage.date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal open={open} onClose={onClose} title={stage.name} size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-ink-card border border-ink-border rounded p-3">
          <Stat icon={<MapPin size={13} />} label="Трасса" value={stage.track} />
          <Stat icon={<Calendar size={13} />} label="Дата" value={formattedDate} />
          <Stat icon={<Flag size={13} />} label="Тип" value={TYPE_LABELS[stage.type]} />
          <Stat
            icon={<Users size={13} />}
            label="Участников"
            value={String(stage.participantIds.length)}
          />
        </div>

        <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-3xs uppercase tracking-badge text-text-muted bg-ink-elevated">
                <tr>
                  <th className="text-left px-3 py-2 w-12">№</th>
                  <th className="text-left px-3 py-2">Пилот</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Команда</th>
                  <th className="text-center px-2 py-2 w-12">Pole</th>
                  <th className="text-center px-2 py-2 w-12">FL</th>
                  <th className="text-right px-3 py-2 w-16 tabular">Очки</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const driver = driverMap.get(r.driverId);
                  const team = r.teamId ? teamMap.get(r.teamId) ?? null : null;
                  const isTop3 = r.position <= 3;
                  return (
                    <tr
                      key={r.driverId}
                      className={[
                        'border-t border-ink-border',
                        isTop3
                          ? 'bg-lime-primary/5'
                          : idx % 2 === 0
                          ? 'bg-ink-card'
                          : 'bg-ink-elevated/40',
                      ].join(' ')}
                    >
                      <td className="px-3 py-2 tabular font-bold">
                        <span
                          className={
                            isTop3 ? 'text-lime-primary' : 'text-text-secondary'
                          }
                        >
                          {r.position}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {driver ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={driver.photo}
                              name={`${driver.firstName} ${driver.lastName}`}
                              size={26}
                            />
                            <span className="font-bold">
                              {driver.firstName} {driver.lastName}
                            </span>
                            {driver.country && (
                              <CountryFlag code={driver.country} size={11} />
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted">Удалён</span>
                        )}
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        {team ? (
                          <div className="flex items-center gap-2 text-text-secondary">
                            <span
                              className="w-1 h-4 rounded-sm shrink-0"
                              style={{ backgroundColor: team.color }}
                            />
                            <span className="truncate">{team.name}</span>
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {r.pole && (
                          <Flag size={12} className="inline text-lime-primary" />
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {r.fastestLap && (
                          <Zap size={12} className="inline text-lime-primary" />
                        )}
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
      </div>
    </Modal>
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
      <div className="text-3xs uppercase tracking-badge text-text-muted flex items-center gap-1 mb-0.5">
        {icon} {label}
      </div>
      <div className="text-sm font-bold truncate">{value}</div>
    </div>
  );
}
