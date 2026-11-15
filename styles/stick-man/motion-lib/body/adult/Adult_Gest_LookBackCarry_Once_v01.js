// Adult_Gest_LookBackCarry_Once: a quick nervous look over the right shoulder with the duffel hugged to the chest, from
// motion capture (Mixamo "Look Over Shoulder", ref/mixamo/look_over_shoulder.js) on this body, every captured frame,
// opened and closed on HUG: the capture's legs, head and turn (neck, the spine's twist, the pelvis), its arms and its
// lean the HUG pose's (they keep the bag, the motion-lib/props.js hugbag, 20 kg, turning with the chest; the capture's
// own lean bent the bag into the thighs), the turn more in the neck than the chest. Between Idle_CarryBag_Loop and Move_CarryBag_Walk_Loop.
// Hot Money ep01.
import { mocapClip, hug, holdKeys, HUG_KG } from '../../base.js';
import SRC from '../../ref/mixamo/look_over_shoulder.js';

// the hips and chest turn TW of the capture's turn, the head the rest, the knees not dipping: hips turned 40 deg over
// planted feet swung the bag at the chest across a thigh that stays forward (10 cm into it)
const TW = 0.15;
const M = mocapClip({ body: 'adult', src: SRC, base: 'HUG', end: 'HUG' }), H = hug('adult');
const keys = holdKeys(M.keys.map(k => ({ ...k, armL: { ...H.armL }, armR: { ...H.armR }, spine: { ...k.spine, bend: H.spine.bend, side: H.spine.side, twist: H.spine.twist + (k.spine.twist - H.spine.twist) * TW }, neck: { ...k.neck, turn: k.neck.turn + (k.spine.twist - H.spine.twist + k.pelvis.yaw - H.pelvis.yaw) * (1 - TW) }, pelvis: { ...k.pelvis, pitch: H.pelvis.pitch, roll: H.pelvis.roll, yaw: H.pelvis.yaw + (k.pelvis.yaw - H.pelvis.yaw) * TW }, bob: H.bob })), 'B', 'hugbag', { kg: HUG_KG });
export default { name: 'Adult_Gest_LookBackCarry_Once', clip: 'Gest_LookBackCarry_Once', body: 'adult', group: 'Gest', loop: false, frames: M.frames, base: 'HUG', end: 'HUG', style: 'kaiships',
  needs: { props: ['hugbag'], hands: 'both', marks: M.marks }, keys, captured: M.captured, rest: M.rest };
