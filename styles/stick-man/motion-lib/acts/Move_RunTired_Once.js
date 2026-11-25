// A jog from standing that runs out of breath and ends in a dizzy stagger, facing front.
import { ownClip, toeKeys, bridgeKeys, poleSpans } from '../base.js';
import { act } from './act.js';
import START from '../ref/mixamo/start_walking.js';
import RUN from '../ref/mixamo/running_tired.js';
import { mocapJoin } from '../ref/mocap.js';
import { toeSource, turnSource } from '../ref/perform.js';
import { BODIES } from '../bodies.js';

const AT = 68, ramp = (i, a, b) => { const w = Math.max(0, Math.min(1, (i - a) / (b - a))); return w * w * (3 - 2 * w); };
// the stagger turns its actor 62 deg on the right foot, its back to what it ran to: turned back round that foot as he steps
const SRC = turnSource(mocapJoin([{ src: { ...START, frames: START.frames.slice(0, 60) } }, { bridge: 8 }, { src: toeSource(RUN, 12), follow: true }], { source: 'joined (mocapJoin)' }), i => 62 * ramp(i, AT + 72, AT + 108), f => f.RightFoot);

export default act({ clip: 'Move_RunTired_Once', loop: false }, body => {
  const M = ownClip({ body, src: SRC, turn: true, easeOut: 26, bobLow: body === 'elder', stride: BODIES[body].run.S / BODIES.adult.run.S / (BODIES[body].spec.scale ?? 1) });
  return { ...M, keys: toeKeys(bridgeKeys(M.keys, poleSpans(M.keys)), 20) };
});
