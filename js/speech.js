// 使用瀏覽器內建語音合成（Web Speech API）朗讀英文
import { store } from './store.js';

const synth = window.speechSynthesis;
let voices = [];
const loadVoices = () => { voices = synth ? synth.getVoices().filter(v => /^en[-_]/i.test(v.lang)) : []; };
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

export const speechSupported = () => !!synth;
export const englishVoices = () => voices;

function pickVoice(alt) {
  const { voice, accent } = store.settings();
  const pool = voices.filter(v => v.lang.replace('_', '-').startsWith(accent));
  let v = voices.find(v => v.voiceURI === voice) || pool.find(v => /natural|enhanced|premium|google/i.test(v.name)) || pool[0] || voices[0];
  if (alt) { // 對話中的第二位說話者，盡量換一個聲音
    const other = pool.find(x => x !== v) || voices.find(x => x !== v);
    if (other) v = other;
  }
  return v;
}

export function stop() { synth?.cancel(); }

// 回傳 Promise，朗讀結束後 resolve
export function speak(text, { alt = false, rate } = {}) {
  return new Promise(resolve => {
    if (!synth) return resolve();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(alt);
    if (v) u.voice = v;
    u.lang = v?.lang || store.settings().accent;
    u.rate = rate ?? store.settings().rate;
    u.pitch = alt ? 1.15 : 1;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish; u.onerror = finish;
    setTimeout(finish, 1500 + text.length * 160); // 部分瀏覽器不會觸發 onend
    synth.speak(u);
  });
}
