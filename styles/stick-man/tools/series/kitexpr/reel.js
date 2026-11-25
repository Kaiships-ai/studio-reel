// The kit expression sheet (dev only): every expression in engine/expressions.js (face + pose + mark, one kit asset, the approved
// plan of 25/11) acted once on one adult figure framed from the knees up, each peak held, then the head marks on their own.
//   node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/tools/series/kitexpr --frames <PEAKS> --out review/e_%d.jpg --w 720 --h 1280
//   ... --query marks=classic (the film without its headMarks switch: the marks every other film draws; the old | new pictures)
//   ... --query sil=1 (the same frames on a flat key colour, no sky, no marks, a plain face: the silhouette pass)
//   node styles/stick-man/tools/series/kitexpr/sheet.mjs   -> the labelled sheets (peaks, silhouettes, 120 px heads)
import { SPECS } from '/styles/stick-man/engine/play.js';
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';
import { EXPRESSIONS, EXPRESSION_NAMES, expressionBeats, MIN_HOLD } from '/styles/stick-man/engine/expressions.js';
import { POSES } from '/styles/stick-man/engine/poses.js';
import { MOVE_T } from '/styles/stick-man/engine/acting.js';
import { MARK_NAMES } from '/styles/stick-man/engine/faces.js';
import { BOLD_MARKS } from '/styles/stick-man/engine/headmarks.js';

const Q = new URLSearchParams(globalThis.location?.search || ''), SIL = Q.get('sil') === '1', CLASSIC = Q.get('marks') === 'classic';
export const SLOT = 80, HOLD = 45, MARK_SLOT = 40;
// the frame each expression's peak is shown on the sheet: the pose risen (anticipation + action) and 26 f into the hold (every mark in full)
export const PEAKS = EXPRESSION_NAMES.map((n, i) => { const P = POSES[EXPRESSIONS[n].pose]; return i * SLOT + 6 + (P.A ?? 3) + Math.max(MOVE_T, P.T ?? 9) + (n === 'excited' ? 18 : 26); });   // (26 f in, excited blinks)
const M0 = EXPRESSION_NAMES.length * SLOT;
export const MARK_PEAKS = BOLD_MARKS.map((m, i) => M0 + i * MARK_SLOT + 20);
SPECS.KITEXPR = { ...bodySpec({ name: 'Expr', shirt: [0.62, 0.62, 0.66], hair: [] }, 'adult'), tidyFeet: true };
export const CUTS = [0];
const F1 = M0 + BOLD_MARKS.length * MARK_SLOT - 1;
const beats = EXPRESSION_NAMES.flatMap((n, i) => expressionBeats(n, { f: i * SLOT + 6 }, 'x', { hold: HOLD, ...(SIL ? { mark: null, face: 'neutral' } : CLASSIC ? { mark: null } : {}) }));
// the marks strip: a calm face, each mark alone for MARK_SLOT frames
beats.push({ f: M0, who: 'x', expr: 'neutral' });
if (!SIL) BOLD_MARKS.forEach((m, i) => (!CLASSIC || MARK_NAMES.includes(m)) && beats.push({ f: M0 + i * MARK_SLOT + 2, who: 'x', mark: [m, MARK_SLOT - 4] }));
export default {
  title: 'kit expressions', fps: 30, glasses: false, steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0, headMarks: CLASSIC ? undefined : 'bold',
  lines: [], show: [{ from: 0 }], beats, overlays: [], frames: [0, F1], name: 'kitexpr', auto: false,
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: SIL ? 0 : 0.04, bloom: SIL ? 0 : 0.05, hot: 0.1, ink: 2.4 },
  light: { sun: [1.0, 0.97, 0.93], power: 3.0, sky: [0.86, 0.86, 0.88], ground: [0.55, 0.55, 0.56], hemi: 0.5, fill: [0.95, 0.95, 1.0], fillPower: 0.4, sunDir: [0.35, 0.45, -0.85],
    background: SIL ? [0, 1, 0] : [0.58, 0.58, 0.60] },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, ...(SIL ? { sky: false, air: false } : {}) },
  set: 'kitexpr', setModule: '/styles/stick-man/tools/series/kitexpr/set.js', setOpts: { sil: SIL },
  cast: { x: { spec: 'KITEXPR', at: [0, 0, 0], yaw: 0, expr: 'neutral', focus: 'camera', lead: false } },
  direct: [{ at: { f: 0 }, intent: 'ms', why: 'the kit expression sheet, knees up', cut: 'cut', cam: { pos: [0, -2.6, 1.25], aim: [0, 0, 1.2], lens: 35 } }],
};
export { MIN_HOLD };
