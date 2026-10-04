# CURRENT.md — passport.kiwimu.com

## Snapshot · 2026-10-04 (security: client-side backdoors)

Status: `fix/passport-security-20261004` 已實作與驗證，尚未 push／deploy

- `?debug=1` 全解鎖印章：只在開發建置（`import.meta.env.DEV`）有效；正式 bundle 已 tree-shake 掉，`npm test` 會檢查 `dist/` 不含該分支。
- `?action=add_points` 積分同步：改由 `src/lib/pointsSyncGuard.ts` 驗證。只有 `document.referrer` origin 不是 `https://gacha.kiwimu.com`（vercel 別名讀不到 `.kiwimu.com` ACK cookie，已移除），或 amount／ts／source 格式不對才拒絕（不入帳、不寫 ACK、送 GA4 `points_sync_rejected`，只帶 `reason`）。通過後入帳 `min(amount, MAX_PER_SYNC=400, 滾動 24 小時剩餘額度 MAX_PER_DAY=600)`，一律寫 ACK（30 天，Gacha 游標前進，超出部分作廢，Penso 2026-10-04 決定），超量時 `points_sync_received` 帶 `capped: true`；重複 ts 只補 ACK。處理完會把同步參數從 `window.__PASSPORT_INITIAL_SEARCH__` 拿掉。
- App 不再 dispatch `kiwimu:points_earned`：PassportScreen 掛載時會監聽並再入帳一次（實測 50 變 100）。
- GA4 `sign_up`／`login`：`trackAuthConversion` 改走 ready-aware + beacon + `event_callback`，SSO popup 關閉與登入後導頁會等它送完（最久 1500ms，`src/lib/deliveryGate.ts`）。
- 草稿 migration `supabase/migrations/20261004150000_adjust_points_lockdown.sql`（尚未套用）：鎖定 `adjust_points`（reason 白名單、1..5、每台北日一次、REVOKE PUBLIC/anon）。注意線上現行函式因 `point_transactions.device_id` NOT NULL 而每次回滾，新版補上 device_id 後簽到同步才會真正運作。另見遺留：`profiles` 對 authenticated 有表級 UPDATE，可繞過 RPC 直接改 `points`。
- 同步參數（amount／ts／device_id／source／action）由 `index.html` 早期 scrubber 在 GA4 讀網址前清掉；原始 query 留在 `window.__PASSPORT_INITIAL_SEARCH__` 供 App 讀取。
- 發現：`source` 自 2026-05-21（14d7b23）起被 scrubber 清掉，導致舊的 `handleIncomingPointsSync` 讀不到 `source`，Gacha 同步在本機 build 實測是失效狀態（正式站實際行為尚未驗證，未對正式站做任何測試）。本次修正會讓合法同步恢復運作，部署後請看 GA4 `points_sync_rejected` 的 reason 分佈，特別留意 `referrer`（LINE 內建瀏覽器可能不帶 referrer）；長期玩家的第一次同步會被截斷到 400 並視為完成。
- 未處理（需伺服器端重新設計）：`?unlock=` QR 解鎖碼、舊的 `?stamp=`、`?auto_unlock=true&mbti_type=`、外部任務（IG／LINE／Google 評論）的「我完成了」按鈕，以及本機積分本身，都仍是純前端信任。

## Snapshot · 2026-07-15

Status: `五站共用視覺語言已完成本機整合與瀏覽器驗證，尚未 commit／push／deploy`

- All public routes now mount the shared Kiwimu Universe rail; the landing page adds the `02 / Member identity` role label.
- Global headers, route shells, app notices, and viewport offsets now consume the rail-height token on desktop and mobile, preventing fixed-header overlap and duplicate rail-height scrolling.
- Fresh-context review extended the rail-aware header contract to `/passport/:id`, `/join/:passportId`, and `/redeem`; full-screen passport overlays remain above the rail so their controls stay reachable.
- Verified `npm run build` plus OAuth/SSO/service-worker/reward-ledger regression tests, homepage, and `/redeem`; desktop and 390px browser QA passed with no horizontal overflow.
- The remaining local warning is the expected missing LIFF ID. Google OAuth, real member data, and successful redemption still require production/human verification.
- No points, redemption, auth, or Supabase data was changed in this visual-system pass.

## Snapshot · 2026-06-04

Status: `main` clean before this documentation pass. Latest checked commit: `defdb88 Merge pull request #27 from Tsukishima168/fix/passport-launch-prep-2026-05-30`.

Passport is the account and member identity surface for the five-site universe. Its current production responsibility is dashboard-first membership, Google OAuth through Supabase Auth, cross-site profile/points continuity, public passport/invite/redeem flows, and PWA installability.

Current source-of-truth files for new agents:

- `CURRENT.md`
- `BOOT.md`
- `AI_HANDOVER.md`
- `VERIFY.md`
- `README.md`

Operational notes:

- `npm run build` runs `vite build && npm test`; the test is `scripts/regression-passport-oauth.mjs`.
- Google OAuth is the login authority. LIFF is profile/share support, not the primary login authority.
- Supabase Redirect URLs remain the critical production setting for auth callback stability.
- Keep commerce/order ownership in `shop.kiwimu.com`; Passport may display order history and outbound links, but should not become checkout.

## Snapshot · 2026-04-29

Status: `Google SSO 已統一，PWA 建置已開啟，production 仍需真人 smoke`

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

1. `Google OAuth` 仍需真人在正式網域驗證 callback 與 session 保持；程式會 fallback 到 `https://passport.kiwimu.com/`，但 Supabase Auth Redirect URLs 白名單仍要確認。
2. production 目前未帶 `VITE_LIFF_ID`；LIFF 在 live 站是關閉狀態，不是 auth 主 blocker，但 LINE 內流程目前不能宣稱已通。
3. `/passport/:id`、`/join/:passportId`、`/redeem` 成功路徑仍需真實資料與店員端流程驗證。
4. 與 `shop.kiwimu.com` 的 shared profile / points 同步仍需跨站真人 smoke；點數同步要求真實 Supabase session。
5. PWA 需要在 production HTTPS 網域用 Android / iOS / desktop 真機確認安裝提示、加入主畫面與更新提示。

## 最小交付清單

- 本機 build/preview/smoke 可重現：已完成
- landing / passport / join / redeem 基本路由可回應：已完成
- live public route 與 public RPC 基本可達：已完成
- auth 進入與 callback 回跳驗證：待完成
- public passport / join / redeem 真人路徑驗證：待完成
- cross-site profile / points sync 驗證：待完成
- PWA manifest / service worker / install icon / cross-device install prompt：已完成
- `CURRENT.md` / `LOG.md` 已建立：已完成

## 今晚可以直接做的項目

- 先確認護照首頁的第一屏內容仍維持 dashboard-first，而不是回到護照封面優先
- 到 Supabase Dashboard 確認 Redirect URLs 至少包含 `https://passport.kiwimu.com/`
- 若要打開 LINE 流程，再補 `VITE_LIFF_ID`
- 用測試帳號做一次 `Google OAuth` 回跳驗證
- 用 staff 測試資料做一次 redeem flow 與 Supabase 寫入驗證
- 用 Android Chrome / iOS Safari / desktop Chrome / Safari 做一次 PWA 安裝驗證

## 需要真人參與的驗證項目

- LINE 內建瀏覽器開啟與 `LIFF` 行為
- `Google OAuth` 在實際網域的 callback
- 真實會員邀請加入流程
- 店員端實際核銷流程

## 2026-07-08 升級輪（全面升級指令）
- 目標：S5 — merge chore/tailwind4-upgrade 進 main（衝突解決＋main 新碼補 v4 替換）
- 狀態：✅ 完成並簽收（worker 因 quota 中斷於半 merge，主對話 opus 接手收尾）
  - merge c829f4b（RedeemPage 保留 main 的 reward 核銷流程、捨棄 branch 舊護照輸入）
  - 補課 eb74ef7（唯一 v3 殘留 outline-none→outline-hidden）
  - 驗證：tsc 0、vite build 綠、regression（OAuth/SSO/SW/reward ledger）全過
  - backup/pre-s5-merge-20260708 保留；⚠️ .git 有 broken ref「main 2」待清（無害）
- 下一步：Penso 同意後 push；Passport 首頁凍結區人工視覺確認
