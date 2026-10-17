# CURRENT.md — passport.kiwimu.com

## 2026-10-15｜五站風格升級 Phase B（passport）｜共用 rail kit 安裝完成，本機驗證通過；未 push／未部署

- 分支 `claude/style-upgrade-20261014`，接在 Phase A 之後。
- **rail kit**：`components/KiwimuUniverseRail.tsx`、`styles/kiwimu-universe.css` 與共用 kit byte-identical（`verify-rail.mjs --scan` PASS）。掛載 `onTrack={trackEvent}`（`analytics.ts`，自動加 `site_id: passport`）、`getLoginStatus` 用 `readSupabaseLoginStatus(supabase)`（唯讀）。舊 rail 檔內兩條全域規則（`#root button` 44px、手機表單 16px）搬進 `index.css`。`scripts/test-universe-rail.mjs` 換成 kit 版（161 項斷言，未刪測試）。每個 rail 連結點擊送 12 欄 `universe_nav_click`，同分頁導覽；GA4 文件見 `GA4_連結放置位置一覽.md` §八。
- **字體**：Noto Sans TC 400/500/700/900 與 JetBrains Mono 500–700 改由 `index.html` 唯一載入（kit 不再 @import）；Space Grotesk 在 passport 零使用，不再載入。
- **安全區**：`viewport-fit=cover` 保留；Chromium CDP 模擬 top inset 47px 時 rail padding-top 47、高 96、`--ku-rail-height` 96px，fixed route header top 96，不重疊，展開面板不超出視窗。iOS 實機未測。
- **主按鈕依表面**：淺色面改深綠實心＋奶油字（App header「登入」、SSO「重新登入」、JoinPage「確認接受邀請」、獎勵頁訪客登入、「導航前往月島」、旅程「確認完成」），深色面（hub／landing 深綠 Hero）維持柔金。PassportPage 的柔金「月島布丁」是狀態卡、不是按鈕，維持柔金。
- **hub 設定區**（預設收合）：3 處對比不足與 24px 輸入框已修；窄螢幕（<420px）頭像與名稱欄上下排列（320px 時名稱欄原本只有 18px 寬）。
- **/redeem 無障礙**：三個輸入欄 aria-label、錯誤 `role="alert"`、完成卡 `role="status"`、模式鈕 `aria-pressed`；AST 排除 className 與 aria-*／role 後仍與原版等價。
- **JoinPage／PassportPage** 次要文字對比全部 ≥4.5:1。
- `index.html` 底部的隱藏 h1 是靜態的「AI／搜尋語意層」（品牌介紹與地址，註明與東京月島無關），在 `#root` 之外，所以每個路由都有第 2 個 h1；本輪保留不動。
- 驗證與證據：`/Users/pensoair/Desktop/Web-Projects/sites/.worktrees/style-20261014-qa/passport/`（`results.json` 的 `phaseB` 區塊、`DELIVERY.md`）。已知未處理：`KiwimuUniverseNav.tsx`（未掛載）仍會送 2 欄的同名事件；`Button.tsx` primary 變體與 `ShopOrderHistory.tsx` 為未掛載元件，仍是柔金；CheckinModal 等舊元件內仍有霓虹色硬陰影類名（被 `.member-center` 規則壓掉，未逐一清除）。

## 2026-10-14｜五站風格升級 Phase A（passport）｜本機完成，未 push／未部署；Phase B（rail kit）待調度者通知

- 基準 `origin/main` `3dd513f`；分支 `claude/style-upgrade-20261014`（worktree `.worktrees/style-20261014-passport-kiwimu-com`）。動機：10/14 獨立驗收報告給 B+，扣分在 /redeem 完成度與對比、PWA 提示壓首屏、token 名實倒置。只動呈現，auth／點數／集章／兌換／核銷邏輯與 Supabase 未動；共用 rail 檔與 `index.tsx` 的 rail 掛載未動（Phase B）。
- **P1 /redeem**（`b0493d0`、`faefc5e`）：表單收進與 hub 會員卡同族的奶油浮起卡（radius 20、柔陰影、單欄 560px、桌機視覺置中），加 `<main>`。依「主行動依表面決定」規則，奶油卡上的核銷／確認兌換按鈕為深綠實心＋奶油字（12.47:1，hover 中綠 #304F2F），CODE／# 欄位改淺色以免與按鈕並排難分。「月島端驗證」「護照布丁」placeholder、錯誤與完成卡文字對比全 ≥4.5:1；「回首頁」連結與輸入框 ≥44px（logo 位置不變）；欄位焦點為外圈 2px #304F2F。390／320／1440 對比不足 0、<44px 0、水平溢出 0。RedeemPage 以 AST 排除 className 並攤平無屬性 div／section／main 後與原版相同（826 token、sha 一致；5 個變異對照全數判對），即除樣式與包裝元素外 JSX 邏輯與文案不變。
- **P2 PWA「已可離線開啟」**（`c805e38`）：由滿寬膠囊改為內容寬（142×34）、底部 safe-area＋16px、不攔截點擊；原本已有 4.2 秒消失但無淡出，現於最後 0.6 秒淡出，reduced-motion 不淡出、時間到直接移除。首訪 5 秒後元素已移除（390／1440，首頁與 hub 皆實測）。SW 註冊與更新邏輯未動。
- **P3 reduced-motion**（`28d1c3a`）：全域 catch-all（同 map 寫法）。reduce 下首頁、hub、journey、redeem 的 transition／animation >0.01ms 元素為 0（改前首頁 1：`button.flex.items-center.gap-1.5` 0.15s；載入頁另有 3 個循環動畫）。
- **P4 token**（`e1d0407`）：舊 lime token 改名 `brand-gold`（70 處，#D7C678 柔金）、舊 lime-dark 改名 `brand-green`（10 處；#304F2F 是中綠，不是 gold 的深色）；以舊名 grep 全 repo 為 0 筆，無動態組字串。編譯後 JS 各 chunk 改名後逐位元相同、CSS leaf 規則 902 條集合相同；首頁／hub／journey／兌換頁 390、1440 與改名前 build 像素差 0。順手把未被引用的 `KiwimuMetricCard` accent `'lime'` 對齊 `'gold'`；`RewardShop.tsx`（未掛載）僅被動改了一個 class 名稱以滿足 grep 為 0。
- **P5**：全域 `:focus-visible` 為 2px、offset 2px，淺色面 #304F2F、深綠 Hero 內 #D7C678，未更動。fixed route header 為 `top: var(--ku-rail-height)`，無寫死頂部值（量到 49px＝rail 高）；`viewport-fit=cover` 保留。依 header 高度寫死的內容留白：`.member-landing` padding-top 116px（≤760px 為 110px）、JoinPage／PassportPage `pt-28`、`.redeem-main` 112px——Phase B 讓 rail 吃 safe-area 時 header 會隨變數下移，但這些留白需一併檢視。
- **P6**：`design-qa.md` 第一節狀態改為已合併上線（PR43／44）；本節為本輪紀錄。
- 驗證：`npx tsc --noEmit` exit 0；`npm run build`（含 OAuth／SSO／SW／reward ledger／points guard、32 journey、5 hydration、70 rail 斷言）全綠。QA 證據（截圖、量測 JSON、腳本）在 `/Users/pensoair/Desktop/Web-Projects/sites/.worktrees/style-20261014-qa/passport/`，`results.json` 為數字總表、`DELIVERY.md` 為索引。
- 已知限制與待辦：(1) 未在有瀏海的實機驗證 safe-area（headless 的 env() 為 0，只驗 calc 結果 16px）；Safari／LINE 實機未測。(2) 同樣違反「淺色面主按鈕用深綠實心」的既有按鈕未動（App header「登入」膠囊、JoinPage 主按鈕、PassportPage 完成卡），不在 Phase A 清單。(3) hub 設定區（預設收合的 details）展開後仍有 3 處對比不足（約 3.96–4.49:1）與 1 個 24px 高輸入框，改前即存在，不在本輪範圍。(4) `index.html` 的隱藏語意 h1 使每個路由有 2 個 h1。(5) /redeem 輸入欄無獨立 label，僅靠 placeholder 當可及名稱；加 aria-label 屬新增屬性，本輪為守住 AST 等價未做。(6) 錯誤訊息未加 `role="alert"`，同理。

## 2026-10-07｜主對話收尾｜本機驗證完成，待獨立簽收與上線核定

- ✅ 主對話CUA 320／390／768／1280px：首頁CTA內容寬187px、高52px，landing／訪客會員頁無水平溢出、可見破圖0。
- ✅ Reviewer設計的40個actual-source／AST mock檢核由主對話執行通過：callback／SSO診斷、未知訂單欄位／prototype鍵、profile失敗、領取／核銷失敗與points fallback契約保留。`root-reviewer-probes.json:1`。
- 📌 自我更正：reviewer fixture將export宣告當expression導致初次編譯失敗；只修外部測試fixture後再跑，非App回歸。不將未完成reviewer的結論稱獨立APPROVE。
- ⚠️ 審查員因帳戶額度中止，最終patch尚未獨立簽收；未真人登入、簽到／集章／核銷、改點數或DB。
- 📌 最終交付索引與hash：/Users/pensoair/.codex/visualizations/2026/10/07/kiwimu-public-copy-repair/passport/final-manifest.json；原作者證據保留為歷史，新的final-manifest才是送審版本。未部署；合併上線需Penso同意。


## Snapshot · 2026-10-07（公開文字與手機 CTA 修補；未發布）

- 基準為 fresh fetch 的 `origin/main` `ad8d40f5b78a6449ba0d6347bdf8f0bdb1cd0000`。10/06 深綠版已經由 PR39／40 合併並部署；歷史本機檢核不表示目前仍未上線。
- 本輪分支 `codex/passport-public-copy-repair-20261007`：手機 landing CTA 改內容寬，保留52px；登入／徽章／同步／訂單／公開護照提示改為顧客可理解的狀態與下一步。原始 auth 診斷與 SSO broker 錯誤契約保留，點數與獎勵行為未變。
- 積分顯示既有 remote 或 local fallback，改以「積分紀錄／此裝置積分」說明；探索紀錄與實際會員可兌換餘額不混稱。RewardShop 未掛載，獎勵頁只提供說明。
- 作者機械驗證：tsc／build／既有 OAuth、SSO、SW、reward ledger、points guard 回歸與32 journey／5 hydration斷言通過；53項 actual-source隔離VM檢查通過。獨立 source／CUA 由主 agent 接續，尚未獨立簽收。本輪未 commit／push／merge／deploy，亦未真人登入、保存會員資料、簽到、發章、核銷或改 DB／環境設定。
- 私有交付證據：`/Users/pensoair/.codex/visualizations/2026/10/07/kiwimu-public-copy-repair/passport/`。

## Snapshot · 2026-10-06（月島深綠改版）

- 分支 `codex/passport-green-simplify-20261006`（base＝main `0646b77`）：Codex 作者 commit「收斂深綠會員首頁與集章入口」＋ Claude 配色統一修正。Codex 獨立審查 APPROVE（40 個 mocked behavior checks：登出、訂單重試／取消、水合、URL 分頁、獎勵頁純說明）。
- Claude 配色統一：PWA manifest `background_color`／`theme_color` 由舊 lime `#D4FF00` 改為 `#F5F0E8`／`#1F2F1F`；移除深色模式 `theme-color #111111`（頁面深色模式仍是奶油白＋深綠，瀏覽器頂色應一致）。
- Claude 細節修正：會員首頁標題在 320px 斷成「在月島，留／一份日常。」→ 改為逗號後換行（兩段 inline-block span），桌機仍一行。
- Claude 接手重驗：tsc exit 0；`npm run build`（含 OAuth／SSO／points-sync／member journey／hydration 迴歸）通過；本機 preview 1280／768／390／320 無水平溢出、無 console error、按鈕 ≥44px；Kiwimu 角色圖未裁切（object-fit: contain）。
- 當時待判斷：手機首頁「開啟會員中心」為整排寬的金色主按鈕；10/07 修補分支改為內容寬，此修補尚未發布。
- 未做：Google 登入、集章、兌換、點數同步實操；實機 Safari／LINE 瀏覽器。
- 已上線（PR #39 squash `7e0076c`、PR #40 `ad8d40f`；正式部署 `dpl_E7LqNMi4Gwic8uN46dKLp69CjYti` READY，alias `passport.kiwimu.com`）。上線後配色細節統一（獨立比對差異表 P1–P9＋補兩處）：Hero 圓角 24／手機 22px；焦點框改 2px #304F2F、深綠 Hero 內金色，舊 #111＋lime 光暈限縮在 Universe rail；muted／邊框 token 對齊 #5F6856／#D8D7C4；深綠小字 token（舊名 lime-dark，2026-10-14 起改為 brand-green）統一 #304F2F；訂單藍色狀態標籤改淡綠；PWA 安裝提示、App 通知 toast 與對話框的黑／lime 硬陰影改柔和陰影＋#D8D7C4 細邊；字體改 Noto Sans TC（Inter 未載入）、移除 DM Serif；載入頁白底改奶油白。tsc、build＋迴歸測試通過；390px 實測無 console error、無溢出。

## Snapshot · 2026-10-04 (Codex 接手 Claude 安全修補)

- 修正 SSO opener 通知也等待 sign_up／login 送出，避免來源站提前關窗；實際 broker 時序回歸通過。
- 移除未使用的 Gemini client define；沿用 Claude debug／points-sync 修補。
- 兩支 migration 加上鎖等待、statement timeout 與撤銷客戶 TRUNCATE 權限；正式 catalog 證明兩表 RLS 開啟。
- typecheck、build／regression、SQL sandbox 十案及獨立 code review APPROVE。此處是候選版本驗證，正式部署與 migration 狀態以 canonical SSOT 最新章節為準。
- 限制：QR／自我申報集章尚未改為伺服器證明，實體獎勵需店員確認；既有 redeem_reward_item 的 device_id 缺漏尚未修復，不應承諾線上兌換成功。

## Snapshot · 2026-10-04 (security: client-side backdoors)

Status（當時快照）：`fix/passport-security-20261004` 已實作與驗證；目前程式已包含於10/06正式主線 `ad8d40f`。Migration／真人流程狀態仍以 canonical SSOT 最新記錄為準。

- `?debug=1` 全解鎖印章：只在開發建置（`import.meta.env.DEV`）有效；正式 bundle 已 tree-shake 掉，`npm test` 會檢查 `dist/` 不含該分支。
- `?action=add_points` 積分同步：改由 `src/lib/pointsSyncGuard.ts` 驗證。只有 `document.referrer` origin 不是 `https://gacha.kiwimu.com`（vercel 別名讀不到 `.kiwimu.com` ACK cookie，已移除），或 amount／ts／source 格式不對才拒絕（不入帳、不寫 ACK、送 GA4 `points_sync_rejected`，只帶 `reason`）。通過後入帳 `min(amount, MAX_PER_SYNC=400, 滾動 24 小時剩餘額度 MAX_PER_DAY=600)`，一律寫 ACK（30 天，Gacha 游標前進，超出部分作廢，Penso 2026-10-04 決定），超量時 `points_sync_received` 帶 `capped: true`；重複 ts 只補 ACK。處理完會把同步參數從 `window.__PASSPORT_INITIAL_SEARCH__` 拿掉。
- App 不再 dispatch `kiwimu:points_earned`：PassportScreen 掛載時會監聽並再入帳一次（實測 50 變 100）。
- GA4 `sign_up`／`login`：`trackAuthConversion` 改走 ready-aware + beacon + `event_callback`，SSO popup 關閉與登入後導頁會等它送完（最久 1500ms，`src/lib/deliveryGate.ts`）。
- 草稿 migration `supabase/migrations/20261004150000_adjust_points_lockdown.sql`（尚未套用）：鎖定 `adjust_points`（reason 白名單、1..5、每台北日一次、REVOKE PUBLIC/anon）。注意線上現行函式因 `point_transactions.device_id` NOT NULL 而每次回滾，新版補上 device_id 後簽到同步才會真正運作。另見遺留：`profiles` 對 authenticated 有表級 UPDATE，可繞過 RPC 直接改 `points`。
- 同步參數（amount／ts／device_id／source／action）由 `index.html` 早期 scrubber 在 GA4 讀網址前清掉；原始 query 留在 `window.__PASSPORT_INITIAL_SEARCH__` 供 App 讀取。
- 發現：`source` 自 2026-05-21（14d7b23）起被 scrubber 清掉，導致舊的 `handleIncomingPointsSync` 讀不到 `source`，Gacha 同步在本機 build 實測是失效狀態（正式站實際行為尚未驗證，未對正式站做任何測試）。本次修正會讓合法同步恢復運作，部署後請看 GA4 `points_sync_rejected` 的 reason 分佈，特別留意 `referrer`（LINE 內建瀏覽器可能不帶 referrer）；長期玩家的第一次同步會被截斷到 400 並視為完成。
- 未處理（需伺服器端重新設計）：`?unlock=` QR 解鎖碼、舊的 `?stamp=`、`?auto_unlock=true&mbti_type=`、外部任務（IG／LINE／Google 評論）的「我完成了」按鈕，以及本機積分本身，都仍是純前端信任。

## Snapshot · 2026-07-15

Status（當時快照）：`五站共用視覺語言已完成本機整合與瀏覽器驗證`；此公開 rail 已包含於10/06正式主線 `ad8d40f`。

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
