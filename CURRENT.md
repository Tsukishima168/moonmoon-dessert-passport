# CURRENT.md — passport.kiwimu.com

## Snapshot · 2026-07-16

Status: `Economy v2 Passport adapter 已修正兩輪獨立審查 P1、最終 fresh-context review PASS 並通過本機驗證；本分支尚未 merge／deploy`

- 新增 server-first wallet adapter：登入會員先讀 `economy_get_wallet`，有效的遠端 `0` 不再回退 localStorage；只有 server 明確 `ROLLOUT_DISABLED` 或 RPC 尚不存在，才讀舊的遠端 `profiles.points` 相容路徑。
- 每日簽到改送不含點數的 `passport.daily_checkin` 事件；只有同畫面先讀到 v2 wallet 才允許寫入。accepted 結果直接採用；shadow／尚未 rollout／legacy wallet 全部 fail closed，不再呼叫 `adjust_points`。UI 日曆與連續天數由遠端歷史推導，server 成功或已處理回覆會立即鎖住當日 CTA，避免 refresh 延遲重開。
- 新增 `economy_claim` session 流程：claim UUID 在 app 啟動前從網址清除，登入後交由 `economy_claim_pending` 核准；過期、跨會員、重播與點數值都不由 client 決定。
- 舊 Gacha `?action=add_points&amount=...` 只做清除與觀測，不再增加 local 或正式點數；CustomEvent 只觸發重新讀取，不採用 payload balance。
- 本次審查修正後，`npx tsc --noEmit --pretty false`、`git diff --check`、Vite production build、PWA generateSW 與 OAuth／SSO／service-worker／reward／Economy regression 全數通過。
- 本機 Chrome QA：偽造 `amount=999999` 僅顯示拒絕通知且未成為餘額；`economy_claim` 從可見 URL 與 initial-search global 清除、只保留於 sessionStorage；signed-out 簽到按鈕可點並導向登入；390px document／body 寬度均為 390，無頁面級水平溢出，console error 為 0。
- 本輪未改 Supabase production、未開 rollout flag、未寫會員點數、未 merge 或 deploy。Shop Economy v2 Draft PR #17、真實 Supabase staging、hosted lint、Auth/RLS/PostgREST 與獨立簽收仍是 Passport merge 的硬 gate。
- 相容期只保留舊遠端餘額讀取；Passport client 已移除 amount-bearing `adjust_points` helper。資料庫端 v1 function 的最終撤權仍屬 shared migration 退役 gate。
- 第二輪審查後補上 wallet owner key 與跨帳號 in-flight invalidation、strict Economy code／整數 payload 驗證、pending claim terminal allowlist 與 thrown-request UX；可執行 regression 已覆蓋合法遠端 `0`、malformed amount、跨帳號 stale authority 與未知 claim code 保留。
- 最終 fresh-context reviewer 對 owner binding、malformed envelope、claim retention 與 check-in authority 判定 P0/P1/P2 全為 0；本機 9 路由 preview smoke 皆為 200，最新 Chrome 攻擊／claim／390px QA 仍為 console error 0。

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
