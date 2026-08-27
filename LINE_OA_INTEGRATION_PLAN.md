# LINE@ 整合計畫 — 明天執行版

> 建立：2026-08-25 · 狀態：待執行
> 範圍：只做「第一層」= LINE 官方帳號後台設定。不含綁定驗證、不含季節章、不含 PR #29。
> 費用：**0 元**（全部走免費的後台設定與回覆訊息）

---

## 先回答兩個問題

### Q1：圖文選單已經有了嗎？

**沒有。** 後台 `圖文選單` 頁面目前顯示「未顯示選單」「尚無可顯示的項目」。要從零建一張。

### Q2：需要內嵌進 LINE@ 裡面嗎？

**需要，而且「內嵌」不是額外工程 —— 是連結網址選對而已。**

| 連結寫法 | 結果 |
|---|---|
| `https://passport.kiwimu.com` | 跳出去開外部瀏覽器，LINE 身分斷掉，要重新登入 |
| `https://liff.line.me/2009156462-vCIZAcQt` | **在 LINE 內全螢幕開啟**，自帶 LINE 身分 |

**規則：所有指向護照的連結，一律用 LIFF URL。** 這是整份計畫最關鍵的一個決定。

外部站（map / gacha）用一般網址即可，那些本來就不需要 LINE 身分。

---

## 明天的三件事

### ① 連結官方帳號到 LIFF channel — ✅ 已完成 2026-08-26

`Linked LINE Official Account = @931cxefd/Moon_Moon月島甜點`
（重新載入頁面確認已持久化）

`liff.getFriendship()` 的前置條件已滿足，等 passport 部署後即可運作。

> 已確認：六個 LIFF app 沒有任何一個設為 `aggressive`，連結後不會有強迫加好友的彈窗。

---

### ② 加入好友的歡迎訊息（5 分鐘）

**位置**：LINE 官方帳號後台 → 聊天室相關 → 加入好友的歡迎訊息
**費用**：0 元（屬於回覆訊息，不計入 200 則額度）

文案草稿（可直接貼，語氣自行微調）：

```
歡迎來到月島。

我是 Kiwimu，這座島的甜點嚮導。
這裡會告訴你新品、取貨資訊，還有島上的集章活動。

先領一本你的甜點護照吧——
到店集章、換限定小禮，都從這裡開始。

▼ 開啟我的護照
https://liff.line.me/2009156462-vCIZAcQt
```

備註：
- 護照的印章系統刻意不用 emoji，歡迎訊息建議保持一致
- 這則訊息是新好友的第一印象，也是綁定入口，值得多改幾版

---

### ③ 圖文選單（15 分鐘 + 出圖時間）

**位置**：LINE 官方帳號後台 → 圖文選單 → 建立
**費用**：0 元 · **效果**：常駐在聊天室下方，不用顧客記網址

建議 6 格（大版型，2×3）：

| 格 | 標題 | 連結 |
|---|---|---|
| 1 | 我的護照 | `https://liff.line.me/2009156462-vCIZAcQt` |
| 2 | 集章進度 | `https://liff.line.me/2009156462-vCIZAcQt` |
| 3 | 兌換獎勵 | `https://liff.line.me/2009156462-vCIZAcQt` |
| 4 | 訂購菜單 | `https://map.kiwimu.com/menu` |
| 5 | 月島地圖 | `https://map.kiwimu.com` |
| 6 | 月島扭蛋 | `https://gacha.kiwimu.com` |

**為什麼 1–3 格連結相同**：護照目前只有 `/` 一個顧客入口（`/passport/:id`、`/join/:id` 是分享與邀請用，`/redeem` 是**店員核銷專用、絕對不能放進顧客選單**）。分頁切換在 App 內部處理，沒有對應網址。

> 之後若要一鍵直達某個分頁，需要在 App 加 query param 支援（例如 `?tab=journey`），再改成
> `https://liff.line.me/2009156462-vCIZAcQt?tab=journey`。
> LIFF URL 確實支援附加路徑與參數（官方文件確認），這是程式碼端的小工作，等第一版上線後再做。

**圖片規格**：以後台建立頁面顯示的尺寸為準（選版型時會標示）。官方文件範例常見 2500×1686（大）與 2500×843（小），JPEG／PNG。

---

## 素材現況

**現成可用**
- Kiwimu 英文 logo：Cloudinary `Kiwimu-English_syrudw.png`
- 中文 logo：`map-kiwimu-com/public/assets/logo-chinese.png`
- 角色主視覺：`Enter-05_nrt403.webp`（護照 landing 用的那張）
- 四款角色貼紙：yellow / blue / green / pink kiwimu（Cloudinary）
- 月島背景：`map-kiwimu-com/public/assets/moon-island-bg.png`

**缺**
- 圖文選單底圖本身（要重新排版成 6 格，含每格的圖示與文字）

各 repo 的 `public/` 目前只有 favicon / PWA icon，沒有可直接拿來當選單底圖的素材。

---

## 明天我負責的部分

第一層做完（或同時進行）我可以接手：

1. 把 `VITE_LIFF_ID=2009156462-vCIZAcQt` 設進 passport 的 Vercel production
   —— 目前沒帶這個變數，LIFF 在線上是完全關閉的
2. 清掉 `src/contexts/LiffContext.tsx` 的 `mock_liff_id` 後門
   —— 網址帶參數就能偽造 LIFF 登入身分，不該進 production
3. `LiffContext` 補 `getFriendship()` / `getIDToken()` 兩個方法

第 1 項做完，圖文選單點進去的護照才會真的認得 LINE 身分。

---

## 已確認的環境事實（免得明天重查）

| 項目 | 值 |
|---|---|
| OA | Moon_Moon月島甜點 · `@kiwimu` · 內部 ID `@931cxefd` |
| 方案 | 輕用量 · NT$0/月 · 免費訊息 200 則/月 · **不可加購** |
| 好友 | 868（可觸及 867、封鎖 83） |
| Provider | MoonMoonbake（`2003562945`） |
| Messaging API channel | Moon_Moon月島甜點（`2005763022`） |
| LINE Login channel | moonmoon-liff（`2009156462`） |
| Passport LIFF ID | `2009156462-vCIZAcQt` |
| Passport LIFF endpoint | `https://passport.kiwimu.com` · scopes `openid, profile` |
| Linked OA | **未設定 ← 明天第 ① 步** |

**計費規則**：回覆訊息（歡迎訊息、自動回覆）不計入額度；push／multicast／broadcast／narrowcast 按觸及人數計費。867 個好友群發一次 = 867 則，輕用量發不出去。

---

## 明確不做（避免範圍擴散）

- ❌ LINE 原生「集點卡」—— 封閉系統，資料出不來，會和護照的章變成兩套矛盾點數
- ❌ 全體群發 —— 輕用量額度不足，且沒有內容策略前不該推
- ❌ 綁定驗證（Edge Function / migration）—— 第三層，等第一層有數據再決定
- ❌ 季節章系統 —— 第四層
