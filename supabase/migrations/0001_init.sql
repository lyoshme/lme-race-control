-- ============================================================================
-- LMERC: Initial schema (iteration 3)
-- ============================================================================
-- Запустить целиком в Supabase → SQL Editor → New query → Run.
-- Для повторного запуска все объекты создаются с IF NOT EXISTS / OR REPLACE.

-- ----------------------------------------------------------------------------
-- 1. ENUMs
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'championship_status') then
    create type championship_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'championship_lifecycle') then
    create type championship_lifecycle as enum ('active', 'finished');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'discipline') then
    create type discipline as enum (
      'formula1','gt','rally','karting','touring','endurance','custom'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'stage_type') then
    create type stage_type as enum ('race','qualifying','sprint');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. profiles (1:1 c auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

-- ----------------------------------------------------------------------------
-- 3. championships
-- ----------------------------------------------------------------------------
create table if not exists public.championships (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  title               text not null,
  slogan              text not null default '',
  description         text not null default '',
  discipline          discipline not null default 'custom',
  discipline_custom   text,
  season              text not null default '',
  banner_url          text,
  lifecycle           championship_lifecycle not null default 'active',
  status              championship_status not null default 'pending',
  rejection_reason    text,
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists championships_owner_idx   on public.championships(owner_id);
create index if not exists championships_status_idx  on public.championships(status);

-- ----------------------------------------------------------------------------
-- 4. teams / drivers / scoring_systems / standings / stages
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id                uuid primary key default gen_random_uuid(),
  championship_id   uuid not null references public.championships(id) on delete cascade,
  name              text not null,
  color             text not null default '#A4D627',
  logo_url          text,
  driver_ids        uuid[] not null default '{}',
  created_at        timestamptz not null default now()
);
create index if not exists teams_champ_idx on public.teams(championship_id);

create table if not exists public.drivers (
  id                uuid primary key default gen_random_uuid(),
  championship_id   uuid not null references public.championships(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete set null,
  first_name        text not null,
  last_name         text not null,
  number            text not null default '',
  country           text not null default '',
  photo_url         text,
  created_at        timestamptz not null default now()
);
create index if not exists drivers_champ_idx on public.drivers(championship_id);
create index if not exists drivers_team_idx  on public.drivers(team_id);

create table if not exists public.scoring_systems (
  id                  uuid primary key default gen_random_uuid(),
  championship_id     uuid not null references public.championships(id) on delete cascade,
  name                text not null,
  points              int[] not null default '{}',
  bonus_pole          int not null default 0,
  bonus_fastest_lap   int not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists scoring_champ_idx on public.scoring_systems(championship_id);

create table if not exists public.standings (
  championship_id     uuid primary key references public.championships(id) on delete cascade,
  initialized         boolean not null default false,
  selected_team_ids   uuid[] not null default '{}',
  driver_points       jsonb not null default '{}'::jsonb,
  team_points         jsonb not null default '{}'::jsonb,
  updated_at          timestamptz not null default now()
);

create table if not exists public.stages (
  id                uuid primary key default gen_random_uuid(),
  championship_id   uuid not null references public.championships(id) on delete cascade,
  name              text not null,
  track             text not null,
  stage_date        date not null,
  type              stage_type not null default 'race',
  scoring_id        uuid references public.scoring_systems(id) on delete set null,
  participant_ids   uuid[] not null default '{}',
  results           jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists stages_champ_idx on public.stages(championship_id);

-- ----------------------------------------------------------------------------
-- 5. helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_championship_owner(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.championships
    where id = cid and owner_id = auth.uid()
  );
$$;

create or replace function public.is_championship_visible(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.championships c
    where c.id = cid and (
      c.status = 'approved'
      or c.owner_id = auth.uid()
      or public.is_admin()
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 6. триггеры
-- ----------------------------------------------------------------------------

-- профиль автоматом при регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- При INSERT championships: всегда status='pending', owner_id=auth.uid()
create or replace function public.before_championship_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.owner_id := auth.uid();
  new.status := 'pending';
  new.approved_at := null;
  new.rejection_reason := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_before_champ_ins on public.championships;
create trigger trg_before_champ_ins
  before insert on public.championships
  for each row execute function public.before_championship_insert();

-- При UPDATE championships:
--  - менять status может только админ
--  - approved_at ставится автоматически при approved
create or replace function public.before_championship_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if not public.is_admin() then
      raise exception 'Only admins can change championship status';
    end if;
    if new.status = 'approved' then
      new.approved_at := now();
      new.rejection_reason := null;
    elsif new.status = 'rejected' then
      new.approved_at := null;
    end if;
  end if;
  -- owner_id неизменяемое поле
  new.owner_id := old.owner_id;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_before_champ_upd on public.championships;
create trigger trg_before_champ_upd
  before update on public.championships
  for each row execute function public.before_championship_update();

-- ----------------------------------------------------------------------------
-- 7. RLS
-- ----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.championships    enable row level security;
alter table public.teams            enable row level security;
alter table public.drivers          enable row level security;
alter table public.scoring_systems  enable row level security;
alter table public.standings        enable row level security;
alter table public.stages           enable row level security;

-- profiles
drop policy if exists "profiles_select_all"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- championships
drop policy if exists "champ_select" on public.championships;
drop policy if exists "champ_insert" on public.championships;
drop policy if exists "champ_update" on public.championships;
drop policy if exists "champ_delete" on public.championships;

create policy "champ_select" on public.championships for select
  using (
    status = 'approved'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "champ_insert" on public.championships for insert
  with check (auth.uid() is not null);

create policy "champ_update" on public.championships for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "champ_delete" on public.championships for delete
  using (owner_id = auth.uid() or public.is_admin());

-- generic policy для дочерних таблиц
-- (через is_championship_visible / is_championship_owner)
do $$
declare
  t text;
begin
  foreach t in array array['teams','drivers','scoring_systems','stages']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_write"  on public.%1$s', t);
    execute format($p$
      create policy "%1$s_select" on public.%1$s for select
        using (public.is_championship_visible(championship_id))
    $p$, t);
    execute format($p$
      create policy "%1$s_write" on public.%1$s for all
        using (public.is_championship_owner(championship_id) or public.is_admin())
        with check (public.is_championship_owner(championship_id) or public.is_admin())
    $p$, t);
  end loop;
end $$;

-- standings — то же самое (PK = championship_id)
drop policy if exists "standings_select" on public.standings;
drop policy if exists "standings_write"  on public.standings;
create policy "standings_select" on public.standings for select
  using (public.is_championship_visible(championship_id));
create policy "standings_write" on public.standings for all
  using (public.is_championship_owner(championship_id) or public.is_admin())
  with check (public.is_championship_owner(championship_id) or public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Storage buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('banners','banners',true),
  ('logos','logos',true),
  ('photos','photos',true)
on conflict (id) do nothing;

-- Политики Storage: публичное чтение, INSERT/UPDATE/DELETE только авторизованным
-- внутри своей папки {auth.uid()}/...
do $$
declare
  b text;
begin
  foreach b in array array['banners','logos','photos']
  loop
    execute format('drop policy if exists "%1$s_read"      on storage.objects', b);
    execute format('drop policy if exists "%1$s_insert"    on storage.objects', b);
    execute format('drop policy if exists "%1$s_update"    on storage.objects', b);
    execute format('drop policy if exists "%1$s_delete"    on storage.objects', b);

    execute format($p$
      create policy "%1$s_read" on storage.objects for select
        using (bucket_id = '%1$s')
    $p$, b);
    execute format($p$
      create policy "%1$s_insert" on storage.objects for insert
        with check (
          bucket_id = '%1$s'
          and auth.uid() is not null
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $p$, b);
    execute format($p$
      create policy "%1$s_update" on storage.objects for update
        using (
          bucket_id = '%1$s'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $p$, b);
    execute format($p$
      create policy "%1$s_delete" on storage.objects for delete
        using (
          bucket_id = '%1$s'
          and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
        )
    $p$, b);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 9. Realtime publication
-- ----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table
    public.championships,
    public.teams,
    public.drivers,
    public.scoring_systems,
    public.standings,
    public.stages;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- DONE. После запуска:
--   1) зайди в приложение → залогинься через OTP (создастся profiles row)
--   2) сделай себя админом:
--        update public.profiles set is_admin = true where email = 'твой@email';
-- ============================================================================
