/// <reference lib="webworker" />
/**
 * Service worker LMERC (vite-plugin-pwa, injectManifest).
 *
 * - precacheAndRoute(self.__WB_MANIFEST): JS/CSS/HTML + мелкие публичные
 *   ассеты (список формирует плагин при сборке).
 * - Навигация: SPA-shell из precache, за исключением /share/* — там
 *   OG-страница Edge Function для соцсетей, SW её не перехватывает.
 * - Медиа: /hero.mp4 кешируется один раз целиком (CacheFirst) и раздаётся
 *   по Range-запросам (RangeRequestPlugin) — работает оффлайн и мгновенно
 *   при повторных заходах.
 * - Web Push: обработчики `push`/`notificationclick`. Payload шлёт
 *   Supabase Edge Function send-push в формате { title, body, url }
 *   (см. supabase/functions/send-push/index.ts).
 * - Данные Supabase НЕ кешируются: realtime-свежесть таблиц важнее
 *   автономности; в оффлайне откроется оболочка приложения без данных.
 */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { RangeRequestsPlugin } from 'workbox-range-requests';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const navigationRoute = new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/share\//],
});
registerRoute(navigationRoute);

registerRoute(
  ({ url }) => url.pathname === '/hero.mp4',
  new CacheFirst({
    cacheName: 'lmerc-hero-video',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new RangeRequestsPlugin(),
    ],
  }),
);

// autoUpdate: новый SW активируется сразу, страница подхватит его на
// следующей перезагрузке (без диалогов подтверждения).
self.skipWaiting();
clientsClaim();

/* ---------------------------------------------------------------------------
 * Web Push (фаза уведомлений)
 * Формат payload'а задан в supabase/functions/send-push/index.ts:
 * { title, body, url }. Уведомление показываем всегда (userVisibleOnly),
 * клик — переход на целевую вкладку приложения.
 * ------------------------------------------------------------------------- */

/** Contract of the payload from the send-push function. */
interface PushMessage {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  // Некорректный JSON не должен молча схлопнуть уведомление — покажем текст как есть.
  const data: PushMessage = (() => {
    try {
      return event.data ? (event.data.json() as PushMessage) : {};
    } catch {
      return { body: event.data?.text() };
    }
  })();

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'LMERC', {
      body: data.body ?? 'Новое уведомление',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
  event.notification.close();

  event.waitUntil(
    (async () => {
      // Уже открытое окно приложения: переносим его на целевую вкладку и фокусируем.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        try {
          await client.navigate(target);
          return await client.focus();
        } catch {
          // navigate может не сработать (страница в другом состоянии) — пробуем следующее окно.
        }
      }
      // Браузерного окна с приложением нет — открываем новое.
      const opened = await self.clients.openWindow(target);
      if (opened) await opened.focus();
    })(),
  );
});
