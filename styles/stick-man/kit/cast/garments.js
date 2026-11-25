// The wardrobe's garments and accessories (kit/cast/wardrobe.js): what each paints on the torso, the rigid pieces it lays on
// the shell (wear.js), its sleeves and its cloth (drape.js). Sized from the figure's own shell: an angle or metres of arc on
// it, never a fixed radius.
// Drawn to be read on a phone: at 720 wide a standing figure is ~590 px a metre, so a drawn line is INK.big (4 px) round a
// collar, a lapel, a pocket or a strap, INK.small (3 px) round a button or a badge, LINE (4 px) for a painted seam; a piece
// stands 4-12 mm off the cloth and is clearly lighter or darker than it.
import * as THREE from 'three';
import { INK_RGB, css } from '#engine/look.js';
import { plate, sweep, conform, disc, tubeOn, inked, wearMat, stripes, thS, at, neckY, armOut, Y0 } from './wear.js';
import { Guide, stripRest } from './drape.js';
import { PALETTES, UNIFORM, colourOf, accentOf, oneOf, mul, ln, tone } from './palette.js';

export const INK = { big: 0.0075, mid: 0.006, small: 0.005 }, LINE = 0.0065;
const PI = Math.PI, sstep = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
// a band round the neck, on the line where the head meets this body (its section's heights are offsets from it)
const neckband = (X, section, mat, ink = INK.mid, t0 = -PI, t1 = PI) => X.add(inked(sweep(X.F, section, t0, t1, 72, th => neckY(X.F, th)), mat, ink));
// rows of a plate on either side of the front: mirrored for sg -1; moved across by s0
const sided = (rows, sg) => rows.map(([y, a, b]) => (sg > 0 ? [y, a, b] : [y, -b, -a]));
const moved = (rows, s0) => rows.map(([y, a, b]) => [y, a + s0, b + s0]);
// an open front: the V from the collar down to yV, w0 wide at the top
export const vee = (yV, w0) => ({ yV, w0, edge: y => 0.004 + (w0 - 0.004) * Math.max(0, (y - yV) / (0.45 - yV)), poly: [[-w0, 0.45], [w0, 0.45], [0.004, yV], [-0.004, yV]] });

// ------------------------------------------------------------------ shared pieces
// the parts every shirt-and-trousers wearer shows: the trousers from the belt down, a belt with a buckle
export const BELT = [0.034, 0.066];
function trousers(p, c) { p.band(Y0 - 0.01, BELT[1], c); p.hline(BELT[1], LINE, INK_RGB); p.line([[0, BELT[0]], [0, Y0]], 0.005, ln(c)); }
function belt(X, c = UNIFORM.leather, buckle = UNIFORM.gold, d = 0.010) {
  const { F, add } = X, [y0, y1] = BELT;
  add(inked(sweep(F, [[y0, 0], [y0, d], [y1, d], [y1, 0]], -PI, PI, 96), wearMat(c), INK.mid));
  add(inked(plate(F, 0, [[y1 + 0.004, -0.026, 0.026], [y0 - 0.004, -0.026, 0.026]], d, d + 0.006, 6), wearMat(buckle), INK.small));
  add(inked(plate(F, 0, [[y1 - 0.008, -0.013, 0.013], [y0 + 0.008, -0.013, 0.013]], d + 0.006, d + 0.008, 3), wearMat(mul(buckle, 0.4)), 0.002));
}
// a patch pocket (a raised plate, its top edge a welt), s0..s1 across, from y1 down to y0; a flap over it when asked
function pocket(X, c, s0, s1, y1, y0, flap = null) {
  const { F, add } = X; add(inked(plate(F, 0, [[y1, s0, s1], [y0 + 0.012, s0, s1], [y0, s0 + 0.012, s1 - 0.012]], 0.001, 0.008, 8), wearMat(tone(c, 0.82)), INK.mid));
  if (flap) { const m = (s0 + s1) / 2; add(inked(plate(F, 0, [[y1 + 0.012, s0 - 0.004, s1 + 0.004], [y1 - 0.012, s0 - 0.004, s1 + 0.004], [y1 - 0.026, m - 0.008, m + 0.008]], 0.008, 0.014, 8), wearMat(flap), INK.mid));
    button(X, m, y1 - 0.010, tone(flap, 0.4), 0.0075, 0.014); }
  else add(inked(plate(F, 0, [[y1 + 0.004, s0, s1], [y1 - 0.010, s0, s1]], 0.008, 0.012, 8), wearMat(tone(c, 0.62)), INK.small));
}
function button(X, s, y, c, r = 0.0105, d0 = 0.002) { X.add(inked(disc(X.F, thS(X.F, 0, y, s), y, r, 0.005, d0), wearMat(c), INK.small)); }
// a shirt's collar: two points under the chin
function collar(X, c) {
  neckband(X, [[-0.018, 0], [-0.018, 0.007], [0.004, 0.007], [0.004, 0]], wearMat(c), INK.small);
  for (const sg of [-1, 1]) X.add(inked(plate(X.F, 0, sided([[0.392, 0.010, 0.082], [0.362, 0.013, 0.078], [0.336, 0.028, 0.070], [0.312, 0.050, 0.054]], sg), 0.004, 0.013, 6), wearMat(c), INK.big));
}
// a jacket's lapels either side of its V: wide at the collar with a notch, to a point at the V's foot
function lapels(X, c, w, k = 0.72) {
  const op = X.opening, rows = []; for (let i = 0; i <= 8; i++) { const u = i / 8, y = 0.385 - (0.385 - op.yV - 0.004) * u, e = op.edge(y); rows.push([y, e, e + w * (1 - sstep(0.35, 1, u)) * (u > 0.2 && u < 0.34 ? 0.72 : 1) + 0.004]); }
  for (const sg of [-1, 1]) X.add(inked(plate(X.F, 0, sided(rows, sg), 0.002, 0.011, 6), wearMat(tone(c, k)), INK.big));
}
// cloth tones: soft folds round a garment
const folds = (n, k = 0.10) => u => 1 - k * (0.5 + 0.5 * Math.cos(u * 2 * PI * n)) ** 2;
// painted on a cloth spread flat: lines in the garment's own line tone
const inkOn = (g, c, w) => { g.strokeStyle = css(ln(c)); g.lineWidth = w; g.lineJoin = g.lineCap = 'round'; };
export const SKIRT_Y = 0.046;   // where a skirt is sewn
function skirtCloth(X, c, { len, flare = 0.24, y = SKIRT_Y, paint = null, shade = folds(9), ink = 0.022 }) {
  const inner = X.has('coat');   // (under a coat it hangs close, inside the coat's own cloth)
  X.cover(y); X.cloth(new Guide(X.F, { y, len: (inner ? 0.40 : len) * X.F.leg, cols: 32, rows: 12, d: 0.008, flare: inner ? 0.02 : flare, ...(inner ? { hem: [0.120, 0.160] } : {}) }), { rgb: c, inner: mul(c, 0.5), shade, paint, ink: inner ? 0.006 : ink, topInk: 0.9, under: inner });
}
function sash(X, c, bow = false) {
  const F = X.F; X.add(inked(sweep(F, [[0.030, 0], [0.030, 0.013], [0.070, 0.013], [0.070, 0]], -PI, PI, 96), wearMat(c), INK.mid));
  if (bow) for (const sg of [-1, 1]) X.add(inked(plate(F, 0.55, sided([[0.074, 0.028, 0.052], [0.050, 0.004, 0.058], [0.026, 0.028, 0.052]], sg), 0.013, 0.022, 10), wearMat(c), INK.mid));
}

// ------------------------------------------------------------------ garments: z = paint order (inner first)
const SHIRTS = { office: UNIFORM.shirt, police: UNIFORM.police, work: UNIFORM.work };
export const GARMENTS = {
  shirt: { z: 1, colour: (a, b) => colourOf(b, SHIRTS[a] || colourOf(a, UNIFORM.shirt)),
    paint(p, c, X) { p.fill(c); p.line([[-0.19, 0.322], [0, 0.335], [0.19, 0.322]], 0.005, ln(c)); for (const s of [-0.018, 0.018]) p.line([[s, 0.40], [s, BELT[1]]], 0.005, ln(c)); trousers(p, X.variant === 'police' ? UNIFORM.policeCap : X.variant === 'work' ? UNIFORM.jeans : UNIFORM.charcoal); },
    build(X, c) {
      if (!X.hidden) collar(X, X.variant === 'police' ? mul(c, 0.7) : mul(c, 1.25));
      if (!X.has('tie')) for (const y of [0.30, 0.235, 0.17, 0.105]) if (X.shows(y, 0)) button(X, 0, y, tone(c, 0.45), 0.009);
      if (X.variant === 'police' && !X.under) for (const s of [-1, 1]) pocket(X, c, Math.min(s * 0.045, s * 0.118), Math.max(s * 0.045, s * 0.118), 0.222, 0.125, mul(c, 0.62));
      else if (X.shows(0.2, 0.08)) { pocket(X, c, -0.122, -0.052, 0.242, 0.160); X.pocket = { s0: -0.122, s1: -0.052, top: 0.242 }; }
      if (!X.has('dutybelt') && !X.under && !X.has('apron') && !X.has('skirt')) belt(X);
      X.sleeve(c, { cuff: X.variant === 'police' ? mul(c, 0.6) : mul(c, 1.3) });
    } },
  scrubs: { z: 1, colour: a => colourOf(a, UNIFORM.teal),
    paint(p, c) { p.fill(c); for (const sg of [-1, 1]) p.sector(sg * 1.05, sg * 2.0, mul(c, 0.5)); p.poly([[-0.085, 0.43], [0.085, 0.43], [0, 0.268]], [0.40, 0.55, 0.54]);
      p.band(Y0 - 0.01, 0.0, mul(c, 0.45)); p.hline(0.0, LINE, INK_RGB); },
    build(X, c) { const { F, add } = X, dk = mul(c, 0.4);
      for (const sg of [-1, 1]) add(inked(plate(F, 0, sided([[0.395, 0.074, 0.102], [0.33, 0.038, 0.066], [0.274, 0.0, 0.030], [0.252, 0.0, 0.004]], sg), 0.002, 0.010, 5), wearMat(dk), INK.mid));
      X.pocket = { s0: -0.128, s1: -0.058, top: 0.236 }; pocket(X, c, -0.128, -0.058, 0.236, 0.150); for (const sg of [-1, 1]) pocket(X, c, Math.min(sg * 0.042, sg * 0.130), Math.max(sg * 0.042, sg * 0.130), 0.098, 0.022);
      X.sleeve(c, { to: armOut(X.F) + 2.3, cuff: dk, profile: u => 1.1 + 0.18 * u }); } },
  coat: { z: 3, colour: (a, b) => colourOf(a === 'doctor' || a === 'lab' ? b : a, UNIFORM.coat), open: vee(0.185, 0.095),
    paint(p, c, X) { p.hole(X.opening.poly, c); p.line([[0.004, 0.185], [0.004, 0.08]], LINE, ln(c)); for (const sg of [-1, 1]) p.line([[sg * 0.175, 0.37], [sg * 0.15, 0.30]], 0.005, ln(c)); },
    build(X, c) { const { F } = X; lapels(X, c, 0.050, 0.86); for (const y of [0.160, 0.118]) button(X, 0.030, y, tone(c, 0.35), 0.0115);
      X.pocket = { s0: -0.142, s1: -0.072, top: 0.232 }; pocket(X, c, -0.142, -0.072, 0.232, 0.142); X.cover(0.112);
      // the coat's line goes straight on from the shell's widest height: one garment, buttoned over the hip, then a slit
      X.cloth(new Guide(F, { y: 0.112, len: 0.56 * F.leg, gap: u => 0.02 + 0.13 * sstep(0.3, 1, u), cols: 28, rows: 12, d: -0.002, flare: 0.05, hem: [0.148, 0.215], lift: 0.027 }),
        { rgb: c, inner: mul(c, 0.6), ink: 0.0245, topInk: 1, shade: folds(7, 0.07), paint: (g, w, h) => { inkOn(g, c, 9); for (const x of [0.135, 0.755]) { g.fillStyle = css(mul(c, 0.86)); g.fillRect(x * w, 0.30 * h, 0.11 * w, 0.34 * h); g.strokeRect(x * w, 0.30 * h, 0.11 * w, 0.34 * h); g.beginPath(); g.moveTo(x * w, 0.36 * h); g.lineTo((x + 0.11) * w, 0.36 * h); g.stroke(); }
          g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0.93 * h); g.lineTo(w, 0.93 * h); g.stroke(); } });
      X.sleeve(c, { cuff: mul(c, 0.8), shirt: X.has('shirt') }); } },
  jacket: { z: 3, colour: a => { oneOf('jacket', a, ['chef', 'pilot']); return a === 'chef' ? UNIFORM.chef : UNIFORM.pilot; }, open: a => (a === 'chef' ? null : vee(0.205, 0.095)),
    paint(p, c, X) {
      if (X.variant === 'chef') { p.fill(c); p.line([[-0.095, 0.385], [-0.086, 0.30], [-0.086, Y0]], LINE, ln(c)); trousersLow(p); return; }
      p.hole(X.opening.poly, c); p.line([[0.004, 0.205], [0.004, Y0]], LINE, ln(c)); p.hline(0.0, LINE, ln(c)); p.band(Y0 - 0.01, 0.0, UNIFORM.charcoal); },
    build(X, c) { const { F, add } = X;
      if (X.variant === 'chef') {
        for (const s of [-0.052, 0.052]) for (const y of [0.320, 0.262, 0.204, 0.146]) button(X, s, y, UNIFORM.dark, 0.0115);
        neckband(X, [[-0.050, 0], [-0.050, 0.013], [-0.004, 0.014], [0.006, 0.010], [0.006, 0]], wearMat(mul(c, 0.9)));
        // a knotted neckerchief: the one strong colour on the white
        add(inked(plate(F, 0, [[0.352, -0.062, 0.062], [0.332, -0.040, 0.040], [0.300, 0, 0]], 0.001, 0.011, 6), wearMat(UNIFORM.red), INK.mid)); add(inked(disc(F, 0, 0.346, 0.016, 0.008, 0.011), wearMat(mul(UNIFORM.red, 0.65)), INK.small));
        X.sleeve(c, { cuff: mul(c, 0.72), flare: 0.002 }); return; }
      lapels(X, c, 0.054); for (const s of [-0.048, 0.048]) for (const y of [0.172, 0.118, 0.064]) button(X, s, y, UNIFORM.gold, 0.0125);
      X.sleeve(c, { rings: [UNIFORM.gold, 3], shirt: true }); } },
  vest: { z: 3, colour: (a, b) => colourOf(a === 'hivis' ? b : a, UNIFORM.hivis), open: vee(0.285, 0.080),
    paint(p, c, X) { p.hole(X.opening.poly, c); for (const sg of [-1, 1]) p.line([[sg * 0.080, 0.45], [sg * 0.004, 0.285]], LINE, INK_RGB); },
    build(X) { const { F, add } = X, sv = wearMat(UNIFORM.silver);
      for (const [y0, y1] of [[0.078, 0.112], [0.168, 0.202]]) add(inked(sweep(F, [[y0, 0], [y0, 0.006], [y1, 0.006], [y1, 0]], -PI, PI, 96), sv, INK.small));
      for (const th of [0, PI]) for (const sg of [-1, 1]) add(inked(plate(F, th, sided([[0.388, 0.066, 0.100], [0.30, 0.070, 0.104], [0.203, 0.070, 0.104]], sg), 0.001, 0.006, 4), sv, INK.small));
      add(inked(plate(F, 0, [[0.280, -0.008, 0.008], [0.0, -0.008, 0.008]], 0.007, 0.013, 2), wearMat(UNIFORM.dark), 0.003)); add(inked(plate(F, 0, [[0.276, -0.013, 0.013], [0.236, -0.013, 0.013]], 0.013, 0.019, 2), wearMat(UNIFORM.steel), INK.small));
      pocket(X, UNIFORM.hivis, 0.040, 0.112, 0.262, 0.212); } },
  blazer: { z: 3, colour: a => colourOf(a, UNIFORM.charcoal), open: vee(0.170, 0.095),
    paint(p, c, X) { p.hole(X.opening.poly, c); p.line([[0.004, 0.170], [0.004, Y0]], LINE, ln(c)); p.band(Y0 - 0.01, -0.005, tone(c, 0.5)); p.hline(-0.005, LINE, ln(c)); },
    build(X, c) { const { F, add } = X; lapels(X, c, 0.062); for (const y of [0.146, 0.092]) button(X, 0.026, y, tone(c, 0.4), 0.0115);
      add(inked(plate(F, 0, [[0.232, -0.140, -0.080], [0.212, -0.140, -0.080]], 0.001, 0.009, 10), wearMat(tone(c, 0.6)), INK.small)); add(inked(plate(F, 0, [[0.262, -0.118, -0.112], [0.232, -0.134, -0.086]], 0.001, 0.008, 8), wearMat(accentOf(X.arg, UNIFORM.silver)), INK.small));
      for (const sg of [-1, 1]) add(inked(plate(F, 0, sided([[0.078, 0.058, 0.142], [0.048, 0.058, 0.142]], sg), 0.002, 0.010, 6), wearMat(tone(c, 0.72)), INK.mid));
      X.sleeve(c, { shirt: true }); } },
  cardigan: { z: 3, colour: a => colourOf(a, PALETTES.navy.main), open: vee(0.215, 0.085),
    paint(p, c, X) { p.hole(X.opening.poly, c); p.ribs(0.06, 0.40, 0.030, 0.0045, tone(c, 0.82)); },
    build(X, c) { const { F, add } = X, e = X.opening.edge, dk = tone(c, 0.55);
      for (const sg of [-1, 1]) add(inked(plate(F, 0, sided([[0.388, e(0.388), e(0.388) + 0.030], [0.30, e(0.30), e(0.30) + 0.030], [0.215, 0.0, 0.030], [0.03, 0.0, 0.030]], sg), 0.002, 0.009, 4), wearMat(dk), INK.mid));
      for (const y of [0.190, 0.140, 0.090, 0.040]) button(X, 0.015, y, accentOf(X.arg, UNIFORM.gold), 0.0105, 0.009);
      for (const sg of [-1, 1]) pocket(X, c, Math.min(sg * 0.056, sg * 0.130), Math.max(sg * 0.056, sg * 0.130), 0.118, 0.050);
      add(inked(sweep(F, [[-0.020, 0], [-0.020, 0.010], [0.022, 0.010], [0.022, 0]], -PI, PI, 96), wearMat([1, 1, 1], { map: stripes([dk, mul(dk, 0.72)], 'u', 34) }), INK.mid));
      X.sleeve(c, { cuff: dk }); } },
  sweater: { z: 2, colour: a => colourOf(a, PALETTES.forest.main),
    paint(p, c, X) { const ac = accentOf(X.arg, UNIFORM.gold); p.fill(c); p.ribs(0.02, 0.36, 0.022, 0.0045, tone(c, 0.84));
      // a band of knitted diamonds across the chest between two lines: reads across a room
      p.band(0.205, 0.285, tone(c, 0.5)); for (const y of [0.205, 0.285]) p.hline(y, 0.010, ac); for (let i = -14; i < 15; i++) { const s = i * 0.048; p.poly([[s, 0.222], [s + 0.016, 0.245], [s, 0.268], [s - 0.016, 0.245]], ac); } },
    build(X, c) { const { F, add } = X, dk = tone(c, 0.6), rib = wearMat([1, 1, 1], { map: stripes([dk, mul(dk, 0.72)], 'u', 34) });
      neckband(X, [[-0.052, 0], [-0.054, 0.012], [-0.038, 0.020], [-0.010, 0.019], [0.006, 0.010], [0.006, 0]], wearMat([1, 1, 1], { map: stripes([dk, mul(dk, 0.72)], 'u', 26) }));
      if (!X.has('skirt')) add(inked(sweep(F, [[-0.022, 0], [-0.022, 0.012], [0.026, 0.012], [0.026, 0]], -PI, PI, 96), rib, INK.mid)); X.sleeve(c, { cuff: dk }); } },
  dress: { z: 1, colour: a => colourOf(a, PALETTES.coral.main),
    paint(p, c, X) { const ac = accentOf(X.arg, UNIFORM.dark); p.fill(c); for (const sg of [-1, 1]) p.line([[sg * 0.075, 0.07], [sg * 0.095, 0.215]], 0.005, ln(c)); for (let i = -9; i < 10; i++) for (const [j, y] of [[0, 0.12], [1, 0.19], [0, 0.26], [1, 0.33]]) p.dot([i * 0.062 + (j ? 0.031 : 0), y], 0.011, ac); },
    build(X, c) { const ac = accentOf(X.arg, UNIFORM.dark);
      // a flat round collar from the front opening to the back of the neck, its front ends rounded
      neckband(X, th => { const g = Math.min(Math.abs(th), 2 * PI - Math.abs(th)), w = 0.058 * Math.sqrt(Math.max(0.02, Math.min(1, (g - 0.04) / 0.32))); return [[-w, 0.001], [-w + 0.006, 0.011], [-0.006, 0.013], [0.006, 0.010], [0.006, 0.001]]; }, wearMat(ac), INK.mid, 0.045, 2 * PI - 0.045); button(X, 0, 0.345, ac, 0.011);
      sash(X, ac, true); skirtCloth(X, c, { len: 0.54, paint: (g, w, h) => { g.fillStyle = css(ac); for (let i = 0; i < 20; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.ellipse((i + (j % 2 ? 0.5 : 0)) / 20 * w, (0.22 + 0.24 * j) * h, 9, 8, 0, 0, 7); g.fill(); } g.fillRect(0, 0.90 * h, w, 0.10 * h); inkOn(g, c, 5); g.beginPath(); g.moveTo(0, 0.90 * h); g.lineTo(w, 0.90 * h); g.stroke(); } });
      X.sleeve(c, { to: armOut(X.F) + 1.9, cuff: ac, profile: u => 1.05 + 0.5 * Math.sin(PI * Math.min(1, 0.15 + u)) }); } },
};
function trousersLow(p) { p.band(Y0 - 0.01, 0.0, UNIFORM.charcoal); p.hline(0.0, LINE, INK_RGB); }

// ------------------------------------------------------------------ accessories
export const APRON_SPAN = 78 * PI / 180, APRON_Y = 0.056;
export const ITEMS = {
  skirt(X, a) { const c = colourOf(a, PALETTES.plum.main); X.add(inked(sweep(X.F, [[0.030, 0], [0.030, 0.013], [0.066, 0.013], [0.066, 0]], -PI, PI, 96), wearMat(tone(c, 0.6)), INK.mid)); button(X, 0, 0.048, tone(c, 0.35), 0.010, 0.013);
    skirtCloth(X, c, { len: 0.54, flare: 0.22, shade: folds(12, 0.16), paint: (g, w, h) => { inkOn(g, c, 5); for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo((i + 0.5) / 16 * w, 0.12 * h); g.lineTo((i + 0.5) / 16 * w, 0.96 * h); g.stroke(); } } }); },
  // one piece: the bib's foot is as wide as the skirt's top (APRON_SPAN either side of the front) and the skirt is sewn to it
  apron(X, a, b) { if (b) oneOf('apron:' + a, b, ['low']); const c = colourOf(a, PALETTES.slate.main), F = X.F, top = b === 'low' ? 0.205 : 0.262, yj = APRON_Y, wAt = (y, th) => { let s = 0, t = 0; while (t < th) { s += 0.01 * Math.hypot(at(F, t + 0.01, y).x - at(F, t, y).x, at(F, t + 0.01, y).z - at(F, t, y).z) / 0.01; t += 0.01; } return s; }, j = wAt(yj, APRON_SPAN) / F.k, h = Math.min(0.092, 0.5 * j);
    const rows = [[top, 1], [top - 0.02, 1.02], [0.150, 1.10], [0.110, 1.30], [0.084, 1.62]].map(([y, k]) => [y, -Math.min(j, h * k), Math.min(j, h * k)]); rows.push([0.068, -0.92 * j, 0.92 * j], [yj - 0.004, -j, j]);
    X.add(inked(plate(F, 0, rows, 0.011, 0.017, 20), wearMat(c), INK.mid));
    for (const sg of [-1, 1]) X.add(inked(plate(F, 0, sided([[0.392, 0.070, 0.092], [top - 0.004, h - 0.026, h - 0.004]], sg), 0.011, 0.016, 2), wearMat(tone(c, 0.6)), INK.small));
    X.add(inked(sweep(F, [[yj - 0.016, 0.011], [yj - 0.016, 0.021], [yj + 0.016, 0.021], [yj + 0.016, 0.011]], -PI, PI, 96), wearMat(tone(c, 0.6)), INK.small)); X.add(inked(disc(F, PI, yj, 0.024, 0.012, 0.021), wearMat(tone(c, 0.6)), INK.small));
    X.add(inked(plate(F, 0, [[Math.min(0.172, top - 0.034), -0.056, 0.056], [0.098, -0.056, 0.056]], 0.017, 0.023, 6), wearMat(tone(c, 0.72)), INK.mid)); X.cover(yj);
    X.cloth(new Guide(F, { y: yj, len: 0.50 * F.leg, span: APRON_SPAN, cols: 16, rows: 12, d: 0.014, flare: 0.10 }), { rgb: c, inner: mul(c, 0.5), shade: folds(6, 0.10), ink: 0.018, topInk: 0.5,
      paint: (g, w, hh) => { inkOn(g, c, 7); g.beginPath(); g.moveTo(0, 0.90 * hh); g.lineTo(w, 0.90 * hh); g.stroke(); g.strokeRect(0.30 * w, 0.16 * hh, 0.40 * w, 0.40 * hh); g.beginPath(); g.moveTo(0.5 * w, 0.16 * hh); g.lineTo(0.5 * w, 0.56 * hh); g.stroke(); } }); },
  scarf(X, a) { const c = colourOf(a, PALETTES.mustard.main), ac = accentOf(a, UNIFORM.dark), F = X.F, list = [c, c, ac];
    neckband(X, [[-0.066, 0], [-0.074, 0.016], [-0.056, 0.032], [-0.022, 0.033], [0.004, 0.016], [0.006, 0]], wearMat([1, 1, 1], { map: stripes(list, 'u', 8) }), INK.big);
    X.add(inked(conform(F, new THREE.SphereGeometry(0.036, 18, 12).scale(1, 0.9, 0.55).translate(0, 0, 0.012), -0.10, 0.338, 0.026), wearMat(c), INK.mid));
    for (const [th, len, lean] of [[-0.36, 0.215, -0.10], [0.16, 0.175, 0.10]]) X.cloth({ strip: stripRest(F, { th, y: 0.330, len, width: 0.074, rows: 9, d: 0.030, lean }) },
      { rgb: c, inner: mul(c, 0.6), map: stripes(list.slice().reverse(), 'v', 2), ink: 0.0085, thick: 0.012, tether: 0.02, reach: 0.06, fringe: { rgb: ac, len: 0.030, n: 5 } }); },
  tie(X, a) { if (X.closed > 1) return; const stripe = a === 'stripe', c = colourOf(stripe ? 'crimson' : a, UNIFORM.crimson), F = X.F, bot = X.opening ? X.opening.yV + 0.002 : 0.095, m = wearMat(c), w = y => 0.016 + 0.024 * Math.min(1, (0.352 - y) / 0.20);
    const rows = []; for (let i = 0; i <= 8; i++) { const y = 0.348 - (0.348 - bot - (X.opening ? 0 : 0.028)) * i / 8; rows.push([y, -w(y), w(y)]); } if (!X.opening) rows.push([bot, 0, 0]);
    X.add(inked(plate(F, 0, rows, 0.004, 0.012, 4), m, INK.mid)); X.add(inked(plate(F, 0, [[0.384, -0.026, 0.026], [0.346, -0.015, 0.015]], 0.012, 0.022, 4), wearMat(mul(c, 0.78)), INK.mid));
    if (stripe) for (let y = 0.322; y > bot + 0.035; y -= 0.042) X.add(inked(plate(F, 0, [[y, -w(y), w(y)], [y - 0.014, -w(y - 0.014), w(y - 0.014)]], 0.012, 0.0135, 4), wearMat(UNIFORM.gold), 0.0015)); },
  stethoscope(X) { const F = X.F, d = 0.020, tm = wearMat(UNIFORM.tube), sm = wearMat(UNIFORM.steel);
    X.add(inked(tubeOn(F, [[-0.86, neckY(F, -0.86) + 0.004, d], [-0.66, 0.33, d], [-0.50, 0.25, d], [-0.40, 0.17, d], [-0.36, 0.125, d]], 0.0075), tm, INK.small)); X.add(inked(disc(F, -0.36, 0.108, 0.024, 0.012, d - 0.008, 20), sm, INK.mid)); X.add(inked(disc(F, -0.36, 0.108, 0.013, 0.004, d + 0.004, 16), wearMat(mul(UNIFORM.steel, 0.5)), 0.003));
    X.add(inked(tubeOn(F, [[0.86, neckY(F, 0.86) + 0.004, d], [0.66, 0.33, d], [0.52, 0.25, d], [0.47, 0.205, d]], 0.0075), tm, INK.small)); for (const e of [-0.09, 0.09]) { X.add(inked(tubeOn(F, [[0.47, 0.205, d], [0.47 + e, 0.172, d], [0.47 + 1.3 * e, 0.140, d]], 0.0048, 14, 8), sm, INK.small)); X.add(inked(disc(F, 0.47 + 1.3 * e, 0.136, 0.009, 0.008, d - 0.004), wearMat(UNIFORM.dark), 0.003)); } },
  nametag(X) { const F = X.F; X.add(inked(plate(F, 0, [[0.262, 0.056, 0.140], [0.216, 0.056, 0.140]], 0.002, 0.009, 8), wearMat(UNIFORM.tag), INK.mid)); X.add(inked(plate(F, 0, [[0.262, 0.056, 0.140], [0.251, 0.056, 0.140]], 0.009, 0.0105, 8), wearMat(UNIFORM.crimson), 0.001));
    for (const [y, e] of [[0.244, 0.128], [0.230, 0.108]]) X.add(inked(plate(F, 0, [[y, 0.066, e], [y - 0.006, 0.066, e]], 0.009, 0.0105, 4), wearMat(UNIFORM.dark), 0.001)); },
  pens(X) { const F = X.F, pk = X.pocket || { s0: -0.122, s1: -0.052, top: 0.242 }; if (!X.pocket) pocket(X, X.top || UNIFORM.shirt, pk.s0, pk.s1, pk.top, pk.top - 0.085);
    [[0.020, [0.04, 0.14, 0.60]], [0.040, [0.60, 0.04, 0.04]]].forEach(([ds, c]) => { const th = thS(F, 0, pk.top, pk.s0 + ds); X.add(inked(conform(F, new THREE.CylinderGeometry(0.0062, 0.0062, 0.076, 10).translate(0, 0, 0.0062), th, pk.top + 0.004, 0.002), wearMat(c), 0.0035)); X.add(inked(plate(F, th, [[pk.top + 0.036, -0.0022, 0.0022], [pk.top + 0.004, -0.0022, 0.0022]], 0.0135, 0.0165, 1), wearMat(UNIFORM.steel), 0.002)); }); },
  badge(X, a) { oneOf('badge', a, ['police', 'id', 'wings', 'crest']); const F = X.F, gold = wearMat(UNIFORM.gold);
    if (a === 'id') { for (const sg of [-1, 1]) X.add(inked(plate(F, 0, [[0.386, sg * 0.104 - 0.007, sg * 0.104 + 0.007], [0.30, sg * 0.078 + 0.012 - 0.007, sg * 0.078 + 0.012 + 0.007], [0.212, 0.066 + sg * 0.006 - 0.007, 0.066 + sg * 0.006 + 0.007]], 0.001, 0.005, 2), wearMat(UNIFORM.crimson), 0.004));
      X.add(inked(plate(F, 0, [[0.206, 0.034, 0.098], [0.116, 0.034, 0.098]], 0.001, 0.007, 6), wearMat(UNIFORM.tag), INK.mid)); X.add(inked(plate(F, 0, [[0.194, 0.042, 0.070], [0.156, 0.042, 0.070]], 0.007, 0.0085, 3), wearMat([0.45, 0.26, 0.14]), 0.002));
      for (const [y, e] of [[0.188, 0.092], [0.172, 0.088]]) X.add(inked(plate(F, 0, [[y, 0.076, e], [y - 0.006, 0.076, e]], 0.007, 0.0085, 2), wearMat(UNIFORM.dark), 0.001)); X.add(inked(plate(F, 0, [[0.142, 0.042, 0.090], [0.130, 0.042, 0.090]], 0.007, 0.0085, 4), wearMat(UNIFORM.dark), 0.001)); return; }
    if (a === 'wings') { X.add(inked(plate(F, 0, moved([[0.262, -0.058, 0.058], [0.250, -0.048, 0.048], [0.240, -0.032, 0.032], [0.231, -0.012, 0.012]], -0.142), 0.001, 0.008, 12), gold, INK.small)); X.add(inked(disc(F, thS(F, 0, 0.249, -0.142), 0.249, 0.015, 0.005, 0.008), wearMat(mul(UNIFORM.gold, 0.5)), 0.004)); return; }
    const c = a === 'crest' ? UNIFORM.crimson : UNIFORM.gold, y0 = a === 'crest' ? 0.200 : 0.305, s0 = -0.080, st = [[0, 1], [0.24, 0.32], [0.95, 0.31], [0.38, -0.12], [0.59, -0.81], [0, -0.38]];
    X.add(inked(plate(F, 0, moved([[y0, -0.030, 0.030], [y0 - 0.018, -0.036, 0.036], [y0 - 0.044, -0.030, 0.030], [y0 - 0.070, 0, 0]], s0), 0.001, 0.008, 8), wearMat(c), INK.mid));
    const sh = new THREE.Shape(); [...st, ...st.slice(1, -1).reverse().map(([x, y]) => [-x, y])].forEach(([x, y], i) => (i ? sh.lineTo(x * 0.018, y * 0.018) : sh.moveTo(x * 0.018, y * 0.018)));
    X.add(inked(conform(F, new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false }), thS(F, 0, y0 - 0.026, s0), y0 - 0.026, 0.008), wearMat(a === 'crest' ? UNIFORM.gold : mul(c, 0.45)), 0.002)); },
  epaulettes(X, a) { const F = X.F, c = colourOf(a, mul(X.top || UNIFORM.police, 0.5)); for (const sg of [-1, 1]) { const th = sg * 1.12; X.add(inked(plate(F, th, [[0.402, -0.030, 0.030], [0.352, -0.034, 0.034]], 0.001, 0.010, 5), wearMat(c), INK.mid)); for (const y of [0.384, 0.366]) X.add(inked(plate(F, th, [[y, -0.030, 0.030], [y - 0.008, -0.030, 0.030]], 0.010, 0.012, 5), wearMat(UNIFORM.gold), 0.0015)); } },
  // a police duty belt that rides the shell: a wide band, a buckle, a pouch and a radio at the front quarters
  dutybelt(X) { const { F, add } = X, lt = UNIFORM.leather, d = 0.013; belt(X, lt, UNIFORM.gold, d);
    for (const [th, w, y0, y1] of [[-0.82, 0.050, 0.012, 0.078], [0.82, 0.040, 0.004, 0.082]]) add(inked(conform(F, new THREE.BoxGeometry(w, y1 - y0, 0.016, 4, 6, 1).translate(0, 0, 0.008), th, (y0 + y1) / 2, d - 0.002), wearMat(mul(lt, 1.7)), INK.mid));
    add(inked(conform(F, new THREE.CylinderGeometry(0.0052, 0.0052, 0.030, 8, 3).translate(0.010, 0, 0.005), 0.82, 0.088, d - 0.007), wearMat(UNIFORM.dark), 0.003)); add(inked(plate(F, -0.82, [[0.066, -0.026, 0.026], [0.044, -0.026, 0.026]], d + 0.014, d + 0.018, 3), wearMat(mul(lt, 2.6)), 0.003)); },
  backpack(X, a) { const F = X.F, c = colourOf(a, UNIFORM.pack), dk = mul(c, 0.5);
    // straps: wide and padded over the shoulder, narrowing and turning out under the arm to the pack's foot (two straight bands read as braces), a strap across the chest
    for (const sg of [-1, 1]) { X.add(inked(plate(F, 0, sided([[neckY(F, 0.5) + 0.002, 0.066, 0.112], [0.33, 0.076, 0.124], [0.26, 0.094, 0.138], [0.20, 0.120, 0.156], [0.155, 0.150, 0.180]], sg), 0.011, 0.022, 5), wearMat(c), INK.mid)); X.add(inked(plate(F, 0, sided([[0.285, 0.082, 0.140], [0.262, 0.086, 0.144]], sg), 0.022, 0.028, 4), wearMat(UNIFORM.silver), INK.small)); }
    X.add(inked(plate(F, 0, [[0.240, -0.104, 0.104], [0.222, -0.106, 0.106]], 0.013, 0.019, 10), wearMat(dk), INK.small)); X.add(inked(plate(F, 0, [[0.246, -0.018, 0.018], [0.216, -0.018, 0.018]], 0.019, 0.026, 3), wearMat(UNIFORM.dark), INK.small));
    X.add(inked(conform(F, new THREE.BoxGeometry(0.25, 0.29, 0.10, 8, 8, 2).translate(0, 0, 0.050), PI, 0.225, 0), wearMat(c), 0.016, { shadow: true })); X.add(inked(plate(F, PI, [[0.376, -0.122, 0.122], [0.27, -0.118, 0.118], [0.252, -0.09, 0.09]], 0.101, 0.108, 8), wearMat(dk), INK.mid)); X.add(inked(plate(F, PI, [[0.205, -0.085, 0.085], [0.105, -0.085, 0.085]], 0.101, 0.118, 8), wearMat(mul(c, 0.72)), INK.mid)); },
};
