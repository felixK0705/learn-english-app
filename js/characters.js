// 繪本風人物產生器：大頭、腮紅、圓眼、全身，可換髮型／服裝／姿勢／配件
// person(opts) 回傳 <svg> 字串；viewBox 200×320，腳底在 y=316
const INK = '#6b4a36';
const SKINS = { light: '#ffe0c4', tan: '#f5c79e', brown: '#c98e62', dark: '#8d5b3c' };

const arm = (sx, sy, ex, ey, color, hand, skin) =>
  `<path d="M${sx} ${sy}Q${(sx + ex) / 2 + (ex > sx ? 6 : -6)} ${(sy + ey) / 2 + 8} ${ex} ${ey}" stroke="${INK}" stroke-width="25" fill="none" stroke-linecap="round"/>
   <path d="M${sx} ${sy}Q${(sx + ex) / 2 + (ex > sx ? 6 : -6)} ${(sy + ey) / 2 + 8} ${ex} ${ey}" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
   ${hand ? `<circle cx="${ex}" cy="${ey}" r="10.5" fill="${skin}" stroke="${INK}" stroke-width="3.5"/>` : ''}`;

// 姿勢：手的終點座標（左手、右手），相對身體
const POSES = {
  stand: [[66, 214], [134, 214]],
  wave: [[66, 214], [182, 96]],
  talk: [[66, 214], [160, 176]],
  hold: [[84, 186], [116, 186]],      // 雙手在胸前（拿東西）
  cheer: [[22, 96], [178, 96]],
  point: [[66, 214], [186, 158]],
  hips: [[58, 196], [142, 196]],
};

const HAIR = {
  short: c => ({ back: '', front: `<path d="M38 92q-4-62 62-64q66 2 62 64q-12-20-30-26q-6 14-26 14q8-8 6-16q-14 12-40 12q8-6 10-14q-26 10-44 30z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  spiky: c => ({ back: '', front: `<path d="M38 96q-8-44 18-58l-4-16l20 8l10-18l14 14l18-14l6 18l22-8l-4 18q28 16 22 58q-14-22-40-28q-18 10-44 6q-20 6-38 20z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  bob: c => ({ back: `<path d="M30 96q-6-74 70-74q76 0 70 74q2 40-10 56h-22v-60h-76v60h-22q-12-16-10-56z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`,
    front: `<path d="M40 96q0-58 60-58q60 0 60 58q-20-6-34-26q-20 18-60 20q-14 2-26 6z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  pigtails: c => ({ back: `<circle cx="30" cy="104" r="22" fill="${c}" stroke="${INK}" stroke-width="3.5"/><circle cx="170" cy="104" r="22" fill="${c}" stroke="${INK}" stroke-width="3.5"/>
      <path d="M18 120q-10 30 6 48q4-26 12-40zM182 120q10 30-6 48q-4-26-12-40z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`,
    front: `<path d="M40 96q0-60 60-60q60 0 60 60q-26-4-44-30q-12 22-76 30z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="44" cy="84" r="8" fill="#ff6f8f" stroke="${INK}" stroke-width="3"/><circle cx="156" cy="84" r="8" fill="#ff6f8f" stroke="${INK}" stroke-width="3"/>` }),
  ponytail: c => ({ back: `<path d="M150 70q46 10 34 70q-6 26-24 34q10-34-2-56z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`,
    front: `<path d="M40 98q-2-62 60-62q62 0 60 62q-30-10-46-34q-24 26-74 34z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  bun: c => ({ back: `<circle cx="100" cy="22" r="22" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`,
    front: `<path d="M40 96q0-60 60-60q60 0 60 60q-14-20-60-24q-46 4-60 24z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  long: c => ({ back: `<path d="M32 92q-6-70 68-70q74 0 68 70l8 92q-30 10-50-4l-2-90h-48l-2 90q-20 14-50 4z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`,
    front: `<path d="M40 98q0-62 60-62q60 0 60 62q-34-8-52-36q-6 22-68 36z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  curly: c => ({ back: '', front: `<g fill="${c}" stroke="${INK}" stroke-width="3.5"><circle cx="50" cy="80" r="18"/><circle cx="68" cy="52" r="20"/><circle cx="100" cy="40" r="22"/><circle cx="132" cy="52" r="20"/><circle cx="150" cy="80" r="18"/></g>
      <path d="M44 84q20-30 56-32q36 2 56 32" fill="${c}" stroke="none"/>` }),
  grandpa: c => ({ back: '', front: `<path d="M38 104q-4-22 10-30q-2 26 6 38zM162 104q4-22-10-30q2 26-6 38z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
  grandma: c => ({ back: `<circle cx="100" cy="26" r="20" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`,
    front: `<path d="M40 100q0-64 60-64q60 0 60 64q-8-24-30-30q-14 14-30 0q-16 14-30 0q-22 6-30 30z" fill="${c}" stroke="${INK}" stroke-width="3.5"/>` }),
};

const FACES = {
  smile: `<path d="M86 124q14 12 28 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  talk: `<path d="M86 120q14 4 28 0q-2 18-14 18q-12 0-14-18z" fill="#e8504a" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M92 132q8-5 16 0" fill="#ff9a9a" stroke="none"/>`,
  laugh: `<path d="M82 116h36q0 26-18 26q-18 0-18-26z" fill="#e8504a" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M90 134q10-7 20 0" fill="#ff9a9a" stroke="none"/>`,
  wow: `<ellipse cx="100" cy="128" rx="8" ry="10" fill="#e8504a" stroke="${INK}" stroke-width="3.5"/>`,
};
const EYES = {
  dot: `<ellipse cx="78" cy="102" rx="6" ry="8" fill="${INK}"/><ellipse cx="122" cy="102" rx="6" ry="8" fill="${INK}"/><circle cx="80" cy="99" r="2.2" fill="#fff"/><circle cx="124" cy="99" r="2.2" fill="#fff"/>`,
  happy: `<path d="M70 104q8-10 16 0M114 104q8-10 16 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
  wink: `<ellipse cx="78" cy="102" rx="6" ry="8" fill="${INK}"/><circle cx="80" cy="99" r="2.2" fill="#fff"/><path d="M114 104q8-10 16 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
};

const ACC = {
  chefhat: `<path d="M56 62q-22-4-20-28q4-22 28-16q6-22 36-20q30-2 36 20q24-6 28 16q2 24-20 28v14h-88z" fill="#fff" stroke="${INK}" stroke-width="3.5"/><path d="M56 66h88" stroke="${INK}" stroke-width="3"/>`,
  cap: c => `<path d="M40 74q4-50 60-50q56 0 60 50z" fill="${c}" stroke="${INK}" stroke-width="3.5"/><path d="M140 72q34 0 42 12h-46z" fill="${c}" stroke="${INK}" stroke-width="3.5"/><circle cx="100" cy="26" r="6" fill="${c}" stroke="${INK}" stroke-width="3"/>`,
  glasses: `<g fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="3.5"><circle cx="78" cy="102" r="15"/><circle cx="122" cy="102" r="15"/></g><path d="M93 102h14" stroke="${INK}" stroke-width="3.5"/>`,
  bow: `<path d="M100 40l-22-12v24zM100 40l22-12v24z" fill="#ff6f8f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="40" r="6" fill="#ff6f8f" stroke="${INK}" stroke-width="3"/>`,
  nursecap: `<path d="M66 50h68l-8-22h-52z" fill="#fff" stroke="${INK}" stroke-width="3.5"/><path d="M94 32h12M100 26v12" stroke="#ff5a5a" stroke-width="4"/>`,
  helmet: c => `<path d="M36 84q2-60 64-60q62 0 64 60z" fill="${c}" stroke="${INK}" stroke-width="3.5"/><path d="M100 26v58" stroke="${INK}" stroke-width="3"/>`,
};

export function person(o = {}) {
  const skin = SKINS[o.skin] || o.skin || SKINS.light;
  const hairC = o.hairColor || '#5b3a24';
  const shirt = o.shirt || '#ff8a5b', pants = o.pants || '#4d7fd6', shoes = o.shoes || '#6b4a36';
  const pose = POSES[o.pose] || POSES.stand;
  const hair = (HAIR[o.hair] || HAIR.short)(hairC);
  const skirt = o.skirt;
  const legs = o.sit
    ? `<path d="M74 236h52v20h-52z" fill="${pants}" stroke="${INK}" stroke-width="3.5"/><path d="M78 252l-6 48M122 252l6 48" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M78 252l-6 48M122 252l6 48" stroke="${skin}" stroke-width="15" stroke-linecap="round"/><ellipse cx="68" cy="306" rx="16" ry="9" fill="${shoes}" stroke="${INK}" stroke-width="3"/><ellipse cx="132" cy="306" rx="16" ry="9" fill="${shoes}" stroke="${INK}" stroke-width="3"/>`
    : skirt
      ? `<path d="M84 262v36M116 262v36" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M84 262v36M116 262v36" stroke="${skin}" stroke-width="15" stroke-linecap="round"/>
         <path d="M64 268l12-48h48l12 48q-36 10-72 0z" fill="${skirt}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
         <ellipse cx="80" cy="306" rx="16" ry="10" fill="${shoes}" stroke="${INK}" stroke-width="3"/><ellipse cx="120" cy="306" rx="16" ry="10" fill="${shoes}" stroke="${INK}" stroke-width="3"/>`
      : `<path d="M74 222h52l4 74h-24l-6-50l-6 50h-24z" fill="${pants}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
         <ellipse cx="80" cy="304" rx="17" ry="10" fill="${shoes}" stroke="${INK}" stroke-width="3"/><ellipse cx="120" cy="304" rx="17" ry="10" fill="${shoes}" stroke="${INK}" stroke-width="3"/>`;
  const apron = o.apron ? `<path d="M80 168h40v10l8 4v48q-28 8-56 0v-48l8-4z" fill="${o.apron}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="90" y="198" width="20" height="14" rx="3" fill="rgba(255,255,255,.5)" stroke="${INK}" stroke-width="2.5"/>` : '';
  const coat = o.coat ? `<path d="M100 166v62" stroke="${INK}" stroke-width="3"/><circle cx="106" cy="186" r="2.5" fill="${INK}"/><circle cx="106" cy="204" r="2.5" fill="${INK}"/>` : '';
  const stripe = o.stripe ? `<path d="M74 192h52M72 208h56" stroke="${o.stripe}" stroke-width="7"/>` : '';
  const accTop = (o.acc || []).map(a => typeof ACC[a] === 'function' ? ACC[a](o.accColor || '#ff5a5a') : ACC[a] || '').join('');
  const holding = o.holding ? `<text x="100" y="${o.pose === 'cheer' ? 104 : 196}" font-size="46" text-anchor="middle" dominant-baseline="middle">${o.holding}</text>` : '';
  return `<svg class="pp" viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="100" cy="312" rx="56" ry="8" fill="rgba(80,52,30,.15)"/>
    ${legs}
    ${arm(80, 176, pose[0][0], pose[0][1], shirt, true, skin)}
    <path d="M70 182q0-22 30-22q30 0 30 22v46q-30 8-60 0z" fill="${shirt}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    ${stripe}${coat}${apron}
    ${arm(120, 176, pose[1][0], pose[1][1], shirt, true, skin)}
    ${hair.back}
    <circle cx="38" cy="108" r="11" fill="${skin}" stroke="${INK}" stroke-width="3.5"/><circle cx="162" cy="108" r="11" fill="${skin}" stroke="${INK}" stroke-width="3.5"/>
    <ellipse cx="100" cy="98" rx="62" ry="58" fill="${skin}" stroke="${INK}" stroke-width="3.5"/>
    <ellipse cx="62" cy="122" rx="12" ry="8" fill="#ff9a9a" opacity=".75"/><ellipse cx="138" cy="122" rx="12" ry="8" fill="#ff9a9a" opacity=".75"/>
    ${(EYES[o.eyes] || EYES.dot)}
    <path d="M97 112q3 4 6 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    ${(FACES[o.face] || FACES.smile)}
    ${hair.front}
    ${accTop}
    ${holding}
  </svg>`;
}
