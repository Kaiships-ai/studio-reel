// The motion library's proof page (dev only): one clip on one body, physics on or off, a 3/4 camera that follows it.
//   node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/motion-lib/proof --w 540 --h 960 --query "clip=Act_PickUp_Once&body=adult&phys=0" --mp4 ...
//   query: clip (a clip name), view (side | turn: see below), body (default the clip's own, else adult), phys=0 (PHYS.on false), times (loop cycles, default 2),
//          swap (a film's prop for a clip's, as JSON: a prop kind or its contract, swap={"phone":{"mode":"up","grip":[0,0,0],"size":[0.406,0.098,0.07]}}),
//          ov (an overlays list as JSON, drawn over the clip: engine/overlays.js)
// tools/gates/motionlib.mjs --proof renders every clip through this page.
import { sizedBag, propSwap } from '/styles/stick-man/motion-lib/props.js';
import { PHYS } from '/styles/stick-man/engine/body.js';
import { SPECS } from '/styles/stick-man/engine/play.js';
import { getClip, placeClip } from '/styles/stick-man/motion-lib/index.js';
import { stand, K } from '/styles/stick-man/motion-lib/base.js';
import { BODIES, bodySpec } from '/styles/stick-man/motion-lib/bodies.js';

const QS = new URLSearchParams(globalThis.location?.search || '');
// fit: the clip fitted to a set, as JSON (fit={"lip":0.85}); a fit that names a bag's size ({"bag":{"w":0.36,"l":0.62,"h":0.30,"grip":0.415}})
// plays a kit bag of that size (props.js sizedBag)
const FIT = QS.get('fit') ? JSON.parse(QS.get('fit')) : null, SWAP = { ...(FIT?.bag ? { bag: sizedBag(FIT.bag) } : {}), ...propSwap(QS.get('swap') ? JSON.parse(QS.get('swap')) : {}) };
const CLIP = QS.get('clip') || 'Idle_Stand_Loop', C0 = getClip(CLIP, QS.get('body') || 'adult'), BODY = QS.get('body') || C0.body || 'adult';
if (QS.get('phys') === '0') PHYS.on = false;
const C = getClip(CLIP, BODY, FIT), F0 = 6, sc = C.body ? 1 : (BODIES[BODY].spec.scale ?? 1);
SPECS.PROOF = bodySpec({ ...SPECS.GUARD, name: 'Proof', ...(C0.needs?.cap ? {} : { hair: [] }) }, BODY);   // (a clip made for a capped figure wears the cap)
export const CUTS = [0];

// the clip key: a travelling loop walks a set distance (start, two cycles, stop); other loops repeat; a one-off plays once
const times = Number(QS.get('times') || 2);
const key = { ...(C.advance ? { f: F0, clip: CLIP, body: BODY, to: [C.introTravel + C.outroTravel + times * C.advance, 0] } : { f: F0, clip: CLIP, body: BODY, ...(C.loop ? { times } : {}) }), ...(FIT ? { fit: FIT } : {}), ...(Object.keys(SWAP).length ? { swap: SWAP } : {}) };
// (the actor stands in the clip's own first pose before it starts: a clip that opens holding something holds it from frame 0)
// (a swapped prop is held by that name from frame 0 too: the kit's own would be a second prop in the hand)
const first0 = C.base !== 'STAND' ? (C.advance ? C.intro[0] : C.keys[0]) : stand(BODY);
const first = Object.fromEntries(Object.entries(first0).map(([n, v]) => { const m = /^x_hp([LRBH])_(\w+)$/.exec(n); return [m && key.swap?.[m[2]] ? `x_hp${m[1]}_${key.swap[m[2]]}` : n, v]; }));
const anim = [K(0, first, { ease: 'snap' }), key];
const placed = placeClip(key, { pos: [0, 0], yaw: 90 }), last = placed.keys[placed.keys.length - 1].f;
const xs = placed.keys.map(k => k.pos?.[0] ?? 0), x0 = Math.min(0, ...xs), x1 = Math.max(0, ...xs), k = Math.max(0.72, sc);
// a 3/4 view from ahead, on the side of the hand that holds the load (a bag in the right fist: the figure's right, +y), so
// the load is in front of the legs, never read through them; a clip at a wall (a window) is seen side-on from beyond
// a clip at a wall (a window) is seen the same way: the proof set's wall is see-through
// (the side of the hand that holds the prop: a phone at the right ear is seen from the right, a torch in the left fist from
// the left; a bag clip and a window from the right, as before)
const window_ = (C.needs.marks || []).some(m => m.kind === 'window'), H = C.needs.hands;
const right = H === 'R' || window_ || (C.needs.props || []).includes('bag') ? 1 : H === 'L' ? -1 : -1;
// a run outpaces the camera's eased move through its middle (its start and stop are slow), so the camera stands further back
const far = C.advance && /Run/.test(CLIP) ? 1.4 : 1;
// &view=side: straight side-on (the view animators judge a walk or a run in)
// (&wide=1: from further back and aimed ahead of the body, so a prop it sets down or pushes in front stays in the frame)
const side = QS.get('view') === 'side', wide = QS.get('wide') === '1' ? { d: 1.8, ahead: 0.45 } : { d: 1, ahead: 0 };
const cam = x => (side ? { pos: [x + wide.ahead, -3.0 * k * wide.d, 0.85 * k], aim: [x + wide.ahead, 0, 0.75 * k], lens: 40 } : { pos: [x + 1.6 * k * far, right * 3.0 * k * far, 1.1 * k], aim: [x + 0.15, 0, 0.8 * k], lens: 40 });
// the side view tracks the body: short linear moves from where the body is to where it will be, each starting where
// the last ended (a cut to the same camera does not show), so a fast run stays in the middle of the frame
const xAt = f => { const K = placed.keys; let i = 0; while (i < K.length - 1 && K[i + 1].f <= f) i++; const a = K[i], b = K[Math.min(K.length - 1, i + 1)];
  const xa = a.pos?.[0] ?? 0, xb = b.pos?.[0] ?? xa; return b.f > a.f ? xa + (xb - xa) * Math.max(0, Math.min(1, (f - a.f) / (b.f - a.f))) : xa; };
const SEG = 4, track = [];
if (side) for (let f = 0; f < last + 12; f += SEG) track.push({ at: { f }, intent: 'ws', why: 'P1 · motion library proof (side, tracking)', cut: 'cut', cam: cam(xAt(f)),
  to: cam(xAt(f + SEG)), move: { from: { f }, dur: SEG, ease: 'linear' } });
// &view=turn&az=<deg>&at=<frame>: a still camera round the body where it is at that frame, az 0 = from ahead (the face),
// 90 = from its left, 180 = from behind (tools/gates/rigtest.mjs: the rig sheet's turnaround)
const turn = QS.get('view') === 'turn', az = Number(QS.get('az') || 0) * Math.PI / 180, at = Number(QS.get('at') || F0);
const orbit = x => ({ pos: [x + 3.2 * k * Math.cos(az), 3.2 * k * Math.sin(az), 1.15 * k], aim: [x, 0, 1.05 * k], lens: 40 });
const direct = turn ? [{ at: { f: 0 }, intent: 'ws', why: 'P1 · rig turnaround', cut: 'cut', cam: orbit(xAt(at)) }] : side ? track : [{ at: { f: 0 }, intent: 'ws', why: 'P1 · motion library proof', cut: 'cut', cam: cam(x0),
  ...(x1 - x0 > 0.4 ? { to: cam(x1), move: { from: { f: F0 }, dur: Math.max(10, last - F0), ease: 'inout' } } : {}) }];

export default {
  title: `motion-lib ${CLIP} ${BODY}`, fps: 30, glasses: false, faceStyle: 'kit', steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0,
  lines: [], show: [{ from: 0 }], beats: [], overlays: QS.get('ov') ? JSON.parse(QS.get('ov')) : [], frames: [0, last + 12], name: 'motionlib',
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.04, bloom: 0.05, hot: 0.1, ink: 2.4 },
  light: { sun: [1.0, 0.97, 0.93], power: 3.0, sky: [0.86, 0.86, 0.88], ground: [0.55, 0.55, 0.56], hemi: 0.5, fill: [0.95, 0.95, 1.0], fillPower: 0.4,
    sunDir: [0.35, 0.45, -0.85], background: [0.58, 0.58, 0.60] },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, shoulder: 0.2 },
  set: 'motionlib', setModule: '/styles/stick-man/motion-lib/proof/set.js', setOpts: { marks: C.needs.marks || [], sc },
  cast: { you: { spec: 'PROOF', at: [0, 0, 0], yaw: 90, expr: 'neutral', focus: 'camera', lead: true } },
  anim: { you: anim }, direct,
};
