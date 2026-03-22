# GA4 / OMO 連結放置位置一覽

所有對外的護照入口連結請依下表使用對應 UTM，即可在 GA4 依**放置位置**分析來源與人數。  
以下連結已填入正式網址 **https://moonmoon-dessert-passport.vercel.app**，可直接複製使用。

---

## 一、線下／實體（OMO 到店觸點）

| 放置位置 | utm_source | utm_medium | 完整連結 | 分析用途 |
|----------|-------------|------------|----------|----------|
| **門口大門 QR** | `door` | `qr` | https://moonmoon-dessert-passport.vercel.app/?utm_source=door&utm_medium=qr | 從大門進入的人數 |
| **櫃檯／結帳區 QR** | `counter` | `qr` | https://moonmoon-dessert-passport.vercel.app/?utm_source=counter&utm_medium=qr | 結帳時掃描人數 |
| **桌牌／桌上 QR** | `table` | `qr` | https://moonmoon-dessert-passport.vercel.app/?utm_source=table&utm_medium=qr | 座位區觸及人數 |
| **店內海報／立牌** | `poster` | `qr` | https://moonmoon-dessert-passport.vercel.app/?utm_source=poster&utm_medium=qr | 海報轉換人數 |
| **店內秘密角落 #1**（集章用） | `secret1` | `qr` | https://moonmoon-dessert-passport.vercel.app/?stamp=secret1&utm_source=secret1&utm_medium=qr | 秘密 QR 掃描數（同時解鎖印章） |
| **店內秘密角落 #2**（集章用） | `secret2` | `qr` | https://moonmoon-dessert-passport.vercel.app/?stamp=secret2&utm_source=secret2&utm_medium=qr | 同上 |

---

## 二、LINE

| 放置位置 | utm_source | utm_medium | 完整連結 | 分析用途 |
|----------|-------------|------------|----------|----------|
| **LINE 官方帳號主選單／圖文選單** | `line` | `oa` | https://moonmoon-dessert-passport.vercel.app/?utm_source=line&utm_medium=oa | OA 選單帶入人數 |
| **LINE 貼文／動態** | `line` | `social` | https://moonmoon-dessert-passport.vercel.app/?utm_source=line&utm_medium=social | 貼文導流人數 |
| **LINE 一對一發送（客服／DM）** | `line` | `dm` | https://moonmoon-dessert-passport.vercel.app/?utm_source=line&utm_medium=dm | 私訊導流人數 |
| **LINE 廣告** | `line` | `cpc` | https://moonmoon-dessert-passport.vercel.app/?utm_source=line&utm_medium=cpc&utm_campaign=廣告名稱 | 廣告成效 |

---

## 三、Instagram

| 放置位置 | utm_source | utm_medium | 完整連結 | 分析用途 |
|----------|-------------|------------|----------|----------|
| **IG 主頁連結** | `ig` | `profile` | https://moonmoon-dessert-passport.vercel.app/?utm_source=ig&utm_medium=profile | 主頁導流人數 |
| **IG 限動／貼文連結** | `ig` | `social` | https://moonmoon-dessert-passport.vercel.app/?utm_source=ig&utm_medium=social | 限動／貼文導流人數 |
| **IG 廣告** | `ig` | `cpc` | https://moonmoon-dessert-passport.vercel.app/?utm_source=ig&utm_medium=cpc&utm_campaign=廣告名稱 | 廣告成效 |

---

## 四、其他線上

| 放置位置 | utm_source | utm_medium | 完整連結 | 分析用途 |
|----------|-------------|------------|----------|----------|
| **官方網站／部落格** | `website` | `referral` | https://moonmoon-dessert-passport.vercel.app/?utm_source=website&utm_medium=referral | 官網導流 |
| **Facebook 貼文** | `fb` | `social` | https://moonmoon-dessert-passport.vercel.app/?utm_source=fb&utm_medium=social | FB 導流 |
| **EDM／電子報** | `edm` | `email` | https://moonmoon-dessert-passport.vercel.app/?utm_source=edm&utm_medium=email&utm_campaign=檔期名稱 | 電子報成效 |
| **KOL／合作貼文** | `kol` | `social` | https://moonmoon-dessert-passport.vercel.app/?utm_source=kol&utm_medium=social&utm_campaign=合作名稱 | 合作導流 |

---

## 五、活動／檔期（utm_campaign 範例）

同一放置位置若有不同檔期，可加 `utm_campaign` 區分：

| 範例 | 連結參數 |
|------|----------|
| 開幕活動 | `&utm_campaign=open_2025` |
| 週年慶 | `&utm_campaign=anniversary` |
| 節慶（如中秋） | `&utm_campaign=midautumn` |

例：門口 QR 開幕檔期  
https://moonmoon-dessert-passport.vercel.app/?utm_source=door&utm_medium=qr&utm_campaign=open_2025

---

## 六、GA4 怎麼看

- **所有來源**：報表 → **互動** → **事件** → 選 `entrance_scan` → 次要維度選 **`entrance_source`**（或 `entrance_medium`），即可依放置位置切分人數。
- **單一來源**：探索 → 篩選 `entrance_scan` 且 `entrance_source` = 上表的 `utm_source`（如 `door`、`line`、`ig`）。
- **護照互動**：可另外看 `passport_opened`、`stamp_unlocked` 等事件，搭配 UTM 分析來源後續互動。
- **流量總覽**：報表 → **獲取** → **流量開發**；GA4 會依 UTM 帶入「來源／媒介／活動」，與上表對應即可。

---

## 七、網址說明

- 以上連結已使用正式網址 **https://moonmoon-dessert-passport.vercel.app**，可直接複製貼到 QR Code 產生器、LINE／IG／海報使用。
- 若日後改用自有網域，再以新網址替換上述連結即可。
