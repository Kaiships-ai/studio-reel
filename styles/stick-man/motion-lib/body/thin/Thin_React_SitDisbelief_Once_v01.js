// Thin_React_SitDisbelief_Once: seated, in disbelief: the hands to the face, the body thrown back with the hands on the
// head, then upright again (needs a seat with room behind), from motion capture (Mixamo "Sitting Disbelief",
// ref/mixamo/sitting_disbelief.js) on the thin body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sitting_disbelief.js';

const M = mocapClip({ body: 'thin', src: SRC, base: 'SIT', end: 'SIT', seated: true, bones: true });
export default { name: 'Thin_React_SitDisbelief_Once', clip: 'React_SitDisbelief_Once', body: 'thin', group: 'React', loop: false, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
