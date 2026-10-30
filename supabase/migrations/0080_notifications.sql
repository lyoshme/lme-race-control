-- ============================================================================
-- LMERC: аккаунтные уведомления (iteration 6)
-- ============================================================================
-- Что делает:
--  1) Таблица notifications — персональные события аккаунта (не «пилота»):
--     этап подтверждён, чемпионат одобрен/отклонён, новый редактор.
--  2) SECURITY DEFINER-функция create_notification — единственный способ
--     вставки: публичной INSERT-политики у таблицы НЕТ, чтобы никто не мог
--     подделать уведомление чужому пользователю через RPC.
--  3) Триггеры-надстройки над существующими действиями:
--     - stages AFTER INSERT        → «этап подтверждён» владельцу и редакторам
--     - championship_editors AFTER INSERT → «новый редактор» владельцу
--     - championships AFTER UPDATE OF status → «одобрен/отклонён» владельцу
--    Инициатор события никогда не получает уведомление о собственном действии
--    (для security definer RPC auth.uid() внутри триггера по-прежнему
--    возвращает JWT вызывающего, т.к. это session-level GUC).
--  4) Realtime: таблица добавлена в публикацию supabase_realtime —
--    клиент подписывается фильтром user_id=eq.<uid>.
--
-- Безопасно запускать повторно (содержимое идемпотентно).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Таблица уведомлений
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  championship_id uuid references public.championships(id) on delete cascade,
  -- kind — text + CHECK (а не enum): новые kind'ы добавляются правкой
  -- одного CHECK, без ALTER TYPE ... ADD VALUE в нескольких местах.
  kind            text not null,
  payload         jsonb not null default '{}'::jsonb,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Ограничение kind добавляем отдельно от create table if not exists:
-- при повторном запуске таблица уже существует, а constraint не проверяется.
-- Поэтому добавляем его отдельным шагом с проверкой pg_constraint.
do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'notifications_kind_check'
       and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_kind_check
      check (kind in ('stage_confirmed', 'championship_moderated', 'editor_joined'));
  end if;
end $$;

-- Индексы: счётчик непрочитанных (частичный) + лента последних.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where is_read = false;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Единая точка вставки уведомлений (для триггеров ниже)
-- ----------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id         uuid,
  p_championship_id uuid,            -- nullable (событие может быть вне чемпа)
  p_kind            text,
  p_payload         jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Валидация kind: CHECK на таблице сработал бы в конце, но явная
  -- ошибка понятнее и не тянет за собой полтранзакции.
  if p_kind not in ('stage_confirmed', 'championship_moderated', 'editor_joined') then
    raise exception 'Неизвестный тип уведомления: %', p_kind;
  end if;

  insert into public.notifications (user_id, championship_id, kind, payload)
  values (p_user_id, p_championship_id, p_kind, coalesce(p_payload, '{}'::jsonb));
end;
$$;

-- Вставку уведомлений разрешаем только внутренним триггерам (они вызываются
-- с правами владельца функции, гранты им не нужны). Публичного Execute нет —
-- иначе любой вошедший мог бы отправить «уведомление» произвольному юзеру.
revoke execute on function public.create_notification(uuid, uuid, text, jsonb) from public;

-- ----------------------------------------------------------------------------
-- 3. RLS: пользователь видит и отмечает прочитанным только свои уведомления
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid());

-- UPDATE только флага is_read (клиент меняет только его)
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- INSERT-политики НЕТ: вставка — только через create_notification из триггеров.

-- ----------------------------------------------------------------------------
-- 4. «Этап подтверждён» — владельцу и всем редакторам, кроме инициатора
-- ----------------------------------------------------------------------------
-- Подтверждение этапа идёт через RPC confirm_stage (0030), который делает
-- INSERT в stages в одной транзакции с пересчётом standings —
-- поэтому триггер ловит ровно момент подтверждения, не трогая сам RPC.
create or replace function public.notify_stage_confirmed() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_user  uuid;
  v_payload jsonb;
begin
  -- Нет JWT (сервисная вставка) — уведомлять некому считать инициатором
  if v_actor is null then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'stageId',   new.id,
    'stageName', new.name,
    'track',     new.track,
    'stageDate', new.stage_date,
    'type',      new.type
  );

  -- Владелец чемпионата
  select owner_id into v_owner from public.championships where id = new.championship_id;
  if v_owner is not null and v_owner <> v_actor then
    perform public.create_notification(v_owner, new.championship_id, 'stage_confirmed', v_payload);
  end if;

  -- Со-редакторы (все гранты), кроме инициатора и уже уведомлённого владельца.
  -- ВАЖНО: в запросе цикла нельзя ссылаться на переменную цикла v_user —
  -- отдельная v_owner становится фильтром «не дублировать владельцу».
  for v_user in
    select user_id from public.championship_editors
     where championship_id = new.championship_id
       and user_id <> v_actor
       and (v_owner is null or user_id is distinct from v_owner)
  loop
    perform public.create_notification(v_user, new.championship_id, 'stage_confirmed', v_payload);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_after_stage_ins_notify on public.stages;
create trigger trg_after_stage_ins_notify
  after insert on public.stages
  for each row execute function public.notify_stage_confirmed();

-- ----------------------------------------------------------------------------
-- 5. «Новый редактор» — владельцу чемпионата
-- ----------------------------------------------------------------------------
-- Ловим ЛЮБОЙ путь добавления: и accept_championship_invite (0002), и прямой
-- INSERT в championship_editors из UI владельца.
create or replace function public.notify_editor_joined() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name  text;
begin
  -- Имя редактора для текста «<имя> присоединился как со-редактор»
  select coalesce(display_name, split_part(email, '@', 1))
    into v_name
    from public.profiles
   where id = new.user_id;

  select owner_id into v_owner from public.championships where id = new.championship_id;

  -- Владелец сам добавил редактора вручную → уведомлять себя не нужно
  if v_owner is not null and v_owner <> auth.uid() then
    perform public.create_notification(
      v_owner,
      new.championship_id,
      'editor_joined',
      jsonb_build_object(
        'editorId',   new.user_id,
        'editorName', coalesce(v_name, 'Редактор')
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_after_editor_ins_notify on public.championship_editors;
create trigger trg_after_editor_ins_notify
  after insert on public.championship_editors
  for each row execute function public.notify_editor_joined();

-- ----------------------------------------------------------------------------
-- 6. «Чемпионат одобрен/отклонён» — владельцу
-- ----------------------------------------------------------------------------
-- Модерация идёт прямым UPDATE championships.status из админ-панели,
-- поэтому — триггер на смену статуса.
create or replace function public.notify_championship_moderated() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Интересуют только финальные статусы модерации; прочие апдейты
  -- (настройки, баннер, скрытие) уведомлений не порождают.
  if new.status = old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  -- Инициатор не получает уведомление о собственном действии
  if new.owner_id = auth.uid() then
    return new;
  end if;

  perform public.create_notification(
    new.owner_id,
    new.id,
    'championship_moderated',
    jsonb_build_object(
      'status',          new.status,
      'rejectionReason', new.rejection_reason,
      'title',           new.title
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_after_champ_status_notify on public.championships;
create trigger trg_after_champ_status_notify
  after update of status on public.championships
  for each row execute function public.notify_championship_moderated();

-- ----------------------------------------------------------------------------
-- 7. Realtime: публикация таблицы (клиент слушает user_id=eq.<uid>)
-- ----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

COMMIT;
