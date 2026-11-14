// Move_WalkFlashlight_Loop: a cautious search walk with a flashlight held out in the right fist, waist high, the beam
// ahead; the light arm stays steady (the body bobs under it), the left arm swings small, the head slightly forward.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', S: 0.45, T: 17, bend: 6, nod: 1, sway: 1.5, bobC: -0.06, bobP: 0.01,
  upper: sgn => ({ armR: { raise: 14, swing: 76, elbow: 14 }, armL: { raise: 14, swing: -12 * sgn, elbow: 30 }, neck: { nod: 4 }, x_hpR_torch: 1 }) });
export default { name: 'Move_WalkFlashlight_Loop', clip: 'Move_WalkFlashlight_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: ['torch'], hands: 'R' }, ...G };
