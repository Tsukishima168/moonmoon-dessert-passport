# 月島甜點護照｜上線檢查清單

本清單已依目前實作更新，不再把本專案當成 quiz/result 站點。

---

## 一、主流程

### 1. 首頁 `/`

- [ ] Landing 正常顯示「Moon Moon Passport」
- [ ] Header logo 可返回首頁
- [ ] 開啟後預設進入護照首頁 / dashboard-first 主視圖
- [ ] 「打開我的護照」按鈕可進入護照入口
- [ ] 非 LINE WebView 下可看到 Google 登入按鈕
- [ ] UTM 進站時不影響首頁渲染

### 2. 護照首頁 / 護照主介面

- [ ] Passport 可正常開啟與關閉
- [ ] 護照首頁第一屏先顯示 profile、points、today action、latest order
- [ ] 點數、徽章數、會員資料區塊正常顯示
- [ ] `ProfileCenter` 可讀取並更新 shared profile 設定
- [ ] `MemberHub` 能顯示站點足跡與 MBTI 資訊
- [ ] `BadgeJourney` 印章卡可正常互動
- [ ] `RewardShop` 可正常讀取點數與顯示兌換狀態
- [ ] `ShopOrderHistory` 區塊正常載入
- [ ] `CheckinModal` 可正常開啟

### 3. 公開護照與邀請

- [ ] `/passport/:id` 可讀取護照資料
- [ ] 公開護照頁可複製邀請連結
- [ ] `/join/:passportId` 可提交 IG handle
- [ ] 邀請滿額、停用、無效連結等狀態顯示正確

### 4. 店員端兌換

- [ ] `/redeem` 密碼頁可進入
- [ ] 1-100 護照編號查詢正常
- [ ] 可兌換 / 不可兌換 / 已兌換狀態顯示正確
- [ ] 成功核銷後畫面回饋正確

---

## 二、整合與資料

### 1. Supabase

- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 已設定
- [ ] Google OAuth / Magic Link 可正常使用
- [ ] 點數 API 正常讀寫 `point_transactions`
- [ ] 公開護照、邀請、核銷流程可正常存取

### 2. LIFF

- [ ] `VITE_LIFF_ID` 已設定時，可正確取得 profile
- [ ] 未設定 `VITE_LIFF_ID` 時，UI 不會壞掉

### 3. RLS / Migration

- [ ] `supabase/migrations/002_rls_security_fix.sql` 已部署到正式環境
- [ ] `point_transactions` 已開啟 RLS
- [ ] `adjust_points` RPC 存在且可呼叫

---

## 三、GA4 與追蹤

- [ ] `VITE_GA4_ID` 正確
- [ ] 首頁帶 `utm_source` 進站時有 `utm_landing`
- [ ] 帶 UTM 進站時有 `entrance_scan`
- [ ] 開啟護照時有 `passport_opened`
- [ ] 解鎖徽章時有 `stamp_unlocked`
- [ ] claim 兌換時有 `stamp_claim`
- [ ] 打卡時有 `passport_checkin`

---

## 四、部署

- [ ] `npm run build` 成功
- [ ] Vercel Framework 偵測為 Vite
- [ ] Build / Output 為 `npm run build` / `dist`
- [ ] 正式站從手機測過一次完整流程

---

## 五、手動驗證建議順序

1. 首頁 `/`
2. 打開護照
3. 登入
4. 公開護照 `/passport/:id`
5. 邀請頁 `/join/:passportId`
6. 店員端 `/redeem`
7. GA4 即時事件
