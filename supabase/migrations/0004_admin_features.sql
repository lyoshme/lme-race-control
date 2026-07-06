-- ============================================================================
-- LMERC: Admin features — hide tournaments (iteration 5)
-- ============================================================================

-- 1. Колонка is_hidden для чемпионатов
ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- 2. Индекс для фильтрации
CREATE INDEX IF NOT EXISTS championships_hidden_idx ON public.championships(is_hidden);

-- 3. Функция для переключения видимости (только админ)
CREATE OR REPLACE FUNCTION public.toggle_championship_hidden(champ_id uuid)
RETURNS public.championships
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.championships;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can hide/show championships';
  END IF;

  UPDATE public.championships
  SET is_hidden = NOT is_hidden, updated_at = now()
  WHERE id = champ_id
  RETURNING * INTO result;

  RETURN result;
END $$;

-- ============================================================================
-- DONE. После запуска:
--   Админ может скрывать одобренные турниры из публичной ленты.
--   Скрытые турниры доступны по прямой ссылке владельцу/админу.
-- ============================================================================
