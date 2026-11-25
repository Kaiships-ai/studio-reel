// Two in-scene clips of the expressions (dev only, for the approval page), on the kit's canyon-edge set, real bodies:
//   ?clip=familyA       elder + adult + child + toddler: excited, shocked, proud, sleepy
//   ?clip=expressionsB  adult + child: bored, sad, angry, embarrassed
//   node styles/stick-man/tools/render/shot.mjs --film styles/stick-man/tools/series/kitexpr/scenes --query clip=familyA --frames all --mp4 <out> --w 540 --h 960 --audio <wav> --pad-audio 1
// The bodies are the motion library's (no toddler body exists yet: the toddler stands on the child's).
import { SPECS } from '/styles/stick-man/engine/play.js';
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';
import '/styles/stick-man/kit/fx/make.js';
import { expressionBeats } from '/styles/stick-man/engine/expressions.js';
import { EDGE_LOOK, SUN_DIR } from '/styles/stick-man/kit/sets/canyon-edge.js';

const CLIPS = {
  familyA: { do: ['excited', 'shocked', 'proud', 'sleepy'], cam: { pos: [0.75, -4.6, 1.0], aim: [-0.2, 0, 1.2], lens: 35 },
    cast: { elder: ['elder', 'elder', [-0.8, 0.2, 0], [0.62, 0.45, 0.42]], adult: ['adult', 'adult', [0.12, 0.3, 0], [0.30, 0.46, 0.70]],
      child: ['child', 'child', [-1.0, -0.6, 0], [0.90, 0.66, 0.30]], toddler: ['child', 'toddler', [0.6, -0.4, 0], [0.50, 0.72, 0.46]] } },
  expressionsB: { do: ['bored', 'sad', 'angry', 'embarrassed'], cam: { pos: [0.65, -3.9, 0.95], aim: [-0.25, 0, 1.18], lens: 35 },
    cast: { adult: ['adult', 'adult', [-0.6, 0.1, 0], [0.30, 0.46, 0.70]], child: ['child', 'child', [0.3, -0.4, 0], [0.90, 0.66, 0.30]] } },
};
const CLIP = CLIPS[new URLSearchParams(globalThis.location?.search || '').get('clip') || 'familyA'];
// one expression every SLOT frames; the figures start LAG frames after each other (nobody feels on the same frame)
const SLOT = 74, LAG = 4, HOLD = 40, who = Object.keys(CLIP.cast);
for (const w of who) { const [body, age, , shirt] = CLIP.cast[w]; SPECS[`SC_${w.toUpperCase()}`] = { ...bodySpec({ name: w, shirt, hair: [] }, body), faceAge: age, tidyFeet: true }; }
export const CUTS = [0];
export default {
  title: 'kit expressions in a scene', fps: 30, glasses: false, steps: 'all', captions: { mode: 'word' }, style: 'kaiships', directDrift: 0, headMarks: 'bold',
  lines: [], show: [{ from: 0 }], overlays: [], frames: [0, CLIP.do.length * SLOT - 1], name: 'kitexpr-scenes', auto: false,
  // (the two trains far down the line, out of the picture)
  make: { loco: { kind: 'ao_anim', prop: 'loco' }, rloco: { kind: 'ao_anim', prop: 'rloco' } },
  beats: [...['loco', 'rloco'].map(who => ({ f: 0, who, do: 'set', key: 'y', to: 500 })), ...CLIP.do.flatMap((n, i) => who.flatMap((w, j) => expressionBeats(n, { f: i * SLOT + 6 + j * LAG }, w, { hold: HOLD })))],
  // (no haze: the head marks have no depth, so the set's light shafts wash their ink grey, unlike the face's)
  ...EDGE_LOOK, light: { ...EDGE_LOOK.light, sunDir: SUN_DIR }, grade: { ...EDGE_LOOK.grade, haze: 0, air: false },
  set: 'canyon-edge', setModule: '/styles/stick-man/kit/sets/canyon-edge.js', setOpts: {},
  cast: Object.fromEntries(who.map((w, j) => [w, { spec: `SC_${w.toUpperCase()}`, at: CLIP.cast[w][2], yaw: 12, expr: 'neutral', focus: 'camera', lead: j === 1 }])),
  direct: [{ at: { f: 0 }, intent: 'ws', why: 'the whole cast, knees up', cut: 'cut', cam: CLIP.cam }],
};
