// The kit face sheet's film (dev only): the kit's face catalogue (engine/facestyles/s2.js: Kai 25/11, every face in the H2
// V2.1 style, no dot eyes), every name a character can use, one at a time on one head, each held FACE frames. Its face sheet is approved once for every film:
//   node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/tools/series/kitfaces --frames all --dbg styles/stick-man/tools/series/kitfaces/review/shot-rows.jsonl --w 720 --h 1280
//   node styles/stick-man/tools/series/facesheet.mjs styles/stick-man/tools/series/kitfaces --h 1280     -> review/face-sheet.jpg, its hash
//   node styles/stick-man/tools/series/facesheet.mjs styles/stick-man/tools/series/kitfaces --approve "<Kai's words, time>" --sheet <hash>
// facebeat.mjs (3) then passes these designs in every film, for any character.
import { stand, K } from '/styles/stick-man/motion-lib/base.js';
import { SPECS } from '/styles/stick-man/engine/play.js';
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';
import { DESIGNS, ALIASES, PURPOSE } from '/styles/stick-man/engine/facestyles/s2.js';

export const FACE = 30;
export const FACES = [...new Set([...Object.keys(PURPOSE), ...Object.keys(DESIGNS), ...Object.keys(ALIASES)])];
SPECS.KITFACE = bodySpec({ name: 'Face', shirt: [0.62, 0.62, 0.66], hair: [] }, 'adult');
export const CUTS = [0];
const F1 = FACES.length * FACE - 1;
export default {
  title: 'kit faces', fps: 30, glasses: false, steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0,
  lines: [], show: [{ from: 0 }], beats: [], overlays: [], frames: [0, F1], name: 'kitfaces',
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.04, bloom: 0.05, hot: 0.1, ink: 2.4 },
  light: { sun: [1.0, 0.97, 0.93], power: 3.0, sky: [0.86, 0.86, 0.88], ground: [0.55, 0.55, 0.56], hemi: 0.5, fill: [0.95, 0.95, 1.0], fillPower: 0.4, sunDir: [0.35, 0.45, -0.85], background: [0.58, 0.58, 0.60] },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'motionlib', setModule: '/styles/stick-man/motion-lib/proof/set.js', setOpts: { marks: [], sc: 1 },
  cast: { face: { spec: 'KITFACE', at: [0, 0, 0], yaw: 0, expr: FACES[0], focus: 'camera', lead: true } },
  anim: { face: FACES.map((expr, i) => K(i * FACE, stand('adult', 0), { ease: 'snap', yaw: 0, expr })) },
  direct: [{ at: { f: 0 }, intent: 'cu', why: 'the kit face sheet', cut: 'cut', cam: { pos: [0, -2.6, 1.5], aim: [0, 0, 1.47], lens: 35 } }],
};
