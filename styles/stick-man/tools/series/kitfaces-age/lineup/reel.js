// The age line-up (dev only): the s2 face's ages on their real bodies (motion-lib/bodies.js), side by side in one frame,
// knees up, neutral then happy (FACE frames each). Elder on the elder body, adult and teen on the adult body, child and
// toddler on the child body; the face's age is spec.faceAge (engine/facestyles/s2age.js).
//   node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/tools/series/kitfaces-age/lineup --frames 29,59 --out <dir>/lineup_%d.jpg --w 1280 --h 720
import { stand, K, FY } from '/styles/stick-man/motion-lib/base.js';
import { SPECS } from '/styles/stick-man/engine/play.js';
import { BODIES, bodySpec } from '/styles/stick-man/motion-lib/bodies.js';

export const FACE = 30;
export const FACES = ['neutral', 'happy'];
const Q = new URLSearchParams(globalThis.location?.search || '');
const TODDLER = Q.get('kid') === 'hi' ? 'toddler_hi' : 'toddler';   // (default: toddler_lo) ?kid=hi: his eyes high
const WHO = [['elder', 'elder', 'elder', [0.66, 0.6, 0.56]], ['adult', 'adult', 'adult', [0.62, 0.62, 0.66]], ['teen', 'adult', 'teen', [0.46, 0.6, 0.78]],
  ['child', 'child', 'child', [0.86, 0.62, 0.42]], ['toddler', 'child', TODDLER, [0.6, 0.78, 0.5]]];
const DX = 0.78, X0 = -DX * (WHO.length - 1) / 2;
const cast = {}, anim = {};
WHO.forEach(([who, body, age, shirt], i) => {
  const x = X0 + DX * i, sp = `AGE_${who.toUpperCase()}`;
  SPECS[sp] = { ...bodySpec({ name: who, shirt, hair: [] }, body), faceAge: age, tidyFeet: true };
  // (stand() plants the feet for a figure facing +x; these face the lens, so they go left and right of it)
  const fy = FY * (BODIES[body].spec.scale ?? 1) * BODIES[body].stance, feet = { legL: { footW: [x - fy, 0, 0] }, legR: { footW: [x + fy, 0, 0] } };
  cast[who] = { spec: sp, at: [x, 0, 0], yaw: 0, expr: FACES[0], focus: 'camera', lead: i === 1 };
  anim[who] = FACES.map((expr, j) => K(j * FACE, stand(body, x), { ease: 'snap', yaw: 0, expr, ...feet }));
});
export const CUTS = [0];
export default {
  title: 'kit face age line-up', fps: 30, glasses: false, steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0,
  lines: [], show: [{ from: 0 }], beats: [], overlays: [], frames: [0, FACES.length * FACE - 1], name: 'kitfaces-age-lineup',
  headMarks: 'bold',
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.04, bloom: 0.05, hot: 0.1, ink: 2.4 },
  light: { sun: [1.0, 0.97, 0.93], power: 3.0, sky: [0.86, 0.86, 0.88], ground: [0.55, 0.55, 0.56], hemi: 0.5, fill: [0.95, 0.95, 1.0], fillPower: 0.4, sunDir: [0.35, 0.45, -0.85], background: [0.58, 0.58, 0.60] },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'motionlib', setModule: '/styles/stick-man/motion-lib/proof/set.js', setOpts: { marks: [], sc: 1 },
  cast, anim,
  direct: [{ at: { f: 0 }, intent: 'ws', why: 'the age line-up, knees up', cut: 'cut', cam: { pos: [0, -3.4, 1.1], aim: [0, 0, 1.1], lens: 35 } }],
};
