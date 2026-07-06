-- Добавить finished_at в таблицу seasons
BEGIN;
DO $$ BEGIN
  ALTER TABLE seasons ADD COLUMN finished_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
COMMIT;
