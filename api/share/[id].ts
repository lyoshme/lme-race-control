import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Шеринг-страница /share/<uuid>.
 *
 * Двойная роль:
 *  1) Соц-карточка (OG/Twitter) для мессенджеров и краулеров;
 *  2) Редирект реальных пользователей в хеш-маршрут SPA.
 *
 * Правила видимости синхронны со SPA-ссылкой:
 *  - approved (в т.ч. скрытый из ленты is_hidden=true): полные OG-меты —
 *    владелец скрытого чемпионата обязан иметь корректный шеринг, ведь
 *    прямая ссылка тоже открывает его всем;
 *  - pending/rejected (RLS их анониму не отдаёт) либо сбой fetch'а:
 *    нейтральная карточка LMERC + редирект в чемпионат — SPA сам покажет
 *    «не опубликован» чужим и полный вид владельцу;
 *  - удалённый/несуществующий id: редирект на главную.
 *
 * 404 только для невалидного UUID — его нельзя вставлять в шаблон.
 */
export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop() || '';

  // Валидация UUID: значение попадает в HTML-шаблон (meta/JS-redirect) —
  // не пропускаем ничего, что не может быть ключом чемпионата.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!id || !UUID_RE.test(id)) {
    return new Response('Not found', { status: 404 });
  }

  const origin = url.origin;
  const championshipUrl = `${origin}/#/championship/${id}/overview`;
  const homeUrl = `${origin}/#/`;

  const genericTitle = 'Чемпионат на платформе LMERC';
  const genericDescription =
    'Автоспортивный чемпионат на платформе LMERC — пилоты, команды и таблицы в реальном времени.';

  function redirectHtml(
    title: string,
    description: string,
    image: string,
    targetUrl: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${targetUrl}" />
  <meta property="og:site_name" content="LMERC" />
  ${image ? `<meta property="og:image" content="${image}" />` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
  <link rel="canonical" href="${targetUrl}" />
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
  <script>window.location.replace('${targetUrl}');</script>
  <style>
    body { background:#0a0a0a; color:#e5e5e5; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    a { color:#A4D627; }
  </style>
</head>
<body>
  <p>Перенаправление… <a href="${targetUrl}">${targetUrl}</a></p>
</body>
</html>`;
  }

  function htmlResponse(body: string, cacheable: boolean): Response {
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': cacheable ? 'public, max-age=60, s-maxage=300' : 'no-store',
      },
    });
  }

  // Подстраховка: спа-маршрут откроет чемпионат даже без метаданных.
  const fallback = htmlResponse(
    redirectHtml(genericTitle, genericDescription, '', championshipUrl),
    false,
  );

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return fallback;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Фильтра is_hidden НЕТ: скрытые из ленты чемпионаты доступны по прямой
  // ссылке (SPA их показывает всем, лента — нет), шеринг синхронен с этим.
  const { data, error } = await supabase
    .from('championships')
    .select('title, description, banner_url')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    console.error('share: championship fetch failed', error.message);
    return fallback;
  }

  if (!data) {
    // Не approved (анониму не виден) или удалён: редирект на главную.
    return htmlResponse(redirectHtml('LMERC', genericDescription, '', homeUrl), false);
  }

  const title = escapeHtml(data.title || 'LMERC Championship');
  const description = escapeHtml(
    (data.description || genericDescription).slice(0, 300),
  );
  const banner = data.banner_url ? escapeHtml(data.banner_url) : '';

  return htmlResponse(redirectHtml(title, description, banner, championshipUrl), true);
}
