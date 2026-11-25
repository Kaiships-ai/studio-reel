// The bold head-mark set (kit faces v4, 25/11) and the film switch that turns it on: reel.js `headMarks: 'bold'`. Left out
// (or 'classic') a film keeps faces.js' own marks, shape for shape and frame for frame, the ones inside faces included
// (proud, angry, confused, sleep): a finished film re-renders unchanged (test/unit/stick-head-marks.test.mjs).
// The bold set reads on a phone (head ~120 px): every mark is >= MARK_MIN of the head width at its rest size (MARK_SIZE),
// and its ink is MARK_INK of the head (4.3 px at 120 px; a film's lens blur softens a mark held against a far sky, and 3.6 px greyed out) whatever the card's size, so a small mark is not drawn thinner
// than a big one. Each mark pops in (MARK_POP frames, a back-ease overshoot) and then holds (a pulse, a twinkle, a slide:
// never a loop that shrinks to nothing while it is meant to be read). star (one five-point star), ellipsis, gloom and shake exist only here: a beat that
// asks for one in a film without the switch fails (checkMark).
import * as THREE from 'three';
import { DRAW_KIT, MARK_SET } from './faces.js';

const { bez, path, INK, WHITE } = DRAW_KIT;
// (the "!" and "?" are the thinnest shapes: their ink is the head ring's own weight, GLYPH_INK)
export const MARK_INK = 0.036, GLYPH_INK = 0.046, MARK_MIN = 0.26;
// rest size of each mark's largest card, as a fraction of the head width
export const MARK_SIZE = { sweat: 0.36, anger: 0.36, sparkle: 0.56, question: 0.60, exclaim: 0.74, steam: 0.56, stars: 0.40, zzz: 0.40,
  star: 0.56, ellipsis: 0.34, gloom: 0.58, shake: 0.50 };
// frames each mark takes to pop in (fast = a snap: shock; slow = a thought arriving)
export const MARK_POP = { exclaim: 3, anger: 3, sweat: 4, question: 5, sparkle: 5, star: 5, stars: 6, steam: 6, zzz: 4, ellipsis: 3, gloom: 6, shake: 2 };
// the card's own size (head widths) for each card kind: its ink width in card units is MARK_INK of the head
const CARD_SIZE = { sweat: MARK_SIZE.sweat, anger: MARK_SIZE.anger, sparkle: MARK_SIZE.sparkle, star: MARK_SIZE.stars, big_star: MARK_SIZE.star, question: MARK_SIZE.question,
  exclaim: MARK_SIZE.exclaim, zzz: 0.32, steam: MARK_SIZE.steam, steam_l: MARK_SIZE.steam, dot: 0.08, gloom: MARK_SIZE.gloom, shake: MARK_SIZE.shake };
const GREY = 'rgb(150,152,162)';

// one card's drawing in -1..1 (y up) on a canvas context
function drawCard(g, kind) {
  const LW = 2 * MARK_INK / (CARD_SIZE[kind] || 0.3);                                     // the ink line, card units
  const ink = (pts, fillc, w = LW) => { path(g, pts, true); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); g.fillStyle = fillc; g.fill(); };
  // white inside an ink line that lies wholly outside the shape (as on the "?"), so a thin arm keeps its white
  const outlined = pts => ink(pts, WHITE, 2 * LW);
  if (kind === 'sweat') {                                                                 // a tall drop, a catch light
    const drop = [...bez([0, 0.9], [0.12, 0.6], [0.5, 0.2], [0.5, -0.25], 12), ...bez([0.5, -0.25], [0.48, -0.86], [-0.48, -0.86], [-0.5, -0.25], 12), ...bez([-0.5, -0.25], [-0.5, 0.2], [-0.12, 0.6], [0, 0.9], 12)];
    ink(drop.map(([x, y]) => [0.84 * x, 0.84 * y]), 'rgb(206,232,250)', 2 * LW);
    g.beginPath(); g.ellipse(-0.2, -0.32, 0.1, 0.2, 0.3, 0, 2 * Math.PI); g.fillStyle = WHITE; g.fill();
  } else if (kind === 'anger') {
    // the manga anger vein, in ink only, no red: four curved corners round a "+"-shaped gap, each corner symmetric about
    // its diagonal, so the whole is mirror-symmetric on both axes (never four hooks turning one way: that read as a
    // swastika at phone size)
    for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      const c = ([x, y]) => [sx * x, sy * y];
      g.lineWidth = 1.25 * LW; g.strokeStyle = INK; path(g, bez(c([0.16, 0.80]), c([0.18, 0.30]), c([0.30, 0.18]), c([0.80, 0.16]), 14)); g.stroke();
    }
  } else if (kind === 'sparkle' || kind === 'star' || kind === 'big_star') {                                     // a concave four-point twinkle / a five-point star
    const five = kind !== 'sparkle', n = five ? 5 : 4, r0 = 0.82, ri = five ? 0.42 : 0.31, st = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + 2 * Math.PI * i / n, b = a + Math.PI / n;
      const tip = [r0 * Math.cos(a), r0 * Math.sin(a)], mid = [ri * Math.cos(b), ri * Math.sin(b)], nxt = [r0 * Math.cos(a + 2 * Math.PI / n), r0 * Math.sin(a + 2 * Math.PI / n)];
      st.push(...bez(tip, [tip[0] * 0.45 + mid[0] * 0.55, tip[1] * 0.45 + mid[1] * 0.55], mid, mid, 6), ...bez(mid, mid, [nxt[0] * 0.45 + mid[0] * 0.55, nxt[1] * 0.45 + mid[1] * 0.55], nxt, 6));
    }
    outlined(st);
  } else if (kind === 'question' || kind === 'exclaim') {                                // fat strokes, white inside an ink line of the head ring's weight
    const a = 0.145, gl = 2 * GLYPH_INK / CARD_SIZE[kind], dot = [kind === 'question' ? -0.03 : 0, -0.62];
    const body = kind === 'question' ? [...bez([-0.36, 0.32], [-0.36, 0.8], [0.42, 0.82], [0.40, 0.3], 16), ...bez([0.40, 0.3], [0.38, -0.02], [-0.03, 0.06], [-0.03, -0.22], 12)] : [[0, 0.62], [0, -0.14]];
    for (const [w, col] of [[a + gl, INK], [a, WHITE]]) {
      g.strokeStyle = col; g.lineWidth = 2 * w; path(g, body); g.stroke();
      if (kind === 'exclaim') { g.beginPath(); g.moveTo(-0.07 - w, 0.62); g.lineTo(0.07 + w, 0.62); g.lineTo(0.75 * w, -0.14); g.lineTo(-0.75 * w, -0.14); g.closePath(); g.fillStyle = col; g.fill(); g.beginPath(); g.ellipse(0, 0.62, 0.07 + w, w, 0, 0, 2 * Math.PI); g.fill(); }
      g.beginPath(); g.arc(...dot, w + 0.02, 0, 2 * Math.PI); g.fillStyle = col; g.fill();
    }
  } else if (kind === 'zzz') {
    g.save(); g.scale(1, -1);
    g.font = '900 1.55px InterReel, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 2 * LW; g.strokeStyle = INK; g.strokeText('Z', 0, 0.06); g.fillStyle = WHITE; g.fillText('Z', 0, 0.06); g.restore();
  } else if (kind === 'steam' || kind === 'steam_l') {                                   // a round puff of steam blown out sideways, its short tail pointing back at the head (steam_l: to the left)
    const sg = kind === 'steam' ? 1 : -1, puffs = [[0.20, 0.0, 0.46], [-0.14, 0.26, 0.30], [0.36, 0.42, 0.32], [0.56, -0.04, 0.28], [0.30, -0.42, 0.30], [-0.16, -0.26, 0.28]];
    const tail = d => { path(g, [[sg * -0.92, 0.02], ...bez([sg * -0.92, 0.02], [sg * -0.75, 0.10], [sg * -0.5, 0.3], [0, 0.3], 10), ...bez([0, -0.3], [sg * -0.5, -0.28], [sg * -0.75, -0.08], [sg * -0.92, 0.02], 10)], true); if (d) { g.lineWidth = 2 * LW; g.strokeStyle = INK; g.stroke(); } g.fillStyle = d ? INK : WHITE; g.fill(); };
    tail(1); for (const [x, y, r] of puffs) { g.beginPath(); g.arc(sg * x, y, r + LW, 0, 2 * Math.PI); g.fillStyle = INK; g.fill(); }
    tail(0); for (const [x, y, r] of puffs) { g.beginPath(); g.arc(sg * x, y, r, 0, 2 * Math.PI); g.fillStyle = WHITE; g.fill(); }
  } else if (kind === 'dot') {                                                           // one ink dot (the "..." of a bored beat)
    g.beginPath(); g.arc(0, 0, 0.8, 0, 2 * Math.PI); g.fillStyle = INK; g.fill();
  } else if (kind === 'gloom') {                                                         // a small grey rain cloud: a flat base, three humps, three drops of rain
    const puffs = [[-0.44, 0.20, 0.27], [-0.02, 0.36, 0.38], [0.44, 0.20, 0.29]], base = [0.5, 0.3, -0.07];   // half width, top, bottom
    for (const d of [LW / 2, -LW / 2]) {
      g.fillStyle = d > 0 ? INK : GREY;
      for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r + d, 0, 2 * Math.PI); g.fill(); }
      path(g, [[-base[0] - d, base[1]], [base[0] + d, base[1]], [base[0] + d, base[2] - d], [-base[0] - d, base[2] - d]], true); g.fill();
    }
    g.lineWidth = LW; g.strokeStyle = INK;
    for (const [x, y] of [[-0.38, -0.34], [0.04, -0.42], [0.46, -0.34]]) { path(g, [[x, y], [x - 0.10, y - 0.32]]); g.stroke(); }
  } else if (kind === 'shake') {                                                         // two plain ink arcs "))" (mirrored for the left)
    for (const [r, h, x0] of [[0.70, 0.62, -0.72], [1.28, 0.56, -0.72]]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const a = -h + 2 * h * i / 20; pts.push([x0 + r * Math.cos(a), r * Math.sin(a)]); }
      g.lineWidth = 1.5 * LW; g.strokeStyle = INK; path(g, pts); g.stroke();
    }
  }
}
const PX = 512, texes = {};
export function markTexture(kind) {
  if (texes[kind]) return texes[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = PX; const g = cv.getContext('2d');
  g.translate(PX / 2, PX / 2); g.scale(PX / 2, -PX / 2); g.lineCap = g.lineJoin = 'round';
  drawCard(g, kind);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (texes[kind] = t);
}

const back = x => { x = Math.max(0, Math.min(1, x)); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// Each mark: the cards it uses and where they go, as in faces.js MARKS ([[card index, x, y, z, size, spin]]); the size is the
// card's at rest (the rig pops it in over MARK_POP frames). Nothing sits over the face: every card clears the brow line
// (y >= 0.30 w) or the head's rim (|x| >= 0.5 w).
const MS = MARK_SIZE, pulse = (a, per, k) => 1 + k * Math.max(0, Math.sin(2 * Math.PI * a / per));
const popIn = (a, n) => back(a / n);
const MARKS = {
  // the drop pops on the temple, slides down 0.15 w over 20 f, then the next one (one per 24 f)
  sweat: { cards: ['sweat'], at: (w, t, a) => { const s = Math.min(1, (a % 24) / 20); return [[0, 0.54 * w, (0.36 - 0.15 * s) * w, 0.16 * w, MS.sweat * w * (a < 24 ? 1 : popIn(a % 24, 4)), 0.15]]; } },
  // off the upper corner, clear of the head's outline (on it, ink on ink, the vein closed up)
  anger: { cards: ['anger'], at: (w, t, a) => [[0, 0.45 * w, 0.52 * w, 0.2 * w, MS.anger * w * pulse(a, 10, 0.10), 0]] },
  // two twinkles off the upper corners: each grows, peaks, shrinks to 80 % and grows again (never gone while it is meant to read)
  sparkle: { cards: ['sparkle', 'sparkle'], at: (w, t, a) => [0, 1].map(i => { const k = 0.8 + 0.2 * Math.max(0, Math.sin(Math.PI * (((a + i * 6) % 18) / 18)));
    return [i, [0.80, -0.76][i] * w, [0.66, 0.80][i] * w, 0.15 * w, [1, 0.8][i] * MS.sparkle * w * k, 0]; }) },
  question: { cards: ['question'], at: (w, t, a) => [[0, 0.44 * w, 0.92 * w, 0.1 * w, MS.question * w, -0.17 + 0.1 * Math.sin(a * 0.2)]] },
  exclaim: { cards: ['exclaim'], at: (w, t, a) => [[0, 0.04 * w, 0.98 * w, 0.1 * w, MS.exclaim * w, (a < 6 ? 0.12 * Math.sin(a * 2.4) : 0)]] },
  // a puff out of each side of the head at ear height, swelling and blown outward every 10 f
  steam: { cards: ['steam', 'steam_l'], at: (w, t, a) => [1, -1].map((s, i) => { const u = Math.sin(Math.PI * a / 10) ** 2; return [i, s * (0.72 + 0.04 * u) * w, (-0.04 + 0.03 * u) * w, 0.1 * w, (0.88 + 0.12 * u) * MS.steam * w, 0]; }) },
  // three stars spaced evenly over the crown, swaying round it together
  stars: { cards: ['star', 'star', 'star'], at: (w, t) => [0, 1, 2].map(i => { const ph = Math.PI / 2 + (i - 1) * 0.86 + 0.22 * Math.sin(t * 0.14); return [i, 0.86 * w * Math.cos(ph), (0.02 + 0.82 * Math.sin(ph)) * w, 0.2 * w, MS.stars * w, 0.35 * Math.sin(t * 0.14 + i)]; }) },
  // three Z's up and to the right, each 10 f after the last, the column holds and fades its last 6 f of a 36 f cycle
  zzz: { cards: ['zzz', 'zzz', 'zzz'], at: (w, t, a) => [0, 1, 2].map(i => { const c = a % 36, b = c - i * 10, k = b < 0 ? 0 : popIn(b, 4) * (c > 30 ? (36 - c) / 6 : 1);
    return [i, (0.52 + 0.16 * i) * w, (0.46 + 0.24 * i) * w, 0.1 * w, [0.62, 0.8, 1][i] * MS.zzz * w * k, 0.25]; }) },
  // one five-point star off the upper corner, popping in and holding with a small twinkle
  star: { cards: ['big_star'], at: (w, t, a) => [[0, 0.72 * w, 0.64 * w, 0.15 * w, MS.star * w * pulse(a, 20, 0.08), 0.12 * Math.sin(a * 0.2)]] },
  // "...": three ink dots over the head's other side (a propped head leans toward its hand), one every 6 f, held
  ellipsis: { cards: ['dot', 'dot', 'dot'], at: (w, t, a) => [0, 1, 2].map(i => [i, (-0.56 + 0.13 * i) * w, (0.66 - 0.04 * i) * w, 0.1 * w, (a >= i * 6 ? popIn(a - i * 6, 3) : 0) * 0.1 * w, 0]) },
  gloom: { cards: ['gloom'], at: w => [[0, 0.04 * w, 0.84 * w, 0.05 * w, MS.gloom * w, 0]] },
  // agitrons both sides of the head, shaking on a 2 f period
  shake: { cards: ['shake', 'shake'], at: (w, t, a) => [-1, 1].map((s, i) => [i, s * (0.84 + 0.025 * (a % 2 ? 1 : -1)) * w, -0.06 * w, 0.05 * w, MS.shake * w, s > 0 ? 0 : Math.PI]) },
};
export const BOLD_MARKS = Object.keys(MARKS);
// where each card of a mark sits and how big it is (head width w, frame t, age a)
export const markAt = (kind, w, t, a) => MARKS[kind].at(w, t, a);
const BOLD = { marks: MARKS, tex: markTexture, pop: k => MARK_POP[k] || 7 };

// ------------------------------------------------------------------ the film switch
const SETS = { classic: MARK_SET.classic, bold: BOLD };
export const DEFAULT_HEAD_MARKS = 'classic';
export function useHeadMarks(name = DEFAULT_HEAD_MARKS) {
  if (!Object.hasOwn(SETS, name)) throw new Error(`reel.js headMarks ${JSON.stringify(name)}: not a head-mark set (${Object.keys(SETS).map(n => `'${n}'`).join(', ')}; left out = '${DEFAULT_HEAD_MARKS}')`);
  MARK_SET.now = SETS[name];
  return name;
}
// a beat's mark ('gloom' or ['gloom', frames]): one only the bold set draws fails in a film without it
export function checkMark(mark) {
  const kind = Array.isArray(mark) ? mark[0] : mark;
  if (MARKS[kind] && !MARK_SET.now.marks[kind]) throw new Error(`mark '${kind}' is in the bold head-mark set only: set headMarks: 'bold' in reel.js (or drop the mark)`);
}
