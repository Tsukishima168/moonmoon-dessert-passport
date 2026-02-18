# 🎫 Passport + Supabase 集成計劃 (Day 8-14)

## 📋 現狀分析

### 當前架構
- **存儲**: 純 localStorage (passportUtils.ts)
- **數據結構**: 
  - `unlockedStamps`: 集章 ID 列表
  - `unlockedAchievements`: 成就 ID 列表
  - `redeemedRewards`: 已兌換獎勵
  - `createdAt`, `lastUpdatedAt`: 時間戳

- **已有 Supabase 連接**: 
  - `src/api/points.ts` - 讀取 profiles.points
  - `mbtiClaim.ts` - 消費 MBTI 兌換碼
  
### 限制
- ❌ 多設備無法同步
- ❌ 無法跨項目集章
- ❌ 無法追蹤集章歷史
- ❌ 無法驗證集章來源

---

## 🛠️ Supabase Schema 設計

### 1️⃣ **表結構** (需要在 Supabase 建立)

#### `passport_users`
```sql
CREATE TABLE passport_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `passport_stamps`
```sql
CREATE TABLE passport_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  stamp_id TEXT NOT NULL,           -- e.g., 'booking_completed'
  source_project TEXT,               -- 'passport', 'mbti', 'gacha', 'map', 'booking'
  unlocked_at TIMESTAMP DEFAULT now(),
  claim_data JSONB,                  -- 額外信息 (e.g., mission_id, reward_id)
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, stamp_id)
);
```

#### `passport_achievements`
```sql
CREATE TABLE passport_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
```

#### `passport_rewards`
```sql
CREATE TABLE passport_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  redeemed_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, reward_id)
);
```

#### `passport_migration_log` (用於本地→雲端遷移)
```sql
CREATE TABLE passport_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES passport_users(id) ON DELETE CASCADE,
  action TEXT,                       -- 'migration_from_localstorage', 'sync', 'manual_claim'
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

### 2️⃣ **行級安全 (RLS)** - 保護隱私

```sql
-- 用戶只能看到自己的數據
ALTER TABLE passport_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own data" 
  ON passport_users FOR SELECT 
  USING (auth.uid()::text = line_user_id);

ALTER TABLE passport_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own stamps" 
  ON passport_stamps FOR SELECT 
  USING (user_id IN (
    SELECT id FROM passport_users 
    WHERE auth.uid()::text = line_user_id
  ));

-- 類似的 INSERT/UPDATE 策略...
```

---

## 🔄 API 端點設計 (src/api/passport.ts)

### 新建文件: `src/api/passport.ts`

```typescript
// 1. 初始化用戶 (在 LIFF 登入時調用)
export async function initPassportUser(lineUserId: string, displayName: string, pictureUrl?: string)

// 2. 取得集章進度
export async function getPassportProgress(lineUserId: string): Promise<{
  stamps: Stamp[],
  achievements: Achievement[],
  rewards: string[]
}>

// 3. 解鎖集章
export async function unlockStamp(
  lineUserId: string,
  stampId: string,
  sourceProject: string,
  claimData?: Record<string, any>
): Promise<{ newAchievements: string[] }>

// 4. 兌換獎勵
export async function redeemReward(lineUserId: string, rewardId: string): Promise<boolean>

// 5. 本地遷移 (首次啟動時)
export async function migrateFromLocalStorage(
  lineUserId: string,
  localState: PassportState
): Promise<boolean>

// 6. 跨項目集章 (來自其他項目的事件)
export async function claimStampFromEvent(
  lineUserId: string,
  eventType: 'mbti_completed' | 'gacha_unlocked' | 'mission_complete' | 'order_success',
  eventData: Record<string, any>
): Promise<{ stampId: string, newAchievements: string[] }>
```

---

## 📱 前端集成流程

### 階段 1: 同步初始化 (首次進入)

```
App 啟動
  ↓
LiffProvider 初始化 LIFF
  ↓
獲取 profile (userId, displayName, pictureUrl)
  ↓
PassportScreen 掛載
  ↓
檢查本地 localStorage 是否有舊數據
  ↓
是 → 遷移到 Supabase + 清除 localStorage
  否 → 直接從 Supabase 讀取
  ↓
展示集章進度
```

### 階段 2: 實時同步 (集章時)

```
用戶解鎖集章 (手動 or 自動)
  ↓
調用 unlockStamp(lineUserId, stampId, source)
  ↓
Supabase 寫入 passport_stamps
  ↓
檢查新成就
  ↓
如果有新成就 → 展示通知
  ↓
更新本地 state
  ↓
追蹤 GA4 事件
```

### 階段 3: 跨項目通知 (其他項目觸發)

```
其他項目 (MBTI Lab, Gacha, Map, Booking) 完成任務
  ↓
調用 claimStampFromEvent(lineUserId, eventType, eventData)
  ↓
Passport 自動解鎖對應集章
  ↓
推播通知用戶 (後期 + n8n)
```

---

## 📝 實現步驟 (Day 8-14)

### **Day 8 (2/24): Supabase 表建立 + RLS 配置**
- [ ] 建立所有 4 個表 + migration_log
- [ ] 配置 RLS 策略
- [ ] 測試查詢權限

### **Day 9 (2/25): 後端 API 實現**
- [ ] 新建 `src/api/passport.ts`
- [ ] 實現 6 個核心函數
- [ ] 測試各端點

### **Day 10 (2/26): 本地遷移邏輯**
- [ ] 在 LiffContext 中新增遷移流程
- [ ] 測試從 localStorage → Supabase 遷移
- [ ] 處理衝突情況

### **Day 11 (2/27): PassportScreen 同步**
- [ ] 修改 PassportScreen.tsx 使用 Supabase 數據
- [ ] 實現集章時的即時更新
- [ ] 移除舊的 localStorage 直接操作

### **Day 12 (2/28): 跨項目事件集成**
- [ ] 在 PassportScreen 中加入事件監聽 (Supabase Realtime)
- [ ] 測試來自其他項目的 stamp_claim 事件

### **Day 13 (3/1): 完整測試 + 邊界情況**
- [ ] 測試多設備同步
- [ ] 測試離線場景 (緩存)
- [ ] 測試權限和隱私

### **Day 14 (3/2): 清理 + 文檔**
- [ ] 刪除舊的 localStorage 依賴
- [ ] 撰寫集成文檔
- [ ] 準備 MBTI Lab 集成

---

## 🔑 環境變量配置

```bash
# .env 或 .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_LIFF_ID=your_liff_id
```

---

## 🧪 測試用例

### 本地遷移測試
- [ ] localStorage 有數據 → 成功遷移到 Supabase
- [ ] localStorage 無數據 → 直接建立新用戶
- [ ] 遷移後 localStorage 被清空

### 集章測試
- [ ] 解鎖新集章 → 即時在 Supabase 中更新
- [ ] 多設備 → 實時同步
- [ ] 重複集章 → 拒絕重複寫入 (UNIQUE 約束)

### 成就測試
- [ ] 達到指定集章數 → 自動解鎖成就
- [ ] 解鎖特定集章 → 對應成就解鎖

### 跨項目測試
- [ ] MBTI Lab 完成 → Passport 自動集章
- [ ] Gacha 獲獎 → Passport 自動集章

---

## 📌 關鍵代碼片段預覽

### `src/api/passport.ts` 框架

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function initPassportUser(lineUserId: string, displayName: string, pictureUrl?: string) {
  try {
    const { data, error } = await supabase
      .from('passport_users')
      .upsert({
        line_user_id: lineUserId,
        display_name: displayName,
        profile_picture_url: pictureUrl,
        updated_at: new Date()
      })
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Failed to init passport user:', error);
    throw error;
  }
}

// ... 其他函數
```

---

## 🎯 下一步

1. **你需要確認**:
   - Supabase project 是否已建立？
   - 是否已有 SUPABASE_URL 和 SUPABASE_ANON_KEY？

2. **我將開始實現**:
   - 建立 SQL 遷移腳本
   - 實現 `src/api/passport.ts`
   - 修改 PassportScreen.tsx

---

**準備開始？** 🚀
