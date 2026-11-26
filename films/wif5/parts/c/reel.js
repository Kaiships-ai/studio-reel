// wif5 part c (film 984-1134, here 0-150): the care home. An old man stands stooped at a table for two, his hand on his cup;
// hers is poured, steaming, at the empty chair across from him, her cardigan over its back (an ache). Behind him the one
// carer left pushes the meal trolley, four trays on it, bent over the bar. Stills (film = 984 + local): beat 1024 (him, the two cups, the chair),
// contact 1028 (his hand on his cup), beat 1068 (the carer and the trolley), contact 1084 (both hands on its bar).
// Elder clips only (CAST.md): Idle_Stooped_Loop; the cup is a film prop in his hand. Kit only through person()/place().
import { person, toonHair, STYLE_PRESETS, W_M } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
import './props.js';
import { MARKS } from './set.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
const him = person({ name: 'wif5_old', body: 'elder', age: 'elder', outfit: ['sweater:sand'], face: ['sad'], hair: [toonHair('elder')],
  clips: ['Idle_Stooped_Loop'], waivers: [{ pair: 'hand|wif5_teacup|elder|hand', why, by }] });
const carer = person({ name: 'wif5_carer', body: 'adult', outfit: ['sweater:teal'], face: ['scared'], hair: [toonHair('crop', [0.16, 0.10, 0.06])],
  clips: ['Move_PushHeavy_Loop'], waivers: [{ pair: 'hand|wif5_trolley|adult|hand', why, by }] });

const TROLLEY = { crate: 'wif5_trolley' };
// motion v1 (blocking, 26/11): his cup hand is held by arm IK on the saucer from frame 0 (the stooped loop's own hand rose
// from his side through the table with the cup: prop 13 cm in the table, the hand off it); the point is where the hand
// rested on the table in the rows (z 0.82: the cup's foot on the cloth)
const DEG = Math.PI / 180, local = (P, pos, yaw, s) => { const d = [P[0] - pos[0], P[2], -(P[1] - pos[1])], c = Math.cos(yaw * DEG), n = Math.sin(yaw * DEG), k = W_M * s;
  return [(d[0] * c - d[2] * n) / k, d[1] / k, (d[0] * n + d[2] * c) / k]; };
const CUP_HAND = [-0.25, 1.09, 0.82], sH = him.spec.scale ?? 1;
const HIM = expandClips([him.clip('Idle_Stooped_Loop', { f: 0, pos: MARKS.him.slice(0, 2), yaw: 0, props: { L: 'wif5_teacup' }, expr: 'worried', look: 'hercup' })]);
HIM[0].props = { L: 'wif5_teacup' };   // (expandClips passes only expr/look/ease/antic/cycle on: the cup goes on the first key by hand)
for (const k of HIM) k.armL = { ...k.armL, ik: local(CUP_HAND, k.pos, k.yaw, sH), ikw: 1 };
HIM.push({ f: 70, look: 'chair' });
export const CUTS = [0, 42, 70, 98];
export default {
  title: 'wif5 c: care home', fps: 30, glasses: false, style: { ...STYLE_PRESETS.kaiships, life: 0.75 }, directDrift: 0, name: 'dayroom',
  frames: [0, 150], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3: the care home keeps the low window sun at 3.0; sky light low; the warmth from the lamps
  light: { sun: [1.0, 0.72, 0.46], power: 3.0, sunDir: [-0.75, 0.35, -0.45], sky: [0.46, 0.42, 0.52], ground: [0.36, 0.26, 0.18], hemi: 0.3,
    fill: [0.78, 0.82, 1.0], fillPower: 0.22, background: [0.10, 0.08, 0.08], lit: [1.0, 0.90, 0.78], shade: [0.62, 0.58, 0.70], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.10, 0.08, 0.07], near: 14, far: 60 },
  // kituse depth: far town rows seen through the wide window on the right wall (dusk albedo, the A recipe)
  backdrop: { tint: [0.30, 0.26, 0.28], rows: [{ piece: 'backdrop_skyline_a', at: [14, 4, 0], rot: -90 }, { piece: 'backdrop_roofline', at: [10, -4, 0], rot: -90 }] },
  set: 'dayroom', setModule: '/films/wif5/parts/c/set.js',
  cast: {
    him: him.cast({ at: [...MARKS.him.slice(0, 2), 0], yaw: 0, focus: 'hercup', lead: true }),
    carer: carer.cast({ at: [2.5, 2.7, 0], yaw: -90 }),
  },
  anim: {
    him: HIM,
    carer: [
      // (pushed on toward x 0.5, so the clip's let-go outro starts after the part ends: at 1.5 he let go at 132 and stepped back)
      carer.clip('Move_PushHeavy_Loop', { f: 0, pos: [2.5, 2.7], to: [0.5, 2.7], swap: TROLLEY, expr: 'nervous', look: 'trays' }),
    ],
  },
  direct: [
    { at: { f: 0 }, intent: 'low', why: 'C1 · close across the table: his face high, his hand on his cup low, her cup poured and steaming in front', cut: 'cut',
      cam: { pos: [-0.2, 0.45, 1.15], aim: [-0.08, 1.63, 1.0], lens: 16 } },
    { at: { f: 42 }, intent: 'insert', why: 'contact · his hand on his cup', cut: 'cut',
      cam: { pos: [0.15, 0.6, 1.1], aim: [-0.2, 1.32, 1.01], lens: 20 } },
    { at: { f: 70 }, intent: 'low', why: 'C2 · the carer behind, bent over the meal trolley with four trays, seen from ahead of it, a little high: the bar under his face, his arms either side of it', cut: 'cut',
      cam: { pos: [0.1, 2.2, 1.6], aim: [1.7, 2.68, 0.75], lens: 24 } },
    { at: { f: 98 }, intent: 'insert', why: 'contact · both hands on the trolley bar, from ahead, his face clear above and behind it', cut: 'cut',
      cam: { pos: [0.4, 2.4, 1.45], aim: [1.3, 2.65, 0.95], lens: 20 } },
  ],
};
