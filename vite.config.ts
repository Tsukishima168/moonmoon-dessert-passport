import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const geminiKey = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
  const disablePwa = (env.VITE_DISABLE_PWA ?? '').toLowerCase() === '1' ||
    (env.VITE_DISABLE_PWA ?? '').toLowerCase() === 'true';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(!disablePwa ? [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/*.svg'],
        manifest: {
          name: '月島甜點護照',
          short_name: '月島護照',
          description: '你的甜點靈魂旅程護照 — 集章、任務、每日簽到',
          theme_color: '#F5F0E8',
          background_color: '#F5F0E8',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'zh-TW',
          icons: [
            {
              src: '/icons/pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          navigateFallback: '/',
          globPatterns: ['**/*.{css,js,html,svg,png,jpg,ico,txt,woff2}'],
          runtimeCaching: [
            {
              // API calls: network first
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
            {
              // Images: cache first
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 30 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false, // 開發模式關閉，避免 HMR 衝突
        },
      })] : []),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
