// React_FreezeInLight_Once: caught in a light. A jolt back with the hands flying up half way, then a freeze: rigid,
// a fine tremble, nothing else moves for a second and a half, then the slow let-down to STAND. The face is the film's
// (key `expr` on the clip key; a take lands in 3 frames).
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult');
const TAKE = merge(S0, { bob: 0.02, spine: { bend: -9 }, neck: { nod: -6 }, armL: { raise: 26, swing: 24, elbow: 70 }, armR: { raise: 26, swing: 24, elbow: 70 } });
const FROZEN = merge(TAKE, { bob: 0.0, spine: { bend: -7 } });
const tremble = { 'spine.side': [0.5, 6], 'neck.tilt': [0.6, 5], 'armR.elbow': [1.5, 4], 'armL.elbow': [1.5, 5] };
export default { name: 'React_FreezeInLight_Once', clip: 'React_FreezeInLight_Once', group: 'React', loop: false, frames: 90, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null },
  keys: [K(0, S0), K(3, merge(S0, { bob: -0.02, spine: { bend: 3 } })), K(10, TAKE), K(14, FROZEN, { cycle: tremble }), K(58, FROZEN, { cycle: tremble }),
    K(74, merge(S0, { spine: { bend: -2 }, armL: { raise: 16, swing: 8, elbow: 30 }, armR: { raise: 16, swing: 8, elbow: 30 } })),
    K(90, S0)] };
