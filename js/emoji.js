// emoji → 繪本風插圖（OpenMoji，CC BY-SA 4.0，描邊改為咖啡色）；沒有插圖時保留原字元
import { EMOJI } from './emoji-list.js';
const name = e => [...e].map(c => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).filter(c => c !== 'FE0F').join('-').toLowerCase();
export const emoSrc = e => { const n = e && name(e); return n && EMOJI.has(n) ? `icons/e/${n}.svg` : null; };
export function emo(e, cls = '') {
  const s = emoSrc(e);
  return s ? `<img class="emo ${cls}" src="${s}" alt="" data-e="${e}" draggable="false" loading="lazy" onerror="this.replaceWith(this.dataset.e)">` : (e || '');
}
