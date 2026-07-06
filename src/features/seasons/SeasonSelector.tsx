import { useCallback, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import type { Season } from '@/types';

interface Props {
  championshipId: string;
  seasonId: string;
  onChange: (seasonId: string) => void;
  canManage?: boolean;
  onSeasonCreated?: (season: Season) => void;
}

export function SeasonSelector({
  championshipId,
  seasonId,
  onChange,
  canManage,
  onSeasonCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetcher = useCallback(() => api.seasons.list(championshipId), [championshipId]);
  const { data: seasons } = useSupabaseQuery<Season[]>(
    fetcher,
    [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );

  const current = seasons?.find((s) => s.id === seasonId);

  async function handleCreate() {
    const name = `Сезон ${(seasons?.length ?? 0) + 1}`;
    setCreating(true);
    try {
      const season = await api.seasons.create(championshipId, name);
      onSeasonCreated?.(season);
      onChange(season.id);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-badge rounded glass-subtle hover:border-lime-primary/40 transition"
      >
        <span className="text-text-secondary">Сезон:</span>
        <span className="font-bold text-text-primary">{current?.name ?? '—'}</span>
        <ChevronDown size={12} className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] glass rounded border border-ink-border shadow-lg">
            {seasons?.map((s) => (
              <button
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={[
                  'w-full text-left px-3 py-2 text-sm transition flex items-center justify-between',
                  s.id === seasonId
                    ? 'text-lime-primary bg-lime-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-ink-elevated',
                ].join(' ')}
              >
                <span>{s.name}</span>
                <span className="flex items-center gap-2">
                  {s.isActive && <span className="text-[10px] uppercase tracking-badge text-lime-muted">активный</span>}
                  {s.finishedAt !== null && <span className="text-[10px] uppercase tracking-badge text-text-muted">завершён</span>}
                </span>
              </button>
            ))}
            {canManage && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-lime-primary hover:bg-lime-primary/10 transition flex items-center gap-2 border-t border-ink-border"
              >
                <Plus size={12} />
                {creating ? 'Создание...' : 'Новый сезон'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}