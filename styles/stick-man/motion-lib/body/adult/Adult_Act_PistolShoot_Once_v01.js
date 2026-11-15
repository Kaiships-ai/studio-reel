// Adult_Act_PistolShoot_Once: raise a handgun one-handed, fire, lower it, from motion capture (Mixamo "Shooting Gun", ref/mixamo/shooting_gun.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/shooting_gun.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_PistolShoot_Once', clip: 'Act_PistolShoot_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
