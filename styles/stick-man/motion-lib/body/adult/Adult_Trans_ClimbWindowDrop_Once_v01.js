// Adult_Trans_ClimbWindowDrop_Once: climb out through a low, wide window (sill at hip height) and drop to the ground on the
// far side, from two motion captures joined (ref/mocap.js mocapJoin) on this body, every captured frame. Hot Money ep01.
//   1. Mixamo "Climb Onto Box" (ref/mixamo/climb_onto_box.js): from STAND beside the wall, turn to it, both hands and
//      the left knee up onto the sill (the box's top, 0.71 m in the capture)
//   2. a 24-frame bridge: the right leg up behind, the body down along the sill on its front
//   3. Mixamo "Climb Through And Jump Down" (ref/mixamo/climb_through_and_jump_down.js), lowered onto this sill: lying
//      along the top it rolls out, legs first, and comes down facing the wall. Its fence is 1.31 m high, this sill 0.71:
//      the drop is shortened by that 0.60 m (settle), the hands stay on the sill while the body lowers (hold)
// The wall runs along clip x, the room on the +y side, the far side -y; the act ends turned to face the wall. Clip space
// (capture metres, scaled by mocapCycle): the sill 0.5 m deep (the capture's), the opening 1.5 m wide, 0.9 m high.
import { mocapClip } from '../../base.js';
import { mocapJoin } from '../../ref/mocap.js';
import BOX from '../../ref/mixamo/climb_onto_box.js';
import OVER from '../../ref/mixamo/climb_through_and_jump_down.js';

const SILL = 0.708, NEAR = -0.62, DEEP = 0.50, X0 = -0.60, X1 = 0.90;
const SRC = mocapJoin([{ src: BOX }, { bridge: 24 }, { src: OVER, shift: [0.15, -0.92, SILL - 1.312], settle: [38, 50], hold: [62, 74] }], {
  source: 'Mixamo "Climb Onto Box" + "Climb Through And Jump Down", joined (mocapJoin)',
  surfaces: [{ x: [X0, X1], y: [NEAR - DEEP, NEAR], top: SILL }],
  marks: [{ kind: 'window', axis: 'y', at: [(X0 + X1) / 2, NEAR, SILL], top: SILL + 0.9, depth: DEEP, width: X1 - X0 }] });
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND', turn: true });
export default { name: 'Adult_Trans_ClimbWindowDrop_Once', clip: 'Trans_ClimbWindowDrop_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: 'both', marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
