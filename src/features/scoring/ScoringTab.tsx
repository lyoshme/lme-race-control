import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/toast/ToastContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import * as api from '@/lib/api';
import { SCORING_PRESETS, makeScoringFromPreset } from '@/lib/scoring';
import type { ScoringSystem } from '@/types';

interface Props {
  championshipId: string;
  permissions: {
    canManageScoring: boolean;
    isOwner: boolean;
  };
}

export function ScoringTab({ championshipId, permissions }: Props) {
  const toast = useToast();
  const fetcher = useCallback(
    () => api.scoring.list(championshipId),
    [championshipId],
  );
  const { data: systemsData } = useSupabaseQuery<ScoringSystem[]>(
    fetcher,
    [{ table: 'scoring_systems', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );
  const systems = systemsData ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  // Локальное состояние редактируемой системы
  const [name, setName] = useState('');
  const [points, setPoints] = useState<string[]>([]);
  const [bonusPole, setBonusPole] = useState('0');
  const [bonusFastestLap, setBonusFastestLap] = useState('0');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const disabled = !permissions.canManageScoring;

  useEffect(() => {
    if (!activeId && systems.length > 0) setActiveId(systems[0].id);
    if (activeId && !systems.find((s) => s.id === activeId)) {
      setActiveId(systems[0]?.id ?? null);
    }
  }, [systems, activeId]);

  const active = systems.find((s) => s.id === activeId) ?? null;

  useEffect(() => {
    if (active) {
      setName(active.name);
      setPoints(active.points.map((p) => String(p)));
      setBonusPole(String(active.bonusPole));
      setBonusFastestLap(String(active.bonusFastestLap));
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function addRow() {
    if (disabled) return;
    setPoints((p) => [...p, '0']);
  }
  function removeRow(idx: number) {
    if (disabled) return;
    setPoints((p) => p.filter((_, i) => i !== idx));
  }
  function setPointAt(idx: number, value: string) {
    if (disabled) return;
    setPoints((p) => p.map((v, i) => (i === idx ? value.replace(/[^0-9.-]/g, '') : v)));
  }

  function applyPreset(presetKey: string) {
    if (disabled) return;
    const preset = SCORING_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    setName(preset.label);
    setPoints(preset.points.map(String));
    setBonusPole('0');
    setBonusFastestLap(String(preset.bonusFastestLap ?? 0));
    toast.info(`Применён пресет «${preset.label}»`);
  }

  async function createNew() {
    if (disabled) return;
    try {
      const created = await api.scoring.create({
        championshipId,
        seasonId: '',
        name: 'Новая система',
        points: [10, 8, 6, 4, 2, 1],
        bonusPole: 0,
        bonusFastestLap: 0,
      });
      setActiveId(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось создать систему');
    }
  }

  async function createFromPreset(presetKey: string) {
    if (disabled) return;
    const preset = SCORING_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    try {
      const tmp = makeScoringFromPreset(championshipId, preset);
      const created = await api.scoring.create({
        championshipId: tmp.championshipId,
        seasonId: tmp.seasonId,
        name: tmp.name,
        points: tmp.points,
        bonusPole: tmp.bonusPole,
        bonusFastestLap: tmp.bonusFastestLap,
      });
      setActiveId(created.id);
      toast.success(`Создана система «${created.name}»`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось создать систему');
    }
  }

  async function save() {
    if (disabled || !active) return;
    if (!name.trim()) {
      toast.error('Введите название системы');
      return;
    }
    const parsedPoints = points.map((p) => Math.max(0, parseInt(p, 10) || 0));
    try {
      await api.scoring.update(active.id, {
        name: name.trim(),
        points: parsedPoints,
        bonusPole: Math.max(0, parseInt(bonusPole, 10) || 0),
        bonusFastestLap: Math.max(0, parseInt(bonusFastestLap, 10) || 0),
      });
      toast.success('Система сохранена');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  }

  async function deleteActive() {
    if (disabled || !active) return;
    try {
      await api.scoring.remove(active.id);
      toast.success('Система удалена');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }

  if (systems.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-section uppercase">Система очков</h2>
        <EmptyState
          icon={<Sparkles size={36} />}
          title={disabled ? "Система очков не настроена" : "Создайте первую систему очков"}
          description={disabled ? "Владелец чемпионата ещё не создал ни одной системы очков доступа." : "Можно начать с пресета или создать свою с нуля. Систем может быть несколько — например, отдельная для гонки и для спринта."}
          action={
            !disabled ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {SCORING_PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    variant="secondary"
                    onClick={() => createFromPreset(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}
                <Button icon={<Plus size={16} />} onClick={createNew}>
                  Создать свою
                </Button>
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base uppercase tracking-section font-bold">Системы</h2>
          {!disabled && (
            <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={createNew}>
              Новая
            </Button>
          )}
        </div>
        <div className="bg-ink-card border border-ink-border rounded overflow-hidden">
          {systems.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={[
                'w-full text-left px-3 py-2.5 border-b border-ink-border last:border-b-0 transition flex items-center justify-between',
                activeId === s.id ? 'bg-ink-elevated text-lime-primary' : 'hover:bg-ink-elevated',
              ].join(' ')}
            >
              <span className="text-sm font-bold truncate">{s.name}</span>
              <span className="text-xs text-text-muted tabular">{s.points.length}</span>
            </button>
          ))}
        </div>
        {!disabled && (
          <div className="flex flex-col gap-2 pt-2">
            <span className="text-[11px] uppercase tracking-badge text-text-secondary">Пресеты</span>
            <div className="flex flex-wrap gap-2">
              {SCORING_PRESETS.map((p) => (
                <Button key={p.key} variant="ghost" size="sm" onClick={() => createFromPreset(p.key)}>
                  + {p.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {active && (
        <div className="bg-ink-card border border-ink-border rounded p-5 flex flex-col gap-5">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <Input
                label="Название системы"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                disabled={disabled}
              />
            </div>
            {!disabled && (
              <>
                <Button variant="secondary" size="sm" onClick={() => applyPreset('f1')}>
                  F1
                </Button>
                <Button variant="secondary" size="sm" onClick={() => applyPreset('sprint')}>
                  Sprint
                </Button>
                <Button variant="secondary" size="sm" onClick={() => applyPreset('custom')}>
                  Custom
                </Button>
              </>
            )}
          </div>

          <div>
            <h3 className="text-base uppercase tracking-section font-bold mb-3">Очки за места</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {points.map((p, idx) => (
                <div key={idx} className="flex items-stretch bg-ink-surface border border-ink-border rounded overflow-hidden">
                  <span className="px-3 flex items-center text-text-secondary text-sm tabular border-r border-ink-border bg-ink-elevated min-w-[44px] justify-center">
                    {idx + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => setPointAt(idx, e.target.value)}
                    inputMode="numeric"
                    className="flex-1 bg-transparent px-2 py-2 text-sm tabular focus:outline-none"
                    disabled={disabled}
                  />
                  {!disabled && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="px-2 text-text-muted hover:text-danger transition"
                      aria-label="Удалить строку"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {!disabled && (
                <button
                  onClick={addRow}
                  className="border border-dashed border-ink-border rounded px-3 py-2 text-xs uppercase tracking-badge text-text-secondary hover:border-lime-primary hover:text-lime-primary transition flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Место
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base uppercase tracking-section font-bold mb-3">Бонусы</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Поул-позиция"
                value={bonusPole}
                onChange={(e) => setBonusPole(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                className="tabular"
                disabled={disabled}
              />
              <Input
                label="Быстрый круг"
                value={bonusFastestLap}
                onChange={(e) => setBonusFastestLap(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                className="tabular"
                disabled={disabled}
              />
            </div>
          </div>

          {!disabled && (
            <div className="flex justify-between items-center pt-2 border-t border-ink-border">
              <Button
                variant="danger"
                icon={<Trash2 size={16} />}
                onClick={() => setConfirmDelete(true)}
              >
                Удалить
              </Button>
              <Button icon={<Save size={16} />} onClick={save}>
                Сохранить
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить систему очков?"
        message={active ? `«${active.name}» будет удалена.` : ''}
        destructive
        confirmLabel="Удалить"
        onConfirm={() => {
          deleteActive();
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
