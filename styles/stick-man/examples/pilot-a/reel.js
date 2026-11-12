// Pilot A (12/11, every gate approved by Kai): the worked example of the standard process (make-reel-stick-man SKILL.md).
// 20.5 s, set canyon-edge, style 'kaiships'. Cameras from two camera passes (OPT / KAI below), overlays (loupe, CLACK,
// arrows), blocking keys (hold) and polish (polish()), sound beats, final look A. Copy to films/<slug>/ and adapt.
// Direction conventions (motion v2 actors): yaw 0 faces the camera side (-y); yaw -120 faces -x (toward the blue rail);
// arm swing + = forward.
import '/styles/stick-man/allout/handprops.js';
import '/styles/stick-man/allout/fx.js';
import '/styles/stick-man/allout/costume.js';
import '/styles/stick-man/allout/rail.js';
import { OX, RX, BK, EDGE_LOOK } from '/styles/stick-man/allout/sets/canyon-edge.js';
const set = (who, key, to, f = -30, dur = 0, ease) => ({ f, who, do: 'set', key, to, dur, ...(ease ? { ease } : {}) });
const anim = (...names) => Object.fromEntries(names.map(n => [n, { kind: 'ao_anim', prop: n }]));
const JX = OX + 0.7175;                                   // the hero joint (blue right rail, y = 0)
const E1 = [OX + 1.4, -0.15, 0], E0 = [OX + 1.05, -0.15, 0], M0 = [RX - 0.9, BK - 7.5, 0];
// panel cut frames from the animatic (ffmpeg scene detect): 1.0 1.0 .9 1.5 1.2 1.4 1.8 1.1 1.6 1.5 1.4 1.1 1.9 1.1 2.0 s
export const CUTS = [0, 30, 60, 87, 132, 168, 210, 264, 297, 345, 390, 432, 465, 522, 555, 615];
const STAND = { bob: 0, sq: 0, spine: { bend: 0, side: 0, twist: 0 }, neck: { nod: 0, tilt: 0, turn: 0 }, pelvis: { pitch: 0, roll: 0, yaw: 0 },
  armL: { raise: 12, swing: 0, elbow: 15, roll: 0 }, armR: { raise: 12, swing: 0, elbow: 15, roll: 0 },
  legL: { foot: [-0.22, 0.022, 0], pitch: 0, knee: [-0.15, 0, 1] }, legR: { foot: [0.22, 0.022, 0], pitch: 0, knee: [0.15, 0, 1] } };
const KNEEL = { bob: -0.48, spine: { bend: 28 }, neck: { nod: -18 }, armL: { raise: 22, swing: 60, elbow: 40 }, armR: { raise: 18, swing: 70, elbow: 25 },
  legL: { foot: [-0.22, 0.022, 0.45], knee: [-0.1, 0, 1] }, legR: { foot: [0.22, 0.06, -0.48], knee: [0.15, 0, 1], pitch: -60 }, x_hpR_saw: 1 };
const SAW_UP = { armR: { raise: 30, swing: 20, elbow: 60 }, x_hpR_saw: 1 };
const POINT = { armR: { raise: 70, swing: 40, elbow: 5 } };
const CROSS = { armL: { raise: 40, swing: 10, elbow: 110, roll: 70 }, armR: { raise: 40, swing: 10, elbow: 110, roll: 70 }, x_hpR_saw: 0 };
const HIPS = { armL: { raise: 40, swing: -15, elbow: 105, roll: 70 }, armR: { raise: 40, swing: -15, elbow: 105, roll: 70 }, x_hpR_saw: 0 };
// a moving hold: every held pose breathes (chest and head drift) unless the key sets its own cycle
const BREATH = { 'spine.bend': [1.5, 40], 'neck.tilt': [1.5, 53, 1] };
const hold = (f, extra) => ({ f, pose: STAND, cycle: BREATH, ...extra, ease: 'snap' });
// 3.4 POLISH: the blocking keys stay the poses; a key on a cut stays a snap (no in-between across a cut), every other key
// holds its pose until T frames before the next one and moves on the kaiships dose (slow in/out, arcs, follow-through
// from engine/motion.js); antic on the keys that need a wind-up. ?blocking=1 plays the approved blocking for comparison.
const BLOCKING = new URLSearchParams(globalThis.location?.search || '').get('blocking') === '1';
const T_MOVE = { default: 7, stroke: 4 };
function polish(keys) {
  if (BLOCKING) return keys;
  return keys.map((k, i) => {
    const nx = keys[i + 1], cut = CUTS.includes(k.f), sameShot = nx && !CUTS.includes(nx.f);
    const T = nx?.t ?? (k.stroke ? T_MOVE.stroke : T_MOVE.default);
    const { stroke, antic, t, ...rest } = k;
    return { ...rest, ease: cut ? 'snap' : (k.flow ? 'flow' : 'slow'), ...(antic ? { antic } : {}), ...(sameShot && nx.f - k.f > T + 2 ? { hold: nx.f - k.f - T } : {}) };
  });
}
// camera pass (stage 3 · 3.0b): three options per flagged shot, picked with ?opt=1:emo,4:safe (proof renders) or PICK below
const P = (pos, aim, lens, roll) => ({ pos, aim, lens, ...(roll ? { roll } : {}) });
const kick = (...fs) => fs.map(f => ({ at: { f }, amp: 0.7 }));
export const OPT = {
  1: { safe: { cam: P([JX - 2.2, -4.8, 1.5], [JX + 0.2, 0, 0.55], 35) },
       emo: { cam: P([2.25, -2.3, 0.85], [2.25, -0.1, 0.68], 50), to: P([2.25, -2.0, 0.82], [2.25, -0.1, 0.68], 50), move: { ease: 'linear' } },
       bold: { cam: P([JX + 0.2, -0.25, 3.4], [JX + 0.2, 0, 0], 24) } },
  2: { safe: { cam: P([3.7, -1.1, 1.25], [2.5, -0.15, 1.5], 50) },
       emo: { cam: P([3.6, -1.2, 0.95], [2.5, -0.15, 1.5], 35), to: P([3.4, -1.05, 1.0], [2.5, -0.15, 1.5], 35), move: { ease: 'out' } },
       bold: { cam: P([3.0, -0.8, 0.5], [2.5, -0.15, 1.5], 24, 12) } },
  3: { safe: { cam: P([JX - 1.4, 1.3, 1.05], [JX + 0.3, -0.25, 0.78], 35) },
       emo: { cam: P([JX - 0.5, -0.35, 0.62], [JX, 0, 0.17], 85) },
       bold: { cam: P([3.0, 0.4, 2.1], [JX, 0.05, 0.17], 35) } },
  4: { safe: { cam: P([3.0, -18, 1.8], [OX, 8, 1.2], 50) },
       emo: { cam: P([JX + 1.15, 1, 0.35], [OX, 10, 0.9], 24), kick: kick(100, 118) },
       bold: { cam: P([OX - 3, -2, 6], [OX, 8, 0.5], 24), to: P([OX - 3, -8, 6], [OX, 2, 0.5], 24), move: { ease: 'linear' } } },
  5: { safe: { cam: P([JX + 2.2, -0.6, 0.35], [JX, 0, 0.35], 50) },
       emo: { cam: P([JX + 2.2, -0.6, 0.35], [JX, 0, 0.3], 85), kick: kick(150) },
       bold: { cam: P([JX - 0.3, -0.95, 0.42], [JX, 0.05, 0.17], 35), kick: kick(150) } },
  6: { safe: { cam: P([-4.0, -18, 1.8], [RX, 6, 1.2], 50) },
       emo: { cam: P([RX - 1.87, -4, 0.35], [RX, 3, 0.9], 24) },
       bold: { cam: P([RX - 5, -4, 6], [RX, 4, 0.5], 24), to: P([RX - 5, -10, 6], [RX, -2, 0.5], 24), move: { ease: 'linear' } } },
  10: { safe: { cam: P([1.2, -0.6, 1.2], [3.0, 0.7, 1.15], 35) },
        emo: { cam: P([-2.5, 0.2, 1.3], [3.0, 0.8, 1.15], 85) },
        bold: { cam: P([3.9, -3, 5], [2.8, 0.8, 0.8], 24) } },
  13: { safe: { cam: P([RX + 0.6, BK - 7, 0.6], [RX, BK + 1, 0.15], 35), to: P([RX + 0.4, BK - 5.5, 0.5], [RX, BK + 1, 0.15], 35), move: { ease: 'linear' } },
        emo: { cam: P([RX - 0.2, BK - 5, 0.15], [RX, BK + 2, 0.15], 24), to: P([RX - 0.2, BK - 3.5, 0.15], [RX, BK + 2, 0.15], 24), move: { ease: 'linear' } },
        bold: { cam: P([RX, BK - 0.3, 10], [RX, BK, 0], 24) } },
  14: { safe: { cam: P([RX - 0.85, BK - 8.7, 1.3], [RX - 0.9, BK - 7.5, 1.75], 50) },
        emo: { cam: P([RX - 0.9, BK - 10, 1.45], [RX - 0.9, BK - 7.5, 1.65], 50), to: P([RX - 0.9, BK - 10, 1.45], [RX - 0.9, BK - 7.5, 1.65], 135), move: { dur: 6, ease: 'out' }, kick: kick(528) },
        bold: { cam: P([RX - 0.7, BK - 8.6, 1.1], [RX - 0.9, BK - 7.5, 1.7], 24, -15) } },
  15: { safe: { cam: P([-12, BK + 3, 0.5], [RX - 1.5, BK + 5, 0.3], 35), kick: kick(590) },
        emo: { cam: P([RX - 1.4, BK + 2.6, 0.12], [RX - 0.9, BK + 4, 0.3], 24) },   // then the hard cut at 572 below (P15b): a 12 m pull-out in 14 frames ran at 1640 px/f
        bold: { cam: P([RX - 2.6, BK + 2, 0.3], [RX - 0.9, BK + 4.5, 0.35], 85), kick: kick(580) } },
};
// camera pass round 2 (an independent agent with the animation-camera-pass skill): its recommended option per flagged shot, as 'cp'
const CP = {
  1: { cam: P([JX - 1.6, -4.2, 1.2], [JX + 0.3, 0, 0.5], 35), to: P([JX - 1.45, -3.85, 1.15], [JX + 0.3, 0, 0.5], 35), move: { ease: 'linear' } },
  3: { cam: P([JX - 1.2, 0.02, 0.2], [JX, 0, 0.17], 50), to: P([JX - 1.0, 0.02, 0.19], [JX, 0, 0.17], 50), move: { ease: 'linear' } },
  12: { cam: P([OX + 2.95, -8.6, 1.75], [OX + 0.2, 2, 1.0], 50) },
  13: { cam: P([RX - 2.2, BK - 12, 1.8], [RX, BK + 1, 0.2], 24) },
  14: { cam: P([RX - 0.6, BK - 9.3, 1.85], [RX - 0.9, BK - 7.5, 1.55], 50), to: P([RX - 0.68, BK - 9.0, 1.82], [RX - 0.9, BK - 7.5, 1.55], 50), move: { ease: 'out' } },
  15: { cam: P([RX - 1.4, BK + 2.6, 0.12], [RX - 0.9, BK + 4, 0.3], 24), kick: kick(574) },
};
for (const [i, v] of Object.entries(CP)) (OPT[i] ||= {}).cp = v;

// Kai's picks (stage 3 page, 2026-11-12); ?opt=i:name overrides one for a proof render
const KAI = { 1: 'cp', 2: 'emo', 3: 'emo', 4: 'emo', 5: 'bold', 6: 'emo', 10: 'safe', 12: 'cp', 13: 'cp', 14: 'cp', 15: 'emo' };   // round 2 (12/11): P1 P12 P13 P14 from the camera pass
const PICK = { ...KAI, ...Object.fromEntries((new URLSearchParams(globalThis.location?.search || '').get('opt') || '').split(',').filter(Boolean).map(s => s.split(':'))) };
const c = (i, intent, why, pos, aim, lens) => ({ at: { f: CUTS[i - 1] }, intent, why: `P${i} · ${why}`, cut: 'cut', cam: { pos, aim, lens }, ...(OPT[i]?.[PICK[i]] || {}) });
export default {
  title: 'pilot-a', fps: 30, glasses: false, frames: [0, 615], steps: 'all', captions: { mode: 'word' }, directDrift: 0.07, style: 'kaiships',
  look: EDGE_LOOK.look, light: EDGE_LOOK.light, grade: EDGE_LOOK.grade,   // Kai 12/11: keep the approved look A (v1), ink as designed
  set: 'edge', setModule: '/styles/stick-man/allout/sets/canyon-edge.js', setOpts: { sky: 'day' }, name: 'edge', lines: [],
  show: [{ from: 0 }],
  cast: {
    eng: { spec: 'ENGINEER', at: E0, yaw: -120, expr: 'calm', focus: 'camera', lead: true },
    mag: { spec: 'MAGNATE', costume: ['hat:top'], at: M0, yaw: 10, expr: 'smug', focus: 'camera' },
  },
  make: { ...anim('joint', 'rtrack', 'board', 'loco', 'rloco') },
  anim: {
    eng: polish([
      // P1 he saws his own rail: four strokes, kneeling at the joint, sly
      hold(0, { ...KNEEL, armR: { raise: 5, swing: 40, elbow: 50 }, spine: { bend: 48, side: -3 }, pelvis: { roll: -3 }, pos: E0, yaw: -120, expr: 'sly', look: 'joint' }),
      hold(8, { stroke: 1, ...KNEEL, armR: { raise: 5, swing: 62, elbow: 25 }, spine: { bend: 60, side: 3 }, pelvis: { roll: 3 }, pos: E0, yaw: -120, expr: 'sly', look: 'joint' }),
      hold(16, { stroke: 1, ...KNEEL, armR: { raise: 5, swing: 40, elbow: 50 }, spine: { bend: 48, side: -3 }, pelvis: { roll: -3 }, pos: E0, yaw: -120, expr: 'sly', look: 'joint' }),
      hold(23, { stroke: 1, ...KNEEL, armR: { raise: 5, swing: 62, elbow: 25 }, spine: { bend: 60, side: 3 }, pelvis: { roll: 3 }, pos: E0, yaw: -120, expr: 'sly', look: 'joint' }),
      // P2 proud: up, saw on the shoulder, free hand on the hip, chin up, leaning back
      hold(30, { pelvis: { roll: 6 }, ...SAW_UP, armR: { raise: 55, swing: -5, elbow: 15 }, armL: { raise: 18, swing: -8, elbow: 25 }, spine: { bend: -8 }, neck: { nod: -4 }, pos: E0, yaw: 70, expr: 'grin', look: 'camera' }),
      hold(44, { pelvis: { roll: 6 }, ...SAW_UP, armR: { raise: 55, swing: -5, elbow: 15 }, armL: { raise: 18, swing: -8, elbow: 25 }, spine: { bend: -10 }, neck: { nod: -5, tilt: 10 }, pos: E0, yaw: 70, expr: 'grin', look: 'camera' }),
      // P3 over the joint, saw tip at the clean gap
      hold(60, { spine: { bend: 22 }, neck: { nod: 25 }, armR: { raise: 25, swing: 45, elbow: 10 }, x_hpR_saw: 1, pos: E0, yaw: -120, expr: 'smug', look: 'joint' }),
      hold(87, { ...HIPS, pos: [3.4, 3.8, 0], yaw: -20, expr: 'smug', look: 'loco' }),
      hold(132, { pos: [OX + 2.4, 40, 0], yaw: 0, expr: 'calm', look: 'loco' }),
      // P10 hottest day: arms crossed, weight on one hip, unbothered
      hold(345, { cycle: { 'spine.side': [2.5, 46], 'neck.tilt': [3, 58, 1] }, ...CROSS, pelvis: { roll: 5 }, spine: { side: -4 }, pos: [OX + 1.15, 0.15, 0], yaw: -100, expr: 'sly', look: 'camera' }),
      hold(368, { cycle: { 'spine.side': [2.5, 46], 'neck.tilt': [3, 58, 1] }, antic: 0.2, ...CROSS, pelvis: { roll: -5 }, spine: { side: 5, bend: -6 }, neck: { tilt: -14, nod: -10 }, pos: [OX + 1.15, 0.15, 0], yaw: -100, expr: 'smug', look: 'camera' }),
      // P11 told you so: hands on hips, chin up, then the nod
      hold(390, { cycle: { 'spine.bend': [2, 32], 'pelvis.roll': [2, 44] }, ...HIPS, pelvis: { roll: -5 }, spine: { bend: -10, side: 4 }, neck: { nod: -3 }, pos: E0, yaw: 70, expr: 'grin', look: 'camera' }),
      hold(410, { cycle: { 'spine.bend': [2, 32], 'pelvis.roll': [2, 44] }, antic: 0.35, ...HIPS, pelvis: { roll: -5 }, spine: { bend: -6, side: 4 }, neck: { nod: 8 }, pos: E0, yaw: 70, expr: 'grin', look: 'camera' }),
      hold(432, PICK[12] === 'cp' ? { ...HIPS, pos: [OX + 2.1, -6.6, 0], yaw: 175, expr: 'grin', look: 'loco' } : { pos: [OX + 2.4, 40, 0], yaw: 0, expr: 'grin', look: 'camera' }),
    ]),
    mag: polish([
      hold(0, { pos: M0, yaw: 10, expr: 'smug', look: 'camera' }),
      hold(168, { pos: [RX - 0.9, 60, 0], yaw: 10, expr: 'smug', look: 'camera' }),
      // P7 he mocks the rattling blue train: points back at it, other hand on the belly, then laughs
      hold(210, { armR: { raise: 15, swing: 10, elbow: 30 }, armL: { raise: 20, swing: 40, elbow: 120 }, pos: M0, yaw: 10, expr: 'smug', look: 'camera' }),
      hold(226, { t: 16, antic: 0.1, armR: { raise: 70, swing: 40, elbow: 18 }, armL: { raise: 20, swing: 40, elbow: 120 }, pelvis: { roll: 5 }, spine: { bend: -6, side: -6 }, pos: M0, yaw: 10, expr: 'smug', look: 'camera' }),
      hold(242, { t: 18, antic: 0.1, armR: { raise: 22, swing: 25, elbow: 35 }, armL: { raise: 25, swing: 50, elbow: 120 }, spine: { bend: -24, side: 6 }, neck: { nod: -28 }, bob: -0.04, pos: M0, yaw: 10, expr: 'laugh', look: 'camera' }),
      // P14 he sees it: the take, then the scream
      hold(465, { pos: [RX - 0.9, 60, 0], yaw: 10, expr: 'smug', look: 'camera' }),   // off the line while it buckles (P13)
      hold(522, { spine: { bend: 4 }, armL: { raise: 15, swing: 5, elbow: 20 }, armR: { raise: 15, swing: 5, elbow: 20 }, pos: M0, yaw: 10, expr: 'shock', look: 'camera' }),
      hold(531, { t: 9, cycle: { 'spine.side': [1.5, 4], 'neck.tilt': [2, 5] }, bob: 0.10, spine: { bend: -14 }, armL: { raise: 72, swing: -45, elbow: 35 }, armR: { raise: 75, swing: -40, elbow: 30 }, pos: M0, yaw: 10, expr: 'shock', look: 'camera' }),
      hold(537, { t: 5, cycle: { 'spine.side': [1.5, 4], 'neck.tilt': [2, 5] }, bob: -0.02, spine: { bend: -10 }, armL: { raise: 72, swing: -45, elbow: 35 }, armR: { raise: 75, swing: -40, elbow: 30 }, pos: M0, yaw: 10, expr: 'shock', look: 'camera' }),
      hold(540, { t: 10, cycle: { 'spine.side': [2, 4], 'neck.tilt': [2.5, 5, 1] }, antic: 0.2, spine: { bend: -8, side: 5 }, armL: { raise: 68, swing: -42, elbow: 70 }, armR: { raise: 72, swing: -38, elbow: 65 }, pos: M0, yaw: 10, expr: 'scream', look: 'camera' }),
    ]),
  },
  // 3.2: the storyboard's drawn layer (engine/overlays.js)
  overlays: [
    { kind: 'text', text: 'clack!', from: 100, to: 112, at: [0.28, 0.24], size: 95, shake: 6 },
    { kind: 'text', text: 'clack!', from: 118, to: 131, at: [0.72, 0.18], size: 95, tilt: 8, shake: 6 },
    { kind: 'text', text: 'CLACK!', from: 150, to: 167, at: [0.5, 0.26], size: 175, tilt: -12, shake: 12 },
    { kind: 'arrows', from: 300, to: 344, world: [JX + 0.12, 0, 0.17], axis: [0, 1, 0], len: 0.15, gap: 0.04, inward: true },
    { kind: 'arrows', from: 300, to: 344, world: [JX - 0.12, 0, 0.17], axis: [0, 1, 0], len: 0.15, gap: 0.04, inward: true },
    { kind: 'loupe', from: 350, to: 389, look: [JX, 0, 0.17], cam: { pos: [JX - 0.42, 0.01, 0.22], aim: [JX, 0, 0.16], lens: 50 }, at: [0.3, 0.24], r: 0.2 },
    { kind: 'loupe', from: 392, to: 431, look: [JX, 0, 0.17], cam: { pos: [JX - 0.42, 0.01, 0.22], aim: [JX, 0, 0.16], lens: 50 }, at: [0.24, 0.8], r: 0.17 },
  ],
  beats: [
    // khâu 4 · Post: sound from the picture (names from tools/sound_bank.py); the rival's line stays silent on purpose
    ...[0, 8, 16, 23].map(f => ({ f, who: 'joint', do: 'sound', name: 'saw', strength: 0.55 })),
    { f: 90, who: 'loco', do: 'sound', name: 'chug', strength: 0.5 }, { f: 100, who: 'loco', do: 'sound', name: 'clack', strength: 0.6 },
    { f: 118, who: 'loco', do: 'sound', name: 'clack', strength: 0.6 }, { f: 150, who: 'loco', do: 'sound', name: 'clack', strength: 0.95 },
    { f: 266, who: 'board', do: 'sound', name: 'flutter', strength: 0.4 }, { f: 300, who: 'joint', do: 'sound', name: 'crank', strength: 0.45 },
    { f: 434, who: 'loco', do: 'sound', name: 'chug', strength: 0.4 }, { f: 470, who: 'rtrack', do: 'sound', name: 'groan', strength: 0.75 },
    { f: 523, who: 'mag', do: 'sound', name: 'sting', strength: 0.7 }, { f: 578, who: 'rloco', do: 'sound', name: 'whoosh', strength: 0.8 },
    { f: 606, who: 'rloco', do: 'sound', name: 'boom', strength: 0.9 },
    set('joint', 'gap', 1), set('board', 'temp', 0.2), set('loco', 'y', 60), set('rloco', 'y', 120), set('rloco', 'lamp', 0), set('rloco', 'lamp', 1, 553, 0),
    set('loco', 'y', 14, 85, 0), set('loco', 'y', 2, 87, 45, 'linear'), set('loco', 'y', -8, 132, 36, 'linear'),   // P4-P5: blue train clacks over the gap
    set('loco', 'y', 60, 168, 0), set('joint', 'light', 1, 132, 0), set('joint', 'light', 0, 168, 0), set('rloco', 'y', 6, 166, 0), set('rloco', 'y', -6, 168, 42, 'linear'), set('rloco', 'y', 120, 210, 0),      // P6: purple train runs smooth
    set('loco', 'y', 20, 210, 0), set('loco', 'y', 12, 210, 54, 'linear'),                // P7: small blue train behind the boss
    set('board', 'temp', 0.85, 264, 30), set('board', 'month', 1, 266, 12),                // P8: summer comes
    set('rtrack', 'heat', 0.6, 297, 30), set('joint', 'heat', 0.6, 297, 30),              // P9: the steel grows
    set('loco', 'y', 80, 345, 0), set('joint', 'gap', 0.3, 300, 44, 'smooth'), set('board', 'temp', 1, 345, 20), set('joint', 'gap', 0, 352, 30), set('joint', 'heat', 0.75, 345, 30),   // P10-P11: gaps close
    set('loco', 'y', 14, 430, 0), set('loco', 'y', 2, 432, 33, 'linear'), set('loco', 'y', 60, 465, 0),              // P12: blue train runs safe on the hot day
    set('rtrack', 'heat', 1, 465, 20), set('rtrack', 'buckle', 1, 466, 30, 'out'),        // P13: purple bends like a snake
    set('rloco', 'y', BK + 3, 553, 0), set('loco', 'y', 30, 553, 0), set('rloco', 'y', BK - 3, 556, 58, 'linear'), set('rloco', 'off', 1, 558, 20, 'in'), set('rloco', 'fall', 1.2, 578, 36, 'linear'),             // P15: purple train goes over the lip
  ],
  direct: [
    c(1, 'est', 'PURPOSE: he cuts a gap in his own rail. Front 3/4 at his height, saw on the rail, plain wall behind', [JX - 1.1, 1.25, 1.5], [JX + 0.2, -0.05, 0.62], 30),
    c(2, 'low', 'PURPOSE: he is proud of it. Low angle, face against the sky, nothing else', [3.25, -0.95, 0.4], [OX + 1.05, -0.15, 1.45], 34),
    c(3, 'ms', 'PURPOSE: this is the gap. He stands over the joint and looks down at it; the magnifier inset shows the gap', [JX - 1.4, 1.3, 1.05], [JX + 0.3, -0.25, 0.78], 26),
    c(4, 'ws', 'PURPOSE: his train rattles over the gaps. Whole blue train coming at 3/4, wall side', [3.0, -18, 1.8], [OX, 8, 1.2], 60),
    c(5, 'insert', 'PURPOSE: the wheel drops in the gap: CLACK. Wheel fills the frame', [JX + 1.3, -0.9, 0.38], [JX, 0.1, 0.3], 35),
    c(6, 'ws', 'PURPOSE: the rival train glides silent. Mirror of P4 from the canyon side', [-4.0, -18, 1.8], [RX, 6, 1.2], 60),
    c(7, 'low', 'PURPOSE: the rival boss mocks the gaps. Low angle on him, sky behind, blue train small far right', [RX - 0.1, BK - 9.9, 0.6], [RX - 0.45, BK - 7.4, 1.5], 35),
    c(8, 'cu', 'PURPOSE: summer comes. Board fills the frame: calendar MAY to JULY, thermometer rising', [2.0, 1.6, 1.05], [3.6, 1.6, 1.0], 35),
    c(9, 'insert', 'PURPOSE: the steel grows in the heat. Low along the glowing rail to the joint', [JX - 0.02, 0, 0.75], [JX, 0, 0.17], 35),
    c(10, 'ms', 'PURPOSE: hottest day, he is calm. He and the full thermometer, wall behind (inset later)', [1.0, -0.35, 1.15], [3.05, 0.6, 1.1], 26),
    c(11, 'low', 'PURPOSE: the gaps closed, he was right. Low close-up, smug face against the sky', [3.45, -0.65, 0.85], [OX + 1.05, -0.15, 1.5], 50),
    c(12, 'ws', 'PURPOSE: his train still runs safe. Same framing as P4 (rhyme)', [JX + 1.15, 1, 0.35], [OX, 10, 0.9], 24),
    c(13, 'ws', 'PURPOSE: the rival rail has nowhere to go and bends. Low along the purple line', [RX + 0.6, BK - 7, 0.6], [RX, BK + 1, 0.15], 34),
    c(14, 'cu', 'PURPOSE: the boss sees it. Low close-up, shocked face against the sky', [RX - 0.85, BK - 8.7, 1.3], [RX - 0.9, BK - 7.5, 1.75], 45),
    c(15, 'wide', 'PURPOSE: the rival train goes over the lip. Wide from the canyon side', [-12, BK + 3, 0.5], [RX - 1.5, BK + 5, 0.3], 35),
    ...(PICK[15] === 'emo' ? [{ at: { f: 572 }, intent: 'wide', why: 'P15b · from the canyon side above the lip, the train falls away', cut: 'cut', cam: P([-15, BK + 1, 1.2], [RX - 3.5, BK + 4, -2.5], 24), kick: kick(580) }] : []),
    ...(PICK[15] === 'cp' ? [{ at: { f: 578 }, intent: 'wide', why: 'P15b · lip against the sky, the train falls past', cut: 'cut', cam: P([-6.8, BK + 4, -6], [RX - 3, BK + 5, 2.5], 24), kick: kick(584) }] : []),
  ],
};
