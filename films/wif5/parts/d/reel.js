// wif5 part d (film 1134-1343, here 0-209): the lantern. The father stands at the water's edge with the lit paper lantern
// low in both hands; his son walks in to him (a child only walks) and reaches up, his hand onto it: four hands on one
// lantern; they let it go and it rises over the water into a sky of lanterns (lift). Stills (film = 1134 + local): contact
// 1146 (the father's fists on its crossbar), beat 1174 (the son walks in to him), beat 1196 (four hands on it),
// contact 1238 (the four hands), beat 1324 (it rises into the sky of others). Kit only through person()/place(); the son's
// hand meets it by arm IK on the walk's own keys (figure-local W units, engine/cast.js pose2), as in part a.
import { person, W_M } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
import './props.js';
import { MARKS, RELEASE, ONTO } from './set.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
const dad = person({ name: 'wif5_dad', body: 'adult', outfit: ['sweater:forest'], face: ['sad'], hair: [],
  clips: ['Idle_Stand_Loop', 'Idle_CarryBag_Loop'], waivers: [{ pair: 'hand|wif5_lantern2|adult|hand', why, by }] });
const son = person({ name: 'wif5_son', body: 'child', age: 'child', outfit: ['scarf:coral', 'sweater:navy'], hair: [], clips: ['Move_Walk_Fwd_Loop'] });

const DEG = Math.PI / 180, clone = k => JSON.parse(JSON.stringify(k));
const local = (P, pos, yaw, s) => { const d = [P[0] - pos[0], P[2], -(P[1] - pos[1])], c = Math.cos(yaw * DEG), n = Math.sin(yaw * DEG), k = W_M * s;
  return [(d[0] * c - d[2] * n) / k, d[1] / k, (d[0] * n + d[2] * c) / k]; };
const keyAt = (ks, f) => { let i = ks.findIndex(k => k.f >= f); if (i >= 0 && ks[i].f === f) return ks[i]; if (i < 0) i = ks.length;
  const k = clone(ks[Math.max(0, i - 1)]); k.f = f; delete k.expr; delete k.look; delete k.ease; ks.splice(i, 0, k); return k; };
const ramp = (f, a, b) => Math.max(0, Math.min(1, (f - a) / (b - a))), ease = u => u * u * (3 - 2 * u);

export const YAW_DAD = -10;
const D = MARKS.dad.slice(0, 2);
// the father holds it low from the start, turned to his son coming in; at the release he faces the water, hands empty
const DAD = [
  dad.clip('Idle_CarryBag_Loop', { f: 0, pos: D, yaw: YAW_DAD, swap: { hugbag: 'wif5_lantern2' }, expr: 'worried', look: 'son' }),
  { f: 56, expr: 'worried', look: 'lantern' },
  dad.clip('Idle_Stand_Loop', { f: RELEASE, pos: D, yaw: 180, props: {}, expr: 'calm', look: 'sky' }),
];
// the son walks in along the path to his father's left, turns to face out with him, and his near hand comes up onto the
// lantern's paper (ONTO): four hands on it
const sS = son.spec.scale ?? 1, S0 = MARKS.son0.slice(0, 2), S1 = MARKS.son1.slice(0, 2);
let SON = expandClips([son.clip('Move_Walk_Fwd_Loop', { f: 0, pos: S0, to: S1, expr: 'calm', look: 'lantern' })]);
for (const f of [34, 44, 48, 52, 56, 70, RELEASE - 1]) keyAt(SON, f);
SON = SON.filter(k => k.f < RELEASE);
const YAW_IN = SON.at(-1).yaw, YAW_OUT = 20;
for (const k of SON) { const u = ease(ramp(k.f, 48, 58)); k.yaw = YAW_IN * (1 - u) + YAW_OUT * u;
  const w = ease(ramp(k.f, 40, 56)), q = local(ONTO, k.pos, k.yaw, sS), side = q[0] < 0 ? 'armL' : 'armR'; if (w > 0) k[side] = { ...k[side], ik: q, ikw: w }; }
SON.push(...expandClips([son.clip('Move_Walk_Fwd_Loop', { f: RELEASE, pos: S1, to: [S1[0] + 0.1, 1.5], ease: 'snap', expr: 'calm', look: 'sky' })]));
export const CUTS = [0, 20, 52, 102, RELEASE];
export default {
  title: 'wif5 d: lantern', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'lake',
  frames: [0, 209], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.2, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3 at dusk: a low sky light, the sun under the horizon (weak, peach, from the far shore); lamp and lanterns
  light: { sun: [1.0, 0.66, 0.50], power: 0.45, sunDir: [0.2, 0.9, -0.25], sky: [0.42, 0.38, 0.62], ground: [0.22, 0.20, 0.22], hemi: 0.3,
    fill: [0.70, 0.66, 0.95], fillPower: 0.2, background: [0.10, 0.09, 0.16], lit: [1.0, 0.86, 0.74], shade: [0.56, 0.54, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.30, 0.24, 0.34], near: 18, far: 70 },
  set: 'lake', setModule: '/films/wif5/parts/d/set.js',
  make: { rise: { kind: 'ao_anim', prop: 'rise' }, sky: { kind: 'ao_anim', prop: 'sky' }, skyglow: { kind: 'ao_anim', prop: 'skyglow' } },
  cast: {
    dad: dad.cast({ at: [...D, 0], yaw: YAW_DAD, focus: 'son', lead: true }),
    son: son.cast({ at: [...MARKS.son0.slice(0, 2), 0], yaw: 46 }),
  },
  anim: {
    dad: DAD,
    son: SON,
  },
  direct: [
    { at: { f: 0 }, intent: 'insert', why: 'contact · his two fists on the bamboo crossbar under the lit paper', cut: 'cut',
      cam: { pos: [0.25, -0.05, 1.75], aim: [0.247, 0.95, 1.1], lens: 26 } },
    { at: { f: 20 }, intent: 'low', why: 'D1 · at the water the father holds the lit lantern low, its light on his face; his son walks in to him', cut: 'cut',
      cam: { pos: [0.3, -1.6, 1.95], aim: [-0.15, 0.8, 0.85], lens: 22 } },
    { at: { f: 52 }, intent: 'low', why: 'D2 · four hands on one lantern: the son reaches up onto it, the father holds it', cut: 'cut',
      cam: { pos: [0.9, -0.9, 1.45], aim: [0.05, 0.8, 0.95], lens: 26 } },
    { at: { f: 102 }, intent: 'insert', why: 'contact · the four hands on the lantern', cut: 'cut',
      cam: { pos: [0.8, -0.55, 1.4], aim: [0.12, 0.85, 1.0], lens: 26 } },
    { at: { f: RELEASE }, intent: 'high', why: 'D3 · let go: behind them, it rises over the water into a sky of lanterns', cut: 'cut',
      cam: { pos: [1.0, -1.6, 0.7], aim: [0.0, 6, 3.6], lens: 18 } },
  ],
};
