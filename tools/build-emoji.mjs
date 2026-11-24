// 把資料中用到的 emoji 換成 OpenMoji 插圖（CC BY-SA 4.0），描邊改成繪本咖啡色
// 用法：npm pack openmoji 解壓到 /tmp/om 後執行 node tools/build-emoji.mjs [openmoji color/svg 目錄]
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = process.argv[2] || '/tmp/om/package/color/svg';
const out = path.join(root, 'icons', 'e');
fs.mkdirSync(out, { recursive: true });
const used = new Set();
const grab = s => { for (const m of String(s).matchAll(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier}|️?⃣)*|[#*0-9]️?⃣/gu)) used.add(m[0]); };
for (const f of fs.readdirSync(path.join(root, 'data', 'topics'))) {
  const t = JSON.parse(fs.readFileSync(path.join(root, 'data', 'topics', f), 'utf8'));
  grab(t.emoji); t.words.forEach(w => grab(w.emoji));
  if (t.scene) JSON.stringify(t.scene.people || []).replace(/"([^"]*)"/g, (_, s) => grab(s));
}
JSON.parse(fs.readFileSync(path.join(root, 'data', 'categories.json'), 'utf8')).forEach(c => grab(c.emoji));
['🤔', '🏆', '📚', '💬', '⭐', '✨', '🎉'].forEach(grab);
const code = e => [...e].map(c => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
const have = [];
for (const e of used) {
  const cps = code(e);
  const cands = [cps.join('-'), cps.filter(c => c !== 'FE0F').join('-')];
  const hit = cands.find(c => fs.existsSync(path.join(src, c + '.svg')));
  if (!hit) continue;
  let svg = fs.readFileSync(path.join(src, hit + '.svg'), 'utf8');
  svg = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s*id="[^"]*"/g, '').replace(/#000000|#000\b/gi, '#6b4a36').replace(/\n\s*/g, '');
  const name = cps.filter(c => c !== 'FE0F').join('-').toLowerCase();
  fs.writeFileSync(path.join(out, name + '.svg'), svg);
  have.push(name);
}
fs.writeFileSync(path.join(root, 'js', 'emoji-list.js'), `// 自動產生（node tools/build-emoji.mjs）：有插圖的 emoji 檔名\nexport const EMOJI = new Set(${JSON.stringify(have.sort())});\n`);
console.log(`emoji used ${used.size}, drawn ${have.length}`);
