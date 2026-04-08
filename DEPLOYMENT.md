# 部署指南 | Deployment Guide

本指南以目前程式碼為準，適用於 MoonMoon Dessert Passport 的 Vercel 部署與上線驗證。

上線前請先完成 [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)。

## 1. 本機確認

部署前先在本機確認：

```bash
npm install
npm run build
npm run preview
```

至少手動測一次：

- `/`
- `/passport/:id`
- `/join/:passportId`
- `/redeem`

## 2. Vercel 專案設定

Vercel 建議值：

- Framework Preset: `Vite`
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`

## 3. 環境變數

依需求設定：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GA4_ID`
- `VITE_LIFF_ID`
- `VITE_SUPABASE_AUTH_REDIRECT_URL`（可選，未提供時 fallback 到目前網域 `/`）

若你使用 moon island 共用 env 名稱，也可改填：

- `VITE_MOON_ISLAND_SUPABASE_URL`
- `VITE_MOON_ISLAND_SUPABASE_ANON_KEY`

說明：
- 缺少 Supabase env 時，頁面仍可載入，但登入、點數同步、claim RPC 與部分雲端資料會不可用。
- `VITE_SUPABASE_AUTH_REDIRECT_URL` 不是硬性必填；真正需要核對的是 Supabase Auth 的 Redirect URLs 是否包含正式網域與 callback 用法。
- 缺少 LIFF ID 時，LINE profile 自動帶入不會啟動。
- 除了本 repo 的 migration，正式環境還需具備 shared backend RPC，例如 `update_last_seen`、`insert_user_event`、`upsert_point_transaction`。

## 4. GA4 設定

目前 `index.html` 會優先讀取 `VITE_GA4_ID`，未設定時 fallback 到預設值。

建議上線後檢查以下事件是否有進線：

- `utm_landing`
- `entrance_scan`
- `button_click`
- `passport_opened`
- `stamp_unlocked`
- `stamp_claim`
- `passport_checkin`
- `reward_redeemed`

## 5. 上線後驗證

建議在正式網址做這一輪：

1. 開首頁，確認 landing 正常顯示。
2. 點「打開我的護照」，確認護照主介面可進入。
3. 測 Google 登入或 Magic Link。
4. 測公開護照頁 `/passport/:id`。
5. 測邀請頁 `/join/:passportId` 可提交。
6. 測店員兌換頁 `/redeem` 可查詢護照與核銷。
7. 到 GA4 即時報表確認事件有進線。

## 6. 常見問題

### Build 失敗

- 先在本機跑 `npm run build`
- 確認 `package-lock.json` 已一併推上去
- 確認 Vercel 使用的是正確 repo 與分支

### 登入跳轉錯誤

- 先檢查 Supabase Auth 的 Redirect URLs 是否包含正式網域
- 若要固定 callback 來源，再檢查 `VITE_SUPABASE_AUTH_REDIRECT_URL`

### 頁面正常但資料沒有同步

- 檢查 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- 檢查 Supabase RLS 與 RPC 是否已部署到正式環境
- 檢查 shared backend RPC `update_last_seen`、`insert_user_event`、`upsert_point_transaction` 是否存在

### LIFF 沒有帶入使用者

- 檢查 `VITE_LIFF_ID`
- 檢查是否在 LINE WebView 或對應 LIFF 設定網域下測試
