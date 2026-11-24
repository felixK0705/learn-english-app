// 情境英語圖鑑 — 主程式（hash 路由 + 各頁面）
import { store, keyOf } from './store.js';
import { speak, stop, speechSupported, englishVoices } from './speech.js';
import { buildScene } from './scene.js';
import { runQuiz } from './quiz.js';
import { icon } from './icons.js';
import { esc, $, $$, shuffle, beep, burst } from './util.js';

const view = $('#view'), topbar = $('#topbar'), modal = $('#modal');
let INDEX, SEARCH;
const topicCache = {};
const topicMeta = {}; // id -> { meta, cat }

async function loadIndex() {
  INDEX = await (await fetch('data/index.json')).json();
  for (const c of INDEX.categories) for (const t of c.topics) topicMeta[t.id] = { meta: t, cat: c };
}
async function loadSearch() { return SEARCH ||= await (await fetch('data/search.json')).json(); }
async function getTopic(id) { return topicCache[id] ||= await (await fetch(`data/topics/${id}.json`)).json(); }
const catOf = id => topicMeta[id]?.cat || { color: '#6c5ce7', soft: '#eeebff', zh: '', emoji: '' };
const firstZh = zh => zh.split(/[；;、]/)[0];
const isDesktop = () => matchMedia('(min-width: 960px)').matches;

// ---------- 共用 UI ----------
export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1900);
}

const NAV = [
  ['home', '#/', 'house', '首頁'],
  ['review', '#/review', 'layers', '複習'],
  ['search', '#/search', 'search', '搜尋'],
  ['me', '#/me', 'user', '我的'],
];
function renderChrome(active) {
  const links = NAV.map(([k, href, ic, label]) => `<a href="${href}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${k === 'review' && store.dueKeys().length ? `<em>${store.dueKeys().length}</em>` : ''}</a>`).join('');
  $('#sidenav').innerHTML = links;
  $('#tabbar').innerHTML = links;
  const goal = store.settings().goal || 20, today = store.todayCount();
  $('#sidecard').innerHTML = `<div class="sc-row">${icon('flame', 'flame')}<div><b>${store.streak()} 天</b><small>連續學習</small></div></div>
    <div class="sc-goal"><div class="sc-goal-h"><span>今日目標</span><span>${Math.min(today, goal)} / ${goal}</span></div><div class="progress"><i style="width:${Math.min(100, today / goal * 100)}%"></i></div></div>`;
}

function setTop({ title, sub = '', back = false, crumb = '' }) {
  topbar.innerHTML = `
    ${back ? `<button class="icon-btn" data-back aria-label="返回">${icon('chevron-left')}</button>` : `<a class="tb-brand" href="#/"><img src="icons/icon.svg" alt=""></a>`}
    <div class="tb-title">${crumb ? `<small>${crumb}</small>` : ''}<h1>${title}</h1>${sub && !crumb ? `<small>${sub}</small>` : ''}</div>
    <label class="tb-search">${icon('search')}<input type="search" placeholder="搜尋單字、片語、句型…" aria-label="搜尋"></label>
    <span class="chip-stat" title="連續學習天數">${icon('flame', 'flame')}${store.streak()}</span>`;
  const input = $('.tb-search input', topbar);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) location.hash = '#/search/' + encodeURIComponent(input.value.trim()); });
  $('[data-back]', topbar)?.addEventListener('click', () => (history.length > 1 ? history.back() : (location.hash = '#/')));
}
const kkHtml = w => store.settings().showKK && w.kk ? `<span class="kk">[${esc(w.kk)}]</span>` : '';
const sayBtn = (text, cls = '', label = '朗讀') => `<button class="icon-btn say ${cls}" data-say="${esc(text)}" aria-label="${label}">${icon('volume-2')}</button>`;

// 任何帶 data-say 的元素（情境圖以外）點了就唸出該段文字
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (!b || b.closest('.scene')) return;
  e.stopPropagation(); e.preventDefault();
  b.classList.add('speaking');
  speak(b.dataset.say, { rate: b.dataset.slow ? 0.55 : undefined, alt: !!b.dataset.alt }).then(() => b.classList.remove('speaking'));
}, true);

// ---------- 單字詳細（桌機：置中對話框；手機：底部面板） ----------
function openWord(topicId, w, { silent = false } = {}) {
  const k = keyOf(topicId, w.en);
  store.markSeen(k);
  const c = catOf(topicId), m = topicMeta[topicId]?.meta;
  const render = () => {
    const fav = store.isFav(k);
    modal.innerHTML = `<div class="modal-bg" data-close></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${esc(w.en)}" style="--c:${c.color};--soft:${c.soft}">
      <button class="icon-btn modal-x" data-close aria-label="關閉">${icon('x')}</button>
      <div class="wd-art">${w.emoji}</div>
      <div class="wd-head">
        <h2>${esc(w.en)}</h2>
        ${w.type === 'phrase' ? '<span class="badge">片語</span>' : ''}
      </div>
      ${w.kk ? `<div class="wd-kk">[${esc(w.kk)}]</div>` : ''}
      <div class="wd-zh">${esc(w.zh)}</div>
      <div class="wd-actions">
        <button class="btn primary" data-say="${esc(w.en)}">${icon('volume-2')}發音</button>
        <button class="btn" data-say="${esc(w.en)}" data-slow="1">${icon('snail')}慢速</button>
        <button class="btn ${fav ? 'active' : ''}" data-fav aria-pressed="${fav}">${icon(fav ? 'bookmark-check' : 'bookmark')}${fav ? '已收藏' : '收藏'}</button>
      </div>
      ${w.ex ? `<div class="wd-ex" data-say="${esc(w.ex)}"><span class="wd-ex-label">例句</span><p class="en">${hl(w.ex, w.en)}</p><p class="zh">${esc(w.exZh || '')}</p><span class="wd-ex-ic">${icon('volume-2')}</span></div>` : ''}
      ${m ? `<a class="wd-link" href="#/topic/${topicId}">${icon('map-pin')}${esc(m.zh)} · ${esc(m.title)}${icon('chevron-right')}</a>` : ''}
    </div>`;
  };
  render();
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  modal.onclick = e => {
    if (e.target.closest('[data-close]') || e.target.closest('.wd-link')) closeModal();
    else if (e.target.closest('[data-fav]')) { store.toggleFav(k); render(); renderChrome(currentNav); }
  };
  if (!silent) speak(w.en);
}
function closeModal() { if (modal.hidden) return; modal.classList.remove('open'); setTimeout(() => (modal.hidden = true), 220); }
const hl = (sentence, word) => {
  const s = esc(sentence), base = word.split(' ')[0].replace(/[^a-z]/gi, '');
  return base.length < 2 ? s : s.replace(new RegExp(`\\b(${base}\\w*)`, 'i'), '<mark>$1</mark>');
};

// ---------- 首頁 ----------
let homeFilter = 'all';
async function renderHome() {
  setTop({ title: '情境英語圖鑑', sub: 'Picture English' });
  const t = INDEX.totals;
  const search = await loadSearch();
  const words = search.filter(r => r[4] === 'w');
  const daily = words[(Math.floor(Date.now() / 86400000) * 7919) % words.length];
  let dailyWord = null;
  if (daily) dailyWord = (await getTopic(daily[3])).words[daily[5]];
  const due = store.dueKeys().length;
  const hour = new Date().getHours();
  const hello = hour < 11 ? '早安' : hour < 18 ? '午安' : '晚安';
  const goal = store.settings().goal || 20, today = store.todayCount();
  const last = store.state.last && topicMeta[store.state.last]?.meta;

  view.innerHTML = `
  <section class="home-head">
    <div class="hello">
      <p class="eyebrow">${hello}！</p>
      <h2>今天想學哪個<br class="br-m">生活情境？</h2>
      <p class="muted">${t.topics} 個情境・${t.words + t.phrases} 個單字片語・${t.sentences} 句會話</p>
    </div>
    <div class="mini-stats">
      <span class="ms">${icon('flame', 'flame')}<b>${store.streak()}</b><small>連續天數</small></span>
      <span class="ms">${icon('book-open')}<b>${store.seenCount()}</b><small>已學單字</small></span>
      <span class="ms ms-goal"><span class="ring" style="--p:${Math.min(100, today / goal * 100)}">${icon('target')}</span><b>${Math.min(today, goal)}<i>/${goal}</i></b><small>今日目標</small></span>
    </div>
  </section>
  <section class="feature">
    ${dailyWord ? `<article class="wotd">
      <div class="wotd-circle"></div>
      <div class="wotd-art">${dailyWord.emoji}</div>
      <div class="wotd-txt">
        <span class="wotd-tag">${icon('sparkles')}今日一字</span>
        <h3>${esc(dailyWord.en)}</h3>
        <p class="wotd-meta">${dailyWord.kk ? `<span>[${esc(dailyWord.kk)}]</span>` : ''}<b>${esc(dailyWord.zh)}</b></p>
        <div class="wotd-actions">
          <button class="btn primary" data-say="${esc(dailyWord.en)}">${icon('volume-2')}聽發音</button>
          <button class="btn" data-open-daily>${icon('book-open')}看例句</button>
        </div>
      </div>
    </article>` : ''}
    <div class="side-feature">
      ${due ? `<a class="mini-card" href="#/review"><span class="mc-ic tone-violet">${icon('layers')}</span><div><b>${due} 個單字待複習</b><small>間隔複習，記得更牢</small></div>${icon('chevron-right', 'chev')}</a>`
        : `<div class="mini-card"><span class="mc-ic tone-green">${icon('circle-check')}</span><div><b>目前沒有待複習</b><small>收藏或答錯的字會自動加入</small></div></div>`}
      ${last ? `<a class="mini-card" href="#/topic/${last.id}"><span class="mc-ic" style="background:${catOf(last.id).soft}">${last.emoji}</span><div><b>繼續學習</b><small>${esc(last.zh)}・${esc(last.title)}</small></div>${icon('chevron-right', 'chev')}</a>`
        : `<a class="mini-card" href="#/topic/greetings"><span class="mc-ic" style="background:#FFE680">👋</span><div><b>從這裡開始</b><small>打招呼與自我介紹</small></div>${icon('chevron-right', 'chev')}</a>`}
    </div>
  </section>
  <section class="topics-sec">
    <div class="sec-head"><h2>生活情境</h2><small>${t.topics} 個主題</small></div>
    <div class="pills" role="tablist">
      <button class="pill ${homeFilter === 'all' ? 'on' : ''}" data-cat="all">全部</button>
      ${INDEX.categories.map(c => `<button class="pill ${homeFilter === c.id ? 'on' : ''}" data-cat="${c.id}" style="--c:${c.color}"><span>${c.emoji}</span>${esc(c.zh)}</button>`).join('')}
    </div>
    <div id="topicList"></div>
  </section>`;
  const list = $('#topicList');
  const paint = () => {
    const cats = INDEX.categories.filter(c => homeFilter === 'all' || c.id === homeFilter);
    list.innerHTML = cats.map(c => `<div class="cat-block" style="--c:${c.color};--soft:${c.soft}">
      <h3 class="cat-title"><span>${c.emoji}</span>${esc(c.zh)}<small>${esc(c.en)}</small></h3>
      <div class="tgrid">${c.topics.map(t => topicCard(t, c)).join('')}</div></div>`).join('');
  };
  paint();
  $('.pills', view).onclick = e => {
    const p = e.target.closest('[data-cat]'); if (!p) return;
    homeFilter = p.dataset.cat;
    $$('.pill', view).forEach(x => x.classList.toggle('on', x === p));
    paint();
  };
  $('[data-open-daily]', view)?.addEventListener('click', () => openWord(daily[3], dailyWord));
}
const stat = (ic, label, val, unit, tone) => `<div class="stat"><span class="stat-ic ${tone}">${icon(ic)}</span><div class="stat-txt"><small>${label}</small><b>${val}<span>${unit}</span></b></div></div>`;
function topicCard(t, c) {
  const total = t.counts.words + t.counts.phrases;
  const seen = store.seenCount(t.id);
  const pct = Math.round(Math.min(1, seen / total) * 100);
  const best = store.state.quiz[t.id]?.best;
  return `<a class="tcard" href="#/topic/${t.id}" style="--c:${c.color};--soft:${c.soft}">
    <span class="tcard-art">${t.emoji}</span>
    ${best != null ? `<em class="tcard-best" title="測驗最佳成績">${icon('trophy')}${best}</em>` : ''}
    <h4>${esc(t.title)}</h4><p>${esc(t.zh)}</p>
    <div class="tcard-foot"><span>${total} 字・${t.counts.sentences} 句</span>${pct ? `<span class="tcard-pct">${pct}%</span>` : ''}</div>
    <div class="progress sm"><i style="width:${pct}%"></i></div>
  </a>`;
}

// 情境圖小卡的全域事件（只綁一次）
let popCtl = null;
addEventListener('scroll', () => popCtl?.place(), { passive: true });
addEventListener('resize', () => popCtl?.place());
document.addEventListener('click', e => { if (popCtl && !e.target.closest('#pop') && !e.target.closest('.si')) popCtl.hide(); });

// ---------- 主題頁 ----------
const TABS = [['scene', 'image', '情境圖'], ['words', 'list', '單字片語'], ['talk', 'messages-square', '會話'], ['quiz', 'pencil-line', '練習']];
async function renderTopic(id, tab = 'scene') {
  if (!topicMeta[id]) { setTop({ title: '找不到主題', back: true }); view.innerHTML = `<div class="empty-card">${icon('compass')}<p>找不到這個主題<br><small>可能已更名或移除</small></p><a class="btn primary" href="#/">${icon('house')}回首頁</a></div>`; return; }
  const c = catOf(id), m = topicMeta[id].meta;
  const topic = await getTopic(id);
  store.setLast(id);
  setTop({ title: `${esc(topic.title)} <span class="tb-zh">${esc(topic.zh)}</span>`, back: true, crumb: `${c.emoji} ${esc(c.zh)}` });
  const total = m.counts.words + m.counts.phrases;
  const pct = Math.round(Math.min(1, store.seenCount(id) / total) * 100);
  view.innerHTML = `<div class="topic-page" style="--c:${c.color};--soft:${c.soft}">
    <div class="seg-wrap"><nav class="seg" role="tablist">${TABS.map(([k, ic, l]) => `<a role="tab" href="#/topic/${id}/${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${icon(ic)}<span>${l}</span></a>`).join('')}</nav>
    <span class="seg-meta">${icon('circle-check')}已學 ${pct}%・${m.counts.words + m.counts.phrases} 字・${m.counts.sentences} 句</span></div>
    <div id="tabbody"></div></div>`;
  const body = $('#tabbody');
  ({ scene: tabScene, words: tabWords, talk: tabTalk, quiz: tabQuiz }[tab] || tabScene)(body, topic, c);
}

function tabScene(body, topic) {
  const { html, items } = buildScene(topic);
  const phrases = topic.words.filter(w => w.type === 'phrase');
  body.innerHTML = `
    <p class="scene-hint">${esc(topic.intro || '')}<span>${icon('volume-2')}點單字或對話泡泡就會發音</span></p>
    ${html}
    <div class="find-bar" hidden></div>
    ${phrases.length ? `<div class="sec-head"><h3>實用片語</h3><small>點一下聽發音</small></div>
      <div class="phrase-grid">${phrases.map(p => `<button class="phrase" data-i="${topic.words.indexOf(p)}"><span class="phrase-emoji">${p.emoji}</span><span class="phrase-txt"><b>${esc(p.en)}</b><small>${esc(p.zh)}</small></span>${icon('volume-2', 'phrase-ic')}</button>`).join('')}</div>` : ''}
    <div class="sec-head"><h3>情境對話</h3><a class="link" href="#/topic/${topic.id}/talk">全部 ${topic.sentences.length} 句型 ${icon('arrow-right')}</a></div>
    ${dialogueHtml(topic.dialogues[0])}`;

  const canvas = $('.scene-canvas', body), findBar = $('.find-bar', body);
  $('.pop', canvas)?.remove();
  const pop = document.getElementById('pop') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pop', className: 'pop', hidden: true }));
  let finding = null, popFor = null, popEl = null;

  const placePop = () => {
    if (!popEl || pop.hidden) return;
    const r = popEl.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    const vw = innerWidth, vh = innerHeight, topLimit = isDesktop() ? 84 : 120;
    if (r.right < 0 || r.left > vw || r.bottom < topLimit || r.top > vh) { hidePop(); return; }
    const cx = Math.min(Math.max(r.left + r.width / 2, pw / 2 + 10), vw - pw / 2 - 10);
    const below = r.top - ph - 12 < topLimit;
    pop.classList.toggle('below', below);
    pop.style.left = `${cx}px`;
    pop.style.top = below ? `${r.bottom + 10}px` : `${r.top - ph - 10}px`;
    pop.style.setProperty('--ax', `${Math.min(Math.max(r.left + r.width / 2 - (cx - pw / 2), 18), pw - 18)}px`);
  };
  const showPop = (el, w) => {
    const k = keyOf(topic.id, w.en), fav = store.isFav(k);
    pop.style.setProperty('--c', catOf(topic.id).color);
    pop.innerHTML = `<div class="pop-head"><b>${esc(w.en)}</b>${w.kk ? `<span class="kk">[${esc(w.kk)}]</span>` : ''}</div>
      <div class="pop-zh">${esc(w.zh)}</div>
      <div class="pop-actions">
        <button class="pop-btn" data-pa="say">${icon('volume-2')}<span>再聽</span></button>
        <button class="pop-btn" data-pa="slow">${icon('snail')}<span>慢速</span></button>
        <button class="pop-btn ${fav ? 'active' : ''}" data-pa="fav">${icon(fav ? 'bookmark-check' : 'bookmark')}<span>${fav ? '已收藏' : '收藏'}</span></button>
        <button class="pop-btn" data-pa="more">${icon('book-open')}<span>例句</span></button>
      </div>`;
    pop.hidden = false; popFor = w; popEl = el;
    placePop();
  };
  const hidePop = () => { pop.hidden = true; popFor = null; popEl = null; $$('.si.hot', canvas).forEach(x => x.classList.remove('hot')); };
  const sc0 = $('.scene', body);
  sc0.addEventListener('scroll', placePop, { passive: true });
  popCtl = { place: placePop, hide: hidePop };
  pop.onclick = e => {
    const pa = e.target.closest('[data-pa]'); if (!pa || !popFor) return;
    const w = popFor, k = keyOf(topic.id, w.en);
    if (pa.dataset.pa === 'say') speak(w.en);
    if (pa.dataset.pa === 'slow') speak(w.en, { rate: 0.55 });
    if (pa.dataset.pa === 'fav') { store.toggleFav(k); showPop(popEl, w); renderChrome(currentNav); }
    if (pa.dataset.pa === 'more') { const el = popEl; hidePop(); openWord(topic.id, w, { silent: true }); }
  };

  const nextFind = () => {
    finding = items[Math.floor(Math.random() * items.length)];
    findBar.hidden = false;
    findBar.innerHTML = `<span class="fb-ic">${icon('scan-search')}</span><div class="fb-txt"><small>找找看：在圖中點出</small><b>${store.settings().showZh ? esc(firstZh(finding.zh)) : '聽發音找出來'}</b></div>
      <button class="icon-btn" data-say="${esc(finding.en)}" aria-label="再聽一次">${icon('volume-2')}</button>
      <button class="btn sm" data-endfind>結束</button>`;
    speak(finding.en);
  };
  findBar.onclick = e => { if (e.target.closest('[data-endfind]')) { finding = null; findBar.hidden = true; canvas.classList.remove('finding'); } };

  canvas.addEventListener('click', async e => {
    const it = e.target.closest('.si'), bub = e.target.closest('.sb'), act = e.target.closest('[data-act]');
    if (act) { hidePop(); canvas.classList.add('finding'); nextFind(); findBar.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (bub) { hidePop(); bub.classList.add('hot'); await speak(bub.dataset.say); bub.classList.remove('hot'); return; }
    if (!it) { hidePop(); return; }
    const w = items.find(x => x.i === +it.dataset.i);
    if (finding) {
      const r = it.getBoundingClientRect();
      if (w === finding) {
        beep(true); burst(r.left + r.width / 2, r.top + r.height / 3); store.activity(1);
        it.classList.add('ok'); setTimeout(() => it.classList.remove('ok'), 700); setTimeout(nextFind, 900);
      } else { beep(false); it.classList.add('shake'); setTimeout(() => it.classList.remove('shake'), 450); }
      return;
    }
    // 點單字：只唸這一個字，並顯示小卡
    $$('.si.hot', canvas).forEach(x => x.classList.remove('hot'));
    it.classList.add('hot');
    store.markSeen(keyOf(topic.id, w.en));
    showPop(it, w);
    speak(w.en);
  });
  $('.phrase-grid', body)?.addEventListener('click', e => {
    const p = e.target.closest('.phrase'); if (!p) return;
    const w = topic.words[p.dataset.i];
    store.markSeen(keyOf(topic.id, w.en));
    p.classList.add('speaking'); speak(w.en).then(() => p.classList.remove('speaking'));
  });
  // 情境圖右側漸層提示：捲到底就隱藏
  const sc = $('.scene', body), fade = $('.scene-fade', body);
  const upd = () => fade.classList.toggle('hide', sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 8);
  sc.addEventListener('scroll', upd, { passive: true }); upd();
  bindDialogues(body);
}

function tabWords(body, topic) {
  let filter = 'all';
  const render = () => {
    const list = topic.words.map((w, i) => ({ w, i })).filter(({ w }) =>
      filter === 'all' || (filter === 'word' && w.type !== 'phrase') || (filter === 'phrase' && w.type === 'phrase') || (filter === 'fav' && store.isFav(keyOf(topic.id, w.en))));
    body.innerHTML = `<div class="toolbar">
      <div class="pills">${[['all', '全部', topic.words.length], ['word', '單字', topic.words.filter(w => w.type !== 'phrase').length], ['phrase', '片語', topic.words.filter(w => w.type === 'phrase').length], ['fav', '收藏', topic.words.filter(w => store.isFav(keyOf(topic.id, w.en))).length]]
        .map(([k, l, n]) => `<button class="pill ${filter === k ? 'on' : ''}" data-f="${k}">${l}<span class="count">${n}</span></button>`).join('')}</div>
      <span class="hint-s">${icon('volume-2')}點卡片聽發音</span></div>
      <div class="wgrid">${list.map(({ w, i }) => {
        const k = keyOf(topic.id, w.en), fav = store.isFav(k);
        return `<div class="wcard ${store.state.seen[k] ? 'seen' : ''}" data-i="${i}" role="button" tabindex="0" aria-label="${esc(w.en)}，點擊發音">
          <span class="wcard-art">${w.emoji}</span>
          <div class="wcard-txt"><b>${esc(w.en)}</b>${kkHtml(w)}${store.settings().showZh ? `<span class="zh">${esc(w.zh)}</span>` : ''}</div>
          <div class="wcard-actions">
            <button class="icon-btn sm ${fav ? 'active' : ''}" data-fav="${i}" aria-label="收藏">${icon(fav ? 'bookmark-check' : 'bookmark')}</button>
            <button class="icon-btn sm" data-more="${i}" aria-label="例句與詳細">${icon('chevron-right')}</button>
          </div>
        </div>`;
      }).join('') || `<div class="empty-card">${icon('bookmark')}<p>${filter === 'fav' ? '這個主題還沒有收藏的單字<br><small>點單字卡右邊的書籤就能收藏，之後會出現在複習清單</small>' : '沒有內容'}</p></div>`}</div>`;
  };
  render();
  body.onclick = e => {
    const f = e.target.closest('[data-f]'), fav = e.target.closest('[data-fav]'), more = e.target.closest('[data-more]'), card = e.target.closest('.wcard');
    if (f) { filter = f.dataset.f; render(); return; }
    if (fav) { const w = topic.words[fav.dataset.fav]; toast(store.toggleFav(keyOf(topic.id, w.en)) ? `已收藏 ${w.en}` : `已取消收藏 ${w.en}`); render(); renderChrome(currentNav); return; }
    if (more) { openWord(topic.id, topic.words[more.dataset.more]); return; }
    if (card) {
      const w = topic.words[card.dataset.i];
      store.markSeen(keyOf(topic.id, w.en));
      card.classList.add('seen', 'speaking');
      speak(w.en).then(() => card.classList.remove('speaking'));
    }
  };
  body.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('wcard')) { e.preventDefault(); e.target.click(); } };
}

function dialogueHtml(d) {
  if (!d) return '';
  return `<div class="dlg"><div class="dlg-h">${icon('messages-square')}<b>${esc(d.title)}</b><small>點每一句聽發音</small></div>
    ${d.lines.map((l, i) => `<button class="ln ${i % 2 ? 'b' : 'a'}" data-en="${esc(l.en)}"><span class="av">${i % 2 ? '👧' : '🧒'}</span>
      <span class="bubble"><span class="en">${esc(l.en)}</span>${store.settings().showZh ? `<span class="zh">${esc(l.zh)}</span>` : ''}</span></button>`).join('')}</div>`;
}
function bindDialogues(root) {
  $$('.dlg', root).forEach(dlg => dlg.addEventListener('click', async e => {
    const ln = e.target.closest('.ln'); if (!ln) return;
    $$('.ln.speaking', dlg).forEach(x => x.classList.remove('speaking'));
    ln.classList.add('speaking');
    await speak(ln.dataset.en, { alt: ln.classList.contains('b') });
    ln.classList.remove('speaking');
  }));
}

function tabTalk(body, topic) {
  body.innerHTML = `<div class="sec-head first"><h3>實用句型</h3><small>點一句聽一句</small></div>
    <div class="sent-list">${topic.sentences.map((s, i) => `<button class="sent" data-say="${esc(s.en)}">
      <span class="sent-no">${i + 1}</span>
      <span class="sent-txt"><span class="en">${esc(s.en)}</span>${store.settings().showZh ? `<span class="zh">${esc(s.zh)}</span>` : ''}${s.note ? `<span class="note">${icon('lightbulb')}${esc(s.note)}</span>` : ''}</span>
      <span class="sent-ic">${icon('volume-2')}</span></button>`).join('')}</div>
    <div class="sec-head"><h3>情境對話</h3></div>
    <div class="dlg-grid">${topic.dialogues.map(dialogueHtml).join('')}</div>`;
  bindDialogues(body);
}

function tabQuiz(body, topic) {
  const best = store.state.quiz[topic.id]?.best;
  body.innerHTML = `<div class="quiz-start">
    <div class="qs-art">${topic.emoji}</div>
    <h3>${esc(topic.zh)}小測驗</h3>
    <p class="muted">共 10 題，混合五種題型</p>
    <ul class="qs-types">
      <li>${icon('image')}看圖選字</li><li>${icon('headphones')}聽音辨圖</li><li>${icon('languages')}中翻英</li><li>${icon('type')}拼字</li><li>${icon('shuffle')}句子重組</li>
    </ul>
    ${best != null ? `<p class="best">${icon('trophy')}最佳成績 ${best} 分</p>` : ''}
    <button class="btn primary lg" data-start>${icon('play')}開始挑戰</button></div>`;
  body.querySelector('[data-start]').onclick = () => runQuiz(body, topic, { onDone: score => { store.recordQuiz(topic.id, score); renderChrome(currentNav); } });
}

// ---------- 複習（字卡） ----------
async function renderReview() {
  setTop({ title: '複習', sub: '間隔重複記憶法' });
  const due = store.dueKeys(), all = store.reviewKeys();
  const favKeys = Object.keys(store.state.fav);
  view.innerHTML = `<div class="page-narrow">
    <section class="stats">
      ${stat('layers', '待複習', due.length, '個', 'violet')}${stat('list', '複習清單', all.length, '個', 'blue')}
      ${stat('bookmark', '收藏', favKeys.length, '個', 'orange')}${stat('brain', '已熟記', store.mastered(), '個', 'green')}
    </section>
    <section class="review-modes">
      <button class="mode-card primary" data-go="due" ${due.length ? '' : 'disabled'}>${icon('layers')}<b>開始複習</b><small>${due.length ? `${due.length} 個單字到期` : '目前沒有到期的單字'}</small></button>
      <button class="mode-card" data-go="all" ${all.length ? '' : 'disabled'}>${icon('rotate-ccw')}<b>複習全部清單</b><small>${all.length} 個單字</small></button>
      <button class="mode-card" data-go="random" ${store.seenCount() ? '' : 'disabled'}>${icon('shuffle')}<b>隨機抽考</b><small>從已學過的單字抽 20 個</small></button>
    </section>
    <label class="switch-row"><span><b>中翻英模式</b><small>看中文，想出英文</small></span><input type="checkbox" class="switch" id="rvZh"></label>
    <div class="sec-head"><h3>我的收藏</h3><small>${favKeys.length} 個</small></div>
    <div id="favList" class="wgrid"></div></div>`;
  const favWords = await resolveKeys(favKeys);
  const favList = $('#favList');
  favList.innerHTML = favWords.map(({ w }, n) => `<div class="wcard" data-n="${n}" role="button" tabindex="0"><span class="wcard-art">${w.emoji}</span><div class="wcard-txt"><b>${esc(w.en)}</b>${kkHtml(w)}<span class="zh">${esc(w.zh)}</span></div><div class="wcard-actions"><button class="icon-btn sm" data-more="${n}" aria-label="詳細">${icon('chevron-right')}</button></div></div>`).join('')
    || `<div class="empty-card">${icon('bookmark')}<p>還沒有收藏的單字<br><small>在單字卡上按書籤圖示，或測驗答錯的字，都會加入複習清單</small></p></div>`;
  favList.onclick = e => {
    const more = e.target.closest('[data-more]'), card = e.target.closest('.wcard');
    if (more) { const { w, tid } = favWords[more.dataset.more]; openWord(tid, w); }
    else if (card) { speak(favWords[card.dataset.n].w.en); }
  };
  $('.review-modes', view).onclick = async e => {
    const b = e.target.closest('[data-go]'); if (!b || b.disabled) return;
    const keys = b.dataset.go === 'due' ? due : b.dataset.go === 'all' ? all : shuffle(Object.keys(store.state.seen)).slice(0, 20);
    flashcards(await resolveKeys(shuffle(keys)), $('#rvZh').checked);
  };
}
async function resolveKeys(keys) {
  const out = [];
  for (const k of keys) {
    const [tid, en] = k.split('|');
    if (!topicMeta[tid]) continue;
    const w = (await getTopic(tid)).words.find(x => x.en === en);
    if (w) out.push({ k, w, tid });
  }
  return out;
}
function flashcards(cards, zhFirst) {
  let i = 0, right = 0;
  setTop({ title: '字卡複習', back: true });
  const show = () => {
    if (i >= cards.length) {
      store.activity(cards.length); renderChrome(currentNav);
      view.innerHTML = `<div class="result-card"><div class="qs-art">🎉</div><h3>複習完成！</h3><p class="muted">記得 ${right} / ${cards.length} 個單字</p><div class="row"><a class="btn primary lg" href="#/review">回複習頁</a></div></div>`;
      return;
    }
    const { k, w } = cards[i];
    view.innerHTML = `<div class="fc-wrap">
      <div class="fc-top"><span>${i + 1} / ${cards.length}</span><div class="progress"><i style="width:${(i / cards.length) * 100}%"></i></div></div>
      <div class="fc" tabindex="0" role="button" aria-label="翻面"><div class="fc-in">
        <div class="fc-face front"><div class="fc-art">${zhFirst ? '🤔' : w.emoji}</div><h3>${zhFirst ? esc(w.zh) : esc(w.en)}</h3>${zhFirst ? '' : kkHtml(w)}<small class="muted">點卡片翻面</small></div>
        <div class="fc-face back"><div class="fc-art">${w.emoji}</div><h3>${esc(w.en)}</h3>${kkHtml(w)}<p class="fc-zh">${esc(w.zh)}</p>${w.ex ? `<p class="fc-ex">${esc(w.ex)}<br><small>${esc(w.exZh || '')}</small></p>` : ''}</div>
      </div></div>
      <div class="fc-btns">
        <button class="btn" data-say="${esc(w.en)}">${icon('volume-2')}發音</button>
        <button class="btn danger-soft" data-r="0" hidden>${icon('circle-x')}忘記了</button>
        <button class="btn success-soft" data-r="1" hidden>${icon('circle-check')}記得</button>
      </div></div>`;
    const fc = $('.fc'), rb = $$('[data-r]');
    if (!zhFirst) speak(w.en);
    const flip = () => { if (fc.classList.contains('flip')) return; fc.classList.add('flip'); rb.forEach(b => (b.hidden = false)); speak(w.en); };
    fc.onclick = flip; fc.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
    $('.fc-btns').addEventListener('click', e => { const r = e.target.closest('[data-r]'); if (!r) return; const ok = r.dataset.r === '1'; store.grade(k, ok); if (ok) right++; i++; show(); });
  };
  show();
}

// ---------- 搜尋 ----------
async function renderSearch(q = '') {
  setTop({ title: '搜尋', sub: '英文、中文都可以' });
  view.innerHTML = `<div class="page-narrow"><label class="search-box">${icon('search')}<input id="q" type="search" placeholder="例如 apple、蘋果、How much" value="${esc(q)}" autocomplete="off" enterkeyhint="search"></label><div id="results"></div></div>`;
  const data = await loadSearch();
  const input = $('#q'), res = $('#results');
  let hits = [];
  const run = () => {
    const s = input.value.trim().toLowerCase();
    history.replaceState(null, '', '#/search' + (s ? '/' + encodeURIComponent(s) : ''));
    if (!s) { res.innerHTML = `<p class="empty">可搜尋 ${data.length} 筆單字、片語與句型</p>`; return; }
    hits = data.filter(r => r[0].toLowerCase().includes(s) || r[1].includes(s))
      .sort((a, b) => (b[0].toLowerCase() === s) - (a[0].toLowerCase() === s) || b[0].toLowerCase().startsWith(s) - a[0].toLowerCase().startsWith(s) || a[0].length - b[0].length).slice(0, 120);
    res.innerHTML = hits.length ? `<p class="muted small">找到 ${hits.length} 筆${hits.length === 120 ? '以上' : ''}・點一下聽發音</p>` + hits.map((r, n) => `<div class="sr" data-n="${n}" role="button" tabindex="0">
      <span class="sr-art" style="background:${catOf(r[3]).soft}">${r[2]}</span>
      <div class="sr-txt"><b>${esc(r[0])}</b><span>${esc(r[1])}</span><small>${r[4] === 's' ? '句型' : r[4] === 'p' ? '片語' : '單字'}・${esc(topicMeta[r[3]]?.meta.zh || '')}</small></div>
      ${r[4] !== 's' ? `<button class="icon-btn sm" data-more="${n}" aria-label="詳細">${icon('chevron-right')}</button>` : `<a class="icon-btn sm" href="#/topic/${r[3]}/talk" aria-label="前往主題">${icon('chevron-right')}</a>`}
    </div>`).join('') : `<div class="empty-card">${icon('search')}<p>找不到「${esc(s)}」相關的內容</p></div>`;
  };
  res.onclick = async e => {
    const more = e.target.closest('[data-more]'), row = e.target.closest('.sr');
    if (e.target.closest('a')) return;
    if (more) { const r = hits[more.dataset.more]; openWord(r[3], (await getTopic(r[3])).words[r[5]]); return; }
    if (row) { row.classList.add('speaking'); speak(hits[row.dataset.n][0]).then(() => row.classList.remove('speaking')); }
  };
  input.oninput = run; run();
  if (isDesktop() || !q) input.focus();
}

// ---------- 我的 ----------
let installEvt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
function renderMe() {
  setTop({ title: '我的學習', sub: '進度與設定' });
  const s = store.settings(), st = store.state;
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); const k = d.toLocaleDateString('sv-SE'); return { n: st.days[k] || 0, d: d.getDate(), today: i === 13 }; });
  const maxN = Math.max(1, ...days.map(d => d.n));
  const sel = (key, opts) => `<select data-set="${key}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(s[key]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  view.innerHTML = `<div class="me-grid">
    <div class="me-col">
      <section class="stats">
        ${stat('flame', '連續天數', store.streak(), '天', 'orange')}${stat('book-open', '已學單字', store.seenCount(), '個', 'violet')}
        ${stat('brain', '已熟記', store.mastered(), '個', 'green')}${stat('trophy', '完成測驗', Object.keys(st.quiz).length, '個主題', 'blue')}
      </section>
      <section class="panel">
        <div class="panel-h"><h3>最近兩週</h3><small>每日學習量</small></div>
        <div class="chart">${days.map(d => `<div class="col ${d.today ? 'today' : ''}" title="${d.n}"><span class="v">${d.n || ''}</span><i style="height:${Math.max(3, (d.n / maxN) * 100)}%"></i><small>${d.d}</small></div>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>各類別進度</h3></div>
        ${INDEX.categories.map(c => { const total = c.topics.reduce((a, t) => a + t.counts.words + t.counts.phrases, 0); const seen = c.topics.reduce((a, t) => a + store.seenCount(t.id), 0);
          return `<div class="prog" style="--c:${c.color}"><span class="prog-ic" style="background:${c.soft}">${c.emoji}</span><span class="prog-name">${esc(c.zh)}</span><div class="progress"><i style="width:${(seen / total) * 100}%"></i></div><small>${seen}/${total}</small></div>`; }).join('')}
      </section>
    </div>
    <div class="me-col">
      <section class="panel settings">
        <div class="panel-h"><h3>發音設定</h3></div>
        <label class="set-row"><span>${icon('gauge')}語速</span><span class="range"><input type="range" min="0.5" max="1.3" step="0.1" value="${s.rate}" data-set="rate"><output>${s.rate}×</output></span></label>
        <label class="set-row"><span>${icon('languages')}口音</span>${sel('accent', [['en-US', '美式'], ['en-GB', '英式'], ['en-AU', '澳式']])}</label>
        <label class="set-row"><span>${icon('headphones')}發音來源</span>${sel('engine', [['auto', '自動（建議）'], ['device', '裝置內建語音'], ['online', '線上真人發音（需網路）']])}</label>
        <label class="set-row"><span>${icon('mic-vocal')}語音</span>${sel('voice', [['', '自動選擇'], ...englishVoices().map(v => [v.voiceURI, `${v.name} (${v.lang})`])])}</label>
        <button class="btn" data-say="Hello! Nice to meet you.">${icon('volume-2')}試聽</button>
        ${speechSupported() ? '' : '<p class="note-warn">此瀏覽器不支援內建語音，將使用線上發音。</p>'}
      </section>
      <section class="panel settings">
        <div class="panel-h"><h3>顯示與目標</h3></div>
        <label class="set-row"><span>${icon('type')}顯示 KK 音標</span><input type="checkbox" class="switch" data-set="showKK" ${s.showKK ? 'checked' : ''}></label>
        <label class="set-row"><span>${icon('languages')}顯示中文翻譯</span><input type="checkbox" class="switch" data-set="showZh" ${s.showZh ? 'checked' : ''}></label>
        <label class="set-row"><span>${icon('target')}每日目標</span>${sel('goal', [[10, '10 個'], [20, '20 個'], [30, '30 個'], [50, '50 個']])}</label>
      </section>
      <section class="panel settings">
        <div class="panel-h"><h3>App 與資料</h3></div>
        ${installEvt ? `<button class="btn primary" data-install>${icon('smartphone')}安裝到主畫面</button>` : ''}
        <p class="note">iPhone：Safari → 分享 →「加入主畫面」；Android：Chrome 選單 →「安裝應用程式」。安裝後可離線使用。</p>
        <div class="btn-row">
          <button class="btn" data-export>${icon('download')}匯出紀錄</button>
          <label class="btn">${icon('upload')}匯入紀錄<input type="file" accept=".json,application/json" data-import hidden></label>
          <button class="btn danger-soft" data-reset>${icon('trash-2')}清除紀錄</button>
        </div>
      </section>
      <p class="foot">情境英語圖鑑 · ${INDEX.totals.entries} 筆內容 · 資料版本 ${INDEX.generated.slice(0, 10)}</p>
    </div></div>`;
  const me = $('.me-grid');
  me.addEventListener('change', e => {
    const el = e.target.closest('[data-set]'); if (!el) return;
    const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.dataset.set === 'goal' ? +el.value : el.value;
    store.setSetting(el.dataset.set, v);
    if (el.dataset.set === 'goal') renderChrome('me');
  });
  me.addEventListener('input', e => { const el = e.target.closest('[type=range]'); if (el) { el.nextElementSibling.textContent = el.value + '×'; store.setSetting('rate', +el.value); } });
  me.onclick = e => {
    if (e.target.closest('[data-install]') && installEvt) { installEvt.prompt(); installEvt = null; }
    if (e.target.closest('[data-export]')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' })); a.download = `english-progress-${new Date().toLocaleDateString('sv-SE')}.json`; a.click(); }
    if (e.target.closest('[data-reset]') && confirm('確定要清除所有學習紀錄嗎？此動作無法復原。')) { store.reset(); renderChrome('me'); renderMe(); toast('已清除所有紀錄'); }
  };
  $('[data-import]', me).onchange = async e => { try { store.import(await e.target.files[0].text()); toast('匯入成功'); renderChrome('me'); renderMe(); } catch { toast('檔案格式錯誤'); } };
}

// ---------- 路由 ----------
let currentNav = 'home';
async function route() {
  stop(); closeModal();
  const [, page, a, b] = location.hash.replace(/^#/, '').split('/');
  currentNav = ['review', 'search', 'me'].includes(page) ? page : 'home';
  renderChrome(currentNav);
  document.body.dataset.page = page === 'topic' && !topicMeta[a] ? 'notfound' : (page || 'home');
  if (page === 'topic' && topicMeta[a]) { document.body.style.setProperty('--c', catOf(a).color); }
  else { document.body.style.removeProperty('--c'); }
  popCtl?.hide(); popCtl = null;
  try {
    if (page === 'topic') await renderTopic(a, b);
    else if (page === 'review') await renderReview();
    else if (page === 'search') await renderSearch(decodeURIComponent(a || ''));
    else if (page === 'me') renderMe();
    else await renderHome();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty-card">${icon('circle-x')}<p>載入失敗，請檢查網路後重試<br><small>${esc(err.message)}</small></p></div>`;
  }
  const keepScroll = page === 'topic' && route.lastTopic === a;
  route.lastTopic = page === 'topic' ? a : null;
  if (!keepScroll) window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
loadIndex().then(route).catch(err => { view.innerHTML = `<p class="empty">無法載入資料：${esc(err.message)}</p>`; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('內容已更新，重新開啟即可使用新版本'); });
    });
  }).catch(() => {});
}
