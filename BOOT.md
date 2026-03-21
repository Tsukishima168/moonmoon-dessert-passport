# BOOT.md — Moon Moon Dessert Passport · 冷啟動快照

> 每次新開對話先讀這份文件。

---

## 冷啟動快照 · 2026-03-21

### 當前分支

- `fix/auth-redirect-trailing-slash`
- 本輪已整合但尚未 push：auth redirect trailing slash 修正、landing CTA / mascot 版型調整、RewardShop Tailwind 統一、shop 連結修正、LIFF 型別安全修正

### 本輪完成

- `App.tsx`
  - LandingScreen 改成 3 種可比較版型：`hero` / `gallery` / `totem`
  - 預設版型改為 `gallery`
  - 以 `?landing_variant=hero|gallery|totem` 切換截圖比較
  - CTA 改為輕量膠囊按鈕，避免搶走 Kiwimu 視線
  - 不再依賴被裁切的 `Enter-05_nrt403.webp` 當首頁主角，改用乾淨的 inline Kiwimu 向量稿，確保角色完整可見
- `components/RewardShop.tsx`
  - 將混用 inline style 的主區塊整理成 Tailwind class
- `components/ShopOrderHistory.tsx`
  - shop 出站連結固定導向 `https://shop.kiwimu.com/menu`
- `src/contexts/LiffContext.tsx`
  - `error` / `setError` 改用 `unknown`

### 驗證結果

- `npm run build` 通過
- Landing 手機版截圖已產出：
  - `/tmp/passport-landing-shots/run3/landing-hero.png`
  - `/tmp/passport-landing-shots/run3/landing-gallery.png`
  - `/tmp/passport-landing-shots/run3/landing-totem.png`

### 目前建議

- 若主理人今天要先上線，保留預設 `gallery`
- 若要回到真實角色素材，需先換掉目前已被源圖裁切的 Cloudinary `Enter-05_nrt403.webp`；單靠 CSS 無法恢復被裁掉的右側鼻子

### 接手注意

- 此分支在 commit 前曾有既有未提交改動，已一併納入本次 commit
- Landing 版型比較目前透過 query param 控制，未額外做後台設定或 feature flag
