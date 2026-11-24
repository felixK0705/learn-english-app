# 📖 情境英語圖鑑 Picture English

結合**生活情境插圖**的英語學習 PWA。仿照圖解字典的跨頁場景，把單字、片語與會話句型放進日常情境裡，點圖片就能聽發音。

## 功能
- **54 個生活主題、2700+ 筆內容**：單字（附 KK 音標、例句）、片語、實用句型、情境對話
- **🖼️ 情境圖**：仿圖解字典的跨頁場景，編號物件＋對話泡泡；**點任何一個單字就唸那個字**，並顯示音標／中文小卡；「找找看」聽音找圖遊戲
- **🔤 單字片語**：點卡片即發音，可篩選單字／片語／收藏，例句詳細頁
- **💬 會話**：實用句型（附使用時機）與雙人對話，每一句都可單獨點擊發音
- **✏️ 練習**：看圖選字、聽音辨圖、中翻英、拼字、句子重組
- **🃏 複習**：間隔重複（Leitner）字卡，收藏與答錯的字自動排入
- **🔍 搜尋**：英文／中文全文搜尋
- **⭐ 我的**：連續天數、學習圖表、語速／口音／音標設定、匯出匯入紀錄
- **PWA**：可安裝到主畫面，全部內容離線可用；發音優先使用裝置內建語音（Web Speech API），無英文語音時自動改用線上真人發音
- **介面**：桌機為左側導覽列、手機為底部分頁列；Lucide 圖示；支援深色模式

## 本機執行
純靜態網站，不需要建置工具：
```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```
可直接部署到 GitHub Pages、Netlify、Vercel 等任何靜態主機（需 HTTPS 才能安裝 PWA）。

## 新增內容
1. 依照 [`data/SCHEMA.md`](data/SCHEMA.md) 在 `data/topics/` 新增 `<id>.json`
2. 在 `data/categories.json` 把主題 id 加到某個分類（沒加會自動歸到「更多主題」）
3. 執行 `node tools/build-index.mjs`：檢查資料、更新索引、搜尋資料與離線快取版本

## 專案結構
```
index.html, manifest.webmanifest, sw.js   PWA 外殼與 Service Worker
css/app.css                               樣式
js/app.js        路由與各頁面          js/scene.js      情境圖排版
js/icons.js      Lucide 圖示（內嵌）
js/backdrops.js  情境背景 SVG 插畫     js/quiz.js       測驗
js/store.js      學習紀錄（localStorage） js/speech.js   語音朗讀
data/topics/*.json  主題內容            tools/build-index.mjs  索引產生器
```

## 授權與出處

- 單字插圖：改作自 [OpenMoji](https://openmoji.org)（CC BY-SA 4.0），描邊顏色改為繪本咖啡色。`icons/e/` 內的檔案依 CC BY-SA 4.0 釋出。重新產生：`npm pack openmoji` 解壓到 `/tmp/om` 後執行 `node tools/build-emoji.mjs`。
- 介面圖示：[Lucide](https://lucide.dev)（ISC）。
- 情境插圖、主題圖示與人物：本專案原創。
