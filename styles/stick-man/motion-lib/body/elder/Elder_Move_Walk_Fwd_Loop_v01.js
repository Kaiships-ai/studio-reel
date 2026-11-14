// Elder_Move_Walk_Fwd_Loop: short slow steps, feet barely off the floor, little bounce, arms close, head lifted to look ahead. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'elder', kind: 'walk' });
export default { name: 'Elder_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'elder', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
