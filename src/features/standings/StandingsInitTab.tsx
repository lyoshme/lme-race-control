import { useEffect, useState } from 'react';
import { Check, RotateCcw, Flag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/toast/ToastContext';
import { useStorage } from '@/hooks/useStorage';
import { DataKeys } from '@/lib/data';
import * as data from '@/lib/data';
import type { Driver, Standings, Team } from '@/types';
import { DriversTable } from './DriversTable';
import { TeamsTable } from './TeamsTable';

interface Props {
  championshipId: string;
}

export function StandingsInitTab({ championshipId }: Props) {
  const toast = useToast();
  const [teams] = useStorage<Team[]>(DataKeys.teams(championshipId), true, []);
  const [drivers] = useStorage<Driver[]>(DataKeys.drivers(championshipId), true, []);
  const [standings] = useStorage<Standings | null>(
    DataKeys.standings(championshipId),
    true,
    null,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (standings?.selectedTeamIds) {
      setSelected(new Set(standings.selectedTeamIds));
    } else {
      setSelected(new Set(teams.map((t) => t.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings?.initialized]);

  function toggle(id: string) {
    if (standings?.initialized) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(teams.map((t) => t.id)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  function initialize() {
    const selectedTeams = teams.filter((t) => selected.has(t.id));
    if (selectedTeams.length === 0) {
      toast.error('Выберите хотя бы одну команду');
      return;
    }
    const selectedDrivers = drivers.filter((d) => d.teamId && selected.has(d.teamId));
    if (selectedDrivers.length === 0) {
      toast.error('У выбранных команд нет пилотов');
      return;
    }

    const driverPoints: Standings['driverPoints'] = {};
    for (const d of selectedDrivers) {
      driverPoints[d.id] = { points: 0, wins: 0, podiums: 0 };
    }
    const teamPoints: Standings['teamPoints'] = {};
    for (const t of selectedTeams) {
      teamPoints[t.id] = 0;
    }

    const s: Standings = {
      championshipId,
      initialized: true,
      selectedTeamIds: selectedTeams.map((t) => t.id),
      driverPoints,
      teamPoints,
    };
    data.setStandings(championshipId, s);
    toast.success('Чемпионат инициализирован');
  }

  function reset() {
    data.removeStandings(championshipId);
    toast.success('Таблицы сброшены');
  }

  if (teams.length === 0 || drivers.length === 0) {
    return (
      <EmptyState
        icon={<Flag size={36} />}
        title="Нет команд или пилотов"
        description="Перед инициализацией таблиц добавьте команды и пилотов на вкладке «Команды и пилоты»."
      />
    );
  }

  if (standings?.initialized) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-ink-card border border-ink-border rounded p-5 flex items-start gap-3">
          <Check size={20} className="text-success shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base uppercase tracking-section font-bold mb-1">
              Таблицы инициализированы
            </h3>
            <p className="text-sm text-text-secondary">
              Чемпионат опубликован: команд — {standings.selectedTeamIds.length}, пилотов —{' '}
              {Object.keys(standings.driverPoints).length}. Этапы будут добавлять очки
              автоматически (модуль этапов — в следующей итерации).
            </p>
          </div>
          <Button
            variant="danger"
            icon={<RotateCcw size={16} />}
            onClick={() => setConfirmReset(true)}
          >
            Сбросить
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-border">
              <h3 className="text-sm uppercase tracking-badge font-bold">Пилоты</h3>
            </div>
            <DriversTable drivers={drivers} teams={teams} standings={standings} />
          </div>
          <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-border">
              <h3 className="text-sm uppercase tracking-badge font-bold">Команды</h3>
            </div>
            <TeamsTable teams={teams} drivers={drivers} standings={standings} />
          </div>
        </div>

        <ConfirmDialog
          open={confirmReset}
          title="Сбросить таблицы?"
          message="Очки и инициализация будут удалены. История этапов (если есть) также будет очищена. Это действие необратимо."
          destructive
          confirmLabel="Сбросить"
          onConfirm={() => {
            reset();
            data.setStages(championshipId, []);
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      </div>
    );
  }

  // Не инициализировано — экран выбора команд
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="bg-ink-card border border-ink-border rounded p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-lime-primary shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          Выберите команды, которые участвуют в чемпионате. После инициализации
          таблицы станут публичными, а все пилоты выбранных команд получат
          стартовые позиции с нулевыми очками.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base uppercase tracking-section font-bold">
          Команды-участники ({selected.size}/{teams.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Все
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>
            Снять
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {teams.map((t) => {
          const teamDrivers = drivers.filter((d) => d.teamId === t.id);
          const isSelected = selected.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={[
                'flex items-center gap-3 p-3 border rounded transition text-left',
                isSelected
                  ? 'bg-lime-primary/10 border-lime-primary'
                  : 'bg-ink-card border-ink-border hover:border-lime-primary/50',
              ].join(' ')}
            >
              <span
                className={[
                  'w-5 h-5 border rounded flex items-center justify-center shrink-0',
                  isSelected
                    ? 'bg-lime-primary border-lime-primary'
                    : 'border-ink-border',
                ].join(' ')}
              >
                {isSelected && <Check size={14} className="text-ink-deep" />}
              </span>
              <span
                className="w-1 h-10 rounded-sm shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <Avatar src={t.logo} name={t.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{t.name}</div>
                <div className="text-xs text-text-secondary">
                  Пилотов: <span className="tabular">{teamDrivers.length}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          icon={<Check size={16} />}
          onClick={initialize}
          disabled={selected.size === 0}
        >
          Инициализировать чемпионат
        </Button>
      </div>
    </div>
  );
}
