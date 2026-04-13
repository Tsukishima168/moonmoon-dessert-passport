# MoonMoon Dessert Passport 專案交接指南

本文件以目前 codebase 為準，供後續工程師快速接手。

## 1. 專案定位

- 專案名稱：MoonMoon Dessert Passport
- 類型：React SPA
- 角色：Kiwimu 生態中的會員護照站
- 目的：承接跨站身份、印章、點數、邀請與兌換流程

重要：
- 這個 repo 會接 MBTI 站的結果與 claim，但它本身不是 MBTI quiz app。
- 早期有一批 quiz/result 規劃文件，目前應視為歷史資料。

## 2. 目前架構

- 前端：React 19 + TypeScript + Vite
- 路由：React Router
- 樣式：Tailwind CSS
- Auth：Supabase Auth
- LINE：LIFF profile 讀取
- 資料：Supabase 為主，部分本地 fallback 仍存在
- 追蹤：GA4

## 3. 實際路由

- `/`：landing + 護照主介面容器
- `/passport/:id`：公開護照頁
- `/join/:passportId`：接受邀請頁
- `/redeem`：店員端布丁兌換頁

注意：
- `src/pages/InvitePage.tsx` 目前存在，但沒有掛到 router；不要把它當成正式入口。

## 4. 目前完成的功能

- landing 與護照主介面切換
- Google OAuth / Magic Link 登入
- LIFF 非阻塞初始化與 profile 快取
- 集章、每日打卡、點數與獎勵商店
- shared profile / profile center
- 公開護照、邀請、布丁核銷
- GA4 UTM 入口追蹤

## 5. 資料層現況

- `src/lib/supabase.ts` 是唯一 Supabase client
- `src/api/points.ts` 已對齊 `point_transactions`
- `supabase/migrations/002_rls_security_fix.sql` 已反映目前 RLS 修正
- `adjust_points` RPC 用於點數寫入

近期重點：
- passports / invitations / redemptions / point_transactions 已收斂為 own-only RLS
- `point_transactions` 已啟用 RLS

## 6. 關鍵檔案

- `index.tsx`：route 掛載
- `App.tsx`：landing、URL 參數處理、claim 入口
- `PassportScreen.tsx`：護照首頁主介面
- `src/api/passportSystem.ts`：公開護照與邀請 / 兌換 API
- `src/api/points.ts`：點數查詢與 RPC
- `src/contexts/SupabaseAuthContext.tsx`：登入流程
- `src/contexts/LiffContext.tsx`：LINE profile
- `analytics.ts`：GA4 事件封裝

## 7. 已知注意點

- `InvitePage.tsx` 未掛 route，若要啟用需先決定是否保留 `/invite/:id` 入口。
- 部分歷史文件仍描述 quiz/result 流程；活文件請以 README、部署文件、上線清單為準。
- 缺少 Supabase env 時，頁面會載入，但資料與登入功能會降級。

## 8. 建議下一步

- 釐清 `InvitePage.tsx` 是否保留或刪除
- 持續清理歷史 quiz 文案文件，改為 archive 或移出主目錄
- 視需要把大型 `PassportScreen` 再拆模組並做 code splitting
