// Adult_Act_Consume_Once: bring food to the mouth, bite, chew, lower it, from motion capture (Quaternius UAL "Consume",
// CC0, ref/ual/consume.js) on this body, every captured frame. Hot Money ep01.
// This figure's face sits 0.28 m ahead of its head's centre (the capture's ~0.10 m), so the captured hand stops ~0.33 m
// short of the mouth: its last stretch is baked onto the mouth (ref/reach/consume_mouth.js, tools/mocap_reach.mjs; re-run
// it when the clip changes). Then the jaw works: chewing from the bite to the end (x_chew, base.js chewKeys).
import { mocapClip, reachKeys, chewKeys } from '../../base.js';
import SRC from '../../ref/ual/consume.js';
import MOUTH from '../../ref/reach/consume_mouth.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
// the bite: the first frame the hand is fully on the mouth; chewing from just after it, on through a standing hold of
// four more chews (CHEW frames) after the capture's hand is down, to the clip's last 6 frames
const CHEW = 36, bite = MOUTH.rows.find(r => r[4] > 0.99)?.[0] ?? M.frames / 2, end = M.frames + CHEW;
const held = [...M.keys, { ...M.keys[M.keys.length - 1], f: end - 12 }, { ...M.keys[M.keys.length - 1], f: end }];
const keys = chewKeys(reachKeys(held, MOUTH), bite + 3, end - 6, { open: 0.5 });
export default { name: 'Adult_Act_Consume_Once', clip: 'Act_Consume_Once', body: 'adult', group: 'Act', loop: false, frames: end, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys, captured: M.captured, rest: M.rest };
