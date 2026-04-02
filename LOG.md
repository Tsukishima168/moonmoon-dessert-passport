# LOG.md — passport.kiwimu.com

## 2026-04-01

- 僅做交付推進，不重整 SSOT、不搬 repo、不改 remote、不碰 production。
- 驗證 `npm run build` 通過。
- 在 `vite.config.ts` 補上 `manualChunks`，拆分：
  - `react` / `react-dom` / `react-router-dom`
  - `@supabase/supabase-js` / `@line/liff`
  - `lucide-react`
- 重跑 build 通過，主 bundle 由單一 `676.81 kB` 改為多個較小 chunk。
- 驗證本機啟動：
  - `npm run preview -- --host 127.0.0.1 --port 3102`
  - `/`、`/redeem` 皆回 `HTTP 200`
- 建立 `CURRENT.md` / `LOG.md` 作為交付狀態入口。
- 未解 blocker 保留在真人驗證與實際憑證層：auth callback、LIFF、public passport、join、redeem、cross-site sync。
