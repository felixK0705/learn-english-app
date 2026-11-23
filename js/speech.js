// 發音：優先使用裝置內建語音（Web Speech API），沒有英文語音或失敗時改用線上真人發音
import { store } from './store.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
let current = null;      // 保留引用，避免 Chrome 回收 utterance 導致 onend 不觸發
let audio = null;
let token = 0;           // 每次發音的序號，用來忽略過期的回呼

const loadVoices = () => { voices = synth ? synth.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang)) : []; };
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

export const speechSupported = () => !!synth;
export const englishVoices = () => { if (!voices.length) loadVoices(); return voices; };

function pickVoice(alt) {
  const { voice, accent } = store.settings();
  const list = englishVoices();
  const pool = list.filter(v => v.lang.replace('_', '-').startsWith(accent));
  const pref = v => /natural|neural|enhanced|premium|siri|google|samantha|aria|jenny/i.test(v.name);
  let v = list.find(v => v.voiceURI === voice) || pool.find(pref) || pool[0] || list.find(pref) || list[0];
  if (alt) v = pool.find(x => x !== v) || list.find(x => x !== v) || v;
  return v;
}

export function stop() {
  token++;
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
  if (audio) { audio.pause(); audio = null; }
}

// 線上發音（有道詞典語音，type=2 美式 / type=1 英式）
function speakOnline(text, rate, my) {
  return new Promise(resolve => {
    if (!navigator.onLine) return resolve(false);
    const type = store.settings().accent === 'en-GB' ? 1 : 2;
    const a = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`);
    audio = a;
    a.playbackRate = Math.max(0.5, Math.min(rate, 1.5));
    a.preservesPitch = true;
    const done = ok => { if (audio === a) audio = null; resolve(ok); };
    a.onended = () => done(true);
    a.onerror = () => done(false);
    a.play().catch(() => done(false));
    setTimeout(() => { if (my === token && audio === a && a.paused) done(false); }, 6000);
  });
}

function speakDevice(text, { alt, rate }, my) {
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(alt);
    if (v) u.voice = v;
    u.lang = v?.lang || store.settings().accent;
    u.rate = rate;
    u.pitch = alt ? 1.12 : 1;
    current = u;
    let finished = false;
    const finish = ok => { if (!finished) { finished = true; resolve(ok); } };
    u.onend = () => finish(true);
    u.onerror = e => finish(e.error === 'interrupted' || e.error === 'canceled' ? true : false);
    // 部分瀏覽器（舊版 Safari / Chrome）不觸發 onend，用估計時間當保險
    setTimeout(() => finish(true), 1200 + text.length * 120 / rate);
    const go = () => { if (my !== token) return finish(true); synth.resume(); synth.speak(u); };
    if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(go, 60); } // Chrome：cancel 後立刻 speak 可能被吞掉
    else go();
  });
}

// 朗讀一段文字；回傳 Promise，結束後 resolve
export async function speak(text, { alt = false, rate } = {}) {
  stop();
  const my = ++token;
  const r = rate ?? store.settings().rate;
  const engine = store.settings().engine || 'auto';
  const hasVoice = synth && englishVoices().length > 0;
  if (engine === 'online' || (engine === 'auto' && !hasVoice)) {
    const ok = await speakOnline(text, r, my);
    if (ok || my !== token || !synth) return;
    return speakDevice(text, { alt, rate: r }, my);
  }
  if (!synth) return speakOnline(text, r, my);
  const ok = await speakDevice(text, { alt, rate: r }, my);
  if (!ok && my === token && engine === 'auto') await speakOnline(text, r, my);
}
