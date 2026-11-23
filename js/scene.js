// 情境圖：仿圖解字典的跨頁場景，編號物件 + 對話泡泡
import { backdropSVG } from './backdrops.js';
import { esc } from './util.js';

const ROWS = 5;
const PEOPLE = ['🧒', '👧', '👦', '🧑', '👩', '👨', '🧓', '👱‍♀️'];

// 回傳 { html, items }，items 依編號排列（只放 type=word，片語放在下方清單）
export function buildScene(topic, color) {
  const words = topic.words.map((w, i) => ({ ...w, i })).filter(w => w.type !== 'phrase');
  const bubbles = topic.sentences.slice(0, 2);
  const need = words.length + 4 + bubbles.length * 3;
  const cols = Math.max(10, Math.ceil(need / ROWS));
  const used = new Set();
  const cell = (r, c) => `${r},${c}`;
  // 左上角標題圓
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([r, c]) => used.add(cell(r, c)));
  // 泡泡位置：一個在上方中間，一個在右下
  const slots = [[0, Math.floor(cols * 0.42)], [2, cols - 3]];
  const bubbleHtml = bubbles.map((s, k) => {
    const [r, c] = slots[k];
    used.add(cell(r, c)); used.add(cell(r, c + 1)); used.add(cell(r + 1, c + 1));
    const person = PEOPLE[(topic.id.length + k * 3) % PEOPLE.length];
    const x = (c / cols) * 100, y = (r / ROWS) * 100;
    return `<button class="sb" data-say="${esc(s.en)}" style="left:${x + 0.5}%;top:${y + 2}%;width:${(2 / cols) * 100 - 1.5}%">
        <span class="sb-en">${esc(s.en)}</span><span class="sb-zh">${esc(s.zh)}</span></button>
      <span class="sp" style="left:${((c + 1.2) / cols) * 100}%;top:${((r + 1.15) / ROWS) * 100}%">${person}</span>`;
  }).join('');

  // 依直欄由上而下、由左而右擺放（像書本的閱讀順序）
  const free = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < ROWS; r++) if (!used.has(cell(r, c))) free.push([r, c]);
  // 物件少時平均分散
  const step = free.length / Math.max(words.length, 1);
  let seed = topic.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 7);
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const itemsHtml = words.map((w, n) => {
    const [r, c] = free[Math.min(free.length - 1, Math.floor(n * step))];
    const x = ((Math.min(Math.max(c + 0.5 + (rand() - 0.5) * 0.25, 0.62), cols - 0.68)) / cols) * 100;
    const y = ((r + 0.42 + (rand() - 0.5) * 0.2) / ROWS) * 100;
    return `<button class="si" data-i="${w.i}" style="left:${x}%;top:${y}%;--d:${n * 25}ms">
        <span class="si-pic">${w.emoji}</span>
        <span class="si-label"><b class="si-no">${n + 1}</b>${esc(w.en)}</span>
        <span class="si-zh">${esc(w.zh.split(/[；;]/)[0])}</span></button>`;
  }).join('');

  const html = `<div class="scene" style="--c:${color}">
    <div class="scene-canvas" style="--cols:${cols};aspect-ratio:${cols}/${ROWS * 1.12}">
      ${backdropSVG(topic.backdrop)}
      <div class="sc-title"><div class="sc-title-in">
        <h2>${esc(topic.title)}</h2><p>${esc(topic.zh)}</p>
        <div class="sc-ctrl">
          <button data-act="playall" title="依序朗讀全部">▶</button>
          <button data-act="stop" title="停止">■</button>
          <button data-act="find" title="找找看">🔎</button>
        </div></div></div>
      ${bubbleHtml}${itemsHtml}
    </div></div>`;
  return { html, items: words };
}
