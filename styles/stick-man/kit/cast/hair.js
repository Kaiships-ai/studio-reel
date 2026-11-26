// Sculpted toon hair (Kai 26/11: "everything else is detailed, hair is not"). One closed mass per head, like curls() in
// engine/cast.js, but shaped as hair grows: locks radiate from a whorl, the hairline sits on the forehead's edge so a low
// front camera sees it, lock tips scallop that edge, a parting is a groove, and a painted map (the sweater's way: grooves
// dark, a fine strand line, a light band on the lock tops) carries the detail an ink hull cannot. Rigid: it is built once
// into the head's hair group (cast.js, matrixAutoUpdate off), nothing in it moves.
//   hair: [toonHair('side', [0.28, 0.17, 0.10])]     styles: HAIR_STYLES; the colour is optional (each style has one)
// hairCap / curls / bun are untouched: old films look the same.
import * as THREE from 'three';
import { toon } from '#engine/look.js';
import { W_M, HEAD_H, HAT_LIFT, solid } from '#engine/cast.js';
import { SCALP_LINE, bareAt } from './scalpline.js';

const W = W_M, HA = 0.5 * W, HB = 0.5 * HEAD_H * W, DEG = Math.PI / 180;
// where no hair grows the mass tucks this far inside the head: its ink hull (solid(), pushed out 0.036 W) must stay under the
// skin. At 0.94 (curls' value) the hull came out through the skin all along the hairline: the white torn-paper fringe
const TUCK = 0.82;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const headR = d => 1 / Math.hypot(d.x / HA, d.y / HB, d.z / HA);
// a hairline height (W above the head's centre) round the head: [|lon| deg, y] with smooth steps between
const table = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * sm(T[i - 1][0], T[i][0], x); return T[T.length - 1][1]; };
const edge = ({ front, temple = front - 0.03, side = -0.02, back = -0.40 }) => [[0, front], [30, temple], [62, 0.10], [84, side], [125, back], [180, back]];
const rand = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
// how far (W) a ray from the head's centre along d runs to the sphere { c: [x, y, z] W, r W }
const ballR = (b, d) => { const c = new THREE.Vector3(...b.c), k = d.dot(c); return k + Math.sqrt(Math.max(0, k * k - c.lengthSq() + b.r * b.r)); };
// a point on the head (W) at a height y and a longitude lon (deg, 0 = the face, + = the figure's left), `out` W off it
const onHead = (lon, y, out = 0) => { const r = 0.5 * Math.sqrt(Math.max(0, 1 - (y / (HB / W)) ** 2)) + out, a = lon * DEG; return [r * Math.sin(a), y, r * Math.cos(a)]; };

// in W. whorl: where the locks start; locks: how many round it; clump: a lock's height over its grooves; base: the mass's
// thickness; lift: extra volume over the forehead; tips: how far the lock tips reach past the hairline; part: x of a parting
// (W, + = the figure's left); lo: the hairline round the head; sweep: the swept side's extra height; sparse: only lock crests (scalp between); jit: uneven locks; tipLight: lighter lock tips; ink: the ink hull's share (thin strands want a thin line); bumps: curl clumps [n, r, h, lowest y]; buns
const STYLES = {
  // a clear parting on the figure's left, the rest swept over to the right in a raised wave
  side:  { col: [0.42, 0.25, 0.12], whorl: [0.22, 0.75, -0.62], locks: 14, twist: 0.35, clump: 0.034, base: 0.030, lift: 0.050, tips: 0.050, part: 0.17, sweep: 0.055, lo: edge({ front: 0.30 }) },
  // short and tight to the skull, a short fringe, the forehead shows; dark brown, not black, so the light finds the locks
  crop:  { col: [0.32, 0.21, 0.13], whorl: [0, 0.70, -0.70], locks: 22, twist: 0.15, clump: 0.022, base: 0.016, lift: 0.016, tips: 0.040, lo: edge({ front: 0.34, temple: 0.31, side: 0.02 }) },
  // a big round crown of curl clumps, wider than the head
  curly: { col: [0.55, 0.22, 0.10], whorl: [0, 0.80, -0.60], locks: 12, twist: 0, clump: 0.006, base: 0.040, lift: 0.020, tips: 0.050, bumps: [42, 0.30, 0.060, -0.40], lo: edge({ front: 0.29, side: 0.0 }) },
  // an old man's hair: the crop's locks in thin mid grey, lighter at the tips, the temples receded deep, fuller round the
  // ears and the nape. The whorl sits inside the neck, so the locks never meet in a knot anyone sees
  elder: { col: [0.56, 0.56, 0.59], whorl: [0, 0.70, -0.70], locks: 22, twist: 0.04, jit: 0.22, clump: 0.016, base: 0.013, lift: 0.006, tips: 0.040, tipLight: 0.5,
           lo: [[0, 0.34], [16, 0.36], [36, 0.44], [62, 0.10], [88, -0.08], [125, -0.40], [180, -0.40]], bare: [[0, 60, 0.47]] },   // the receded temples: skin by design
  woman: { col: [0.20, 0.11, 0.06], whorl: [0, 0.75, -0.65], locks: 20, twist: 0, clump: 0.016, base: 0.022, lift: 0.018, tips: 0.014, part: 0, lo: edge({ front: 0.30, side: -0.04 }),
           buns: [{ dir: [0, 0.80, -0.60], r: 0.20, out: 0.05 }] },   // high on the back of the crown: it shows over the head from the front
  girl:  { col: [0.30, 0.17, 0.08], whorl: [0, 1, -0.25], locks: 18, twist: 0.2, clump: 0.026, base: 0.026, lift: 0.030, tips: 0.060, part: 0, lo: edge({ front: 0.21, temple: 0.20, side: -0.02 }),
           buns: [{ dir: [0.78, 0.60, -0.15], r: 0.14, out: 0.04 }, { dir: [-0.78, 0.60, -0.15], r: 0.14, out: 0.04 }] },   // two buns, one each side: a girl, not the woman

  // cut: shortened by the hair-in-body check (test/unit/stick-hair-body.test.mjs, 4 mm): nothing of the style below this height (W
  // under the head's centre). Rigid hair that reaches the neck goes into the upper back as the head looks up (Gest_LookUp_Once) and
  // into the shoulder beside the jaw as it bows to the floor (Adult_Act_PickUp_Once); each was cut, 0.02 W at a time, until it passed.
  // Designed to: mullet -0.83, bob -0.36, long -1.15, ponytail -0.56, braids -1.04, lob -0.81 (toonHair(style, col, { cut: null })).
  // long, lob and braids lose every lock below the scalp at their cut, and the bob its hem: they wait for Studio
  // ---- men
  // a pompadour: a tall wave over the forehead swept back to the crown, the sides cut tight; the locks run front to back
  pompadour: { col: [0.22, 0.14, 0.09], whorl: [0, 0.20, -0.98], locks: 16, twist: 0, jit: 0.12, clump: 0.030, base: 0.016, lift: 0.040, tips: 0.030, crest: 0.17, tight: 0.75, lo: edge({ front: 0.31, temple: 0.25, side: 0.03 }) },
  // a buzz cut: a thin shell on a round skull, a grain of stubble in the map and a clear, squared hairline darker at its edge
  buzz:  { col: [0.30, 0.23, 0.17], whorl: [0, 0.70, -0.70], locks: 36, twist: 0.1, clump: 0.003, base: 0.008, lift: 0.004, tips: 0.006, grain: 0.45, edgeDark: 0.35, ink: 0.6,
           lo: [[0, 0.33], [18, 0.33], [26, 0.27], [40, 0.27], [62, 0.10], [84, 0.03], [125, -0.36], [180, -0.36]] },
  // a mullet: short on top, a thick tail of pointed locks at the nape down to the collar
  mullet: { neck: true, col: [0.40, 0.25, 0.13], whorl: [0, 0.70, -0.70], locks: 20, twist: 0.12, jit: 0.30, clump: 0.024, base: 0.020, lift: 0.030, tips: 0.090, lo: edge({ front: 0.29, side: -0.04, back: -0.42 }),
            falls: [{ lon: [112, 180], n: 4, from: -0.20, to: -0.80, rho: 0.03, flat: 0.55, flare: 0.04, jit: 0.12, tip: 'point', ridges: 3 }] },
  // an afro: one round mass wider than the head, its surface curl clumps
  afro:  { col: [0.24, 0.15, 0.10], whorl: [0, 0.80, -0.60], locks: 12, twist: 0, clump: 0.004, base: 0.02, lift: 0, tips: 0.03, ball: { c: [0, 0.16, -0.05], r: 0.70, nape: -0.40 }, bumps: [150, 0.13, 0.030, -0.45], lo: edge({ front: 0.30, temple: 0.28, side: -0.02, back: -0.40 }) },
  // ---- women
  // a chin bob: a bell that falls straight from the crown to the jaw, a blunt hem, a side part
  bob:   { neck: true, col: [0.42, 0.26, 0.14], whorl: [0, 1, -0.08], locks: 30, jit: 0.25, twist: 0, clump: 0.016, base: 0.030, lift: 0.020, tips: 0.006, part: 0.12, lo: edge({ front: 0.30, side: -0.04 }),
           hang: { from: 0.02, flare: 0.10, hem: [[0, 0.30], [30, 0.28], [48, -0.36], [180, -0.38]], tips: 0.06, edge: 14 },
           falls: [{ lon: [20, 28], n: 2, from: 0.26, to: -0.55, toAt: [1.0, 0.7], rho: 0.07, flat: 0.32, flare: 0.04, jit: 0.3, tip: 'point', ridges: 3, seed: 13 },   // a lock over the bell's front edge each side: no straight line in 3/4
                   { lon: [30, 48], n: 3, from: 0.22, to: -0.36, toAt: [0.8, 1.0, 0.9], rho: 0.14, flat: 0.4, flare: 0.05, jit: 0.3, tip: 'point', ridges: 3, seed: 9 }] },   // face-framing locks
  // long and straight, parted in the middle: the scalp falls to the jaw, two curtains of flat locks on to the chest
  long:  { neck: true, col: [0.26, 0.15, 0.08], whorl: [0, 1, -0.05], locks: 24, twist: 0, clump: 0.014, base: 0.026, lift: 0.014, tips: 0.006, part: 0, lo: edge({ front: 0.30, side: -0.04 }),
           hang: { from: 0.02, flare: 0.04, hem: [[0, 0.30], [30, 0.28], [48, -0.40], [180, -0.42]], tips: 0.09, edge: 14 },
           falls: [{ lon: [20, 28], n: 2, from: 0.26, to: -0.55, toAt: [1.0, 0.7], rho: 0.07, flat: 0.32, flare: 0.04, jit: 0.3, tip: 'point', ridges: 3, seed: 13 },   // a lock over the bell's front edge each side: no straight line in 3/4
                   { lon: [30, 50], n: 3, from: 0.22, to: -0.80, toAt: [0.75, 1.0, 0.9], rho: 0.10, flat: 0.32, flare: 0.06, jit: 0.35, tip: 'point', ridges: 3, seed: 9 },   // face-framing locks: uneven, tapered, angled out from the temple, laid over the bell's front edge (rho past the bell: inside it they never showed)
                   { lon: [52, 180], n: 8, from: -0.02, to: -1.15, rho: 0.065, flat: 0.32, flare: 0.03, tip: 'blunt', ridges: 3 }] },
  // a pixie: a short feathered cap, a wispy fringe swept to one side, feathered at the nape too
  pixie: { col: [0.50, 0.30, 0.15], whorl: [0.15, 0.75, -0.64], locks: 18, twist: 0.30, jit: 0.35, clump: 0.026, base: 0.020, lift: 0.024, tips: 0.090, napeTips: 1, sweep: 0.022, part: 0.20, partSkin: false, lo: [[0, 0.15], [30, 0.14], [62, -0.02], [84, -0.08], [125, -0.36], [180, -0.36]] },   // the sideburn down past the ear's top: no skin wedge in 3/4
  // a high ponytail: the hair drawn tight to a tie high on the crown, one thick club of a tail off it
  ponytail: { cut: -0.54, col: [0.36, 0.20, 0.10], whorl: [0, 0.62, -0.78], locks: 22, twist: 0, clump: 0.016, base: 0.016, lift: 0.010, tips: 0.012, lo: edge({ front: 0.30, side: -0.04 }),
              buns: [{ dir: [0, 0.62, -0.78], r: 0.085, out: -0.01 }],
              tails: [{ path: [[0, 0.26, -0.30], [0, 0.40, -0.58], [0, 0.28, -0.80], [0, 0.00, -0.86], [0, -0.30, -0.80], [0, -0.55, -0.70]], w: [0.06, 0.10, 0.15, 0.17, 0.16, 0.11, 0.02], flat: 0.8, ridges: 5, seg: 64, sides: 22 }] },
  // box braids: square parts on the scalp, a curtain of thin braided ropes round the back and sides to the shoulders
  braids: { neck: true, col: [0.20, 0.13, 0.09], whorl: [0, 1, -0.05], locks: 24, twist: 0, clump: 0.006, base: 0.022, lift: 0.012, tips: 0.010, grid: [14, 22], lo: edge({ front: 0.30, side: -0.04 }),
            hang: { from: 0.02, flare: 0, hem: [[0, 0.30], [30, 0.28], [48, -0.34], [180, -0.40]], tips: 0.03, edge: 12 },   // the braids lie on a curtain of hair: no cheek between them
            falls: [{ lon: [34, 48], n: 2, from: 0.10, to: -0.95, rho: 0.03, w: 0.040, flat: 1, flare: 0.02, jit: 0.10, tip: 'blunt', braid: 9, ridges: 0, ink: 0.55, sides: 12, seed: 9 },   // front braids: they read from the front
                    { lon: [56, 180], n: 10, from: -0.10, to: -1.00, rho: 0.04, w: 0.040, flat: 1, flare: 0.04, jit: 0.10, tip: 'blunt', braid: 9, ridges: 0, ink: 0.55, sides: 12 }] },
  // a wavy lob: a soft S-wave mass to the shoulders, the tips turning out
  lob:   { neck: true, col: [0.46, 0.29, 0.14], whorl: [0, 1, -0.10], locks: 22, twist: 0.10, jit: 0.15, clump: 0.022, base: 0.030, lift: 0.024, tips: 0.010, part: 0.10, lo: edge({ front: 0.30, side: -0.04 }),
           hang: { from: 0.02, flare: 0.08, hem: [[0, 0.30], [30, 0.28], [48, -0.30], [180, -0.36]], tips: 0.04, edge: 14 },
           falls: [{ lon: [20, 28], n: 2, from: 0.26, to: -0.55, toAt: [1.0, 0.7], rho: 0.07, flat: 0.32, flare: 0.04, jit: 0.3, tip: 'point', ridges: 3, seed: 13 },   // a lock over the bell's front edge each side: no straight line in 3/4
                   { lon: [30, 50], n: 3, from: 0.22, to: -0.60, toAt: [0.7, 1.0, 0.85], rho: 0.12, flat: 0.45, flare: 0.03, wave: [0.03, 2.2], flick: 0.05, jit: 0.35, tip: 'point', ridges: 3, seed: 9 },   // face-framing locks
                   { lon: [50, 180], n: 7, from: -0.20, to: -0.78, rho: 0.06, flat: 0.45, flare: 0.04, wave: [0.035, 2.2], flick: 0.06, jit: 0.08, tip: 'point', ridges: 3 }] },
};
export const HAIR_STYLES = Object.keys(STYLES);
export const styleOf = style => STYLES[style];
// where a style shows its scalp by design: what it declares (st.bare), and a swept style's parting (the scalp shows along it)
export const bareOf = st => [...(st.bare || []), ...(st.sweep && st.part != null && st.partSkin !== false ? [{ part: st.part, w: 0.016, above: 0.25 }] : [])];
// a style's scalp field (d -> { r, k }, k = 1 where hair grows, less on its hairline wall, which tucks under the skin): for measures
export const scalpField = (style, patch) => scalp({ ...STYLES[style], ...patch });

// locks radiate from the axis w: c = 1 on a lock's crest, 0 in the groove between two; q = the angle from w
// jit: uneven lock widths and spacing, and locks that bend on their way up (seeded, the same on every build)
function locksOf(w, n, twist, jit = 0) {
  const a = new THREE.Vector3(...w).normalize(), e1 = new THREE.Vector3(1, 0, 0).addScaledVector(a, -a.x).normalize(), e2 = a.clone().cross(e1);
  const r = rand(11), P = [0, 1, 2, 3].map(() => r() * 2 * Math.PI);
  return d => { const q = Math.acos(Math.max(-1, Math.min(1, d.dot(a)))), th = Math.atan2(d.dot(e2), d.dot(e1));
    const tw = th + jit * (0.45 * Math.sin(3 * th + P[0]) + 0.30 * Math.sin(5 * th + P[1]) + 0.20 * Math.sin(8 * th + P[2]) + 0.30 * Math.sin(1.5 * q + P[3]) * sm(0.2, 1.2, q));
    const ph = (tw / (2 * Math.PI) + twist * q / Math.PI) * n;
    return { c: Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ph), 0.6), ph, q }; };
}

function scalp(st) {
  const L = locksOf(st.whorl, st.locks, st.twist, st.jit), r = rand(7), bumps = [], bare = bareOf(st)
  if (st.bumps) for (let i = 0; i < st.bumps[0]; i++) { const y = (st.bumps[3] ?? 0.25) + (1 - (st.bumps[3] ?? 0.25)) * r(), a = r() * 2 * Math.PI, s = Math.sqrt(1 - y * y); const v = new THREE.Vector3(s * Math.sin(a), y, s * Math.cos(a)); v.w = r() * 2 * Math.PI; bumps.push(v); }
  return d => {
    const rh = headR(d), y = d.y * rh / W, lon = Math.abs(Math.atan2(d.x, d.z)) / DEG, { c, ph, q } = L(d), amp = sm(0.10, 0.45, q);
    const tips = st.tips * (st.napeTips ? 1 : 0.15 + 0.85 * sm(150, 70, lon));                // the nape's edge is clean, following the head
    let cover = sm(-0.02, 0.02, y - table(st.lo, lon) + tips * (c - 0.55) * amp);
    if (st.sparse) {   // only the lock crests, scalp between them: no flat shell. Each lock its own width, thinning toward the crown
      const thr = st.sparse + 0.10 * Math.sin(2.39 * ph) + 0.06 * Math.sin(0.77 * ph + 1) + 0.10 * sm(0.10, 0.45, y);
      cover *= 1 - (0.85 + 0.15 * sm(0.15, 0.30, y)) * (1 - sm(thr, thr + 0.25, c)) * sm(0.0, 0.25, q);
    }
    const front = sm(60, 20, lon) * Math.exp(-(((y - table(st.lo, lon)) / 0.10) ** 2));
    let t = st.base + st.lift * front + st.clump * amp * c, shade = -Math.pow(1 - c, 3) * amp + 0.12 * Math.cos(2 * Math.PI * ph * 3) * amp * c;
    if (st.ball) t += Math.max(0, ballR(st.ball, d) - rh / W - st.base) * sm(st.ball.nape ?? -9, (st.ball.nape ?? -9) + 0.22, y);   // a round mass wider than the head (an afro), shaped in to a short nape
    if (st.crest) t += st.crest * sm(-0.6, 0.55, d.z) * sm(-0.05, 0.30, y) * (1 - 0.35 * sm(0.2, 0.5, Math.abs(d.x)));   // a tall wave over the forehead, swept back
    if (st.tight) t *= 1 - st.tight * sm(0.30, 0.70, Math.abs(d.x)) * sm(0.40, 0.05, y);    // the sides cut close
    if (st.hang) {     // hair that falls straight from where the head is widest, to a hem (the hem's height y round the head, W); near the
      // face it hugs the head (hug): in 3/4 the far side's curtain sits behind the cheek, not across the face (Studio 26/11)
      const hs = Math.hypot(d.x, d.z), H = st.hang, rho = (0.5 * Math.sqrt(Math.max(0, 1 - (H.from / (HB / W)) ** 2)) + st.base + 0.5 * st.clump * c) * (1 + (H.flare || 0) * sm(H.from, H.from - 0.5, d.y * rh / W)) * (1 - (H.hug ?? 0.05) * sm(80, 35, lon)), rc = hs > 1e-3 ? rho * W / hs : 0;
      if (rc > rh + t * W && d.y * rc / W < H.from) { t = rc / W - rh / W; const yh = d.y * rc / W; cover = sm(-0.02, 0.02, yh - table(H.hem, lon + (H.edge || 0) * (c - 0.55) * amp) + (H.tips || 0) * (c - 0.55) * amp); }
    }
    if (st.grain) { const n = Math.sin(d.x * 911.7 + d.y * 437.3 + d.z * 719.1) * 43758.5; shade += st.grain * (n - Math.floor(n) - 0.5); }   // a stubble's grain
    if (st.edgeDark) shade -= st.edgeDark * sm(0.07, 0.0, y - table(st.lo, lon));            // denser at the hairline: it reads at a distance
    if (st.grid) { const gy = Math.abs(Math.sin(Math.PI * Math.asin(d.y) / DEG / st.grid[0])), gx = Math.abs(Math.sin(Math.PI * Math.atan2(d.x, d.z) / DEG / st.grid[1])); if (y > -0.1) shade = Math.min(shade, -sm(0.12, 0.0, Math.min(gy, gx))); }   // the square parts of box braids
    if (bumps.length) {   // curl locks, each in its own cell round the nearest centre
      let f1 = 9, f2 = 9, nb = null; for (const b of bumps) { const g = Math.acos(Math.min(1, d.dot(b))); if (g < f1) { f2 = f1; f1 = g; nb = b; } else if (g < f2) f2 = g; }
      // each clump a C-shaped lock: a raised ring open on one side (turned at random) round a lower middle, the cells kept
      // apart by a valley, so every curl has its own outline and a lit crest
      const R = st.bumps[1], u = f1 / R, apart = sm(0, 0.35 * R, f2 - f1);
      const o = d.clone().addScaledVector(nb, -d.dot(nb)), e1 = new THREE.Vector3(0, 1, 0).addScaledVector(nb, -nb.y).normalize(), a = Math.atan2(o.dot(nb.clone().cross(e1)), o.dot(e1)) - nb.w;
      const ridge = Math.exp(-(((u - 0.55) / 0.2) ** 2)) * sm(-0.8, -0.35, Math.cos(a)), mid = 0.45 * Math.max(0, 1 - (u / 0.6) ** 2), h = apart * Math.max(ridge, mid);
      t += st.bumps[2] * h; shade = 0.2 * shade - 0.8 * (1 - h) ** 2 + 0.5 * ridge * apart * sm(0.5, 0.65, u) * (0.5 + 0.5 * Math.cos(a)) - 0.3 * (mid > ridge ? 1 : 0) * apart;
    }
    if (st.sweep) t += st.sweep * sm(st.part, st.part - 0.35, d.x * rh / W) * sm(0.05, 0.35, y) * sm(-0.6, 0.2, d.z);   // the swept side stands higher
    if (st.part != null && d.y > 0.25 && d.z > -0.55) { const p = sm(0.012, 0.040, Math.abs(d.x * rh / W - st.part)); t *= 0.25 + 0.75 * p; shade = Math.min(shade, -(1 - p)); if (st.sweep && st.partSkin !== false) cover *= sm(0.004, 0.016, Math.abs(d.x * rh / W - st.part)); }
    shade += 0.45 * Math.exp(-(((Math.asin(d.y) / DEG - 52) / 9) ** 2)) * c * c * sm(130, 60, lon);   // the light band round the crown
    if (st.tipLight) shade += st.tipLight * sm(0.16, 0.0, y - table(st.lo, lon)) * c;   // the lock tips catch the light: grey hair, not a cap
    if (st.hang) cover = Math.max(cover, sm(-0.02, 0.02, y - table(st.hang.hem, lon + (st.hang.edge || 0) * (c - 0.55) * amp)));   // the hem is the hairline above the fall too: no bare band between the two
    if (st.cut != null) cover *= sm(st.cut - 0.02, st.cut + 0.02, d.y * (rh + t * W) / W);   // shortened (the hair-in-body check): nothing below
    // the floor: every style covers the scalp (kit/cast/scalpline.js) whatever its own hairline, hem or cut leave, thin where
    // only the floor puts hair (it lies on the head). Its soft wall reaches full cover 0.03 W past the line at the nape, where
    // the line meets the styles' own edge. A style shows skin inside the scalp only where it declares it (st.bare)
    if (!st.noFloor && !bareAt(bare, lon, y, d.x * rh / W)) { const kR = sm(-0.02, 0.02, y - SCALP_LINE(lon) + 0.03 * sm(95, 120, lon));
      if (kR > cover) { t = st.base + (t - st.base) * cover / kR; cover = kR; } }
    const k = cover;                                             // a soft wall: a sharp one stair-steps on the sphere grid
    return { r: rh * TUCK + (rh + t * W - rh * TUCK) * k, k, shade, ink: st.ink ?? 1 };
  };
}
// a bun: a ball wound round its own axis (the ridges coil), at `out` W past the scalp along dir
function bunField(b) {
  const L = locksOf([0, 1, 0], 5, 0.9);
  return d => { const { c } = L(d); return { r: b.r * W * (0.93 + 0.07 * c) * (1 - 0.12 * Math.abs(d.y)), shade: -Math.pow(1 - c, 3) + 0.3 * Math.exp(-(((d.y - 0.45) / 0.2) ** 2)) * c }; };
}

// one closed mesh from a field d -> { r, shade }: the sphere's uv kept for the painted map, the normals taken from the
// welded surface so the uv seam never shows in the shading
function fieldMesh(f, rgb) {
  const g = new THREE.SphereGeometry(1, 288, 192), P = g.attributes.position, d = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { d.fromBufferAttribute(P, i).normalize(); const q = f(d); P.setXYZ(i, d.x * q.r, d.y * q.r, d.z * q.r); }
  const key = i => `${P.getX(i).toFixed(5)},${P.getY(i).toFixed(5)},${P.getZ(i).toFixed(5)}`, K = Array.from({ length: P.count }, (_, i) => key(i)), N = new Map(), I = g.index;
  const v = [0, 1, 2].map(() => new THREE.Vector3()), e = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < I.count; t += 3) {
    const ix = [0, 1, 2].map(k => I.getX(t + k)); ix.forEach((j, k) => v[k].fromBufferAttribute(P, j));
    n.subVectors(v[1], v[0]).cross(e.subVectors(v[2], v[0]));           // area weighted
    for (const j of ix) { const s0 = N.get(K[j]); if (s0) s0.add(n); else N.set(K[j], n.clone()); }
  }
  const GN = g.attributes.normal; for (let i = 0; i < P.count; i++) { const s0 = N.get(K[i]).clone().normalize(); GN.setXYZ(i, s0.x, s0.y, s0.z); }
  let map = null;
  const cw = 1024, ch = 512, cv = typeof document !== 'undefined' ? document.createElement('canvas') : null, x = cv?.getContext?.('2d');
  if (cv) { cv.width = cw; cv.height = ch; }
  const im = x?.createImageData?.(cw, ch);
  if (im?.data) {                                                 // (headless tests stub the canvas: no map there)
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const th = (j + 0.5) / ch * Math.PI, phi = (i + 0.5) / cw * 2 * Math.PI, s = Math.max(-1, Math.min(1, f(d.set(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th))).shade));
      const k = s < 0 ? 1 + 0.45 * s : 1 + 0.30 * s, o = 4 * (j * cw + i);
      for (let n = 0; n < 3; n++) im.data[o + n] = Math.min(255, 255 * (rgb[n] * k + (s > 0 ? 0.06 * s : 0)));
      im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  }
  const m = solid(g, toon(map ? [1, 1, 1] : rgb, { shade: [0.82, 0.79, 0.93], sheen: 0, rough: 1, rim: 0.12, map }));
  // the ink hull goes out only where hair grows: on the hairline wall (k < 1) it stays on the wall, inside the head
  const h = m.children[0], A = h.geometry.attributes.position, HN = h.geometry.attributes.normal, T = h.geometry.attributes.inkT;
  for (let i = 0; i < A.count; i++) { d.fromBufferAttribute(A, i).normalize(); const q = f(d), k = (q.k ?? 1) * (q.ink ?? 1), back = T.getX(i) * (1 - k);
    A.setXYZ(i, A.getX(i) - HN.getX(i) * back, A.getY(i) - HN.getY(i) * back, A.getZ(i) - HN.getZ(i) * back); T.setX(i, T.getX(i) * k); }
  m.receiveShadow = false; m.userData.hairStyle = true;
  return m;
}

// ------------------------------------------------------------------ locks that leave the head: a fall, a tail, a braid
// One lock: a tube swept along a path (W, the head's centre frame) with a cross-section that is flat (flat = depth / width) or round,
// its half-width along the path (w: values spread evenly from root to tip), and on it the scalp's lock language: strand ridges
// (ridges round it, a groove between two), the light band near its top, and for a braid the over-under chevrons of three strands
// (braid: crossings along it). The root starts inside the scalp's mass, so the lock grows out of it; nothing in it moves.
const lerpA = (A, t) => { const x = t * (A.length - 1), i = Math.min(A.length - 2, Math.floor(x)); return A[i] + (A[i + 1] - A[i]) * (x - i); };
function lockMesh(L, rgb) {
  const curve = new THREE.CatmullRomCurve3(L.path.map(p => new THREE.Vector3(...p).multiplyScalar(W)), false, 'centripetal');
  const M = L.seg ?? 56, N = L.sides ?? 18, flat = L.flat ?? 1, rid = L.ridges ?? 0, br = L.braid ?? 0, pos = [], uvs = [], idx = [];
  // the width runs round the head (the circle's tangent at the lock's end), carried along the lock: a root that leaves the head
  // straight outward never turns the section edge-on
  let B = null, sg = 1; const T = new THREE.Vector3(), n = new THREE.Vector3(), o = new THREE.Vector3(), c = new THREE.Vector3();
  const end = L.path[L.path.length - 1], B0 = L.across ? new THREE.Vector3(...L.across) : new THREE.Vector3(end[2], 0, -end[0]);
  if (B0.lengthSq() < 1e-6) B0.set(1, 0, 0);
  for (let i = 0; i <= M; i++) {
    const t = i / M; curve.getPointAt(t, c); curve.getTangentAt(t, T);
    if (!B) { B = B0.clone(); B.addScaledVector(T, -B.dot(T)).normalize(); n.crossVectors(B, T); sg = n.x * c.x + n.z * c.z >= 0 ? 1 : -1; }   // depth faces out from the head
    B.addScaledVector(T, -B.dot(T)).normalize(); n.crossVectors(B, T).multiplyScalar(sg);
    const w = lerpA(L.w, t) * W, ps = 2 * Math.PI * br * t, shift = br ? 0.16 * w * Math.sin(ps) : 0, pinch = br ? 0.86 + 0.14 * Math.abs(Math.cos(ps)) : 1;
    for (let j = 0; j <= N; j++) {
      const a = j / N * 2 * Math.PI, k = rid ? 1 - 0.10 * Math.pow(0.5 - 0.5 * Math.cos(rid * a), 2) : 1;
      o.copy(c).addScaledVector(B, Math.cos(a) * w * k * pinch + shift).addScaledVector(n, Math.sin(a) * w * flat * k * pinch);
      pos.push(o.x, o.y, o.z); uvs.push(j / N, t);
    }
  }
  for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
  // the normals must face out of the lock (the ring runs either way round with sg): facing in, a lock drew near black and its ink
  // hull went inside it (the falls of long, lob, braids and mullet, 26/11)
  { const r0 = (M >> 1) * (N + 1), c0 = new THREE.Vector3(); for (let j = 0; j < N; j++) c0.add(new THREE.Vector3().fromBufferAttribute(g.attributes.position, r0 + j)); c0.divideScalar(N);
    if (new THREE.Vector3().fromBufferAttribute(g.attributes.position, r0).sub(c0).dot(new THREE.Vector3().fromBufferAttribute(g.attributes.normal, r0)) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); } }
  const GN = g.attributes.normal; for (let i = 0; i <= M; i++) { const a = i * (N + 1), b = a + N, v = new THREE.Vector3(GN.getX(a) + GN.getX(b), GN.getY(a) + GN.getY(b), GN.getZ(a) + GN.getZ(b)).normalize(); GN.setXYZ(a, v.x, v.y, v.z); GN.setXYZ(b, v.x, v.y, v.z); }   // the seam shades as one
  const shade = (u, t) => { const a = 2 * Math.PI * u, cr = rid ? 0.5 + 0.5 * Math.cos(rid * a) : 1, face = sm(-0.3, 0.7, Math.sin(a));
    let s = -0.8 * Math.pow(1 - cr, 3) + 0.45 * Math.exp(-(((t - (L.band ?? 0.22)) / 0.07) ** 2)) * cr * cr * face + (L.tipLight || 0) * sm(0.75, 1, t) - 0.25 * sm(0.3, -0.6, Math.sin(a));
    if (br) { const q = 2 * br * t + 0.5 * Math.abs(Math.cos(a)) * Math.sign(Math.sin(phase(t))), f = q - Math.floor(q); s = Math.min(s, -0.9 * sm(0.18, 0.0, Math.min(f, 1 - f))) + 0.3 * sm(0.5, 0.2, Math.abs(f - 0.5)) * face; }
    return s; }, phase = t => 2 * Math.PI * br * t;
  const m = solid(g, toon(paint(256, 512, shade, rgb) ? [1, 1, 1] : rgb, { shade: [0.82, 0.79, 0.93], sheen: 0, rough: 1, rim: 0.12, map: paint.last }), 0.046 * W * (L.ink ?? 1));
  m.receiveShadow = false; m.userData.hairStyle = true; return m;
}
// a lock's painted map (as fieldMesh's: grooves dark, the band light), u round it and v along it; null headless (paint.last)
function paint(cw, ch, shade, rgb) {
  paint.last = null; const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null, x = cv?.getContext?.('2d'); if (cv) { cv.width = cw; cv.height = ch; }
  const im = x?.createImageData?.(cw, ch); if (!im?.data) return null;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const s = Math.max(-1, Math.min(1, shade((i + 0.5) / cw, (j + 0.5) / ch))), k = s < 0 ? 1 + 0.45 * s : 1 + 0.30 * s, o = 4 * (j * cw + i);
    for (let q = 0; q < 3; q++) im.data[o + q] = Math.min(255, 255 * (rgb[q] * k + (s > 0 ? 0.06 * s : 0))); im.data[o + 3] = 255; }
  x.putImageData(im, 0, 0); const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.flipY = false; return (paint.last = map);
}
// a fall: n locks side by side round the head between two longitudes (deg, both sides of the face when `both`), each from under the
// scalp's hem at `from` (W) straight down to `to`, `rho` W out from the head's widest ring, flaring, waving and its tip turning out
function fall(F, cut) {
  const out = [], sides = F.both === false ? [1] : [1, -1], n = F.n, r = rand(F.seed ?? 5);
  for (const sg of sides) for (let i = 0; i < n; i++) {
    const lon = sg * (F.lon[0] + (F.lon[1] - F.lon[0]) * (n === 1 ? 0.5 : i / (n - 1))), j = 1 + (F.jit ?? 0) * (r() - 0.5), to = Math.max(cut ?? -9, F.to * (F.toAt ? lerpA(F.toAt, Math.abs(lon - sg * F.lon[0]) / Math.max(1, Math.abs(F.lon[1] - F.lon[0]))) : 1) * j);
    if (to > F.from - 0.06) continue;                                                   // shortened away: no lock left below the scalp
    const K = 7, path = [];
    for (let k = 0; k <= K; k++) { const u = k / K, y = F.from + (to - F.from) * u, rho = 0.5 + (F.rho ?? 0.03) + (F.flare ?? 0) * u * u + (F.wave ? F.wave[0] * Math.sin(Math.PI * F.wave[1] * u + i) * sm(0, 0.2, u) : 0) + (F.flick ?? 0) * sm(0.7, 1, u), a = lon * DEG;
      path.push([rho * Math.sin(a), y, rho * Math.cos(a)]); }
    path.unshift(onHead(lon, F.from + 0.18, -0.04));                                   // the root: inside the scalp's mass
    const wd = F.w ?? 0.53 * Math.abs(F.lon[1] - F.lon[0]) * DEG / Math.max(1, n - 1) * 0.65;   // half the width: 1.3 of the spacing, the locks overlap
    out.push({ path, w: (F.tip === 'blunt' ? [0.7, 1, 1, 1, 1, 0.95, 0.5] : F.tip === 'club' ? [0.6, 0.9, 1.05, 1.1, 1.0, 0.7, 0.2] : [0.7, 1, 1, 0.95, 0.8, 0.5, 0.06]).map(x => x * wd), flat: F.flat ?? 0.35, ridges: F.ridges ?? 3, braid: F.braid ?? 0, tipLight: F.tipLight, ink: F.ink, sides: F.sides, band: F.band });
  }
  return out;
}

export function toonHair(style = 'side', col, patch) {   // patch: fields over the style's own (measures try a length with it)
  if (!STYLES[style]) throw new Error(`toonHair: no style '${style}' (${HAIR_STYLES.join(', ')})`); const st = { ...STYLES[style], ...patch };
  const rgb = col || st.col;
  return () => {
    const g = new THREE.Group(); g.name = 'toonHair:' + style; g.position.y = -HAT_LIFT;   // built on the head's own centre
    g.add(fieldMesh(scalp(st), rgb));
    for (const b of st.buns || []) {
      const d = new THREE.Vector3(...b.dir).normalize(), m = fieldMesh(bunField(b), rgb);
      m.position.copy(d).multiplyScalar(headR(d) + b.out * W); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(m);
    }
    const tails = (st.tails || []).map(L => { const y0 = L.path[0][1], lo = Math.min(...L.path.map(p => p[1])); if (st.cut == null || lo >= st.cut) return L; const q = (y0 - st.cut) / (y0 - lo); return { ...L, path: L.path.map(p => [p[0], y0 + (p[1] - y0) * q, p[2]]) }; });
    // st.neck: the lengths are bound to the neck and the upper back, not the head (cast.js moves this group each pose: the
    // crown turns with the head, the lengths stay on the shoulders). Rigid both: no physics, no swing (Studio 26/11, option A)
    const lg = st.neck ? Object.assign(new THREE.Group(), { name: 'toonHair:lengths' }) : g; if (st.neck) { lg.userData.neckBound = true; g.add(lg); }
    const locks = [...tails, ...(st.falls || []).flatMap(F => fall(F, st.cut))];
    for (const L of locks) lg.add(lockMesh(L, rgb));
    // the blend (cast.js skinToNeck): all head down to where the crown's mass ends (the bell's hem, or the hairline at the nape),
    // so nothing the crown covers ever leaves it, then all neck 0.45 W lower (a lock's top fixed to the neck opened 11-49 mm)
    if (st.neck) Object.assign(lg.userData, { neckTop: ((st.hang ? Math.min(...st.hang.hem.map(h => h[1])) : table(st.lo, 180)) - 0.08) * W, neckRamp: 0.45 * W });
    return g;
  };
}
