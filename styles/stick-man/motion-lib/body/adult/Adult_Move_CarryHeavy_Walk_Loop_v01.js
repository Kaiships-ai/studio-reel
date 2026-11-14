// Adult_Move_CarryHeavy_Walk_Loop: one 25 kg bag in the right fist. Slow short steps, the knees giving at every
// contact, the body leaning away from the bag and the free arm out for balance; the bag arm held out so the bag clears
// the leg and swings a little with the steps; the shoulders tip away from the bag more on the bag-side step. Starts and ends on CARRY (pick it up with Act_LiftHeavy).
import { gaitLoop, carry, CARRY_KG } from '../../base.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', base: carry, S: 0.42, T: 18, bobC: -0.09, bobP: -0.01, bend: 6, sway: 3, nod: 2, lift: 0.08,
  upper: sgn => ({ armR: { raise: 24, swing: 4 + 2 * sgn, elbow: 8 }, armL: { raise: 56 + 3 * sgn, swing: 10 - 10 * sgn, elbow: 22 + 6 * sgn },
    spine: { side: -12 - 2 * sgn }, neck: { tilt: 9 + 2 * sgn }, x_hpR_bag: 1, x_kgR: CARRY_KG }) });
export default { name: 'Adult_Move_CarryHeavy_Walk_Loop', clip: 'Move_CarryHeavy_Walk_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R' }, ...G };
