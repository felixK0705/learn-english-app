#!/usr/bin/env node
// 掃描 data/topics/*.json，產生 data/index.json、data/search.json 與 precache-manifest.js
// 用法：node tools/build-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const topicDir = path.join(root, 'data/topics');
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));

const files = fs.readdirSync(topicDir).filter(f => f.endsWith('.json')).sort();
const topics = {};
const problems = [];
for (const f of files) {
  const id = f.replace(/\.json$/, '');
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(topicDir, f), 'utf8')); }
  catch (e) { problems.push(`${f}: JSON 解析失敗 ${e.message}`); continue; }
  if (d.id !== id) problems.push(`${f}: id "${d.id}" 與檔名不同`);
  d.words ||= []; d.sentences ||= []; d.dialogues ||= [];
  const seen = new Set();
  for (const w of d.words) {
    for (const k of ['en', 'zh', 'emoji', 'type']) if (!w[k]) problems.push(`${f}: "${w.en}" 缺少 ${k}`);
    const key = (w.en || '').toLowerCase();
    if (seen.has(key)) problems.push(`${f}: 重複單字 "${w.en}"`);
    seen.add(key);
  }
  topics[id] = d;
}

// 未分類主題自動放到「更多主題」
const listed = new Set(categories.flatMap(c => c.topics));
const extra = Object.keys(topics).filter(id => !listed.has(id));
if (extra.length) {
  categories.push({ id: 'more', zh: '更多主題', en: 'More', emoji: '✨', color: '#26a69a', soft: '#d7f2ef', topics: extra });
}

const totals = { topics: 0, words: 0, phrases: 0, sentences: 0, dialogues: 0 };
const search = [];
const index = {
  generated: new Date().toISOString(),
  categories: categories.map(c => ({
    ...c,
    topics: c.topics.filter(id => {
      if (!topics[id]) { problems.push(`categories.json 列出 "${id}"，但找不到檔案`); return false; }
      return true;
    }).map(id => {
      const d = topics[id];
      const words = d.words.filter(w => w.type !== 'phrase').length;
      const phrases = d.words.length - words;
      totals.topics++; totals.words += words; totals.phrases += phrases;
      totals.sentences += d.sentences.length; totals.dialogues += d.dialogues.length;
      d.words.forEach((w, i) => search.push([w.en, w.zh, w.emoji, id, w.type === 'phrase' ? 'p' : 'w', i]));
      d.sentences.forEach((s, i) => search.push([s.en, s.zh, '💬', id, 's', i]));
      return { id, title: d.title, zh: d.zh, emoji: d.emoji, icon: fs.existsSync(path.join(root, 'icons', 'topics', id + '.svg')) ? `icons/topics/${id}.svg` : undefined, backdrop: d.backdrop, intro: d.intro,
        counts: { words, phrases, sentences: d.sentences.length, dialogues: d.dialogues.length } };
    })
  })).filter(c => c.topics.length)
};
totals.entries = totals.words + totals.phrases + totals.sentences;
index.totals = totals;

fs.writeFileSync(path.join(root, 'data/index.json'), JSON.stringify(index, null, 1));
fs.writeFileSync(path.join(root, 'data/search.json'), JSON.stringify(search));

// 離線快取清單
const staticFiles = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css',
  ...fs.readdirSync(path.join(root, 'js')).map(f => 'js/' + f),
  ...fs.readdirSync(path.join(root, 'icons')).filter(f => f.includes('.')).map(f => 'icons/' + f),
  ...['topics', 'cats'].flatMap(d => fs.readdirSync(path.join(root, 'icons', d)).filter(f => f.endsWith('.svg')).map(f => `icons/${d}/` + f)),
  ...fs.readdirSync(path.join(root, 'scenes')).filter(f => f.endsWith('.svg')).map(f => 'scenes/' + f),
  'data/index.json', 'data/search.json', ...files.map(f => 'data/topics/' + f)];
const hash = crypto.createHash('sha1');
for (const f of staticFiles) if (f !== './') hash.update(fs.readFileSync(path.join(root, f)));
const version = hash.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(root, 'precache-manifest.js'),
  `// 自動產生，請勿手動編輯（node tools/build-index.mjs）\nself.CACHE_VERSION = ${JSON.stringify(version)};\nself.PRECACHE = ${JSON.stringify(staticFiles, null, 1)};\n`);

console.log(`主題 ${totals.topics}｜單字 ${totals.words}｜片語 ${totals.phrases}｜句型 ${totals.sentences}｜對話 ${totals.dialogues}｜合計 ${totals.entries} 筆`);
console.log(`快取版本 ${version}`);
if (problems.length) { console.log(`\n⚠️ ${problems.length} 個問題：`); problems.forEach(p => console.log('  - ' + p)); process.exitCode = 1; }
