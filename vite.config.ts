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
          // vite 8（rolldown）不支援物件形式 manualChunks，改函式形式
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(id)) return 'vendor-react';
            if (/node_modules\/(@supabase|@line)\//.test(id)) return 'vendor-supabase-line';
            if (id.includes('node_modules/lucide-react/')) return 'vendor-icons';
            return undefined;
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
          'favicon-16x16-kiwimu-v2.png',
          'favicon-32x32-kiwimu-v2.png',
          'apple-touch-icon-kiwimu-v2.png',
          'icon-192x192-kiwimu-v2.png',
          'icon-512x512-kiwimu-v2.png',
          'maskable-icon-192x192-kiwimu-v2.png',
          'maskable-icon-512x512-kiwimu-v2.png',
        ],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          // 立即接管所有 client：搭配 clientsClaim，hotfix 後新 SW 不必等到所有舊頁面關閉才生效。
          skipWaiting: true,
          // 保留 navigateFallback 給離線情境，但用 denylist 把「任何帶 query string 的 navigation」
          // 全部排除，永遠走網路抓最新 HTML。比列舉敏感 param 更穩：
          //   - 自動覆蓋 encoded variants（?%63ode= 規避列舉式 regex）
          //   - 自動覆蓋未來新增的敏感 query（token / session / 其他 callback param）
          //   - 唯一代價：?utm_source 之類 tracking 也走 network，但這類用戶本來就該拿最新版
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/\?/],
          globPatterns: ['**/*.{css,js,html,svg,png,jpg,jpeg,webp,ico,txt,woff,woff2}'],
          runtimeCaching: [
            // 帶 query string 的 navigation（OAuth callback、reward link、tracking param 等）
            // 一律走 NetworkOnly，不寫進 SW cache。原因：
            //   - cache key 預設用完整 URL（含 query），會把帶 ?code= 的 callback HTML 短期留在 Cache Storage
            //   - 不是 P0/P1 auth bypass（same-origin SW cache 外部不可寫），但會造成 cache churn 與調試噪音
            //   - 這類 URL 用後即廢，沒有離線快取價值
            {
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                request.mode === 'navigate' && url.search.length > 0,
              handler: 'NetworkOnly',
            },
            // 不帶 query 的 HTML 導航走 NetworkFirst：永遠拿最新版 index.html；
            // 網路失敗時才回退到上一次成功的快取，保留離線可用性。
            {
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                request.mode === 'navigate' && url.search.length === 0,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'passport-html',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
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
