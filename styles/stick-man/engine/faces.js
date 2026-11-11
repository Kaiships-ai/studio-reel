// Faces: every expression is drawn in code onto a per-figure canvas (1 W x 1 W, head centre in the middle, v up), so the
// range is open-ended: eye kinds, tapered brows, mouth shapes, and face marks painted on the skin (blush, red veins, tears,
// dark sockets, gloom lines). Head-attached emotion marks (sweat drop, anger mark, sparkle, ?, !, steam, dizzy stars, zzz)
// are flat camera-facing cards parented to the head. All of it is a pure function of (expression, blink, frame, age).
import * as THREE from 'three';
import { css, INK_RGB } from './look.js';

const DEG = Math.PI / 180;
// Expression table. eye: oval | white (eyeball + pupil) | happy (^) | content (u) | spiral | x | star | manic | tiny |
// pinch (> <) | wet. rx, ry = eye radii (W); lid = top lid cut 0..1, lidTilt = deg (+ = inner end lower: angry), low =
// cheek push from below 0..1; brow = [tilt deg (+ = inner end down), height above the eye (W), arch (W), lift L, lift R];
// mouth = shape (below), mw = width scale, my = y shift (W); skin = { blush, veins, tears, socket, gloom } 0..1;
// marks = head-attached cards; tint = head colour pull. Reference measurements: STYLE.md (eyes 0.30 W apart, flat lids).
export const EXPR = {
  neutral: { eye: 'oval', rx: 0.050, ry: 0.060, brow: [0, 0.165, 0.006], mouth: 'flat' },
  calm: { eye: 'oval', rx: 0.050, ry: 0.058, lid: 0.32, brow: [-2, 0.158, 0.008], mouth: 'smile', mw: 0.8 },
  happy: { eye: 'oval', rx: 0.050, ry: 0.062, low: 0.25, brow: [-6, 0.178, 0.014], mouth: 'smile' },
  grin: { eye: 'oval', rx: 0.050, ry: 0.060, low: 0.3, brow: [-4, 0.182, 0.012], mouth: 'grin' },
  closed: { eye: 'happy', rx: 0.055, ry: 0.050, brow: [-4, 0.150, 0.016], mouth: 'smile' },
  smug: { eye: 'oval', rx: 0.054, ry: 0.058, lid: 0.48, lidTilt: -8, low: 0.2, brow: [14, 0.150, 0.004, 0.0, 0.035], mouth: 'smirk' },
  sly: { eye: 'oval', rx: 0.054, ry: 0.052, lid: 0.55, lidTilt: 6, low: 0.35, brow: [10, 0.138, 0.0, 0.03, -0.01], mouth: 'cat' },
  stern: { eye: 'oval', rx: 0.050, ry: 0.055, lid: 0.35, lidTilt: 10, brow: [22, 0.138, -0.004], mouth: 'frown', mw: 0.8 },
  worried: { eye: 'oval', rx: 0.050, ry: 0.064, brow: [-20, 0.192, 0.01], mouth: 'wobble' },
  shock: { eye: 'white', rx: 0.068, ry: 0.082, pupil: 0.026, brow: [-8, 0.232, 0.02], mouth: 'o', marks: [['exclaim', 26]] },
  sleep: { eye: 'content', rx: 0.055, ry: 0.050, brow: [0, 0.140, 0.004], mouth: 'flat', mw: 0.6, marks: [['zzz']] },
  // the range the reference uses (judge's notes: smug, manic, blush, panic, red veins, sweat)
  manic: { eye: 'manic', rx: 0.060, ry: 0.066, brow: [26, 0.150, -0.01], mouth: 'teeth_grin', mw: 1.25, skin: { veins: 1, socket: 1 } },
  panic: { eye: 'white', rx: 0.066, ry: 0.084, pupil: 0.016, brow: [-24, 0.228, 0.016], mouth: 'wavy', skin: { gloom: 0.8 }, marks: [['sweat']] },
  blush: { eye: 'happy', rx: 0.056, ry: 0.050, brow: [-10, 0.170, 0.018], mouth: 'smile', mw: 0.7, skin: { blush: 1 } },
  angry: { eye: 'oval', rx: 0.050, ry: 0.050, lid: 0.30, lidTilt: 22, brow: [30, 0.128, -0.012], mouth: 'teeth', skin: { veins: 0.55 }, marks: [['anger']] },
  furious: { eye: 'manic', rx: 0.056, ry: 0.056, lid: 0.25, lidTilt: 24, brow: [34, 0.122, -0.012], mouth: 'teeth', mw: 1.15, skin: { veins: 1, socket: 0.6 }, tint: [0.72, 0.38, 0.78], marks: [['anger'], ['steam']] },
  nervous: { eye: 'oval', rx: 0.048, ry: 0.060, brow: [-16, 0.186, 0.012], mouth: 'teeth_grin', mw: 0.9, marks: [['sweat']] },
  sad: { eye: 'wet', rx: 0.054, ry: 0.064, brow: [-26, 0.180, 0.01], mouth: 'sad_open', skin: { tears: 1 } },
  cry: { eye: 'pinch', rx: 0.058, ry: 0.050, brow: [-28, 0.176, 0.01], mouth: 'wail', skin: { tears: 1 } },
  dizzy: { eye: 'spiral', rx: 0.060, ry: 0.062, brow: [-10, 0.200, 0.02], mouth: 'wobble', mw: 1.1, marks: [['stars']] },
  confused: { eye: 'oval', rx: 0.050, ry: 0.060, brow: [0, 0.170, 0.008, -0.02, 0.05], mouth: 'skew', marks: [['question']] },
  excited: { eye: 'star', rx: 0.064, ry: 0.074, brow: [-10, 0.214, 0.02], mouth: 'big', marks: [['sparkle']] },
  deadpan: { eye: 'oval', rx: 0.054, ry: 0.050, lid: 0.62, brow: [0, 0.120, 0.0], mouth: 'flat', mw: 0.8 },
  suspicious: { eye: 'oval', rx: 0.054, ry: 0.050, lid: 0.55, lidTilt: 8, low: 0.45, brow: [16, 0.128, -0.006, -0.03, 0.03], mouth: 'flat', mw: 0.6, my: 0.01 },
  scream: { eye: 'white', rx: 0.070, ry: 0.088, pupil: 0.014, brow: [-22, 0.236, 0.02], mouth: 'scream', skin: { gloom: 1 }, marks: [['sweat']] },
  pain: { eye: 'pinch', rx: 0.060, ry: 0.052, brow: [-24, 0.170, 0.0], mouth: 'teeth', mw: 1.1, skin: { veins: 0.4 }, marks: [['sweat']] },
  proud: { eye: 'happy', rx: 0.056, ry: 0.050, brow: [-14, 0.196, 0.02], mouth: 'big', mw: 0.9, marks: [['sparkle']] },
  disgust: { eye: 'oval', rx: 0.050, ry: 0.050, lid: 0.4, lidTilt: 12, low: 0.5, brow: [18, 0.140, 0.0, 0.03, -0.02], mouth: 'tongue', mw: 0.9 },
};
// open-mouth twins (`<expr>_o`) are shown while a word is being said: each mouth opens in its own way
const OPEN = { flat: 'open', smile: 'open', grin: 'open_big', smirk: 'open_skew', cat: 'open_skew', frown: 'open_frown', wobble: 'open_frown',
  o: 'o_big', wavy: 'scream_small', teeth: 'teeth_open', teeth_grin: 'teeth_open', sad_open: 'wail', wail: 'wail', skew: 'open_skew',
  big: 'big_open', scream: 'scream', tongue: 'open' };
for (const k of Object.keys(EXPR)) EXPR[k + '_o'] = { ...EXPR[k], mouth: OPEN[EXPR[k].mouth] || 'open', base: k };
EXPR.sleep_o = { ...EXPR.sleep, mouth: 'o', mw: 0.6, base: 'sleep' };
// wide-open twins (`<expr>_O`): the loud syllable and the middle of an expression ramp (FORENSIC.md fix 8: reference mouth
// area swings, CV 0.33-0.56; ours barely moved). Bigger in width and drawn lower so the dark shape grows.
for (const k of Object.keys(EXPR)) if (!k.endsWith('_o') && !k.endsWith('_O')) EXPR[k + '_O'] = { ...EXPR[k + '_o'], mw: 1.45 * (EXPR[k].mw || 1), my: (EXPR[k].my || 0) - 0.012, base: k };
export const EXPR_NAMES = Object.keys(EXPR).filter(k => !k.endsWith('_o'));
export const baseExpr = e => (e && EXPR[e]?.base) || e;

// ------------------------------------------------------------------ drawing (W units, v up, origin = head centre)
function bez(p0, p1, p2, p3, n = 16) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
    o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return o;
}
const INK = css(INK_RGB), RED = 'rgb(214,22,30)', PINK = 'rgba(255,128,150,0.78)', TEAR = 'rgb(120,196,255)', WHITE = 'rgb(250,250,247)', TONGUE = css([0.85, 0.22, 0.26]);
function path(g, pts, close = false) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); if (close) g.closePath(); }
function line(g, pts, w, col = INK) { g.strokeStyle = col; g.lineWidth = w; path(g, pts); g.stroke(); }
function blob(g, pts, fill, ink = 0.022) { path(g, pts, true); g.fillStyle = fill; g.fill(); if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); } }
const ellipse = (cx, cy, rx, ry, n = 28) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });

// a tapered brow: thick at the inner end, thinner and rounded at the outer end (reference: short heavy dashes)
function brow(g, ex, s, by, tilt, arch, len = 0.118) {
  const a = tilt * DEG * s, c = Math.cos(a), sn = Math.sin(a), n = 12, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = -len + 2 * len * t, y = arch * (1 - (2 * t - 1) ** 2);          // t 0 = inner end for s = 1
    const th = 0.041 - 0.016 * (s > 0 ? t : 1 - t);                                         // half thickness: inner 0.041, outer 0.025
    const px = ex + s * 0.004 + x * c - y * sn, py = by + x * sn + y * c;
    top.push([px - th * sn, py + th * c]); bot.push([px + th * sn, py - th * c]);
  }
  path(g, [...top, ...bot.reverse()], true); g.fillStyle = INK; g.fill();
  g.lineWidth = 0.012; g.strokeStyle = INK; g.stroke();
}

function eye(g, E, ex, s, ey, blink, t) {
  let { rx, ry } = E; rx *= 1.30; ry *= 1.30;
  let lid = E.lid || 0; const kind = E.eye;
  if (blink === 1 && !['happy', 'content', 'pinch', 'spiral', 'x'].includes(kind)) lid = Math.max(lid, 0.62);
  if (blink === 2 && !['happy', 'content', 'pinch', 'spiral', 'x'].includes(kind)) { line(g, [[ex - rx * 1.15, ey - 0.004], [ex + rx * 1.15, ey - 0.004]], 0.030); return; }
  if (kind === 'happy' || kind === 'content') {
    const arc = [];
    for (let i = 0; i <= 14; i++) { const a = Math.PI * (0.08 + 0.84 * i / 14);
      arc.push(kind === 'happy' ? [ex + rx * 1.1 * Math.cos(a), ey - 0.012 + ry * 0.95 * Math.sin(a)] : [ex + rx * 1.1 * Math.cos(a), ey + 0.012 - ry * 0.45 * Math.sin(a)]); }
    line(g, arc, 0.034); return;
  }
  if (kind === 'pinch') {                                                                // > <: squeezed shut
    const w = rx * 1.05, h = ry * 0.85;
    line(g, [[ex - s * w, ey + h], [ex + s * w * 0.9, ey], [ex - s * w, ey - h]], 0.032); return;
  }
  if (kind === 'x') { line(g, [[ex - rx, ey + ry], [ex + rx, ey - ry]], 0.03); line(g, [[ex - rx, ey - ry], [ex + rx, ey + ry]], 0.03); return; }
  if (kind === 'spiral') {
    const pts = [], rot = (t || 0) * 0.35 * s;
    for (let i = 0; i <= 40; i++) { const a = i / 40 * 2.6 * 2 * Math.PI + rot, r = (i / 40) * rx * 1.05; pts.push([ex + r * Math.cos(a), ey + r * Math.sin(a) * ry / rx]); }
    line(g, pts, 0.018); return;
  }
  const top = ey + ry * (1 - 2 * lid * 0.62), tilt = (E.lidTilt || 0) * DEG * s, lowK = E.low || 0;
  const ry2 = ry * 0.9, cheek = ey - ry + lowK * ry * 0.7 - ry2;                       // cheek push: an ellipse cut from below
  g.save(); g.beginPath();
  // lid: a straight cut (tilted for angry / sly) from above
  g.moveTo(ex - 0.2, top - 0.2 * Math.tan(tilt)); g.lineTo(ex + 0.2, top + 0.2 * Math.tan(tilt)); g.lineTo(ex + 0.2, ey - 0.3); g.lineTo(ex - 0.2, ey - 0.3); g.closePath(); g.clip();
  if (lowK) { g.beginPath(); g.rect(ex - 0.3, ey - 0.3, 0.6, 0.6); g.ellipse(ex, cheek, rx * 1.8, ry2, 0, 0, Math.PI * 2); g.clip('evenodd'); }
  if (kind === 'white') {
    blob(g, ellipse(ex, ey, rx, ry), WHITE, 0.024);
    const pr = E.pupil ?? 0.024, jit = (E.pupil ?? 1) < 0.02 ? 0.004 * Math.sin((t || 0) * 2.3 + s) : 0;
    g.beginPath(); g.ellipse(ex - s * 0.006 + jit, ey - 0.004, pr, pr * 1.1, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  } else if (kind === 'manic') {
    g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    g.beginPath(); g.ellipse(ex, ey - 0.004, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2); g.fillStyle = 'rgb(232,30,36)'; g.fill();
    g.beginPath(); g.ellipse(ex - s * 0.008, ey + 0.008, rx * 0.2, ry * 0.18, 0, 0, Math.PI * 2); g.fillStyle = 'rgb(255,214,200)'; g.fill();
  } else {
    g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    if (kind === 'star') {                                                               // sparkle eyes: a 4-point white star
      const r = rx * 0.62, k = 0.28; const st = [];
      for (let i = 0; i < 8; i++) { const a = Math.PI / 4 * i + Math.PI / 2, rr = i % 2 ? r * k : r; st.push([ex - s * 0.008 + rr * Math.cos(a), ey + 0.012 + rr * Math.sin(a)]); }
      path(g, st, true); g.fillStyle = WHITE; g.fill();
      g.beginPath(); g.arc(ex + s * 0.02, ey - 0.03, rx * 0.16, 0, 2 * Math.PI); g.fill();
    }
    if (kind === 'wet') {                                                                // shiny, about to cry: two big highlights
      g.fillStyle = WHITE; g.beginPath(); g.ellipse(ex - s * 0.012, ey + 0.022, rx * 0.36, ry * 0.3, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ex + s * 0.018, ey - 0.03, rx * 0.17, 0, 2 * Math.PI); g.fill();
    }
  }
  g.restore();
  if (lid > 0) { const L = rx * 1.3; line(g, [[ex - L, top - L * Math.tan(tilt)], [ex + L, top + L * Math.tan(tilt)]], 0.028); }
  if (lowK >= 0.45) line(g, Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.25 + 0.5 * i / 8); return [ex + rx * 1.8 * Math.cos(a) * 0.62, cheek + ry2 * Math.sin(a)]; }), 0.016);
}

function mouth(g, kind, mw = 1, my = 0, t = 0) {
  const mx = 0, y = 0.02 - 0.20 + my, W2 = (x) => x * mw;
  const fillShape = (pts, col = INK, ink = 0.026) => blob(g, pts, col, ink);
  switch (kind) {
    case 'flat': line(g, [[mx - W2(0.045), y], [mx + W2(0.045), y]], 0.028); break;
    case 'smirk': line(g, bez([mx - W2(0.05), y - 0.005], [mx - W2(0.01), y - 0.02], [mx + W2(0.03), y - 0.01], [mx + W2(0.07), y + 0.035]), 0.028); break;
    case 'cat': line(g, bez([mx - W2(0.07), y + 0.012], [mx - W2(0.05), y - 0.03], [mx - W2(0.01), y - 0.03], [mx, y]), 0.026);
      line(g, bez([mx, y], [mx + W2(0.01), y - 0.03], [mx + W2(0.05), y - 0.03], [mx + W2(0.075), y + 0.022]), 0.026); break;
    case 'frown': line(g, bez([mx - W2(0.055), y - 0.02], [mx - W2(0.02), y + 0.02], [mx + W2(0.02), y + 0.02], [mx + W2(0.055), y - 0.02]), 0.028); break;
    case 'smile': line(g, bez([mx - W2(0.075), y + 0.02], [mx - W2(0.03), y - 0.035], [mx + W2(0.03), y - 0.035], [mx + W2(0.075), y + 0.02]), 0.028); break;
    case 'wobble': line(g, bez([mx - W2(0.06), y], [mx - W2(0.03), y + 0.03], [mx, y - 0.03], [mx + W2(0.06), y + 0.005]), 0.026); break;
    case 'skew': line(g, bez([mx - W2(0.05), y + 0.012], [mx - W2(0.01), y + 0.004], [mx + W2(0.02), y - 0.02], [mx + W2(0.06), y - 0.03]), 0.026); break;
    case 'wavy': { const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([mx + W2(-0.07 + 0.14 * u), y + 0.012 * Math.sin(u * 4 * Math.PI)]); } line(g, pts, 0.024); break; }
    case 'o': g.beginPath(); g.ellipse(mx, y - 0.01, 0.036 * mw, 0.048, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); break;
    case 'o_big': g.beginPath(); g.ellipse(mx, y - 0.016, 0.044 * mw, 0.062, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); break;
    case 'tongue': line(g, [[mx - W2(0.05), y], [mx + W2(0.05), y + 0.004]], 0.026);
      fillShape([...bez([mx - 0.005, y], [mx - 0.01, y - 0.06], [mx + 0.045, y - 0.06], [mx + 0.04, y], 10)], TONGUE, 0.018); break;
    case 'grin': case 'open_big': case 'big': case 'big_open': {
      const h = kind === 'grin' ? 0.06 : kind === 'open_big' ? 0.085 : kind === 'big' ? 0.095 : 0.12, w = W2(kind === 'grin' ? 0.085 : 0.09);
      const pts = bez([mx - w, y + 0.025], [mx - w * 0.5, y - h * 1.35], [mx + w * 0.5, y - h * 1.35], [mx + w, y + 0.025], 20);
      if (kind === 'grin') { fillShape(pts, WHITE, 0.028); break; }
      fillShape(pts, INK, 0.026);
      g.save(); path(g, pts, true); g.clip();
      g.fillStyle = WHITE; g.fillRect(mx - w, y + 0.0, 2 * w, 0.03);                           // top teeth
      g.fillStyle = TONGUE; g.beginPath(); g.ellipse(mx, y - h * 0.95, w * 0.55, h * 0.4, 0, 0, Math.PI * 2); g.fill();
      g.restore(); break;
    }
    case 'open': case 'open_skew': case 'open_frown': {
      const sk = kind === 'open_skew' ? 0.02 : 0, fr = kind === 'open_frown';
      const top = bez([mx - W2(0.062), y + 0.018 + sk], [mx - W2(0.03), y + 0.004], [mx + W2(0.03), y + 0.004], [mx + W2(0.062), y + 0.018 - sk], 12);
      const bot = fr ? bez([mx + W2(0.062), y + 0.018 - sk], [mx + W2(0.04), y - 0.03], [mx - W2(0.04), y - 0.03], [mx - W2(0.062), y + 0.018 + sk], 12)
        : bez([mx + W2(0.062), y + 0.018 - sk], [mx + W2(0.05), y - 0.075], [mx - W2(0.05), y - 0.075], [mx - W2(0.062), y + 0.018 + sk], 14);
      fillShape([...top, ...bot], INK, 0);
      g.fillStyle = TONGUE; g.beginPath(); g.ellipse(mx, y - (fr ? 0.012 : 0.040), 0.030 * mw, 0.012, 0, 0, Math.PI * 2); g.fill(); break;
    }
    case 'teeth': case 'teeth_grin': case 'teeth_open': {
      const w = W2(kind === 'teeth_grin' ? 0.11 : 0.10), h = kind === 'teeth_open' ? 0.085 : 0.066, cy = y - 0.01 + (kind === 'teeth_grin' ? -0.005 : 0);
      let pts;
      if (kind === 'teeth_grin') pts = [...bez([mx - w, cy + 0.03], [mx - w * 0.4, cy + 0.0], [mx + w * 0.4, cy + 0.0], [mx + w, cy + 0.03], 12), ...bez([mx + w, cy + 0.03], [mx + w * 0.6, cy - h * 1.2], [mx - w * 0.6, cy - h * 1.2], [mx - w, cy + 0.03], 12)];
      else { const r = 0.02; pts = []; for (const [qx, qy, a0] of [[w - r, h / 2 - r, 0], [-w + r, h / 2 - r, 90], [-w + r, -h / 2 + r, 180], [w - r, -h / 2 + r, 270]]) for (let i = 0; i <= 4; i++) { const a = (a0 + 22.5 * i) * DEG; pts.push([mx + qx + r * Math.cos(a), cy + qy + r * Math.sin(a)]); } }
      if (kind === 'teeth_open') { fillShape(pts, INK, 0.026); g.save(); path(g, pts, true); g.clip(); g.fillStyle = WHITE; g.fillRect(mx - w, cy + h / 2 - 0.022, 2 * w, 0.022); g.fillRect(mx - w, cy - h / 2, 2 * w, 0.018); g.restore(); break; }
      fillShape(pts, WHITE, 0.026);
      g.save(); path(g, pts, true); g.clip();
      line(g, [[mx - w, cy - 0.002], [mx + w, cy - 0.002]], 0.012);
      for (let i = -2; i <= 2; i++) line(g, [[mx + i * w / 3, cy + h], [mx + i * w / 3, cy - h]], 0.010);
      g.restore(); break;
    }
    case 'sad_open': case 'wail': {
      const w = W2(kind === 'wail' ? 0.08 : 0.055), h = kind === 'wail' ? 0.09 : 0.05;
      const pts = [...bez([mx - w, y - 0.03], [mx - w * 0.6, y + h], [mx + w * 0.6, y + h], [mx + w, y - 0.03], 14), [mx + w * 0.6, y - 0.04], [mx - w * 0.6, y - 0.04]];
      fillShape(pts, INK, 0.024);
      g.save(); path(g, pts, true); g.clip(); g.fillStyle = TONGUE; g.beginPath(); g.ellipse(mx, y - 0.04, w * 0.6, 0.02, 0, 0, Math.PI * 2); g.fill(); g.restore(); break;
    }
    case 'scream': case 'scream_small': {
      const k = kind === 'scream' ? 1 : 0.7, w = W2(0.06 * k), h = 0.11 * k, cy = y - 0.03 * k;
      const pts = [...bez([mx - w, cy + h * 0.45], [mx - w * 1.1, cy - h * 0.8], [mx + w * 1.1, cy - h * 0.8], [mx + w, cy + h * 0.45], 14), ...bez([mx + w, cy + h * 0.45], [mx + w * 0.5, cy + h * 0.75], [mx - w * 0.5, cy + h * 0.75], [mx - w, cy + h * 0.45], 8)];
      fillShape(pts, INK, 0.024);
      g.save(); path(g, pts, true); g.clip(); g.fillStyle = WHITE; g.fillRect(mx - w * 1.2, cy + h * 0.42, 2.4 * w, 0.03);
      g.fillStyle = TONGUE; g.beginPath(); g.ellipse(mx, cy - h * 0.55, w * 0.7, h * 0.3, 0, 0, Math.PI * 2); g.fill(); g.restore(); break;
    }
    default: line(g, [[mx - 0.045, y], [mx + 0.045, y]], 0.028);
  }
}

// paint on the skin: blush, red veins, tears, dark sockets, gloom lines
function skin(g, S, ey, t) {
  if (S.socket) for (const s of [-1, 1]) {
    const gr = g.createRadialGradient(s * 0.15, ey, 0.02, s * 0.15, ey, 0.13);
    gr.addColorStop(0, `rgba(40,20,48,${0.75 * S.socket})`); gr.addColorStop(1, 'rgba(40,20,48,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(s * 0.15, ey, 0.13, 0.12, 0, 0, Math.PI * 2); g.fill();
  }
  if (S.gloom) {                                                                         // blue-violet lines down the forehead
    g.save(); g.globalAlpha = 0.55 * S.gloom;
    for (let i = -4; i <= 4; i++) { const x = i * 0.05; line(g, [[x, 0.34], [x, 0.27 - 0.03 * Math.cos(i)]], 0.012, 'rgb(90,80,190)'); }
    g.restore();
  }
  if (S.blush) for (const s of [-1, 1]) {
    g.fillStyle = PINK; g.beginPath(); g.ellipse(s * 0.22, ey - 0.105, 0.075, 0.042, 0, 0, Math.PI * 2); g.fill();
    for (let i = -1; i <= 1; i++) line(g, [[s * 0.22 + i * 0.03 - 0.008, ey - 0.088], [s * 0.22 + i * 0.03 + 0.008, ey - 0.122]], 0.009, 'rgba(230,70,100,0.9)');
  }
  if (S.veins) {                                                                         // forked red veins from the temples and brow
    const k = S.veins, pulse = 1 + 0.06 * Math.sin((t || 0) * 0.9);
    g.save(); g.globalAlpha = Math.min(1, 0.4 + 0.6 * k);
    const fork = (x0, y0, a, len, w, depth) => {
      if (depth > 3 || len < 0.02) return;
      const pts = [[x0, y0]]; let x = x0, y = y0;
      for (let i = 1; i <= 4; i++) { x += Math.cos(a + 0.35 * Math.sin(i * 2.3 + depth)) * len / 4 * pulse; y += Math.sin(a + 0.35 * Math.sin(i * 2.3 + depth)) * len / 4 * pulse; pts.push([x, y]); }
      line(g, pts, w, RED);
      fork(x, y, a + 0.6, len * 0.6, w * 0.7, depth + 1); fork(x, y, a - 0.5, len * 0.55, w * 0.7, depth + 1);
    };
    for (const s of [-1, 1]) { fork(s * 0.40, 0.22, s > 0 ? Math.PI - 0.5 : 0.5, 0.17 * (0.6 + 0.4 * k), 0.014, 0); fork(s * 0.40, -0.06, s > 0 ? Math.PI + 0.35 : -0.35, 0.13 * (0.6 + 0.4 * k), 0.012, 1); }
    if (k > 0.7) fork(0.06, 0.34, -Math.PI / 2 - 0.3, 0.09, 0.013, 1);
    g.restore();
  }
  if (S.tears) for (const s of [-1, 1]) {                                               // streams from the lower lid, a drop running down
    const x = s * 0.17, y0 = ey - 0.06, ph = ((t || 0) % 14) / 14;
    const pts = [[x - 0.018, y0], [x - 0.022, y0 - 0.12], [x - 0.012, y0 - 0.26], [x + 0.012, y0 - 0.26], [x + 0.022, y0 - 0.12], [x + 0.018, y0]];
    blob(g, pts, TEAR, 0.012);
    const dy = y0 - 0.04 - 0.2 * ph; blob(g, ellipse(x, dy, 0.016, 0.022, 12), 'rgb(210,238,255)', 0);
  }
}

// o.glasses: the rims circle the eyes, so the brows sit higher (clear of the rim) and tilt 1.4x so the expression still reads
export function drawFace(g, expr, blink = 0, t = 0, o = {}) {
  const E = EXPR[expr] || EXPR.neutral, ey = 0.02, dx = 0.150, S = E.skin || {};
  g.lineCap = g.lineJoin = 'round';
  skin(g, S, ey, t);
  g.save(); g.scale(FEATURE, FEATURE);                                                   // features a little larger than the
  // reference: at phone size (and on a contact sheet) a face must still read from across the room
  const [tilt0, bh0, arch = 0, liftL = 0, liftR = 0] = E.brow;
  const tilt = o.glasses ? tilt0 * 1.4 : tilt0, bh = o.glasses ? Math.max(bh0, 0.150) + 0.022 : bh0;
  for (const s of [-1, 1]) {
    const ex = s * dx;
    eye(g, E, ex, s, ey, blink, t);
    const by = ey + bh + 0.018 - (blink === 2 ? 0.014 : 0) + (s < 0 ? liftL : liftR);
    brow(g, ex, s, by, tilt, arch);
  }
  mouth(g, E.mouth, 1.15 * (E.mw || 1), E.my || 0, t);
  g.restore();
}
const FEATURE = 1.12;

// ------------------------------------------------------------------ head-attached emotion marks (flat cards, ink outline)
const MARK_PX = 256;
const markTex = {};
function cardTex(kind) {
  if (markTex[kind]) return markTex[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = MARK_PX; const g = cv.getContext('2d');
  g.translate(MARK_PX / 2, MARK_PX / 2); g.scale(MARK_PX / 2, -MARK_PX / 2); g.lineCap = g.lineJoin = 'round';   // -1..1, y up
  const ink = (pts, fill, w = 0.09) => { path(g, pts, true); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill(); };
  if (kind === 'sweat') {
    const drop = [...bez([0, 0.9], [0.15, 0.55], [0.55, 0.15], [0.5, -0.25], 12), ...bez([0.5, -0.25], [0.45, -0.85], [-0.45, -0.85], [-0.5, -0.25], 12), ...bez([-0.5, -0.25], [-0.55, 0.15], [-0.15, 0.55], [0, 0.9], 12)];
    ink(drop, 'rgb(130,200,255)', 0.08);
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(-0.18, -0.25, 0.1, 0.2, -0.4, 0, Math.PI * 2); g.fill();
  } else if (kind === 'anger') {                                                         // four bulging hooks: the cross-popping vein
    for (let q = 0; q < 4; q++) {
      g.save(); g.rotate(q * Math.PI / 2 + Math.PI / 4);
      const arm = [...bez([0.16, 0.16], [0.2, 0.55], [0.6, 0.62], [0.78, 0.3], 10), ...bez([0.78, 0.3], [0.62, 0.48], [0.4, 0.42], [0.34, 0.16], 8)];
      ink(arm, 'rgb(230,30,40)', 0.07); g.restore();
    }
  } else if (kind === 'sparkle' || kind === 'star') {
    const st = [], n = kind === 'star' ? 5 : 4;
    for (let i = 0; i < 2 * n; i++) { const a = Math.PI / n * i + Math.PI / 2, r = i % 2 ? (kind === 'star' ? 0.38 : 0.2) : 0.85; st.push([r * Math.cos(a), r * Math.sin(a)]); }
    ink(st, kind === 'star' ? 'rgb(255,214,60)' : 'rgb(255,246,170)', 0.08);
  } else if (kind === 'question' || kind === 'exclaim' || kind === 'zzz') {
    g.save(); g.scale(1, -1);
    g.font = `900 ${kind === 'zzz' ? 0.9 : 1.6}px InterReel, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = kind === 'question' ? '?' : kind === 'exclaim' ? '!' : 'Z';
    g.lineWidth = 0.2; g.strokeStyle = INK; g.strokeText(txt, 0, 0.05); g.fillStyle = kind === 'exclaim' ? 'rgb(255,70,60)' : kind === 'zzz' ? 'rgb(240,240,255)' : 'rgb(255,220,70)';
    g.fillText(txt, 0, 0.05); g.restore();
  } else if (kind === 'steam') {
    const puffs = [[0, 0, 0.42], [-0.38, -0.18, 0.3], [0.36, -0.2, 0.32], [0.1, 0.4, 0.3]];
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r + 0.06, 0, 2 * Math.PI); g.fillStyle = INK; g.fill(); }
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
  sweat: { cards: ['sweat', 'sweat'], at: (w, t, a) => { const s = (a % 40) / 40; return [[0, 0.50 * w, 0.32 * w - 0.10 * w * s, 0.18 * w, 0.17 * w, 0.15], [1, -0.52 * w, 0.18 * w - 0.08 * w * ((a + 17) % 40) / 40, 0.16 * w, 0.11 * w * (a > 8 ? 1 : 0), -0.2]]; } },
  anger: { cards: ['anger'], at: (w, t, a) => [[0, 0.40 * w, 0.42 * w, 0.22 * w, 0.24 * w * (1 + 0.12 * Math.max(0, Math.sin(t * 0.9))), 0]] },
  sparkle: { cards: ['sparkle', 'sparkle', 'sparkle'], at: (w, t, a) => [0, 1, 2].map(i => { const ph = t * 0.35 + i * 2.1, k = 0.55 + 0.45 * Math.max(0, Math.sin(ph));
    return [i, [0.62, -0.6, 0.45][i] * w, [0.35, 0.5, 0.72][i] * w, 0.15 * w, [0.20, 0.15, 0.12][i] * w * k, ph * 0.2]; }) },
  question: { cards: ['question'], at: (w, t, a) => [[0, 0.52 * w, 0.78 * w + 0.03 * w * Math.sin(t * 0.25), 0.1 * w, 0.42 * w, 0.18 + 0.06 * Math.sin(t * 0.2)]] },
  exclaim: { cards: ['exclaim'], at: (w, t, a) => [[0, 0.50 * w, 0.80 * w, 0.1 * w, 0.46 * w, -0.15 + (a < 10 ? 0.12 * Math.sin(a * 1.6) : 0)]] },
  steam: { cards: ['steam', 'steam'], at: (w, t, a) => [-1, 1].map((s, i) => { const u = ((a + i * 9) % 18) / 18; return [i, s * (0.55 + 0.2 * u) * w, (0.28 + 0.35 * u) * w, 0, (0.22 + 0.22 * u) * w * (u < 0.85 ? 1 : (1 - u) / 0.15), 0]; }) },
  stars: { cards: ['star', 'star', 'star'], at: (w, t, a) => [0, 1, 2].map(i => { const ph = t * 0.16 + i * 2.094; return [i, 0.55 * w * Math.cos(ph), 0.62 * w + 0.05 * w * Math.sin(ph * 2), 0.3 * w * Math.sin(ph), 0.17 * w, ph]; }) },
  zzz: { cards: ['zzz', 'zzz'], at: (w, t, a) => [0, 1].map(i => { const u = ((t + i * 20) % 40) / 40; return [i, (0.45 + 0.25 * u) * w, (0.45 + 0.45 * u) * w, 0.1 * w, (0.14 + 0.12 * u) * w * Math.min(1, (1 - u) * 4), 0.2]; }) },
};
export const MARK_NAMES = Object.keys(MARKS);

// One figure's face: its own canvas (redrawn only when what it shows changes) and its mark cards.
export function faceRig(headW, opt = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d', { willReadFrequently: true });
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
    // marks: [[kind, age]], cam: camera position (three world) or null
    draw(expr, blink, t, marks, cam) {
      const E = EXPR[expr] || EXPR.neutral, live = (E.skin?.tears || E.skin?.veins || E.eye === 'spiral' || (E.pupil ?? 1) < 0.02);
      const k = `${expr}|${blink}|${live ? Math.floor(t / 2) : 0}`;
      if (k !== key) {
        key = k; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 512, 512);
        g.setTransform(512, 0, 0, -512, 256, 256); drawFace(g, expr, blink, t, opt); tex.needsUpdate = true;
        stats.mouth = darkMouth(); stats.key = k;
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
