// Move_WalkFlashlight_Loop: a cautious search walk with a flashlight held out in the left fist (the same hand as
// Act_TorchReady_Loop), waist high, the beam ahead; the light arm stays steady (the body bobs under it), the right arm
// swings small, the head slightly forward.
// flashlightWalk(body): the same walk on any body, from that body's own walk (bodies.js): its step 0.82 as long and
// 1.13 times as slow (the adult's 0.45 m in 17 frames), its own hips, the light arm out at the body's own rest width
// (heavy and thin: Heavy_ / Thin_Move_WalkFlashlight_Loop; ep01 SH142 had them walk with the torch keyed by hand)
import { gaitLoop, holdKeys } from '../../base.js';
import { BODIES } from '../../bodies.js';

export function flashlightWalk(body = 'adult') {
  const B = BODIES[body], w = B.walk, r = B.posture?.armL?.raise ?? 12;
  const G = gaitLoop({ body, kind: 'walk', S: +(w.S * 0.45 / 0.55).toFixed(3), T: Math.round(w.T * 17 / 15), bend: w.bend + 2, nod: 1, sway: w.sway, bobC: w.bobC, bobP: w.bobP - 0.01,
    upper: sgn => ({ armL: { raise: r + 2, swing: 46, elbow: 14 }, armR: { raise: r + 2, swing: 12 * sgn, elbow: 30 }, neck: { nod: 4 }, x_hpL_torch: 1 }) });
  const pre = { adult: '', heavy: 'Heavy_', thin: 'Thin_', child: 'Child_', elder: 'Elder_' }[body];
  return { name: `${body === 'adult' ? '' : pre}Move_WalkFlashlight_Loop`, clip: 'Move_WalkFlashlight_Loop', body, group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
    needs: { props: ['torch'], hands: 'L' }, ...G, intro: holdKeys(G.intro, 'L', 'torch'), outro: holdKeys(G.outro, 'L', 'torch') };   // (the first and closing steps hold it too)
}
export default flashlightWalk('adult');
