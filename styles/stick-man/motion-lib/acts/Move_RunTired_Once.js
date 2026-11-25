// A run from standing on heavy legs that is out of breath, shortens, and stops.
import { ownClip, toeKeys, bridgeKeys, poleSpans } from '../base.js';
import { act } from './act.js';
import START from '../ref/mixamo/idle_to_sprint.js';
import RUN from '../ref/mixamo/running_tired.js';
import { mocapJoin } from '../ref/mocap.js';
import { apartSource, cutSource, toeSource } from '../ref/perform.js';

// the capture runs 1.5 s and staggers 5 (a bow, the hands on the head): no run read. Kept: its run, its own stride (frames 9-30)
// run twice more, and its halt (to 69); taken out: the stagger after it. Off the mark on a captured push off (the old start walked
// for 2.7 s first). Its steps STRIDE as long: as captured they shuffle
// (its hands, both held at the belly, 6 cm further apart: this rig's narrower shoulders crossed them)
const STRIDE = 1.3, APART = 0.06, join = (a, b) => ({ src: cutSource(RUN, a, b), follow: true });
const SRC = apartSource(toeSource(mocapJoin([{ src: cutSource(START, 0, 12) }, { bridge: 4 }, join(18, 30), { bridge: 1 }, join(9, 30), { bridge: 1 }, join(9, 69)], { source: 'joined (mocapJoin)' }), 12), APART);

export default act({ clip: 'Move_RunTired_Once', loop: false }, body => {
  const M = ownClip({ body, src: SRC, turn: true, easeOut: 26, stride: STRIDE, bobLow: true, own: { limb: 15, hand: 0.07 } });
  return { ...M, keys: toeKeys(bridgeKeys(M.keys, poleSpans(M.keys)), 20) };
});
