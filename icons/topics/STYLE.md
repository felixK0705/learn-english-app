# 主題圖示規範

每個主題一個 `icons/topics/<topicId>.svg`，在首頁主題卡片的白色圓形裡顯示（約 76×76px，手機上約 52px）。範例：`icons/topics/kitchen.svg`（請先打開看）。

- `viewBox="0 0 96 96"`，主體佔約 64×64，置中，四周留白 12–16。
- 繪本扁平風，與情境插圖同一系列：描邊 `stroke="#6b4a36"`，`stroke-width="3"`，`stroke-linejoin="round" stroke-linecap="round"`。
- 每個圖示**一個主體物件**（最多再加一兩個小配件），造型圓潤可愛、比例略胖。不要人臉寫實、不要細碎細節，縮小到 48px 仍要一眼認得。
- 配色只用這組（可用淺色版作亮面）：珊瑚紅 #ff7a5c、橘 #ffa94d、黃 #ffd23f、薄荷綠 #6cc5a0、草綠 #8bc96a、天藍 #6ab8e8、藍 #4d7fd6、紫 #a58de0、粉紅 #ff9eb5、膚色 #ffe0c4、木頭 #e6b27a、白 #ffffff、淺灰 #e9e5df、深咖啡 #6b4a36（只用於描邊與小細節）。
- 每個圖示主色要和同一頁其他圖示有變化，但整體色調柔和、一致。
- 可以加白色半透明亮點（`opacity=".55"`，無描邊）增加立體感，像範例的鍋子。
- 不要文字、不要漸層、不要陰影濾鏡、不要外部資源、不要背景底色（背景由卡片提供）。
- 圖示要能代表整個主題（例如 airport → 飛機、family → 三口之家的房子或手牽手的人偶、numbers → 數字積木 1 2 3、feelings → 笑臉加愛心）。人物可畫成圓頭小人（膚色圓臉、兩點眼睛、腮紅），風格與 js/characters.js 一致。

## 預覽與檢查

本機伺服器 `http://localhost:8765`（若沒在跑：在專案根目錄背景執行 `python3 -m http.server 8765`）。
用 Playwright 截圖 `http://localhost:8765/tools/icon-preview.html`（建議 viewport 寬 1100、deviceScaleFactor 2、fullPage），它會把每個主題的圖示放在卡片白圓裡，並附上 32px、20px 的縮小版。**一定要用 Read 打開截圖親眼看**：同一系列感、認得出來、縮小後仍清楚、顏色和諧不刺眼。不滿意就改到滿意。

分類圖示放在 `icons/cats/<categoryId>.svg`，規範相同（people 人與社交、home 居家生活、food 美食飲料、school 學校與休閒、town 城市與旅行、nature 自然與知識）。
