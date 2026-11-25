// The expression faces (kit faces v4, fix round after the blind read: proud read "smug", guilty "worried", bored
// "skeptical", embarrassed "nervous", half-lidded eyes "sunglasses"). New s2 designs under new names (`e_...`), drawn by
// the s2 drawer; the catalogue's own designs are never edited (the V2.1 hash holds). engine/expressions.js names them.
// None carries a `marks` list: an expression's head mark lands on its own beat, a few frames after the face.
// Registered the way s2.js registers its catalogue: into s2's DESIGNS (s2 use() copies them into EXPR with talking
// twins) and, when s2 is already in use, straight into EXPR.
// style 's2x' = the s2 drawer plus this file's extras (x.blushW: a blush twice as wide, crossed by five hatch lines).
// Its own mouths go into s2's MOUTHS (x.mBeam a big closed-teeth grin, x.mSmirk a one-sided curl, x.mGape a tall open oval).
import { EXPR, STYLE_DRAW, FACE_STYLE, DRAW_KIT as K } from '../faces.js';
import { FACE_CLASS } from '../acting.js';
import { DESIGNS, MOUTHS } from './s2.js';

const BLUSH = 'rgb(240,152,166)', BLUSH_INK = 'rgb(206,72,98)';
const O = { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1 };
const des = (d, x = {}) => ({ ...O, ...d, x });
const own = (n, x = {}) => ({ ...DESIGNS[n], marks: undefined, x: { ...DESIGNS[n].x, ...x } });
export const EXPR_DESIGNS = {
  // proud: round open eyes straight at you, both brows level and high, a big closed-teeth grin (never a lid: smug; never shut eyes: content)
  e_proud: des({ rx: 0.07, ry: 0.09, white: 0.36, lid: -0.06, brow: [0, 0.178, 0.022], mw: 1.4, my: 0.012 }, { mC: 1, mBeam: 1, mTeeth: 1, mOpen: 0.3, gY: 1, eY: -0.012 }),
  // smug: a half lid sloping down at the outer corner, white each side of the pupil, one brow cocked and the other low, a one-sided smirk
  e_smug: des({ lid: 0.4, lidTilt: -11, white: 0.4, gx: 0.4, brow: [3, 0.14, 0.012, -0.016, 0.058], mw: 0.85, mx: 0.03 }, { mC: 0.6, mSk: 0.95, mSmirk: 1 }),
  // guilty: the head does the hiding; eyes in the far lower corner, half lids, flat low brows, a small pressed mouth pulled to one side
  e_guilty: des({ rx: 0.07, lid: 0.34, lidTilt: -8, white: 0.35, gx: -1.1, brow: [-5, 0.136, 0.002], mw: 0.46, mx: -0.05, my: 0.03 }, { mC: -0.15, mSk: -0.5, mPr: 1, gY: -1, eY: 0.02 }),
  // bored: both brows flat and level, half lids, pupils off to the side (rolled up, they hid under the lids), a flat mouth
  e_bored: des({ lid: 0.44, white: 0.2, gx: 0.95, gy: 0.2, brow: [0, 0.142, 0], mw: 0.62, mx: 0.02 }, { mC: -0.06, mSk: 0.3, mPr: 0.6 }),
  // embarrassed: eyes squeezed shut (> <), a wide wavy grimace-smile, the blush twice as wide and hatched
  e_embarrassed: { ...des({ brow: [-18, 0.16, 0.016], mw: 1.2 }, { eCr: 1, mC: 0.5, mWv: 1, mOpen: 0.22, mTeeth: 0.5, blushW: 1 }), style: 's2x' },
  // shocked: y_shock's eyes, the whole face lower, a tall open oval mouth an eye wide (y_shock's is a speck)
  e_shock: des({ rx: 0.07, ry: 0.116, white: 0.8, bw: 1.1, lid: -0.08, brow: [-8, 0.172, 0.02], mw: 1, my: -0.004 }, { mOpen: 0.5, mC: -0.85, mGape: 1, eSt: 0.04, eY: 0.018 }),
  // shy: the catalogue's, with a tiny half smile (its wavy mouth read sulky)
  e_shy: own('shy', { mC: 0.55, mSk: 0.35, mWv: 0 }),
  // sleepy: the yawn without its tear, brows level, the mouth smaller and higher
  e_sleepy: { ...own('yawn', { mO: 1.05, tear1: 0 }), lid: 0.6, lidTilt: -5, brow: [-4, 0.158, 0.012], mw: 1.1, my: 0.02 },
  // the catalogue's angry and confused without their own marks (the expression's beat brings them, after the face)
  e_angry: own('angry'), e_confused: own('confused'),
  // catalogue faces with a drawing fault, corrected under a new name (films draw the old names, so those stay): a lip line
  // round cry's and scream's teeth (a pale strip spilled out of the mouth), disgust with a clean eye edge and one wavy mouth
  e_cry: own('cry', { mRim: 1 }), e_scream: own('scream', { mRim: 1 }),
  e_disgust: { ...own('disgust', { mSnarl: 0, scrunch: 0, mWv: 1.3, mC: -0.75, mTongue: 1, eAsym: 0.12 }), mw: 0.8 },
};
// the kit's shock is a take and its sleepy yawn a plain change: the expression faces run on the same clocks
FACE_CLASS.take.add('e_shock');

// a dimple: a short curve cupping a mouth corner
const dimple = (g, x, y, sd, k, r = 0.026) => K.taper(g, K.bez([x - sd * 0.008, y + r], [x + sd * 0.018, y + 0.5 * r], [x + sd * 0.018, y - 0.5 * r], [x - sd * 0.006, y - r], 8), 0.0085 * k, K.INK, 0.35);
// a big closed-teeth grin: a white D with its corners up in dimples, the bite line, a few tooth lines
MOUTHS.mBeam = (g, F, x0, y, k) => {
  const w = 0.105 * (F.mw || 1), up = 0.036, h = 0.082, L = [x0 - w, y + up], R = [x0 + w, y + up];
  const pts = [...K.bez(L, [x0 - w * 0.5, y + 0.006], [x0 + w * 0.5, y + 0.006], R, 18), ...K.bez(R, [x0 + w * 0.78, y - h], [x0 - w * 0.78, y - h], L, 22)];
  K.fill(g, pts, K.WHITE);
  g.save(); K.path(g, pts, true); g.clip();
  K.line(g, K.bez([x0 - w, y + up - 0.02], [x0 - w * 0.5, y - 0.032], [x0 + w * 0.5, y - 0.032], [x0 + w, y + up - 0.02], 16), 0.0085 * k);
  for (const u of [-0.5, 0, 0.5]) K.line(g, [[x0 + u * w, y + 0.04], [x0 + u * w, y - 0.08]], 0.007 * k);
  g.restore();
  K.path(g, pts, true); g.lineWidth = 0.017 * k; g.strokeStyle = K.INK; g.stroke();
  for (const sd of [-1, 1]) dimple(g, x0 + sd * (w + 0.004), y + up + 0.004, sd, k);
};
// a one-sided smirk: flat on one side, curling up into a dimple on the other (the side mSk points to)
MOUTHS.mSmirk = (g, F, x0, y, k) => {
  const w = 0.105 * (F.mw || 1), sd = (F.x.mSk || 0) < 0 ? -1 : 1, X = u => x0 + sd * u * w;
  K.taper(g, [...K.bez([X(-1), y - 0.006], [X(-0.4), y - 0.022], [X(0.35), y - 0.03], [X(0.8), y + 0.012], 12), ...K.bez([X(0.8), y + 0.012], [X(0.92), y + 0.026], [X(0.99), y + 0.038], [X(1.03), y + 0.052], 6)], 0.0195 * k, K.INK, 0.55);
  dimple(g, X(1.08), y + 0.05, sd, k, 0.03);
};
// a tall open oval, an eye wide (shock), in ink
MOUTHS.mGape = (g, F, x0, y, k) => {
  const w = 0.066 * (F.mw || 1), h = 1.34 * w, yc = y - 0.032;
  g.beginPath(); g.ellipse(x0, yc, w, h, 0, 0, 2 * Math.PI); g.fillStyle = K.INK; g.fill(); g.lineWidth = 0.012 * k; g.strokeStyle = K.INK; g.stroke();
};

// the s2 drawer, then the extras (drawn in the same face units as s2's own blush: cheeks at +-0.158, -0.112)
function widBlush(g, k) {
  for (const s of [-1, 1]) {
    const cx = s * 0.17, cy = -0.118;
    g.beginPath(); g.ellipse(cx, cy, 0.09, 0.028, 0, 0, 2 * Math.PI); g.fillStyle = BLUSH; g.fill();
    for (let j = -2; j <= 2; j++) K.taper(g, [[cx + j * 0.03 - 0.008, cy - 0.013], [cx + j * 0.03, cy], [cx + j * 0.03 + 0.008, cy + 0.013]], 0.0055 * k, BLUSH_INK, 0.35);
  }
}
const s2x = (g, F, blink, t, o) => {
  if ((F.x?.blushW || 0) >= 0.5 && !(o?.sl && Math.abs(o.sl[0]) > 1.1)) { g.save(); widBlush(g, 1); g.restore(); }   // under the eyes and mouth
  STYLE_DRAW.s2(g, F, blink, t, o);
};

const talking = (d, open, base) => ({ ...d, base, x: { ...(d.x || {}), mOpen: Math.max(d.x?.mOpen || 0, open) } });
export function use() {
  STYLE_DRAW.s2x = s2x; s2x.wrap = o => STYLE_DRAW.s2.wrap(o);
  for (const [k, d] of Object.entries(EXPR_DESIGNS)) { EXPR[k] = d; EXPR[`${k}_o`] = talking(d, 0.6, k); EXPR[`${k}_O`] = talking(d, 1, k); }
}
// registered on import: s2's own use() copies DESIGNS (and makes the twins); a render already in s2 gets them now
Object.assign(DESIGNS, EXPR_DESIGNS);
STYLE_DRAW.s2x = s2x; s2x.wrap = o => STYLE_DRAW.s2.wrap?.(o);
if (FACE_STYLE.name === 's2') use();
