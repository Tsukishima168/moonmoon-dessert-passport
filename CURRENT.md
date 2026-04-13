# CURRENT.md — passport.kiwimu.com

## Snapshot · 2026-04-08

Status: `本機可驗證，production auth 待真人關閉`

## Phase 2 Focus

Passport 目前的定位是 passport home / dashboard-first 的護照入口，不再是單純的護照封面頁。

Phase 2 的文件目標是把首頁敘事、路由與 launch guidance 都維持在同一個方向：

- `PassportScreen` 打開後的第一視圖是護照首頁
- 護照首頁優先顯示 profile snapshot、today action、points、checkin、latest order
- 公開護照、邀請、兌換仍保留，但視為護照入口的下層流程

已完成驗證：
- `npm run build` 通過
- `npm run preview -- --host 127.0.0.1 --port 3102` 可啟動
- `curl -I http://127.0.0.1:3102/` → `200 OK`
- `curl -I http://127.0.0.1:3102/redeem` → `200 OK`
- `curl -I -L https://passport.kiwimu.com/` → `200 OK`
- `curl -I -L https://passport.kiwimu.com/redeem` → `200 OK`
- `curl -I -L https://passport.kiwimu.com/passport/test-id` → `200 OK`
- public RPC `get_passport_public` 已讀回有效護照資料
- public RPC `redeem_pudding_staff` 已驗證錯誤分支可正確回 `Invalid password`
- 已補 `manualChunks`，主 bundle 從單一 `676.81 kB` 拆為：
  - `index` `312.36 kB`
  - `vendor-supabase-line` `294.08 kB`
  - `vendor-react` `47.93 kB`
  - `vendor-icons` `22.01 kB`

## 目前 Blockers

1. `Google OAuth` / `Magic Link` 仍需真人在正式網域驗證 callback 與 session 保持；程式會 fallback 到 `https://passport.kiwimu.com/`，但 Supabase Auth Redirect URLs 白名單仍要確認。
2. 已確認 Vercel production env 目前只有 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_GA4_ID`；缺少 `VITE_SUPABASE_AUTH_REDIRECT_URL` 與 `VITE_LIFF_ID`。
3. production 目前未帶 `VITE_LIFF_ID`；LIFF 在 live 站是關閉狀態，不是 auth 主 blocker，但 LINE 內流程目前不能宣稱已通。
4. `/passport/:id`、`/join/:passportId`、`/redeem` 成功路徑仍需真實資料與店員端流程驗證。
5. 與 `shop.kiwimu.com` 的 shared profile / points 同步仍需跨站真人 smoke；點數同步要求真實 Supabase session。

## 最小交付清單

- 本機 build/preview/smoke 可重現：已完成
- landing / passport / join / redeem 基本路由可回應：已完成
- live public route 與 public RPC 基本可達：已完成
- auth 進入與 callback 回跳驗證：待完成
- public passport / join / redeem 真人路徑驗證：待完成
- cross-site profile / points sync 驗證：待完成
- `CURRENT.md` / `LOG.md` 已建立：已完成

## 今晚可以直接做的項目

- 先確認護照首頁的第一屏內容仍維持 dashboard-first，而不是回到護照封面優先
- 到 Supabase Dashboard 確認 Redirect URLs 至少包含 `https://passport.kiwimu.com/`
- 在 Vercel 明確補上 `VITE_SUPABASE_AUTH_REDIRECT_URL=https://passport.kiwimu.com/`
- 若要打開 LINE 流程，再補 `VITE_LIFF_ID`
- 用測試帳號做一次 `Google OAuth` 或 `Magic Link` 回跳驗證
- 用 staff 測試資料做一次 redeem flow 與 Supabase 寫入驗證

## 需要真人參與的驗證項目

- LINE 內建瀏覽器開啟與 `LIFF` 行為
- `Google OAuth` / `Magic Link` 在實際網域的 callback
- 真實會員邀請加入流程
- 店員端實際核銷流程
