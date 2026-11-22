// Adult_Act_PickUp_Once: bend down, pick the bag up off the floor in the right fist, stand up into CARRY, from motion
// capture (Quaternius UAL 2 "Farm_Harvest", CC0, ref/ual/farm_harvest.js) on this body. The capture scoops without a
// stop, so the fist dwells at its lowest (LOW) for DWELL frames to close on the handle: the bag lies on the floor where
// the fist will take it (engine/propobj.js) until GRAB, in the middle of the dwell, then hangs from it (motion-lib/props.js bag).
import { mocapClip, holdKeys, bagBend, CARRY_KG } from '../../base.js';
import HARVEST from '../../ref/ual/farm_harvest.js';

// the capture reaches down between its feet; a bag there would stand in the right foot, so over the bend the right hand
// (and half as much the forearm) is carried OUT metres out to the figure's right (the capture's -x)
const LOW = 36, DWELL = 8, OUT = 0.12, ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
const out = i => OUT * (i < 10 ? 0 : i < 28 ? ease((i - 10) / 18) : i <= 44 ? 1 : i < 62 ? ease((62 - i) / 18) : 0);
const F = HARVEST.frames.map((f, i) => ({ ...f, RightHand: [f.RightHand[0] - out(i), f.RightHand[1], f.RightHand[2]],
  RightForeArm: [f.RightForeArm[0] - out(i) / 2, f.RightForeArm[1], f.RightForeArm[2]] }));
const SRC = { ...HARVEST, frames: [...F.slice(0, LOW + 1), ...Array(DWELL).fill(F[LOW]), ...F.slice(LOW + 1)] };
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'CARRY' });
export const GRAB = LOW + DWELL / 2;
// the bag arm carried 40 deg wider over the bend so the bag clears the leg (measured: a deeper knee dip left the fist
// below the bag's rest, and the bag jumped to it)
const keys = bagBend(holdKeys(M.keys, 'R', 'bag', { from: GRAB, kg: CARRY_KG }), 'R', { out: [16, 30, 64, 82], deg: 40, dip: 0 });
export default { name: 'Adult_Act_PickUp_Once', clip: 'Act_PickUp_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: M.marks }, keys, captured: M.captured, rest: M.rest };
