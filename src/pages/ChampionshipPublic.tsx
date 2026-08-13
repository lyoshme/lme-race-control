import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Settings, Flag, Users, CalendarDays, ChevronLeft, Clock, Share2 } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRouter } from '@/router';
import type { PublicTab } from '@/router';
import { useAuth } from '@/hooks/useAuth';
import { useEntranceOnce } from '@/hooks/useEntranceOnce';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useToast } from '@/components/toast/ToastContext';
import * as api from '@/lib/api';
import type { Championship, Driver, Season, Stage, Standings, Team } from '@/types';
import { SeasonSelector } from '@/features/seasons/SeasonSelector';
import { DISCIPLINE_LABELS } from '@/types';
import { DriversTable } from '@/features/standings/DriversTable';
import { TeamsTable } from '@/features/standings/TeamsTable';
import { StagesHistoryTab } from '@/features/stages/StagesHistoryTab';
import { CountryFlag } from '@/components/ui/CountryFlag';

interface Props {
  championshipId: string;
  tab: PublicTab;
}

export function ChampionshipPublic({ championshipId, tab }: Props) {
  const { goHome, goManage, setPublicTab } = useRouter();
  const { session, profile } = useAuth();
  const toast = useToast();
  const entrance = useEntranceOnce(`public:${championshipId}`);
  const [seasonId, setSeasonId] = useState<string>('');

  const champFetcher = useCallback(
    () => api.championships.getById(championshipId),
    [championshipId],
  );
  const seasonsFetcher = useCallback(
    () => api.seasons.list(championshipId),
    [championshipId],
  );
  const teamsFetcher = useCallback(
    () => seasonId ? api.teams.list(championshipId, seasonId) : Promise.resolve([]),
    [championshipId, seasonId],
  );
  const driversFetcher = useCallback(
    () => seasonId ? api.drivers.list(championshipId, seasonId) : Promise.resolve([]),
    [championshipId, seasonId],
  );
  const standingsFetcher = useCallback(
    () => seasonId ? api.standings.get(championshipId, seasonId) : Promise.resolve(null),
    [championshipId, seasonId],
  );
  const stagesFetcher = useCallback(
    () => seasonId ? api.stages.list(championshipId, seasonId) : Promise.resolve([]),
    [championshipId, seasonId],
  );

  const champFilter = `id=eq.${championshipId}`;
  const seasonFilter = `championship_id=eq.${championshipId}`;

  const champQ = useSupabaseQuery<Championship | null>(
    champFetcher,
    [{ table: 'championships', filter: champFilter }],
    [championshipId],
  );
  const { data: seasons } = useSupabaseQuery<Season[]>(
    seasonsFetcher,
    [{ table: 'seasons', filter: seasonFilter }],
    [championshipId],
  );
  const teamsQ = useSupabaseQuery<Team[]>(
    teamsFetcher,
    [{ table: 'teams', filter: `championship_id=eq.${championshipId}${seasonId ? `,season_id=eq.${seasonId}` : ''}` }],
    [championshipId, seasonId],
  );
  const driversQ = useSupabaseQuery<Driver[]>(
    driversFetcher,
    [{ table: 'drivers', filter: `championship_id=eq.${championshipId}${seasonId ? `,season_id=eq.${seasonId}` : ''}` }],
    [championshipId, seasonId],
  );
  const standingsQ = useSupabaseQuery<Standings | null>(
    standingsFetcher,
    [{ table: 'standings', filter: `championship_id=eq.${championshipId}${seasonId ? `,season_id=eq.${seasonId}` : ''}` }],
    [championshipId, seasonId],
  );
  const stagesQ = useSupabaseQuery<Stage[]>(
    stagesFetcher,
    [{ table: 'stages', filter: `championship_id=eq.${championshipId}${seasonId ? `,season_id=eq.${seasonId}` : ''}` }],
    [championshipId, seasonId],
  );

  useEffect(() => {
    if (seasons && seasons.length > 0 && !seasonId) {
      const active = seasons.find((s) => s.isActive) ?? seasons[seasons.length - 1];
      setSeasonId(active.id);
    }
  }, [seasons, seasonId]);

  const championship = champQ.data;
  const teams = teamsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const standings = standingsQ.data ?? null;
  const stages = stagesQ.data ?? [];
  const loading = champQ.loading;

  const isOwner = !!(session && championship?.ownerId === session.user.id);
  const isAdmin = !!profile?.is_admin;
  const organizer = isOwner || isAdmin;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <Skeleton className="h-48 mb-6" />
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
          description="Возможно, он был удалён, ещё не одобрен модератором, или ссылка неверна."
          action={
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={goHome}>
              На главную
            </Button>
          }
        />
      </div>
    );
  }

  const moderation = championship.moderationStatus;
  if (moderation !== 'approved' && !organizer) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          icon={<Clock size={36} />}
          title="Чемпионат ещё не опубликован"
          description="Этот чемпионат проходит модерацию или был отклонён. Он станет доступен после одобрения."
          action={
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={goHome}>
              На главную
            </Button>
          }
        />
      </div>
    );
  }

  const discipline =
    championship.discipline === 'custom' && championship.disciplineCustom
      ? championship.disciplineCustom
      : DISCIPLINE_LABELS[championship.discipline];

  const initialized = standings?.initialized;

  return (
    <>
      {/* Hero / банер с parallax */}
      <section className="border-b border-ink-border">
        <ChampionshipBanner banner={championship.banner}>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            <motion.div
              className="flex flex-col gap-4 max-w-3xl"
              initial={entrance ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {moderation === 'pending' && (
                  <Badge variant="muted">На модерации</Badge>
                )}
                {moderation === 'rejected' && (
                  <Badge variant="muted">Отклонён</Badge>
                )}
                <Badge variant={championship.status === 'active' ? 'lime' : 'muted'}>
                  {championship.status === 'active' ? 'Активен' : 'Завершён'}
                </Badge>
                <Badge variant="muted">{discipline}</Badge>
                {championship.season && <Badge variant="muted">{championship.season}</Badge>}
                <SeasonSelector championshipId={championshipId} seasonId={seasonId} onChange={setSeasonId} />
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold leading-none tracking-display">
                {championship.title}
              </h1>
              {championship.slogan && (
                <p className="text-sm sm:text-base uppercase tracking-section text-lime-primary">
                  {championship.slogan}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="secondary"
                  icon={<Share2 size={16} />}
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/share/${championshipId}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: championship.title,
                          text: championship.description || undefined,
                          url: shareUrl,
                        });
                      } else if (navigator.clipboard) {
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success('Ссылка скопирована');
                      } else {
                        toast.error('Браузер не поддерживает шаринг');
                      }
                    } catch (e) {
                      if (e instanceof Error && e.name !== 'AbortError') {
                        toast.error('Не удалось поделиться');
                      }
                    }
                  }}
                >
                  Поделиться
                </Button>
                {organizer && (
                  <Button
                    icon={<Settings size={16} />}
                    onClick={() => goManage(championshipId)}
                  >
                    Управление
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </ChampionshipBanner>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Tabs<PublicTab>
          tabs={[
            { key: 'overview', label: 'Обзор' },
            { key: 'drivers', label: 'Пилоты', badge: drivers.length ? String(drivers.length) : undefined },
            { key: 'teams', label: 'Команды', badge: teams.length ? String(teams.length) : undefined },
            { key: 'participants', label: 'Участники' },
            { key: 'stages', label: 'Этапы' },
          ]}
          active={tab}
          onChange={setPublicTab}
          className="mt-6"
        />

        <div className="py-6">
          {tab === 'overview' && (
            <OverviewTab
              championship={championship}
              teamsCount={teams.length}
              driversCount={drivers.length}
              stagesCount={stages.length}
            />
          )}
          {tab === 'drivers' && (
            initialized ? (
              <DriversTable drivers={drivers} teams={teams} standings={standings} stages={stages} championshipId={championshipId} />
            ) : (
              <NotInitializedState organizer={organizer} onManage={() => goManage(championshipId, 'standings')} />
            )
          )}
          {tab === 'teams' && (
            initialized ? (
              <TeamsTable teams={teams} drivers={drivers} standings={standings} stages={stages} />
            ) : (
              <NotInitializedState organizer={organizer} onManage={() => goManage(championshipId, 'standings')} />
            )
          )}
          {tab === 'participants' && (
            <ParticipantsTab teams={teams} drivers={drivers} />
          )}
          {tab === 'stages' && (
            <StagesHistoryTab stages={stages} drivers={drivers} teams={teams} />
          )}
        </div>
      </div>
    </>
  );
}

/** Parallax баннер чемпионата */
function ChampionshipBanner({ banner, children }: { banner: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div ref={ref} className="relative overflow-hidden">
      {banner ? (
        <div className="absolute inset-0">
          <motion.img
            src={banner}
            alt=""
            className="w-full h-full object-cover parallax-banner"
            style={{ y: reduceMotion ? 0 : y }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-deep via-ink-deep/85 to-ink-deep/40" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-ink-card" />
      )}
      {children}
    </div>
  );
}

function NotInitializedState({
  organizer,
  onManage,
}: {
  organizer: boolean;
  onManage: () => void;
}) {
  return (
    <EmptyState
      icon={<Flag size={36} />}
      title="Таблицы ещё не инициализированы"
      description={
        organizer
          ? 'Перейдите в управление, выберите команды-участников и инициализируйте таблицы.'
          : 'Организатор пока не запустил чемпионат — таблицы появятся позже.'
      }
      action={
        organizer ? (
          <Button icon={<Settings size={16} />} onClick={onManage}>
            Перейти к управлению
          </Button>
        ) : null
      }
    />
  );
}

function OverviewTab({
  championship,
  teamsCount,
  driversCount,
  stagesCount,
}: {
  championship: Championship;
  teamsCount: number;
  driversCount: number;
  stagesCount: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div
        className="lg:col-span-2 bg-ink-card border border-ink-border rounded p-5"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-base uppercase tracking-section font-bold mb-3">Описание</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-secondary">
          {championship.description || '—'}
        </p>
      </motion.div>
      <motion.div
        className="bg-ink-card border border-ink-border rounded p-5"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="text-base uppercase tracking-section font-bold mb-4">Статистика</h2>
        <div className="grid grid-cols-3 gap-3">
          <CountUpStat label="Команд" value={teamsCount} icon={<Flag size={14} />} />
          <CountUpStat label="Пилотов" value={driversCount} icon={<Users size={14} />} />
          <CountUpStat label="Этапов" value={stagesCount} icon={<CalendarDays size={14} />} />
        </div>
      </motion.div>
    </div>
  );
}

/** Статистика с анимацией countUp */
function CountUpStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView || value === 0 || reduceMotion) {
      setDisplay(value);
      return;
    }
    const duration = 600;
    const start = performance.now();
    const from = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value, reduceMotion]);

  return (
    <div ref={ref} className="bg-ink-elevated border border-ink-border rounded p-3 flex flex-col items-start">
      <span className="text-text-secondary flex items-center gap-1 text-2xs uppercase tracking-badge">
        {icon} {label}
      </span>
      <span className="text-2xl font-bold tabular mt-1">{display}</span>
    </div>
  );
}

function ParticipantsTab({ teams, drivers }: { teams: Team[]; drivers: Driver[] }) {
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={<Flag size={36} />}
        title="Нет команд"
        description="Команды и пилоты появятся здесь после добавления в управлении."
      />
    );
  }
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {teams.map((t) => {
        const teamDrivers = drivers.filter((d) => d.teamId === t.id);
        return (
          <motion.div
            key={t.id}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="card-hover bg-ink-card border border-ink-border rounded overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-ink-border">
              <span className="w-1.5 h-12 rounded-sm" style={{ backgroundColor: t.color }} />
              <Avatar src={t.logo} name={t.name} size={40} />
              <h3 className="text-lg font-bold tracking-section uppercase">{t.name}</h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {teamDrivers.length === 0 ? (
                <span className="text-sm text-text-muted">Нет пилотов</span>
              ) : (
                teamDrivers.map((d) => (
                  <div key={d.id} className="flex items-center gap-3">
                    <Avatar src={d.photo} name={`${d.firstName} ${d.lastName}`} size={32} />
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        {d.firstName} {d.lastName}
                        {d.country && <CountryFlag code={d.country} size={12} />}
                      </div>
                    </div>
                    <span className="tabular text-text-secondary text-sm">#{d.number}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
