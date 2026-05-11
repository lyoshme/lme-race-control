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

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop() || '';

  if (!id) {
    return new Response('Not found', { status: 404 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Server configuration error', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('championships')
    .select('title, description, banner_url, status')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error || !data) {
    return new Response('Not found', { status: 404 });
  }

  const title = escapeHtml(data.title || 'LMERC Championship');
  const description = escapeHtml(
    (data.description || 'Автоспортивный чемпионат на платформе LMERC').slice(0, 300),
  );
  const banner = data.banner_url ? escapeHtml(data.banner_url) : '';
  const origin = url.origin;
  const spaUrl = `${origin}/#/championship/${id}/overview`;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${spaUrl}" />
  ${banner ? `<meta property="og:image" content="${banner}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${banner ? `<meta name="twitter:image" content="${banner}" />` : ''}
  <link rel="canonical" href="${spaUrl}" />
  <meta http-equiv="refresh" content="0; url=${spaUrl}" />
  <script>window.location.replace('${spaUrl}');</script>
  <style>
    body { background:#0a0a0a; color:#e5e5e5; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    a { color:#A4D627; }
  </style>
</head>
<body>
  <p>Перенаправление… <a href="${spaUrl}">${spaUrl}</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
}
