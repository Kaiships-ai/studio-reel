// Adult_Move_CarryHeavy_Run_Loop: the same bag at a heavy run. Long ground contact, a short low flight (the load keeps
// the body down), the bag arm stiff and out, the free arm pumping wide. Starts and ends on CARRY.
import { gaitLoop, carry, CARRY_KG } from '../../base.js';

const G = gaitLoop({ body: 'adult', kind: 'run', base: carry, S: 0.70, T: 12, ts: 7, bobC: -0.16, bobP: -0.08, bend: 14, sway: 3, nod: 2.5, lift: 0.16,
  upper: sgn => ({ armR: { raise: 28, swing: 6 + 4 * sgn, elbow: 16 }, armL: { raise: 40, swing: 10 - 30 * sgn, elbow: 70 },
    spine: { side: -8 - 2 * sgn }, x_hpR_bag: 1, x_kgR: CARRY_KG }) });
export default { name: 'Adult_Move_CarryHeavy_Run_Loop', clip: 'Move_CarryHeavy_Run_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R' }, ...G };
