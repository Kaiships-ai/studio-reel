// Faces: every expression is drawn in code onto a per-figure canvas (1 W x 1 W, head centre in the middle, v up), as a
// pure function of (expression, blink, frame, age). Head-attached marks (sweat drop, steam, zzz, and a few quiet extras)
// are flat camera-facing cards parented to the head.
//
// The face grammar is the reference's (Ricks Clips shorts, studied frame by frame; FORENSIC.md sections 3-4):
//   - five marks and no more: two eyes, two brows, one mouth. No highlights, no colour in the eyes, no skin effects
//     except a soft blush and, rarely, small tears. Rage turns the whole head purple (tint) with steam; it never adds
//     veins or red eyes.
//   - eyes are small solid ink ovals (0.085 W wide), 0.24 W apart (v2, was 0.27), at the head's middle. The signature is the lid: a
//     thick straight stroke, longer than the eye, cutting the top off the oval (deadpan, smug, bored, angry = the same
//     eye with a different lid height and tilt). Shock opens the oval into an ink ring with a dot pupil; joy closes it
//     into a thin ^ arc. The oval -> ring change is continuous (`white`), so a face can ramp from deadpan to shock.
//   - brows are short tapered crescents (pointed ends, 0.15 W long), 0.10-0.16 W above the eye, almost always uneven.
//   - the mouth is tiny when shut (a 0.06 W dark lens, a little off-centre) and only gets big when it opens: a dark
//     lens with no tongue, a teeth grid when gritted, a crescent of teeth when grinning.
// Changes are in-betweened (mixFace): every number blends, and a change of eye or mouth kind hides inside a squeeze /
// a gasp, so each frame of a change is its own drawing (the reference redraws a face ~5 times in 12 frames).
import * as THREE from 'three';
import { css, INK_RGB } from './look.js';

const DEG = Math.PI / 180;
// Expression table. eye: oval (ink oval -> ring with `white` 1) | happy (^) | content (u, eyes shut softly) | pinch
// (> <, squeezed shut). rx, ry = eye radii (W); lid = top lid cut 0..1 (0.5 = half the eye), lidTilt = deg (+ = inner
// end lower: angry), lidA = extra lid on the figure's right eye (asymmetry), low = cheek push from below 0..1; white =
// 0 solid oval .. 1 ring eye, pupil = ring pupil radius (W), gx = gaze (-1..1, + = the figure's right), cross = pupils
// apart (+) or together (-); brow = [tilt deg (+ = inner end down), height above the eye centre (W), arch (W), lift L,
// lift R], bw = brow weight; mouth = shape (below), mw = width scale, mx / my = mouth shift (W); skin = { blush, tears }
// 0..1; marks = head-attached cards; tint = head colour (linear) for rage.
// DOT eye ~0.09 x 0.12 W on the head (Kai's reference shots 11/11)
const DOT = { eye: 'oval', rx: 0.037, ry: 0.049 }, RING = { eye: 'oval', rx: 0.056, ry: 0.062, white: 1, pupil: 0.031 };
// ring eyes v2 (Kai, gate A 2026-11-12): smaller and closer, big pupils that look somewhere (gx / cross), often one lid
// lower (lidA); every brow sits BROW_DROP lower than its table height so it is never hidden under a hat brim
const BROW_DROP = 0.03;
export const EXPR = {
  neutral: { ...DOT, brow: [0, 0.125, 0.008, 0, 0.006], mouth: 'flat', mx: 0.008 },
  calm: { ...DOT, lid: 0.34, brow: [-3, 0.120, 0.010, 0, 0.006], mouth: 'smile', mw: 0.7 },
  happy: { ...DOT, ry: 0.058, low: 0.22, brow: [-6, 0.135, 0.014, 0, 0.008], mouth: 'smile' },
  grin: { ...DOT, low: 0.10, brow: [-4, 0.135, 0.014, 0, 0.012], mouth: 'grin' },   // the reference beam: open dot eyes over the big grin
  closed: { eye: 'happy', rx: 0.048, ry: 0.050, brow: [-6, 0.130, 0.012, 0, 0.006], mouth: 'smile', skin: { blush: 0.45 } },
  smug: { ...DOT, lid: 0.50, lidTilt: -5, gx: 0.45, brow: [6, 0.112, 0.008, 0, 0.030], mouth: 'smirk', mx: 0.016 },
  sly: { ...DOT, lid: 0.56, lidTilt: 5, gx: -0.55, low: 0.2, brow: [10, 0.106, 0.002, 0.026, -0.004], mouth: 'smirk_l', mx: -0.014 },
  stern: { ...DOT, lid: 0.36, lidTilt: 12, brow: [16, 0.108, -0.004], bw: 1.2, mouth: 'frown', mw: 0.8 },
  worried: { ...DOT, ry: 0.058, lid: 0.10, brow: [-18, 0.135, 0.010, 0, 0.010], mouth: 'wobble' },
  shock: { ...RING, cross: -0.35, lidA: 0.15, brow: [-10, 0.180, 0.022, 0, 0.026], mouth: 'o' },
  sleep: { eye: 'content', rx: 0.046, ry: 0.050, brow: [0, 0.112, 0.004], mouth: 'flat', mw: 0.6, mx: 0, marks: [['zzz']] },
  // the reference's manic grin: ring eyes with dot pupils over a wide grid of teeth (rail "anyone"). No red, no veins.
  manic: { ...RING, rx: 0.058, ry: 0.066, pupil: 0.030, cross: -0.3, lidA: 0.48, lidTilt: -8, brow: [-4, 0.180, 0.026, 0, -0.012], mouth: 'teeth_grin', mw: 1.25, mx: 0.012 },
  panic: { ...RING, ry: 0.066, pupil: 0.027, gx: -0.7, brow: [-24, 0.180, 0.010, 0, 0.018], mouth: 'wavy', marks: [['sweat']] },
  blush: { eye: 'happy', rx: 0.048, ry: 0.050, brow: [-10, 0.130, 0.014], mouth: 'smile', mw: 0.7, skin: { blush: 1 } },
  angry: { ...DOT, lid: 0.40, lidTilt: 22, brow: [26, 0.098, -0.008], bw: 1.45, mouth: 'teeth' },
  // rage (rail "purple."): the head goes purple, steam puffs, the mouth a dark bar; the eyes stay ink
  furious: { ...DOT, lid: 0.40, lidTilt: 26, brow: [30, 0.094, -0.010], bw: 1.6, mouth: 'bar', tint: [0.20, 0.06, 0.48], marks: [['steam']] },
  nervous: { ...DOT, lid: 0.08, gx: 0.5, brow: [-14, 0.135, 0.010, 0, 0.012], mouth: 'teeth_grin', mw: 0.8, marks: [['sweat']] },
  sad: { ...DOT, lid: 0.30, lidTilt: -14, brow: [-22, 0.125, 0.008], mouth: 'frown', mw: 0.85 },
  cry: { eye: 'pinch', rx: 0.050, ry: 0.050, brow: [-24, 0.125, 0.006], mouth: 'wail', skin: { tears: 1 } },
  dizzy: { ...RING, pupil: 0.027, cross: 0.9, lidA: 0.18, brow: [-6, 0.175, 0.016, 0, 0.030], mouth: 'wobble' },
  confused: { ...DOT, gx: 0.3, brow: [0, 0.122, 0.008, -0.016, 0.040], mouth: 'skew', mx: 0.012 },
  excited: { ...RING, rx: 0.060, ry: 0.066, pupil: 0.031, cross: -0.25, brow: [-12, 0.190, 0.024, 0, 0.014], mouth: 'big' },
  deadpan: { ...DOT, lid: 0.55, brow: [0, 0.104, 0, 0, 0.008], mouth: 'flat', mw: 0.85, mx: 0.012 },
  suspicious: { ...DOT, lid: 0.55, lidTilt: 8, gx: 0.6, low: 0.3, brow: [14, 0.100, -0.004, -0.018, 0.024], mouth: 'flat', mw: 0.7, mx: 0.016 },
  scream: { ...RING, rx: 0.062, ry: 0.072, pupil: 0.024, cross: -0.2, brow: [-26, 0.195, 0.018, 0, 0.012], mouth: 'scream', marks: [['sweat']] },
  pain: { eye: 'pinch', rx: 0.050, ry: 0.050, brow: [-20, 0.118, 0], bw: 1.2, mouth: 'teeth', mw: 1.05, marks: [['sweat']] },
  proud: { eye: 'happy', rx: 0.048, ry: 0.050, brow: [-12, 0.140, 0.016, 0, 0.008], mouth: 'grin', mw: 0.95 },
  disgust: { ...DOT, lid: 0.40, lidTilt: 10, lidA: 0.12, low: 0.45, brow: [18, 0.108, 0, 0.020, -0.020], mouth: 'sneer', mw: 0.9 },
  // added in the reference pass (new names; every name above still works)
  laugh: { eye: 'happy', rx: 0.050, ry: 0.052, brow: [-8, 0.140, 0.014, 0, 0.010], mouth: 'big_open', skin: { blush: 0.35 } },
  skeptic: { ...DOT, lid: 0.42, lidA: 0.14, gx: 0.25, brow: [8, 0.108, 0.004, -0.010, 0.050], mouth: 'flat', mw: 0.75, mx: 0.018 },
  bored: { ...DOT, lid: 0.62, lidTilt: -6, brow: [-4, 0.110, 0.004], mouth: 'flat', mw: 0.6, mx: 0.010 },
};
// open-mouth twins (`<expr>_o`) are shown while a word is being said: each mouth opens in its own way
const OPEN = { flat: 'open', smile: 'open', grin: 'open_big', smirk: 'open_skew', smirk_l: 'open_skew', frown: 'open_frown', wobble: 'open_frown',
  o: 'o_big', wavy: 'scream_small', teeth: 'teeth_open', teeth_grin: 'teeth_open', bar: 'teeth_open', sad_open: 'wail', wail: 'wail',
  skew: 'open_skew', big: 'big_open', big_open: 'big_open', scream: 'scream', sneer: 'open_frown' };
for (const k of Object.keys(EXPR)) EXPR[k + '_o'] = { ...EXPR[k], mouth: OPEN[EXPR[k].mouth] || 'open', base: k };
EXPR.sleep_o = { ...EXPR.sleep, mouth: 'o', mw: 0.6, base: 'sleep' };
// wide-open twins (`<expr>_O`): the loud syllable and the middle of an expression ramp (FORENSIC.md fix 8: reference mouth
// area swings, CV 0.33-0.56). Bigger in width and drawn lower so the dark shape grows.
for (const k of Object.keys(EXPR)) if (!k.endsWith('_o') && !k.endsWith('_O')) EXPR[k + '_O'] = { ...EXPR[k + '_o'], mw: 1.35 * (EXPR[k].mw || 1), my: (EXPR[k].my || 0) - 0.010, base: k };
export const EXPR_NAMES = Object.keys(EXPR).filter(k => !k.endsWith('_o'));
export const baseExpr = e => (e && EXPR[e]?.base) || e;

// ------------------------------------------------------------------ drawing (W units, v up, origin = head centre)
function bez(p0, p1, p2, p3, n = 16) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
    o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return o;
}
const INK = css(INK_RGB), WHITE = 'rgb(250,250,247)', TEAR = 'rgba(150,205,240,0.95)';
const LW = 0.021;                                                                          // feature line weight (W)
function path(g, pts, close = false) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); if (close) g.closePath(); }
function line(g, pts, w = LW, col = INK) { g.strokeStyle = col; g.lineWidth = w; path(g, pts); g.stroke(); }
function fill(g, pts, col = INK, ink = 0) { path(g, pts, true); g.fillStyle = col; g.fill(); if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); } }
// a tapered stroke: a centreline with a thickness that goes to a point at both ends (smiles, frowns, shut eyes)
function taper(g, pts, th, col = INK, end = 0.18) {
  const n = pts.length - 1, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y] = pts[i], [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(n, i + 1)];
    let nx = -(by - ay), ny = bx - ax; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const w = th * (end + (1 - end) * Math.sin(Math.PI * t) ** 0.55);
    top.push([x + nx * w, y + ny * w]); bot.push([x - nx * w, y - ny * w]);
  }
  fill(g, [...top, ...bot.reverse()], col);
}
// an open mouth (Kai's reference shots, 11/11): an ink rim round a dark red cavity with a pink tongue low in it, never a
// flat black hole (measured: rim ~sRGB 87/47/53, inside 180/88/106)
const CAVITY = 'rgb(122,38,52)', TONGUE = 'rgb(214,112,128)';
function cav(g, pts, rim = 0.011) {
  path(g, pts, true); g.fillStyle = CAVITY; g.fill();
  let lo = Infinity, hi = -Infinity, lx = Infinity, rx = -Infinity;
  for (const [x, y] of pts) { lo = Math.min(lo, y); hi = Math.max(hi, y); lx = Math.min(lx, x); rx = Math.max(rx, x); }
  g.save(); path(g, pts, true); g.clip();
  g.beginPath(); g.ellipse((lx + rx) / 2, lo + (hi - lo) * 0.05, (rx - lx) * 0.42, (hi - lo) * 0.42, 0, 0, Math.PI * 2); g.fillStyle = TONGUE; g.fill();
  g.restore();
  path(g, pts, true); g.lineWidth = rim; g.strokeStyle = INK; g.stroke();
}
const ellPts = (cx, cy, rx, ry, n = 28) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const rrect = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };

// brow: a short crescent, pointed at both ends, thickest a little inside the middle (inner end heavier when angry)
function brow(g, ex, s, by, tilt, arch, bw = 1) {
  const len = 0.072 + 0.006 * (bw - 1), a = tilt * DEG * s, c = Math.cos(a), sn = Math.sin(a), pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, x = -len + 2 * len * t, y = arch * (1 - (2 * t - 1) ** 2);
    pts.push([ex + s * 0.006 + x * c - y * sn, by + x * sn + y * c]);
  }
  if (s < 0) pts.reverse();                                                                 // t 0 = inner end on both sides
  const n = pts.length - 1, top = [], bot = [], th = 0.025 * bw;   // reference brow ~0.03-0.035 W thick (Kai's reference shots)
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y] = pts[i], [ax, ay] = pts[Math.max(0, i - 1)], [bx, by2] = pts[Math.min(n, i + 1)];
    let nx = -(by2 - ay), ny = bx - ax; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const heavy = 1 + 0.35 * Math.max(0, bw - 1) * (1 - t);                                 // the inner end carries the weight
    const w = th * heavy * (0.22 + 0.78 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)) ** 0.6);
    top.push([x + nx * w, y + ny * w]); bot.push([x - nx * w, y - ny * w]);
  }
  fill(g, [...top, ...bot.reverse()]);
}

function eye(g, F, ex, s, ey, blink, rim = false) {
  const kind = F.eye, rx = F.rx, ry = F.ry;
  if (kind === 'happy') {                                                                  // ^: a thin arc, the eye smiling shut
    const w = rx * 1.12, h = ry * 0.62;
    taper(g, bez([ex - w, ey - h * 0.45], [ex - w * 0.55, ey + h * 0.95], [ex + w * 0.55, ey + h * 0.95], [ex + w, ey - h * 0.45], 14), 0.0115, INK, 0.45);
    return;
  }
  if (kind === 'content') {                                                                // u: shut softly (sleep, bliss)
    const w = rx * 1.1, h = ry * 0.32;
    taper(g, bez([ex - w, ey + h * 0.2], [ex - w * 0.5, ey - h * 1.4], [ex + w * 0.5, ey - h * 1.4], [ex + w, ey + h * 0.2], 14), 0.011, INK, 0.45);
    return;
  }
  if (kind === 'pinch') {                                                                  // > <: squeezed shut, pointing inward
    const w = rx * 0.95, h = ry * 0.62;
    line(g, [[ex + s * w, ey + h], [ex - s * w * 0.85, ey + 0.004], [ex + s * w, ey - h]], 0.019);
    return;
  }
  // oval / ring. The lid line cuts the top; blink 1 drops it to 0.65, blink 2 closes the eye to a short stroke.
  let lid = Math.max(0, (F.lid || 0) + (s > 0 ? F.lidA || 0 : 0));
  if (blink === 1) lid = Math.max(lid, 0.65);
  const slope = Math.tan((F.lidTilt || 0) * DEG) * s, L = rx * 1.5;
  if (blink === 2 || lid >= 0.96) {
    const y = ey - ry * 0.18;
    taper(g, [[ex - L * 0.95, y + (-L * 0.95) * slope], [ex, y - 0.004], [ex + L * 0.95, y + (L * 0.95) * slope]], 0.0115, INK, 0.5);
    return;
  }
  const top = ey + ry * (1 - 2 * lid), lowK = F.low || 0, white = Math.max(0, Math.min(1, F.white || 0));
  const st = 0.022, look = (F.gx || 0) + (F.cross || 0) * s;
  const ox = look * rx * 0.30 * (1 - white), oy = (F.gy || 0) * ry * 0.30 * (1 - white);  // a dot eye slides under its lid
  const cheekY = ey - ry - ry * 0.9 + lowK * ry * 0.75;
  g.save();
  if (lid > 0.001) { g.beginPath(); g.moveTo(ex - 0.3, top - 0.3 * slope); g.lineTo(ex + 0.3, top + 0.3 * slope); g.lineTo(ex + 0.3, ey - 0.3); g.lineTo(ex - 0.3, ey - 0.3); g.closePath(); g.clip(); }
  if (lowK > 0.01) { g.beginPath(); g.rect(ex - 0.3, ey - 0.3, 0.6, 0.6); g.ellipse(ex, cheekY, rx * 1.9, ry * 0.9, 0, 0, Math.PI * 2); g.clip('evenodd'); }
  if (rim) {                                                                              // in glasses the rim is the ring:
    const pr = Math.max(F.pupil ?? 0.02, 0.026), ax = rx + (pr - rx) * white, ay = ry + (pr * 1.08 - ry) * white;   // the oval
    const room = Math.max(0, rx * 1.15 - ax);                                              // shrinks to a pupil, no white
    g.beginPath(); g.ellipse(ex + ox + look * room * 0.8 * white, ey - 0.003 * white, ax, ay, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  } else { g.beginPath(); g.ellipse(ex + ox, ey + oy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
  if (white > 0.01 && !rim) {
    const ix = Math.max(0.001, (rx - st) * white), iy = Math.max(0.001, (ry - st) * white), p0 = F.pupil ?? 0.02;
    g.beginPath(); g.ellipse(ex + ox, ey, ix, iy, 0, 0, Math.PI * 2); g.fillStyle = WHITE; g.fill();
    const pr = p0 + (Math.min(rx, ry) - st - p0) * (1 - white), room = Math.max(0, rx - st - pr - 0.004);
    g.beginPath(); g.ellipse(ex + ox + look * room * 0.8, ey - 0.003 + (F.gy || 0) * room * 0.8, pr, pr * 1.08, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  }
  g.restore();
  // the lid: a thick straight stroke, longer than the eye (fades in from nothing so a ramp has no pop)
  const k = Math.min(1, lid / (0.12 + 0.25 * white));                                     // (a ring eye drops its lid faster)
  if (k > 0.02) line(g, [[ex - L, top - L * slope], [ex + L, top + L * slope]], LW * (0.4 + 0.6 * k));
  if (lowK >= 0.4) taper(g, Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.30 + 0.40 * i / 8); return [ex + rx * 1.1 * Math.cos(a), cheekY + ry * 0.9 * Math.sin(a)]; }), 0.007, INK, 0.4);
}

// Mouth shapes, centred at (x0, y0). Shut mouths are small; open ones are a dark lens with no tongue.
function mouth(g, kind, mw = 1, x0 = 0, y0 = -0.15) {
  mw *= 1.22;                                                                              // the reference mouth reads from across the room
  const X = x => x0 + x * mw, y = y0;
  const lens = (w, h, c = 0, top = 0.006) => [...bez([X(-w), y + c], [X(-w * 0.45), y + top], [X(w * 0.45), y + top], [X(w), y + c], 12),
    ...bez([X(w), y + c], [X(w * 0.62), y - h * 1.3], [X(-w * 0.62), y - h * 1.3], [X(-w), y + c], 14)];
  const teethBand = (pts, yTop, h) => { g.save(); path(g, pts, true); g.clip(); g.fillStyle = WHITE; g.fillRect(x0 - 0.3, yTop - h, 0.6, h); g.restore(); };
  switch (kind) {
    case 'flat': {                                                                         // a small dark lens, a little tilted
      const w = 0.040, a = -6 * DEG, rot = ([px, py]) => [x0 + (px - x0) * Math.cos(a) - (py - y) * Math.sin(a), y + (px - x0) * Math.sin(a) + (py - y) * Math.cos(a)];
      fill(g, [...bez([X(-w), y], [X(-w * 0.4), y + 0.006], [X(w * 0.4), y + 0.008], [X(w), y + 0.002], 10),
        ...bez([X(w), y + 0.002], [X(w * 0.5), y - 0.024], [X(-w * 0.5), y - 0.024], [X(-w), y], 10)].map(rot)); break;
    }
    case 'smile': taper(g, bez([X(-0.072), y + 0.020], [X(-0.030), y - 0.026], [X(0.030), y - 0.026], [X(0.072), y + 0.020], 16), 0.0135); break;   // ref closed smile ~0.22 W wide
    case 'smirk': taper(g, bez([X(-0.036), y - 0.002], [X(-0.006), y - 0.012], [X(0.024), y - 0.010], [X(0.044), y + 0.018], 16), 0.0125); break;
    case 'smirk_l': taper(g, bez([X(0.036), y - 0.002], [X(0.006), y - 0.012], [X(-0.024), y - 0.010], [X(-0.044), y + 0.018], 16), 0.0125); break;
    case 'frown': taper(g, bez([X(-0.036), y - 0.012], [X(-0.014), y + 0.012], [X(0.014), y + 0.012], [X(0.036), y - 0.012], 16), 0.0125); break;
    case 'sneer': taper(g, bez([X(-0.038), y - 0.014], [X(-0.012), y + 0.004], [X(0.014), y + 0.014], [X(0.040), y + 0.004], 16), 0.0125); break;
    case 'wobble': taper(g, bez([X(-0.040), y - 0.002], [X(-0.016), y + 0.018], [X(0.010), y - 0.018], [X(0.040), y + 0.004], 18), 0.0115); break;
    case 'skew': taper(g, bez([X(-0.034), y + 0.008], [X(-0.010), y + 0.004], [X(0.014), y - 0.006], [X(0.038), y - 0.014], 14), 0.012); break;
    case 'wavy': { const pts = []; for (let i = 0; i <= 28; i++) { const u = i / 28; pts.push([X(-0.072 + 0.144 * u), y + 0.010 * Math.sin(u * 5 * Math.PI)]); } line(g, pts, 0.013); break; }
    case 'o': cav(g, ellPts(x0, y - 0.010, 0.026 * mw, 0.034)); break;
    case 'o_big': cav(g, ellPts(x0, y - 0.012, 0.030 * mw, 0.040)); break;
    case 'bar': { const w = 0.068 * mw, h = 0.034; rrect(g, x0 - w, y - h, 2 * w, h, 0.012); g.fillStyle = INK; g.fill(); break; }   // rage
    case 'teeth': {                                                                        // gritted: a white grid, ink outline
      const w = 0.092 * mw, h = 0.070, top = y + 0.014;
      rrect(g, x0 - w, top - h, 2 * w, h, 0.012); g.fillStyle = WHITE; g.fill(); g.lineWidth = 0.016; g.strokeStyle = INK; g.stroke();
      line(g, [[x0 - w, top - h / 2], [x0 + w, top - h / 2]], 0.010);
      for (let i = 1; i < 6; i++) { const x = x0 - w + 2 * w * i / 6; line(g, [[x, top], [x, top - h]], 0.010); }
      break;
    }
    case 'teeth_grin': {                                                                   // wide crescent of teeth (manic, nervous)
      const w = 0.130 * mw, pts = [...bez([X(-0.130), y + 0.034], [X(-0.052), y + 0.004], [X(0.052), y + 0.004], [X(0.130), y + 0.034], 14),
        ...bez([X(0.130), y + 0.034], [X(0.088), y - 0.080], [X(-0.088), y - 0.080], [X(-0.130), y + 0.034], 16)];
      fill(g, pts, WHITE, 0.016);
      g.save(); path(g, pts, true); g.clip();
      line(g, bez([X(-0.130), y + 0.016], [X(-0.052), y - 0.020], [X(0.052), y - 0.020], [X(0.130), y + 0.016], 12), 0.009);
      for (let i = 1; i < 6; i++) { const x = x0 - w + 2 * w * i / 6; line(g, [[x, y + 0.03], [x, y - 0.06]], 0.009); }
      g.restore(); break;
    }
    case 'grin': {                                                                         // the reference grin (QlDPM f180): a wide ink
      // crescent ~0.46 W across, its top edge curling up at the corners, a white row of top teeth with ink gaps filling the
      // upper part and a dark band below; the ink rim is the line weight
      const w = 0.165, pts = [...bez([X(-w), y + 0.040], [X(-w * 0.42), y + 0.002], [X(w * 0.42), y + 0.002], [X(w), y + 0.040], 18),
        ...bez([X(w), y + 0.040], [X(w * 0.62), y - 0.080], [X(-w * 0.62), y - 0.080], [X(-w), y + 0.040], 20)];
      fill(g, pts);
      g.save(); path(g, pts, true); g.clip();
      const tb = bez([X(-w), y + 0.018], [X(-w * 0.42), y - 0.022], [X(w * 0.42), y - 0.022], [X(w), y + 0.018], 18);
      fill(g, [...bez([X(-w), y + 0.050], [X(-w * 0.42), y + 0.012], [X(w * 0.42), y + 0.012], [X(w), y + 0.050], 18), ...tb.slice().reverse()], WHITE);
      for (let i = -3; i <= 3; i++) { const x = X(i * 0.034); line(g, [[x, y + 0.04], [x, y - 0.03]], 0.0085); }
      g.restore(); fill(g, pts, 'rgba(0,0,0,0)', 0.014); break;
    }
    case 'big': case 'big_open': case 'open_big': {                                        // laughing: dark crescent, top teeth
      const h = kind === 'big' ? 0.066 : kind === 'open_big' ? 0.072 : 0.092, w = 0.118;   // ref laugh ~0.36 W wide
      const pts = [...bez([X(-w), y + 0.016], [X(-w * 0.45), y + 0.004], [X(w * 0.45), y + 0.004], [X(w), y + 0.016], 14),
        ...bez([X(w), y + 0.016], [X(w * 0.62), y - h * 1.25], [X(-w * 0.62), y - h * 1.25], [X(-w), y + 0.016], 16)];
      cav(g, pts); teethBand(pts, y + 0.016, 0.022); path(g, pts, true); g.lineWidth = 0.011; g.strokeStyle = INK; g.stroke(); break;
    }
    case 'open': cav(g, lens(0.040, 0.032)); break;
    case 'open_skew': cav(g, lens(0.040, 0.030, 0, 0.004).map(([px, py]) => [px, py + (px - x0) * 0.22])); break;
    case 'open_frown': cav(g, lens(0.036, 0.022, -0.010, 0.010)); break;
    case 'sad_open': cav(g, lens(0.034, 0.020, -0.012, 0.012)); break;
    case 'wail': cav(g, lens(0.050, 0.046, -0.014, 0.014)); break;
    case 'teeth_open': { const pts = lens(0.058, 0.048, 0.004); cav(g, pts); teethBand(pts, y + 0.012, 0.018); path(g, pts, true); g.lineWidth = 0.011; g.strokeStyle = INK; g.stroke(); break; }
    case 'scream': case 'scream_small': {                                                  // tall dark oval, top teeth
      const k = kind === 'scream' ? 1 : 0.72, w = 0.044 * k * mw, h = 0.086 * k, cy = y - 0.022 * k;
      const pts = Array.from({ length: 32 }, (_, i) => { const a = 2 * Math.PI * i / 32; return [x0 + w * Math.cos(a), cy + h * 0.5 * Math.sin(a) * (Math.sin(a) > 0 ? 0.8 : 1)]; });
      cav(g, pts); teethBand(pts, cy + h * 0.4, 0.016); path(g, pts, true); g.lineWidth = 0.011; g.strokeStyle = INK; g.stroke(); break;
    }
    default: fill(g, lens(0.030, 0.010));
  }
}

// paint on the skin: only a soft blush and small tears (the reference never paints veins, sockets or gloom lines)
function skin(g, S, ey, dx, t) {
  if (S.blush > 0.03) for (const s of [-1, 1]) {
    const cx = s * (dx + 0.065), cy = ey - 0.080, gr = g.createRadialGradient(cx, cy, 0.004, cx, cy, 0.058);
    gr.addColorStop(0, `rgba(240,140,150,${0.55 * Math.min(1, S.blush)})`); gr.addColorStop(1, 'rgba(240,140,150,0)');
    g.save(); g.translate(cx, cy); g.scale(1, 0.55); g.translate(-cx, -cy);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 0.058, 0, Math.PI * 2); g.fill(); g.restore();
  }
  if (S.tears > 0.03) for (const s of [-1, 1]) {                                           // one small drop per eye, running down
    g.save(); g.globalAlpha = Math.min(1, S.tears);
    const ph = (((t || 0) + (s > 0 ? 7 : 0)) % 18) / 18, x = s * (dx + 0.040), yy = ey - 0.045 - 0.10 * ph, r = 0.013;
    const drop = [...bez([x, yy + r * 2.2], [x + r * 0.4, yy + r * 1.2], [x + r * 1.1, yy + r * 0.4], [x + r, yy], 8),
      ...bez([x + r, yy], [x + r, yy - r * 1.3], [x - r, yy - r * 1.3], [x - r, yy], 8), ...bez([x - r, yy], [x - r * 1.1, yy + r * 0.4], [x - r * 0.4, yy + r * 1.2], [x, yy + r * 2.2], 8)];
    fill(g, drop, TEAR, 0.006); g.restore();
  }
}

// ------------------------------------------------------------------ continuous faces (micro-animation layer)
// A face is a set of numbers (eye radii, lid, lid tilt, cheek push, white, pupil, gaze, brow tilt / height / arch / lifts,
// brow weight, mouth width / shift, skin alphas) plus two discrete picks (eye kind, mouth kind). Between two expressions
// every number is in-betweened, so each frame of a change is its own drawing (FORENSIC.md section 3: the reference redraws a
// face 5 times in 12 frames). The ink oval opens into a ring continuously (deadpan -> shock is one morph); a discrete pick
// that differs is hidden inside an in-between: the eyes squeeze shut and the mouth passes through an open gasp at the
// swap. Talking draws a parametric mouth from visemes (acting.js) with a real open / close range.
const CURVE = { smile: 1, grin: 1, big: 1, big_open: 1, open_big: 0.8, teeth_grin: 1, smirk: 0.5, smirk_l: 0.5, frown: -1, wobble: -0.6,
  sad_open: -1, wail: -1, wavy: -0.4, open_frown: -0.8, skew: 0.2, sneer: -0.6 };
const REST_OPEN = { o: 0.40, o_big: 0.55, grin: 0.2, big: 0.55, big_open: 0.8, open_big: 0.55, scream: 1, scream_small: 0.7, teeth: 0.2,
  teeth_grin: 0.25, teeth_open: 0.55, sad_open: 0.3, wail: 0.7, open: 0.35, open_skew: 0.35, open_frown: 0.25, bar: 0.15 };
const ROUND = { o: 1, o_big: 1, scream: 0.6, scream_small: 0.6, sleep: 0.5 };
const NUM = ['rx', 'ry', 'lid', 'lidTilt', 'lidA', 'low', 'white', 'pupil', 'gx', 'cross', 'bw', 'mw', 'mx', 'my', 'curve', 'rest', 'round'];
const GAZE = new Set(['gx', 'cross']);
export const GAZE_ARC = { k: 0.45 };   // how far a pupil crossing the eye dips at the middle of its move (share of its room)
export function faceParams(name) {
  const E = EXPR[name] || EXPR.neutral, S = E.skin || {}, [bt, bh0, ba = 0, bl = 0, br = 0] = E.brow, bh = bh0 - BROW_DROP;
  return { eye: E.eye, rx: E.rx, ry: E.ry, lid: E.lid || 0, lidTilt: E.lidTilt || 0, lidA: E.lidA || 0, low: E.low || 0,
    white: E.white || 0, pupil: E.pupil ?? 0.020, gx: E.gx || 0, cross: E.cross || 0, brow: [bt, bh, ba, bl, br], bw: E.bw || 1,
    mouth: E.mouth, mw: E.mw || 1, mx: E.mx || 0, my: E.my || 0, curve: CURVE[E.mouth] || 0, rest: REST_OPEN[E.mouth] || 0,
    round: ROUND[E.mouth] || 0,
    // veins / socket / gloom stay in the shape for older callers; the reference grammar never paints them
    skin: { blush: S.blush || 0, veins: 0, tears: S.tears || 0, socket: 0, gloom: 0 } };
}
const LIDDED = new Set(['oval']);
// st = { a, b (expression names), u (0..1, may overshoot a little), life ({brow, tilt, lid, mw}: hold drift), talk ({open,
// wide, round, teeth} or null), gasp (0..1 extra open in a change) }. Returns the drawable face and the blink it forces.
export function mixFace(st) {
  const A = faceParams(st.a), B = faceParams(st.b ?? st.a), u = st.u ?? 1, uc = Math.max(0, Math.min(1, u)), L = st.life || {};
  const m = (x, y) => x + (y - x) * u, F = { ...B };
  // the eyes move on their own clock (st.ug, a 3-frame saccade) and along an arc, not a straight line: a pupil crossing
  // from one side to the other dips a little at the middle, as an eyeball rolls (asset 2.6)
  const ug = st.ug ?? u, mg = (x, y) => x + (y - x) * ug;
  for (const k of NUM) F[k] = GAZE.has(k) ? mg(A[k], B[k]) : m(A[k], B[k]);
  F.gy = -GAZE_ARC.k * Math.min(1, Math.abs(B.gx - A.gx) + 0.5 * Math.abs(B.cross - A.cross)) * Math.sin(Math.PI * Math.max(0, Math.min(1, ug)));
  F.white = Math.max(0, Math.min(1, F.white)); F.bw = Math.max(0.6, F.bw);
  F.brow = A.brow.map((x, i) => m(x, B.brow[i]));
  F.skin = Object.fromEntries(Object.keys(A.skin).map(k => [k, Math.max(0, Math.min(1, A.skin[k] + (B.skin[k] - A.skin[k]) * uc))]));
  F.eye = uc < 0.5 ? A.eye : B.eye; F.mouth = uc < 0.5 ? A.mouth : B.mouth;
  F.lid = Math.max(0, Math.min(0.9, F.lid + (LIDDED.has(F.eye) ? (L.lid || 0) * (1 - F.white) : 0)));   // a ring eye has no idle lid drift: on a ring it draws a ruler line
  F.ry = Math.max(0.02, F.ry); F.rx = Math.max(0.02, F.rx); F.pupil = Math.max(0.008, F.pupil);
  F.brow[0] += L.tilt || 0; F.brow[1] += L.brow || 0; F.mw *= 1 + (L.mw || 0);
  // the hidden swaps: eyes squeeze through a change of eye kind, the mouth passes through an open gasp
  let blink = 0;
  if (A.eye !== B.eye) { const c = Math.sin(Math.PI * uc) ** 2; blink = c > 0.8 ? 2 : c > 0.35 ? 1 : 0; }
  else if (LIDDED.has(F.eye)) F.lid = Math.min(0.9, F.lid + 0.30 * Math.sin(Math.PI * uc) * (A.lid !== B.lid || A.ry !== B.ry || A.white !== B.white ? 1 : 0.4) * (uc < 1 ? 1 : 0) * (1 - 0.85 * F.white));
  const gasp = (st.gasp || 0) + (A.mouth !== B.mouth && !st.talk ? 0.5 * Math.sin(Math.PI * uc) : 0);
  if (st.talk) {
    const v = st.talk, any = v.open > 0.04 ? 1 : 0;
    F.talk = { open: Math.min(1.1, v.open * (1 + 0.3 * F.rest) + 0.22 * F.rest * any + gasp * 0.3), wide: v.wide ?? 0, round: Math.max(v.round ?? 0, F.round * 0.6), teeth: v.teeth ?? 0 };
  } else if (gasp > 0.12) F.talk = { open: Math.max(F.rest, gasp), wide: 0.2, round: F.round, teeth: 0 };
  return { F, blink };
}

// a parametric open mouth (the reference's talking mouth): a dark lens, flat-ish top, round bottom, width from wide /
// round, depth from open, corners from the expression's curve; a strip of top teeth once it is well open. No tongue.
// Closed (open < 0.06): the expression's own mouth shape.
function vmouth(g, F, x0, y0) {
  const T = F.talk, mw = F.mw;
  if (T.open < 0.06) { mouth(g, F.mouth, mw, x0, y0); return; }
  const y = y0 + 0.008, w = 0.064 * mw * (1 + 0.40 * T.wide - 0.38 * T.round) + 0.018 * T.open, h = 0.012 + 0.085 * T.open, c = 0.012 * F.curve * (1 - 0.5 * T.round);
  const lip = 0.004 + 0.25 * h * T.round;
  const top = bez([x0 - w, y + c], [x0 - w * 0.45, y + lip], [x0 + w * 0.45, y + lip], [x0 + w, y + c], 14);
  const bot = bez([x0 + w, y + c], [x0 + w * 0.62, y - h * 1.3 + 0.3 * c], [x0 - w * 0.62, y - h * 1.3 + 0.3 * c], [x0 - w, y + c], 16);
  const pts = [...top, ...bot];
  if (T.open > 0.22) cav(g, pts); else fill(g, pts);                                       // barely open: a dark slit; open: the cavity
  g.save(); path(g, pts, true); g.clip();
  if (T.round < 0.6 && T.open > 0.30) { g.fillStyle = WHITE; g.fillRect(x0 - w, y + lip - 0.016 - 0.006 * T.teeth, 2 * w, 0.02); }
  if (T.teeth > 0.3) { g.fillStyle = WHITE; g.fillRect(x0 - w, y - h * 1.0, 2 * w, 0.014); }
  g.restore();
}

// Feature layout (final W units, head centre): eyes 0.31 W apart at the middle, brows ~0.15 W above them, mouth 0.175 W
// below. K scales every feature drawing (sizes and line weights in the table above are at K = 1): the reference's marks
// are big and bold (an eye is 0.10-0.12 W wide, a lid stroke 0.03 W thick), which is also what still reads on a phone.
// o.glasses: the eyes sit in the rim centres (cast.js glasses(): +-0.15, 0.02, radius 0.112), ring eyes shrink to fit
// inside, the brows clear the rims and the mouth drops a little; the expression still reads through brows and mouth.
export const LAYOUT = { K: 1.25, ey: 0.0, dx: 0.118, my: -0.175, glasses: { K: 1.12, ey: 0.02, dx: 0.150, my: -0.185, maxR: 0.086, browMin: 0.165 } };
export function drawFaceState(g, F, blink = 0, t = 0, o = {}) {
  const Lo = o.glasses ? LAYOUT.glasses : LAYOUT, K = Lo.K, ey = Lo.ey / K, dx = Lo.dx / K;
  g.save(); g.scale(K, K);
  g.lineCap = g.lineJoin = 'round';
  skin(g, F.skin, ey, dx, t);
  let Fe = F;
  if (Lo.maxR) { const k = Math.min(1, Lo.maxR / K / Math.max(F.rx, F.ry)); if (k < 1) Fe = { ...F, rx: F.rx * k, ry: F.ry * k, pupil: F.pupil * Math.max(0.8, k) }; }
  const [tilt, bh0, arch = 0, liftL = 0, liftR = 0] = F.brow, bh = Lo.browMin ? Math.max(bh0, Lo.browMin / K) + 0.004 : bh0;
  for (const s of [-1, 1]) {
    const ex = s * dx;
    eye(g, Fe, ex, s, ey, blink, !!o.glasses);
    const by = ey + bh - (blink === 2 ? 0.008 : 0) + (s < 0 ? liftL : liftR);
    brow(g, ex, s, by, tilt, arch, F.bw || 1);
  }
  const y0 = Lo.my / K + (F.my || 0), x0 = F.mx || 0;
  if (F.talk) vmouth(g, F, x0, y0); else mouth(g, F.mouth, F.mw, x0, y0);
  g.restore();
}
export function drawFace(g, expr, blink = 0, t = 0, o = {}) { drawFaceState(g, faceParams(expr), blink, t, o); }

// ------------------------------------------------------------------ head-attached marks (flat cards, quiet ink style)
// The reference uses few: one sweat drop, white steam puffs on rage, Z's for sleep. The rest stay available for films
// that ask for them by name, drawn in the same ink-and-white as the captions (no red, no yellow, no emoji colours).
const MARK_PX = 256;
const markTex = {};
function cardTex(kind) {
  if (markTex[kind]) return markTex[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = MARK_PX; const g = cv.getContext('2d');
  g.translate(MARK_PX / 2, MARK_PX / 2); g.scale(MARK_PX / 2, -MARK_PX / 2); g.lineCap = g.lineJoin = 'round';   // -1..1, y up
  const ink = (pts, fillc, w = 0.09) => { path(g, pts, true); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); g.fillStyle = fillc; g.fill(); };
  if (kind === 'sweat') {
    const drop = [...bez([0, 0.9], [0.15, 0.55], [0.55, 0.15], [0.5, -0.25], 12), ...bez([0.5, -0.25], [0.45, -0.85], [-0.45, -0.85], [-0.5, -0.25], 12), ...bez([-0.5, -0.25], [-0.55, 0.15], [-0.15, 0.55], [0, 0.9], 12)];
    ink(drop, 'rgb(170,215,245)', 0.08);
  } else if (kind === 'anger') {                                                         // four ink hooks, no red
    for (let q = 0; q < 4; q++) {
      g.save(); g.rotate(q * Math.PI / 2 + Math.PI / 4);
      g.lineWidth = 0.13; g.strokeStyle = INK; path(g, bez([0.18, 0.18], [0.22, 0.5], [0.55, 0.6], [0.72, 0.32], 10)); g.stroke(); g.restore();
    }
  } else if (kind === 'sparkle' || kind === 'star') {
    const st = [], n = kind === 'star' ? 5 : 4;
    for (let i = 0; i < 2 * n; i++) { const a = Math.PI / n * i + Math.PI / 2, r = i % 2 ? (kind === 'star' ? 0.38 : 0.2) : 0.8; st.push([r * Math.cos(a), r * Math.sin(a)]); }
    ink(st, WHITE, 0.08);
  } else if (kind === 'question' || kind === 'exclaim' || kind === 'zzz') {
    g.save(); g.scale(1, -1);
    g.font = `900 ${kind === 'zzz' ? 0.9 : 1.6}px InterReel, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = kind === 'question' ? '?' : kind === 'exclaim' ? '!' : 'Z';
    g.lineWidth = 0.2; g.strokeStyle = INK; g.strokeText(txt, 0, 0.05); g.fillStyle = WHITE; g.fillText(txt, 0, 0.05); g.restore();
  } else if (kind === 'steam') {                                                         // white puffs, a thin grey edge
    const puffs = [[0, 0, 0.42], [-0.38, -0.18, 0.3], [0.36, -0.2, 0.32], [0.1, 0.4, 0.3]];
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r + 0.035, 0, 2 * Math.PI); g.fillStyle = 'rgb(150,150,160)'; g.fill(); }
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fillStyle = 'rgb(250,250,252)'; g.fill(); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (markTex[kind] = t);
}
const PLANE = new THREE.PlaneGeometry(1, 1);
function card(kind) {
  const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: cardTex(kind), transparent: true, depthWrite: false, alphaTest: 0.02 }));
  m.userData.noPrepass = true; m.renderOrder = 3; m.castShadow = false; m.visible = false; return m;
}
const back = x => { x = Math.max(0, Math.min(1, x)); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// Each mark: the cards it uses and where they go (head-local metres for a head of width w; x = the figure's right, z = its
// front) as a function of frame t and age (frames since it began). Returns [[card index, x, y, z, size, spin]].
const MARKS = {
  sweat: { cards: ['sweat'], at: (w, t, a) => { const s = (a % 48) / 48; return [[0, 0.48 * w, 0.30 * w - 0.08 * w * s, 0.18 * w, 0.14 * w, 0.15]]; } },
  anger: { cards: ['anger'], at: (w, t, a) => [[0, 0.40 * w, 0.42 * w, 0.22 * w, 0.18 * w, 0]] },
  sparkle: { cards: ['sparkle', 'sparkle'], at: (w, t, a) => [0, 1].map(i => { const ph = t * 0.3 + i * 2.1, k = 0.6 + 0.4 * Math.max(0, Math.sin(ph));
    return [i, [0.62, -0.6][i] * w, [0.38, 0.55][i] * w, 0.15 * w, [0.15, 0.11][i] * w * k, 0]; }) },
  question: { cards: ['question'], at: (w, t, a) => [[0, 0.52 * w, 0.76 * w, 0.1 * w, 0.34 * w, 0.12]] },
  exclaim: { cards: ['exclaim'], at: (w, t, a) => [[0, 0.50 * w, 0.78 * w, 0.1 * w, 0.36 * w, -0.1 + (a < 10 ? 0.08 * Math.sin(a * 1.6) : 0)]] },
  steam: { cards: ['steam', 'steam'], at: (w, t, a) => [-1, 1].map((s, i) => { const u = ((a + i * 9) % 18) / 18; return [i, s * (0.55 + 0.2 * u) * w, (0.28 + 0.35 * u) * w, 0, (0.22 + 0.22 * u) * w * (u < 0.85 ? 1 : (1 - u) / 0.15), 0]; }) },
  stars: { cards: ['star', 'star', 'star'], at: (w, t, a) => [0, 1, 2].map(i => { const ph = t * 0.16 + i * 2.094; return [i, 0.55 * w * Math.cos(ph), 0.62 * w + 0.05 * w * Math.sin(ph * 2), 0.3 * w * Math.sin(ph), 0.13 * w, ph]; }) },
  zzz: { cards: ['zzz', 'zzz'], at: (w, t, a) => [0, 1].map(i => { const u = ((t + i * 20) % 40) / 40; return [i, (0.45 + 0.25 * u) * w, (0.45 + 0.45 * u) * w, 0.1 * w, (0.14 + 0.12 * u) * w * Math.min(1, (1 - u) * 4), 0.2]; }) },
};
export const MARK_NAMES = Object.keys(MARKS);

const hashKey = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
// One figure's face: its own canvas (redrawn only when what it shows changes) and its mark cards.
export function faceRig(headW, opt = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d', { willReadFrequently: true });
  const off = document.createElement('canvas'); off.width = off.height = 512;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const group = new THREE.Group(), cards = {};
  // measurement for __dbg (the forensic mouth numbers): dark mouth area (W^2, ink pixels below the eyes) and the drawing key
  const stats = { mouth: 0, key: '' };
  const darkMouth = () => { const d = g.getImageData(150, 318, 212, 150).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128 && d[i] + d[i + 1] + d[i + 2] < 200) n++; return n / (512 * 512); };
  let key = '';
  const cardsOf = kind => (cards[kind] ||= MARKS[kind].cards.map(c => { const m = card(c); group.add(m); return m; }));
  const v = new THREE.Vector3();
  return {
    tex, group, stats,
    // marks: [[kind, age]], cam: camera position (three world) or null; F (optional) = a mixed face from mixFace(): drawn
    // instead of the named expression (redrawn whenever one of its numbers moves, i.e. a new drawing per frame of a change)
    // slide = [yaw (rad), dy (W), alpha]: the flat 2D face (cast.js FACE_2D) turned round the ball of the head by yaw,
    // strip by strip, clipped by the head's outline; alpha 0 = the back of the head
    draw(expr, blink, t, marks, cam, F = null, slide = null) {
      const E = EXPR[expr] || EXPR.neutral, live = !!(E.skin?.tears || F?.skin?.tears > 0.03);
      const fk = F ? JSON.stringify(F, (n, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v) : expr;
      const sl = slide ? slide.map(v => Math.round(v * 500) / 500) : null;
      const k = `${fk}|${blink}|${live ? Math.floor(t / 2) : 0}|${sl ? sl.join(',') : ''}`;
      if (k !== key) {
        key = k;
        const paint = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 512, 512); g.setTransform(512, 0, 0, -512, 256, 256);
          if (F) drawFaceState(g, F, blink, t, opt); else drawFace(g, expr, blink, t, opt); };
        paint(); stats.mouth = darkMouth(); stats.key = k.length > 64 ? hashKey(k) : k;   // measured on the face itself, not where it turned
        if (sl && (sl[0] || sl[1] || sl[2] < 1)) {
          // the face drawn on the ball of the head (asset 2.4): each vertical strip of the flat drawing sits at its own
          // longitude, turned by the face's yaw (sl[0], rad), so features squeeze as they go round, the far eye slides
          // behind the edge and fades, the near one stays: a profile, not a drawing sliding off a disc
          off.getContext('2d').clearRect(0, 0, 512, 512); off.getContext('2d').drawImage(cv, 0, 0);
          g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 512, 512);
          if (sl[2] > 0.01) {
            g.save(); g.beginPath(); g.ellipse(256, 256, 0.462 * 512, 0.432 * 512, 0, 0, Math.PI * 2); g.clip();
            const R = 0.462, N = 120, px = u => 256 + 512 * u, dyp = -512 * sl[1];
            for (let i = 0; i < N; i++) {
              const u0 = -R + 2 * R * i / N, u1 = u0 + 2 * R / N, a0 = Math.asin(u0 / R) + sl[0], a1 = Math.asin(Math.min(1, u1 / R)) + sl[0];
              const z = Math.cos((a0 + a1) / 2); if (z < 0.08) continue;
              const x0 = px(R * Math.sin(a0)), x1 = px(R * Math.sin(a1)); if (x1 - x0 < 0.05) continue;
              g.globalAlpha = Math.min(1, (z - 0.08) / 0.25) * sl[2];
              g.drawImage(off, px(u0), 0, px(u1) - px(u0), 512, x0, dyp, x1 - x0 + 0.6, 512);
            }
            g.restore();
          }
        }
        tex.needsUpdate = true;
      }
      for (const list of Object.values(cards)) for (const m of list) m.visible = false;
      for (const [kind, age] of marks) {
        if (!MARKS[kind]) continue;
        const list = cardsOf(kind), pop = back(age / 7);
        for (const [i, x, y, z, size, spin] of MARKS[kind].at(headW, t, age)) {
          const m = list[i]; if (size <= 1e-4) continue;
          m.visible = true; m.position.set(x, y, z); m.scale.setScalar(Math.max(1e-3, size * pop));
          if (cam) { m.parent.updateMatrixWorld(true); m.lookAt(v.copy(cam)); }
          m.rotateZ(spin || 0);
        }
      }
    },
  };
}
