export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sample = (a, n) => shuffle(a).slice(0, n);
export const sleep = ms => new Promise(r => setTimeout(r, ms));

let actx;
// 簡單的答對／答錯音效
export function beep(ok) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [660, 880] : [220, 180];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = ok ? 'sine' : 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, actx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.06, actx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.12 + 0.18);
      o.connect(g).connect(actx.destination); o.start(actx.currentTime + i * 0.12); o.stop(actx.currentTime + i * 0.12 + 0.2);
    });
  } catch {}
}

export function burst(x, y, chars = ['⭐', '🎉', '✨', '💖']) {
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.className = 'burst'; s.textContent = chars[i % chars.length];
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 40}px`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 900);
  }
}
