// 情境英語圖鑑 — 主程式（hash 路由 + 各頁面）
import { store, keyOf } from './store.js';
import { speak, stop, speechSupported, englishVoices } from './speech.js';
import { buildScene } from './scene.js';
import { runQuiz } from './quiz.js';
import { esc, $, $$, shuffle, sleep, beep, burst } from './util.js';

const view = $('#view'), topbar = $('#topbar'), sheet = $('#sheet');
let INDEX, SEARCH;
const topicCache = {};
const topicMeta = {}; // id -> { meta, cat }

async function loadIndex() {
  INDEX = await (await fetch('data/index.json')).json();
  for (const c of INDEX.categories) for (const t of c.topics) topicMeta[t.id] = { meta: t, cat: c };
}
async function loadSearch() { return SEARCH ||= await (await fetch('data/search.json')).json(); }
export async function getTopic(id) {
  return topicCache[id] ||= await (await fetch(`data/topics/${id}.json`)).json();
}
const catOf = id => topicMeta[id]?.cat || { color: '#ffb300', soft: '#fff1c9' };

// ---------- 共用 UI ----------
export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}
function setTop(title, { back = false, sub = '', color } = {}) {
  topbar.style.setProperty('--c', color || '#ffcf4a');
  topbar.innerHTML = `${back ? `<button class="back" aria-label="返回" onclick="history.length > 1 ? history.back() : location.hash='#/'">‹</button>` : '<span class="logo">📖</span>'}
    <div class="tb-title"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>
    <span class="tb-streak" title="連續學習天數">🔥 ${store.streak()}</span>`;
}
function setNav(name) { $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.nav === name)); }
const kkOf = w => store.settings().showKK && w.kk ? `<span class="kk">[${esc(w.kk)}]</span>` : '';
const speakBtn = (text, cls = '') => `<button class="say ${cls}" data-say="${esc(text)}" aria-label="朗讀">🔊</button>`;

// 全域：任何 data-say 按鈕都能朗讀
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (b && !b.closest('.scene')) { e.stopPropagation(); speak(b.dataset.say, { rate: b.dataset.slow ? 0.6 : undefined }); }
}, true);

// ---------- 單字詳細資料（底部面板） ----------
export function openWord(topicId, w) {
  const k = keyOf(topicId, w.en);
  store.markSeen(k);
  const c = catOf(topicId);
  const render = () => {
    const fav = store.isFav(k);
    sheet.innerHTML = `<div class="sheet-bg" data-close></div>
    <div class="sheet-card" style="--c:${c.color};--soft:${c.soft}">
      <button class="sheet-x" data-close aria-label="關閉">×</button>
      <div class="wd-pic">${w.emoji}</div>
      <div class="wd-en">${esc(w.en)} ${w.type === 'phrase' ? '<span class="tag">片語</span>' : ''}</div>
      <div class="wd-kk">${w.kk ? `[${esc(w.kk)}]` : ''}</div>
      <div class="wd-zh">${esc(w.zh)}</div>
      <div class="wd-btns">
        <button class="btn" data-say="${esc(w.en)}">🔊 發音</button>
        <button class="btn" data-say="${esc(w.en)}" data-slow="1">🐢 慢速</button>
        <button class="btn ${fav ? 'on' : ''}" data-fav>${fav ? '⭐ 已收藏' : '☆ 收藏'}</button>
      </div>
      ${w.ex ? `<div class="wd-ex"><div><p class="en">${hl(w.ex, w.en)}</p><p class="zh">${esc(w.exZh || '')}</p></div>${speakBtn(w.ex)}</div>` : ''}
      <a class="wd-link" href="#/topic/${topicId}" data-close>📍 ${esc(topicMeta[topicId]?.meta.zh || '')} ${esc(topicMeta[topicId]?.meta.title || '')}</a>
    </div>`;
  };
  render();
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('open'));
  sheet.onclick = e => {
    if (e.target.closest('[data-close]')) closeSheet();
    else if (e.target.closest('[data-fav]')) { toast(store.toggleFav(k) ? '已加入收藏與複習清單' : '已取消收藏'); render(); }
  };
  speak(w.en);
}
function closeSheet() { sheet.classList.remove('open'); setTimeout(() => (sheet.hidden = true), 200); }
const hl = (sentence, word) => {
  const s = esc(sentence), base = word.split(' ')[0].replace(/[^a-z]/gi, '');
  if (!base) return s;
  return s.replace(new RegExp(`\\b(${base}\\w*)`, 'i'), '<mark>$1</mark>');
};

// ---------- 首頁 ----------
async function renderHome() {
  setTop('情境英語圖鑑', { sub: 'Picture English' }); setNav('home');
  const t = INDEX.totals;
  const search = await loadSearch();
  const words = search.filter(r => r[4] !== 's');
  const dayN = Math.floor(Date.now() / 86400000);
  const daily = words[(dayN * 7919) % words.length];
  const due = store.dueKeys().length;
  view.innerHTML = `
  <section class="hero">
    <div class="hero-txt">
      <h1>生活中的英語，<br>一張圖就看懂！</h1>
      <p>${t.topics} 個生活情境 · ${t.words + t.phrases} 個單字片語 · ${t.sentences} 句會話句型</p>
      <div class="hero-stats">
        <span><b>${store.seenCount()}</b>已學</span><span><b>${store.mastered()}</b>熟記</span><span><b>${store.todayCount()}</b>今日</span>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">🦁<span>🎹</span><span>🍎</span></div>
  </section>
  ${daily ? `<section class="daily" style="--c:${catOf(daily[3]).color}">
    <div class="daily-pic">${daily[2]}</div>
    <div class="daily-txt"><small>今日一字 Word of the Day</small><b>${esc(daily[0])}</b><span>${esc(daily[1])}</span></div>
    ${speakBtn(daily[0], 'big')}
    <a class="daily-go" href="#/topic/${daily[3]}">›</a>
  </section>` : ''}
  ${due ? `<a class="due-banner" href="#/review">🃏 有 <b>${due}</b> 個單字該複習了，現在就去 ›</a>` : ''}
  ${INDEX.categories.map(c => `
    <section class="cat" style="--c:${c.color};--soft:${c.soft}">
      <h2 class="cat-h"><span>${c.emoji}</span>${esc(c.zh)}<small>${esc(c.en)}</small></h2>
      <div class="topic-grid">${c.topics.map(topicCard).join('')}</div>
    </section>`).join('')}
  <p class="foot">共 ${t.entries} 筆學習內容 · 可離線使用</p>`;
}
function topicCard(t) {
  const total = t.counts.words + t.counts.phrases;
  const seen = store.seenCount(t.id);
  const pct = Math.round(Math.min(1, seen / total) * 100);
  const best = store.state.quiz[t.id]?.best;
  return `<a class="topic" href="#/topic/${t.id}">
    <span class="topic-emoji">${t.emoji}</span>
    <b>${esc(t.title)}</b><span class="topic-zh">${esc(t.zh)}</span>
    <span class="topic-n">${total} 字 · ${t.counts.sentences} 句${best != null ? ` · 🏆${best}` : ''}</span>
    <span class="bar"><i style="width:${pct}%"></i></span>
  </a>`;
}

// ---------- 主題頁 ----------
const TABS = [['scene', '🖼️ 情境圖'], ['words', '🔤 單字片語'], ['talk', '💬 會話'], ['quiz', '✏️ 練習']];
async function renderTopic(id, tab = 'scene') {
  setNav('home');
  if (!topicMeta[id]) { view.innerHTML = '<p class="empty">找不到這個主題</p>'; return; }
  const c = catOf(id);
  const topic = await getTopic(id);
  setTop(`${topic.emoji} ${esc(topic.title)}`, { back: true, sub: esc(topic.zh), color: c.soft });
  view.innerHTML = `<div class="topic-page" style="--c:${c.color};--soft:${c.soft}">
    <nav class="tabs">${TABS.map(([k, l]) => `<a href="#/topic/${id}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div id="tabbody"></div></div>`;
  const body = $('#tabbody');
  ({ scene: tabScene, words: tabWords, talk: tabTalk, quiz: tabQuiz }[tab] || tabScene)(body, topic, c);
}

function tabScene(body, topic, c) {
  const { html, items } = buildScene(topic, c.color);
  const phrases = topic.words.filter(w => w.type === 'phrase');
  body.innerHTML = `<p class="hint">${esc(topic.intro || '')}　<span>👆 點圖片聽發音，左右滑動看完整情境</span></p>
    ${html}
    <div class="find-bar" hidden></div>
    ${phrases.length ? `<h3 class="sec-h">🧩 實用片語</h3><div class="chips">${phrases.map(p => `<button class="chip" data-i="${topic.words.indexOf(p)}">${p.emoji} ${esc(p.en)}<small>${esc(p.zh)}</small></button>`).join('')}</div>` : ''}
    <h3 class="sec-h">💬 情境對話</h3>
    ${topic.dialogues.slice(0, 1).map(d => dialogueHtml(d)).join('')}
    <a class="more-link" href="#/topic/${topic.id}/talk">看全部 ${topic.sentences.length} 句會話句型 ›</a>`;

  const scene = $('.scene', body), canvas = $('.scene-canvas', body);
  let finding = null, playing = false;
  const findBar = $('.find-bar', body);
  const nextFind = () => {
    const w = items[Math.floor(Math.random() * items.length)];
    finding = w;
    findBar.hidden = false;
    findBar.innerHTML = `🔎 找找看：<b>${store.settings().showZh ? esc(w.zh.split(/[；;]/)[0]) : '???'}</b> 在哪裡？ ${speakBtn(w.en)} <button class="btn sm" data-endfind>結束</button>`;
    speak(w.en);
  };
  findBar.onclick = e => { if (e.target.closest('[data-endfind]')) { finding = null; findBar.hidden = true; canvas.classList.remove('finding'); } };

  scene.addEventListener('click', async e => {
    const it = e.target.closest('.si'), bub = e.target.closest('.sb'), act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'stop') { playing = false; stop(); $$('.si.hot', canvas).forEach(x => x.classList.remove('hot')); }
      if (a === 'find') { canvas.classList.add('finding'); nextFind(); findBar.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      if (a === 'playall') {
        playing = true;
        for (const el of $$('.si', canvas)) {
          if (!playing) break;
          el.classList.add('hot'); el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
          await speak(topic.words[el.dataset.i].en); await sleep(250);
          el.classList.remove('hot');
        }
        playing = false;
      }
      return;
    }
    if (bub) { bub.classList.add('hot'); await speak(bub.dataset.say); bub.classList.remove('hot'); return; }
    if (!it) return;
    const w = topic.words[it.dataset.i];
    if (finding) {
      const r = it.getBoundingClientRect();
      if (w === finding) {
        beep(true); burst(r.left + r.width / 2, r.top + r.height / 2); store.activity(1);
        it.classList.add('ok'); setTimeout(() => it.classList.remove('ok'), 700);
        setTimeout(nextFind, 900);
      } else { beep(false); it.classList.add('shake'); setTimeout(() => it.classList.remove('shake'), 500); }
      return;
    }
    $$('.si.hot', canvas).forEach(x => x.classList.remove('hot'));
    it.classList.add('hot'); setTimeout(() => it.classList.remove('hot'), 1200);
    openWord(topic.id, w);
  });
  $('.chips', body)?.addEventListener('click', e => { const ch = e.target.closest('.chip'); if (ch) openWord(topic.id, topic.words[ch.dataset.i]); });
  bindDialogues(body);
}

function tabWords(body, topic) {
  let filter = 'all';
  const render = () => {
    const list = topic.words.map((w, i) => ({ w, i })).filter(({ w }) => filter === 'all' || (filter === 'phrase') === (w.type === 'phrase') && filter !== 'fav' || (filter === 'fav' && store.isFav(keyOf(topic.id, w.en))));
    body.innerHTML = `<div class="filters">
      ${[['all', '全部'], ['word', '單字'], ['phrase', '片語'], ['fav', '⭐ 收藏']].map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
      <button class="chip" data-playall>▶ 全部朗讀</button></div>
      <div class="word-grid">${list.map(({ w, i }) => {
        const k = keyOf(topic.id, w.en);
        return `<div class="wc ${store.state.seen[k] ? 'seen' : ''}" data-i="${i}">
          <span class="wc-pic">${w.emoji}</span>
          <div class="wc-txt"><b>${esc(w.en)}</b>${kkOf(w)}${store.settings().showZh ? `<span class="zh">${esc(w.zh)}</span>` : ''}</div>
          ${store.isFav(k) ? '<span class="wc-fav">⭐</span>' : ''}
        </div>`;
      }).join('') || '<p class="empty">這裡還沒有單字</p>'}</div>`;
  };
  render();
  body.onclick = async e => {
    const f = e.target.closest('[data-f]'), wc = e.target.closest('.wc');
    if (f) { filter = f.dataset.f; render(); }
    else if (e.target.closest('[data-playall]')) {
      for (const el of $$('.wc', body)) { el.classList.add('hot'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await speak(topic.words[el.dataset.i].en); el.classList.remove('hot'); await sleep(200); if (!body.isConnected) break; }
    } else if (wc) { openWord(topic.id, topic.words[wc.dataset.i]); wc.classList.add('seen'); }
  };
}

function dialogueHtml(d) {
  return `<div class="dlg"><div class="dlg-h"><b>${esc(d.title)}</b><button class="btn sm" data-playdlg>▶ 播放對話</button></div>
    ${d.lines.map((l, i) => `<div class="ln ${i % 2 ? 'b' : 'a'}" data-en="${esc(l.en)}"><span class="av">${i % 2 ? '👧' : '🧒'}</span>
      <div class="bubble"><p class="en">${esc(l.en)}</p>${store.settings().showZh ? `<p class="zh">${esc(l.zh)}</p>` : ''}</div></div>`).join('')}</div>`;
}
function bindDialogues(root) {
  $$('.dlg', root).forEach(dlg => dlg.addEventListener('click', async e => {
    const ln = e.target.closest('.ln');
    if (ln) { await speak(ln.dataset.en, { alt: ln.classList.contains('b') }); return; }
    if (e.target.closest('[data-playdlg]')) {
      for (const l of $$('.ln', dlg)) { l.classList.add('hot'); await speak(l.dataset.en, { alt: l.classList.contains('b') }); l.classList.remove('hot'); await sleep(300); if (!dlg.isConnected) break; }
      store.activity(1);
    }
  }));
}

function tabTalk(body, topic) {
  body.innerHTML = `<h3 class="sec-h">🗣️ 實用句型 <small>點一下聽發音</small></h3>
    <div class="sent-list">${topic.sentences.map((s, i) => `<div class="sent" data-say="${esc(s.en)}">
      <span class="no">${i + 1}</span><div><p class="en">${esc(s.en)}</p>${store.settings().showZh ? `<p class="zh">${esc(s.zh)}</p>` : ''}${s.note ? `<p class="note">💡 ${esc(s.note)}</p>` : ''}</div><span class="say">🔊</span></div>`).join('')}</div>
    <h3 class="sec-h">💬 情境對話</h3>${topic.dialogues.map(dialogueHtml).join('')}`;
  bindDialogues(body);
}

function tabQuiz(body, topic, c) {
  const best = store.state.quiz[topic.id]?.best;
  body.innerHTML = `<div class="quiz-start">
    <div class="qs-pic">${topic.emoji}</div>
    <h3>${esc(topic.zh)} 小測驗</h3>
    <p>看圖選字、聽音辨圖、中英配對、拼字、句子重組，共 10 題</p>
    ${best != null ? `<p class="best">🏆 最佳成績 ${best} / 100</p>` : ''}
    <button class="btn primary big" data-start>開始挑戰</button></div>`;
  body.querySelector('[data-start]').onclick = () => runQuiz(body, topic, { onDone: score => store.recordQuiz(topic.id, score) });
}

// ---------- 複習（字卡） ----------
async function renderReview() {
  setTop('複習字卡', { sub: '間隔重複記憶法' }); setNav('review');
  const due = store.dueKeys(), all = store.reviewKeys();
  const favN = Object.keys(store.state.fav).length;
  view.innerHTML = `<div class="review-home">
    <div class="rv-stats"><div><b>${due.length}</b>待複習</div><div><b>${all.length}</b>複習清單</div><div><b>${favN}</b>收藏</div><div><b>${store.mastered()}</b>已熟記</div></div>
    <div class="rv-modes">
      <button class="btn primary big" data-go="due" ${due.length ? '' : 'disabled'}>🃏 開始複習 ${due.length ? `(${due.length})` : ''}</button>
      <button class="btn big" data-go="all" ${all.length ? '' : 'disabled'}>🔁 複習清單全部</button>
      <button class="btn big" data-go="random">🎲 隨機 20 個已學單字</button>
    </div>
    <label class="switch"><input type="checkbox" id="rvZh"> 中翻英模式（看中文想英文）</label>
    ${!all.length ? '<p class="empty">在單字面板按「☆ 收藏」，或測驗答錯的字，都會自動加入複習清單喔！</p>' : ''}
    <h3 class="sec-h">⭐ 我的收藏</h3><div id="favList" class="word-grid"></div></div>`;
  const favList = $('#favList');
  const favKeys = Object.keys(store.state.fav);
  const favWords = await resolveKeys(favKeys);
  favList.innerHTML = favWords.map(({ w, tid }, n) => `<div class="wc" data-n="${n}"><span class="wc-pic">${w.emoji}</span><div class="wc-txt"><b>${esc(w.en)}</b><span class="zh">${esc(w.zh)}</span></div></div>`).join('') || '<p class="empty">還沒有收藏的單字</p>';
  favList.onclick = e => { const wc = e.target.closest('.wc'); if (wc) { const { w, tid } = favWords[wc.dataset.n]; openWord(tid, w); } };
  view.querySelector('.rv-modes').onclick = async e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    let keys = b.dataset.go === 'due' ? due : b.dataset.go === 'all' ? all : shuffle(Object.keys(store.state.seen)).slice(0, 20);
    if (!keys.length) { toast('先去主題裡點幾個單字學習吧！'); return; }
    flashcards(await resolveKeys(shuffle(keys)), $('#rvZh').checked);
  };
}
async function resolveKeys(keys) {
  const out = [];
  for (const k of keys) {
    const [tid, en] = k.split('|');
    if (!topicMeta[tid]) continue;
    const t = await getTopic(tid);
    const w = t.words.find(x => x.en === en);
    if (w) out.push({ k, w, tid });
  }
  return out;
}
function flashcards(cards, zhFirst) {
  let i = 0, right = 0;
  const show = () => {
    if (i >= cards.length) {
      view.innerHTML = `<div class="quiz-end"><div class="qs-pic">🎉</div><h3>複習完成！</h3><p>記得 ${right} / ${cards.length} 個</p><a class="btn primary big" href="#/review">回複習頁</a></div>`;
      store.activity(cards.length); return;
    }
    const { k, w } = cards[i];
    view.innerHTML = `<div class="fc-wrap"><div class="fc-prog">${i + 1} / ${cards.length}</div>
      <div class="fc" tabindex="0"><div class="fc-in">
        <div class="fc-front"><div class="fc-pic">${zhFirst ? '❓' : w.emoji}</div><b>${zhFirst ? esc(w.zh) : esc(w.en)}</b><small>點卡片翻面</small></div>
        <div class="fc-back"><div class="fc-pic">${w.emoji}</div><b>${esc(w.en)}</b>${w.kk ? `<span class="kk">[${esc(w.kk)}]</span>` : ''}<span class="zh">${esc(w.zh)}</span>${w.ex ? `<p class="ex">${esc(w.ex)}<br><small>${esc(w.exZh || '')}</small></p>` : ''}</div>
      </div></div>
      <div class="fc-btns" hidden><button class="btn no big" data-r="0">😵 忘記了</button><button class="btn ok big" data-r="1">😊 記得</button></div></div>`;
    const fc = $('.fc'), btns = $('.fc-btns');
    if (!zhFirst) speak(w.en);
    fc.onclick = () => { fc.classList.add('flip'); btns.hidden = false; speak(w.en); };
    btns.onclick = e => { const r = e.target.closest('[data-r]'); if (!r) return; const ok = r.dataset.r === '1'; store.grade(k, ok); if (ok) right++; i++; show(); };
  };
  setTop('複習字卡', { back: true });
  show();
}

// ---------- 搜尋 ----------
async function renderSearch(q = '') {
  setTop('搜尋', { sub: '單字、片語、句型、中文都可以' }); setNav('search');
  view.innerHTML = `<div class="search"><input id="q" type="search" placeholder="輸入英文或中文，例如 apple、蘋果、How much" value="${esc(q)}" autocomplete="off"><div id="results"></div></div>`;
  const data = await loadSearch();
  const input = $('#q'), res = $('#results');
  const run = () => {
    const s = input.value.trim().toLowerCase();
    history.replaceState(null, '', '#/search' + (s ? '/' + encodeURIComponent(s) : ''));
    if (!s) { res.innerHTML = `<p class="empty">共可搜尋 ${data.length} 筆內容</p>`; return; }
    const hits = data.filter(r => r[0].toLowerCase().includes(s) || r[1].includes(s))
      .sort((a, b) => (b[0].toLowerCase() === s) - (a[0].toLowerCase() === s) || (b[0].toLowerCase().startsWith(s)) - (a[0].toLowerCase().startsWith(s)) || a[0].length - b[0].length).slice(0, 120);
    res.innerHTML = hits.map((r, n) => `<div class="sr" data-n="${n}"><span class="sr-pic">${r[2]}</span><div><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div><small style="--c:${catOf(r[3]).color}">${r[4] === 's' ? '句型' : r[4] === 'p' ? '片語' : '單字'} · ${esc(topicMeta[r[3]]?.meta.zh || '')}</small></div>`).join('') || '<p class="empty">找不到相關內容 😢</p>';
    res.onclick = async e => {
      const el = e.target.closest('.sr'); if (!el) return;
      const r = hits[el.dataset.n];
      if (r[4] === 's') { speak(r[0]); return; }
      const t = await getTopic(r[3]); openWord(r[3], t.words[r[5]]);
    };
  };
  input.oninput = run; run(); input.focus();
}

// ---------- 我的 ----------
let installEvt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
function renderMe() {
  setTop('我的學習', { sub: '進度與設定' }); setNav('me');
  const s = store.settings(), st = store.state;
  const quizN = Object.keys(st.quiz).length;
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); const k = d.toLocaleDateString('sv-SE'); return { n: st.days[k] || 0, d: d.getDate() }; });
  const maxN = Math.max(1, ...days.map(d => d.n));
  view.innerHTML = `<div class="me">
    <div class="me-stats">
      <div><b>🔥 ${store.streak()}</b>連續天數</div><div><b>${store.seenCount()}</b>已學單字</div>
      <div><b>${store.mastered()}</b>已熟記</div><div><b>${quizN}</b>完成測驗主題</div></div>
    <h3 class="sec-h">📅 最近兩週</h3>
    <div class="chart">${days.map(d => `<div class="col" title="${d.n}"><i style="height:${(d.n / maxN) * 100}%"></i><small>${d.d}</small></div>`).join('')}</div>
    <h3 class="sec-h">📚 各類別進度</h3>
    ${INDEX.categories.map(c => { const total = c.topics.reduce((a, t) => a + t.counts.words + t.counts.phrases, 0); const seen = c.topics.reduce((a, t) => a + store.seenCount(t.id), 0);
      return `<div class="prog" style="--c:${c.color}"><span>${c.emoji} ${esc(c.zh)}</span><span class="bar"><i style="width:${(seen / total) * 100}%"></i></span><small>${seen}/${total}</small></div>`; }).join('')}
    <h3 class="sec-h">⚙️ 設定</h3>
    <div class="settings">
      <label>語速 <input type="range" min="0.5" max="1.3" step="0.1" value="${s.rate}" data-set="rate"> <output>${s.rate}</output></label>
      <label>口音 <select data-set="accent"><option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>美式 🇺🇸</option><option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>英式 🇬🇧</option><option value="en-AU" ${s.accent === 'en-AU' ? 'selected' : ''}>澳式 🇦🇺</option></select></label>
      <label>語音 <select data-set="voice"><option value="">自動選擇</option>${englishVoices().map(v => `<option value="${esc(v.voiceURI)}" ${s.voice === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${v.lang})</option>`).join('')}</select></label>
      <label class="switch"><input type="checkbox" data-set="showKK" ${s.showKK ? 'checked' : ''}> 顯示 KK 音標</label>
      <label class="switch"><input type="checkbox" data-set="showZh" ${s.showZh ? 'checked' : ''}> 顯示中文翻譯</label>
      <button class="btn" data-test>🔊 試聽：Hello! Nice to meet you.</button>
      ${speechSupported() ? '' : '<p class="warn">此瀏覽器不支援語音朗讀，建議使用 Chrome、Safari 或 Edge。</p>'}
    </div>
    <h3 class="sec-h">📲 App</h3>
    <div class="settings">
      <button class="btn" data-install ${installEvt ? '' : 'hidden'}>📥 安裝到主畫面</button>
      <p class="tip">iPhone：用 Safari 開啟 → 分享 → 「加入主畫面」。Android：Chrome 選單 → 「安裝應用程式」。安裝後可離線使用。</p>
      <button class="btn" data-export>💾 匯出學習紀錄</button>
      <label class="btn file">📂 匯入學習紀錄<input type="file" accept=".json" data-import hidden></label>
      <button class="btn danger" data-reset>🗑️ 清除所有紀錄</button>
    </div>
    <p class="foot">情境英語圖鑑 · ${INDEX.totals.entries} 筆內容 · 資料更新於 ${INDEX.generated.slice(0, 10)}</p></div>`;
  const me = $('.me');
  me.oninput = e => { const el = e.target.closest('[data-set]'); if (!el) return; const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; store.setSetting(el.dataset.set, v); if (el.type === 'range') el.nextElementSibling.textContent = v; };
  me.onclick = async e => {
    if (e.target.closest('[data-test]')) speak('Hello! Nice to meet you.');
    if (e.target.closest('[data-install]') && installEvt) { installEvt.prompt(); installEvt = null; }
    if (e.target.closest('[data-export]')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' })); a.download = `english-progress-${new Date().toLocaleDateString('sv-SE')}.json`; a.click(); }
    if (e.target.closest('[data-reset]') && confirm('確定要清除所有學習紀錄嗎？此動作無法復原。')) { store.reset(); renderMe(); toast('已清除'); }
  };
  me.querySelector('[data-import]').onchange = async e => { try { store.import(await e.target.files[0].text()); toast('匯入成功'); renderMe(); } catch { toast('檔案格式錯誤'); } };
}

// ---------- 路由 ----------
async function route() {
  stop(); closeSheet();
  const [, page, a, b] = location.hash.replace(/^#/, '').split('/');
  try {
    if (page === 'topic') await renderTopic(a, b);
    else if (page === 'review') await renderReview();
    else if (page === 'search') await renderSearch(decodeURIComponent(a || ''));
    else if (page === 'me') renderMe();
    else await renderHome();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<p class="empty">載入失敗，請檢查網路後重試。<br><small>${esc(err.message)}</small></p>`;
  }
  if (page !== 'topic' || !b) window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
loadIndex().then(route).catch(err => { view.innerHTML = `<p class="empty">無法載入資料：${esc(err.message)}</p>`; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('內容已更新，重新開啟即可使用新版本 ✨'); });
    });
  }).catch(() => {});
}
