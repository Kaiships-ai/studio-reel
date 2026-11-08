// kaip.js: the presenter, painted in the same watercolour + ink as the mascot (replaces the pixel sprite).
// Same call as before: kai(pose, x, y, h, o). Feet at (x, y), height h px (poses 'exp-*' = head-and-shoulders
// bust whose bottom edge sits at y). o: { flip, rot, sq, alpha (ignored), shadow:false, face, talk:false }.
// Default look: curly black hair, round black glasses, warm tan skin, black tee, black pants, black/white sneakers.
// Mouth flaps automatically while the voiceover is speaking (the presenter is the narrator); pass talk:false to stop it.
//
// Your presenter: a film's src/character.js defines `const CHARACTER = { ... }` (made from the `character-spec v1`
// block of character-designer.html at the library root). Its keys and values are PARTS below; colours are #RRGGBB.
// Missing keys keep the default; an unknown value prints a page warning and keeps the default. With no CHARACTER,
// every shape below is drawn exactly as before.
(() => {
  const DEF = {
    skin: '#E4AE84', eyes: 'classic', brows: 'classic', hair: 'curly', hair_color: '#261E2B', facial_hair: 'none',
    glasses: 'round', accessory: 'none', accessory_color: '#D93A27', top: 'tee', top_color: '#2B2733', pants_color: '#1F1B26',
  };
  const PARTS = {
    eyes: ['classic', 'big', 'sleepy', 'lashes'],
    brows: ['classic', 'thick', 'thin', 'arched', 'none'],
    hair: ['curly', 'short', 'long', 'bun', 'spiky', 'afro', 'bald'],
    facial_hair: ['none', 'stubble', 'moustache', 'goatee', 'beard'],
    glasses: ['round', 'square', 'big', 'sunglasses', 'none'],
    accessory: ['none', 'cap', 'beanie', 'headband', 'headphones', 'earrings'],
    top: ['tee', 'hoodie', 'shirt', 'jacket', 'sweater'],
  };
  let SKIN = '#E4AE84', SKIN_DK = '#C98B62', HAIR = '#261E2B', HAIR_LT = '#4A3A52', HAIR_HI = '#6A5874',
    TEE = '#2B2733', TEE_LT = '#4A4458', TEE_HI = '#6A6380', PANT = '#1F1B26', PANT_LT = '#3A3446', ACC = '#D93A27', ACC_DK = '#982819', L = DEF;
  const SOLE = '#F4EEE2', CREAM_TEE = '#F6EFE4', CREAM_TEE_DK = '#D9CDBD';
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('').toUpperCase();
  const light = c => { const [r, g, b] = rgb(c); return (.299 * r + .587 * g + .114 * b) / 255 > .55; };
  const tint = (c, k) => light(c) ? mix(c, '#2A1A16', k * .8) : mix(c, '#FFFFFF', k);   // a step away from c, readable on c
  const warned = new Set();
  function useLook() {
    const C = (typeof CHARACTER !== 'undefined' && CHARACTER) || null;
    L = {};
    for (const k in DEF) {
      let v = C && C[k] != null ? String(C[k]).trim() : DEF[k];
      const colour = k === 'skin' || k.endsWith('_color');
      if (colour) v = v.toUpperCase();
      if (colour ? !/^#[0-9A-F]{6}$/.test(v) : !PARTS[k].includes(v)) {
        if (!warned.has(k + v)) { warned.add(k + v); console.warn(`[character] ${k}: "${v}" is not an option (${colour ? '#RRGGBB' : PARTS[k].join(', ')}); using ${DEF[k]}`); }
        v = DEF[k];
      }
      L[k] = v;
    }
    const d = (v, k) => v === DEF[k];
    SKIN = L.skin; SKIN_DK = d(SKIN, 'skin') ? '#C98B62' : mix(SKIN, '#3A1E14', .22);
    HAIR = L.hair_color; HAIR_LT = d(HAIR, 'hair_color') ? '#4A3A52' : tint(HAIR, .16); HAIR_HI = d(HAIR, 'hair_color') ? '#6A5874' : tint(HAIR, .32);
    TEE = L.top_color; TEE_LT = d(TEE, 'top_color') ? '#4A4458' : tint(TEE, .14); TEE_HI = d(TEE, 'top_color') ? '#6A6380' : tint(TEE, .28);
    PANT = L.pants_color; PANT_LT = d(PANT, 'pants_color') ? '#3A3446' : tint(PANT, .12);
    ACC = L.accessory_color; ACC_DK = mix(ACC, '#1A0E0C', .3);
  }
  const LONG_SLEEVES = { hoodie: 1, jacket: 1, sweater: 1 };
  // arms: [upper angle from straight down (+ = out/up), forearm bend (+ = up)], per side. hand: 'open' | 'fist' | 'point' | 'thumb' | 'phone'
  const P = {
    front:        { L: [.15, .1], R: [.15, .1], face: 'smile' },
    'three-quarter': { L: [.15, .1], R: [.15, .1], face: 'smile', turn: .25 },
    side:         { L: [.1, .2], R: [.1, .2], face: 'smile', turn: .5 },
    back:         { L: [.12, 0], R: [.12, 0], back: true },
    'point-up':   { L: [.15, .1], R: [2.75, .15, 'point'], face: 'grin' },
    'point-down': { L: [.15, .1], R: [1.05, -.2, 'point'], face: 'talk', lean: .05 },
    think:        { L: [.5, 1.9, 'fist'], R: [.35, 2.55, 'fist'], face: 'think', eyes: 'up' },
    shrug:        { L: [.85, 1.5, 'open'], R: [.85, 1.5, 'open'], face: 'o', brows: 'up' },
    present:      { L: [.15, .1], R: [1.25, .55, 'open'], face: 'grin' },
    wave:         { L: [.15, .1], R: [2.2, .9, 'open'], face: 'grin', wave: true },
    celebrate:    { L: [2.6, .3, 'fist'], R: [2.6, .3, 'fist'], face: 'laugh', eyes: 'happy' },
    thumbsup:     { L: [.15, .1], R: [.55, 1.9, 'thumb'], face: 'grin', eyes: 'wink' },
    'arms-crossed': { L: [.45, 2.2, 'fist'], R: [.45, 2.2, 'fist'], face: 'flat', front: true },
    phone:        { L: [.3, 1.95, 'phone'], R: [.35, 1.7, 'fist'], face: 'smile', eyes: 'down' },
    laptop:       { L: [.45, 1.5, 'fist'], R: [.45, 1.5, 'fist'], face: 'focused', eyes: 'down' },
    'sitting-laptop': { L: [.45, 1.5, 'fist'], R: [.45, 1.5, 'fist'], face: 'focused', eyes: 'down' },
    'hold-sign':  { L: [2.3, .6, 'fist'], R: [2.3, .6, 'fist'], face: 'grin' },
    peek:         { L: [.15, .1], R: [.15, .1], face: 'o', lean: -.15 },
    'exp-surprised': { bust: true, face: 'O', eyes: 'wide', brows: 'up' },
    'exp-focused':   { bust: true, face: 'flat', eyes: 'narrow', brows: 'down' },
    'exp-happy':     { bust: true, face: 'grin', eyes: 'happy' },
    'exp-laughing':  { bust: true, face: 'laugh', eyes: 'happy', brows: 'up' },
    'exp-wink':      { bust: true, face: 'grin', eyes: 'wink' },
  };
  const speaking = t => (typeof VO_WORDS !== 'undefined') && VO_WORDS.some(w => t >= w.s && t < w.e);
  const S = (s, pts) => pts.map(([x, y]) => [x * s, y * s]);
  // points on the head-shaped ellipse (centre 0, cy), angle a0 → a1 (screen angles: π = left, 3π/2 = top)
  const arcPts = (s, cy, rx, ry, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [Math.cos(a) * rx * s, (cy + Math.sin(a) * ry) * s]; });

  function hand(kind, s, sw, side) {
    if (kind === 'phone') { paint(rrPts(-4 * s, -9 * s, 8 * s, 14 * s, 1.5 * s), { wash: PAL.ink, ink: null }); paint(rrPts(-3 * s, -8 * s, 6 * s, 11 * s, 1 * s), { wash: PAL.sky, washOp: 230, ink: null }); }
    paint(ellPts(0, 0, 4.4 * s, 4.2 * s, 12), { wash: SKIN, fill: SKIN_DK, fillOp: 50, tex: .4, ink: PAL.ink, sw: sw * .7 });
    if (kind === 'point') paint(rrPts(-1.1 * s, -9.5 * s, 2.2 * s, 8 * s, 1.1 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .6 });
    if (kind === 'thumb') paint(rrPts(-1.2 * s, -8 * s, 2.4 * s, 6.5 * s, 1.2 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .6 });
    if (kind === 'open') for (let f = -1; f <= 1; f++) { push(); rotate(f * .35); paint(rrPts(-.9 * s, -7.5 * s, 1.8 * s, 5 * s, .9 * s), { wash: SKIN, ink: PAL.ink, sw: sw * .5 }); pop(); }
  }
  // arm from the shoulder, in the character's local space (x right, y down). side = -1 left, +1 right.
  function arm(side, spec, s, sw, t, wave) {
    let [a1, a2, hk] = spec; if (wave) a2 += Math.sin(t * 9) * .35;
    push(); translate(side * 15.5 * s, -73 * s); rotate(-side * a1);
    paint(rrPts(-4.2 * s, -1 * s, 8.4 * s, 10 * s, 3 * s), { wash: TEE, fill: TEE_LT, fillOp: 50, tex: .5, ink: PAL.ink, sw: sw * .8 });   // sleeve
    paint(rrPts(-3.4 * s, 7 * s, 6.8 * s, 10 * s, 3.2 * s), { wash: LONG_SLEEVES[L.top] ? TEE : SKIN, ink: PAL.ink, sw: sw * .7 });       // upper arm
    translate(0, 16 * s); rotate(-side * a2);
    paint(rrPts(-3.2 * s, -1 * s, 6.4 * s, 14 * s, 3 * s), { wash: SKIN, fill: SKIN_DK, fillOp: 40, tex: .4, ink: PAL.ink, sw: sw * .7 }); // forearm
    translate(0, 14.5 * s); rotate(Math.PI); hand(hk || 'fist', s, sw, side);
    pop();
  }
  // ---------- hair (head space: head centre (0, -91), 12 wide, 13.2 tall; brows at -97.8) ----------
  const HAT = { cap: 1, beanie: 1 };
  function fringe(s, sw) {   // a short hair cap over the top of the head, cut in a fringe above the brows
    const p = arcPts(s, -91, 12.9, 14.1, Math.PI + .14, TAU - .14);
    p.push(...S(s, [[11.6, -95.5], [9, -99.4], [5, -100.4], [1.2, -99.6], [-3, -100.8], [-7, -99.8], [-10.4, -97.8], [-11.8, -95]]));
    paint(p, { wash: HAIR, fill: HAIR_LT, fillOp: 40, tex: .6, ink: PAL.ink, sw: sw * .6 });
    for (const [x0, y0, x1, y1] of [[-6, -103.4, -2, -101.4], [2, -104, 6.4, -101.8]]) inkLine(S(s, [[x0, y0], [x1, y1]]), sw * .45, HAIR_HI, 'inkfine', .6);
  }
  function hairBack(s, sw) {   // drawn first (behind the arms, torso and head): long hair and the afro's volume
    if (L.hair === 'long') {
      const p = arcPts(s, -92, 14.4, 15.2, Math.PI, TAU);
      p.push(...S(s, [[15.4, -82], [15.9, -72], [11.6, -70.4], [9.6, -77], [-9.6, -77], [-11.6, -70.4], [-15.9, -72], [-15.4, -82]]));
      paint(p, { wash: HAIR, fill: HAIR_LT, fillOp: 45, tex: .6, ink: PAL.ink, sw: sw * .65 });
      for (const d of [-1, 1]) inkLine(S(s, [[d * 13.2, -88], [d * 14.2, -80], [d * 13.4, -73]]), sw * .45, HAIR_HI, 'inkfine', .6);
    }
    if (L.hair === 'afro') {
      paint(ellPts(0, -97 * s, 17.5 * s, 15.5 * s, 22, s * .5), { wash: HAIR, fill: HAIR_LT, fillOp: 50, tex: .7, ink: PAL.ink, sw: sw * .7 });
      for (let k = 0; k < 9; k++) { const a = Math.PI * 1.08 + k / 8 * Math.PI * .84, x = Math.cos(a) * 14.6, y = -97 + Math.sin(a) * 12.6; inkLine(S(s, [[x - 1.4, y], [x, y - 1.5], [x + 1.4, y]]), sw * .45, HAIR_HI, 'inkfine', .8); }
    }
  }
  function hair(s, sw, t) {
    const st = L.hair, hat = HAT[L.accessory];
    if (st === 'curly') {
      const puff = (x, y, r, c) => paint(ellPts(x * s, y * s, r * s, r * s * .92, 12, s * .3), { wash: c || HAIR, fill: HAIR_LT, fillOp: 40, tex: .6, ink: PAL.ink, sw: sw * .55 });
      const bob = Math.sin(t * 3) * .4;
      [[-14.2, -97.5, 5], [14.2, -97.5, 5], [-12, -101, 6], [12, -101, 6], [-7, -106, 6.5], [7, -106, 6.5], [0, -108, 6.5], [-3, -101, 6], [4, -102, 6]].forEach(([x, y, r], i) => { if (!hat || i < 4) puff(x, y + (i > 3 ? bob : 0), r); });
      if (!hat) for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI, x = Math.cos(a) * 10 * s, y = -103 * s + Math.sin(a) * 6 * s; inkLine([[x - 1.5 * s, y], [x, y - 1.6 * s], [x + 1.5 * s, y]], sw * .45, HAIR_HI, 'inkfine', .8); }
      return;
    }
    if (st === 'bald') { if (!hat) inkLine(S(s, [[-5, -101.2], [-2, -102.6], [1.2, -102.4]]), sw * .8, '#FFFFFF', 'inkfine', .5); return; }
    if (st === 'bun' && !hat) paint(ellPts(0, -106.8 * s, 5.4 * s, 4.8 * s, 14, s * .2), { wash: HAIR, fill: HAIR_LT, fillOp: 50, tex: .6, ink: PAL.ink, sw: sw * .6 });
    if (st === 'spiky' && !hat) for (let k = -2; k <= 2; k++) {
      const a = Math.PI * 1.5 + k * .42, e = (b, r) => [Math.cos(b) * 12.9 * r * s, (-91 + Math.sin(b) * 14.1 * r) * s];
      paint([e(a - .24, .97), e(a + k * .05, 1.34), e(a + .24, .97)], { wash: HAIR, fill: HAIR_LT, fillOp: 40, ink: PAL.ink, sw: sw * .55 });
    }
    fringe(s, sw);   // short, long, bun, spiky and afro all have it at the front
  }
  // ---------- accessories (head space, drawn over the hair) ----------
  function accessory(s, sw, back) {
    const a = L.accessory;
    if (a === 'none') return;
    if (a === 'cap' || a === 'beanie') {
      const cap = a === 'cap', cy = cap ? -94.5 : -95, ry = cap ? 14.2 : 14.6, edge = cap ? -97 : -99, d = Math.asin((cy - edge) / ry);
      paint(arcPts(s, cy, 13.4, ry, Math.PI + d, TAU - d), { wash: ACC, fill: ACC_DK, fillOp: 50, tex: .5, ink: PAL.ink, sw: sw * .8 });
      if (cap) {
        inkLine(S(s, [[0, -108.4], [0, -97.4]]), sw * .45, ACC_DK, 'inkfine', 0);
        paint(ellPts(0, -108.5 * s, 1.3 * s, 1.1 * s, 10), { wash: ACC_DK, ink: PAL.ink, sw: sw * .4 });
        if (!back) paint(S(s, [[-12.8, -97.4], [12.8, -97.4], [11, -94.6], [0, -93.6], [-11, -94.6]]), { wash: ACC_DK, fill: ACC, fillOp: 50, ink: PAL.ink, sw: sw * .75, curv: .3 });
      } else {
        paint(rrPts(-13.8 * s, -101.6 * s, 27.6 * s, 5.2 * s, 2 * s), { wash: ACC_DK, fill: ACC, fillOp: 40, ink: PAL.ink, sw: sw * .7 });
        for (let k = -4; k <= 4; k++) inkLine(S(s, [[k * 2.8, -100.8], [k * 2.8, -97.2]]), sw * .35, ACC, 'inkfine', 0);
        paint(ellPts(0, -110.6 * s, 3.4 * s, 3.2 * s, 12, s * .15), { wash: ACC, fill: ACC_DK, fillOp: 50, tex: .6, ink: PAL.ink, sw: sw * .55 });
      }
    } else if (a === 'headband') {
      const top = [], bot = [];
      for (let i = 0; i <= 10; i++) { const x = -12.6 + i * 2.52, y = -101.4 + 1.2 * (x / 12.6) ** 2; top.push([x * s, y * s]); bot.push([x * s, (y + 2.8) * s]); }
      paint([...top, ...bot.reverse()], { wash: ACC, fill: ACC_DK, fillOp: 50, tex: .4, ink: PAL.ink, sw: sw * .7 });
    } else if (a === 'headphones') {
      const top = { curly: -115, afro: -113.5, bun: -112.4, spiky: -110.5 }[L.hair] ?? -106.4, ry = -90 - top;
      const band = arcPts(s, -90, 14.6, ry, Math.PI, TAU, 18);
      inkLine(band, sw * 3, PAL.ink, 'ink', .5); inkLine(band, sw * 1.8, ACC, 'ink', .5);
      for (const d of [-1, 1]) paint(rrPts((d * 14.6 - 2.4) * s, -95 * s, 4.8 * s, 9 * s, 2 * s), { wash: ACC, fill: ACC_DK, fillOp: 50, ink: PAL.ink, sw: sw * .7 });
    } else if (a === 'earrings') {
      for (const d of [-1, 1]) paint(ellPts(d * 12.6 * s, -85.6 * s, 1 * s, 1 * s, 10), { wash: ACC, ink: PAL.ink, sw: sw * .45 });
    }
  }
  // ---------- facial hair (drawn before the mouth) ----------
  function facialHair(s, sw) {
    const f = L.facial_hair, tache = () => { for (const d of [-1, 1]) paint(ellPts(d * 1.9 * s, -84.7 * s, 2.3 * s, .95 * s, 12, 0, d * .18), { wash: HAIR, ink: PAL.ink, sw: sw * .45 }); };
    if (f === 'stubble') for (let i = 0; i < 60; i++) {   // a band of fine dots along the jaw, clear of the mouth
      const a = .2 + hash(i * 2.7 + 5) * (Math.PI - .4), r = .8 + .18 * hash(i * 5.3 + 1), x = Math.cos(a) * 12 * r, y = -91 + Math.sin(a) * 13.2 * r;
      if (y < -86 || (Math.abs(x) < 4.4 && y < -79.6)) continue;
      paint(ellPts(x * s, y * s, .26 * s, .26 * s, 6), { wash: HAIR, washOp: 170, ink: null });
    }
    if (f === 'beard') {
      const p = arcPts(s, -91, 12.5, 13.8, .12, Math.PI - .12);
      p.push(...S(s, [[-10.4, -88.4], [-6, -85.8], [-2.5, -85], [2.5, -85], [6, -85.8], [10.4, -88.4]]));
      paint(p, { wash: HAIR, fill: HAIR_LT, fillOp: 40, tex: .5, ink: PAL.ink, sw: sw * .7 });
      paint(ellPts(0, -82.6 * s, 4 * s, 2.3 * s, 14), { wash: SKIN, ink: null });
    }
    if (f === 'goatee') paint(ellPts(0, -79.4 * s, 2.5 * s, 1.9 * s, 12), { wash: HAIR, fill: HAIR_LT, fillOp: 40, ink: PAL.ink, sw: sw * .5 });
    if (f === 'moustache' || f === 'goatee' || f === 'beard') tache();
  }
  function face(s, sw, spec, o, t) {
    const f = o.face || spec.face || 'smile', eyes = o.eyes || spec.eyes || 'normal', br = spec.brows;
    const blink = eyes === 'normal' && ((t * .8 + 1.3) % 3.7) < .11;
    // glasses
    const G = L.glasses;
    if (G === 'round') for (const ex of [-5.6, 5.6]) paint(rrPts((ex - 4.6) * s, -94.2 * s, 9.2 * s, 7.6 * s, 3 * s), { wash: '#FFFFFF', washOp: 60, ink: PAL.ink, sw: sw * 1.25 });
    if (G === 'square') for (const ex of [-5.6, 5.6]) paint(rrPts((ex - 4.9) * s, -94 * s, 9.8 * s, 7.2 * s, 1 * s), { wash: '#FFFFFF', washOp: 60, ink: PAL.ink, sw: sw * 1.45 });
    if (G === 'big') for (const ex of [-5.6, 5.6]) paint(ellPts(ex * s, -90.6 * s, 5.4 * s, 5 * s, 20), { wash: '#FFFFFF', washOp: 60, ink: PAL.ink, sw: sw * 1.2 });
    if (G !== 'none') inkLine([[-1 * s, -91.5 * s], [1 * s, -91.5 * s]], sw, PAL.ink, 'ink', 0);
    if (G !== 'sunglasses') for (const ex of [-5.6, 5.6]) {
      const X = ex * s, Y = -90.4 * s;
      if (eyes === 'happy' || (eyes === 'wink' && ex > 0)) inkLine([[X - 2 * s, Y + .8 * s], [X, Y - 1.2 * s], [X + 2 * s, Y + .8 * s]], sw * .9, PAL.ink, 'ink', .3);
      else if (blink || eyes === 'narrow') inkLine([[X - 2 * s, Y], [X + 2 * s, Y]], sw * .9, PAL.ink, 'ink', 0);
      else {
        const r = eyes === 'wide' ? 2 : 1.3, dy = eyes === 'up' ? -1 : eyes === 'down' ? 1 : 0, big = L.eyes === 'big' && eyes !== 'wide', R = big ? r * 1.3 : r;
        if (eyes === 'wide') paint(ellPts(X, Y, 2.8 * s, 3 * s, 12), { wash: '#FFFFFF', ink: null });
        if (big) paint(ellPts(X, Y, 2.5 * s, 2.7 * s, 12), { wash: '#FFFFFF', ink: PAL.ink, sw: sw * .4 });
        paint(ellPts(X, Y + dy * s, R * s, R * 1.15 * s, 10), { wash: PAL.ink, ink: null });
        paint(ellPts(X + .45 * s, Y + (dy - .5) * s, .45 * s, .45 * s, 8), { wash: '#FFFFFF', ink: null });
        if (L.eyes === 'sleepy') { paint(rectPts(X - 2.3 * s, Y - 2.7 * s, 4.6 * s, 2.2 * s), { wash: SKIN, ink: null }); inkLine([[X - 2.2 * s, Y - .5 * s], [X + 2.2 * s, Y - .5 * s]], sw * .9, PAL.ink, 'ink', 0); }
        if (L.eyes === 'lashes') { const d = Math.sign(ex); for (const k of [0, 1]) inkLine([[X + d * (1.1 + k * .7) * s, Y - (1.2 - k * .3) * s], [X + d * (1.9 + k * .8) * s, Y - (2.1 - k * .3) * s]], sw * .6, PAL.ink, 'inkfine', 0); }
      }
    }
    if (G === 'sunglasses') for (const ex of [-5.6, 5.6]) {
      paint(rrPts((ex - 4.8) * s, -94.2 * s, 9.6 * s, 7 * s, 2.6 * s), { wash: PAL.ink, washOp: 235, ink: PAL.ink, sw: sw * 1.3 });
      inkLine([[(ex - 2.6) * s, -89.2 * s], [(ex - .6) * s, -92.6 * s]], sw * .6, '#FFFFFF', 'inkfine', 0);
    }
    // brows
    const by = br === 'up' ? -99.5 : br === 'down' ? -96.4 : -97.8;
    if (L.brows !== 'none') for (const ex of [-5.6, 5.6]) {
      const y0 = by + (br === 'down' ? (ex < 0 ? -.8 : .8) : .3), y1 = by + (br === 'down' ? (ex < 0 ? .8 : -.8) : -.3);
      if (L.brows === 'arched') inkLine([[(ex - 3) * s, (y0 + .3) * s], [ex * s, (Math.min(y0, y1) - 1) * s], [(ex + 3) * s, (y1 + .3) * s]], sw * 1.1, HAIR, 'ink', .5);
      else inkLine([[(ex - 3) * s, y0 * s], [(ex + 3) * s, y1 * s]], sw * (L.brows === 'thick' ? 2 : L.brows === 'thin' ? .6 : 1.1), HAIR, 'ink', .3);
    }
    // cheeks
    for (const ex of [-8, 8]) paint(ellPts(ex * s, -85.5 * s, 2.4 * s, 1.3 * s, 10), { fill: PAL.rose, fillOp: 110, bleed: .2, ink: null });
    if (L.facial_hair !== 'none') facialHair(s, sw);
    // mouth: talking flaps while the VO speaks
    let m = f;
    if (o.talk !== false && speaking(t) && !['O', 'laugh'].includes(f)) m = Math.floor(t * 11) % 3 === 0 ? 'smile' : (Math.floor(t * 11) % 3 === 1 ? 'talk' : 'o');
    const My = -83 * s;
    if (m === 'smile') inkLine([[-3 * s, My - .6 * s], [0, My + 1.2 * s], [3 * s, My - .6 * s]], sw, PAL.ink, 'ink', .6);
    else if (m === 'flat' || m === 'focused') inkLine([[-2.4 * s, My], [2.4 * s, My]], sw, PAL.ink, 'ink', 0);
    else if (m === 'think') inkLine([[-2.5 * s, My + .4 * s], [0, My - .2 * s], [2.5 * s, My - .8 * s]], sw, PAL.ink, 'ink', .4);
    else if (m === 'o') paint(ellPts(0, My + .4 * s, 1.5 * s, 1.8 * s, 10), { wash: '#6B2A2E', ink: PAL.ink, sw: sw * .6 });
    else if (m === 'O') paint(ellPts(0, My + 1 * s, 2.6 * s, 3.4 * s, 12), { wash: '#6B2A2E', ink: PAL.ink, sw: sw * .7 });
    else paint([[-4 * s, My - 1 * s], [4 * s, My - 1 * s], [2.6 * s, My + (m === 'laugh' ? 4 : m === 'talk' ? 2.2 : 2.8) * s], [-2.6 * s, My + (m === 'laugh' ? 4 : m === 'talk' ? 2.2 : 2.8) * s]], { wash: '#6B2A2E', ink: PAL.ink, sw: sw * .7, curv: .4 });
    if (m === 'grin' || m === 'laugh') paint(rectPts(-3.2 * s, My - .9 * s, 6.4 * s, 1.2 * s), { wash: '#FFFFFF', ink: null });
  }
  // ---------- top details (over the torso, after the neck); t0 = the hem ----------
  function topDetails(s, sw, t0, bust) {
    const tp = L.top;
    if (tp === 'hoodie') {
      paint(S(s, [[-9, -80.4], [-4, -77.2], [4, -77.2], [9, -80.4], [7.6, -75.6], [0, -73.6], [-7.6, -75.6]]), { wash: TEE_LT, fill: TEE, fillOp: 40, ink: PAL.ink, sw: sw * .7, curv: .3 });
      for (const d of [-1, 1]) inkLine(S(s, [[d * 2.2, -75], [d * 2.4, -70], [d * 2.1, -66]]), sw * .6, PAL.cream, 'inkfine', .5);
      if (!bust) paint(rrPts(-8 * s, (t0 - 11) * s, 16 * s, 8 * s, 2 * s), { wash: TEE, fill: TEE_LT, fillOp: 50, ink: PAL.ink, sw: sw * .6 });
    }
    if (tp === 'shirt') {
      inkLine(S(s, [[0, -75.6], [0, t0]]), sw * .5, TEE_LT, 'inkfine', 0);
      for (const y of [-72, -66, -60, -54, -48]) if (y < t0 - 1) paint(ellPts(0, y * s, .55 * s, .55 * s, 8), { wash: PAL.cream, ink: PAL.ink, sw: sw * .3 });
      for (const d of [-1, 1]) paint(S(s, [[d * 6.8, -79.2], [0, -75.8], [d * 4.6, -73.2]]), { wash: TEE_HI, ink: PAL.ink, sw: sw * .6 });
    }
    if (tp === 'jacket') for (const d of [-1, 1]) {
      paint(S(s, [[d * 17, -76], [d * 8, -79], [d * 4.6, -77.6], [d * 5.6, t0], [d * 15, t0]]), { wash: TEE, fill: TEE_LT, fillOp: 60, tex: .5, ink: PAL.ink, sw: sw * .9 });
      inkLine(S(s, [[d * 4.8, -77.4], [d * 8.4, -69.6], [d * 6, -63.6]]), sw * .6, TEE_HI, 'inkfine', .4);
      if (!bust) inkLine(S(s, [[d * 9, t0 - 9], [d * 13, t0 - 9]]), sw * .6, PAL.ink, 'inkfine', 0);
    }
    if (tp === 'sweater') {
      inkLine(S(s, [[-6.2, -78.2], [0, -75.8], [6.2, -78.2]]), sw * 2.2, TEE_LT, 'ink', .6);
      const zz = []; for (let x = -14, k = 0; x <= 14; x += 2.8, k++) zz.push([x * s, (-64 + (k % 2 ? 1 : -1)) * s]);
      inkLine(zz, sw * 1.2, TEE_HI, 'ink', 0);
      if (!bust) { paint(rectPts(-15 * s, (t0 - 3) * s, 30 * s, 3 * s), { wash: TEE_LT, ink: PAL.ink, sw: sw * .6 }); for (let k = -6; k <= 6; k++) inkLine(S(s, [[k * 2.2, t0 - 2.6], [k * 2.2, t0 - .4]]), sw * .35, TEE, 'inkfine', 0); }
    }
  }

  function kaiPainted(pose, x, y, h, o = {}) {
    useLook();
    const spec = P[pose] || P.front, t = T;
    const bust = !!spec.bust, HS = bust ? 1 : 1.5, s = bust ? h / 46 : h / 132, sw = clamp(s * .3, .3, 2.3);
    const breathe = Math.sin(t * 2.4) * .006, sq = (o.sq || 0);
    if (!bust && o.shadow !== false) paint(ellPts(x, y + 2, 20 * s, 3.2 * s, 18), { fill: PAL.ink, fillOp: 90, bleed: .25, ink: null });
    push(); translate(x, y); if (o.rot) rotate(o.rot);
    if (bust) translate(0, 58 * s);
    scale((o.flip ? -1 : 1) * (1 + sq * .5), (1 - sq) * (1 + breathe));
    if (spec.lean) rotate(spec.lean);
    if (!bust) {
      // legs + shoes
      for (const sd of [-1, 1]) {
        paint([[sd * 2 * s, -46 * s], [sd * 13 * s, -46 * s], [sd * 12 * s, -6 * s], [sd * 3 * s, -6 * s]], { wash: PANT, fill: PANT_LT, fillOp: 40, tex: .5, ink: PAL.ink, sw: sw * .8 });
        paint(rrPts((sd > 0 ? 1 : -17) * s, -8 * s, 16 * s, 8 * s, 3.5 * s), { wash: PAL.ink, ink: PAL.ink, sw: sw * .7 });
        paint(rrPts((sd > 0 ? 1 : -17) * s, -2.6 * s, 16 * s, 2.8 * s, 1.2 * s), { wash: SOLE, ink: PAL.ink, sw: sw * .5 });
        inkLine([[(sd > 0 ? 5 : -13) * s, -5.6 * s], [(sd > 0 ? 12 : -6) * s, -6.4 * s]], sw * .5, SOLE, 'inkfine', 0);
      }
    }
    if (L.hair === 'long' || L.hair === 'afro') { push(); translate(0, -80 * s); scale(HS); translate(0, 80 * s); hairBack(s, sw); pop(); }
    const t0 = bust ? -56 : -46;
    // arms behind the torso when they hang, in front when folded (drawn after)
    const armsFront = spec.front || (spec.L && spec.L[1] > 1.2);
    if (!bust && !spec.back && !armsFront) { arm(-1, spec.L, s, sw, t); arm(1, spec.R, s, sw, t, spec.wave); }
    // torso (tee; a jacket opens over a cream tee)
    const jk = L.top === 'jacket';
    paint([[-17 * s, -76 * s], [-8 * s, -79 * s], [8 * s, -79 * s], [17 * s, -76 * s], [15 * s, t0 * s], [-15 * s, t0 * s]], { wash: jk ? CREAM_TEE : TEE, fill: jk ? CREAM_TEE_DK : TEE_LT, fillOp: 60, bleed: .1, tex: .6, border: .5, ink: PAL.ink, sw });
    if (!jk) paint(ellPts(-5 * s, -70 * s, 5 * s, 3 * s, 12), { fill: TEE_HI, fillOp: 70, bleed: .2, ink: null });
    // neck + head
    paint(rrPts(-3.6 * s, -83 * s, 7.2 * s, 7 * s, 2 * s), { wash: SKIN_DK, ink: null });
    inkLine([[-6 * s, -78.6 * s], [0, -76.6 * s], [6 * s, -78.6 * s]], sw * .7, PAL.ink, 'ink', .6);
    if (L.top !== 'tee' && !spec.back) topDetails(s, sw, t0, bust);
    push(); translate(0, -80 * s); scale(HS); translate(0, 80 * s);
    for (const ex of [-12.5, 12.5]) paint(ellPts(ex * s, -90 * s, 2.4 * s, 3.2 * s, 10), { wash: SKIN, ink: PAL.ink, sw: sw * .6 });
    const head = ellPts(0, -91 * s, 12 * s, 13.2 * s, 28, s * .15);
    paint(head, { wash: SKIN, fill: SKIN_DK, fillOp: 45, bleed: .15, tex: .5, border: .5, ink: PAL.ink, sw });
    paint(ellPts(-4 * s, -96 * s, 5 * s, 3.5 * s, 14), { fill: '#FFFFFF', fillOp: 50, bleed: .25, ink: null });
    if (!spec.back) face(s, sw, spec, o, t);
    hair(s, sw, t);
    if (spec.back && L.hair !== 'bald') paint(ellPts(0, -93 * s, 12.5 * s, 11 * s, 20), { wash: HAIR, ink: PAL.ink, sw: sw * .6 });
    accessory(s, sw, !!spec.back);
    pop();
    if (!bust && !spec.back && armsFront) { arm(-1, spec.L, s, sw, t); arm(1, spec.R, s, sw, t, spec.wave); }
    pop();
  }
  kai = kaiPainted;
})();
