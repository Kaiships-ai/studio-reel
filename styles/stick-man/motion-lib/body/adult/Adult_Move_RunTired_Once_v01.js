// Adult_Move_RunTired_Once: a jog from standing that runs out of breath and ends in a dizzy stagger (travels 3.3 m,
// ends turned 64 deg to the side it staggers to), from motion capture (Mixamo "Start Walking", its first steps, joined
// to Mixamo "Running Tired", ref/mixamo/start_walking.js + ref/mixamo/running_tired.js, mocapJoin) on this body, every
// captured frame. Mixamo batch 1 (V4 film).
import { mocapClip, toeKeys } from '../../base.js';
import { mocapJoin } from '../../ref/mocap.js';
import START from '../../ref/mixamo/start_walking.js';
import RUN from '../../ref/mixamo/running_tired.js';

// "Running Tired" opens mid-stride (both feet moving on its first frame): its run is reached from STAND through the
// first steps of "Start Walking", the hips carried on at their speed across the bridge
const SRC = mocapJoin([{ src: { ...START, frames: START.frames.slice(0, 60) } }, { bridge: 8 }, { src: RUN, follow: true }], { source: 'Mixamo "Start Walking" + "Running Tired", joined (mocapJoin)' });
// the run's toe flicks up past the style's 25 deg/f at two push-offs: spread over the frames around them
const TOE = 20;
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND', turn: true });
export default { name: 'Adult_Move_RunTired_Once', clip: 'Move_RunTired_Once', body: 'adult', group: 'Move', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: toeKeys(M.keys, TOE), captured: M.captured, rest: M.rest };
