# Фаза «Уведомления» (колокол + Web Push) — план новой сессии

> **Для агента:** исполнять по задачам, отмечая чекбоксы. Каждый пункт = конкретная правка; после каждого — гейт `npm run build`.

**Goal:** добавить аккаунтные уведомления (в реальном времени, колокол в Header) и Web Push поверх них — по зафиксированному в сессии от 30.10.2026 плану.

**Architecture:** две прослойки. (1) Таблица `notifications`, пополняемая SQL-триггерами/RPC-надстройками (этап подтверждён, чемпионат одобрен/отклонён, редактор присоединился); клиент читает её через realtime (`user_id=eq.X`). (2) Таблица `push_subscriptions` + Supabase Edge Function `send-push` (Deno, `web-push`, Database Webhook на INSERT в `notifications`) + обработчики `push`/`notificationclick` в уже готовом custom SW (injectManifest).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind 3, Supabase (Postgres + RLS + Edge Functions), Vercel (env для VAPID public key).

---

## Global Constraints

- UI/комментарии/миграции — на русском; миграции БД применяются вручную в Supabase SQL Editor (репо не имеет раннера).
- Нумерация миграций: `0060` (соло-пилоты) и `0070` (награды) заняты; для этой фазы — `0080_notifications.sql`, `0090_push_subscriptions.sql`, дальше новый 0100+.
- Уведомления адресуются **аккаунтам** (`profiles`), не «пилотам» (пилот ≠ учётка). Тема «пилот = аккаунт» — отдельное продуктовое решение, ВНЕ этой фазы.
- snake_case ↔ camelCase только через `mappers.ts`; доменные типы в `src/types.ts`; raw-типы в `src/lib/database.types.ts`.
- Инициатор события не получает уведомление о собственном действии.
- Supabase-данные НЕ кешируются SW; realtime-свежесть приоритетна.

---

## Part 0: Контекст нового сеанса (уже сделано, не переделывать)

- [x] PWA: custom SW (`src/sw.ts`, injectManifest), манифест, safe-area, кнопка установки (`src/hooks/usePwa.ts`), маскируемая иконка.
- [x] Память сезона/вкладки: `src/hooks/seasonMemory.ts` (localStorage per-чемпионат); колокл/профиль больше не сбрасывают сезон.
- [x] Шеринг: `vercel.json` (rewrites `:path*`), устойчивая `api/share/[id].ts` (approved, включая hidden; никогда не 404ит по валидному UUID), SPA-фолбэк `/share/<uuid>` в `src/router.tsx`.
- [x] Favicon.svg перегенерирован из текущего лого + `?v=3` cache-busting.
- [x] Выбор участников этапа переписан (`src/features/stages/wizard/ParticipantsStep.tsx`): поиск, сворачиваемые карточки, «Индивидуальные пилоты»; в мастер передаются ВСЕ пилоты сезона (`StageWizardModal.tsx`).
- [x] Тай-брейк таблиц по лучшему финишу (`DriversTable.tsx`, `TeamsTable.tsx`).
- [x] **ПРИМЕНЕНО (проверено 30.10 через REST):** миграция `0060_standings_solo_drivers.sql` применена пользователем в SQL Editor — колонка `standings.selected_driver_ids` существует; `0070` (season_awards) тоже на месте.

---

## Part A: Миграции БД

### Task 1: `0080_notifications.sql`

**Files:** Create `supabase/migrations/0080_notifications.sql`

- [x] Таблица `notifications`: `id uuid PK`, `user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`, `championship_id uuid REFERENCES championships(id) ON DELETE CASCADE` (nullable), `kind text NOT NULL` + CHECK (список ниже), `payload jsonb NOT NULL DEFAULT '{}'` (title/body/reference ids), `is_read boolean NOT NULL DEFAULT false`, `created_at timestamptz DEFAULT now()`.
- [x] Индексы: `(user_id, is_read)` частичный по непрочитанным + `(user_id, created_at DESC)`.
- [x] Первые kind'ы: `stage_confirmed`, `championship_moderated` (approved/rejected — пол в payload), `editor_joined`.
- [x] RLS: SELECT/UPDATE (`is_read`) только `user_id = auth.uid()`; INSERT — только через `SECURITY DEFINER` функции (нет публичной политики вставки!).
- [x] SECURITY DEFINER-функция `create_notification(...)` (с валидацией kind) для вызова из триггеров.
- [x] Пополнение из RPC/действий:
  - `confirm_stage` (из 0030): на успешное INSERT этапа → уведомить владельцу и всем редакторам ИСКЛЮЧАЯ инициатора;
  - `accept_championship_invite` (0002) / прямой INSERT в `championship_editors` → уведомить владельцу о новом редакторе;
  - модерация (статус approved/rejected в `championships` — триггер AFTER UPDATE): уведомить владельцу.
- [x] Идемпотентность миграции: `create or replace` + `drop policy if exists`.
- [ ] ПРИМЕНИТЬ В SQL EDITOR (пользователь) — UI/типы готовы, рантайм-тест ждёт таблицу.

**Interfaces:** Produces колонки для `database.types.ts` (см. Task 2).

### Task 2: Типы и API

**Files:** Modify: `src/lib/database.types.ts`, `src/types.ts`, `src/lib/api/mappers.ts`, `src/lib/api/notifications.ts` (new), `src/lib/api/index.ts`

- [x] `database.types.ts`: `NotificationRow` (+ вставка таблицы в `Database['public']['Tables']`).
- [x] `types.ts`: `NotificationKind = 'stage_confirmed' | 'championship_moderated' | 'editor_joined'`; `Notification`; `NOTIFICATION_KIND_LABELS` (русские подписи: «Этап подтверждён», «Чемпионат одобрен/отклонён», «Новый редактор»).
- [x] `mappers.ts`: `rowToNotification`, `notificationToReadUpdate`.
- [x] `lib/api/notifications.ts`: `list(userId)`, `markRead(id)`, `markAllRead(userId)`; barrel-экспорт.
- [x] Порядок исполнения: миграция → database.types → types → mappers → api. (Специфика репо: вызовы `.update()` к hand-made `Database` типизируются `never` — используем устоявшийся паттерн `as never`, как в championships/drivers/seasons.)

---

## Part B: Колокол в реальном времени

### Task 3: `useNotifications` + UI

**Files:** Create `src/hooks/useNotifications.ts`, `src/features/notifications/NotificationBell.tsx`; Modify `src/components/layout/Header.tsx`

- [x] `useNotifications`: `useSupabaseQuery` с realtime-подпиской `user_id=eq.<uid>` (живое обновление между вкладками/юзерами уже работает в этом механизме) + счётчик непрочитанных.
- [x] `NotificationBell`: иконка-колокол рядом с темой/установкой (Header показывает его только при активной сессии); badge непрочитанных; панель-список (framer-motion, стиль оверлея `SeasonSelector`), кнопка «Прочитать все», переход: `stage_confirmed` → `goManage(championshipId, 'stages')`, `championship_moderated` → `goManage(championshipId, 'settings')`, `editor_joined` → `goManage(championshipId, 'editors')`.
- [x] Пустое состояние «Уведомлений пока нет»; группировка по дате не нужна (MVP ≤ 20 последних).
- [x] Не показывать колокол без сессии (гейт в Header + пустой список в хуке).

---

## Part C: Web Push

### Task 4: `0090_push_subscriptions.sql`

**Files:** Create `supabase/migrations/0090_push_subscriptions.sql`

- [x] Таблица: `id uuid PK`, `user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`, `endpoint text NOT NULL UNIQUE`, `keys jsonb NOT NULL` (p256dh/auth), `created_at timestamptz DEFAULT now()`.
- [x] RLS: SELECT/INSERT/DELETE только свои; UPDATE не нужен (пересоздаётся).
- [x] `database.types.ts` (+ новый table entry) — доложено в Task 2 ветку правок (`PushSubscriptionRow`, `PushKeys`).
- [x] Доменный тип `PushSubscription` в `types.ts`, `rowToPushSubscription`/`pushSubscriptionToInsert` в mappers, `api.push.subscribe/unsubscribe`, barrel `push`.
- [ ] ПРИМЕНИТЬ В SQL EDITOR (пользователь; можно вместе с 0080).

### Task 5: Клиентская подписка

**Files:** Create `src/lib/webpush.ts` (urlBase64ToUint8Array), `src/hooks/usePush.ts`; Modify `src/features/notifications/NotificationBell.tsx` (кнопка «Включить push»), `.env.example`

- [x] Подписка из жеста пользователя (кнопка в панели колокола): `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, отправка на `api.push.subscribe(...)` (перезапись по endpoint: delete+insert).
- [x] iOS/Safari: запрос разрешения ТОЛЬКО в установленном приложении — гейт через готовый `useStandalone()`; статус `needs-install` показывает подсказку «Поделиться → На экран “Домой”» вместо кнопки.
- [x] VAPID: публичный ключ в client (`VITE_VAPID_PUBLIC_KEY`), приватный — только в Supabase (Task 6). `.env.example` дополнен.
- [x] Отписка/ротация: кнопка «Выключить push» = `subscription.unsubscribe()` + `api.push.unsubscribe(endpoint)`; недоступный статус (`denied`) показывает подсказку.
- [x] TS-нюанс: `applicationServerKey` в новых lib.dom ждёт `Uint8Array<ArrayBuffer>` — хелпер возвращает именно его.

### Task 6: Отправитель — Supabase Edge Function

**Files:** Create `supabase/functions/send-push/index.ts` (Deno, `npm:web-push`), `supabase/functions/send-push/README.md` (деплой + вебхук); Modify `docs`-примечание по деплою

- [x] `web-push` (Deno, `npm:web-push@3.6.7`): рассылка VAPID-ключами; env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (автоинжект рантайма, чтение подписок через service role), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, опционально `VAPID_SUBJECT`, `SITE_URL`.
- [x] Тело: из строки `notifications` — заголовок/текст по kind (дублирует тексты NotificationBell); `data.url` = хеш-ссылка на нужную вкладку manage чемпионата.
- [x] Триггер: Database Webhook INSERT на `public.notifications` → POST функции с заголовком `x-internal-token: <SEND_PUSH_SECRET>` (альтернатива pg_net упомянута в README).
- [x] Мёртвые подписки (404/410) удаляются из `push_subscriptions`.
- [x] `supabase/functions/send-push/README.md`: деплой, `supabase secrets set`, вебхук, ручная проверка INSERT'ом, логи.
- [ ] Выполнить пользователем: deploy + секреты + создать Webhook (см. README).

### Task 7: Обработчики в SW

**Files:** Modify `src/sw.ts`

- [x] `push` — `event.waitUntil(registration.showNotification(title, { body, icon, badge, data: { url } }))`; битый JSON не роняет показ (fallback на text).
- [x] `notificationclick` — close; существующее окно → `client.navigate(target)` + `focus()`; иначе `clients.openWindow(target)` + focus.
- [x] Косметика TS: `vibrate` отсутствует в lib.dom `NotificationOptions` — убрано.
- [x] Комментарий-заголовок SW обновлён (контракт payload`а, ссылка на send-push).

---

## Part D: Хвосты сессии (опционально, по запросу пользователя)

- [ ] Компактный режим выбора участников: 2-колоночная сетка пилотов и/или свёрнутые по умолчанию карточки команд (пользователь просил «нос темы» из недавней правки).
- [ ] Тач-таргеты кнопок pole/FL в `OrderingStep` ≈27px по высоте — увеличить до ≥40px.
- [ ] После деплоя: перетест `/share/<uuid>` (видимый + hidden + удалённый) и OG-превью в мессенджерах (разные боты кешируют по-разному).
- [ ] i18n-аудит новых строк (русские лейблы без дублей).

## Гейты

- `npm run build` — зелёный после каждого Task (проверено после Task 1–7; финальная сборка ✓).
- iOS push проверяется ТОЛЬКО на HTTPS-превью (Vercel) в standalone.
- Не включать `devOptions.enabled` у VitePWA.

## Статус фазы 30.10.2026

- [x] Part A (код миграций + типы + API) — готово.
- [x] Part B (колокол realtime) — готово.
- [x] Part C (push: подписка, отправитель, SW) — код готово.
- [ ] Пользователь: применить миграции `0080_notifications.sql` и `0090_push_subscriptions.sql` в SQL Editor (до этого колокол/debug-страница покажут ошибку чтения notifications — UI деградирует мягко: пустая панель, ошибки в консоли).
- [ ] Пользователь: сгенерировать VAPID-пару (`npx web-push generate-vapid-keys`), `VITE_VAPID_PUBLIC_KEY` на Vercel + секреты и деплой `send-push` + Webhook (см. `supabase/functions/send-push/README.md`).
- [ ] Пользователь: git push → Vercel редеплой; тест realtime-колокола на двух браузерах; тест push (desktop Chrome + iOS standalone через preview).
