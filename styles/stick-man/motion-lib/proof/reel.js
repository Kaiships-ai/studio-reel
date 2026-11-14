// The motion library's proof page (dev only): one clip on one body, physics on or off, a 3/4 camera that follows it.
//   node styles/stick-man/tools/shot.mjs --film styles/stick-man/motion-lib/proof --w 540 --h 960 --query "clip=Act_LiftHeavy_Once&body=adult&phys=0" --mp4 ...
//   query: clip (a clip name), body (default the clip's own, else adult), phys=0 (PHYS.on false), times (loop cycles, default 2)
// tools/motionlib.mjs --proof renders every clip through this page.
import '/styles/stick-man/allout/fx.js';                  // ao_anim: the set's keyed things (a bag on the floor, a dropped bag)
import '/styles/stick-man/motion-lib/props.js';
import { PHYS } from '/styles/stick-man/engine/body.js';
import { SPECS } from '/styles/stick-man/engine/play.js';
import { getClip, placeClip } from '/styles/stick-man/motion-lib/index.js';
import { stand, K } from '/styles/stick-man/motion-lib/base.js';
import { BODIES, bodySpec } from '/styles/stick-man/motion-lib/bodies.js';

const QS = new URLSearchParams(globalThis.location?.search || '');
const CLIP = QS.get('clip') || 'Idle_Breath_Loop', C0 = getClip(CLIP, QS.get('body') || 'adult'), BODY = QS.get('body') || C0.body || 'adult';
if (QS.get('phys') === '0') PHYS.on = false;
const C = getClip(CLIP, BODY), F0 = 6, sc = C.body ? 1 : (BODIES[BODY].spec.scale ?? 1);
SPECS.PROOF = bodySpec({ ...SPECS.GUARD, name: 'Proof', hair: [] }, BODY);
export const CUTS = [0];

// the clip key: a travelling loop walks a set distance (start, two cycles, stop); other loops repeat; a one-off plays once
const times = Number(QS.get('times') || 2);
const key = C.advance ? { f: F0, clip: CLIP, body: BODY, to: [C.introTravel + C.outroTravel + times * C.advance, 0] } : { f: F0, clip: CLIP, body: BODY, ...(C.loop ? { times } : {}) };
const first = C.base === 'CARRY' ? (C.advance ? C.intro[0] : C.keys[0]) : stand(BODY);
const anim = [K(0, first, { ease: 'snap' }), key];
const placed = placeClip(key, { pos: [0, 0], yaw: 90 }), last = placed.keys[placed.keys.length - 1].f;
const xs = placed.keys.map(k => k.pos?.[0] ?? 0), x0 = Math.min(0, ...xs), x1 = Math.max(0, ...xs), k = Math.max(0.72, sc);
const cam = x => ({ pos: [x + 1.6 * k, -3.0 * k, 1.1 * k], aim: [x + 0.15, 0, 0.8 * k], lens: 40 });
const direct = [{ at: { f: 0 }, intent: 'ws', why: 'P1 · motion library proof', cut: 'cut', cam: cam(x0),
  ...(x1 - x0 > 0.4 ? { to: cam(x1), move: { from: { f: F0 }, dur: Math.max(10, last - F0), ease: 'inout' } } : {}) }];

export default {
  title: `motion-lib ${CLIP} ${BODY}`, fps: 30, glasses: false, steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0,
  lines: [], show: [{ from: 0 }], beats: [], overlays: [], frames: [0, last + 12], name: 'motionlib',
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.04, bloom: 0.05, hot: 0.1, ink: 2.4 },
  light: { sun: [1.0, 0.97, 0.93], power: 3.0, sky: [0.86, 0.86, 0.88], ground: [0.55, 0.55, 0.56], hemi: 0.5, fill: [0.95, 0.95, 1.0], fillPower: 0.4,
    sunDir: [0.35, 0.45, -0.85], background: [0.58, 0.58, 0.60] },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, shoulder: 0.2 },
  set: 'motionlib', setModule: '/styles/stick-man/motion-lib/proof/set.js', setOpts: { marks: C.needs.marks || [], sc, f0: F0 },
  make: Object.fromEntries((C.needs.marks || []).map(m => (m.kind === 'bag' ? (m.drop ? 'bag_drop' : 'bag_floor') : m.kind === 'cash' ? 'cash_left' : null)).filter(Boolean).map(n => [n, { kind: 'ao_anim', prop: n }])),
  cast: { you: { spec: 'PROOF', at: [0, 0, 0], yaw: 90, expr: 'neutral', focus: 'camera', lead: true } },
  anim: { you: anim }, direct,
};
