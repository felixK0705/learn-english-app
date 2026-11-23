# 📖 情境英語圖鑑 Picture English

結合**生活情境插圖**的英語學習 PWA。仿照圖解字典的跨頁場景，把單字、片語與會話句型放進日常情境裡，點圖片就能聽發音。

## 功能
- **54 個生活主題、2700+ 筆內容**：單字（附 KK 音標、例句）、片語、實用句型、情境對話
- **🖼️ 情境圖**：可左右滑動的跨頁場景，編號物件＋對話泡泡；▶ 依序朗讀、🔎「找找看」遊戲
- **🔤 單字片語**：字卡清單，可篩選單字／片語／收藏
- **💬 會話**：實用句型（附使用時機）與雙人對話播放
- **✏️ 練習**：看圖選字、聽音辨圖、中翻英、拼字、句子重組
- **🃏 複習**：間隔重複（Leitner）字卡，收藏與答錯的字自動排入
- **🔍 搜尋**：英文／中文全文搜尋
- **⭐ 我的**：連續天數、學習圖表、語速／口音／音標設定、匯出匯入紀錄
- **PWA**：可安裝到主畫面，全部內容離線可用；發音使用裝置內建語音（Web Speech API）

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
js/backdrops.js  情境背景 SVG 插畫     js/quiz.js       測驗
js/store.js      學習紀錄（localStorage） js/speech.js   語音朗讀
data/topics/*.json  主題內容            tools/build-index.mjs  索引產生器
```
