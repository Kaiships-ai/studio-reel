// Adult_Act_HandOver_Once: reach forward and hand a bundle of cash over a counter, leaving it there, from motion capture
// (Quaternius UAL "Interact", CC0, ref/ual/interact.js) on this body, every captured frame. The cash (motion-lib/props.js
// cash) is in the left fist until it comes down onto the counter (RELEASE), then lies there (engine/propobj.js). The counter:
// its front 0.60 m ahead, its top 0.94 m (the fist rises, the cash rides up over the counter's edge where it meets it: ref/reach/handover_counter.js,
// tools/run/mocap_contact.mjs Act_HandOver_Once L 4 <out> set 24: one table from the first touch to the last; re-run when the
// clip changes), reaches over and sets the cash down. Hot Money ep01 (SH230: a bank counter 1.12 m high).
// Fitted to the set's counter: the clip key's `fit: { top }` (m, 0.80..1.20; index.js placeClip) raises the hand by the
// top's height over 0.94 m all through the table (eased on over its first and off over its last 5 frames), so the cash
// rides over the counter's edge and is set down on its top; the counter mark takes the set's height.
import { mocapClip, holdKeys, reachKeys } from '../../base.js';
import SRC from '../../ref/ual/interact.js';
import EDGE from '../../ref/reach/handover_counter.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
// (measured through the rig, tools/gates/motionlib.mjs rigClip, from the clip's origin, its first key; re-measure when the clip changes)
const RELEASE = 48, o = M.keys[0].pos, TOP0 = 0.94, ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
function make({ top = TOP0 } = {}) {
  if (!(top >= 0.8 && top <= 1.2)) throw new Error(`Act_HandOver_Once: fit.top ${top} m is outside 0.80..1.20`);
  const dz = (top - TOP0) / 0.6, f0 = EDGE.rows[0][0], f1 = EDGE.rows[EDGE.rows.length - 1][0], w = f => Math.min(ease((f - f0) / 5), ease((f1 - f) / 5));
  const rows = EDGE.rows.map(r => [r[0], r[1], r[2] + dz * w(r[0]), ...r.slice(3)]);
  return { name: 'Adult_Act_HandOver_Once', clip: 'Act_HandOver_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
    fit: make, fitted: { top }, fitChecks: [{ top: 1.12 }],
    needs: { props: ['cash'], hands: 'L', marks: [...M.marks, { kind: 'counter', at: [o[0] + 0.60, o[1], top] }] }, keys: reachKeys(holdKeys(M.keys, 'L', 'cash', { to: RELEASE }), { ...EDGE, rows }), captured: M.captured, rest: M.rest };
}
export default make();
