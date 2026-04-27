import { useCallback, useState } from 'react';
import { Plus, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import { revertStageFromStandings } from '@/lib/standingsCalc';
import type { Driver, Stage, Standings, Team } from '@/types';
import { StageWizardModal } from './StageWizardModal';
import { StageCard } from './StageCard';

interface Props {
  championshipId: string;
}

export function StagesTab({ championshipId }: Props) {
  const toast = useToast();

  const childFilter = `championship_id=eq.${championshipId}`;

  const stagesFetcher = useCallback(
    () => api.stages.list(championshipId),
    [championshipId],
  );
  const driversFetcher = useCallback(
    () => api.drivers.list(championshipId),
    [championshipId],
  );
  const teamsFetcher = useCallback(
    () => api.teams.list(championshipId),
    [championshipId],
  );
  const standingsFetcher = useCallback(
    () => api.standings.get(championshipId),
    [championshipId],
  );
  const stagesQ = useSupabaseQuery<Stage[]>(
    stagesFetcher,
    [{ table: 'stages', filter: childFilter }],
    [championshipId],
  );
  const driversQ = useSupabaseQuery<Driver[]>(
    driversFetcher,
    [{ table: 'drivers', filter: childFilter }],
    [championshipId],
  );
  const teamsQ = useSupabaseQuery<Team[]>(
    teamsFetcher,
    [{ table: 'teams', filter: childFilter }],
    [championshipId],
  );
  const standingsQ = useSupabaseQuery<Standings | null>(
    standingsFetcher,
    [{ table: 'standings', filter: childFilter }],
    [championshipId],
  );
  const stages = stagesQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const teams = teamsQ.data ?? [];
  const standings = standingsQ.data ?? null;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Stage | null>(null);

  async function handleDelete(stage: Stage) {
    try {
      // Сначала откат standings, потом удаление этапа
      if (standings) {
        const next = revertStageFromStandings(standings, stage.results);
        await api.standings.upsert(next);
      }
      await api.stages.remove(stage.id);
      toast.success(`Этап «${stage.name}» удалён, очки откатились`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить этап');
    }
  }

  if (!standings?.initialized) {
    return (
      <EmptyState
        icon={<AlertTriangle size={36} />}
        title="Сначала инициализируйте таблицы"
        description="Перед проведением этапов выберите команды-участники и инициализируйте таблицы во вкладке «Таблицы»."
      />
    );
  }

  // Сортировка: новые сверху по дате, при равенстве — по createdAt
  const sortedStages = [...stages].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-section uppercase">Этапы</h2>
          <p className="text-sm text-text-secondary mt-1">
            Проведено: <span className="tabular text-text-primary">{stages.length}</span>
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setWizardOpen(true)}>
          Провести этап
        </Button>
      </div>

      {stages.length === 0 ? (
        <EmptyState
          icon={<Calendar size={36} />}
          title="Этапов пока нет"
          description="Запустите мастер этапа: задайте параметры, выберите участников и расставьте их по местам."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setWizardOpen(true)}>
              Провести первый этап
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedStages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              drivers={drivers}
              teams={teams}
              showDelete
              onDelete={() => setConfirmDelete(stage)}
            />
          ))}
        </div>
      )}

      <StageWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        championshipId={championshipId}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Удалить этап?"
        message={
          confirmDelete
            ? `«${confirmDelete.name}» будет удалён. Очки этапа автоматически откатятся из таблиц.`
            : ''
        }
        destructive
        confirmLabel="Удалить"
        onConfirm={() => {
          if (confirmDelete) void handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
