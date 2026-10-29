import { useCallback, useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2, Trophy, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { AwardKind, Driver, EditorPermissions, Season, SeasonAward, Team } from '@/types';
import { AWARD_KIND_LABELS } from '@/types';
import { AwardModal } from './AwardModal';

interface Props {
  championshipId: string;
  seasonId: string;
  permissions: EditorPermissions;
}

export function AwardsTab({ championshipId, seasonId, permissions }: Props) {
  const toast = useToast();
  const canWrite = permissions.canManageSettings;

  const seasonsFetcher = useCallback(
    () => api.seasons.list(championshipId),
    [championshipId],
  );
  const awardsFetcher = useCallback(
    () =>
      seasonId
        ? api.awards.list(championshipId, seasonId)
        : Promise.resolve([] as SeasonAward[]),
    [championshipId, seasonId],
  );
  const teamsFetcher = useCallback(
    () =>
      seasonId
        ? api.teams.list(championshipId, seasonId)
        : Promise.resolve([] as Team[]),
    [championshipId, seasonId],
  );
  const driversFetcher = useCallback(
    () =>
      seasonId
        ? api.drivers.list(championshipId, seasonId)
        : Promise.resolve([] as Driver[]),
    [championshipId, seasonId],
  );

  const champFilter = `championship_id=eq.${championshipId}`;

  const seasonsQ = useSupabaseQuery<Season[]>(
    seasonsFetcher,
    [{ table: 'seasons', filter: champFilter }],
    [championshipId],
  );
  const awardsQ = useSupabaseQuery<SeasonAward[]>(
    awardsFetcher,
    [{ table: 'season_awards', filter: champFilter }],
    [championshipId, seasonId],
  );
  const teamsQ = useSupabaseQuery<Team[]>(
    teamsFetcher,
    [{ table: 'teams', filter: champFilter }],
    [championshipId, seasonId],
  );
  const driversQ = useSupabaseQuery<Driver[]>(
    driversFetcher,
    [{ table: 'drivers', filter: champFilter }],
    [championshipId, seasonId],
  );

  const season = (seasonsQ.data ?? []).find((s) => s.id === seasonId) ?? null;
  const hasAwards = season?.hasAwards ?? false;
  const awards = awardsQ.data ?? [];
  const teams = teamsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const loading = seasonsQ.loading || awardsQ.loading || teamsQ.loading || driversQ.loading;

  const [toggling, setToggling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SeasonAward | null>(null);
  const [deleting, setDeleting] = useState<SeasonAward | null>(null);
  const deletingRef = useRef<SeasonAward | null>(null);

  async function toggleTab() {
    if (!canWrite || !season || toggling) return;
    setToggling(true);
    try {
      await api.seasons.setAwardsEnabled(season.id, !hasAwards);
      toast.success(hasAwards ? 'Вкладка «Награды» скрыта' : 'Вкладка «Награды» включена');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось изменить настройку');
    } finally {
      setToggling(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(award: SeasonAward) {
    setEditing(award);
    setModalOpen(true);
  }
  function askDelete(award: SeasonAward) {
    deletingRef.current = award;
    setDeleting(award);
  }
  async function doDelete() {
    const target = deletingRef.current;
    if (!target) return;
    try {
      await api.awards.remove(target.id);
      toast.success(`Номинация «${target.name}» удалена`);
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить номинацию');
    }
  }

  function findWinner(award: SeasonAward): { driver?: Driver; team?: Team } {
    if (award.kind === 'driver' && award.winnerDriverId) {
      return { driver: drivers.find((d) => d.id === award.winnerDriverId) };
    }
    if (award.kind === 'team' && award.winnerTeamId) {
      return { team: teams.find((t) => t.id === award.winnerTeamId) };
    }
    return {};
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-3xl">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Переключатель публичной вкладки */}
      <div
        className={[
          'bg-ink-card border rounded p-5 flex items-start gap-3 transition',
          hasAwards ? 'border-lime-primary/60' : 'border-ink-border',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={toggleTab}
          disabled={!canWrite || toggling}
          aria-pressed={hasAwards}
          aria-label={hasAwards ? 'Скрыть вкладку «Награды»' : 'Показать вкладку «Награды»'}
          className={[
            'w-5 h-5 border rounded flex items-center justify-center shrink-0 mt-0.5 transition',
            hasAwards
              ? 'bg-lime-primary border-lime-primary'
              : 'bg-ink-surface border-ink-border hover:border-lime-primary/50',
          ].join(' ')}
        >
          {hasAwards && <Check size={14} className="text-ink-deep" strokeWidth={3} />}
        </button>
        <div className="flex-1">
          <h3 className="text-base uppercase tracking-section font-bold flex items-center gap-2">
            <Trophy size={18} className="text-lime-primary" />
            Вкладка «Награды»
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {hasAwards
              ? 'Публичная вкладка с номинациями и победителями сезона включена. Номинации и победителей можно менять в любой момент.'
              : 'Вкладка скрыта публично. Включите её и добавьте номинации — названия придумываете сами, победителем может быть как пилот, так и команда.'}
          </p>
        </div>
      </div>

      {/* Список номинаций */}
      <div className="flex items-center justify-between">
        <h3 className="text-base uppercase tracking-section font-bold">
          Номинации ({awards.length})
        </h3>
        {canWrite && (
          <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={openCreate}>
            Добавить
          </Button>
        )}
      </div>

      {awards.length === 0 ? (
        <EmptyState
          icon={<Trophy size={36} />}
          title="Номинаций пока нет"
          description={
            canWrite
              ? 'Добавьте первую номинацию: например, «Лучший обгон» или «Прорыв сезона».'
              : 'Владелец сезона ещё не добавил номинации.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {awards.map((award) => {
            const winner = findWinner(award);
            return (
              <div
                key={award.id}
                className="bg-ink-card border border-ink-border rounded p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{award.name}</div>
                    <Badge variant="muted" className="mt-1">
                      <span className="inline-flex items-center gap-1">
                        {award.kind === 'driver' ? <User size={11} /> : <Users size={11} />}
                        {AWARD_KIND_LABELS[award.kind as AwardKind]}
                      </span>
                    </Badge>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Редактировать номинацию"
                        icon={<Pencil size={14} />}
                        onClick={() => openEdit(award)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Удалить номинацию"
                        icon={<Trash2 size={14} />}
                        onClick={() => askDelete(award)}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-ink-border pt-3">
                  {winner.driver ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={winner.driver.photo}
                        name={`${winner.driver.firstName} ${winner.driver.lastName}`}
                        size={32}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate flex items-center gap-1.5">
                          <span className="text-xs tabular text-text-secondary">
                            #{winner.driver.number}
                          </span>
                          {winner.driver.firstName} {winner.driver.lastName}
                          {winner.driver.country && (
                            <CountryFlag code={winner.driver.country} size={11} />
                          )}
                        </div>
                        <div className="text-2xs text-text-muted uppercase tracking-badge">
                          Победитель
                        </div>
                      </div>
                    </div>
                  ) : winner.team ? (
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-1 h-7 rounded-sm shrink-0"
                        style={{ backgroundColor: winner.team.color }}
                      />
                      <Avatar src={winner.team.logo} name={winner.team.name} size={32} />
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{winner.team.name}</div>
                        <div className="text-2xs text-text-muted uppercase tracking-badge">
                          Победитель
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-text-muted">— Победитель не определён</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AwardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          championshipId={championshipId}
          seasonId={seasonId}
          award={editing}
          drivers={drivers}
          teams={teams}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить номинацию?"
        message={deleting ? `Номинация «${deleting.name}» будет удалена безвозвратно.` : ''}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        destructive
        onConfirm={doDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
