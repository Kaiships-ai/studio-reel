// Trans_SitStand_Once: sit down on a seat behind and stand back up. A glance down, the arms come forward as the hips go
// back and down (the chest leans over the feet so the body stays balanced until the seat takes it), seated with a breath,
// then the lean forward, the push and the rise over the feet. The feet never move. The seat: clip space x -0.65 to
// -0.25 m, 0.45 m high; while seated the seat carries the weight (`fall`: balance off).
import { stand, sit, K, merge } from '../../base.js';

const S0 = stand('adult'), SIT = merge(sit('adult', -0.40), { neck: { nod: 0 } });
const LOWER = merge(S0, { pos: [-0.20, 0, 0], bob: -0.32, spine: { bend: 30 }, neck: { nod: -8 }, armL: { raise: 14, swing: 40, elbow: 30 }, armR: { raise: 14, swing: 40, elbow: 30 } });
export default { name: 'Trans_SitStand_Once', clip: 'Trans_SitStand_Once', group: 'Trans', loop: false, frames: 112, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: [{ kind: 'seat', at: [-0.65, 0, 0], to: [-0.25, 0, 0.45] }] },
  keys: [
    K(0, merge(S0, { fall: 0 })),
    K(8, merge(S0, { neck: { nod: 10 }, armL: { swing: 8 }, armR: { swing: 8 } })),
    K(24, merge(LOWER, { fall: 0 })),
    K(36, SIT), K(64, merge(SIT, { spine: { bend: 2 } }), { cycle: { 'spine.bend': [1.5, 28] } }),
    K(74, merge(SIT, { pos: [-0.36, 0, 0], spine: { bend: 34 }, neck: { nod: -10 }, armL: { swing: 45 }, armR: { swing: 45 }, legL: { footW: [0, -0.132, 0] }, legR: { footW: [0, 0.132, 0] } })),
    K(88, merge(LOWER, { pos: [-0.12, 0, 0], bob: -0.24, spine: { bend: 24 }, fall: 0 })),
    K(112, merge(S0, { fall: 0 }))] };
