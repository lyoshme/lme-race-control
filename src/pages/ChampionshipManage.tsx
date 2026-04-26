import { useEffect, useState } from 'react';
import { ChevronLeft, Eye, Lock } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRouter } from '@/router';
import type { ManageTab } from '@/router';
import { useStorage } from '@/hooks/useStorage';
import { DataKeys } from '@/lib/data';
import * as data from '@/lib/data';
import type { Championship } from '@/types';

import { SettingsTab } from '@/features/championship/SettingsTab';
import { TeamsTab } from '@/features/teams/TeamsTab';
import { ScoringTab } from '@/features/scoring/ScoringTab';
import { StandingsInitTab } from '@/features/standings/StandingsInitTab';
import { StagesTab } from '@/features/stages/StagesTab';

interface Props {
  championshipId: string;
  tab: ManageTab;
}

export function ChampionshipManage({ championshipId, tab }: Props) {
  const { goHome, goPublic, setManageTab } = useRouter();
  const [championship] = useStorage<Championship | null>(
    DataKeys.championship(championshipId),
    true,
    null,
  );
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setAuthorized(data.isOrganizer(championshipId));
  }, [championshipId]);

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
          title="Доступ только для организатора"
          description="Эта страница доступна только с устройства, на котором был создан чемпионат."
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

      <h1 className="text-3xl sm:text-4xl font-bold tracking-display uppercase mb-4">
        {championship.title}
      </h1>

      <Tabs<ManageTab>
        tabs={[
          { key: 'settings', label: 'Настройки' },
          { key: 'teams', label: 'Команды и пилоты' },
          { key: 'scoring', label: 'Система очков' },
          { key: 'standings', label: 'Таблицы' },
          { key: 'stages', label: 'Этапы' },
        ]}
        active={tab}
        onChange={setManageTab}
      />

      <div className="py-6">
        {tab === 'settings' && <SettingsTab championship={championship} />}
        {tab === 'teams' && <TeamsTab championshipId={championshipId} />}
        {tab === 'scoring' && <ScoringTab championshipId={championshipId} />}
        {tab === 'standings' && <StandingsInitTab championshipId={championshipId} />}
        {tab === 'stages' && <StagesTab championshipId={championshipId} />}
      </div>
    </div>
  );
}
