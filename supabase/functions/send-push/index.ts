// ============================================================================
// LMERC: отправитель Web Push (Supabase Edge Function, Deno)
// ============================================================================
// Вызывается Database Webhook'ом: INSERT в public.notifications →
// POST https://<ref>.supabase.co/functions/v1/send-push
//   заголовок: x-internal-token: <SEND_PUSH_SECRET>
//
// Что делает:
//   1) достаёт строку уведомления из тела вебхука;
//   2) собирает { title, body, url } по kind (контракт с src/sw.ts);
//   3) читает подписки пользователя (service role НЕ подчиняется RLS);
//   4) рассылает через web-push (VAPID);
//   5) мёртвые подписки (404/410) удаляет из push_subscriptions.
//
// Деплой и секреты — см. supabase/functions/send-push/README.md
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

/** Строка notifications из тела вебхука Supabase. */
interface NotifyRecord {
  id: string;
  user_id: string;
  championship_id: string | null;
  kind: string;
  payload: Record<string, unknown> | null;
}

/** Контракт payload'а push — читается обработчиком push в src/sw.ts. */
interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/** Подписка из push_subscriptions в форме, ожидаемой web-push. */
interface SubRow {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const APP_URL = (Deno.env.get('SITE_URL') ?? 'https://lme-race-control.vercel.app').replace(
  /\/$/,
  '',
);

/** RU-тексты push по kind — синхронны с NotificationBell. */
function buildPush(
  record: NotifyRecord,
): { title: string; body: string; manageTab: string | null } {
  const p = record.payload ?? {};
  switch (record.kind) {
    case 'stage_confirmed': {
      const name = (p.stageName as string) ?? 'Этап подтверждён';
      const track = p.track as string | undefined;
      const typeLabels: Record<string, string> = {
        race: 'Гонка',
        qualifying: 'Квалификация',
        sprint: 'Спринт',
      };
      const typeLabel = (p.type as string) ? typeLabels[p.type as string] ?? null : null;
      const stageDate = p.stageDate as string | undefined;
      const dateLabel = stageDate
        ? new Date(`${stageDate}T00:00:00`).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          })
        : null;
      const title = track ? `${name} — ${track}` : name;
      const body = [typeLabel, dateLabel].filter(Boolean).join(' · ') || 'Этап подтверждён';
      return { title, body, manageTab: 'stages' };
    }
    case 'championship_moderated': {
      const title = (p.title as string) ?? 'Чемпионат';
      if (p.status === 'rejected') {
        const reason = (p.rejectionReason as string | undefined)?.trim();
        return {
          title: `«${title}» отклонён`,
          body: reason || 'Причина указана в приложении',
          manageTab: 'settings',
        };
      }
      return { title: `«${title}» одобрен`, body: 'Чемпионат опубликован', manageTab: 'settings' };
    }
    case 'editor_joined': {
      const editorName = (p.editorName as string) ?? 'Новый участник';
      return { title: editorName, body: 'Стал со-редактором чемпионата', manageTab: 'editors' };
    }
    default:
      return { title: 'Уведомление', body: 'Откройте LMERC', manageTab: null };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Только POST' }, 405);
  }

  // Вызов разрешён только вебхуку с секретом (см. README: Dashboard → Database → Webhooks).
  const secret = Deno.env.get('SEND_PUSH_SECRET');
  if (!secret || req.headers.get('x-internal-token') !== secret) {
    return json({ error: 'Запрещено' }, 403);
  }

  const body = (await req.json().catch(() => null)) as
    | { record?: NotifyRecord }
    | null;
  const record = body?.record;
  if (!record?.user_id || !record.kind) {
    return json({ error: 'Некорректное тело вебхука (нет record.user_id/kind)' }, 400);
  }

  const { title, body: pushBody, manageTab } = buildPush(record);
  const pushUrl =
    record.championship_id && manageTab
      ? `${APP_URL}/#/championship/${record.championship_id}/manage/${manageTab}`
      : `${APP_URL}/#/`;

  const payload: PushPayload = { title, body: pushBody, url: pushUrl };

  // Секреты: SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY подмешивает рантайм.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Не заданы SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!vapidPublicKey || !vapidPrivateKey) {
    return json({ error: 'Не заданы VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY' }, 500);
  }
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@lme-race-control.vercel.app',
    vapidPublicKey,
    vapidPrivateKey,
  );

  // Вставка в notifications уже отработала (мы — вебхук на неё), поэтому
  // просто идём за подписками пользователя.
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: subs, error: subsError } = await db
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .eq('user_id', record.user_id);

  if (subsError) {
    return json({ error: `Не удалось прочитать подписки: ${subsError.message}` }, 500);
  }

  let sent = 0;
  let removed = 0;

  for (const sub of (subs ?? []) as SubRow[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (e) {
      // 404/410 — подписка протухла (браузер отписался/истёк TTL): чистим.
      const status = (e as { statusCode?: number }).statusCode ?? 0;
      if (status === 404 || status === 410) {
        await db.from('push_subscriptions').delete().eq('id', sub.id);
        removed += 1;
      } else {
        console.error('send-push: ошибка отправки', sub.endpoint.slice(0, 60), status);
      }
    }
  }

  return json({ sent, removed });
});
