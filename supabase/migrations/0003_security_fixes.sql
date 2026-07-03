-- ============================================================================
-- LMERC: Security Fixes (iteration 4.1)
-- ============================================================================

-- 1. Исправляем утечку данных в профилях
-- Удаляем политику, которая позволяла всем видеть все email-адреса
drop policy if exists "profiles_select_all" on public.profiles;

-- Создаем новую политику: чтение только владельцу или администратору
create policy "profiles_select_restricted" on public.profiles for select
  using (
    auth.uid() = id 
    or public.is_admin()
  );

-- 2. Ограничиваем доступ к деталям инвайтов
-- Удаляем публичную политику
drop policy if exists "invites_select" on public.championship_invites;

-- Разрешаем просмотр инвайта только авторизованным пользователям
create policy "invites_select_auth" on public.championship_invites for select
  using (auth.uid() is not null);
