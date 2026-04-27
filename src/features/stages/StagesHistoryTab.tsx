import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Driver, Stage, Team } from '@/types';
import { StageCard } from './StageCard';

interface Props {
  stages: Stage[];
  drivers: Driver[];
  teams: Team[];
}

export function StagesHistoryTab({ stages, drivers, teams }: Props) {
  if (stages.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={36} />}
        title="Этапов пока нет"
        description="Здесь будет история проведённых этапов с подиумом и полными результатами."
      />
    );
  }

  const sorted = [...stages].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {sorted.map((stage) => (
        <StageCard key={stage.id} stage={stage} drivers={drivers} teams={teams} />
      ))}
    </div>
  );
}
