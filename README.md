# 月島甜點護照 | MoonMoon Dessert Passport

MoonMoon Dessert Passport 是 Kiwimu 生態中的護照入口，提供 dashboard-first 的護照首頁、印章旅程、點數商店，以及公開護照 / 邀請 / 布丁兌換等流程。

## 目前產品範圍

- `/`：Passport landing，登入後預設進入護照首頁 / dashboard
- `/passport/:id`：公開護照頁，顯示邀請進度與可否兌換
- `/join/:passportId`：接受邀請頁，提交 IG 帳號
- `/redeem`：店員端布丁兌換頁

備註：
- 專案仍會承接 MBTI 站帶來的 `mbti_type`、claim code、跨站點數同步，但它本身不是 MBTI 測驗前端。
- 部分歷史文件仍保留早期 quiz 規劃；以本 README、`DEPLOYMENT.md`、`LAUNCH_CHECKLIST.md`、`CURRENT.md`、`LOG.md` 為準。

## 核心功能

- Passport landing 與護照首頁切換
- 護照首頁 dashboard、ProfileCenter、MemberHub
- Supabase Auth Google OAuth / Magic Link
- LIFF profile 讀取與 fallback
- 集章、點數、獎勵兌換
- 公開護照、邀請加入、店員核銷流程
- GA4 UTM 與入口追蹤

## 本機開發

前置需求：
- Node.js 20 以上建議

安裝與啟動：

```bash
npm install
npm run dev
```

Vite 開發伺服器預設跑在 `http://localhost:3000`。

## 環境變數

必要或常用：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GA4_ID`
- `VITE_LIFF_ID`
- `VITE_SUPABASE_AUTH_REDIRECT_URL`（可選，未提供時 fallback 到目前網域 `/`）

相容別名：

- `VITE_MOON_ISLAND_SUPABASE_URL`
- `VITE_MOON_ISLAND_SUPABASE_ANON_KEY`

說明：
- 若未提供 Supabase env，網站仍可啟動，但登入、雲端點數、claim RPC 會降級或不可用。
- `VITE_SUPABASE_AUTH_REDIRECT_URL` 未提供時，程式會 fallback 到 `window.location.origin/`；真正必須正確的是 Supabase Auth 後台的 Redirect URLs 白名單。
- 若未提供 `VITE_LIFF_ID`，LIFF 相關功能會略過，UI 仍可正常渲染。
- 本 repo 之外仍依賴 shared backend RPC，例如 `update_last_seen`、`insert_user_event`、`upsert_point_transaction`；部署時要一併確認正式環境已存在。

## 建置

```bash
npm run build
npm run preview
```

## 部署

Vercel 設定請看 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 目前追蹤事件

常見 GA4 事件包含：

- `utm_landing`
- `entrance_scan`
- `button_click`
- `passport_opened`
- `passport_closed`
- `stamp_unlocked`
- `stamp_claim`
- `passport_checkin`
- `reward_redeemed`
- `points_sync_received`

## 技術棧

- React 19
- TypeScript
- Vite 6
- React Router
- Tailwind CSS
- Supabase
- LIFF
- GA4

## 重要檔案

- `index.tsx`：入口與 route 掛載
- `App.tsx`：landing 與護照入口容器
- `PassportScreen.tsx`：護照首頁 / dashboard 容器
- `src/api/passportSystem.ts`：公開護照 / 邀請 / 兌換 API
- `src/api/points.ts`：點數讀寫與 RPC
- `src/contexts/SupabaseAuthContext.tsx`：Google / Magic Link 登入
- `src/contexts/LiffContext.tsx`：LINE LIFF 整合
- `supabase/migrations/`：資料庫 migration
