import { useEffect, useState } from 'react';
import { Settings, Flag, Users, CalendarDays, ChevronLeft } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from '@/router';
import type { PublicTab } from '@/router';
import { useStorage } from '@/hooks/useStorage';
import { DataKeys } from '@/lib/data';
import * as data from '@/lib/data';
import type { Championship, Driver, Standings, Team } from '@/types';
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

  // Подписки
  const [championship] = useStorage<Championship | null>(
    DataKeys.championship(championshipId),
    true,
    null,
  );
  const [teams] = useStorage<Team[]>(DataKeys.teams(championshipId), true, []);
  const [drivers] = useStorage<Driver[]>(DataKeys.drivers(championshipId), true, []);
  const [standings] = useStorage<Standings | null>(
    DataKeys.standings(championshipId),
    true,
    null,
  );

  const [organizer, setOrganizer] = useState(false);
  useEffect(() => {
    setOrganizer(data.isOrganizer(championshipId));
  }, [championshipId]);

  if (!championship) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <EmptyState
          title="Чемпионат не найден"
          description="Возможно, он был удалён или ссылка неверна."
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
      {/* Hero / банер */}
      <section className="border-b border-ink-border">
        <div className="relative overflow-hidden">
          {championship.banner ? (
            <div className="absolute inset-0">
              <img src={championship.banner} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-deep via-ink-deep/85 to-ink-deep/40" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-ink-card" />
          )}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            <div className="flex flex-col gap-4 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={championship.status === 'active' ? 'lime' : 'muted'}>
                  {championship.status === 'active' ? 'Активен' : 'Завершён'}
                </Badge>
                <Badge variant="muted">{discipline}</Badge>
                {championship.season && <Badge variant="muted">{championship.season}</Badge>}
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold leading-none tracking-display">
                {championship.title}
              </h1>
              {championship.slogan && (
                <p className="text-sm sm:text-base uppercase tracking-section text-lime-primary">
                  {championship.slogan}
                </p>
              )}
              {organizer && (
                <div className="flex gap-2 mt-2">
                  <Button
                    icon={<Settings size={16} />}
                    onClick={() => goManage(championshipId)}
                  >
                    Управление
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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
              stagesCount={data.getStages(championshipId).length}
            />
          )}
          {tab === 'drivers' && (
            initialized ? (
              <DriversTable drivers={drivers} teams={teams} standings={standings} />
            ) : (
              <NotInitializedState organizer={organizer} onManage={() => goManage(championshipId, 'standings')} />
            )
          )}
          {tab === 'teams' && (
            initialized ? (
              <TeamsTable teams={teams} drivers={drivers} standings={standings} />
            ) : (
              <NotInitializedState organizer={organizer} onManage={() => goManage(championshipId, 'standings')} />
            )
          )}
          {tab === 'participants' && (
            <ParticipantsTab teams={teams} drivers={drivers} />
          )}
          {tab === 'stages' && (
            <StagesHistoryTab
              championshipId={championshipId}
              drivers={drivers}
              teams={teams}
            />
          )}
        </div>
      </div>
    </>
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
      <div className="lg:col-span-2 bg-ink-card border border-ink-border rounded p-5">
        <h2 className="text-base uppercase tracking-section font-bold mb-3">Описание</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-secondary">
          {championship.description || '—'}
        </p>
      </div>
      <div className="bg-ink-card border border-ink-border rounded p-5">
        <h2 className="text-base uppercase tracking-section font-bold mb-4">Статистика</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Команд" value={teamsCount} icon={<Flag size={14} />} />
          <Stat label="Пилотов" value={driversCount} icon={<Users size={14} />} />
          <Stat label="Этапов" value={stagesCount} icon={<CalendarDays size={14} />} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-ink-elevated border border-ink-border rounded p-3 flex flex-col items-start">
      <span className="text-text-secondary flex items-center gap-1 text-[11px] uppercase tracking-badge">
        {icon} {label}
      </span>
      <span className="text-2xl font-bold tabular mt-1">{value}</span>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {teams.map((t) => {
        const teamDrivers = drivers.filter((d) => d.teamId === t.id);
        return (
          <div
            key={t.id}
            className="bg-ink-card border border-ink-border rounded overflow-hidden hover:border-lime-primary transition"
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
          </div>
        );
      })}
    </div>
  );
}
