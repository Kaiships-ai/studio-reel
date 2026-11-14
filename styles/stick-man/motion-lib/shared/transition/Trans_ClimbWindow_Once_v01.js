// Trans_ClimbWindow_Once: climb through a low window (sill 0.55 m) and stand on the far side. A step to the wall, both
// hands on the sill, the right foot up onto it (the knee folds at the joint, the foot below the hip), the weight goes
// onto that foot and the hands as the hips rise over the sill (ducking under the top of the opening), the left leg
// comes over, down on the far side, the right foot off the sill, STAND 1.05 m on. The wall: clip space x 0.50-0.65 m,
// the opening 0.55-1.90 m high, 1.0 m wide. The hips rise on the standing leg (bob), never on gravity: a foot is always
// down. Every foot leaves a surface and reaches one straight up and down; knees point forward and up (explicit poles).
import { stand, K, merge, FY } from '../../base.js';

const S0 = stand('adult'), sill = 0.55, xs = 0.52;
// elbows out and back as the hands push down on the sill
const hands = (px, on = 1) => ({ armL: { ik: [-0.24, sill / 0.6 + 0.03, (xs - px) / 0.6], ikw: on, pole: [-0.7, -0.2, -0.7] }, armR: { ik: [0.24, sill / 0.6 + 0.03, (xs - px) / 0.6], ikw: on, pole: [0.7, -0.2, -0.7] } });
// the left leg swings over out to the side (a straddle, the knee out): folded under the hip it would knot
const L = (x, z = 0, pitch = 0, out = 0) => ({ legL: { footW: [x, -FY - out, z], pitch, knee: out ? [-1, 0.3, 0.6] : [-0.2, 0.6, 1] } }), R = (x, z = 0, pitch = 0) => ({ legR: { footW: [x, FY, z], pitch, knee: [0.2, 0.6, 1] } });
const end = 1.05;
export default { name: 'Trans_ClimbWindow_Once', clip: 'Trans_ClimbWindow_Once', group: 'Trans', loop: false, frames: 100, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: 'both', marks: [{ kind: 'window', at: [0.50, 0, 0.55], top: 1.90, depth: 0.15, width: 1.0 }] },
  keys: [
    K(0, merge(S0, hands(0, 0))),
    K(3, merge(S0, hands(0.02, 0), { pos: [0.02, 0, 0], bob: -0.02 }, R(0, 0.03, -20))),                               // a step to the wall
    K(7, merge(S0, hands(0.07, 0), { pos: [0.07, 0, 0], bob: 0.02 }, R(0.15, 0.08, -10))),
    K(10, merge(S0, hands(0.11, 0), { pos: [0.11, 0, 0] }, R(0.28, 0.03, 6))),
    K(13, merge(S0, hands(0.13, 0), { pos: [0.13, 0, 0] }, R(0.28))),
    K(19, merge(S0, hands(0.14), { pos: [0.14, 0, 0], bob: -0.12, spine: { bend: 24 }, neck: { nod: -6 } }, R(0.28))),   // hands on the sill
    K(22, merge(S0, hands(0.15), { pos: [0.15, 0, 0], bob: -0.12, spine: { bend: 26 } }, R(0.28, 0.04, -20))),
    K(27, merge(S0, hands(0.17), { pos: [0.17, 0, 0], bob: -0.10, spine: { bend: 28 } }, R(0.40, sill + 0.10, -10))),       // the knee comes up, the foot over the sill's edge
    K(31, merge(S0, hands(0.19), { pos: [0.19, 0, 0], bob: -0.10, spine: { bend: 28 } }, R(0.58, sill + 0.03, 4))),
    K(33, merge(S0, hands(0.20), { pos: [0.20, 0, 0], bob: -0.10, spine: { bend: 28 } }, R(0.58, sill))),                   // planted on the sill
    K(38, merge(S0, hands(0.26), { pos: [0.26, 0, 0], bob: -0.02, spine: { bend: 32 } }, R(0.58, sill), L(0, 0.04, -20))),  // the weight onto it: the left heel peels
    K(48, merge(S0, hands(0.50, 0.4), { pos: [0.50, 0, 0], bob: 0.12, spine: { bend: 40 }, neck: { nod: -16 } }, R(0.58, sill), L(0.40, sill + 0.10, -15, 0.30))),   // up over the sill, ducking
    K(56, merge(S0, hands(0.64, 0), { pos: [0.64, 0, 0], bob: 0.10, spine: { bend: 34 }, neck: { nod: -12 } }, R(0.58, sill), L(0.86, sill + 0.08, -10, 0.25))),   // the left leg over
    K(61, merge(S0, hands(0.74, 0), { pos: [0.74, 0, 0], bob: 0.04, spine: { bend: 28 }, neck: { nod: -6 } }, R(0.58, sill), L(end, 0.06, 6))),
    K(65, merge(S0, hands(0.80, 0), { pos: [0.80, 0, 0], bob: -0.10, spine: { bend: 24 }, neck: { nod: -4 } }, R(0.58, sill), L(end))),         // down on the far side
    K(68, merge(S0, hands(0.84, 0), { pos: [0.84, 0, 0], bob: -0.08, spine: { bend: 20 } }, R(0.58, sill + 0.04, -20), L(end))),
    K(73, merge(S0, hands(0.90, 0), { pos: [0.90, 0, 0], bob: -0.03, spine: { bend: 14 } }, R(0.82, sill + 0.12, -10), L(end))),             // the right foot off the sill
    K(77, merge(S0, hands(0.96, 0), { pos: [0.96, 0, 0], bob: -0.03, spine: { bend: 10 } }, R(end, 0.05, 6), L(end))),
    K(81, merge(S0, hands(0.99, 0), { pos: [0.99, 0, 0], bob: -0.04, spine: { bend: 8 } }, R(end), L(end))),
    K(100, merge(stand('adult', end), hands(end, 0)))] };
