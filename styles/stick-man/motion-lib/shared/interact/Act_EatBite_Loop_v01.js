// Act_EatBite_Loop: food held at the chest goes up to the mouth, the head leans in for the bite and holds it, tears it
// off with a small nod, the hand drops back while the jaw chews. A loop: it starts and ends on the same chest hold.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult'), F = { x_hpR_drumstick: 1 }, LH = { armL: { raise: 14, swing: 18, elbow: 70 } };
const R = (y, z, x = 0.26) => ({ armR: { ik: [x, y, z], ikw: 1 } });
const CHEST = merge(S0, F, LH, R(1.80, 0.50, 0.30));
const chew = { 'neck.nod': [1.5, 8] };
export default { name: 'Act_EatBite_Loop', clip: 'Act_EatBite_Loop', group: 'Act', loop: true, frames: 48, base: 'STAND', style: 'kaiships',
  needs: { props: ['drumstick'], hands: 'R' },
  keys: [
    K(0, CHEST, { cycle: chew }),
    K(13, merge(CHEST, R(2.24, 0.74, 0.16), { neck: { nod: 4 }, spine: { bend: 3 } })),     // up to the mouth
    K(16, merge(CHEST, R(2.24, 0.72, 0.16), { neck: { nod: 9 }, spine: { bend: 5 } })),     // the bite, held
    K(19, merge(CHEST, R(2.20, 0.74, 0.16), { neck: { nod: 9 }, spine: { bend: 5 } })),
    K(24, merge(CHEST, R(2.08, 0.78, 0.20), { neck: { nod: 2, tilt: 4 }, spine: { bend: 4 } })),   // tear it off
    K(36, CHEST, { cycle: chew }), K(48, CHEST, { cycle: chew })] };
