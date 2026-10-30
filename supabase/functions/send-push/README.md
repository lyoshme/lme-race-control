# send-push — отправитель Web Push

Edge Function рассылает Web Push после вставки в `public.notifications`
(контракт payload'а: `{ title, body, url }` — читается обработчиком `push` в `src/sw.ts`).
RU-тексты дублируют `src/features/notifications/NotificationBell.tsx` — при смене формулировок
править оба места.

## 1. Деплой

```bash
supabase functions deploy send-push --project-ref cbhvwsdiktebjzgqfsag
```

## 2. Секреты (VAPID)

Пара генерируется один раз: публичный ключ идёт на клиент
(`VITE_VAPID_PUBLIC_KEY` в Vercel/локальном `.env`), приватный — только в секреты Supabase:

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=...публичный...
supabase secrets set VAPID_PRIVATE_KEY=...приватный...
supabase secrets set SEND_PUSH_SECRET=...случайная строка, например openssl rand -hex 32...
# опционально: supabase secrets set VAPID_SUBJECT=mailto:you@example.com
# опционально: supabase secrets set SITE_URL=https://lme-race-control.vercel.app
```

## 3. Database Webhook (триггер отправки)

Dashboard → Database → Webhooks → Create webhook:

- Table: `public.notifications`, Events: **Insert**
- URL: `https://cbhvwsdiktebjzgqfsag.supabase.co/functions/v1/send-push`
- Method: `POST`
- Headers: `x-internal-token: <SEND_PUSH_SECRET>` (тот же секрет, что в п.2)

Альтернатива, если вебхуки неудобны — SQL-триггер через `pg_net`, вызывающий тот же URL.

## 4. Переменные на стороне клиента (Vercel)

`VITE_VAPID_PUBLIC_KEY` — публичный ключ из п.2 (Project Settings → Environment
Variables, затем редеплой).

## 5. Проверка

1. Включи push в панели колокола (нужен HTTPS: prod или preview Vercel;
   iOS — только в установленном приложении).
2. Эмуляция отправки без реального действия в приложении: в SQL Editor
   вставь строку уведомления вручную — вебхук срабатывает на любой INSERT:

```sql
insert into public.notifications (user_id, championship_id, kind, payload)
values (
  '...uuid профиля из таблицы profiles...',
  null,
  'championship_moderated',
  '{"status":"approved","title":"Тест"}'::jsonb
);
```

   Прямой INSERT не требует функции `create_notification`: она нужна триггерам
   (права/валидация kind), вебхуку же важен сам факт вставки строки.
3. Диагностика: `supabase functions logs send-push`; ответ вебхука —
   `{ "sent": n, "removed": m }` (sent — доставлено, removed — протухшие подписки).
