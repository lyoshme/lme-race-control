-- ============================================================================
-- LMERC: Co-admins / Editors and Invites (iteration 4)
-- ============================================================================

-- 1. Таблица редакторов чемпионатов
create table if not exists public.championship_editors (
  id                  uuid primary key default gen_random_uuid(),
  championship_id     uuid not null references public.championships(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  can_manage_settings boolean not null default false,
  can_manage_teams    boolean not null default true,
  can_manage_scoring  boolean not null default true,
  can_manage_stages   boolean not null default true,
  created_at          timestamptz not null default now(),
  unique(championship_id, user_id)
);

create index if not exists editors_champ_idx on public.championship_editors(championship_id);
create index if not exists editors_user_idx on public.championship_editors(user_id);

-- 2. Таблица инвайтов/приглашений
create table if not exists public.championship_invites (
  id                  uuid primary key default gen_random_uuid(),
  championship_id     uuid not null references public.championships(id) on delete cascade,
  can_manage_settings boolean not null default false,
  can_manage_teams    boolean not null default true,
  can_manage_scoring  boolean not null default true,
  can_manage_stages   boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists invites_champ_idx on public.championship_invites(championship_id);

-- 3. Хранимая функция проверки прав
create or replace function public.has_championship_permission(cid uuid, perm text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  is_owner boolean;
  has_perm boolean := false;
begin
  -- Если не авторизован — прав нет
  if auth.uid() is null then
    return false;
  end if;

  -- Глобальный администратор имеет все права
  if public.is_admin() then
    return true;
  end if;

  -- Владелец чемпионата имеет все права
  select (owner_id = auth.uid()) into is_owner
  from public.championships
  where id = cid;

  if coalesce(is_owner, false) then
    return true;
  end if;

  -- Проверяем права редактора
  if perm = 'settings' then
    select can_manage_settings into has_perm from public.championship_editors where championship_id = cid and user_id = auth.uid();
  elsif perm = 'teams' then
    select can_manage_teams into has_perm from public.championship_editors where championship_id = cid and user_id = auth.uid();
  elsif perm = 'scoring' then
    select can_manage_scoring into has_perm from public.championship_editors where championship_id = cid and user_id = auth.uid();
  elsif perm = 'stages' then
    select can_manage_stages into has_perm from public.championship_editors where championship_id = cid and user_id = auth.uid();
  end if;

  return coalesce(has_perm, false);
end $$;

-- 4. Хранимая функция (RPC) для активации инвайта
create or replace function public.accept_championship_invite(invite_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  champ_id uuid;
  c_settings boolean;
  c_teams boolean;
  c_scoring boolean;
  c_stages boolean;
begin
  -- Проверка авторизации
  if auth.uid() is null then
    raise exception 'Must be logged in to accept invite';
  end if;

  -- Получаем детали инвайта
  select championship_id, can_manage_settings, can_manage_teams, can_manage_scoring, can_manage_stages
  into champ_id, c_settings, c_teams, c_scoring, c_stages
  from public.championship_invites
  where id = invite_id;

  if champ_id is null then
    raise exception 'Приглашение не найдено или уже использовано';
  end if;

  -- Владелец не может стать со-редактором своего же турнира
  if exists (
    select 1 from public.championships
    where id = champ_id and owner_id = auth.uid()
  ) then
    raise exception 'Вы уже являетесь владельцем этого чемпионата';
  end if;

  -- Добавляем в редакторы (или обновляем права, если уже был редактором)
  insert into public.championship_editors (
    championship_id, user_id, can_manage_settings, can_manage_teams, can_manage_scoring, can_manage_stages
  ) values (
    champ_id, auth.uid(), c_settings, c_teams, c_scoring, c_stages
  )
  on conflict (championship_id, user_id) do update set
    can_manage_settings = excluded.can_manage_settings,
    can_manage_teams = excluded.can_manage_teams,
    can_manage_scoring = excluded.can_manage_scoring,
    can_manage_stages = excluded.can_manage_stages;

  -- Удаляем использованный инвайт
  delete from public.championship_invites where id = invite_id;

  return champ_id;
end $$;

-- 5. RLS Безопасность для новых таблиц
alter table public.championship_editors enable row level security;
alter table public.championship_invites enable row level security;

-- championship_editors
drop policy if exists "editors_select" on public.championship_editors;
drop policy if exists "editors_write" on public.championship_editors;

create policy "editors_select" on public.championship_editors for select
  using (
    public.is_championship_owner(championship_id)
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy "editors_write" on public.championship_editors for all
  using (public.is_championship_owner(championship_id) or public.is_admin())
  with check (public.is_championship_owner(championship_id) or public.is_admin());

-- championship_invites
drop policy if exists "invites_select" on public.championship_invites;
drop policy if exists "invites_write" on public.championship_invites;

-- SELECT доступен всем, у кого есть ссылка (проверяется по id UUID)
create policy "invites_select" on public.championship_invites for select
  using (true);

create policy "invites_write" on public.championship_invites for all
  using (public.is_championship_owner(championship_id) or public.is_admin())
  with check (public.is_championship_owner(championship_id) or public.is_admin());

-- 6. Переопределение RLS политик на запись для дочерних таблиц с учетомhas_championship_permission
do $$
declare
  t text;
begin
  foreach t in array array['teams','drivers','scoring_systems','stages']
  loop
    execute format('drop policy if exists "%1$s_write" on public.%1$s', t);
  end loop;
end $$;

create policy "teams_write" on public.teams for all
  using (public.has_championship_permission(championship_id, 'teams'))
  with check (public.has_championship_permission(championship_id, 'teams'));

create policy "drivers_write" on public.drivers for all
  using (public.has_championship_permission(championship_id, 'teams'))
  with check (public.has_championship_permission(championship_id, 'teams'));

create policy "scoring_systems_write" on public.scoring_systems for all
  using (public.has_championship_permission(championship_id, 'scoring'))
  with check (public.has_championship_permission(championship_id, 'scoring'));

create policy "stages_write" on public.stages for all
  using (public.has_championship_permission(championship_id, 'stages'))
  with check (public.has_championship_permission(championship_id, 'stages'));

-- standings
drop policy if exists "standings_write" on public.standings;
create policy "standings_write" on public.standings for all
  using (
    public.has_championship_permission(championship_id, 'stages')
    or public.has_championship_permission(championship_id, 'teams')
  )
  with check (
    public.has_championship_permission(championship_id, 'stages')
    or public.has_championship_permission(championship_id, 'teams')
  );

-- championships (разрешаем редактирование настроек редактору с правами 'settings')
drop policy if exists "champ_update" on public.championships;
create policy "champ_update" on public.championships for update
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or public.has_championship_permission(id, 'settings')
  )
  with check (
    owner_id = auth.uid()
    or public.is_admin()
    or public.has_championship_permission(id, 'settings')
  );

-- 7. Включение realtime для новых таблиц
do $$ begin
  alter publication supabase_realtime add table
    public.championship_editors,
    public.championship_invites;
exception when duplicate_object then null;
end $$;
