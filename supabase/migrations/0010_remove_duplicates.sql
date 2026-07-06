-- ============================================================================
-- LMERC: Удаление дублей команд и пилотов
-- ============================================================================
-- Выполнить если после отката сезонов данные удвоились.

-- 1. Удалить дубли команд (оставить самую старую запись)
DELETE FROM public.teams
WHERE id NOT IN (
  SELECT (ARRAY_AGG(id ORDER BY created_at ASC))[1]
  FROM public.teams
  GROUP BY championship_id, name
);

-- 2. Удалить дубли пилотов (оставить самую старую запись)
DELETE FROM public.drivers
WHERE id NOT IN (
  SELECT (ARRAY_AGG(id ORDER BY created_at ASC))[1]
  FROM public.drivers
  GROUP BY championship_id, first_name, last_name, number
);

-- ============================================================================
