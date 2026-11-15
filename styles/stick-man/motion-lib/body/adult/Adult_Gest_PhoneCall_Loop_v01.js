// Adult_Gest_PhoneCall_Loop: standing, talking on a phone held to the ear, from motion capture (Quaternius UAL "Idle_TalkingPhone_Loop", CC0, ref/ual/idle_talkingphone_loop.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/idle_talkingphone_loop.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Gest_PhoneCall_Loop', clip: 'Gest_PhoneCall_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
