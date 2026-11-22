// sample: "Why are yawns contagious?" A 15 s stick-man reel made only from the pack: the room set, two sample characters
// (kit/cast/characters.js), library clips (walk, sit, stand up), kit faces, the auto camera (storyboard.json) and
// captions. Frames follow vo/words.json: l01 0-45, l02 51-99, l03 121-204, l04 216-314, l05 329-378, end 449.
import '/styles/stick-man/kit/cast/characters.js';
import { sit, K } from '/styles/stick-man/motion-lib/base.js';

const SOFA = [-0.55, 1.05, 0];

export default {
  title: 'sample', fps: 30, frames: [0, 449], style: 'kaiships',
  set: 'room', setModule: '/styles/stick-man/kit/sets/room.js',
  lines: ['l01', 'l02', 'l03', 'l04', 'l05'], captions: { mode: 'chunk' },
  cast: {
    leo: { spec: 'LEO', at: SOFA, yaw: 0, posture: 'sit', expr: 'calm', focus: 'camera' },
    maya: { spec: 'MAYA', at: [-2.4, -0.45, 0], yaw: -90, expr: 'neutral', focus: 'leo', lead: true },
  },
  anim: {
    // Leo sits on the sofa, stands up when the idea lands (l03)
    leo: [
      K(0, { ...sit('adult'), pos: SOFA, yaw: 0 }, { ease: 'snap' }),
      { f: 222, clip: 'Trans_StandUp_Once', pos: [-0.55, 1.05], yaw: 0, expr: 'excited' },
      { f: 282, clip: 'Idle_Stand_Loop', times: 2 },   // the stand-up ends at 281 (tools/pack/clips.mjs --end)
    ],
    // Maya walks in from the door (she yawns on the way), stops in front of the sofa, stands
    maya: [
      { f: 0, clip: 'Move_Walk_Fwd_Loop', pos: [-2.4, -0.45], to: [0.45, -0.35] },
      { f: 145, clip: 'Idle_Stand_Loop', yaw: -25, times: 3 },   // the walk ends at 144 (tools/pack/clips.mjs --end)
    ],
  },
  beats: [
    // l01 / l02: Leo yawns on "yawned", Maya catches it on "Maya" while she walks in
    { f: 6, who: 'leo', expr: 'sleep_O', take: false }, { f: 52, who: 'leo', expr: 'bored' },
    { f: 86, who: 'maya', expr: 'sleep_O', take: false }, { f: 118, who: 'maya', expr: 'confused', look: 'leo' },
    // l03: both puzzled
    { f: 125, who: 'leo', expr: 'skeptic', look: 'maya' }, { f: 160, who: 'maya', expr: 'suspicious', look: 'camera' },
    // l04: the idea: Leo jumps up, both wide awake
    { f: 224, who: 'maya', expr: 'happy', look: 'leo' }, { f: 262, who: 'leo', expr: 'grin', look: 'maya' },
    // l05: to the viewer; the yawn comes round again
    { f: 330, who: 'maya', expr: 'sly', look: 'camera' }, { f: 330, who: 'leo', look: 'camera' },
    { f: 342, who: 'leo', expr: 'sleep_O', take: false }, { f: 362, who: 'maya', expr: 'smug' },
    { f: 400, who: 'maya', expr: 'sleep_O', take: false }, { f: 428, who: 'maya', expr: 'happy', look: 'leo' }, { f: 400, who: 'leo', expr: 'laugh', look: 'maya' },
    { f: 362, who: 'maya', do: 'sound', name: 'ting', strength: 0.6 },
    { f: 222, who: 'leo', do: 'sound', name: 'springs', strength: 0.5 },
  ],
  overlays: [],
};
