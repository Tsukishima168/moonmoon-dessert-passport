# GA4 門口 QR 與來源追蹤

用來區分「從大門進入」的測驗人數，請將門口 QR Code 指向下方專用連結。

**所有放置位置（門口／櫃檯／LINE／IG／海報等）與完整 UTM 一覽** → 請見 [GA4_連結放置位置一覽.md](./GA4_連結放置位置一覽.md)。

---

## 門口 QR Code 請用這個連結

請將**門口（大門）**的 QR Code 連結設為：

```
https://passport.kiwimu.com/?utm_source=door&utm_medium=qr
```

（已填入正式網址，可直接使用。）

### 參數說明

| 參數 | 值 | 說明 |
|------|-----|------|
| `utm_source` | `door` | 來源＝門口（大門） |
| `utm_medium` | `qr` | 媒介＝QR Code |

GA4 會自動帶入 UTM，並在進入時多送一個自訂事件 `entrance_scan`，方便單獨統計「門口進入」人數。

---

## 在 GA4 怎麼看「從大門進入」的人數

### 方法一：看事件（推薦）

1. 左側 **報表** → **互動** → **事件**
2. 找到事件 **`entrance_scan`**
3. 點進去可看觸發次數（＝掃門口 QR 進入的次數）
4. 可加次要維度 **`entrance_source`**，篩選 `door` 即為門口來源

### 方法二：看流量來源

1. 左側 **報表** → **獲取** → **使用者開發**或**流量開發**
2. 主要維度選 **工作階段來源** 或 **首次使用者來源**
3. 若門口 QR 使用上述連結，來源會出現 **door**（或顯示為 `door / qr`）
4. 可依此看「來自 door 的工作階段數」＝從門口進入的造訪數

### 方法三：自訂探索

1. **探索** → 新增 **空白** 報表
2. 維度：`事件名稱`、`entrance_source`
3. 指標：`事件計數` 或 `使用者`
4. 篩選：`事件名稱` = `entrance_scan` 且 `entrance_source` = `door`

---

## 其他 QR / 來源（選用）

若之後有「店內其他 QR」「LINE 貼文」等，可再開不同來源，例如：

| 用途 | 建議連結（替換網址） |
|------|------------------------|
| 門口大門 | `?utm_source=door&utm_medium=qr` |
| 店內 A 區 | `?utm_source=store_a&utm_medium=qr` |
| LINE 貼文 | `?utm_source=line&utm_medium=social` |

目前程式會對**所有帶 `utm_source` 的進入**發送 `entrance_scan` 事件（`entrance_source` = utm_source），因此門口、LINE、IG、櫃檯等任一放置位置都可依 `entrance_source` 在 GA4 分析。
