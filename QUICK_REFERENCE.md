# ⚡ Passport Supabase 快速參考卡

## 📋 架構一覽

```
LIFF Login (LINE User ID)
    ↓
LiffProvider 提供用戶信息
    ↓
PassportScreen 加載
    ↓
初始化 Passport 用戶 (initPassportUser)
    ↓
遷移本地數據 (migrateFromLocalStorage)
    ↓
從 Supabase 讀取進度 (getPassportProgress)
    ↓
用戶集章 → unlockStamp → 更新 Supabase
```

---

## 🔌 API 快速索引

| 函數 | 用途 | 參數 | 返回值 |
|------|------|------|--------|
| `initPassportUser()` | 初始化用戶 | lineUserId, name, pic | PassportUser |
| `getPassportProgress()` | 獲取進度 | lineUserId | {stamps, achievements, rewards} |
| `unlockStamp()` | 解鎖集章 | lineUserId, stampId, source, data | {stamp, newAchievements} |
| `redeemReward()` | 兌換獎勵 | lineUserId, rewardId | boolean |
| `migrateFromLocalStorage()` | 遷移數據 | lineUserId, localState | boolean |
| `claimStampFromEvent()` | 跨項目集章 | lineUserId, eventType, data | {stampId, newAchievements} |

---

## 🎲 事件類型 (eventType)

```
'mbti_completed'    → MBTI 測驗完成
'gacha_unlocked'    → 抽卡解鎖獎勵
'mission_complete'  → 地圖任務完成
'order_success'     → 訂單完成
```

---

## 🗄️ 表結構速查

### passport_users
```sql
id (UUID, PK)
line_user_id (TEXT, UNIQUE)
display_name (TEXT)
profile_picture_url (TEXT)
created_at, updated_at (TIMESTAMP)
```

### passport_stamps
```sql
id (UUID, PK)
user_id (UUID, FK)
stamp_id (TEXT)
source_project (TEXT: 'passport'|'mbti'|'gacha'|'map'|'booking')
unlocked_at (TIMESTAMP)
claim_data (JSONB)
UNIQUE(user_id, stamp_id)
```

### passport_achievements
```sql
id (UUID, PK)
user_id (UUID, FK)
achievement_id (TEXT)
unlocked_at (TIMESTAMP)
UNIQUE(user_id, achievement_id)
```

### passport_rewards
```sql
id (UUID, PK)
user_id (UUID, FK)
reward_id (TEXT)
redeemed_at (TIMESTAMP)
UNIQUE(user_id, reward_id)
```

---

## 📱 代碼用法

### 初始化
```typescript
import { initPassportUser } from '@/api/passport';

const user = await initPassportUser(
  'U123456789',           // LINE User ID
  'John Doe',             // 名稱
  'https://pic.url'       // 頭像 URL (可選)
);
```

### 解鎖集章
```typescript
import { unlockStamp } from '@/api/passport';

const result = await unlockStamp(
  'U123456789',           // LINE User ID
  'booking_completed',    // 集章 ID
  'passport',             // 來源項目
  { orderId: '12345' }    // 額外數據 (可選)
);

console.log(result.newAchievements); // 新解鎖的成就
```

### 獲取進度
```typescript
import { getPassportProgress } from '@/api/passport';

const progress = await getPassportProgress('U123456789');
console.log(progress.stamps);        // 集章列表
console.log(progress.achievements);  // 成就列表
console.log(progress.rewards);       // 獎勵列表
```

### 跨項目集章
```typescript
import { claimStampFromEvent } from '@/api/passport';

// MBTI Lab 完成時
const result = await claimStampFromEvent(
  'U123456789',
  'mbti_completed',
  { mbtiType: 'INTJ-A', personality: 'Analyst' }
);
```

---

## 🔐 環境變量

```bash
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_LIFF_ID=1234567890
```

---

## ✅ 檢查清單

- [ ] Supabase Project 已建立
- [ ] SQL 遷移已執行
- [ ] 環境變量已設置
- [ ] `@supabase/supabase-js` 已安裝
- [ ] `src/api/passport.ts` 已實現
- [ ] PassportScreen 已更新
- [ ] LiffContext 已更新
- [ ] 本地遷移已測試
- [ ] 多設備同步已測試
- [ ] 跨項目集章已測試

---

## 🔗 常用命令

```bash
# 安裝依賴
npm install @supabase/supabase-js

# 開發模式
npm run dev

# 構建
npm run build

# 預覽構建
npm run preview

# 查看類型錯誤
npm run type-check
```

---

## 📞 常見錯誤

| 錯誤 | 原因 | 解決方案 |
|------|------|---------|
| `Supabase credentials not configured` | 環境變量未設置 | 檢查 .env.local |
| `UNIQUE constraint violation` | 重複集章 | 檢查是否已集章，使用 unlockStamp 前先檢查 |
| `User not found` | 用戶未初始化 | 先調用 initPassportUser |
| 網絡超時 | 連接失敗 | 檢查 VITE_SUPABASE_URL |

---

## 🚀 下一階段 (Day 9-14)

1. **Day 9**: PassportScreen 集成
2. **Day 10**: LiffContext 集成 + 本地遷移
3. **Day 11**: 實時同步 (Supabase Realtime)
4. **Day 12-13**: 完整測試
5. **Day 14**: 清理 + 準備 MBTI 集成

---

**打印此卡片或保存為快捷鍵！** 📌
