// Adult_Idle_Kneel_Loop: kneeling on both knees, holding, from motion capture (Mixamo "Kneeling Idle",
// ref/mixamo/kneeling_idle.js) on this body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip, captureBase } from '../../base.js';
import SRC from '../../ref/mixamo/kneeling_idle.js';

// never on its feet: the bones' own scale, and what its ankle and foot are standing (Y Bot: ankle 0.105 m, pitch -27)
const POSE = { bones: true, stanceAt: { ankle: 0.04, pitch: -27 } };
captureBase('KNEEL', SRC, POSE);
const M = mocapClip({ body: 'adult', src: SRC, base: 'KNEEL', end: 'KNEEL', ...POSE });
export default { name: 'Adult_Idle_Kneel_Loop', clip: 'Idle_Kneel_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'KNEEL', end: 'KNEEL', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys.map(k => ({ ...k, fall: 1 })), captured: M.captured, rest: M.rest };
