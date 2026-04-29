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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase-line': ['@supabase/supabase-js', '@line/liff'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
    plugins: [
      react(),
      ...(!disablePwa ? [VitePWA({
        injectRegister: false,
        registerType: 'prompt',
        manifest: false,
        includeAssets: [
          'manifest.json',
          'logo.svg',
          'apple-touch-icon.png',
          'icon-192x192.png',
          'icon-512x512.png',
          'maskable-icon-192x192.png',
          'maskable-icon-512x512.png',
        ],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          navigateFallback: '/',
          globPatterns: ['**/*.{css,js,html,svg,png,jpg,jpeg,webp,ico,txt,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
              handler: 'NetworkOnly',
              options: {
                cacheName: 'supabase-auth',
              },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/(?:rest|storage)\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-runtime',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'passport-images',
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
