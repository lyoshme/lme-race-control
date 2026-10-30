-- ============================================================================
-- LMERC: подписки Web Push (dimension 7)
-- ============================================================================
-- Таблица хранит PushSubscription каждого браузера/устройства пользователя.
-- Порядок работы:
--   1) клиент подписывается (pushManager.subscribe, VAPID-ключ из env);
--   2) клиент записывает endpoint + p256dh/auth сюда (RLS: только свои);
--   3) после INSERT в notifications Supabase Edge Function send-push
--      читает подписки юзера правами service role и рассылает push.
--
-- UPDATE-политика не нужна: при ротации подписка пересоздаётся
-- (клиент удаляет старую запись по endpoint и вставляет новую).
--
-- Безопасно запускать повторно (содержимое идемпотентно).
-- ============================================================================

BEGIN;

-- 1. Таблица подписок (endpoint уникален глобально: один браузер = одна строка)
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null, -- { p256dh, auth } из PushSubscription.getKey()
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- 2. RLS: со своей подпиской юзер делает что хочет (кроме UPDATE),
--    чужие не видит вовсе. Отправитель (send-push) работает через
--    service role, который обходит RLS.
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete
  using (user_id = auth.uid());

COMMIT;
