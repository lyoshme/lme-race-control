-- ============================================================================
-- LMERC: видимость чемпионатов для редакторов + список редакторов с профилями
-- ============================================================================
-- Исправляет:
--  1) Редактор не мог открыть чемпионат со status='pending'/'rejected':
--     политика champ_select и функция is_championship_visible не учитывали
--     участие в championship_editors. В управлении показывалось
--     «Чемпионат не найден», а вкладка «Управление» в аккаунте молча
--     теряла такие чемпионаты.
--  2) После security-правки 0003 (профили читает только владелец/админ)
--     вложенный join profiles(email) в editors.list() стал пустым —
--     список редакторов больше не показывал email/имя. Добавлен RPC
--     list_championship_editors: владелец чемпионата или админ может
--     читать профили, но только редакторов СВОЕГО чемпионата.
--
-- Безопасно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. is_championship_visible — добавляем редакторов.
--    Эту функцию уже используют политики SELECT всех дочерних таблиц
--    (teams, drivers, scoring_systems, stages, standings) — исправление
--    применится к ним автоматически.
-- ----------------------------------------------------------------------------
create or replace function public.is_championship_visible(cid uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.championships c
    where c.id = cid and (
      c.status = 'approved'
      or c.owner_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.championship_editors e
        where e.championship_id = c.id and e.user_id = auth.uid()
      )
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. champ_select — та же логика видимости, что и для дочерних таблиц
--    (approved || owner || admin || editor)
-- ----------------------------------------------------------------------------
drop policy if exists "champ_select" on public.championships;
create policy "champ_select" on public.championships for select
  using (public.is_championship_visible(id));

-- ----------------------------------------------------------------------------
-- 3. RPC: список редакторов с данными профилей (email/display_name).
--    Скоупированный доступ: функции внутри доступны только данные профилей
--    редакторов указанного чемпионата, и только его владелец/глобальный админ
--    (проверка внутри функции; SECURITY DEFINER обходит RLS сознательно,
--    как и accept_championship_invite из 0002).
-- ----------------------------------------------------------------------------
create or replace function public.list_championship_editors(cid uuid)
returns table (
  user_id uuid,
  can_manage_settings boolean,
  can_manage_teams boolean,
  can_manage_scoring boolean,
  can_manage_stages boolean,
  created_at timestamptz,
  email text,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.user_id,
    e.can_manage_settings,
    e.can_manage_teams,
    e.can_manage_scoring,
    e.can_manage_stages,
    e.created_at,
    p.email,
    p.display_name
  from public.championship_editors e
  join public.profiles p on p.id = e.user_id
  where e.championship_id = cid
    and (public.is_championship_owner(cid) or public.is_admin())
  order by e.created_at asc;
$$;

revoke execute on function public.list_championship_editors(uuid) from public;
grant execute on function public.list_championship_editors(uuid) to authenticated, service_role;

COMMIT;
