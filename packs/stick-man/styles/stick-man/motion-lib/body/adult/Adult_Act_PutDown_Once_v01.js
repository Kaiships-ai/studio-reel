// Adult_Act_PutDown_Once: from CARRY (the bag in the right fist), bend and set it down on the floor, stand up, from
// motion capture (Quaternius UAL 2 "Farm_Harvest", CC0, ref/ual/farm_harvest.js, played backwards) on this body. The
// fist dwells at its lowest for DWELL frames; the bag leaves it in the middle of the dwell (RELEASE) and stays on the
// floor (engine/propobj.js).
import { mocapClip, holdKeys, bagBend, CARRY_KG } from '../../base.js';
import HARVEST from '../../ref/ual/farm_harvest.js';

// the capture reaches down between its feet; a bag there would stand in the right foot, so over the bend the right hand
// (and half as much the forearm) is carried OUT metres out to the figure's right (the capture's -x)
const LOW = 36, DWELL = 8, OUT = 0.12, ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
const out = i => OUT * (i < 10 ? 0 : i < 28 ? ease((i - 10) / 18) : i <= 44 ? 1 : i < 62 ? ease((62 - i) / 18) : 0);
const F = HARVEST.frames.map((f, i) => ({ ...f, RightHand: [f.RightHand[0] - out(i), f.RightHand[1], f.RightHand[2]],
  RightForeArm: [f.RightForeArm[0] - out(i) / 2, f.RightForeArm[1], f.RightForeArm[2]] }));
const SRC = { ...HARVEST, frames: [...F.slice(0, LOW + 1), ...Array(DWELL).fill(F[LOW]), ...F.slice(LOW + 1)].reverse() };
const M = mocapClip({ body: 'adult', src: SRC, base: 'CARRY', end: 'STAND' });
export const RELEASE = SRC.frames.length - 1 - (LOW + DWELL / 2);
// the bag arm 30 deg wider over the bend (it clears the leg) and the knees a little deeper, so the bag is let go just
// over the floor (measured: the gate's drop is at most 1 cm more than gravity)
const keys = bagBend(holdKeys(M.keys, 'R', 'bag', { to: RELEASE, kg: CARRY_KG }), 'R', { out: [0, 18, 52, 66], deg: 30, dip: 0.05 });
export default { name: 'Adult_Act_PutDown_Once', clip: 'Act_PutDown_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: M.marks }, keys, captured: M.captured, rest: M.rest };
