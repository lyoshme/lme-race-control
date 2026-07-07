import { motion } from 'framer-motion';
import { Calendar, Flag, MapPin, Trash2, Users, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getPodium } from '@/lib/standingsCalc';
import type { Driver, Stage, StageType, Team } from '@/types';

interface Props {
  stage: Stage;
  drivers: Driver[];
  teams: Team[];
  showDelete?: boolean;
  onDelete?: () => void;
  onShowDetails?: () => void;
}

const TYPE_LABELS: Record<StageType, string> = {
  race: 'Гонка',
  qualifying: 'Квалификация',
  sprint: 'Спринт',
};

const PODIUM_CLASS = ['podium-gold', 'podium-silver', 'podium-bronze'];

export function StageCard({ stage, drivers, teams, showDelete, onDelete, onShowDetails }: Props) {
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const podium = getPodium(stage, 3);
  const formattedDate = new Date(stage.date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="card-hover bg-ink-card border border-ink-border rounded overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-ink-border flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-section uppercase truncate">
            {stage.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] uppercase tracking-badge text-text-secondary">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {stage.track}
            </span>
            <span className="flex items-center gap-1">
              <Flag size={11} /> {TYPE_LABELS[stage.type]}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              <span className="tabular">{stage.participantIds.length}</span>
            </span>
          </div>
        </div>
        {showDelete && onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-text-muted hover:text-danger transition shrink-0"
            aria-label="Удалить этап"
            title="Удалить этап"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {podium.length === 0 ? (
          <span className="text-sm text-text-muted">Нет результатов</span>
        ) : (
          podium.map((r, i) => {
            const driver = driverMap.get(r.driverId);
            const team = r.teamId ? teamMap.get(r.teamId) ?? null : null;
            const idx = r.position - 1;
            return (
              <motion.div
                key={r.driverId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-ink-elevated hover:bg-ink-surface transition-colors"
              >
                <span
                  className={[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold tabular text-ink-deep shrink-0',
                    PODIUM_CLASS[idx] ?? 'bg-text-muted',
                  ].join(' ')}
                >
                  {r.position}
                </span>
                {team && (
                  <span
                    className="w-1 h-7 rounded-sm shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                )}
                {driver && (
                  <Avatar
                    src={driver.photo}
                    name={`${driver.firstName} ${driver.lastName}`}
                    size={28}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold flex items-center gap-1.5 truncate">
                    {driver
                      ? `${driver.firstName} ${driver.lastName}`
                      : 'Удалён'}
                    {driver?.country && (
                      <CountryFlag code={driver.country} size={11} />
                    )}
                  </div>
                  {team && (
                    <div className="text-[10px] text-text-muted uppercase tracking-badge truncate">
                      {team.name}
                    </div>
                  )}
                </div>
                <span className="tabular text-sm font-bold text-lime-primary shrink-0">
                  +{r.points}
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      <button
        onClick={onShowDetails}
        className="px-4 py-2 border-t border-ink-border text-xs uppercase tracking-badge text-text-secondary hover:text-lime-primary hover:bg-ink-elevated transition flex items-center justify-center gap-1"
      >
        Все результаты
        <ChevronDown size={12} />
      </button>
    </div>
  );
}
