-- ============================================================================
-- LMERC: Система сезонов (S4)
-- ============================================================================
-- Новая таблица seasons + season_id на все дочерние таблицы.
-- Миграция существующих данных: "Сезон 1" для каждого чемпионата.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Таблица seasons
-- ----------------------------------------------------------------------------
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

CREATE POLICY "seasons_select" ON seasons FOR SELECT
  USING (true);

CREATE POLICY "seasons_write" ON seasons FOR ALL
  USING (
    has_championship_permission(championship_id, 'settings')
  )
  WITH CHECK (
    has_championship_permission(championship_id, 'settings')
  );

-- ----------------------------------------------------------------------------
-- 2. Добавить season_id во все дочерние таблицы (nullable暂时)
-- ----------------------------------------------------------------------------
ALTER TABLE teams ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE drivers ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE scoring_systems ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE stages ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE standings ADD COLUMN season_id uuid REFERENCES seasons(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Миграция существующих данных
--    Создать "Сезон 1" для каждого чемпионата и привязать все существующие записи
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. Сделать season_id NOT NULL после миграции
-- ----------------------------------------------------------------------------
ALTER TABLE teams ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE drivers ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE scoring_systems ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE stages ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE standings ALTER COLUMN season_id SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Индексы для быстрой фильтрации по сезону
-- ----------------------------------------------------------------------------
CREATE INDEX idx_teams_season ON teams(season_id);
CREATE INDEX idx_drivers_season ON drivers(season_id);
CREATE INDEX idx_scoring_season ON scoring_systems(season_id);
CREATE INDEX idx_stages_season ON stages(season_id);
CREATE INDEX idx_standings_season ON standings(season_id);

-- ----------------------------------------------------------------------------
-- 6. Обновить PK standings: (championship_id, season_id)
-- ----------------------------------------------------------------------------
ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_pkey;
ALTER TABLE standings ADD PRIMARY KEY (championship_id, season_id);

COMMIT;

-- ============================================================================
-- DONE.
-- ============================================================================
