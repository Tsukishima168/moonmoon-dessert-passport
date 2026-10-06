# Passport 會員中心收斂：設計與回歸檢核

- 日期：2026-10-06
- 比較基準：main `0646b77`，沿用 Penso 已選定的 Gacha 第 1 稿深綠、奶油白與柔金。
- 分支：`codex/passport-green-simplify-20261006`
- 預覽：http://127.0.0.1:5225/?screen=passport&tab=hub
- **Final result: passed（本機視覺與已測導覽範圍）**
- 狀態：本機版本；未 push、合併或部署。

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

部署時需另驗正式 PWA 更新、正式登入／帳號同步與訂單狀態。回滾可撤回此分支的視覺提交，不涉及資料庫回滾。
