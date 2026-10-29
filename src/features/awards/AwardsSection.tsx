import { useCallback } from 'react';
import { Trophy, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRouter } from '@/router';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Driver, SeasonAward, Team } from '@/types';
import { AWARD_KIND_LABELS } from '@/types';

interface Props {
  championshipId: string;
  seasonId: string;
  drivers: Driver[];
  teams: Team[];
}

/**
 * Публичная вкладка «Награды»: номинации сезона и их победители.
 * Победителя можно не указывать — тогда отображается прочерк.
 */
export function AwardsSection({ championshipId, seasonId, drivers, teams }: Props) {
  const { goDriverProfile } = useRouter();

  const awardsFetcher = useCallback(
    () =>
      seasonId
        ? api.awards.list(championshipId, seasonId)
        : Promise.resolve([] as SeasonAward[]),
    [championshipId, seasonId],
  );
  const awardsQ = useSupabaseQuery<SeasonAward[]>(
    awardsFetcher,
    [{ table: 'season_awards', filter: `championship_id=eq.${championshipId}` }],
    [championshipId, seasonId],
  );
  const awards = awardsQ.data ?? [];

  if (awardsQ.loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (awards.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={36} />}
        title="Номинаций пока нет"
        description="Создатель сезона ещё не добавил номинации."
      />
    );
  }

  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {awards.map((award) => {
        const winnerDriver =
          award.kind === 'driver' && award.winnerDriverId
            ? driverMap.get(award.winnerDriverId) ?? null
            : null;
        const winnerTeam =
          award.kind === 'team' && award.winnerTeamId
            ? teamMap.get(award.winnerTeamId) ?? null
            : null;

        return (
          <div
            key={award.id}
            className="bg-ink-card border border-ink-border rounded p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Trophy size={20} className="text-lime-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-bold uppercase tracking-section truncate">
                    {award.name}
                  </h3>
                  <div className="mt-1">
                    <Badge variant="muted">
                      <span className="inline-flex items-center gap-1">
                        {award.kind === 'driver' ? <User size={11} /> : <Users size={11} />}
                        {AWARD_KIND_LABELS[award.kind]}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-ink-border pt-4">
              {winnerDriver ? (
                <button
                  type="button"
                  onClick={() => goDriverProfile(championshipId, winnerDriver.id)}
                  className="flex items-center gap-3 text-left group rounded"
                  aria-label={`Профиль пилота ${winnerDriver.firstName} ${winnerDriver.lastName}`}
                >
                  <Avatar
                    src={winnerDriver.photo}
                    name={`${winnerDriver.firstName} ${winnerDriver.lastName}`}
                    size={40}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate flex items-center gap-1.5 group-hover:text-lime-primary transition">
                      <span className="text-xs tabular text-text-secondary">
                        #{winnerDriver.number}
                      </span>
                      {winnerDriver.firstName} {winnerDriver.lastName}
                      {winnerDriver.country && (
                        <CountryFlag code={winnerDriver.country} size={11} />
                      )}
                    </div>
                    <div className="text-2xs text-text-muted uppercase tracking-badge mt-0.5">
                      Победитель
                    </div>
                  </div>
                </button>
              ) : winnerTeam ? (
                <div className="flex items-center gap-3">
                  <span
                    className="w-1 h-9 rounded-sm shrink-0"
                    style={{ backgroundColor: winnerTeam.color }}
                  />
                  <Avatar src={winnerTeam.logo} name={winnerTeam.name} size={40} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{winnerTeam.name}</div>
                    <div className="text-2xs text-text-muted uppercase tracking-badge mt-0.5">
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
  );
}
