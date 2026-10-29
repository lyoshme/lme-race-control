-- ============================================================================
-- 0070. Награды сезона:
--  1) seasons.has_awards — флаг видимости публичной вкладки «Награды»;
--  2) season_awards — номинации сезона: произвольное название, тип
--     ('driver' | 'team') и победитель соответствующего типа (победителя
--     можно не указывать — публично прочерк не показываем. Для победителя
--     допускается любое время установки или изменения).
--
-- Безопасно запускать повторно.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------- 1. Флаг --
DO $$ BEGIN
  ALTER TABLE seasons ADD COLUMN IF NOT EXISTS has_awards boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------------- 2. Таблица --
CREATE TABLE IF NOT EXISTS season_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('driver', 'team')),
  winner_driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  winner_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  -- Победитель опционален, но тип победителя обязан совпадать с типом номинации
  CONSTRAINT award_winner_kind_check CHECK (
    (kind = 'driver' AND winner_team_id IS NULL)
    OR (kind = 'team' AND winner_driver_id IS NULL)
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_awards_season ON season_awards(season_id);

-- ------------------------------------- 3. Валидация победителя (триггер) --
-- Победитель номинации обязан быть участником того же сезона, что и сама
-- номинация (защита от передачи «мусорных»/чужих id через клиента).
CREATE OR REPLACE FUNCTION public.validate_season_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_champ uuid;
BEGIN
  SELECT championship_id INTO strict v_season_champ FROM seasons WHERE id = NEW.season_id;
  IF v_season_champ IS DISTINCT FROM NEW.championship_id THEN
    RAISE EXCEPTION 'Сезон не принадлежит этому чемпионату';
  END IF;

  IF NEW.kind = 'driver' AND NEW.winner_driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM drivers d
       WHERE d.id = NEW.winner_driver_id
         AND d.championship_id = NEW.championship_id
         AND d.season_id = NEW.season_id
    ) THEN
      RAISE EXCEPTION 'Пилот не участвует в этом сезоне';
    END IF;
  END IF;

  IF NEW.kind = 'team' AND NEW.winner_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM teams t
       WHERE t.id = NEW.winner_team_id
         AND t.championship_id = NEW.championship_id
         AND t.season_id = NEW.season_id
    ) THEN
      RAISE EXCEPTION 'Команда не участвует в этом сезоне';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_season_award_trg ON season_awards;
CREATE TRIGGER validate_season_award_trg
BEFORE INSERT OR UPDATE ON season_awards
FOR EACH ROW EXECUTE FUNCTION public.validate_season_award();

-- ----------------------------------------------------------------- 4. RLS --
DO $$ BEGIN
  ALTER TABLE season_awards ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "season_awards_select" ON season_awards;
CREATE POLICY "season_awards_select" ON season_awards FOR SELECT USING (true);

DROP POLICY IF EXISTS "season_awards_write" ON season_awards;
CREATE POLICY "season_awards_write" ON season_awards FOR ALL
  USING (has_championship_permission(championship_id, 'settings'))
  WITH CHECK (has_championship_permission(championship_id, 'settings'));

COMMIT;
