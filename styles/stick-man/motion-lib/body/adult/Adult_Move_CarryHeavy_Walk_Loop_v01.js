// Adult_Move_CarryHeavy_Walk_Loop: one 25 kg bag in the right fist. Slow short steps, the knees giving at every
// contact, the body leaning away from the bag and the free arm out for balance; the bag arm held out so the bag clears
// the leg and swings a little with the steps; the shoulders tip away from the bag more on the bag-side step. Starts and ends on CARRY (pick it up with Act_LiftHeavy).
import { gaitLoop, carry, CARRY_KG } from '../../base.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', base: carry, S: 0.36, T: 21, bobC: -0.12, bobP: -0.03, bend: 4, sway: 4, nod: 3, lift: 0.07,
  upper: sgn => ({ armR: { raise: 26, swing: 4 + 2 * sgn, elbow: 6 }, armL: { raise: 70 + 4 * sgn, swing: 10 - 8 * sgn, elbow: 18 + 6 * sgn },
    shrugR: -0.08 - 0.02 * sgn, spine: { side: -17 - 3 * sgn }, neck: { tilt: 13 + 2 * sgn }, x_hpR_bag: 1, x_kgR: CARRY_KG }) });
export default { name: 'Adult_Move_CarryHeavy_Walk_Loop', clip: 'Move_CarryHeavy_Walk_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R' }, ...G };
