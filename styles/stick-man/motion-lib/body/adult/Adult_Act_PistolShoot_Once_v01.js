// Adult_Act_PistolShoot_Once: raise a handgun one-handed (the left: motion-lib/props.js pistol, x_hpL_pistol), fire, lower it, from motion capture (Mixamo "Shooting Gun", ref/mixamo/shooting_gun.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip, holdKeys, reachKeys } from '../../base.js';
import SRC from '../../ref/mixamo/shooting_gun.js';
import HEAD from '../../ref/reach/pistol_head.js';

// the gun arm comes up out to the side and folds, the gun beside the head: this figure's head is bigger than the
// capture's, so the gun went 12 cm into it (seen once the captured swing no longer wrapped, ref/mocap.js), and the solve
// pushed the fist 14 cm off its grip. Where the solve puts the fist with the gun outside the head is baked
// (ref/reach/pistol_head.js, tools/mocap_contact.mjs Act_PistolShoot_Once L 8 <out>: over 8 frames each way, so the arm
// folds no faster than the capture's; re-run it when the clip changes), so the grip stays on its target
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_PistolShoot_Once', clip: 'Act_PistolShoot_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['pistol'], hands: 'L', marks: M.marks }, keys: holdKeys(reachKeys(M.keys, HEAD), 'L', 'pistol'), captured: M.captured, rest: M.rest };
