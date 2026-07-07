import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Trophy, Target, Medal, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { useRouter } from '@/router';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Driver, Season, Stage, Standings, Team } from '@/types';

interface Props {
  championshipId: string;
  driverId: string;
}

export function DriverProfile({ championshipId, driverId }: Props) {
  const { goPublic } = useRouter();

  const champFetcher = useCallback(
    () => api.championships.getById(championshipId),
    [championshipId],
  );
  const seasonsFetcher = useCallback(
    () => api.seasons.list(championshipId),
    [championshipId],
  );

  const champQ = useSupabaseQuery(champFetcher, [{ table: 'championships', filter: `id=eq.${championshipId}` }], [championshipId]);
  const seasonsQ = useSupabaseQuery<Season[]>(
    seasonsFetcher,
    [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );

  // Найти сезон, в котором есть этот пилот
  const [foundSeasonId, setFoundSeasonId] = useState<string>('');
  const seasons = seasonsQ.data ?? [];

  useEffect(() => {
    if (seasons.length === 0) return;
    // Попробовать найти пилота в каждом сезоне
    async function findDriverSeason() {
      for (const s of seasons) {
        const drivers = await api.drivers.list(championshipId, s.id);
        if (drivers.some((d) => d.id === driverId)) {
          setFoundSeasonId(s.id);
          return;
        }
      }
      // Если не найден — использовать активный
      const active = seasons.find((s) => s.isActive) ?? seasons[0];
      setFoundSeasonId(active?.id ?? '');
    }
    if (!foundSeasonId) findDriverSeason();
  }, [seasons, championshipId, driverId, foundSeasonId]);

  const seasonId = foundSeasonId;

  const teamsFetcher = useCallback(
    () => api.teams.list(championshipId, seasonId),
    [championshipId, seasonId],
  );
  const driversFetcher = useCallback(
    () => api.drivers.list(championshipId, seasonId),
    [championshipId, seasonId],
  );
  const standingsFetcher = useCallback(
    () => api.standings.get(championshipId, seasonId),
    [championshipId, seasonId],
  );
  const stagesFetcher = useCallback(
    () => api.stages.list(championshipId, seasonId),
    [championshipId, seasonId],
  );

  const childFilter = `championship_id=eq.${championshipId}`;

  const teamsQ = useSupabaseQuery<Team[]>(teamsFetcher, [{ table: 'teams', filter: childFilter }], [championshipId, seasonId]);
  const driversQ = useSupabaseQuery<Driver[]>(driversFetcher, [{ table: 'drivers', filter: childFilter }], [championshipId, seasonId]);
  const standingsQ = useSupabaseQuery<Standings | null>(standingsFetcher, [{ table: 'standings', filter: childFilter }], [championshipId, seasonId]);
  const stagesQ = useSupabaseQuery<Stage[]>(stagesFetcher, [{ table: 'stages', filter: childFilter }], [championshipId, seasonId]);

  const championship = champQ.data;
  const teams = teamsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const standings = standingsQ.data ?? null;
  const stages = stagesQ.data ?? [];
  const loading = champQ.loading || seasonsQ.loading || driversQ.loading;

  const driver = drivers.find((d) => d.id === driverId);
  const team = driver?.teamId ? teams.find((t) => t.id === driver.teamId) ?? null : null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <Skeleton className="h-80 mb-6" />
        <Skeleton className="h-12 mb-3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          title="Пилот не найден"
          description="Возможно, пилот был удалён или ссылка неверна."
          action={
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => goPublic(championshipId)}>
              Назад к чемпионату
            </Button>
          }
        />
      </div>
    );
  }

  // Собираем результаты пилота по этапам
  const driverResults = stages
    .map((stage) => {
      const result = stage.results.find((r) => r.driverId === driverId);
      return result ? { stage, result } : null;
    })
    .filter(Boolean) as { stage: Stage; result: NonNullable<ReturnType<typeof stages[0]['results']['find']>> }[];

  // Статистика
  const driverPoints = standings?.driverPoints[driverId];
  const totalPoints = driverPoints?.points ?? 0;
  const totalWins = driverPoints?.wins ?? 0;
  const totalPodiums = driverPoints?.podiums ?? 0;

  const positions = driverResults.map((r) => r.result.position);
  const avgPosition = positions.length > 0
    ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
    : '—';
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null;

  return (
    <>
      {/* Hero section — вдохновлён driverprofile.png */}
      <section className="relative overflow-hidden border-b border-ink-border">
        {/* Фоновый градиент команды или стандартный */}
        <div
          className="absolute inset-0"
          style={{
            background: team
              ? `linear-gradient(135deg, ${team.color}22 0%, transparent 50%), linear-gradient(225deg, ${team.color}11 0%, transparent 60%)`
              : undefined,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-deep via-ink-deep/95 to-ink-deep/70" />

        {/* Огромный номер пилота на фоне —(signature element) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[20rem] sm:text-[28rem] font-black leading-none text-white/[0.03] select-none pointer-events-none pr-8">
          {driver.number || '?'}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            {/* Информация — слева */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronLeft size={14} />}
                onClick={() => goPublic(championshipId, 'drivers')}
                className="mb-6 mx-auto lg:mx-0"
              >
                К пилотам
              </Button>

              {/* Имя */}
              <div className="mb-4">
                <p className="text-2xl sm:text-3xl font-light text-text-secondary tracking-wide">
                  {driver.firstName}
                </p>
                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-display leading-none">
                  {driver.lastName}
                </h1>
              </div>

              {/* Мета-информация */}
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-text-secondary mb-6">
                {driver.country && (
                  <span className="flex items-center gap-1.5">
                    <CountryFlag code={driver.country} size={16} />
                    {driver.country}
                  </span>
                )}
                {team && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </span>
                )}
                {driver.number && (
                  <span className="flex items-center gap-1.5 font-bold text-text-primary">
                    <span className="text-xs text-text-muted">№</span>
                    {driver.number}
                  </span>
                )}
              </div>

              {/* Бейджи */}
              <div className="flex items-center justify-center lg:justify-start gap-2">
                {totalWins > 0 && (
                  <Badge variant="lime">
                    <Trophy size={10} className="inline mr-1" />
                    {totalWins} {totalWins === 1 ? 'победа' : totalWins < 5 ? 'победы' : 'побед'}
                  </Badge>
                )}
                {totalPodiums > 0 && (
                  <Badge variant="outline">
                    <Medal size={10} className="inline mr-1" />
                    {totalPodiums} подиум{totalPodiums !== 1 ? 'ов' : ''}
                  </Badge>
                )}
                <Badge variant="muted">
                  {driverResults.length} {driverResults.length === 1 ? 'этап' : driverResults.length < 5 ? 'этапа' : 'этапов'}
                </Badge>
              </div>
            </motion.div>

            {/* Фото пилота — справа */}
            <motion.div
              className="relative shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative w-64 h-80 sm:w-80 sm:h-[26rem]">
                {/* Цветная полоса команды */}
                {team && (
                  <div
                    className="absolute -left-3 top-8 bottom-8 w-1.5 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                )}
                {/* Фото */}
                <div className="w-full h-full rounded-lg overflow-hidden bg-ink-card border border-ink-border">
                  <Avatar
                    src={driver.photo}
                    name={`${driver.firstName} ${driver.lastName}`}
                    size={320}
                    className="w-full h-full"
                  />
                </div>
                {/* Номер на фото */}
                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-lg bg-lime-primary text-ink-deep flex items-center justify-center text-3xl font-black shadow-lg">
                  {driver.number || '?'}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <motion.h2
          className="text-lg font-bold tracking-section uppercase mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Статистика сезона
        </motion.h2>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <StatCard label="Очки" value={String(totalPoints)} icon={<Trophy size={16} />} accent />
          <StatCard label="Победы" value={String(totalWins)} icon={<Trophy size={16} />} />
          <StatCard label="Подиумы" value={String(totalPodiums)} icon={<Medal size={16} />} />
          <StatCard label="Средняя позиция" value={avgPosition} icon={<Target size={16} />} />
          <StatCard
            label="Лучшая позиция"
            value={bestPosition !== null ? `P${bestPosition}` : '—'}
            icon={<MapPin size={16} />}
          />
        </motion.div>
      </section>

      {/* Результаты по этапам */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
        <motion.h2
          className="text-lg font-bold tracking-section uppercase mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Результаты по этапам
        </motion.h2>

        {driverResults.length === 0 ? (
          <EmptyState
            icon={<Trophy size={36} />}
            title="Нет результатов"
            description="Пилот пока не участвовал в завершённых этапах."
          />
        ) : (
          <motion.div
            className="overflow-x-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-badge text-text-secondary border-b border-ink-border">
                  <th className="text-left px-4 py-3">Этап</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Дата</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Трасса</th>
                  <th className="text-center px-4 py-3">Позиция</th>
                  <th className="text-right px-4 py-3">Очки</th>
                  <th className="text-center px-4 py-3 hidden sm:table-cell">Бонусы</th>
                </tr>
              </thead>
              <tbody>
                {driverResults.map(({ stage, result }, idx) => {
                  const isWin = result.position === 1;
                  const isPodium = result.position <= 3;
                  const formattedDate = new Date(stage.date).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'short',
                  });
                  return (
                    <motion.tr
                      key={stage.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.04 }}
                      className="border-b border-ink-border hover:bg-ink-surface transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-sm">{stage.name}</div>
                        <div className="text-[11px] text-text-muted sm:hidden">{formattedDate}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden sm:table-cell tabular">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell">
                        {stage.track}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={[
                            'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold tabular',
                            isWin ? 'bg-lime-primary text-ink-deep' : isPodium ? 'bg-ink-elevated text-text-primary' : 'text-text-secondary',
                          ].join(' ')}
                        >
                          {result.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular font-bold text-lime-primary">
                        {result.points}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {result.pole && (
                            <Badge variant="lime" className="text-[9px]">Pole</Badge>
                          )}
                          {result.fastestLap && (
                            <Badge variant="outline" className="text-[9px]">FL</Badge>
                          )}
                          {!result.pole && !result.fastestLap && (
                            <span className="text-text-muted">—</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        'glass rounded-lg p-4 flex flex-col gap-1',
        accent ? 'border-lime-primary/20' : '',
      ].join(' ')}
    >
      <span className="text-text-secondary flex items-center gap-1.5 text-[11px] uppercase tracking-badge">
        {icon} {label}
      </span>
      <span
        className={[
          'text-2xl font-black tabular leading-none',
          accent ? 'text-lime-primary' : 'text-text-primary',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
