# Passport 會員中心收斂：設計與回歸檢核

- 日期：2026-10-06
- 比較基準：main `0646b77`，沿用 Penso 已選定的 Gacha 第 1 稿深綠、奶油白與柔金。
- 分支：`codex/passport-green-simplify-20261006`
- 預覽：http://127.0.0.1:5225/?screen=passport&tab=hub
- **Final result: passed（本機視覺與已測導覽範圍）**
- 狀態：此10/06深綠版已經由 PR39／40 合併並正式部署。最終 `origin/main` `ad8d40f5b78a6449ba0d6347bdf8f0bdb1cd0000`，Production `dpl_E7LqNMi4Gwic8uN46dKLp69CjYti` READY，alias `passport.kiwimu.com`。10/07公開文字與CTA修補為獨立未發布分支。
- 部署證據：10/07接手審查 `/Users/pensoair/.codex/visualizations/2026/10/07/kiwimu-green-review/passport-review.md`；本文件下方為當時本機驗證，不把它當真人正式流程簽收。

## 2026-10-07 公開文字與手機 CTA 修補（未發布）

- 分支 `codex/passport-public-copy-repair-20261007`，base `origin/main ad8d40f`；手機 landing CTA 使用內容寬，原52px高度與角色圖片配置保留。
- 登入、徽章、同步與訂單失敗改成顧客可理解的狀態與下一步。未知欄位不直出代碼；callback／session／provider原始診斷保留在console，SSO broker error契約保留。
- 積分來源沿用remote或local fallback，顯示為「積分紀錄／此裝置積分」，不把探索紀錄當作已確認會員兌換餘額；獎勵只提供說明，未掛載RewardShop。
- 作者機械驗證：`tsc --noEmit` exit0、`npm run build` exit0，含既有OAuth／SSO／SW／reward ledger／points guard／debug-backdoor、32 journey與5 hydration斷言；53項actual-source VM檢查通過。`git diff --check`通過。
- 本機loopback `http://127.0.0.1:5235/`回應200；沒有複製env。主對話CUA已測四种寬度landing／訪客hub，CTA187px寬、52px高、無溢出；reviewer設計40個actual-source／AST檢核由主對話執行通過。審查員額度受限，最終patch尚未獨立簽收。
- 證據：`/Users/pensoair/.codex/visualizations/2026/10/07/kiwimu-public-copy-repair/passport/`；未merge/deploy；真人auth／設定保存／訂單／點數／印章／核銷／DB與環境設定未變更。送審Git與hash以同日SSOT及final-manifest回讀為準。

## 收斂結果

首頁只保留下一步、會員卡、集章與已購報告的清楚入口。訂單預設收合，帳號、隱私與探索紀錄放入設定；主導覽縮為「會員首頁／我的集章」。獎勵說明由次要入口與既有深連結開啟，移除純本機的自行標記領取操作。

沿用真實 Kiwimu WebP 素材，配合紙色卡片、安靜分隔線與金色主要按鈕。手機會員卡縮短，集章進度和線上／到店情境合併，並修正窄螢幕標題換行。同步狀態常駐摘要；同步失敗完整訊息顯示於收合設定之外。

## 作者瀏覽器檢核

使用 Codex in-app browser 的實際 DOM 與截圖；尺寸模擬不等同 iPhone／Safari 實機簽收。

| 會員首頁寬度 | 橫向溢出 | 可見破圖 | 最小主要區控制高度 | 主要按鈕高度 |
| --- | --- | --- | --- | --- |
| 320px | 0 | 0 | 44px | 52px |
| 390px | 0 | 0 | 44px | 52px |
| 768px | 0 | 0 | 44px | 52px |
| 1280px | 0 | 0 | 44px | 52px |

- 首頁 → 會員中心 → 集章 → 線上／到店切換 → 返回會員首頁：通過。
- 訂單與設定可用點擊／Enter 開關，預設收合；沒有提交設定。
- 獎勵說明入口與返回首頁正常，沒有自行領取操作。
- 報告入口保留原 library URL 與來源參數；沒有另建報告或付款。
- viewport 允許使用者縮放；focus、reduced-motion 樣式保留。
- 測試分頁 console error 0。仍有本機 GA4 未初始化及 LIFF ID 未設定警告，沒有因此宣稱追蹤或 LINE 流程完成。

截圖／尺寸數據：`/tmp/kiwimu-passport-green-20261006/qa/`。

- `home-1280-final.jpg`、`home-390-final.jpg`、`home-320-final.jpg`、`home-768-final.jpg`
- `landing-mobile390.jpg`、`journey-online-mobile390-final.jpg`、`journey-store-mobile390-final.jpg`
- `orders-guest-mobile390.jpg`、`settings-mobile390-open.jpg`、`rewards-mobile390.jpg`
- `viewport-results.json`

## 程式與獨立覆核

- `npx tsc --noEmit`：通過。
- `npm run build`：通過，含既有 OAuth／SSO／service worker／reward ledger／points guard／debug backdoor 回歸。
- 32 項 member journey 斷言與 5 項實際 MemberHub hydration 斷言：通過。
- Fresh-context 獨立 code／mocked behavior review：APPROVE，40 checks 通過；含登入 busy、訂單 retry／帳號隔離、設定持續掛載、同步失敗可見、登出失敗保留帳號及 rewards 深連結。
- `git diff --check`：通過。

獨立報告與可重跑腳本位於上述 private QA 目錄；獨立覆核是程式／mock 行為範圍，沒有冒充獨立視覺或真人操作簽收。

## 限制與後續

本輪未操作真實 Google 登入、定位、打卡、會員資料保存、點數、印章、核銷或 DB migration。Safari／iPhone 實機、真人會員及實體獎勵尚待驗收；既有 server authority、LINE 設定、店員憑證輪替與評論替代章政策不因視覺升級完成。

10/06正式PWA與公開版面已由10/07接手審查核對；真人正式登入／帳號同步與訂單狀態仍待驗收。本輪10/07修補尚未發布，驗證紀錄見 CURRENT 置頂。回滾可撤回此分支的視覺提交，不涉及資料庫回滾。
