import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Eye, Lock } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRouter } from '@/router';
import type { ManageTab } from '@/router';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Championship, ChampionshipEditor, Season } from '@/types';

import { SettingsTab } from '@/features/championship/SettingsTab';
import { SeasonSelector } from '@/features/seasons/SeasonSelector';
import { SeasonsTab } from '@/features/seasons/SeasonsTab';
import { TeamsTab } from '@/features/teams/TeamsTab';
import { ScoringTab } from '@/features/scoring/ScoringTab';
import { StandingsInitTab } from '@/features/standings/StandingsInitTab';
import { StagesTab } from '@/features/stages/StagesTab';
import { EditorsTab } from '@/features/championship/EditorsTab';

interface Props {
  championshipId: string;
  tab: ManageTab;
}

export function ChampionshipManage({ championshipId, tab }: Props) {
  const { goHome, goPublic, setManageTab } = useRouter();
  const { session, profile } = useAuth();

  const fetcher = useCallback(
    () => api.championships.getById(championshipId),
    [championshipId],
  );
  const { data: championship, loading } = useSupabaseQuery<Championship | null>(
    fetcher,
    [{ table: 'championships', filter: `id=eq.${championshipId}` }],
    [championshipId],
  );

  const seasonsFetcher = useCallback(
    () => api.seasons.list(championshipId),
    [championshipId],
  );
  const { data: seasons } = useSupabaseQuery<Season[]>(
    seasonsFetcher,
    [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );
  const [seasonId, setSeasonId] = useState<string>('');
  const activeSeason = seasons?.find((s) => s.isActive) ?? seasons?.[0];

  useEffect(() => {
    if (activeSeason && !seasonId) {
      setSeasonId(activeSeason.id);
    }
  }, [activeSeason, seasonId]);

  const editorRecordFetcher = useCallback(
    () =>
      session?.user.id
        ? api.editors.getEditorRecord(championshipId, session.user.id)
        : Promise.resolve<ChampionshipEditor | null>(null),
    [championshipId, session?.user.id],
  );
  const { data: editorRecord, loading: editorLoading } = useSupabaseQuery<ChampionshipEditor | null>(
    editorRecordFetcher,
    [{ table: 'championship_editors', filter: `championship_id=eq.${championshipId}` }],
    [championshipId, session?.user.id],
  );

  const isOwner = !!(session && championship?.ownerId === session.user.id);
  const isAdmin = !!profile?.is_admin;
  const isEditor = !!editorRecord;
  const authorized = isOwner || isAdmin || isEditor;

  const permissions = useMemo(() => {
    if (isOwner || isAdmin) {
      return {
        canManageSettings: true,
        canManageTeams: true,
        canManageScoring: true,
        canManageStages: true,
        isOwner: true,
      };
    }
    if (editorRecord) {
      return {
        canManageSettings: editorRecord.canManageSettings,
        canManageTeams: editorRecord.canManageTeams,
        canManageScoring: editorRecord.canManageScoring,
        canManageStages: editorRecord.canManageStages,
        isOwner: false,
      };
    }
    return {
      canManageSettings: false,
      canManageTeams: false,
      canManageScoring: false,
      canManageStages: false,
      isOwner: false,
    };
  }, [isOwner, isAdmin, editorRecord]);

  const tabs = useMemo(() => {
    const base = [
      { key: 'settings', label: 'Настройки' },
      { key: 'teams', label: 'Команды и пилоты' },
      { key: 'scoring', label: 'Система очков' },
      { key: 'standings', label: 'Таблицы' },
      { key: 'stages', label: 'Этапы' },
    ];
    if (isOwner || isAdmin) {
      base.push({ key: 'editors', label: 'Редакторы' });
      base.push({ key: 'seasons', label: 'Сезоны' });
    }
    return base;
  }, [isOwner, isAdmin]);

  if (loading || editorLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <Skeleton className="h-12 mb-3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          title="Чемпионат не найден"
          action={
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={goHome}>
              На главную
            </Button>
          }
        />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          icon={<Lock size={36} />}
          title="Доступ только для владельца"
          description="Управлять может только создатель чемпионата или администратор."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goHome}>
                На главную
              </Button>
              <Button onClick={() => goPublic(championshipId)}>
                К чемпионату
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const moderation = championship.moderationStatus;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => goPublic(championshipId)}
          className="text-xs uppercase tracking-badge text-text-secondary hover:text-lime-primary transition flex items-center gap-1"
        >
          <ChevronLeft size={14} />
          {championship.title}
        </button>
        <span className="text-text-muted">/</span>
        <span className="text-xs uppercase tracking-badge text-lime-primary">Управление</span>
        <Button
          size="sm"
          variant="ghost"
          icon={<Eye size={14} />}
          onClick={() => goPublic(championshipId)}
          className="ml-auto"
        >
          Публичный вид
        </Button>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-display uppercase mb-2">
        {championship.title}
      </h1>

      <div className="mb-4">
        <SeasonSelector
          championshipId={championshipId}
          seasonId={seasonId}
          onChange={setSeasonId}
          canManage={isOwner || isAdmin}
        />
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {moderation === 'pending' && (
          <Badge variant="muted">На модерации</Badge>
        )}
        {moderation === 'approved' && (
          <Badge variant="lime">Опубликован</Badge>
        )}
        {moderation === 'rejected' && (
          <Badge variant="muted">Отклонён</Badge>
        )}
      </div>

      {moderation === 'pending' && (
        <div className="mb-4 bg-ink-card border border-ink-border rounded p-3 text-sm text-text-secondary">
          Чемпионат отправлен модератору. После одобрения он появится на главной странице
          и будет доступен по ссылке.
        </div>
      )}
      {moderation === 'rejected' && championship.rejectionReason && (
        <div className="mb-4 bg-danger/10 border border-danger/40 rounded p-3 text-sm">
          <div className="font-bold text-danger uppercase tracking-badge text-xs mb-1">
            Чемпионат отклонён
          </div>
          <div className="text-text-secondary">{championship.rejectionReason}</div>
        </div>
      )}

      <Tabs<ManageTab>
        tabs={tabs as any}
        active={tab}
        onChange={setManageTab}
      />

      <div className="py-6">
        {tab === 'settings' && <SettingsTab championship={championship} permissions={permissions} />}
        {tab === 'teams' && <TeamsTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
        {tab === 'scoring' && <ScoringTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
        {tab === 'standings' && <StandingsInitTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
        {tab === 'stages' && <StagesTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
        {tab === 'editors' && (isOwner || isAdmin) && <EditorsTab championshipId={championshipId} />}
        {tab === 'seasons' && (isOwner || isAdmin) && (
          <SeasonsTab championshipId={championshipId} currentSeasonId={seasonId} onSeasonChange={setSeasonId} />
        )}
      </div>
    </div>
  );
}
