# 🎫 Passport Supabase - 完整設置指南

**日期**: 2026年2月18日  
**進度**: Day 8 - Supabase 初始化準備

---

## 📋 清單

### ✅ 已完成
- [x] 設計 Supabase Schema (4 表 + migration_log)
- [x] 實現 `src/api/passport.ts` (7 個核心 API)
- [x] 建立 SQL 遷移腳本 (`docs/passport_schema.sql`)

### 📍 下一步（你需要完成）
- [ ] **Step 1**: 建立 Supabase Project
- [ ] **Step 2**: 建立資料庫表
- [ ] **Step 3**: 配置環境變量
- [ ] **Step 4**: 安裝 Supabase 依賴
- [ ] **Step 5**: 測試連接

---

## 🚀 設置步驟

### **Step 1: 建立 Supabase Project**

1. 前往 https://supabase.com
2. 登入或註冊帳號
3. 建立新 Project
   - Project name: `moonmoon-passport`
   - Database password: 設定強密碼
   - Region: 選擇離用戶最近的地區（Taiwan/HK/Singapore）
4. 等待 Project 建立（約 2-3 分鐘）

### **Step 2: 取得 API 金鑰**

1. 進入 Project 後，點擊左側 **Settings**
2. 點擊 **API**
3. 複製以下資訊：
   ```
   Project URL:    [複製這個]
   Anon Public Key: [複製這個]
   ```

例如：
```
Project URL:     https://xyz123.supabase.co
Anon Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Step 3: 建立資料庫表**

1. 在 Supabase 控制台點擊 **SQL Editor**
2. 點擊 **New Query**
3. 複製並貼上 `docs/passport_schema.sql` 的全部內容
4. 點擊 **Run** 執行
5. 確認無錯誤信息

### **Step 4: 配置環境變量**

在專案根目錄建立 `.env.local` 檔案：

```bash
# .env.local
VITE_SUPABASE_URL=https://xyz123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_LIFF_ID=your_existing_liff_id
```

**⚠️ 重要**: `.env.local` 檔案包含敏感資訊，請勿提交到 Git。

### **Step 5: 安裝依賴**

```bash
cd /Users/penstudio/Desktop/moonmoon-dessert-passport
npm install @supabase/supabase-js
```

### **Step 6: 測試連接**

建立測試文件 `src/test-supabase.ts`：

```typescript
import { initPassportUser, getPassportProgress } from './src/api/passport';

async function test() {
  try {
    // Test 1: Init user
    console.log('Test 1: Initializing user...');
    const user = await initPassportUser('U123456789', 'Test User', 'https://example.com/pic.jpg');
    console.log('✅ User created:', user);

    // Test 2: Get progress
    console.log('\nTest 2: Getting progress...');
    const progress = await getPassportProgress('U123456789');
    console.log('✅ Progress:', progress);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
```

在終端執行：
```bash
npx tsx src/test-supabase.ts
```

---

## 🔧 Schema 詳解

### **passport_users**
```
儲存用戶基本信息
- id: UUID (主鍵)
- line_user_id: LINE User ID (來自 LIFF)
- display_name: 用戶名稱
- profile_picture_url: 頭像 URL
```

### **passport_stamps**
```
儲存集章記錄 (支援多項目)
- id: UUID (主鍵)
- user_id: 用戶 ID (外鍵)
- stamp_id: 集章 ID (e.g., 'booking_completed')
- source_project: 來源 ('passport'|'mbti'|'gacha'|'map'|'booking')
- unlocked_at: 解鎖時間
- claim_data: 額外數據 (JSON)

UNIQUE 約束: (user_id, stamp_id) - 防止重複集章
```

### **passport_achievements**
```
儲存成就記錄
- id: UUID (主鍵)
- user_id: 用戶 ID (外鍵)
- achievement_id: 成就 ID
- unlocked_at: 解鎖時間

UNIQUE 約束: (user_id, achievement_id)
```

### **passport_rewards**
```
儲存獎勵兌換記錄
- id: UUID (主鍵)
- user_id: 用戶 ID (外鍵)
- reward_id: 獎勵 ID
- redeemed_at: 兌換時間

UNIQUE 約束: (user_id, reward_id)
```

### **passport_migration_log**
```
記錄所有數據遷移和關鍵操作
- id: UUID (主鍵)
- user_id: 用戶 ID (外鍵)
- action: 操作類型 ('migration_from_localstorage'|'stamp_claimed'|'reward_redeemed')
- details: 詳細信息 (JSON)
- created_at: 操作時間
```

---

## 📱 API 函數清單

### 1. **initPassportUser** ✅
```typescript
await initPassportUser(lineUserId, displayName, pictureUrl?)
```
- 用途: 初始化用戶或更新用戶信息
- 調用時機: LIFF 登入後
- 返回: PassportUser 對象

### 2. **getPassportProgress** ✅
```typescript
const progress = await getPassportProgress(lineUserId)
// 返回: { stamps: [], achievements: [], rewards: [] }
```
- 用途: 取得用戶的完整進度
- 調用時機: 頁面載入時、定期刷新
- 返回: 集章、成就、獎勵列表

### 3. **unlockStamp** ✅
```typescript
const result = await unlockStamp(lineUserId, stampId, sourceProject, claimData?)
// 返回: { stamp, newAchievements: [] }
```
- 用途: 解鎖集章
- 調用時機: 用戶完成任務時
- 返回: 新解鎖的成就列表

### 4. **redeemReward** ✅
```typescript
const success = await redeemReward(lineUserId, rewardId)
```
- 用途: 兌換獎勵
- 調用時機: 用戶點擊兌換按鈕時
- 返回: 是否成功

### 5. **migrateFromLocalStorage** ✅
```typescript
const success = await migrateFromLocalStorage(lineUserId, localState)
```
- 用途: 從本地儲存遷移到 Supabase
- 調用時機: 首次登入時
- 返回: 是否成功

### 6. **claimStampFromEvent** ✅
```typescript
const result = await claimStampFromEvent(lineUserId, eventType, eventData)
// eventType: 'mbti_completed' | 'gacha_unlocked' | 'mission_complete' | 'order_success'
```
- 用途: 跨項目事件觸發集章
- 調用時機: 其他項目完成時
- 返回: 新集章 ID 和新成就

---

## 🧪 測試用例

### 本地測試流程

```bash
# 1. 確保環境變量已設置
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# 2. 啟動開發服務器
npm run dev

# 3. 在瀏覽器控制台測試
# 將 src/api/passport.ts 中的函數暴露到 window 進行測試
```

### 瀏覽器控制台測試

```javascript
// 測試 1: 初始化用戶
const user = await window.passport.initPassportUser('U123456789', 'Test');
console.log(user);

// 測試 2: 獲取進度
const progress = await window.passport.getPassportProgress('U123456789');
console.log(progress);

// 測試 3: 解鎖集章
const result = await window.passport.unlockStamp('U123456789', 'test_stamp', 'passport');
console.log(result);
```

---

## 📊 Supabase 監控

登入 Supabase 控制台查看：

1. **數據瀏覽器** (Data Browser)
   - 查看各表的實時數據

2. **實時日誌** (Logs)
   - 監控查詢和錯誤

3. **分析** (Analytics)
   - API 調用統計

---

## ⚠️ 常見問題

### Q: 忘記複製 API 金鑰怎麼辦？
A: 回到 Supabase 控制台 → Settings → API，隨時可以查看。

### Q: 能否修改現有表結構？
A: 可以。在 SQL Editor 中執行 ALTER 語句，或使用遷移工具。

### Q: 如何重置所有數據？
A: 在 SQL Editor 執行：
```sql
TRUNCATE passport_users CASCADE;
```
⚠️ 這會刪除所有關聯數據，謹慎使用！

### Q: 支持離線操作嗎？
A: 當前不支持。後續可考慮使用 Service Worker 或本地緩存。

---

## 🔐 安全性建議

1. **環境變量**: 將敏感信息存儲在 `.env.local`，勿提交到 Git
2. **RLS 策略**: 當前允許所有請求，生產環境應限制為認證用戶
3. **API 密鑰輪轉**: 定期更新 Supabase 中的密鑰
4. **日誌監控**: 定期檢查 Supabase 日誌尋找異常活動

---

## 📅 下一步

### Day 9 (2/25)
- [ ] 修改 PassportScreen.tsx 使用 Supabase
- [ ] 實現本地遷移邏輯
- [ ] 測試集章功能

### Day 10 (2/26)
- [ ] 實現 LiffContext 中的初始化
- [ ] 多設備同步測試

### Day 11-14
- [ ] 跨項目集成
- [ ] 完整測試

---

**狀態**: 🟡 準備中  
**下一個行動**: 完成 Supabase 設置，報告 API 金鑰 ✅

準備好了嗎？👇
