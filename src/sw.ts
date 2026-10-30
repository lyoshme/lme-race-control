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
 * - Данные Supabase НЕ кешируются: realtime-свежесть таблиц важнее
 *   автономности; в оффлайне откроется оболочка приложения без данных.
 *
 * (Web push обработчики будут добавлены в фазе уведомлений.)
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
