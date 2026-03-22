> 歷史規劃文件：本文部分描述建立於舊版護照 / quiz 流程，請勿直接當成目前 production 規格。

# 🎁 簽到遊戲系統 - Passport 護照

**狀態**: 規劃中  
**優先級**: P1 - 核心日活機制  
**預計週期**: 2 週開發 + 1 週測試

---

## 📋 概述

在 Dessert Passport（護照）系統中添加「每日簽到」遊戲化機制，與現有「運籤 + 集章」完美結合，增強日活躍度和用戶習慣養成。

---

## 🎯 目標

| 目標 | 說明 |
|------|------|
| 增加日活 | 每日回訪簽到 → 連簽獎勵 |
| 養成習慣 | 連簽 7/30/100 天里程碑 |
| O2O 轉化 | 線上簽到 + 到店驗證 + 集章 |
| 互補運籤 | 簽到日期確認 → 運籤加成倍率 |

---

## 🔄 與現有系統的整合

### 護照現有功能
```
✅ 測驗取得護照
✅ Fortune Slip 運籤（每日一次）
✅ 多種印章解鎖方式（密碼 / GPS / MBTI 自動）
✅ AR 圖像追蹤解鎖（開發中）
✅ 獎勵兌換系統
✅ GA4 追蹤
```

### 簽到系統新增
```
🆕 每日簽到記錄
🆕 連簽天數追蹤
🆕 簽到日曆視覺化
🆕 連簽里程碑獎勵
🆕 簽到加成運籤倍率
```

### 整合方案
```
簽到日期確認
    ↓
連簽天數 +1
    ↓
    ├─ 里程碑判定（7/30/100天）
    │  └─ 解鎖特殊印章 + 額外獎勵
    │
    └─ 運籤加成倍率計算
       ├─ 連簽 1-6 天: x 1 倍
       ├─ 連簽 7-29 天: x 1.2 倍
       ├─ 連簽 30-99 天: x 1.5 倍
       └─ 連簽 100+ 天: x 2 倍
```

---

## 🎨 UI 設計

### 簽到卡片位置（護照首頁）
```
護照首頁布局
├─ [護照基本信息] 已有
├─ [運籤卡片] 已有
│
├─ [新增] 簽到卡片 ← 位置在運籤下方
│  ├─ 「今日簽到」標題 + 日期
│  ├─ 連簽天數顯示（大字體）
│  │  └─ 🔥 12 天連簽
│  ├─ 進度條（向下一個里程碑）
│  │  └─ ▓▓▓▓▓░░░░░ 5/7 天到7天獎勵
│  ├─ 一鍵簽到按鈕
│  │  ├─ 已簽到: [✓ 今日已簽到]（置灰）
│  │  └─ 未簽到: [🎁 簽到獲得獎勵]（紅色）
│  └─ 簽到預告
│     └─ 7天達成 → 獲得⭐特殊印章
│
└─ [印章卡片] 已有
```

### 簽到日曆彈窗（點擊「簽到」後）
```
┌─────────────────────────┐
│ 簽到日曆         X       │
├─────────────────────────┤
│ 連續簽到: 12 天  🔥      │
│ 本月已簽: 18 次         │
│ 最長連簽: 28 天         │
├─────────────────────────┤
│ 本月日曆:               │
│ 一 二 三 四 五 六 日    │
│ □ □ ✓ ✓ ✓ ✓ □        │
│ ✓ ✓ ✓ ✓ ✓ ✓ □        │
│ ✓ ✓ ✓ ✓ ✓ □ □        │
├─────────────────────────┤
│ 里程碑獎勵:             │
│ ✓ 7 天  → ⭐特殊印章   │
│ ✓ 30 天 → ��雙倍獎勵  │
│ ○ 100 天 → 👑傳奇徽章  │
├─────────────────────────┤
│      [✨ 簽到 ✨]       │
│    明天 00:00 重置     │
└─────────────────────────┘
```

---

## 💾 數據結構

### LocalStorage 存儲（護照已用）
```javascript
// 簽到數據鍵
"passport_checkin" = {
  lastCheckInDate: "2026-02-19",      // ISO 日期
  consecutiveDays: 12,                 // 連簽天數
  longestStreak: 28,                   // 最長連簽
  totalCheckIns: 245,                  // 歷史簽到總數
  milestoneUnlocked: [7, 30],          // 已達成里程碑
  monthCheckIns: {
    "2026-02": [1,2,3,4,5,6,8,9,10,...], // 簽到的日期列表
  },
  bonusMultiplier: 1.2,                // 運籤加成倍率
  specialStamps: ["7day", "30day"]     // 獲得的特殊印章ID
}
```

### 印章關聯
```javascript
// 特殊印章定義
"stamps" = {
  "7day_checkin": {
    name: "⭐ 七日之星",
    description: "連簽 7 天達成",
    rarity: "uncommon",
    unlockCondition: { type: "checkin_streak", value: 7 }
  },
  "30day_checkin": {
    name: "💎 月度傳奇",
    description: "連簽 30 天達成",
    rarity: "rare",
    unlockCondition: { type: "checkin_streak", value: 30 }
  },
  "100day_checkin": {
    name: "👑 百日守護者",
    description: "連簽 100 天達成",
    rarity: "legendary",
    unlockCondition: { type: "checkin_streak", value: 100 }
  }
}
```

---

## 🔧 技術實現

### 核心邏輯
```typescript
// 檢查今日是否已簽到
function checkIfSignedToday(): boolean {
  const lastCheckIn = localStorage.getItem('passport_checkin')?.lastCheckInDate;
  const today = new Date().toISOString().split('T')[0];
  return lastCheckIn === today;
}

// 簽到邏輯
function handleCheckIn(): void {
  const today = new Date().toISOString().split('T')[0];
  const checkin = getCheckInData();
  
  // 計算連簽
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (checkin.lastCheckInDate === yesterday) {
    checkin.consecutiveDays++;
  } else {
    checkin.consecutiveDays = 1;
  }
  
  // 更新里程碑
  const milestones = [7, 30, 100];
  for (const m of milestones) {
    if (checkin.consecutiveDays === m && !checkin.milestoneUnlocked.includes(m)) {
      checkin.milestoneUnlocked.push(m);
      unlockSpecialStamp(m);
      showReward(m);
    }
  }
  
  // 計算運籤加成
  checkin.bonusMultiplier = calculateMultiplier(checkin.consecutiveDays);
  
  // 保存
  saveCheckInData(checkin);
}

// 運籤加成倍率
function calculateMultiplier(consecutiveDays: number): number {
  if (consecutiveDays >= 100) return 2.0;
  if (consecutiveDays >= 30) return 1.5;
  if (consecutiveDays >= 7) return 1.2;
  return 1.0;
}
```

### UI 元件
```
src/components/
├─ CheckinCard.tsx           // 簽到卡片主元件
├─ CheckinModal.tsx          // 簽到日曆彈窗
├─ CheckinCalendar.tsx       // 日曆視覺化
├─ MilestoneReward.tsx       // 里程碑獎勵提示
└─ CheckinStats.tsx          // 簽到統計
```

### 集成點（App.tsx）
```
1. 護照首頁添加 <CheckinCard /> 元件
2. 運籤倍率計算時讀取 bonusMultiplier
3. 頁面加載時檢查里程碑獲得提醒
```

---

## 📊 運籤加成計算

### 現有運籤系統
```
運籤(Fortune Slip) → 顯示運勢卡
- 基礎獎勵: NA（純娛樂）
- 每日限制: 1 次
- 存儲: 已集成到護照系統
```

### 新增加成邏輯
```
運籤倍率 = 簽到加成 × 其他加成

簽到加成:
- 連簽 1-6 天: x 1.0 倍（基礎）
- 連簽 7-29 天: x 1.2 倍（20% 加成）
- 連簽 30-99 天: x 1.5 倍（50% 加成）
- 連簽 100+ 天: x 2.0 倍（翻倍）

例:
連簽 12 天 → 運籤 x 1.2
└─ 運籤卡字體更大 20%
└─ 特殊動畫效果
└─ 加成徽章顯示「🔥 +20%」
```

### 修改 App.tsx 的運籤邏輯
```typescript
// 現有運籤邏輯
const fortuneResult = generateFortune();

// 新增加成
const checkinMultiplier = calculateCheckInMultiplier();
const boostedFortune = {
  ...fortuneResult,
  multiplier: checkinMultiplier,
  visualEffect: 'boosted' // 加成動畫
};
```

---

## 🎁 里程碑獎勵設計

### 獎勵層級
```
7 天連簽
├─ 解鎖: ⭐ 七日之星 特殊印章
├─ 特殊效果: 護照背景閃爍 7 秒
└─ 通知: 「恭喜達成 7 天連簽！」+ 收集卡

30 天連簽
├─ 解鎖: 💎 月度傳奇 特殊印章
├─ 特殊效果: 運籤加成 x1.5（當月）
├─ 護照徽章: 紫金色框線
└─ 通知: 「恭喜達成 30 天連簽！」+ 音效

100 天連簽
├─ 解鎖: 👑 百日守護者 傳奇印章（最高稀有度）
├─ 特殊效果: 運籤固定 x2.0 倍
├─ 護照徽章: 金色框線 + 光環
├─ 獎勵頁面: 特殊致敬頁面
└─ 通知: 「傳奇達成！」+ 煙火動畫
```

### 獎勵如何兌現
```
里程碑獲得
    ↓
存儲到 specialStamps 陣列
    ↓
護照印章頁面自動顯示
    ↓
可用於視覺化展示（護照外觀）
```

---

## 📈 GA4 追蹤

### 新增事件
```
event_name: "checkin"
parameters:
  - consecutive_days: 12
  - milestone_achieved: 7 (如果達成)
  - bonus_multiplier: 1.2

event_name: "milestone_reached"
parameters:
  - milestone: 7 / 30 / 100
  - date: timestamp
```

### 追蹤位置
```typescript
// 簽到成功時
gtag('event', 'checkin', {
  'consecutive_days': checkin.consecutiveDays,
  'milestone_achieved': checkin.milestoneUnlocked.length > 0 ? checkin.milestoneUnlocked[checkin.milestoneUnlocked.length - 1] : null,
  'bonus_multiplier': checkin.bonusMultiplier
});
```

---

## 🔄 實施時間表

### Week 1: 核心功能開發
- [ ] Day 1-2: 數據結構設計 + LocalStorage 邏輯
- [ ] Day 3-4: UI 元件開發（卡片 + 日曆 + 按鈕）
- [ ] Day 5: 里程碑邏輯 + 獎勵系統
- [ ] Day 6-7: 運籤加成集成 + 基礎測試

### Week 2: 優化 + 測試
- [ ] Day 1-2: 性能優化 + 動畫調整
- [ ] Day 3-4: GA4 事件埋點
- [ ] Day 5: 全流程測試
- [ ] Day 6-7: Bug 修復 + 文檔

### Week 3: 上線準備（可選）
- [ ] 部署前檢查
- [ ] Vercel 測試環境驗證
- [ ] 正式上線

---

## ✅ 檢查清單

### 開發完成
- [ ] CheckinCard 元件完成
- [ ] CheckinModal 日曆完成
- [ ] LocalStorage 邏輯完成
- [ ] 里程碑判定邏輯完成
- [ ] 運籤加成倍率計算完成
- [ ] 特殊印章解鎖完成

### UI/UX
- [ ] 簽到卡片樣式完成
- [ ] 日曆視覺化完成
- [ ] 里程碑獎勵動畫完成
- [ ] 運籤加成動畫完成
- [ ] 響應式設計測試

### 測試
- [ ] 簽到邏輯單元測試
- [ ] 連簽計算測試
- [ ] 里程碑觸發測試
- [ ] 加成倍率計算測試
- [ ] 跨裝置測試（手機 / 平板）
- [ ] LocalStorage 持久化測試

### 上線
- [ ] GA4 事件驗證
- [ ] Vercel 部署
- [ ] QA 最終驗證
- [ ] 文檔更新

---

## 🚀 下一步

1. **確認設計** - 簽到卡片位置和樣式
2. **開始開發** - 從數據結構開始
3. **整合運籤** - 連接現有運籤系統
4. **測試上線** - 逐步推廣

---

**由 Penso 團隊編寫**  
**最後更新：2026-02-19**
