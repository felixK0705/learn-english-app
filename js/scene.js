// 情境圖：仿圖解字典的跨頁場景，編號物件 + 對話泡泡
import { backdropSVG } from './backdrops.js';
import { esc } from './util.js';
import { icon } from './icons.js';

const ROWS = 5;
const PEOPLE = ['🧒', '👧', '👦', '🧑', '👩', '👨', '🧓', '👱‍♀️'];

// 只放 type=word 的單字（片語另列清單）；回傳 { html, items }
export function buildScene(topic) {
  const words = topic.words.map((w, i) => ({ ...w, i })).filter(w => w.type !== 'phrase');
  const bubbles = topic.sentences.slice(0, 2);
  const need = words.length + 4 + bubbles.length * 3;
  const cols = Math.max(9, Math.ceil(need / ROWS));
  const used = new Set();
  const cell = (r, c) => `${r},${c}`;
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([r, c]) => used.add(cell(r, c))); // 左上角標題
  const slots = [[0, Math.floor(cols * 0.42)], [2, cols - 3]];
  const bubbleHtml = bubbles.map((s, k) => {
    const [r, c] = slots[k];
    used.add(cell(r, c)); used.add(cell(r, c + 1)); used.add(cell(r + 1, c + 1));
    const person = PEOPLE[(topic.id.length + k * 3) % PEOPLE.length];
    return `<button class="sb" data-say="${esc(s.en)}" style="left:${(c / cols) * 100 + 0.6}%;top:${7 + (r / ROWS) * 88 - 3}%;width:${(2 / cols) * 100 - 1.4}%">
        <span class="sb-en">${esc(s.en)}</span><span class="sb-zh">${esc(s.zh)}</span>${icon('volume-2', 'sb-ic')}</button>
      <span class="sp" style="left:${((c + 1.25) / cols) * 100}%;top:${7 + ((r + 1.15) / ROWS) * 88}%">${person}</span>`;
  }).join('');

  // 依直欄由上而下、由左而右擺放（像書本的閱讀順序）
  const free = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < ROWS; r++) if (!used.has(cell(r, c))) free.push([r, c]);
  const step = free.length / Math.max(words.length, 1);
  let seed = topic.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 7);
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const itemsHtml = words.map((w, n) => {
    const [r, c] = free[Math.min(free.length - 1, Math.floor(n * step))];
    const x = (Math.min(Math.max(c + 0.5 + (rand() - 0.5) * 0.12, 0.62), cols - 0.66) / cols) * 100;
    const y = 7 + ((r + 0.42 + (rand() - 0.5) * 0.12) / ROWS) * 88; // 上下留白，避免最上排被裁切
    return `<button class="si" data-i="${w.i}" style="left:${x}%;top:${y}%;--d:${n * 12}ms" aria-label="${esc(w.en)} ${esc(w.zh)}">
        <span class="si-pic">${w.emoji}</span>
        <span class="si-label"><b class="si-no">${n + 1}</b>${esc(w.en)}</span>
        <span class="si-zh">${esc(w.zh.split(/[；;、]/)[0])}</span></button>`;
  }).join('');

  const html = `<div class="scene-wrap"><div class="scene">
    <div class="scene-canvas" style="--cols:${cols};aspect-ratio:${cols}/${ROWS * 1.22}">
      ${backdropSVG(topic.backdrop)}
      <div class="sc-title"><div class="sc-title-in">
        <h2>${esc(topic.title)}</h2><p>${esc(topic.zh)}</p>
        <button class="sc-find" data-act="find">${icon('scan-search')}找找看</button>
      </div></div>
      ${bubbleHtml}${itemsHtml}
      <div class="pop" hidden></div>
    </div></div>
    <div class="scene-fade" aria-hidden="true"></div></div>`;
  return { html, items: words, cols };
}
