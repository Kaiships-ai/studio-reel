// Adult_Act_PistolReady_Loop: standing ready, a pistol held low in both hands, from motion capture (Mixamo "Pistol Idle", ref/mixamo/pistol_aim_idle.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/pistol_aim_idle.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_PistolReady_Loop', clip: 'Act_PistolReady_Loop', body: 'adult', group: 'Act', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
