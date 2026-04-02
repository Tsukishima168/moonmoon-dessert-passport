# CURRENT.md — passport.kiwimu.com

## Snapshot · 2026-04-01

Status: `可驗證交付候選`

已完成驗證：
- `npm run build` 通過
- `npm run preview -- --host 127.0.0.1 --port 3102` 可啟動
- `curl -I http://127.0.0.1:3102/` → `200 OK`
- `curl -I http://127.0.0.1:3102/redeem` → `200 OK`
- 已補 `manualChunks`，主 bundle 從單一 `676.81 kB` 拆為：
  - `index` `312.36 kB`
  - `vendor-supabase-line` `294.08 kB`
  - `vendor-react` `47.93 kB`
  - `vendor-icons` `22.01 kB`

## 目前 Blockers

1. `Google OAuth` / `Magic Link` / `LIFF` redirect 仍需真人在實際網域與真實憑證下驗證。
2. `/passport/:id`、`/join/:passportId`、`/redeem` 需要真實資料與店員端流程驗證。
3. 與 `shop.kiwimu.com` 的 shared profile / points 同步仍需跨站真人 smoke。
4. worktree 內有既存變動：`PROJECT_PROGRESS.md` 已修改，這次未處理。

## 最小交付清單

- 本機 build/preview/smoke 可重現：已完成
- landing 與 redeem 基本路由可回應：已完成
- auth 進入與 callback 回跳驗證：待完成
- public passport / join / redeem 真人路徑驗證：待完成
- cross-site profile / points sync 驗證：待完成
- `CURRENT.md` / `LOG.md` 已建立：已完成

## 今晚可以直接做的項目

- 若有測試 `passportId`，本機 smoke `/passport/:id` 與 `/join/:passportId`
- 用測試帳號做一次 `Google OAuth` 或 `Magic Link` 回跳驗證
- 用 staff 測試資料做一次 redeem flow 與 Supabase 寫入驗證
- 補一份 route 截圖與 QA 紀錄，方便交付

## 需要真人參與的驗證項目

- LINE 內建瀏覽器開啟與 `LIFF` 行為
- `Google OAuth` / `Magic Link` 在實際網域的 callback
- 真實會員邀請加入流程
- 店員端實際核銷流程

