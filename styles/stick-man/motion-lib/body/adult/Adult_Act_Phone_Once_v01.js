// Adult_Act_Phone_Once: a call on a mobile: dial it at the chest, up to the ear, talk, put it away, from motion capture
// (Mixamo "Talking On A Cell Phone", ref/mixamo/talking_on_a_cell_phone.js: its first 203 frames and its last 114, the
// long middle of the call cut where the two match within 8 cm, joined by a 6-frame bridge) on this body. Hot Money ep01.
// This figure's head is bigger than the capture's: the hand's last stretch to the ear is baked (ref/reach/phone_ear.js,
// tools/run/mocap_reach.mjs; re-run it when the clip changes). The phone is in the right fist all through.
import { mocapClip, reachKeys } from '../../base.js';
import { mocapJoin } from '../../ref/mocap.js';
import CALL from '../../ref/mixamo/talking_on_a_cell_phone.js';
import EAR from '../../ref/reach/phone_ear.js';

const part = (a, b) => ({ ...CALL, frames: CALL.frames.slice(a, b) });
const SRC = mocapJoin([{ src: part(0, CALL.cut) }, { bridge: 6 }, { src: part(CALL.cut) }], { source: CALL.source });
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_Phone_Once', clip: 'Act_Phone_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['phone'], hands: 'R', marks: M.marks }, keys: (EAR.rows.length ? reachKeys(M.keys, EAR) : M.keys).map(k => ({ ...k, x_hpR_phone: 1 })), captured: M.captured, rest: M.rest };
