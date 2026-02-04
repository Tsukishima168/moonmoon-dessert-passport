# n8n 自動化流程建議｜月島甜點護照

用 n8n 把重複、麻煩的步驟自動化，你只需偶爾檢查結果。以下流程都不需要改網站程式，只要在 n8n 裡接好服務即可。

---

## 一、GA4 → 每週來源報表（最推薦）

**目的**：不用每天開 GA4，每週一自動收到「各入口人數 + 測驗完成數」整理好的報表。

**做法**：
- n8n 排程（每週一早上）→ 呼叫 **Google Analytics 4** 節點（或 BigQuery 若你有匯出）→ 撈取過去 7 天的：
  - 事件 `entrance_scan` 依 `entrance_source` 分組（door / line / ig / counter 等）
  - 事件 `quiz_completed` 次數
  - 事件 `quiz_started` 次數（可算完成率）
- 把結果寫進 **Google Sheets**（一週一列：日期、door、line、ig、quiz_started、quiz_completed）或 **Email**（寄給自己一封摘要）。

**你需要**：GA4 資源的服務帳戶 / API、n8n 的 Google 帳號連線、Google Sheets 或 SMTP。

**好處**：門口／LINE／IG 各放多少人就一目了然，不用手動查 GA4。

---

## 二、LINE 官方帳號：關鍵字自動回覆（隱藏彩蛋）

**目的**：使用者傳「角色名稱」領隱藏彩蛋時，自動回覆一段話，不用人工一直回。

**做法**：
- LINE 開發者後台設定 **Webhook** 指向 n8n 的 **Webhook** 節點。
- n8n 流程：收到 LINE 訊息 → 判斷是否為角色名稱（月島守護者、深夜詩人、閃光探險家、甜美治癒師）或關鍵字 → 是的話用 **LINE** 節點回傳固定文案（例如：「已收到！請查收限定桌布與來自月島的一封信 💌」）。

**你需要**：LINE Login / Messaging API、n8n 可對外網址（ngrok 或 n8n cloud）。

**好處**：半夜或忙的時候也有人掃描、傳角色名，系統自動回，不會漏。

---

## 三、LINE：新好友加入時自動歡迎 + 測驗連結

**目的**：有人加 LINE 官方帳號時，自動發歡迎訊息與測驗連結（帶 UTM），減少手動發。

**做法**：
- LINE Webhook 收到 **follow** 事件 → n8n 用 LINE 節點發送歡迎文 + 測驗連結：  
  `https://moonmoon-dessert-passport.vercel.app/?utm_source=line&utm_medium=oa`

**你需要**：同上，LINE Messaging API + n8n Webhook。

**好處**：每個從 LINE 進來的人都有同一套歡迎與連結，GA4 也會是 line/oa。

---

## 四、每日／每週「門口人數」通知（Slack 或 Email）

**目的**：只關心「今天門口掃了幾人」時，不用開 GA4，直接收一則訊息。

**做法**：
- n8n 排程（每日晚上或每週一）→ GA4 節點撈「當日／當週」`entrance_scan` 且 `entrance_source = door` 的次數 → **Slack** 或 **Email** 節點發送：「今日門口進入 N 人」或「本週門口進入 N 人」。

**你需要**：GA4 API、Slack 或 SMTP。

**好處**：幾秒內知道門口 QR 有沒有在動。

---

## 五、新測驗完成時通知店內（選做）

**目的**：有人剛完成測驗時，店內（例如 Slack 或 LINE 群）即時知道，方便做後續服務或統計。

**做法**：  
目前網站沒有後端，若要接 n8n，需要一個「中繼站」：
- 在網站用 **Google Analytics 4 的 Measurement Protocol** 或 **n8n Webhook**：  
  測驗完成時前端呼叫一個 n8n Webhook（需在網站加一小段 fetch），把 `quiz_completed` 與可選的 `entrance_source` 傳給 n8n。
- n8n 收到 Webhook → 寫入 Google Sheets 或發 Slack：「剛剛有人完成測驗（來源：door）」。

**你需要**：在網站加一筆「測驗完成時呼叫 n8n Webhook」的程式（約幾行），以及 n8n 可對外網址。

**好處**：店內即時感、也可累積成簡單的「完成清單」做日報。

---

## 建議優先順序

| 優先 | 流程 | 減少的麻煩 |
|------|------|------------|
| 1 | **GA4 → 每週來源報表**（Sheets 或 Email） | 不用每天開 GA4 查 door / line / ig 人數 |
| 2 | **LINE 關鍵字自動回覆**（角色名／隱藏彩蛋） | 不用人工回覆「傳角色名領桌布」 |
| 3 | **LINE 新好友歡迎 + 測驗連結** | 不用手動發歡迎與連結 |
| 4 | **每日／每週門口人數通知**（Slack/Email） | 不用開 GA4 看門口數字 |
| 5 | **測驗完成 → 通知店內**（需網站多一個 Webhook） | 即時知道有人完成測驗、可做日報 |

---

## 你需要的帳號／設定總覽

- **n8n**：自架或 [n8n cloud](https://n8n.io)
- **Google**：GA4 資源、Google Sheets、Gmail（若用 Email）
- **LINE**：開發者帳號、Messaging API、Webhook URL
- **Slack**（選用）：一個 Incoming Webhook 或 Bot

若你告訴我「先做哪一個」（例如：只要每週 GA4 報表），我可以把該流程的 n8n 節點順序與欄位寫成更細的步驟，讓你照著在 n8n 裡拉一拉就完成。
