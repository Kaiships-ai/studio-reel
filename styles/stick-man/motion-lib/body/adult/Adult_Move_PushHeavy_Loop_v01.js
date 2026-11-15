// Adult_Move_PushHeavy_Loop: pushing a heavy crate along, bent low, from motion capture (Quaternius UAL "Push_Loop",
// CC0, in place, ref/ual/push_loop.js) on this body: the feet pinned to their prints, the body travelling at the speed
// the captured feet slid back. Hot Money ep01 (SH150).
// The crate (motion-lib/props.js crate, x_hpB_crate) stands on the floor with both fists on its back face from the
// frame they reach it in the first step (GRAB) to the end of the last cycle; before and after, it stands where they took
// and left it: 0.87 m ahead of the root, 0.05 m to its right (the fists' midpoint through the loop, measured through the
// rig: tools/motionlib.mjs rigClip). A film puts its own crate (or swaps it) there.
import { gaitLoop } from '../../base.js';
import SRC from '../../ref/ual/push_loop.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: SRC, loopIntro: true });
const GRAB = 22, AHEAD = [0.87, 0.05], on = v => k => ({ ...k, x_hpB_crate: v(k) ? 1 : 0 });
// (the root at GRAB: 0.03 m behind where the clip starts, its first step's weight shift)
const r0 = G.intro[0].pos;
export default { name: 'Adult_Move_PushHeavy_Loop', clip: 'Move_PushHeavy_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: ['crate'], hands: 'both', marks: [{ kind: 'crate', at: [AHEAD[0] - 0.03, r0[1] + AHEAD[1], 0], until: GRAB }, { kind: 'crate', after: 'loop', ahead: AHEAD }] },
  ...G, intro: G.intro.map(on(k => k.f >= GRAB)), keys: G.keys.map(on(() => true)), outro: G.outro.map(on(() => false)) };
