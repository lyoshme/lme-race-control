import { useCallback, useRef, useState } from 'react';
import { Check, Flag, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

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
      toast.success(`Сезон «${season.name}» создан`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось создать сезон');
    } finally {
      setCreating(false);
    }
  }

  async function handleSetActive(season: Season) {
    if (season.isActive || editingId === season.id || season.finishedAt !== null) return;
    try {
      await api.seasons.setActive(season.id, championshipId);
      onSeasonChange(season.id);
      toast.success(`Сезон «${season.name}» активирован`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось активировать сезон');
    }
  }

  async function handleFinish(season: Season) {
    try {
      await api.seasons.finish(season.id);
      toast.success(`Сезон «${season.name}» завершён`);
      setFinishingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось завершить сезон');
    }
  }

  function startEdit(season: Season) {
    setEditingId(season.id);
    setEditValue(season.name);
    setTimeout(() => editRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function saveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error('Имя сезона не может быть пустым');
      return;
    }
    try {
      await api.seasons.update(id, trimmed);
      toast.success('Имя сезона обновлено');
      setEditingId(null);
      setEditValue('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось переименовать');
    }
  }

  async function handleDelete(season: Season) {
    try {
      await api.seasons.remove(season.id);
      if (season.id === currentSeasonId) {
        const remaining = seasons.filter((s) => s.id !== season.id);
        if (remaining.length > 0) {
          const newActive = remaining.find((s) => s.finishedAt === null) ?? remaining[remaining.length - 1];
          await api.seasons.setActive(newActive.id, championshipId);
          onSeasonChange(newActive.id);
        } else {
          onSeasonChange('');
        }
      }
      toast.success(`Сезон «${season.name}» удалён`);
      setDeletingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить сезон');
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
            <Button icon={<Plus size={16} />} onClick={handleCreate} loading={creating}>
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
        <Button icon={<Plus size={16} />} onClick={handleCreate} loading={creating}>
          Новый сезон
        </Button>
      </div>

      <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
        {seasons.map((s) => {
          const isEditing = editingId === s.id;
          const isCurrent = s.id === currentSeasonId;
          const isFinished = s.finishedAt !== null;

          return (
            <div
              key={s.id}
              className={[
                'border-b border-ink-border last:border-b-0 transition flex items-center gap-2',
                isCurrent ? 'bg-ink-elevated' : 'hover:bg-ink-elevated/50',
              ].join(' ')}
            >
              {/* Активировать / Инфо */}
              <button
                onClick={() => handleSetActive(s)}
                disabled={isEditing || isFinished}
                className={[
                  'flex-1 text-left px-4 py-3 flex items-center gap-3',
                  isEditing || isFinished ? 'cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                <Trophy
                  size={16}
                  className={isCurrent ? 'text-lime-primary' : isFinished ? 'text-text-muted' : 'text-text-muted'}
                />
                {isEditing ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(s.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="flex-1 bg-transparent border-b border-lime-primary/40 text-sm font-bold text-text-primary outline-none py-0.5"
                  />
                ) : (
                  <span className={`text-sm font-bold ${isFinished ? 'text-text-secondary' : 'text-text-primary'}`}>
                    {s.name}
                  </span>
                )}
                {isCurrent && !isEditing && (
                  <span className="text-[10px] uppercase tracking-badge text-lime-muted">
                    активный
                  </span>
                )}
                {isFinished && !isEditing && (
                  <span className="text-[10px] uppercase tracking-badge text-text-muted">
                    завершён
                  </span>
                )}
              </button>

              {/* Кнопки действий */}
              <div className="flex items-center gap-1 pr-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(s.id)}
                      className="p-1.5 rounded text-lime-primary hover:bg-lime-primary/10 transition"
                      title="Сохранить"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded text-text-secondary hover:bg-ink-surface transition"
                      title="Отмена"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Завершить — только для активного сезона */}
                    {isCurrent && !isFinished && (
                      <button
                        onClick={() => setFinishingId(s.id)}
                        className="p-1.5 rounded text-text-secondary hover:text-lime-primary hover:bg-lime-primary/10 transition"
                        title="Завершить сезон"
                      >
                        <Flag size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(s)}
                      className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-ink-surface transition"
                      title="Переименовать"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingId(s.id)}
                      className="p-1.5 rounded text-text-secondary hover:text-danger hover:bg-danger/10 transition"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          const s = seasons.find((x) => x.id === deletingId);
          if (s) handleDelete(s);
        }}
        title="Удалить сезон?"
        message={
          deletingId
            ? `Сезон «${seasons.find((x) => x.id === deletingId)?.name}» будет удалён вместе со всеми этапами и результатами.`
            : ''
        }
        confirmLabel="Удалить"
        destructive
      />

      <ConfirmDialog
        open={finishingId !== null}
        onCancel={() => setFinishingId(null)}
        onConfirm={() => {
          const s = seasons.find((x) => x.id === finishingId);
          if (s) handleFinish(s);
        }}
        title="Завершить сезон?"
        message={
          finishingId
            ? `Сезон «${seasons.find((x) => x.id === finishingId)?.name}» будет отмечен как завершённый. Создайте новый сезон для продолжения.`
            : ''
        }
        confirmLabel="Завершить"
      />
    </div>
  );
}
