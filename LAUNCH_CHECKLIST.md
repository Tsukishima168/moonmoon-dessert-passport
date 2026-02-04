# 月島甜點護照｜上線檢查清單

上線前請依此清單確認內容與設定，確保 MVP 可順利對外測試。

---

## 一、內容與流程

### 1. 首頁 (Landing)
- [ ] 主標「Don't Hesitate to Eat!」與副標顯示正常
- [ ] 「Begin Journey」上滑可開啟選單
- [ ] 選單內「Enter Exhibition」可進入測驗
- [ ] 選單內 MBTI、Line 連結可開啟且為正確網址
- [ ] Header：Logo、護照按鈕、IG、Pass 連結皆可點且正確

### 2. 測驗 (Quiz)
- [ ] 三題皆可正常選擇並進入下一題
- [ ] Zone 標題與進度條顯示正確（1/3、2/3、3/3）
- [ ] 「Cancel & Return」可回到首頁
- [ ] 完成第三題後會進入結果頁

### 3. 結果頁 (Result)
- [ ] 角色名稱、角色圖、描述顯示正確
- [ ] 「Your Mission」區塊：截圖出示給店員、領限定小貼紙
- [ ] **O2O 到店這樣做**：三步驟與首次到店優惠文案顯示正常
- [ ] Soul Food 甜點 + 推薦飲品顯示正常
- [ ] 「加 LINE 領取登島紀念與折扣」按鈕連結正確
- [ ] 隱藏彩蛋：複製角色名稱、說明文案正確
- [ ] 「前往導覽區」連結正確
- [ ] 深度 MBTI、前往店舖、追蹤 IG、重測一次 皆可點且連結正確

### 4. 護照 (Passport)
- [ ] 從 Header 可開啟護照
- [ ] 收集進度 X/10 與進度條正確
- [ ] **到店使用方式**：掃店內 QR、出示階段獎勵給店員
- [ ] 溫馨提醒（同一支手機）顯示
- [ ] 10 枚印章列表與解鎖方式說明正確
- [ ] 階段獎勵 3/5/7/10 章內容與兌換方式正確
- [ ] 10 章「前往 LINE@ 領取兌換券」連結正確
- [ ] 密碼印章（MBTI、Google 評論）輸入邏輯可測（若需驗證）

### 5. 連結總覽（constants.tsx）
- [ ] `LINKS.MBTI_TEST`：MBTI 測驗網址
- [ ] `LINKS.LINE_OA`：月島官方 LINE
- [ ] `LINKS.INSTAGRAM`：IG 帳號
- [ ] `LINKS.GOOGLE_MAPS`：店舖地圖
- [ ] `LINKS.NAVIGATION`：導覽區網址

---

## 二、技術與部署

### 1. 本機驗證
- [ ] `npm install` 成功
- [ ] `npm run build` 成功
- [ ] `npm run preview` 本地預覽正常（測一遍完整流程）

### 2. 對外連結與環境
- [ ] 不需後端即可完整使用（測驗、結果、護照、O2O 文案）
- [ ] 若未來會用 Gemini：Vercel 環境變數 `GEMINI_API_KEY` 可選填，目前 MVP 可不設

### 3. GA4（index.html）
- [ ] 已填入正確的 Measurement ID（目前為 `G-ZF71VP9Z8Y`）
- [ ] 上線後到 GA4 即時報表確認：quiz_started、quiz_completed、result_viewed、passport_opened 等事件有進線

### 4. 分享預覽（選填）
- [ ] `index.html` 已含 meta description 與 og 標籤
- [ ] 用 LINE / FB 分享連結時，標題與描述顯示符合預期
- [ ] 若有需要可替換 favicon（目前為預設圖）

### 5. Vercel 部署
- [ ] 專案已推送到 GitHub
- [ ] Vercel 已從 GitHub 匯入專案
- [ ] Framework 偵測為 Vite，Build/Output 為 `npm run build` / `dist`
- [ ] 部署成功後，用正式網址從頭走一遍：首頁 → 測驗 → 結果 → 護照 → O2O 說明

---

## 三、O2O 流程（MVP 確認）

- [ ] **線上**：測驗完成 → 結果頁有「到店這樣做」三步驟
- [ ] **線上**：護照頁有「到店使用方式」（掃 QR、出示獎勵）
- [ ] **線下**：顧客可依結果頁出示畫面領貼紙；依護照頁出示獎勵區兌換
- [ ] 店內 QR 連結格式已備妥（例：`?stamp=secret1`、`?stamp=secret2`），張貼後可實際掃描測試

---

## 四、上線後建議第一次檢查

1. 用手機開啟正式網址，跑完：首頁 → 測驗 → 結果 → 護照
2. 確認 GA4 即時報表有事件
3. 分享連結到 LINE，確認預覽標題/描述/圖片
4. 若有店內 QR，實際掃一次確認可解鎖對應印章

---

完成以上勾選即可視為 **MVP 已就緒，可對外開放測試**。後續再依數據與回饋迭代（例如限時優惠碼、到店打卡等）。
