import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Info,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CountryFlag } from '@/components/ui/CountryFlag';
import type { Driver, Team } from '@/types';

interface Props {
  /** Все пилоты сезона — не только включённые в зачёт. */
  drivers: Driver[];
  teams: Team[];
  participantIds: string[];
  onChange: (ids: string[]) => void;
}

/** Ключ секции: id команды либо `__solo__` для блока индивидуальных пилотов. */
const SOLO_KEY = '__solo__';

export function ParticipantsStep({
  drivers,
  teams,
  participantIds,
  onChange,
}: Props) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const selected = useMemo(() => new Set(participantIds), [participantIds]);
  const q = query.trim().toLowerCase();

  // Поиск: имя, фамилия, номер, название команды
  const filtered = useMemo(() => {
    if (!q) return drivers;
    const teamNames = new Map(teams.map((t) => [t.id, t.name.toLowerCase()]));
    return drivers.filter((d) => {
      const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
      if (fullName.includes(q) || String(d.number).includes(q)) return true;
      if (d.teamId && (teamNames.get(d.teamId) ?? '').includes(q)) return true;
      return false;
    });
  }, [drivers, teams, q]);

  // Группировка отфильтрованных пилотов по командам; команда, отсутствующая
  // в списке (крайний случай после удаления), попадает в блок одиночек.
  const grouped = useMemo(() => {
    const teamSet = new Set(teams.map((t) => t.id));
    const byTeam = new Map<string | null, Driver[]>();
    for (const d of filtered) {
      const key = d.teamId && teamSet.has(d.teamId) ? d.teamId : null;
      const arr = byTeam.get(key) ?? [];
      arr.push(d);
      byTeam.set(key, arr);
    }
    return byTeam;
  }, [filtered, teams]);

  if (drivers.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted text-sm">
        В этом сезоне пока нет пилотов — добавьте их на вкладке «Команды и пилоты».
      </div>
    );
  }

  /* -------------------- Массовые действия -------------------- */

  // В активным поиском «Все»/«Снять» работают только с тем, что видно.
  function toggleVisible() {
    const next = new Set(selected);
    const allVisible = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
    for (const d of filtered) {
      if (allVisible) next.delete(d.id);
      else next.add(d.id);
    }
    onChange([...next]);
  }
  function clearAll() {
    onChange([]);
  }
  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function collapseAll(expand: boolean) {
    if (expand) {
      setCollapsed(new Set());
      return;
    }
    const keys: string[] = [...teams.map((t) => t.id)];
    if ((grouped.get(null) ?? []).length > 0) keys.push(SOLO_KEY);
    setCollapsed(new Set(keys));
  }

  const allCollapsed = collapsed.size > 0 && !q;
  const solo = grouped.get(null) ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Счётчик + массовые действия */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2 text-sm min-w-0">
          <Users size={16} className="text-lime-primary self-center shrink-0" />
          <span className="font-bold tabular">{participantIds.length}</span>
          <span className="text-text-secondary">
            из {drivers.length} выбрано
          </span>
          {q && (
            <span className="text-2xs text-text-muted uppercase tracking-badge">
              · найдено {filtered.length}
            </span>
          )}
        </div>
        {!q && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => collapseAll(!allCollapsed)}
              title={allCollapsed ? 'Развернуть все команды' : 'Свернуть все команды'}
            >
              {allCollapsed ? (
                <>
                  <ChevronsUpDown size={14} /> Развернуть
                </>
              ) : (
                <>
                  <ChevronsDownUp size={14} /> Свернуть
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisible}
              title={
                drivers.every((d) => selected.has(d.id))
                  ? 'Снять всех пилотов'
                  : 'Выбрать всех пилотов сезона'
              }
            >
              Все
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={participantIds.length === 0}
            >
              Снять
            </Button>
          </div>
        )}
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени, номеру или команде…"
          aria-label="Поиск пилота"
          className="w-full bg-ink-surface border border-ink-border rounded pl-9 pr-9 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-lime-primary"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Очистить поиск"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Подсказка о составе выбора */}
      <div className="flex items-start gap-1.5 text-xs text-text-muted">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Показаны все пилоты сезона. По умолчанию выбраны участники чемпионата,
          но в этап можно добавить любого — он автоматически попадёт в зачёт.
        </span>
      </div>

      {/* Карточки команд */}
      <div className="flex flex-col gap-2 max-h-[52dvh] overflow-y-auto pr-1">
        {teams.map((team) => {
          const rows = grouped.get(team.id) ?? [];
          if (rows.length === 0) return null;
          return (
            <TeamCard
              key={team.id}
              title={team.name}
              color={team.color}
              logo={team.logo}
              rows={rows}
              collapsed={collapsed.has(team.id) && !q}
              onToggleCollapse={() => toggleCollapse(team.id)}
              selected={selected}
              onToggleDriver={toggleDriver}
              onToggleAll={() => toggleSection(team.id)}
            />
          );
        })}

        {solo.length > 0 && (
          <TeamCard
            solo
            title="Индивидуальные пилоты"
            rows={solo}
            collapsed={collapsed.has(SOLO_KEY) && !q}
            onToggleCollapse={() => toggleCollapse(SOLO_KEY)}
            selected={selected}
            onToggleDriver={toggleDriver}
            onToggleAll={() => toggleSection(null)}
          />
        )}

        {filtered.length === 0 && (
          <div className="text-center py-6 text-sm text-text-muted border border-dashed border-ink-border rounded">
            Ничего не найдено по запросу «{query.trim()}»
          </div>
        )}
      </div>
    </div>
  );

  /* -------------------- Локальные экшены -------------------- */

  function toggleDriver(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  function toggleSection(key: string | null) {
    const rows = grouped.get(key) ?? [];
    if (rows.length === 0) return;
    const allSelected = rows.every((d) => selected.has(d.id));
    const next = new Set(selected);
    for (const d of rows) {
      if (allSelected) next.delete(d.id);
      else next.add(d.id);
    }
    onChange([...next]);
  }
}

/* ==================================================================== */
/* Карточка команды (или блока индивидуальных пилотов)                   */
/* ==================================================================== */

interface TeamCardProps {
  title: string;
  color?: string;
  logo?: string | null;
  solo?: boolean;
  rows: Driver[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  selected: Set<string>;
  onToggleDriver: (id: string) => void;
  onToggleAll: () => void;
}

function TeamCard({
  title,
  color,
  logo,
  solo = false,
  rows,
  collapsed,
  onToggleCollapse,
  selected,
  onToggleDriver,
  onToggleAll,
}: TeamCardProps) {
  const selectedCount = rows.filter((d) => selected.has(d.id)).length;
  const allSelected = selectedCount === rows.length;

  const counterClass =
    selectedCount === 0
      ? 'text-text-muted'
      : allSelected
        ? 'text-lime-primary'
        : 'text-text-secondary';

  return (
    <div
      className={[
        'bg-ink-card border rounded overflow-hidden transition',
        selectedCount > 0 ? 'border-lime-primary/50' : 'border-ink-border',
      ].join(' ')}
    >
      {/* Шапка: чекбокс (весь блок) + название (сворачивание) + счётчик */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-ink-border">
        <button
          type="button"
          onClick={onToggleAll}
          title={allSelected ? 'Убрать всех из этапа' : 'Выбрать всех в этап'}
          className="shrink-0 w-5 h-5 flex items-center justify-center"
          aria-label={allSelected ? `Убрать всех из «${title}»` : `Включить всех из «${title}»`}
        >
          <Checkbox checked={allSelected} indeterminate={selectedCount > 0 && !allSelected} />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
          aria-expanded={!collapsed}
        >
          {solo ? (
            <span className="w-8 h-8 rounded bg-ink-surface border border-ink-border flex items-center justify-center text-text-muted shrink-0">
              <User size={14} />
            </span>
          ) : (
            <>
              {color && (
                <span
                  className="w-1 h-7 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
              )}
              <Avatar src={logo ?? undefined} name={title} size={28} />
            </>
          )}
          <span className="font-bold text-sm truncate">{title}</span>
        </button>

        <span
          className={[
            'text-2xs tabular uppercase tracking-badge shrink-0',
            counterClass,
          ].join(' ')}
        >
          {selectedCount}/{rows.length}
        </span>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          aria-expanded={!collapsed}
          className="p-1 text-text-muted hover:text-text-primary transition shrink-0"
        >
          <ChevronDown
            size={14}
            className={['transition-transform', collapsed ? '' : 'rotate-180'].join(' ')}
          />
        </button>
      </div>

      {/* Список пилотов */}
      {!collapsed && (
        <div className="p-2 flex flex-col gap-1">
          {rows.map((d) => (
            <DriverRow
              key={d.id}
              driver={d}
              checked={selected.has(d.id)}
              onToggle={() => onToggleDriver(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/* Строка пилота                                                         */
/* ==================================================================== */

function DriverRow({
  driver,
  checked,
  onToggle,
}: {
  driver: Driver;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={[
        'w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded border transition text-left',
        checked
          ? 'bg-lime-primary/10 border-lime-primary/60'
          : 'bg-ink-surface border-ink-border hover:border-lime-primary/40 hover:bg-ink-elevated',
      ].join(' ')}
    >
      <Checkbox checked={checked} />
      <Avatar
        src={driver.photo}
        name={`${driver.firstName} ${driver.lastName}`}
        size={30}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate flex items-center gap-1.5">
          {driver.firstName} {driver.lastName}
          {driver.country && <CountryFlag code={driver.country} size={11} />}
        </div>
      </div>
      <span className="text-xs tabular text-text-secondary shrink-0">
        #{driver.number}
      </span>
    </button>
  );
}

function Checkbox({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  return (
    <span
      className={[
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition',
        checked || indeterminate
          ? 'bg-lime-primary border-lime-primary'
          : 'bg-ink-surface border-ink-border',
      ].join(' ')}
    >
      {indeterminate ? (
        <span className="w-2 h-px bg-ink-deep" />
      ) : checked ? (
        <Check size={11} className="text-ink-deep" strokeWidth={3} />
      ) : null}
    </span>
  );
}
