-- ============================================================================
-- LMERC: целостность этапов/таблиц и сезонов — атомарные RPC
-- ============================================================================
-- Исправляет:
--  1) Подтверждение и удаление этапа + пересчёт standings в ОДНОЙ транзакции
--     (раньше это были 2 независимых запроса — этап мог сохраниться без очков
--     или очки откатывались дважды при сбое удаления).
--  2) Standings пересчитываются из полной истории этапов сезона: исключены
--     lost-update конкуренция (чтение-модификация-запись всего JSONB с клиента),
--     накопление ошибок при множественных откатах и потеря очков команд,
--     отсутствующих в team_points (команды, добавленные после инициализации).
--  3) Создание и активация сезона — одна транзакция вместо 4 записей:
--     исчезает окно, в котором у чемпионата нет активного сезона.
--  4) Для нового чемпионата автоматически создаётся активный сезон «Сезон 1»
--     (триггер) + бэкфилл для чемпионатов, созданных до этой миграции.
--
-- Безопасно запускать повторно (всё содержимое идемпотентно).
-- ============================================================================

BEGIN;
-- ----------------------------------------------------------------------------
-- 1. Пересчёт standings из истории этапов сезона (внутренняя функция, не для API)
-- ----------------------------------------------------------------------------
-- Имена параметров обязательно с префиксом p_: имя season_id совпало бы
-- с колонкой standings.season_id → ошибка "ambiguous reference" в plpgsql
-- при первом выполнении (PL/pgSQL.variable_conflict по умолчанию = error).
create or replace function public.recalc_standings(p_champ uuid, p_season uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_initialized boolean;
  v_driver_id text;
  v_team_id text;
  v_pos int;
  v_pts numeric;
  v_dp jsonb := '{}'::jsonb;
  v_tp jsonb := '{}'::jsonb;
  v_stage record;
  v_res record;
begin
  -- Блокируем строку standings до конца транзакции: параллельные
  -- подтверждения/удаления этапов сериализуются, последний пересчёт
  -- всегда видит полную историю этапов.
  select initialized
    into v_initialized
    from public.standings
   where championship_id = p_champ
     and season_id = p_season
     for update;

  -- Таблицы не инициализированы — пересчитывать нечего
  if not found or not v_initialized then
    return;
  end if;

  -- Очки берём из замороженных результатов (r.points), т.е. смотрим систему
  -- очков, действовавшую на момент подтверждения этапа. driver_points роётся
  -- по факту участия (даже если пилот к тому моменту удалён), team_points — для
  -- любой команды, встречающейся в результатах.
  for v_stage in
    select results
      from public.stages
     where championship_id = p_champ
       and season_id = p_season
     order by created_at
  loop
    for v_res in
      select e.val as val
        from jsonb_array_elements(coalesce(v_stage.results, '[]'::jsonb)) as e(val)
    loop
      v_driver_id := v_res.val ->> 'driverId';
      v_team_id   := v_res.val ->> 'teamId';
      v_pos       := (v_res.val ->> 'position')::int;
      v_pts       := coalesce((v_res.val ->> 'points')::numeric, 0);

      if v_driver_id is not null then
        v_dp := v_dp || jsonb_build_object(
          v_driver_id,
          jsonb_build_object(
            'points',
            coalesce((v_dp -> v_driver_id ->> 'points')::numeric, 0) + v_pts,
            'wins',
            coalesce((v_dp -> v_driver_id ->> 'wins')::int, 0)
              + (case when v_pos = 1 then 1 else 0 end),
            'podiums',
            coalesce((v_dp -> v_driver_id ->> 'podiums')::int, 0)
              + (case when v_pos >= 1 and v_pos <= 3 then 1 else 0 end)
          )
        );
      end if;

      if v_team_id is not null then
        v_tp := v_tp || jsonb_build_object(
          v_team_id,
          coalesce((v_tp ->> v_team_id)::numeric, 0) + v_pts
        );
      end if;
    end loop;
  end loop;

  update public.standings
     set driver_points = v_dp,
         team_points = v_tp,
         updated_at = now()
   where championship_id = p_champ
     and season_id = p_season;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Подтверждение этапа: вставка этапа + применение очков — одна транзакция
-- ----------------------------------------------------------------------------
create or replace function public.confirm_stage(
  -- Все параметры обязательные — клиент передаёт их явно. Дефолты не ставим:
  -- после параметра со значением по умолчанию все последующие тоже должны
  -- иметь дефолт (иначе ошибка 42P13).
  champ_id uuid,
  season_id uuid,
  stage_name text,
  stage_track text,
  stage_date date,
  stage_type stage_type,
  scoring_id uuid,
  participant_ids uuid[],
  results jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  if not public.has_championship_permission(champ_id, 'stages') then
    raise exception 'Недостаточно прав для проведения этапа';
  end if;

  -- Сезон обязан принадлежать чемпионату (FK не связывает их напрямую)
  if not exists (
    select 1 from public.seasons
     where id = season_id and championship_id = champ_id
  ) then
    raise exception 'Сезон не принадлежит этому чемпионату';
  end if;

  if stage_name is null or btrim(stage_name) = '' then
    raise exception 'Укажите название этапа';
  end if;
  if stage_track is null or btrim(stage_track) = '' then
    raise exception 'Укажите трассу';
  end if;
  if stage_date is null then
    raise exception 'Укажите дату этапа';
  end if;
  if results is null or jsonb_typeof(results) <> 'array' or jsonb_array_length(results) = 0 then
    raise exception 'Результаты этапа не могут быть пустыми';
  end if;

  insert into public.stages
    (championship_id, season_id, name, track, stage_date, type, scoring_id, participant_ids, results)
  values
    (champ_id, season_id, stage_name, stage_track, stage_date, coalesce(stage_type, 'race'), scoring_id, coalesce(participant_ids, '{}'::uuid[]), results)
  returning id into v_new_id;

  perform public.recalc_standings(champ_id, season_id);

  return v_new_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Удаление этапа: откат очков + удаление — одна транзакция.
--    Идемпотентно: повторное удаление несуществующего этапа не ошибка
--    (пересчёт исключает дважды откаченные очки как класс ошибок).
-- ----------------------------------------------------------------------------
create or replace function public.delete_stage(stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champ uuid;
  v_season uuid;
begin
  select championship_id, season_id
    into v_champ, v_season
    from public.stages
   where id = stage_id;

  -- Уже удалён (или не существовал) — успех
  if not found then
    return;
  end if;

  if not public.has_championship_permission(v_champ, 'stages') then
    raise exception 'Недостаточно прав для удаления этапа';
  end if;

  delete from public.stages where id = stage_id;

  perform public.recalc_standings(v_champ, v_season);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Создание сезона: деактивация текущего + вставка нового — одна транзакция
-- ----------------------------------------------------------------------------
create or replace function public.create_season(champ_id uuid, season_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  if not public.has_championship_permission(champ_id, 'settings') then
    raise exception 'Недостаточно прав для управления сезонами';
  end if;

  if season_name is null or btrim(season_name) = '' then
    raise exception 'Укажите название сезона';
  end if;

  update public.seasons
     set is_active = false,
         finished_at = now()
   where championship_id = champ_id
     and is_active = true;

  insert into public.seasons (championship_id, name, is_active)
  values (champ_id, season_name, true)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Активация сезона: деактивация всех + активация целевого — одна транзакция
-- ----------------------------------------------------------------------------
create or replace function public.set_active_season(season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champ uuid;
begin
  select championship_id into v_champ from public.seasons where id = season_id;

  if not found then
    raise exception 'Сезон не найден';
  end if;

  if not public.has_championship_permission(v_champ, 'settings') then
    raise exception 'Недостаточно прав для управления сезонами';
  end if;

  update public.seasons
     set is_active = false
   where championship_id = v_champ
     and id <> season_id
     and is_active = true;

  update public.seasons
     set is_active = true,
         finished_at = null
   where id = season_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Активный сезон «Сезон 1» автоматически для нового чемпионата
-- ----------------------------------------------------------------------------
create or replace function public.create_default_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.seasons where championship_id = new.id) then
    insert into public.seasons (championship_id, name, is_active)
    values (new.id, 'Сезон 1', true);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_champ_ins_season on public.championships;
create trigger trg_after_champ_ins_season
  after insert on public.championships
  for each row execute function public.create_default_season();

-- Бэкфилл для чемпионатов, созданных до появления триггера.
-- ВАЖНО: алиасы обязательны — «id» без квалификации внутри подзапроса
-- разрешился бы в seasons.id, а не championships.id.
do $$
declare
  champ record;
  v_season_id uuid;
begin
  -- 1) Чемпионаты совсем без сезонов — создаём «Сезон 1»
  for champ in
    select c.id from public.championships c
     where not exists (
       select 1 from public.seasons s where s.championship_id = c.id
     )
  loop
    insert into public.seasons (championship_id, name, is_active)
    values (champ.id, 'Сезон 1', true);
  end loop;

  -- 2) Чемпионаты, у которых сезоны есть, но активного нет — устраняем
  --    последствия старого бага немонолитного create (окно с 0 активных сезонов).
  --    Активируем самый свежий сезон.
  for champ in
    select c.id from public.championships c
     where exists (
         select 1 from public.seasons s where s.championship_id = c.id
       )
       and not exists (
         select 1 from public.seasons s
          where s.championship_id = c.id
            and s.is_active
       )
  loop
    select s.id into v_season_id
      from public.seasons s
     where s.championship_id = champ.id
     order by s.created_at desc
     limit 1;

    if v_season_id is not null then
      update public.seasons
         set is_active = true,
             finished_at = null
       where id = v_season_id;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Права на функции: recalc_standings — только внутренняя;
--    публичные RPC вызываются из UI после проверки прав внутри функции.
-- ----------------------------------------------------------------------------
revoke execute on function public.recalc_standings(uuid, uuid) from public;

revoke execute on function public.confirm_stage(uuid, uuid, text, text, date, stage_type, uuid, uuid[], jsonb) from public;
revoke execute on function public.delete_stage(uuid) from public;
revoke execute on function public.create_season(uuid, text) from public;
revoke execute on function public.set_active_season(uuid) from public;

grant execute on function public.confirm_stage(uuid, uuid, text, text, date, stage_type, uuid, uuid[], jsonb) to authenticated, service_role;
grant execute on function public.delete_stage(uuid) to authenticated, service_role;
grant execute on function public.create_season(uuid, text) to authenticated, service_role;
grant execute on function public.set_active_season(uuid) to authenticated, service_role;

COMMIT;
