# Liquid Glass UI + Seasons System Implementation Plan

> **For agentic workers:** Use compose:subagent or compose:execute to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add liquid glass CSS effects to key UI elements and implement a multi-season system within championships.

**Architecture:** Two independent subsystems — (1) CSS-only glass effects via `backdrop-filter` on Header, Buttons, ChampionshipCards; (2) Season isolation via new `seasons` table + `season_id` FK on all child tables + UI dropdown for switching.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 3, Supabase (PostgreSQL + RLS)

## Global Constraints

- React 18, TypeScript, Vite, Tailwind CSS 3
- Supabase backend with RLS
- Hash-роутер без изменений
- Выбранный сезон хранится в React state (не в URL)
- snake_case ↔ camelCase через mappers.ts
- Один активный сезон на чемпионат (partial unique index)
- Каждый сезон изолирован: свои команды, пилоты, этапы, зачёты

---

## Part A: Liquid Glass UI

### Task 1: Add glass CSS classes

**Covers:** [S2]

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: CSS classes `.glass`, `.glass-strong`, `.glass-subtle` usable by any component

- [ ] **Step 1: Add glass utility classes**

Append to `src/index.css` before the final closing rule:

```css
/* Liquid Glass utilities */
.glass {
  backdrop-filter: blur(12px);
  background: rgba(var(--ink-card) / 0.6);
  border: 1px solid rgba(var(--ink-border) / 0.5);
}

.glass-strong {
  backdrop-filter: blur(20px);
  background: rgba(var(--ink-deep) / 0.7);
  border-bottom: 1px solid rgba(var(--lime-primary) / 0.2);
}

.glass-subtle {
  backdrop-filter: blur(8px);
  background: rgba(var(--lime-primary) / 0.05);
  border: 1px solid rgba(var(--lime-primary) / 0.15);
}

[data-theme="light"] .glass {
  background: rgba(var(--ink-card) / 0.75);
}
[data-theme="light"] .glass-strong {
  background: rgba(var(--ink-deep) / 0.85);
}
[data-theme="light"] .glass-subtle {
  background: rgba(var(--lime-primary) / 0.08);
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: TypeScript compiles, Vite builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): add liquid glass CSS utility classes"
```

---

### Task 2: Apply glass to Header

**Covers:** [S2]

**Files:**
- Modify: `src/components/layout/Header.tsx:28-34`

**Interfaces:**
- Consumes: `.glass-strong` class from Task 1

- [ ] **Step 1: Replace inline backdrop styles with glass class**

In `Header.tsx`, replace the dynamic className on `<header>` (lines 29-34):

Current:
```tsx
className={[
  'sticky top-0 z-30 border-b transition-all duration-300',
  scrolled
    ? 'bg-ink-deep/95 backdrop-blur-xl border-ink-border hero-gradient-border'
    : 'bg-ink-deep/90 backdrop-blur border-ink-border',
].join(' ')}
```

Replace with:
```tsx
className={[
  'sticky top-0 z-30 glass-strong transition-all duration-300',
  scrolled ? 'hero-gradient-border' : '',
].join(' ')}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(ui): apply liquid glass to header navbar"
```

---

### Task 3: Apply glass to Button secondary variant

**Covers:** [S2]

**Files:**
- Modify: `src/components/ui/Button.tsx:16-25`

**Interfaces:**
- Consumes: `.glass-subtle` class from Task 1

- [ ] **Step 1: Update secondary button variant**

In `Button.tsx`, replace the `secondary` variant class:

Current:
```tsx
secondary:
  'bg-ink-elevated text-text-primary border border-ink-border hover:border-lime-primary hover:text-lime-primary disabled:opacity-40 disabled:cursor-not-allowed',
```

Replace with:
```tsx
secondary:
  'glass-subtle text-text-primary hover:border-lime-primary hover:text-lime-primary disabled:opacity-40 disabled:cursor-not-allowed',
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(ui): apply liquid glass to secondary buttons"
```

---

### Task 4: Apply glass to ChampionshipCard

**Covers:** [S2]

**Files:**
- Modify: `src/features/championship/ChampionshipCard.tsx:26`

**Interfaces:**
- Consumes: `.glass` class from Task 1

- [ ] **Step 1: Replace card background with glass**

In `ChampionshipCard.tsx`, replace the outer div className:

Current:
```tsx
<div className="group card-hover bg-ink-card border border-ink-border rounded overflow-hidden flex flex-col">
```

Replace with:
```tsx
<div className="group card-hover glass rounded overflow-hidden flex flex-col">
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/championship/ChampionshipCard.tsx
git commit -m "feat(ui): apply liquid glass to championship cards"
```

---

## Part B: Seasons System

### Task 5: SQL migration for seasons

**Covers:** [S4]

**Files:**
- Create: `supabase/migrations/0020_seasons.sql`

**Interfaces:**
- Produces: `seasons` table, `season_id` columns on 5 tables, RLS policies, auto-migration of existing data

- [ ] **Step 1: Write migration**

```sql
-- 0020_seasons.sql
-- Система сезонов: новая таблица + season_id на все дочерние таблицы

BEGIN;

-- 1. Таблица seasons
CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Один активный сезон на чемпионат
CREATE UNIQUE INDEX idx_seasons_one_active
  ON seasons(championship_id)
  WHERE is_active = true;

CREATE INDEX idx_seasons_championship ON seasons(championship_id);

-- RLS для seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons: public read"
  ON seasons FOR SELECT
  USING (true);

CREATE POLICY "Seasons: owner/admin write"
  ON seasons FOR ALL
  USING (
    has_championship_permission(championship_id, 'manage_settings')
  );

-- 2. Добавить season_id во все дочерние таблицы
ALTER TABLE teams ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE drivers ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE scoring_systems ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE stages ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE standings ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;

-- 3. Миграция существующих данных: создать "Сезон 1" для каждого чемпионата
-- и привязать все существующие записи
DO $$
DECLARE
  champ RECORD;
  new_season_id uuid;
BEGIN
  FOR champ IN SELECT id FROM championships LOOP
    -- Создаём сезон
    INSERT INTO seasons (championship_id, name, is_active)
    VALUES (champ.id, 'Сезон 1', true)
    RETURNING id INTO new_season_id;

    -- Привязываем команды
    UPDATE teams SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;

    -- Привязываем пилотов
    UPDATE drivers SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;

    -- Привязываем системы очков
    UPDATE scoring_systems SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;

    -- Привязываем этапы
    UPDATE stages SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;

    -- Привязываем зачёты
    UPDATE standings SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;
  END LOOP;
END $$;

-- 4. Сделать season_id NOT NULL после миграции
ALTER TABLE teams ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE drivers ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE scoring_systems ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE stages ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE standings ALTER COLUMN season_id SET NOT NULL;

-- 5. Индексы для быстрой фильтрации по сезону
CREATE INDEX idx_teams_season ON teams(season_id);
CREATE INDEX idx_drivers_season ON drivers(season_id);
CREATE INDEX idx_scoring_season ON scoring_systems(season_id);
CREATE INDEX idx_stages_season ON stages(season_id);
CREATE INDEX idx_standings_season ON standings(season_id);

-- 6. Обновить unique constraint standings: (championship_id, season_id)
ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_pkey;
ALTER TABLE standings ADD PRIMARY KEY (championship_id, season_id);

-- 7. Обновить RLS политики для дочерних таблиц (добавить фильтр по season_id через championship)
-- Существующие политики уже используют has_championship_permission — сезон не меняет логику доступа

COMMIT;
```

- [ ] **Step 2: Verify SQL syntax**

Check that the migration file is valid SQL (no syntax errors).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0020_seasons.sql
git commit -m "feat(db): add seasons table and season_id to all child tables"
```

---

### Task 6: Update database.types.ts

**Covers:** [S4]

**Files:**
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Produces: `SeasonRow` type, updated `TeamRow`, `DriverRow`, `ScoringSystemRow`, `StageRow`, `StandingsRow` with `season_id`

- [ ] **Step 1: Add SeasonRow and update existing row types**

In `database.types.ts`, add after `ChampionshipRow`:

```typescript
export interface SeasonRow {
  id: string;
  championship_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}
```

Add `season_id: string;` to each of these interfaces:
- `TeamRow` (after `championship_id`)
- `DriverRow` (after `championship_id`)
- `ScoringSystemRow` (after `championship_id`)
- `StageRow` (after `championship_id`)

For `StandingsRow`, add `season_id: string;` and change the comment about PK.

Add `seasons` to the `Database` type's `Tables`:

```typescript
seasons: {
  Row: SeasonRow;
  Insert: Partial<SeasonRow> & { championship_id: string; name: string };
  Update: Partial<SeasonRow>;
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors (types are compatible).

- [ ] **Step 3: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add SeasonRow and season_id to all row types"
```

---

### Task 7: Update domain types

**Covers:** [S4]

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `Season` interface, updated `Team`, `Driver`, `Stage`, `Standings`, `ScoringSystem` with `seasonId`

- [ ] **Step 1: Add Season type and update existing types**

In `types.ts`, add after `Championship` interface:

```typescript
export interface Season {
  id: string;
  championshipId: string;
  name: string;
  isActive: boolean;
  createdAt: number;
}
```

Add `seasonId: string;` to:
- `Team` (after `championshipId`)
- `Driver` (after `championshipId`)
- `ScoringSystem` (after `championshipId`)
- `Stage` (after `championshipId`)

For `Standings`, add `seasonId: string;` after `championshipId`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add Season interface and seasonId to all domain types"
```

---

### Task 8: Update mappers

**Covers:** [S4]

**Files:**
- Modify: `src/lib/api/mappers.ts`

**Interfaces:**
- Consumes: `SeasonRow` from Task 6, `Season` from Task 7
- Produces: `rowToSeason`, `seasonToInsert` mappers; updated mappers for Team, Driver, ScoringSystem, Stage, Standings

- [ ] **Step 1: Add season mappers and update existing ones**

Add import for `SeasonRow` in the import block.

Add after championship mappers:

```typescript
/* -------------------- Season -------------------- */
export function rowToSeason(r: SeasonRow): Season {
  return {
    id: r.id,
    championshipId: r.championship_id,
    name: r.name,
    isActive: r.is_active,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export function seasonToInsert(s: { championshipId: string; name: string }): Partial<SeasonRow> {
  return {
    championship_id: s.championshipId,
    name: s.name,
    is_active: true,
  };
}
```

Update `rowToTeam` to include `seasonId: r.season_id`.
Update `teamToInsert` to include `season_id: t.seasonId`.
Update `rowToDriver` to include `seasonId: r.season_id`.
Update `driverToInsert` to include `season_id: d.seasonId`.
Update `rowToScoring` to include `seasonId: r.season_id`.
Update `scoringToInsert` to include `season_id: s.seasonId`.
Update `rowToStage` to include `seasonId: r.season_id`.
Update `stageToInsert` to include `season_id: s.seasonId`.
Update `rowToStandings` to include `seasonId: r.season_id`.
Update `standingsToUpsert` to include `season_id: s.seasonId`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/mappers.ts
git commit -m "feat(api): add season mappers and update all existing mappers with seasonId"
```

---

### Task 9: Create seasons API module

**Covers:** [S4]

**Files:**
- Create: `src/lib/api/seasons.ts`
- Modify: `src/lib/api/index.ts`

**Interfaces:**
- Consumes: `rowToSeason`, `seasonToInsert` from Task 8
- Produces: `api.seasons.list()`, `api.seasons.create()`, `api.seasons.setActive()`

- [ ] **Step 1: Create seasons.ts**

```typescript
import { supabase } from '@/lib/supabase';
import type { Season } from '@/types';
import { rowToSeason, seasonToInsert } from './mappers';

export async function list(championshipId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('championship_id', championshipId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSeason);
}

export async function create(championshipId: string, name: string): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .insert(seasonToInsert({ championshipId, name }) as never)
    .select('*')
    .single();
  if (error) throw error;
  return rowToSeason(data);
}

export async function setActive(id: string, championshipId: string): Promise<void> {
  // Сбросить все сезоны чемпионата
  await supabase
    .from('seasons')
    .update({ is_active: false } as never)
    .eq('championship_id', championshipId);

  // Активировать выбранный
  const { error } = await supabase
    .from('seasons')
    .update({ is_active: true } as never)
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Add to barrel export**

In `src/lib/api/index.ts`, add:

```typescript
export * as seasons from './seasons';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/seasons.ts src/lib/api/index.ts
git commit -m "feat(api): add seasons CRUD module"
```

---

### Task 10: Update existing API modules with seasonId

**Covers:** [S4]

**Files:**
- Modify: `src/lib/api/teams.ts`
- Modify: `src/lib/api/drivers.ts`
- Modify: `src/lib/api/scoring.ts`
- Modify: `src/lib/api/stages.ts`
- Modify: `src/lib/api/standings.ts`

**Interfaces:**
- Consumes: updated mappers from Task 8
- Produces: all CRUD functions accept `seasonId` parameter

- [ ] **Step 1: Update teams.ts**

Replace `list` function:

```typescript
export async function list(championshipId: string, seasonId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToTeam);
}
```

Update `create` to include `seasonId` in the `Omit<Team, 'id'>` type — this happens automatically since `Team` now has `seasonId`. The `teamToInsert` mapper handles it.

- [ ] **Step 2: Update drivers.ts**

Replace `list` function:

```typescript
export async function list(championshipId: string, seasonId: string): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToDriver);
}
```

- [ ] **Step 3: Update scoring.ts**

Replace `list` function:

```typescript
export async function list(championshipId: string, seasonId: string): Promise<ScoringSystem[]> {
  const { data, error } = await supabase
    .from('scoring_systems')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToScoring);
}
```

- [ ] **Step 4: Update stages.ts**

Replace `list` function:

```typescript
export async function list(championshipId: string, seasonId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .order('stage_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToStage);
}
```

- [ ] **Step 5: Update standings.ts**

Replace `get` function:

```typescript
export async function get(championshipId: string, seasonId: string): Promise<Standings | null> {
  const { data, error } = await supabase
    .from('standings')
    .select('*')
    .eq('championship_id', championshipId)
    .eq('season_id', seasonId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStandings(data) : null;
}
```

Update `upsert` — the `onConflict` needs to change since PK is now `(championship_id, season_id)`:

```typescript
export async function upsert(s: Standings): Promise<Standings> {
  const { data, error } = await supabase
    .from('standings')
    .upsert(standingsToUpsert(s) as never, { onConflict: 'championship_id,season_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToStandings(data);
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Errors expected — callers of `list(championshipId)` now need `seasonId`. These will be fixed in subsequent tasks.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/teams.ts src/lib/api/drivers.ts src/lib/api/scoring.ts src/lib/api/stages.ts src/lib/api/standings.ts
git commit -m "feat(api): add seasonId parameter to all CRUD list/get functions"
```

---

### Task 11: Create SeasonSelector component

**Covers:** [S5]

**Files:**
- Create: `src/features/seasons/SeasonSelector.tsx`

**Interfaces:**
- Consumes: `api.seasons.list()` from Task 9, `Season` type from Task 7
- Produces: `<SeasonSelector championshipId, seasonId, onChange />` component

- [ ] **Step 1: Create SeasonSelector**

```tsx
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
                {s.isActive && <span className="text-[10px] uppercase tracking-badge text-lime-muted">активный</span>}
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
mkdir -p src/features/seasons
git add src/features/seasons/SeasonSelector.tsx
git commit -m "feat(ui): add SeasonSelector dropdown component"
```

---

### Task 12: Create SeasonsTab for manage page

**Covers:** [S5]

**Files:**
- Create: `src/features/seasons/SeasonsTab.tsx`

**Interfaces:**
- Consumes: `api.seasons.list()`, `api.seasons.setActive()`, `Season` type
- Produces: `<SeasonsTab championshipId, currentSeasonId, onSeasonChange />` component

- [ ] **Step 1: Create SeasonsTab**

```tsx
import { useCallback, useState } from 'react';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useToast } from '@/components/toast/ToastContext';
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
  const { data: seasons } = useSupabaseQuery<Season[]>(
    fetcher,
    [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
    [championshipId],
  );

  async function handleCreate() {
    const name = `Сезон ${(seasons?.length ?? 0) + 1}`;
    setCreating(true);
    try {
      const season = await api.seasons.create(championshipId, name);
      await api.seasons.setActive(season.id, championshipId);
      onSeasonChange(season.id);
      toast.success(`Создан ${name}`);
    } catch {
      toast.error('Не удалось создать сезон');
    } finally {
      setCreating(false);
    }
  }

  async function handleSetActive(season: Season) {
    try {
      await api.seasons.setActive(season.id, championshipId);
      onSeasonChange(season.id);
      toast.success(`${season.name} теперь активный`);
    } catch {
      toast.error('Не удалось переключить сезон');
    }
  }

  if (!seasons || seasons.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={36} />}
        title="Нет сезонов"
        description="Создайте первый сезон для этого чемпионата."
        action={
          <Button icon={<Plus size={16} />} onClick={handleCreate} loading={creating}>
            Создать сезон
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm uppercase tracking-badge text-text-secondary">
          Сезоны: {seasons.length}
        </h3>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleCreate} loading={creating}>
          Новый сезон
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {seasons.map((s) => (
          <div
            key={s.id}
            className={[
              'flex items-center justify-between p-3 rounded border transition',
              s.id === currentSeasonId
                ? 'border-lime-primary/40 bg-lime-primary/5'
                : 'border-ink-border bg-ink-card hover:border-ink-border',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <CalendarDays size={16} className="text-text-secondary" />
              <div>
                <span className="text-sm font-bold">{s.name}</span>
                {s.isActive && (
                  <span className="ml-2 text-[10px] uppercase tracking-badge text-lime-primary">
                    активный
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.id !== currentSeasonId && (
                <Button size="sm" variant="ghost" icon={<Check size={14} />} onClick={() => handleSetActive(s)}>
                  Активировать
                </Button>
              )}
              {s.id === currentSeasonId && (
                <span className="text-xs text-lime-primary uppercase tracking-badge">текущий</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/seasons/SeasonsTab.tsx
git commit -m "feat(ui): add SeasonsTab for managing seasons in championship"
```

---

### Task 13: Update ChampionshipPublic with season filter

**Covers:** [S5]

**Files:**
- Modify: `src/pages/ChampionshipPublic.tsx`

**Interfaces:**
- Consumes: `SeasonSelector` from Task 11, updated API functions from Task 10

- [ ] **Step 1: Add season state and SeasonSelector**

Add imports:
```tsx
import { useState } from 'react';
import { SeasonSelector } from '@/features/seasons/SeasonSelector';
```

Add state after existing state declarations:
```tsx
const [seasonId, setSeasonId] = useState<string>('');
```

After fetching seasons, set default:
```tsx
const seasonsFetcher = useCallback(() => api.seasons.list(championshipId), [championshipId]);
const { data: seasons } = useSupabaseQuery<Season[]>(
  seasonsFetcher,
  [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
  [championshipId],
);

// Set default season
useEffect(() => {
  if (seasons && seasons.length > 0 && !seasonId) {
    const active = seasons.find((s) => s.isActive) ?? seasons[seasons.length - 1];
    setSeasonId(active.id);
  }
}, [seasons, seasonId]);
```

- [ ] **Step 2: Pass seasonId to all API calls**

Update fetchers to include seasonId:
```tsx
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
```

Add `seasonId` to `useSupabaseQuery` dependency arrays.

- [ ] **Step 3: Add SeasonSelector to header**

After the badges in the hero section, add:
```tsx
<SeasonSelector
  championshipId={championshipId}
  seasonId={seasonId}
  onChange={setSeasonId}
/>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ChampionshipPublic.tsx
git commit -m "feat(ui): add season filtering to ChampionshipPublic page"
```

---

### Task 14: Update ChampionshipManage with season filter

**Covers:** [S5]

**Files:**
- Modify: `src/pages/ChampionshipManage.tsx`

**Interfaces:**
- Consumes: `SeasonSelector` from Task 11, `SeasonsTab` from Task 12, updated API functions from Task 10

- [ ] **Step 1: Add season state and imports**

Add imports:
```tsx
import { useState, useEffect } from 'react';
import { SeasonSelector } from '@/features/seasons/SeasonSelector';
import { SeasonsTab } from '@/features/seasons/SeasonsTab';
```

Add state:
```tsx
const [seasonId, setSeasonId] = useState<string>('');
```

After fetching championship, fetch seasons:
```tsx
const seasonsFetcher = useCallback(() => api.seasons.list(championshipId), [championshipId]);
const { data: seasons } = useSupabaseQuery<Season[]>(
  seasonsFetcher,
  [{ table: 'seasons', filter: `championship_id=eq.${championshipId}` }],
  [championshipId],
);

useEffect(() => {
  if (seasons && seasons.length > 0 && !seasonId) {
    const active = seasons.find((s) => s.isActive) ?? seasons[seasons.length - 1];
    setSeasonId(active.id);
  }
}, [seasons, seasonId]);
```

- [ ] **Step 2: Add SeasonSelector to header**

After the breadcrumb and before the title, add:
```tsx
<SeasonSelector
  championshipId={championshipId}
  seasonId={seasonId}
  onChange={setSeasonId}
  canManage={permissions.isOwner}
  onSeasonCreated={(s) => setSeasonId(s.id)}
/>
```

- [ ] **Step 3: Add "Сезоны" tab**

Update the `tabs` array to include:
```tsx
if (isOwner || isAdmin) {
  base.push({ key: 'seasons', label: 'Сезоны' });
}
```

Update the `ManageTab` type in `router.tsx` to include `'seasons'`:
```typescript
export type ManageTab = 'settings' | 'teams' | 'scoring' | 'standings' | 'stages' | 'editors' | 'seasons';
```

- [ ] **Step 4: Render SeasonsTab**

Add to the tab content section:
```tsx
{tab === 'seasons' && (isOwner || isAdmin) && (
  <SeasonsTab
    championshipId={championshipId}
    currentSeasonId={seasonId}
    onSeasonChange={setSeasonId}
  />
)}
```

- [ ] **Step 5: Pass seasonId to child tabs**

Update each tab's props to include `seasonId`:
```tsx
{tab === 'teams' && <TeamsTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
{tab === 'scoring' && <ScoringTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
{tab === 'standings' && <StandingsInitTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
{tab === 'stages' && <StagesTab championshipId={championshipId} seasonId={seasonId} permissions={permissions} />}
```

- [ ] **Step 6: Update router.tsx**

In `src/router.tsx`, add `'seasons'` to the `ManageTab` type.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Errors expected — child tabs need `seasonId` prop. Fixed in Task 15.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ChampionshipManage.tsx src/router.tsx
git commit -m "feat(ui): add season filtering and SeasonsTab to manage page"
```

---

### Task 15: Update feature tabs to accept seasonId

**Covers:** [S5]

**Files:**
- Modify: `src/features/teams/TeamsTab.tsx`
- Modify: `src/features/scoring/ScoringTab.tsx`
- Modify: `src/features/standings/StandingsInitTab.tsx`
- Modify: `src/features/stages/StagesTab.tsx`

**Interfaces:**
- Consumes: updated API functions from Task 10
- Produces: all tabs accept `seasonId: string` prop and pass it to API calls

- [ ] **Step 1: Update TeamsTab**

Add `seasonId` to Props interface:
```typescript
interface Props {
  championshipId: string;
  seasonId: string;
  permissions: EditorPermissions;
}
```

Update all `api.teams.list(championshipId)` calls to `api.teams.list(championshipId, seasonId)`.

- [ ] **Step 2: Update ScoringTab**

Add `seasonId` to Props interface.

Update all `api.scoring.list(championshipId)` calls to `api.scoring.list(championshipId, seasonId)`.

- [ ] **Step 3: Update StandingsInitTab**

Add `seasonId` to Props interface.

Update `api.standings.get(championshipId)` to `api.standings.get(championshipId, seasonId)`.

- [ ] **Step 4: Update StagesTab**

Add `seasonId` to Props interface.

Update all `api.stages.list(championshipId)` calls to `api.stages.list(championshipId, seasonId)`.

- [ ] **Step 5: Update DriverProfile**

In `src/pages/DriverProfile.tsx`, add seasonId parameter to API calls. Since driver profile is accessed from a specific championship, fetch the active season first.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/teams/TeamsTab.tsx src/features/scoring/ScoringTab.tsx src/features/standings/StandingsInitTab.tsx src/features/stages/StagesTab.tsx src/pages/DriverProfile.tsx
git commit -m "feat(ui): pass seasonId through all feature tabs"
```

---

### Task 16: Final verification

**Covers:** [S1-S6]

**Files:**
- None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Verify all tasks committed**

Run: `git log --oneline -20`
Expected: All 16 task commits visible.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: verify liquid glass + seasons implementation"
```
