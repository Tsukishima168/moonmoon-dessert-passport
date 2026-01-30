# 🚀 部署指南 | Deployment Guide

本指南將幫助您將 MoonMoon Dessert Passport 部署到 Vercel，並設定 Google Analytics 4 追蹤。

**上線前請先完成** [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) 的內容與流程檢查。

### MVP 快速上線流程
1. 完成 **LAUNCH_CHECKLIST.md** 第一、二節（內容 + 技術）
2. 本機執行 `npm run build`、`npm run preview` 確認無誤
3. 依下方步驟將專案推上 GitHub 並在 Vercel 匯入部署
4. 上線後用手機走一遍流程，並在 GA4 即時報表確認事件

---

## 📋 前置準備 | Prerequisites

### 1. 建立 GitHub Repository
由於您的系統沒有 Git 命令列工具，請使用以下方法之一：

**方法 A: GitHub Desktop (推薦)**
1. 下載並安裝 [GitHub Desktop](https://desktop.github.com/)
2. 開啟 GitHub Desktop
3. 選擇 File → Add Local Repository
4. 選擇專案資料夾：`/Users/penstudio/Desktop/moonmoon-dessert-passport`
5. 點擊 "Publish repository"
6. 設定 repository 名稱（建議：`moonmoon-dessert-passport`）
7. 取消勾選 "Keep this code private"（或保持私有）
8. 點擊 "Publish Repository"

**方法 B: 直接在 GitHub.com 上傳**
1. 前往 [github.com](https://github.com) 並登入
2. 點擊右上角 "+" → "New repository"
3. Repository 名稱：`moonmoon-dessert-passport`
4. 點擊 "Create repository"
5. 選擇 "uploading an existing file"
6. 拖曳整個專案資料夾的檔案上傳
7. 點擊 "Commit changes"

### 2. 建立 GA4 Property（如果還沒有的話）

1. 前往 [Google Analytics](https://analytics.google.com/)
2. 點擊左下角 "管理" (Admin)
3. 點擊 "+ 建立資源" (Create Property)
4. 填寫資源名稱：`MoonMoon Dessert Passport`
5. 選擇時區和貨幣
6. 點擊 "下一步" → 選擇產業類別
7. 點擊 "建立"
8. 選擇平台：**網站**
9. 填寫網站 URL（暫時填寫 `https://moonmoon.vercel.app`）
10. 記下您的 **Measurement ID**（格式：`G-XXXXXXXXXX`）

---

## 🔧 設定步驟 | Setup Steps

### Step 1: GA4 Measurement ID（選填）

專案已預設一組 GA4 ID（`G-ZF71VP9Z8Y`）。若要改用自己的：

1. 開啟 `index.html`
2. 搜尋 `G-ZF71VP9Z8Y`（共 2 處：gtag 的 script src 與 config）
3. 替換為您的 Measurement ID（格式 `G-XXXXXXXXXX`）
4. 儲存後重新部署

### Step 2: 更新 GitHub Repository（如果您更新了 index.html）

**使用 GitHub Desktop:**
1. 開啟 GitHub Desktop
2. 您會看到 `index.html` 的變更
3. 在左下角輸入 commit message：`Add GA4 tracking ID`
4. 點擊 "Commit to main"
5. 點擊右上角 "Push origin"

**使用 GitHub.com:**
1. 前往您的 repository
2. 點擊 `index.html`
3. 點擊鉛筆圖示編輯
4. 更新 GA4 Measurement ID
5. 點擊 "Commit changes"

---

## 🌐 部署到 Vercel | Deploy to Vercel

### 使用 Vercel Dashboard (最簡單的方式)

1. **登入 Vercel**
   - 前往 [vercel.com](https://vercel.com)
   - 使用 GitHub 帳號登入 (Sign up with GitHub)

2. **匯入專案**
   - 登入後會看到儀表板
   - 點擊 "Add New..." → "Project"
   - 找到您的 `moonmoon-dessert-passport` repository
   - 點擊 "Import"

3. **設定專案**
   - **Project Name**: `moonmoon-dessert-passport`（或您想要的名稱）
   - **Framework Preset**: 應該自動偵測為 "Vite"
   - **Root Directory**: 保持 `./`
   - **Build Command**: `npm run build`（已自動填入）
   - **Output Directory**: `dist`（已自動填入）

4. **設定環境變數（選填）**
   - MVP 不需後端即可完整使用，目前可略過。
   - 若之後會使用 Gemini 相關功能，再新增：
     - Name: `GEMINI_API_KEY`
     - Value: 您的 API Key

5. **部署**
   - 點擊 "Deploy"
   - 等待 2-3 分鐘讓 Vercel 建置和部署
   - 完成後會顯示 🎉 祝賀畫面
   - 點擊 "Visit" 查看您的網站！

6. **記下您的網址**
   - 預設網址格式：`https://moonmoon-dessert-passport.vercel.app`
   - 或是 `https://moonmoon-dessert-passport-xxxxx.vercel.app`

---

## ✅ 驗證 GA4 追蹤 | Verify GA4 Tracking

### 即時測試 Real-time Testing

1. **開啟 GA4 即時報表**
   - 前往 [Google Analytics](https://analytics.google.com/)
   - 選擇您的資源 (Property)
   - 點擊左側選單 "報表" (Reports) → "即時" (Realtime)

2. **測試您的網站**
   - 在新分頁開啟您的 Vercel 網址
   - 執行以下動作：
     - ✅ 載入首頁（應該看到 1 位使用者）
     - ✅ 點擊 "Start Quiz"（事件：`quiz_started`）
     - ✅ 完成問卷（事件：`quiz_completed`）
     - ✅ 查看結果（事件：`result_viewed`，`dessert_view`）
     - ✅ 點擊 "重測一次"（事件：`quiz_restarted`）

3. **在 GA4 確認**
   - 在即時報表中，等待 5-10 秒
   - 您應該會看到：
     - 使用者數量增加
     - 事件名稱出現在 "依事件名稱" 區塊
     - 頁面路徑顯示 "/"

### 追蹤的事件列表 | Tracked Events

| 事件名稱 | 觸發時機 | 參數 |
|---------|---------|------|
| `page_view` | 自動：頁面載入 | - |
| `quiz_started` | 點擊開始測驗 | `timestamp` |
| `quiz_completed` | 完成所有問題 | `total_questions`, `timestamp` |
| `result_viewed` | 查看結果頁面 | `dessert_name`, `dessert_style`, `sticker_name`, `sticker_style`, `timestamp` |
| `dessert_view` | 顯示甜點 | `dessert_id`, `dessert_name` |
| `quiz_restarted` | 重新測驗 | `timestamp` |

---

## 🔄 自動部署 | Automatic Deployments

✨ **好消息！** 設定完成後，每次您推送新的 commit 到 GitHub，Vercel 會自動重新部署！

When you push new commits to GitHub, Vercel will automatically redeploy!

### 更新流程：
1. 在本機修改程式碼
2. 使用 GitHub Desktop commit 並 push
3. Vercel 自動偵測並部署
4. 1-2 分鐘後更新完成！

---

## 🎨 自訂網域 | Custom Domain (選擇性)

如果您想使用自己的網域（例如：`dessert.moonmoon.com`）：

1. 在 Vercel Dashboard 選擇您的專案
2. 點擊 "Settings" → "Domains"
3. 輸入您的網域名稱
4. 依照指示設定 DNS 記錄
5. 等待 DNS 傳播（通常 5-60 分鐘）

---

## 🛠 疑難排解 | Troubleshooting

### 部署失敗
1. **查看 Vercel 建置日誌**：專案 → Deployments → 點失敗的那次 → 看 "Building" 底下的錯誤訊息。
2. **常見原因與處理**：
   - **`npm install` 或 `npm run build` 報錯**：確認專案已完整推上 GitHub（含 `package.json`、`package-lock.json`、`index.css`、`vite.config.ts`）。
   - **找不到 index.css**：專案已補上 `index.css`，請重新 push 後再部署。
   - **Node 版本**：Vercel 預設為 Node 18；若錯誤與 Node 有關，可在 Vercel 專案 Settings → General → Node.js Version 改為 20。
   - **環境變數**：MVP 不需設定 `GEMINI_API_KEY`；若建置程式有讀取，未設定時會以空字串處理，不應導致建置失敗。
3. 若仍失敗，請把 Vercel 建置日誌中的**紅色錯誤訊息**複製下來，方便進一步排查。

### GA4 沒有資料
- 確認 `index.html` 中的 Measurement ID 正確
- 確認已重新部署（更新 ID 後）
- 檢查瀏覽器 Console 是否有錯誤
- 等待 5-10 秒，GA4 即時報表有延遲

### 環境變數問題
- MVP 可不設定 `GEMINI_API_KEY`；若建置需要該變數，再於 Vercel 新增
- 重新部署：Settings → Deployments → 點擊最新的 → "Redeploy"

---

## 📞 需要幫助？ | Need Help?

- Vercel 文件：https://vercel.com/docs
- GA4 說明中心：https://support.google.com/analytics
- GitHub Desktop 教學：https://docs.github.com/en/desktop

---

**恭喜！您的應用程式已經成功部署到雲端！** 🎉

**Congratulations! Your app is now live in the cloud!** 🎉
