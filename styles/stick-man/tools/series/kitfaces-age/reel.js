// The age sheet's film (dev only): the s2 face's age layer (engine/facestyles/s2age.js) on one adult head, six faces held
// FACE frames each; the age comes from the page query (?age=elder | adult | teen | child_hi | toddler_lo |
// toddler_hi), so one film renders every row of the sheet. The body stays adult: the sheet judges the face alone.
//   node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/tools/series/kitfaces-age --query age=elder --frames 29,59,89,119,149,179 --out <dir>/elder_%d.jpg --w 720 --h 1280
//   ... --query 'faces=e_proud,e_guilty,...' (any kit or expression face instead of the six: the face-only sheet of
//   tools/series/kitexpr/sheet.mjs; frames i * 30 + 25)
import { stand, K, FY } from '/styles/stick-man/motion-lib/base.js';
import { SPECS } from '/styles/stick-man/engine/play.js';
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';
import '/styles/stick-man/engine/facestyles/s2expr.js';

const Q = new URLSearchParams(globalThis.location?.search || '');
export const FACE = 30;
export const FACES = Q.get('faces')?.split(',') ?? ['neutral', 'happy', 'sad', 'angry', 'shock', 'sleep'];
const AGE = Q.get('age') || 'adult';
// (stand() plants the feet for a figure facing +x; this one faces the lens, so they go left and right of it)
const FEET = { legL: { footW: [-FY, 0, 0] }, legR: { footW: [FY, 0, 0] } };
SPECS.AGEFACE = { ...bodySpec({ name: 'Face', shirt: [0.62, 0.62, 0.66], hair: [] }, 'adult'), faceAge: AGE, tidyFeet: true };
export const CUTS = [0];
export default {
  title: 'kit face ages', fps: 30, glasses: false, steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0,
  lines: [], show: [{ from: 0 }], beats: [], overlays: [], frames: [0, FACES.length * FACE - 1], name: 'kitfaces-age', headMarks: 'bold',
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.04, bloom: 0.05, hot: 0.1, ink: 2.4 },
  light: { sun: [1.0, 0.97, 0.93], power: 3.0, sky: [0.86, 0.86, 0.88], ground: [0.55, 0.55, 0.56], hemi: 0.5, fill: [0.95, 0.95, 1.0], fillPower: 0.4, sunDir: [0.35, 0.45, -0.85], background: [0.58, 0.58, 0.60] },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'motionlib', setModule: '/styles/stick-man/motion-lib/proof/set.js', setOpts: { marks: [], sc: 1 },
  cast: { face: { spec: 'AGEFACE', at: [0, 0, 0], yaw: 0, expr: FACES[0], focus: 'camera', lead: true } },
  anim: { face: FACES.map((expr, i) => K(i * FACE, stand('adult', 0), { ease: 'snap', yaw: 0, expr, ...FEET })) },
  direct: [{ at: { f: 0 }, intent: 'cu', why: 'the kit face age sheet', cut: 'cut', cam: { pos: [0, -2.6, 1.5], aim: [0, 0, 1.47], lens: 35 } }],
};
