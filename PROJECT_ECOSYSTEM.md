# 🌍 月島甜點生態系統 - 完整項目清單

**整理日期**: 2026年2月18日  
**統一系統核心**: PsycheWorld Integration Hub

---

## 📦 **已開發/可使用的項目 (5個)**

### **1️⃣ moonmoon-dessert-passport** ✅ 🎯 (當前)
- **路徑**: `/Users/penstudio/Desktop/moonmoon-dessert-passport`
- **大小**: 25M
- **技術棧**: React 19 + TypeScript + Vite + Tailwind + LIFF
- **功能**:
  - 🎫 集章護照系統 (Passport stamps)
  - 🎁 集章解鎖獎勵
  - 📊 GA4 分析追蹤
  - 📱 LINE LIFF 整合 (✅ 已完成)
  
- **進度**: 
  - LIFF 初始化: ✅ 完成
  - Supabase 集成: ⏳ 進行中 (Day 8-14)
  - 部署: ⏸️ 待細節完成

- **核心數據**:
  - 用戶護照進度
  - 集章記錄
  - 獎勵兌換

---

### **2️⃣ moonmoon-gacha** ✅ 
- **路徑**: `/Users/penstudio/Desktop/moonmoon-gacha`
- **大小**: 130M
- **技術棧**: React 19 + TypeScript + Vite + Framer Motion
- **功能**:
  - 🎰 抽卡/Gacha 遊戲機制
  - 🎨 動畫視效 (Framer Motion)
  - 📊 GA4 分析
  - 🎁 獎勵發放

- **進度**: ✅ 功能完整
- **整合狀態**: 待連接 Supabase + Passport 集章系統

---

### **3️⃣ color-of-kiwimu-mbti-lab-v5** ✅ 
- **路徑**: `/Users/penstudio/Desktop/color-of-kiwimu-mbti-lab-v5`
- **大小**: 55M
- **技術棧**: React + TypeScript + Vite + Supabase + Discord.js + Firebase
- **功能**:
  - 🧠 MBTI 性格測驗
  - 🎯 個性化推薦甜點
  - 🤖 Discord 自動角色分配
  - 📊 Google Sheets 資料蒐集
  - 🔥 Firebase + Supabase 雙端整合

- **進度**: ✅ 高度完成
- **整合狀態**: Discord Bot 完整，Supabase 可用
- **數據輸出**:
  - MBTI 類型 (e.g., INTJ-A)
  - 推薦甜點
  - 用戶資檔

---

### **4️⃣ moon_map_original** ✅ 
- **路徑**: `/Users/penstudio/Desktop/moon_map_original`
- **大小**: 63M
- **技術棧**: Vite + Sanity CMS + Supabase + GA4
- **功能**:
  - 🗺️ 品牌導覽地圖
  - 📍 GPS 定位任務
  - 🎯 OMO 活動入口
  - 📸 Sanity CMS 內容管理
  - 🖼️ Supabase 圖床整合

- **進度**: ✅ 功能完整
- **整合狀態**: Sanity CMS + Supabase 已連接
- **關鍵功能**:
  - 位置驗證 (GPS 任務)
  - 內容分類隱藏
  - GA4 SEO 轉換追蹤

---

### **5️⃣ penso-good-blog** ✅ 
- **路徑**: `/Users/penstudio/Desktop/penso-good-blog`
- **大小**: 1.5M
- **功能**:
  - 📝 部落格/文檔管理
  - 📱 響應式主題
  - 🎨 多主題支持

- **進度**: ✅ 完成
- **用途**: 品牌內容、教學文檔、公告

---

## 🔧 **未開發/規劃中 (1個)**

### **PsycheWorld-Integration-Hub** 🚧
- **路徑**: `/Users/penstudio/Desktop/PsycheWorld-Integration-Hub`
- **大小**: 92K (輕量級協調倉庫)
- **目的**:
  - 🎯 統一的整合控制平面
  - 📋 跨項目契約管理
  - 📊 KPI 和遊戲化指標
  - 📅 120 天交付路線圖
  - ✅ 補助計畫書檢查清單

- **管理範圍**:
  1. Dessert-Booking (預訂系統)
  2. color-of-kiwimu-mbti-lab-v5 (MBTI 測驗)
  3. moon_map_original (品牌地圖)
  4. moonmoon-dessert-passport (護照集章)

- **核心文檔**:
  - `DATA_CONTRACTS.md`: 共享事件、參數規範
  - `REPO_INVENTORY.md`: 各項目責任邊界
  - `WORKSTREAMS_RACI.md`: 團隊分工模型
  - `GAMIFICATION_KPI.md`: 遊戲化指標
  - `ROADMAP_120D.md`: 120天交付計畫
  - `SUBSIDY_PACKAGE_CHECKLIST.md`: 補助計畫書清單
  - `MVP_TEST_*`: MVP 測試執行手冊

---

## 📡 **工具/通知系統 (1個)**

### **telegram-notify** 🤖
- **路徑**: `/Users/penstudio/Desktop/telegram-notify`
- **大小**: 12K
- **技術**: Python + Telegram Bot API
- **功能**:
  - 📤 發送報告和通知到 Telegram
  - 🎧 監聽 Telegram 指令
  - 📊 數據報表自動發送
  - ⚙️ 遠程命令執行

- **使用方式**:
  ```bash
  # 發送訊息
  python3 ~/Desktop/telegram-notify/notify-telegram.py "訊息內容"
  
  # 啟動監聽器
  python3 ~/Desktop/telegram-notify/telegram-bot-listener.py
  ```

---

## 🔗 **跨項目整合架構**

```
┌─────────────────────────────────────────────────────────┐
│      PsycheWorld Integration Hub (統一控制平面)         │
│  - DATA_CONTRACTS.md (共享參數、事件、資料結構)         │
│  - GAMIFICATION_KPI.md (集章、獎勵、任務規則)          │
│  - ROADMAP_120D.md (41天計畫)                           │
│  - MVP_TEST_CASES.md (測試用例)                        │
└─────────────────────────────────────────────────────────┘
         ↓↓↓ 契約實現 ↓↓↓
┌─────────┬──────────────┬──────────────┬──────────────┐
│         │              │              │              │
▼         ▼              ▼              ▼              ▼
MBTI   Passport    Gacha System    Brand Map    Booking
Lab      集章        抽卡機制        導覽/任務     訂單
│         │              │              │              │
└─────────┴──────────────┴──────────────┴──────────────┘
         ↓↓↓ 統一數據層 ↓↓↓
┌─────────────────────────────────────────────────────────┐
│              Supabase (共享資料庫)                       │
│  - users (用戶基本資訊)                                 │
│  - user_profiles (MBTI 類型、推薦)                     │
│  - passport_stamps (集章進度)                          │
│  - mission_claims (任務完成記錄)                       │
│  - rewards_ledger (獎勵兌換)                           │
│  - orders (訂單記錄)                                   │
│  - ga4_events (分析事件)                               │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 **共享數據流向**

### **核心事件** (定義於 DATA_CONTRACTS.md)
```
login_success → MBTI 測驗 → mission_complete 
    ↓             ↓              ↓
  用戶ID    MBTI 類型         集章記錄
    ↓             ↓              ↓
stamp_claim → 獎勵兌換 → order_redirect → 訂單完成
```

### **共享查詢參數**
```
?mbti=INTJ-A
&from=mbti-lab|passport|game|map
&utm_source=LINE@
&utm_medium=liff
&utm_campaign=moonmoon-launch
&utm_content=passport
```

---

## 🎯 **護照統一系統的實現方式**

根據 PsycheWorld 文檔，**護照系統跨項目整合**的規則：

### **1. 單一 Supabase 共享 DB**
- 所有項目讀寫同一個 `passport_stamps` 表
- 通過 Row Level Security (RLS) 隔離用戶數據

### **2. 事件驅動**
- 任何項目完成任務 → 發出 `stamp_claim` 事件
- Passport 監聽並更新進度

### **3. 共享契約**
- 集章 ID 格式: `stamp_{project}_{mission_id}`
- 例如: `stamp_mbti_color_analysis`, `stamp_map_gps_mission`, `stamp_gacha_pull_reward`

### **4. 用戶聯動**
```
用戶 ID (從 LIFF) 
  ↓
user_profiles (存 MBTI + 推薦)
  ↓
passport_stamps (集章進度，跨所有項目)
  ↓
rewards_ledger (獎勵兌換)
  ↓
Booking (最終轉化 → 訂單)
```

---

## 📅 **41 天計畫時程表**

| 週 | 日期 | 任務 | 狀態 |
|---|------|------|------|
| 第1週 | 2/17-2/23 | LIFF 初始化 | ✅ 完成 |
| 第2週 | 2/24-3/2 | Supabase 連接 | ⏳ Day 8-14 |
| 第3週 | 3/3-3/9 | n8n 自動化 | 🔲 Day 15-21 |
| 第4週 | 3/10-3/16 | 數據蒐集 + 測試 | 🔲 Day 22-28 |
| 第5週 | 3/17-3/31 | 補助計畫書 | 🔲 Day 29-41 |

---

## 🚀 **下一步行動**

### **立即 (Day 8-14: Supabase 連接)**

1. **確認 Supabase Schema**
   - `users` (LIFF ID, 名稱)
   - `user_profiles` (MBTI, 推薦)
   - `passport_stamps` (集章進度，支持跨項目)
   - `mission_claims` (任務記錄)
   - `rewards_ledger` (兌換記錄)

2. **各項目集成優先順序**
   - Passport (集章)
   - MBTI Lab (推薦記錄)
   - Gacha (抽卡記錄)
   - Map (任務完成)
   - Booking (訂單)

### **後續 (Day 15-21: n8n 自動化)**
- Webhook 監聽 `stamp_claim` 事件
- LINE 推播通知用戶
- Google Sheet 自動記錄

### **測試階段 (Day 22-28)**
- 邀請 LINE@ 熟客
- 透過優惠券進行測試
- 蒐集數據驗證流程

### **補助計畫書 (Day 29-41)**
- 整理遊戲化指標
- 撰寫成果報告
- 3/31 前投稿

---

## 📞 **通知和監控**

使用 `telegram-notify` 工具實時通知：
```bash
# 測試進度報告
python3 ~/Desktop/telegram-notify/notify-telegram.py "✅ Day 8 Supabase 集成完成"

# 啟動監聽器接收指令
python3 ~/Desktop/telegram-notify/telegram-bot-listener.py
```

---

**生態系統完整性**: ⭐⭐⭐⭐⭐ (5/5)  
**整合就緒度**: ⭐⭐⭐⭐ (4/5) - 待 Supabase 完全連接
