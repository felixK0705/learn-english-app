// 情境插畫檢查工具：截圖 + 自動找出標籤重疊、超出畫面、漏掉的單字
// 用法：node tools/scene-check.cjs <topicId> [outDir]   （需先在專案根目錄啟動 python3 -m http.server 8765）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const id = process.argv[2];
  const out = process.argv[3] || '/tmp/scene-check';
  if (!id) { console.error('usage: node tools/scene-check.cjs <topicId> [outDir]'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const topic = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'topics', id + '.json'), 'utf8'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8765/#/topic/' + id);
  await p.waitForSelector('.scene-canvas');
  await p.waitForTimeout(1300);
  const report = await p.evaluate(() => {
    const cv = document.querySelector('.scene-canvas');
    const C = cv.getBoundingClientRect();
    const rel = r => ({ l: r.left - C.left, t: r.top - C.top, r: r.right - C.left, b: r.bottom - C.top });
    const name = el => el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30);
    const tags = [...cv.querySelectorAll('.si-tag')].map(el => ({ el, n: name(el), ...rel(el.getBoundingClientRect()) }));
    const objs = [...cv.querySelectorAll('.si-obj, .sp-p')].map(el => {
      // emoji 字形實際墨色範圍約為字框中央 80%
      const r = rel(el.getBoundingClientRect()), w = r.r - r.l, h = r.b - r.t;
      return { n: name(el) || el.textContent, l: r.l + w * .12, r: r.r - w * .12, t: r.t + h * .1, b: r.b - h * .08 };
    });
    const bubs = [...cv.querySelectorAll('.sb')].map(el => ({ n: 'bubble:' + el.dataset.say.slice(0, 20), ...rel(el.getBoundingClientRect()) }));
    const title = cv.querySelector('.ill-title');
    const tr = title && title.getBoundingClientRect();
    const titleBox = tr ? { n: 'TITLE', ...rel(tr) } : null;
    const inter = (a, c, pad = 0) => Math.max(0, Math.min(a.r, c.r) - Math.max(a.l, c.l) + pad) * Math.max(0, Math.min(a.b, c.b) - Math.max(a.t, c.t) + pad);
    const area = a => (a.r - a.l) * (a.b - a.t);
    const issues = [];
    tags.forEach((a, i) => {
      if (a.l < 2 || a.t < 2 || a.r > C.width - 2 || a.b > C.height - 2) issues.push(`OUT OF CANVAS: label "${a.n}"`);
      tags.slice(i + 1).forEach(c => { if (inter(a, c) > 4) issues.push(`LABEL OVERLAP: "${a.n}" × "${c.n}"`); });
      objs.forEach(o => { const v = inter(a, o); if (v > area(a) * 0.12) issues.push(`LABEL COVERS OBJECT: "${a.n}" × "${o.n}" (${Math.round(v / area(a) * 100)}%)`); });
      bubs.forEach(o => { if (inter(a, o) > 4) issues.push(`LABEL UNDER BUBBLE: "${a.n}" × ${o.n}`); });
      if (titleBox) {
        // 標題是圓形：用圓心距離判斷
        const cx = (titleBox.l + titleBox.r) / 2, cy = (titleBox.t + titleBox.b) / 2, R = (titleBox.r - titleBox.l) / 2;
        const nx = Math.max(a.l, Math.min(cx, a.r)), ny = Math.max(a.t, Math.min(cy, a.b));
        if (Math.hypot(nx - cx, ny - cy) < R) issues.push(`LABEL UNDER TITLE: "${a.n}"`);
      }
    });
    objs.forEach((a, i) => {
      if (a.l < -4 || a.t < -4 || a.r > C.width + 4 || a.b > C.height + 4) issues.push(`OBJECT OUT OF CANVAS: "${a.n}"`);
      objs.slice(i + 1).forEach(c => { const v = inter(a, c); if (v > Math.min(area(a), area(c)) * 0.25) issues.push(`OBJECTS OVERLAP: "${a.n}" × "${c.n}" (${Math.round(v / Math.min(area(a), area(c)) * 100)}%)`); });
      bubs.forEach(o => { if (inter(a, o) > area(a) * 0.15) issues.push(`OBJECT UNDER BUBBLE: "${a.n}" × ${o.n}`); });
      if (titleBox) {
        const cx = (titleBox.l + titleBox.r) / 2, cy = (titleBox.t + titleBox.b) / 2, R = (titleBox.r - titleBox.l) / 2;
        const nx = Math.max(a.l, Math.min(cx, a.r)), ny = Math.max(a.t, Math.min(cy, a.b));
        if (Math.hypot(nx - cx, ny - cy) < R) issues.push(`OBJECT UNDER TITLE: "${a.n}"`);
      }
    });
    bubs.forEach((a, i) => {
      if (a.l < 0 || a.t < 0 || a.r > C.width || a.b > C.height) issues.push(`BUBBLE OUT OF CANVAS: ${a.n}`);
      bubs.slice(i + 1).forEach(c => { if (inter(a, c) > 4) issues.push(`BUBBLES OVERLAP`); });
    });
    return { issues, n: tags.length, w: C.width, h: C.height };
  });
  const words = topic.words.filter(w => w.type !== 'phrase').map(w => w.en);
  const placed = Object.keys(topic.scene?.items || {});
  const missing = words.filter(w => !placed.includes(w));
  const extra = placed.filter(w => !words.includes(w));
  await (await p.$('.scene-canvas')).screenshot({ path: path.join(out, id + '.png') });
  // 手機尺寸（橫向捲動）也存一張
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const mp = await m.newPage();
  await mp.goto('http://localhost:8765/#/topic/' + id); await mp.waitForSelector('.scene-canvas'); await mp.waitForTimeout(1200);
  await (await mp.$('.scene-canvas')).screenshot({ path: path.join(out, id + '-mobile.png') });
  await b.close();
  console.log(`topic: ${id}  labels: ${report.n}/${words.length}  canvas: ${Math.round(report.w)}x${Math.round(report.h)}`);
  if (missing.length) console.log('MISSING WORDS (not placed in scene.items):', missing.join(', '));
  if (extra.length) console.log('UNKNOWN KEYS in scene.items (not a word in this topic):', extra.join(', '));
  report.issues.forEach(s => console.log(s));
  if (errs.length) console.log('PAGE ERRORS:', errs.join(' | '));
  console.log(report.issues.length || missing.length || extra.length || errs.length ? `FAIL (${report.issues.length} layout issues)` : 'OK — no issues');
  console.log('screenshot:', path.join(out, id + '.png'));
})();
