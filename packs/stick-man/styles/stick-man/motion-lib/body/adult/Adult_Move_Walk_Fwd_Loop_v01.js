// Adult_Move_Walk_Fwd_Loop: a walk, from motion capture (Quaternius UAL "Walk_Loop", CC0, ref/ual/walk_loop.js) on this
// body: planted feet pinned to their prints, the body travelling at the speed the captured feet slid back.
// The capture has no stop of its own, so the library's made closing step is moved onto the print the loop's last left
// step lands on (it is made for a lane and stride the capture does not have: unmoved, the left foot slid 25 cm), and a
// foot that leaves its standing print in the made first step peels straight up first (it drifted 2.6 mm on the way up).
import { gaitLoop } from '../../base.js';
import SRC from '../../ref/ual/walk_loop.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: SRC });
const end = G.keys[G.keys.length - 1].legL.footW, from = G.outro[0].legL.footW, d = [end[0] - from[0], end[1] - from[1]];
const mv = p => p && [p[0] + d[0], p[1] + d[1], p[2]];
const outro = G.outro.map(k => ({ ...k, ...(k.pos ? { pos: mv(k.pos) } : {}), legL: { ...k.legL, footW: mv(k.legL.footW) }, legR: { ...k.legR, footW: mv(k.legR.footW) } }));
const intro = G.intro.flatMap((a, i) => {
  const b = G.intro[i + 1]; if (!b) return [a];
  const peel = ['legL', 'legR'].filter(s => a[s].footW[2] === 0 && b[s].footW[2] > 0);
  if (!peel.length || b.f - a.f < 6) return [a];
  return [a, { ...a, f: a.f + 3, ease: 'flow', ...Object.fromEntries(peel.map(s => [s, { ...a[s], footW: [a[s].footW[0], a[s].footW[1], 0.012] }])) }];
});
export default { name: 'Adult_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G, intro, outro, outroTravel: G.outroTravel + d[0] };
