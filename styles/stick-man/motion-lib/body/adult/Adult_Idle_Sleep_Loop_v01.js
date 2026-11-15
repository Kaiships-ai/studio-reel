// Adult_Idle_Sleep_Loop: asleep on the floor, curled on one side, breathing (SH280), from motion capture (Mixamo "Sleeping Idle", ref/mixamo/sleeping_idle.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sleeping_idle.js';

// the capture lies curled on its side, LIE flat on its back: a second's roll into it and out (ease 30), the feet drawn up
const M = mocapClip({ body: 'adult', src: SRC, base: 'LIE', end: 'LIE', ease: 30 });
export default { name: 'Adult_Idle_Sleep_Loop', clip: 'Idle_Sleep_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'LIE', end: 'LIE', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
