// Adult_Trans_JumpWindow_Once: a bag in the right fist, a sprint from standing and a flying leap out through a window
// (sill 0.92 m, top 1.95 m in the capture's metres), a landing at a run and a stop, from three Mixamo captures joined
// (ref/mocap.js mocapJoin, each carrying on where the one before leaves the body): "Idle To Sprint", "Jumping" (genre
// Superhero), "Run To Stop". Hot Money ep01 (SH155: out of room 9's back window with the money).
// The window stands where the leap's whole body crosses highest: at 4.1 m every joint goes over 1.02 m and under 1.83 m
// (the right hand, with the bag, over at 1.65 m: the bag hangs clear of the sill; the left one would drag it through)
import { mocapClip, carry, CARRY_KG } from '../../base.js';
import { mocapJoin } from '../../ref/mocap.js';
import SPRINT from '../../ref/mixamo/idle_to_sprint.js';
import LEAP from '../../ref/mixamo/jumping_superhero.js';
import STOP from '../../ref/mixamo/run_to_stop.js';

const SRC = mocapJoin([{ src: SPRINT }, { bridge: 2 }, { src: LEAP, follow: true }, { bridge: 3 }, { src: STOP, follow: true }], {
  source: 'Mixamo "Idle To Sprint" + "Jumping" + "Run To Stop", joined (mocapJoin)',
  marks: [{ kind: 'window', at: [4.1, 0, 0.92], top: 1.95, depth: 0.15, width: 1.5 }] });
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
// the bag (~10 kg) in the right fist all through. A sprinter's pumping arm would swing it into the legs: on the ground
// the bag arm is mostly CARRY's held 8 deg wider (straight, out from the leg), the capture's swing a fifth of it; eased
// from STAND's arm at the start and back to it at the end. L0..L1: the leap's frames in this clip (ease, sprint, bridge)
const BAG = { x_hpR_bag: 1, x_kgR: Math.round(CARRY_KG * 0.4) }, CA = { ...carry('adult').armR, raise: carry('adult').armR.raise + 8 }, ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
const L0 = 14 + SPRINT.frames.length + 2, L1 = L0 + LEAP.frames.length, T = M.frames;
// in the leap the legs tuck and the right one kicks out under the bag: the bag arm goes out wide to the side (OUT),
// the bag clear of the knee, then back to CARRY's for the landing
const OUT = { raise: 60, swing: 20, elbow: 10, roll: 0 }, inLeap = f => Math.min(ease((f - L0) / 6), ease((L1 - f) / 6));
const armed = k => { const g = 0.8 * Math.min(ease(k.f / 14), ease((T - k.f) / 14)), l = inLeap(k.f), a = k.armR, w = g * (1 - l) + 0.7 * l;
  const tgt = n => CA[n] + (OUT[n] - CA[n]) * l;
  return { ...k, ...BAG, armR: { ...a, raise: a.raise + (tgt('raise') - a.raise) * w, swing: a.swing + (tgt('swing') - a.swing) * w, elbow: a.elbow + (tgt('elbow') - a.elbow) * w, roll: a.roll * (1 - w) } }; };
export default { name: 'Adult_Trans_JumpWindow_Once', clip: 'Trans_JumpWindow_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: M.marks }, keys: M.keys.map(armed), captured: M.captured, rest: M.rest };
