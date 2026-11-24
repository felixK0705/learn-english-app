// 情境圖：仿圖解字典的「跨頁」版面
// 平色書頁 + 左上角四分之一圓標題 + 大插圖（編號、英文、KK、中文）+ 對話泡泡與人物 + 頁碼
import { esc } from './util.js';
import { icon } from './icons.js';
import { store } from './store.js';
import { person } from './characters.js';

const PEOPLE = ['🧒', '👧', '👦', '🧑', '👩', '👨', '🧓', '👱‍♀️'];
// 依場景放入「在做事的人」，讓畫面像書裡的情境，而不是單字貼紙
const CAST = {
  home: ['🧑‍🍼', '👵', '🧒', '🐈'], kitchen: ['🧑‍🍳', '👩‍🍳', '🧒', '🐈'], bedroom: ['😴', '🧸', '🧒'],
  bathroom: ['🛀', '🧒', '🐥'], classroom: ['🧑‍🏫', '🧑‍🎓', '🙋', '🧒'], music: ['🧑‍🎤', '👩‍🎤', '💃', '🕺', '🎶'],
  city: ['🚶', '🚴', '👮', '🧑‍💼'], street: ['🚶‍♀️', '🚴', '👮', '🧒'], shop: ['🛒', '🧑‍💼', '👩‍🦰', '🧒'],
  restaurant: ['🧑‍🍳', '🤵', '😋'], park: ['🏃', '🤸', '🧒', '🐕', '🧺'], garden: ['🧑‍🌾', '🐝', '🦋', '🐌'],
  farm: ['🧑‍🌾', '🐓', '🐑', '🚜'], zoo: ['📸', '🧒', '🎈'], sea: ['🏄', '🤿', '🧒', '⛱️'], forest: ['🥾', '🦌', '🦉'],
  sky: ['🪁', '🧒', '🐦'], space: ['🧑‍🚀', '🛸', '👽'], night: ['🔭', '🧒', '🦉'], hospital: ['🧑‍⚕️', '👩‍⚕️', '🤒'],
  airport: ['🧑‍✈️', '🧳', '🛂'], stadium: ['🏃', '⛹️', '🙌', '📣'], party: ['🥳', '🎉', '💃', '🎈'],
  office: ['🧑‍💻', '🧑‍💼', '☕'], snow: ['⛷️', '⛄', '🧒'],
};

const hash = s => s.split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

// ---------- 插畫場景：完整背景插畫 + 物件定位 + 引線標籤 ----------
// topic.scene = { w, h, bg, items: { en: { x, y, s?, box?:[x,y,w,h], lx, ly, la?:'c'|'l'|'r', line? } }, people: [[emoji,x,y,s,flip?]], bubbles: [{x,y,w,tail:'bl'|'br'|'tl'|'tr'}] }
// 座標單位為畫布像素；x,y 為物件底部中心；s 為 emoji 大小；box 表示物件畫在背景裡，只放可點範圍
function buildIllustrated(topic) {
  const S = topic.scene, W = S.w, H = S.h;
  const px = v => `${(v / W) * 100}%`, py = v => `${(v / H) * 100}%`, cq = v => `${(v / W) * 100}cqw`;
  const showKK = store.settings().showKK;
  const words = topic.words.map((w, i) => ({ ...w, i })).filter(w => S.items[w.en]);
  let lines = '', html = '';
  words.forEach((w, n) => {
    const it = S.items[w.en], no = n + 1;
    const box = it.box;
    // 物件本體（emoji 或背景中的熱區）
    if (box) html += `<button class="si si-box" data-i="${w.i}" style="left:${px(box[0])};top:${py(box[1])};width:${px(box[2])};height:${py(box[3])}" aria-label="${esc(w.en)} ${esc(w.zh)}"></button>`;
    else html += `<button class="si si-obj" data-i="${w.i}" style="left:${px(it.x)};top:${py(it.y)};font-size:${cq(it.s || 64)};--d:${n * 18}ms${it.r ? `;rotate:${it.r}deg` : ''}${it.flip ? ';scale:-1 1' : ''}" aria-label="${esc(w.en)} ${esc(w.zh)}">${w.emoji}</button>`;
    // 標籤
    const la = it.la || 'c';
    html += `<button class="si si-tag la-${la}" data-i="${w.i}" style="left:${px(it.lx)};top:${py(it.ly)}" aria-label="${esc(w.en)}">
      <span class="si-label"><b class="si-no">${no}</b><span class="si-en">${esc(w.en)}</span></span>
      ${showKK && w.kk ? `<span class="si-kk">[${esc(w.kk)}]</span>` : ''}<span class="si-zh">${esc(w.zh.split(/[；;]/)[0])}</span></button>`;
    if (it.line) {
      const [x2, y2] = it.line === true ? (box ? [box[0] + box[2] / 2, box[1] + box[3] / 2] : [it.x, it.y - (it.s || 64) * 0.5]) : it.line;
      lines += `<line x1="${it.lx}" y1="${it.ly + 4}" x2="${x2}" y2="${y2}"/><circle cx="${x2}" cy="${y2}" r="5"/>`;
    }
  });
  // people：emoji 陣列 [emoji,x,y,s,flip]，或繪本人物 { p:{…}, x, y, h, flip }（y 為腳底）
  const people = (S.people || []).map(e => Array.isArray(e)
    ? `<span class="sp-p" style="left:${px(e[1])};top:${py(e[2])};font-size:${cq(e[3])}${e[4] ? ';scale:-1 1' : ''}" aria-hidden="true">${e[0]}</span>`
    : `<span class="sp-p pp-wrap" style="left:${px(e.x)};top:${py(e.y)};width:${cq(e.h * 200 / 320)};height:${cq(e.h)}${e.flip ? ';scale:-1 1' : ''}${e.z ? `;z-index:${e.z}` : ''}" aria-hidden="true">${person(e.p)}</span>`).join('');
  const bubbles = (S.bubbles || []).map((b, k) => {
    const s = topic.sentences[k]; if (!s) return '';
    return `<button class="sb ill t-${b.tail || 'bl'}" data-say="${esc(s.en)}" style="left:${px(b.x)};top:${py(b.y)};width:${px(b.w || 330)}">
      <span class="sb-en">${esc(s.en)}</span><span class="sb-zh">${esc(s.zh)}</span>${icon('volume-2', 'sb-ic')}</button>`;
  }).join('');
  const out = `<div class="scene-wrap"><div class="scene ill-scroll">
    <div class="scene-canvas ill" style="aspect-ratio:${W}/${H}">
      <img class="ill-bg" src="${S.bg}" alt="" draggable="false">
      <svg class="ill-lines" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
      <div class="ill-title"><div class="ill-title-in"><h2>${esc(topic.title)}</h2><p>${esc(topic.zh)}</p>
        <button class="sc-find" data-act="find">${icon('scan-search')}找找看</button></div></div>
      ${people}${html}${bubbles}
    </div></div><div class="scene-fade" aria-hidden="true"></div></div>`;
  return { html: out, items: words };
}

export function buildScene(topic) {
  if (topic.scene) return buildIllustrated(topic);
  const words = topic.words.map((w, i) => ({ ...w, i })).filter(w => w.type !== 'phrase');
  const n = words.length, sents = topic.sentences.slice(0, 2);
  const showKK = store.settings().showKK;
  const cast = CAST[topic.backdrop] || PEOPLE;
  let seed = hash(topic.id);
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // 左頁：標題(2格) + 泡泡(2格)；右頁：泡泡(2格)。讓兩頁格數接近
  const k = Math.max(1, Math.ceil((n - 2) / 2));
  const pages = [words.slice(0, k), words.slice(k)];

  const item = (w, no) => {
    const s = [0.86, 0.98, 1.12, 1.26][Math.floor(rand() * 4)];
    const dx = Math.round((rand() - 0.5) * 22), dy = Math.round((rand() - 0.5) * 22);
    return `<button class="si" data-i="${w.i}" style="--s:${s};--dx:${dx}%;--dy:${dy}%;--d:${no * 14}ms" aria-label="${esc(w.en)} ${esc(w.zh)}">
      <span class="si-pic"><span class="si-ground"></span>${w.emoji}</span>
      <span class="si-label${w.en.length > 11 ? ' long' : ''}"><b class="si-no">${no}</b><span class="si-en">${esc(w.en)}</span></span>
      ${showKK && w.kk ? `<span class="si-kk">[${esc(w.kk)}]</span>` : ''}
      <span class="si-zh">${esc(w.zh.split(/[；;]/)[0])}</span></button>`;
  };
  const bubble = (s, p) => s ? `<div class="sb-cell ${p ? 'flip' : ''}">
      <button class="sb" data-say="${esc(s.en)}"><span class="sb-en">${esc(s.en)}</span><span class="sb-zh">${esc(s.zh)}</span>${icon('volume-2', 'sb-ic')}</button>
      <span class="sp">${PEOPLE[(hash(topic.id) + p * 3) % PEOPLE.length]}</span></div>` : '';
  // 補滿最後一列的「情境人物」（不可點），手機 3 欄、桌機 4 欄分別計算
  // 只補滿最後一列的空格（手機 3 欄、桌機 4 欄分別計算）
  const fillers = cells => {
    const out = [];
    for (const C of [3, 4]) { const need = (C - cells % C) % C; for (let j = 0; j < need; j++) out[j] = (out[j] || []).concat(C); }
    return out.map(cs => `<span class="sx ${cs.map(c => 'on' + c).join(' ')}" aria-hidden="true" style="--dx:${Math.round((rand() - 0.5) * 30)}%">${cast[ci++ % cast.length]}</span>`).join('');
  };
  const PER = 5; // 每 5 個物件穿插一位情境人物
  const extra = list => Math.floor(list.length / PER);
  const cells = [pages[0].length + 4 + extra(pages[0]), pages[1].length + 2 + extra(pages[1])];
  let ci = seed;
  const person = () => `<span class="sx in" aria-hidden="true" style="--dx:${Math.round((rand() - 0.5) * 30)}%;--dy:${Math.round((rand() - 0.5) * 20)}%">${cast[ci++ % cast.length]}</span>`;

  let no = 0;
  const pageHtml = (list, p) => {
    const at = Math.min(list.length, p === 0 ? 3 : 4); // 泡泡插在第二列附近
    const its = [];
    list.forEach((w, j) => { its.push(item(w, ++no)); if ((j + 1) % PER === 0 && j > 0) its.push(person()); });
    its.splice(at, 0, bubble(sents[p], p));
    return `<section class="page p${p + 1}">
      <div class="pg-grid">${p === 0 ? `<div class="sc-title"><div class="sc-title-in"><h2>${esc(topic.title)}</h2><p>${esc(topic.zh)}</p>
        <button class="sc-find" data-act="find">${icon('scan-search')}找找看</button></div></div>` : ''}${its.join('')}${fillers(cells[p])}</div>
      <span class="pg-no">${p + 1}</span></section>`;
  };

  const html = `<div class="scene-wrap"><div class="scene">
    <div class="scene-canvas book">${pageHtml(pages[0], 0)}${pageHtml(pages[1], 1)}</div>
    </div><div class="scene-fade hide" aria-hidden="true"></div></div>`;
  return { html, items: words };
}
