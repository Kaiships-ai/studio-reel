// Thin_Idle_SitFloor_Loop: sitting on the floor, the knees drawn up, the arms round them, looking about (the floor
// variant of Sitting Idle), from motion capture (Mixamo "Sitting Idle", ref/mixamo/sitting_idle_floor.js) on the thin
// body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip, captureBase } from '../../base.js';
import SRC from '../../ref/mixamo/sitting_idle_floor.js';

// never on its feet: the bones' own scale, and what its ankle and foot are standing (Y Bot: ankle 0.105 m, pitch -27)
const POSE = { bones: true, stanceAt: { ankle: 0.02, pitch: -27 } };
captureBase('FLOOR', SRC, POSE);
const M = mocapClip({ body: 'thin', src: SRC, base: 'FLOOR', end: 'FLOOR', ...POSE });
export default { name: 'Thin_Idle_SitFloor_Loop', clip: 'Idle_SitFloor_Loop', body: 'thin', group: 'Idle', loop: true, frames: M.frames, base: 'FLOOR', end: 'FLOOR', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys.map(k => ({ ...k, fall: 1 })), captured: M.captured, rest: M.rest };
