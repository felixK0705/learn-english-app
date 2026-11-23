# 主題資料格式 (data/topics/<id>.json)

```json
{
  "id": "family",                 // 與檔名相同，小寫 kebab-case
  "title": "Family",              // 英文標題
  "zh": "家庭",                    // 中文標題（繁體）
  "emoji": "👨‍👩‍👧",                // 主題代表 emoji
  "backdrop": "home",             // 情境背景，見下方清單
  "intro": "認識家人的稱呼，介紹自己的家庭。",
  "words": [
    { "en": "grandfather", "kk": "ˋgrændˏfɑðɚ", "zh": "祖父；外祖父", "emoji": "👴", "type": "word",
      "ex": "My grandfather is seventy years old.", "exZh": "我的爺爺七十歲。" },
    { "en": "take care of", "kk": "", "zh": "照顧", "emoji": "🤲", "type": "phrase",
      "ex": "I take care of my little sister.", "exZh": "我照顧我的妹妹。" }
  ],
  "sentences": [
    { "en": "This is a photo of my family.", "zh": "這是我的全家福照片。", "note": "介紹家人時" }
  ],
  "dialogues": [
    { "title": "看家庭照片", "lines": [
      { "who": "A", "en": "Who is this?", "zh": "這是誰？" },
      { "who": "B", "en": "She is my aunt.", "zh": "她是我的阿姨。" }
    ] }
  ]
}
```

- `type`: `word`（單字）或 `phrase`（片語）
- `kk`: KK 音標（不含方括號，用 ˋ 表主重音、ˏ 表次重音）；片語可留空
- `backdrop` 可用值：home, kitchen, bedroom, bathroom, classroom, city, street, shop,
  restaurant, park, farm, zoo, sea, forest, sky, space, night, hospital, airport,
  stadium, party, office, garden, snow, music

新增主題後執行 `node tools/build-index.mjs` 更新索引與離線快取清單。
