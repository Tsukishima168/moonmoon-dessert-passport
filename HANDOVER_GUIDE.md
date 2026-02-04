# 📋 MoonMoon Dessert Passport 專案交接與開發指南

本文件旨在協助後續開發團隊（或 AI 工程師）快速理解專案現狀、架構邏輯，並明確指出下一步「深度串接」的需求與方向。

---

## 1. 專案概況 (Project Overview)

- **專案名稱**: MoonMoon Dessert Passport (月島登島護照)
- **專案類型**: Mobile-first Web Application (SPA)
- **核心目標**: 結合心理測驗與 O2O (Online to Offline) 集章機制，引導顧客從線上互動轉化為線下消費。
- **目前狀態**: **MVP (Minimum Viable Product) 已完成**，前端功能完整，可獨立運作並部署。

---

## 2. 技術架構 (Technical Architecture)

- **前端框架**: React 18 + Vite
- **樣式系統**: Tailwind CSS (使用自定義 Design Tokens: `brand-lime`, `brand-black` 等) + Lucide Icons
- **狀態管理**: 
  - **核心數據**: `PassportScreen.tsx` 透過 `passportUtils.ts` 管理。
  - **持久化**: 使用瀏覽器 `localStorage` 存儲集章進度與兌換狀態（無後端資料庫）。
- **數據追蹤**: Google Analytics 4 (自製封裝 `analytics.ts`)。
- **部署平台**: Vercel (靜態網站託管)。

---

## 3. 功能完成度詳解 (Feature Completion Status)

目前前端互動邏輯已 **100% 完成**，所有功能皆可於客戶端正常運作。

| 模組 | 功能細項 | 狀態 | 實作細節 |
|:---:|:---|:---:|:---|
| **首頁 (Landing)** | 視差滾動與互動 | ✅ 完成 | 支援桌機滑鼠視差與手機滑動互動。 |
| | 開場問句輪播 | ✅ 完成 | 每次進入隨機顯示不同問候語。 |
| | 彩蛋機制 | ✅ 完成 | 點擊標籤觸發隱藏故事 (`Moon Moon`) 與冷知識 (`Dessert`)。 |
| **測驗系統 (Quiz)** | 心理測驗流程 | ✅ 完成 | 三大區域 (Zone 1-3)，動態渲染題目。 |
| | 演算法 | ✅ 完成 | 基於四象限 (經典/深色/亮色/果香) 計算最高分屬性。 |
| | 結果頁生成 | ✅ 完成 | 根據結果產生對應甜點 (Soul Food) 與角色貼紙 (Sticker)。 |
| **護照系統 (Passport)** | 集章卡片 | ✅ 完成 | 支援點擊互動、狀態顯示、動畫效果。 |
| | **外部跳轉確認** | ✅ 完成 | **(重點)** 針對 IG/LINE/Google 評論實作「先打勾、後跳轉」機制，解決跳轉後狀態丟失問題。 |
| | 密碼解鎖 | ✅ 完成 | 用於 MBTI 與 Google 評論的隱藏通關碼機制。 |
| | 階級獎勵 (Rewards) | ✅ 完成 | 根據集章數自動解鎖對應獎勵 (3/5/7/10 章)。 |
| **其他** | 數據埋點 | ✅ 完成 | 完整 GA4 事件追蹤 (`stamp_unlocked`, `result_viewed` 等)。 |

---

## 4. 待開發項目：深度串接與後端整合 (Next Steps)

此部分為**下一階段開發重點**，請後續工程師特別關注。

### 🚧 1. LINE 深度串接 (Priority: High)
目前僅使用 `https://lin.ee/...` 網址跳轉，屬於淺層整合。為了達成更好的用戶黏著度，建議進行以下升級：

- **目標**: 獲取用戶真實身分 (User ID)，實現跨裝置同步。
- **建議技術**: **LIFF (LINE Front-end Framework)**
  - 在 App 載入時初始化 LIFF (`liff.init()`)。
  - 自動獲取用戶 `userId` 與 `displayName`。
  - **應用場景**: 
    - 用戶換手機時，護照進度不丟失。
    - 點擊「加入好友」印章時，可透過 API 直接確認是否已加入（需配合 Messaging API）。

### 🚧 2. 後端資料庫整合 (Priority: Medium)
目前使用 `localStorage`，若用戶清除快取或使用無痕模式，進度將會歸零。

- **目標**: 數據雲端化。
- **建議技術**: **Supabase** 或 **Firebase**。
- **實作邏輯**:
  - 建立 `users` 資料表 (Primary Key: LINE User ID)。
  - 建立 `passport_progress` 資料表，存儲 `unlockedStamps` 陣列。
  - 修改 `passportUtils.ts`：從讀寫 `localStorage` 改為優先讀寫 API，並以 `localStorage` 作為離線備案。

### 🚧 3. 獎勵兌換核銷機制 (Priority: Medium)
目前 10 枚印章的終極獎勵是跳轉到 LINE@ 讓小編人工確認。

- **目標**: 自動化核銷 coupon。
- **實作建議**:
  - 在資料庫記錄 `redeemed_rewards`。
  - 店員端介面或掃碼核銷功能（需開發 Admin 後台）。

---

## 5. 關鍵檔案索引 (Key Files)

交接時請優先查看以下檔案：

- **`App.tsx`**: 應用程式主入口，包含路由切換 (Landing -> Quiz -> Result) 與主邏輯。
- **`PassportScreen.tsx`**: 護照介面核心，包含集章邏輯與**外部跳轉的兩步驟確認機制**。
- **`constants.tsx`**: 所有靜態資料设定檔（題目、甜點資料、連結 URL、獎勵規則）。
- **`passportUtils.ts`**: 負責數據存取的工具函式 (Layer of abstraction for data storage)。
- **`analytics.ts`**: GA4 追蹤碼封裝。

---

## 6. 給 AI 工程師的 Prompt 建議

若要請下一位 AI 工程師繼承工作，可以使用以下 Prompt：

> 「請接手 MoonMoon Dessert Passport 專案。目前前端互動 MVP 已完成（包含 Landing、Quiz、Passport 及其 LocalStorage 存儲）。
> 
> 請參閱 `HANDOVER_GUIDE.md`。你的主要任務是進行 **LINE LIFF 的深度串接**。
> 1. 請評估如何引入 LIFF SDK。
> 2. 將目前的 LocalStorage 機制升級為雲端同步（建議使用 Supabase 配合 LINE User ID）。
> 3. 保持現有的 UI/UX 不變。」
