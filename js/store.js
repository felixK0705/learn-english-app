// 學習進度與設定，存在 localStorage
const KEY = 'ele:v1';
const DAY = 86400000;
const INTERVALS = [0, 1, 2, 4, 7, 15, 30]; // Leitner 複習間隔（天）

const defaults = () => ({
  settings: { rate: 0.9, accent: 'en-US', voice: '', showKK: true, showZh: true },
  fav: {},        // key -> true
  srs: {},        // key -> { box, due }
  seen: {},       // key -> 第一次看到的時間
  quiz: {},       // topicId -> { best, plays }
  days: {},       // 'YYYY-MM-DD' -> 當天學習次數
  xp: 0,
});

let state;
try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
catch { state = defaults(); }
state.settings = Object.assign(defaults().settings, state.settings);

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
const today = () => new Date().toLocaleDateString('sv-SE');

export const keyOf = (topicId, en) => `${topicId}|${en}`;
export const store = {
  get state() { return state; },
  settings: () => state.settings,
  setSetting(k, v) { state.settings[k] = v; save(); },

  isFav: k => !!state.fav[k],
  toggleFav(k) {
    if (state.fav[k]) delete state.fav[k];
    else { state.fav[k] = true; if (!state.srs[k]) state.srs[k] = { box: 0, due: Date.now() }; }
    save(); return !!state.fav[k];
  },

  markSeen(k) {
    if (!state.seen[k]) { state.seen[k] = Date.now(); this.activity(1); save(); }
  },
  seenCount(prefix) {
    return prefix ? Object.keys(state.seen).filter(k => k.startsWith(prefix + '|')).length : Object.keys(state.seen).length;
  },

  // 測驗/複習結果：答對升級、答錯回到第 0 盒並排入複習
  grade(k, correct) {
    if (correct && !state.srs[k]) return; // 不在複習清單、又答對的字不必排入
    const s = state.srs[k] || { box: 0, due: Date.now() };
    s.box = correct ? Math.min(s.box + 1, INTERVALS.length - 1) : 0;
    s.due = Date.now() + INTERVALS[s.box] * DAY;
    state.srs[k] = s; save();
  },
  addReview(k) { if (!state.srs[k]) { state.srs[k] = { box: 0, due: Date.now() }; save(); } },
  dueKeys() { const now = Date.now(); return Object.keys(state.srs).filter(k => state.srs[k].due <= now); },
  reviewKeys: () => Object.keys(state.srs),
  mastered: () => Object.values(state.srs).filter(s => s.box >= 4).length,

  recordQuiz(topicId, score) {
    const q = state.quiz[topicId] || { best: 0, plays: 0 };
    q.best = Math.max(q.best, score); q.plays++;
    state.quiz[topicId] = q; save();
  },

  activity(n = 1) { const d = today(); state.days[d] = (state.days[d] || 0) + n; state.xp += n; save(); },
  streak() {
    let n = 0; const d = new Date();
    if (!state.days[today()]) d.setDate(d.getDate() - 1);
    while (state.days[d.toLocaleDateString('sv-SE')]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  todayCount: () => state.days[today()] || 0,

  export: () => JSON.stringify(state),
  import(json) { state = Object.assign(defaults(), JSON.parse(json)); save(); },
  reset() { state = defaults(); save(); },
};
