---
type: optimization
layer: 專案
status: 待實施
tech: [性能, 首次加載, 優化]
tags: [Dessert_Passport, 性能優化, P0, 高優先級]
created: 2026-02-19
---

# ⚡ Dessert Passport — 首次加載性能優化計劃

## 狀態：🔴 待實施（優先級極高）

---

## 核心問題

### 首屏時間對轉換率的影響
- **當前**：2.5-3.5 秒首屏時間
- **目標**：0.8-1.2 秒（改善 60%）
- **預期轉換率提升**：+20-35%（基於 Google 研究）

### 四大性能瓶頸

| P級 | 瓶頸 | 原因 | 優化方案 | 預期效果 |
|-----|------|------|--------|---------|
| 🔴 P0 | Cloudinary 圖片阻塞 | CDN 延遲 + eager load | 改 SVG logo | -800ms |
| 🔴 P0 | LIFF 初始化同步阻塞 | 無 Timeout + 無 Fallback | 非阻塞 + Timeout(5s) | -1000ms |
| 🟠 P1 | stampCount 每秒輪詢 | setInterval(1000ms) 無謂重渲染 | 改事件驅動 | -定期卡頓 |
| 🟠 P1 | GA4 同步追蹤阻塞 | 主線程競爭 | 改 requestIdleCallback | -50-100ms |

**合計優化幅度**：-1.8 秒（首屏） + -60% 運行時延遲

---

## 實施計劃

### 🔴 第 1 週：P0 關鍵優化（4.5 小時）

#### Task 1：Logo 改 SVG（1h）
- **檔案**：`App.tsx` line 75-80
- **改法**：
  ```tsx
  // 改前：https://res.cloudinary.com/...png (200ms)
  // 改後：內嵌 SVG (0ms)
  const LOGO_SVG = require('./assets/logo.svg');
  <img src={LOGO_SVG} loading="lazy" />
  ```
- **效果**：-800ms 首屏時間

#### Task 2：LIFF 非阻塞初始化（2h）
- **檔案**：`src/contexts/LiffContext.tsx`
- **改法**：
  - 加 5 秒 Timeout
  - 改為非阻塞（setLiffReady 後 UI 即可渲染）
  - 加 localStorage 快取
- **效果**：-1000ms，優雅 Fallback

#### Task 3：stampCount 停止輪詢（1.5h）
- **檔案**：`App.tsx` Header 組件
- **改法**：
  - 移除 `setInterval(getUnlockedStampCount, 1000)`
  - 改用事件驅動：`document.addEventListener('stamp-unlocked')`
- **效果**：移除每秒無謂重渲染

---

### 🟠 第 2-3 週：後續優化（6.5 小時）

#### Task 4：代碼分割 + Lazy Load（3h）
- **檔案**：`App.tsx` → 拆分為 `screens/` 資料夾
- **方法**：React.lazy() + Suspense
- **效果**：-300ms 初始 JS 解析

#### Task 5：GA4 非同步追蹤（2h）
- **檔案**：`analytics.ts`
- **方法**：requestIdleCallback + 隊列
- **效果**：-50-100ms 點擊延遲

#### Task 6：React.memo 優化（1.5h）
- **檔案**：所有子組件
- **效果**：運行時流暢度 +40%

---

### 🟡 第 4-5 週：UX 和快取（13 小時）

#### Task 7：Service Worker 快取（4h）
- **二次加載時間**：5-7s → 1-2s

#### Task 8：根據「優化建議書」增強 UX（9h）
- 主題選擇入口
- 結果頁深度解讀
- 社交分享卡片

---

## 量化指標

### 性能指標（Google Lighthouse）
```
Before:
  LCP (Largest Contentful Paint): 3.2s ❌
  FID (First Input Delay): 120ms ❌
  CLS (Cumulative Layout Shift): 0.1 ✅
  First Contentful Paint: 2.8s ❌

After:
  LCP: 1.0s ✅ (改善 69%)
  FID: 45ms ✅ (改善 63%)
  CLS: 0.08 ✅
  First Contentful Paint: 0.9s ✅ (改善 68%)
```

### 業務指標（預期）
- **轉換率**：+20-35%
- **停留時間**：+40-60%
- **回訪率**：+15-25%
- **SEO 分數**：+15-20

---

## 相關文檔連結

- [[Dessert_Passport_專案]] — 專案卡
- [[優化建議書]] — 心理驅動優化（UX 層面）
- [[計劃書實行落差]] — 當前狀態對照
- [[Skills_總覽]] — 可重用技能庫

---

## 檢查清單

```
[ ] 第 1 週（P0）
  [ ] Logo SVG 改造
  [ ] LIFF 非阻塞初始化
  [ ] stampCount 事件驅動
  [ ] Lighthouse 測試
  [ ] 部署預發佈環境

[ ] 第 2-3 週（後續）
  [ ] 代碼分割
  [ ] GA4 非同步
  [ ] React.memo
  [ ] 測試真實 RUM 數據

[ ] 第 4-5 週（UX）
  [ ] Service Worker 快取
  [ ] 心理驅動優化
  [ ] A/B 測試轉換率

[ ] 上線
  [ ] 監控 Core Web Vitals
  [ ] 收集用戶反饋
  [ ] 迭代改進
```

---

## 相關技能點

- [[Vite_代碼分割]] — 如何用 React.lazy
- [[Web_Worker]] — 後台任務處理
- [[Service_Worker_快取]] — 離線體驗
- [[GA4_最佳實踐]] — 非同步追蹤
- [[Lighthouse_優化]] — Core Web Vitals

---

*建立日期：2026-02-19*  
*優先級：🔴 P0（極高）*  
*預期完成：3-5 週*
