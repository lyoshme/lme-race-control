import { useCallback, useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Season } from '@/types';

interface Props {
  championshipId: string;
  currentSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
}

export function SeasonsTab({ championshipId, currentSeasonId, onSeasonChange }: Props) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const fetcher = useCallback(() => api.seasons.list(championshipId), [championshipId]);
  const { data: seasonsData } = useSupabaseQuery<Season[]>(
    fetcher,
    [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );
  const seasons = seasonsData ?? [];

  async function handleCreate() {
    const name = `Сезон ${(seasons.length ?? 0) + 1}`;
    setCreating(true);
    try {
      const season = await api.seasons.create(championshipId, name);
      await api.seasons.setActive(season.id, championshipId);
      onSeasonChange(season.id);
      toast.success(`Сезон «${season.name}» создан и активирован`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось создать сезон');
    } finally {
      setCreating(false);
    }
  }

  async function handleSetActive(season: Season) {
    if (season.isActive) return;
    try {
      await api.seasons.setActive(season.id, championshipId);
      onSeasonChange(season.id);
      toast.success(`Сезон «${season.name}» активирован`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось активировать сезон');
    }
  }

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-section uppercase">Сезоны</h2>
        <EmptyState
          icon={<Trophy size={36} />}
          title="Сезонов пока нет"
          description="Создайте первый сезон, чтобы начать管理工作 с этапами и зачётными таблицами."
          action={
            <Button
              icon={<Plus size={16} />}
              onClick={handleCreate}
              loading={creating}
            >
              Новый сезон
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-section uppercase">Сезоны</h2>
          <p className="text-sm text-text-secondary mt-1">
            Всего: <span className="tabular text-text-primary">{seasons.length}</span>
          </p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={handleCreate}
          loading={creating}
        >
          Новый сезон
        </Button>
      </div>

      <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
        {seasons.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSetActive(s)}
            className={[
              'w-full text-left px-4 py-3 border-b border-ink-border last:border-b-0 transition flex items-center justify-between',
              s.id === currentSeasonId
                ? 'bg-ink-elevated text-lime-primary'
                : 'hover:bg-ink-elevated text-text-primary',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <Trophy
                size={16}
                className={s.id === currentSeasonId ? 'text-lime-primary' : 'text-text-muted'}
              />
              <span className="text-sm font-bold">{s.name}</span>
            </div>
            {s.isActive && (
              <span className="text-[10px] uppercase tracking-badge text-lime-muted">активный</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
