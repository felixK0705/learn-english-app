// 主題小測驗：看圖選字、聽音辨圖、中翻英、拼字、句子重組
import { store, keyOf } from './store.js';
import { speak } from './speech.js';
import { esc, $, shuffle, sample, beep, burst } from './util.js';
import { icon } from './icons.js';

const TYPES = ['pic', 'listen', 'zh', 'spell', 'order'];

function makeQuestions(topic) {
  const words = topic.words;
  const singles = words.filter(w => w.type !== 'phrase');
  const spellable = singles.filter(w => /^[a-z]{3,10}$/i.test(w.en));
  const orderable = topic.sentences.filter(s => { const n = s.en.split(' ').length; return n >= 3 && n <= 9; });
  const qs = [];
  const plan = shuffle([...Array(10)].map((_, i) => TYPES[i % TYPES.length]));
  const used = new Set();
  const pick = pool => { const fresh = pool.filter(w => !used.has(w.en)); const w = sample(fresh.length ? fresh : pool, 1)[0]; used.add(w.en); return w; };
  for (const type of plan) {
    if (type === 'spell' && spellable.length) { qs.push({ type, w: pick(spellable) }); continue; }
    if (type === 'order' && orderable.length) { const s = sample(orderable.filter(s => !used.has(s.en)), 1)[0] || sample(orderable, 1)[0]; used.add(s.en); qs.push({ type, s }); continue; }
    const t = type === 'spell' || type === 'order' ? 'pic' : type;
    const pool = t === 'zh' ? words : singles.length >= 4 ? singles : words;
    const w = pick(pool);
    // 干擾選項避開相同 emoji
    const opts = shuffle([w, ...sample(pool.filter(x => x !== w && x.emoji !== w.emoji && x.en !== w.en), 3)]);
    qs.push({ type: t, w, opts });
  }
  return qs;
}

export function runQuiz(body, topic, { onDone }) {
  const qs = makeQuestions(topic);
  let i = 0, score = 0;
  const wrong = [];

  const finish = () => {
    const pts = Math.round((score / qs.length) * 100);
    onDone(pts); store.activity(qs.length);
    const stars = [1, 2, 3].map(n => `<span class="${pts >= [30, 60, 90][n - 1] ? 'on' : ''}">${icon('star')}</span>`).join('');
    body.innerHTML = `<div class="result-card">
      <div class="qs-art">${pts >= 60 ? '🏆' : '📚'}</div><div class="stars">${stars}</div>
      <h3>${pts} 分</h3><p class="muted">答對 ${score} / ${qs.length} 題${pts === 100 ? '，太厲害了！' : pts >= 60 ? '，做得好！' : '，再接再厲！'}</p>
      ${wrong.length ? `<div class="wrong-list"><h4>需要加強（已加入複習清單）・點一下聽發音</h4>${wrong.map(w => `<button class="pill" data-say="${esc(w.en)}">${w.emoji || '💬'} ${esc(w.en)}<span class="count">${esc(w.zh)}</span></button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn primary lg" data-again>${icon('rotate-ccw')}再玩一次</button><a class="btn lg" href="#/review">${icon('layers')}去複習</a></div></div>`;
    if (pts >= 60) { const r = $('.qs-pic', body).getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }
    $('[data-again]', body).onclick = () => runQuiz(body, topic, { onDone });
  };

  const answer = async (ok, item, el) => {
    if (ok) { score++; beep(true); if (el) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, ['⭐', '✨']); } }
    else { beep(false); wrong.push(item); }
    if (item.emoji) store.grade(keyOf(topic.id, item.en), ok); // 句子不進字卡
    if (!ok && item.emoji) store.addReview(keyOf(topic.id, item.en));
    if (item.emoji) store.markSeen(keyOf(topic.id, item.en));
    $('.q-next', body).hidden = false;
    $('.q-next', body).focus();
    await speak(item.en);
  };

  const show = () => {
    if (i >= qs.length) return finish();
    const q = qs[i];
    const head = `<div class="q-prog"><span>${i + 1} / ${qs.length}</span><div class="progress"><i style="width:${(i / qs.length) * 100}%"></i></div><span class="q-score">${icon('circle-check')}${score}</span></div>`;
    const next = `<button class="btn primary lg q-next" hidden>${i + 1 === qs.length ? '看結果' : '下一題'}${icon('arrow-right')}</button>`;
    if (q.type === 'pic' || q.type === 'listen' || q.type === 'zh') {
      const prompt = q.type === 'pic' ? `<p class="q-ask">這是什麼？</p><div class="q-pic">${q.w.emoji}</div>`
        : q.type === 'listen' ? `<p class="q-ask">聽聽看，是哪一個？</p><button class="q-listen" data-replay aria-label="再聽一次">${icon('volume-2')}</button>`
        : `<p class="q-ask">「${esc(q.w.zh)}」的英文是？</p><div class="q-pic sm">${q.w.emoji}</div>`;
      const opt = o => q.type === 'listen'
        ? `<button class="opt pic" data-en="${esc(o.en)}"><span>${o.emoji}</span><small>${esc(o.zh.split(/[；;]/)[0])}</small></button>`
        : `<button class="opt" data-en="${esc(o.en)}">${esc(o.en)}</button>`;
      body.innerHTML = `<div class="quiz">${head}${prompt}<div class="opts ${q.type === 'listen' ? 'grid' : ''}">${q.opts.map(opt).join('')}</div>${next}</div>`;
      if (q.type === 'listen') { speak(q.w.en); $('[data-replay]', body).onclick = () => speak(q.w.en); }
      $('.opts', body).onclick = e => {
        const b = e.target.closest('.opt'); if (!b || $('.opts', body).classList.contains('done')) return;
        $('.opts', body).classList.add('done');
        const ok = b.dataset.en === q.w.en;
        b.classList.add(ok ? 'ok' : 'no');
        [...body.querySelectorAll('.opt')].find(x => x.dataset.en === q.w.en).classList.add('ok');
        answer(ok, q.w, b);
      };
    } else if (q.type === 'spell') {
      const letters = q.w.en.toLowerCase().split('');
      const extra = sample('abcdefghijklmnoprstuwy'.split('').filter(c => !letters.includes(c)), 2);
      const tiles = shuffle([...letters, ...extra]);
      body.innerHTML = `<div class="quiz">${head}<p class="q-ask">拼出這個單字：${esc(q.w.zh)}</p><div class="q-pic">${q.w.emoji}</div>
        <div class="spell-slots">${letters.map(() => '<span class="slot"></span>').join('')}</div>
        <div class="tiles">${tiles.map((c, n) => `<button class="tile" data-n="${n}">${c}</button>`).join('')}</div>
        <div class="row"><button class="btn sm" data-undo>${icon('delete')}刪除</button><button class="btn sm" data-hint>${icon('volume-2')}聽提示</button></div>${next}</div>`;
      const typed = [];
      const slots = [...body.querySelectorAll('.slot')];
      const paint = () => slots.forEach((s, n) => (s.textContent = typed[n]?.c || ''));
      body.querySelector('.quiz').onclick = e => {
        if (!$('.q-next', body).hidden) return;
        const t = e.target.closest('.tile');
        if (e.target.closest('[data-hint]')) speak(q.w.en, { rate: 0.6 });
        if (e.target.closest('[data-undo]') && typed.length) { const last = typed.pop(); last.el.disabled = false; paint(); }
        if (t && !t.disabled && typed.length < letters.length) {
          t.disabled = true; typed.push({ c: t.textContent, el: t }); paint();
          if (typed.length === letters.length) {
            const ok = typed.map(x => x.c).join('') === q.w.en.toLowerCase();
            $('.spell-slots', body).classList.add(ok ? 'ok' : 'no');
            if (!ok) $('.spell-slots', body).insertAdjacentHTML('afterend', `<p class="answer">正確答案：<b>${esc(q.w.en)}</b></p>`);
            answer(ok, q.w, $('.spell-slots', body));
          }
        }
      };
    } else if (q.type === 'order') {
      const tokens = q.s.en.split(' ');
      let pool = shuffle(tokens.map((t, n) => ({ t, n })));
      if (pool.every((p, n) => p.n === n)) pool = pool.reverse();
      const built = [];
      body.innerHTML = `<div class="quiz">${head}<p class="q-ask">把句子排好：</p><p class="q-zh">${esc(q.s.zh)}</p>
        <div class="order-built"></div><div class="tiles words"></div>
        <div class="row"><button class="btn sm" data-undo>${icon('delete')}刪除</button><button class="btn sm" data-hint>${icon('volume-2')}聽句子</button></div>${next}</div>`;
      const paint = () => {
        $('.order-built', body).innerHTML = built.map(p => `<span class="wtile">${esc(p.t)}</span>`).join('') || '<span class="ph">點下方的字卡組成句子</span>';
        $('.tiles', body).innerHTML = pool.map((p, n) => `<button class="tile w" data-n="${n}" ${built.includes(p) ? 'disabled' : ''}>${esc(p.t)}</button>`).join('');
      };
      paint();
      body.querySelector('.quiz').onclick = e => {
        if (!$('.q-next', body).hidden) return;
        if (e.target.closest('[data-hint]')) speak(q.s.en);
        if (e.target.closest('[data-undo]')) { built.pop(); paint(); }
        const t = e.target.closest('.tile');
        if (t && !t.disabled) {
          built.push(pool[t.dataset.n]); paint();
          if (built.length === tokens.length) {
            const ok = built.map(p => p.t).join(' ') === q.s.en;
            $('.order-built', body).classList.add(ok ? 'ok' : 'no');
            if (!ok) $('.order-built', body).insertAdjacentHTML('afterend', `<p class="answer">正確答案：<b>${esc(q.s.en)}</b></p>`);
            answer(ok, { en: q.s.en, zh: q.s.zh }, $('.order-built', body));
          }
        }
      };
    }
    $('.q-next', body).onclick = e => { e.stopPropagation(); i++; show(); };
  };
  show();
}
