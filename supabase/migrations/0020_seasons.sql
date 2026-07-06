-- ============================================================================
-- LMERC: Система сезонов (S4) — ИДЕМПОТЕНТНАЯ ВЕРСИЯ
-- ============================================================================
-- Безопасно запускать повторно: пропускает уже выполненные шаги.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Таблица seasons (если ещё нет)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Добавить is_active если таблица была создана без неё
DO $$ BEGIN
  ALTER TABLE seasons ADD COLUMN is_active boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Добавить created_at если таблица была создана без неё
DO $$ BEGIN
  ALTER TABLE seasons ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Индексы (IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_active
  ON seasons(championship_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_seasons_championship ON seasons(championship_id);

-- RLS (IF NOT EXISTS через DO block)
DO $$ BEGIN
  ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "seasons_select" ON seasons FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "seasons_write" ON seasons FOR ALL
    USING (has_championship_permission(championship_id, 'settings'))
    WITH CHECK (has_championship_permission(championship_id, 'settings'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Добавить season_id во все дочерние таблицы (если ещё нет)
-- ----------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE teams ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE drivers ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE scoring_systems ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE stages ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE standings ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 3. Миграция данных: "Сезон 1" для чемпионатов без сезонов
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  champ RECORD;
  new_season_id uuid;
BEGIN
  FOR champ IN
    SELECT c.id FROM championships c
    WHERE NOT EXISTS (SELECT 1 FROM seasons s WHERE s.championship_id = c.id)
  LOOP
    INSERT INTO seasons (championship_id, name, is_active)
    VALUES (champ.id, 'Сезон 1', true)
    RETURNING id INTO new_season_id;

    UPDATE teams SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;
    UPDATE drivers SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;
    UPDATE scoring_systems SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;
    UPDATE stages SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;
    UPDATE standings SET season_id = new_season_id
    WHERE championship_id = champ.id AND season_id IS NULL;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. season_id NOT NULL (если ещё nullable)
-- ----------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE teams ALTER COLUMN season_id SET NOT NULL;
EXCEPTION WHEN not_null_violation THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE drivers ALTER COLUMN season_id SET NOT NULL;
EXCEPTION WHEN not_null_violation THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE scoring_systems ALTER COLUMN season_id SET NOT NULL;
EXCEPTION WHEN not_null_violation THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE stages ALTER COLUMN season_id SET NOT NULL;
EXCEPTION WHEN not_null_violation THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE standings ALTER COLUMN season_id SET NOT NULL;
EXCEPTION WHEN not_null_violation THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 5. Индексы для фильтрации по сезону
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id);
CREATE INDEX IF NOT EXISTS idx_drivers_season ON drivers(season_id);
CREATE INDEX IF NOT EXISTS idx_scoring_season ON scoring_systems(season_id);
CREATE INDEX IF NOT EXISTS idx_stages_season ON stages(season_id);
CREATE INDEX IF NOT EXISTS idx_standings_season ON standings(season_id);

-- ----------------------------------------------------------------------------
-- 6. PK standings: (championship_id, season_id)
-- ----------------------------------------------------------------------------
ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_pkey;
DO $$ BEGIN
  ALTER TABLE standings ADD PRIMARY KEY (championship_id, season_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

COMMIT;
