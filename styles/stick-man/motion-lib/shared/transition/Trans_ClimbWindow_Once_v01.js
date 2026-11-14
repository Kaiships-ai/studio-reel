// Trans_ClimbWindow_Once: climb through a low window and stand on the far side. A step to the wall, both hands on the
// sill, the right foot up over the sill onto it, the push up (the body ducks under the top of the opening), the left leg
// over, down on the far side, the right foot off the sill, STAND 1.05 m on. The wall: clip space x 0.50-0.65 m, the
// opening 0.80-1.90 m high, 1.0 m wide. The hips rise on the stance leg (bob), never on gravity: a foot is always down.
import { stand, K, merge, FY } from '../../base.js';

const S0 = stand('adult'), sill = 0.80, xs = 0.52;
const hands = (px, on = 1) => ({ armL: { ik: [-0.24, sill / 0.6 + 0.03, (xs - px) / 0.6], ikw: on }, armR: { ik: [0.24, sill / 0.6 + 0.03, (xs - px) / 0.6], ikw: on } });
const L = (x, z = 0, pitch = 0) => ({ legL: { footW: [x, -FY, z], pitch } }), R = (x, z = 0, pitch = 0) => ({ legR: { footW: [x, FY, z], pitch } });
const end = 1.05;
// every foot leaves the floor and reaches it straight up and down (a foot on the floor never slides)
export default { name: 'Trans_ClimbWindow_Once', clip: 'Trans_ClimbWindow_Once', group: 'Trans', loop: false, frames: 96, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: 'both', marks: [{ kind: 'window', at: [0.50, 0, 0.80], top: 1.90, depth: 0.15, width: 1.0 }] },
  keys: [
    K(0, merge(S0, hands(0, 0))),
    K(3, merge(S0, hands(0.02, 0), { pos: [0.02, 0, 0], bob: -0.02 }, R(0, 0.03, -20))),                               // a step to the wall
    K(7, merge(S0, hands(0.07, 0), { pos: [0.07, 0, 0], bob: 0.02 }, R(0.15, 0.08, -10))),
    K(10, merge(S0, hands(0.11, 0), { pos: [0.11, 0, 0] }, R(0.28, 0.03, 6))),
    K(13, merge(S0, hands(0.13, 0), { pos: [0.13, 0, 0] }, R(0.28))),
    K(19, merge(S0, hands(0.14), { pos: [0.14, 0, 0], bob: -0.12, spine: { bend: 24 }, neck: { nod: -6 } }, R(0.28))),   // hands on the sill
    K(22, merge(S0, hands(0.16), { pos: [0.16, 0, 0], bob: -0.10, spine: { bend: 26 } }, R(0.28, 0.04, -20))),
    K(26, merge(S0, hands(0.19), { pos: [0.19, 0, 0], bob: -0.06, spine: { bend: 28 } }, R(0.42, 0.92, -10))),            // the right foot up over the sill
    K(31, merge(S0, hands(0.24), { pos: [0.24, 0, 0], bob: -0.06, spine: { bend: 30 } }, R(0.58, sill))),                // on the sill
    K(34, merge(S0, hands(0.28), { pos: [0.28, 0, 0], bob: 0.02, spine: { bend: 34 } }, R(0.58, sill), L(0, 0.04, -20))),
    K(44, merge(S0, hands(0.50), { pos: [0.50, 0, 0], bob: 0.30, spine: { bend: 44 }, neck: { nod: -16 } }, R(0.58, sill), L(0.40, 0.95, -20))),   // up, ducking through
    K(52, merge(S0, hands(0.66, 0), { pos: [0.66, 0, 0], bob: 0.28, spine: { bend: 40 }, neck: { nod: -12 } }, R(0.58, sill), L(0.86, 0.90, -10))),   // the left leg over
    K(57, merge(S0, hands(0.76, 0), { pos: [0.76, 0, 0], bob: 0.05, spine: { bend: 30 }, neck: { nod: -6 } }, R(0.58, sill), L(end, 0.06, 6))),
    K(61, merge(S0, hands(0.82, 0), { pos: [0.82, 0, 0], bob: -0.10, spine: { bend: 26 }, neck: { nod: -4 } }, R(0.58, sill), L(end))),         // down on the far side
    K(68, merge(S0, hands(0.90, 0), { pos: [0.90, 0, 0], bob: -0.02, spine: { bend: 16 } }, R(0.82, 0.92, -12), L(end))),                        // the right foot off the sill
    K(73, merge(S0, hands(0.96, 0), { pos: [0.96, 0, 0], bob: -0.03, spine: { bend: 10 } }, R(end, 0.05, 6), L(end))),
    K(77, merge(S0, hands(0.99, 0), { pos: [0.99, 0, 0], bob: -0.04, spine: { bend: 8 } }, R(end), L(end))),
    K(96, merge(stand('adult', end), hands(end, 0)))] };
