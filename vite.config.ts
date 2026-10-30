import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest: свой sw.ts — precache + runtime-кеш, и позднее сюда же
      // добавятся обработчики web push (фаза уведомлений).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Регистрацию выполняем сами в main.tsx через registerSW().
      injectRegister: false,
      // В dev-сервере SW не включаем: не мешает повторным правкам ассетов.
      devOptions: { enabled: false },
      includeAssets: [
        'favicon-16.png',
        'favicon-32.png',
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'hero-poster.jpg',
      ],
      injectManifest: {
        // Только код приложения; hero.mp4 и прочее крупное медиа облачает
        // runtime-кеш в sw.ts, а не precache.
        globPatterns: ['**/*.{js,css,html}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        id: '/',
        name: 'LMERC — платформа автоспортивных чемпионатов',
        short_name: 'LMERC',
        description:
          'Создавайте чемпионаты, управляйте командами, пилотами и этапами, следите за таблицами в реальном времени.',
        lang: 'ru',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        categories: ['sports'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
