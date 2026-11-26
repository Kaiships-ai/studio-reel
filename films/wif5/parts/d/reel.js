// wif5 part d (film 1134-1343, here 0-209): the lantern. The father holds the lit paper lantern up in both hands over
// his head, its light on his hands and face from above; his son walks in beside him (a child only walks) and both look up
// at it; it rises from his hands into a sky of lanterns. Stills (film = 1134 + local): contact 1146 (his hands round the
// glowing lantern, close), beat 1174 (the son walks in), beat 1196 (both look up at it), beat 1290 (it rises from his
// open hands), beat 1324 (it goes up into the sky of others). Kit only through person()/place(); his hands are held up by
// arm IK on the carry clip's own keys (figure-local W units, engine/cast.js pose2), as in part a.
import { person, W_M } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
import './props.js';
import { MARKS, RELEASE, HELD } from './set.js';

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
const D = MARKS.dad.slice(0, 2), sD = dad.spec.scale ?? 1;
// both fists on the crossbar's ends, raised in front of his face and over his head; after the release, the same open
// hands stay up a moment, then come down
const ends = (pos, yaw) => [-1, 1].map(sx => [HELD[0] + sx * 0.22 * Math.cos(yaw * DEG), HELD[1] + sx * 0.22 * Math.sin(yaw * DEG), HELD[2]]);
// the carry clip (its own prop channels: the lantern in both fists) with IK keys over it: partial keys, the clip's other
// channels play on underneath
const UP = { nod: -50, tilt: 0, turn: 0 };   // his head tipped back to look up at it (nod < 0 is up)
const ikKey = (f, w, pos = D, yaw = YAW_DAD) => { const k = { f, neck: UP }; for (const P of ends(pos, yaw)) { const q = local(P, pos, yaw, sD), side = q[0] < 0 ? 'armL' : 'armR'; k[side] = { ik: q, ikw: w }; } return k; };
const HOLD = [dad.clip('Idle_CarryBag_Loop', { f: 0, pos: D, yaw: YAW_DAD, swap: { hugbag: 'wif5_lantern2' } }), ...[0, 20, 56, 100, RELEASE - 1].map(f => ikKey(f, 1))];
const OPEN = [dad.clip('Idle_Stand_Loop', { f: RELEASE, pos: D, yaw: YAW_DAD, props: {} }), ...[[RELEASE, 1], [RELEASE + 20, 1], [RELEASE + 50, 0]].map(([f, w]) => ({ ...ikKey(f, w), x_hpB_wif5_lantern2: 0, x_hpB_hugbag: 0 }))];   // let go: out of his hands
const DAD = [...HOLD, ...OPEN];
Object.assign(HOLD[0], { expr: 'calm' }); Object.assign(OPEN[0], { expr: 'calm' });
// the son walks in along the path to his father's side and turns to face out with him, looking up at the lantern; after
// the release he walks slowly on toward the camera, still looking up
const sS = son.spec.scale ?? 1, S0 = MARKS.son0.slice(0, 2), S1 = MARKS.son1.slice(0, 2);
let SON = expandClips([son.clip('Move_Walk_Fwd_Loop', { f: 0, pos: S0, to: S1, expr: 'calm', look: 'lantern' })]);
for (const f of [44, 52, 60, RELEASE - 1]) keyAt(SON, f);
SON = SON.filter(k => k.f < RELEASE);
const YAW_IN = SON.at(-1).yaw, YAW_OUT = 10;
for (const k of SON) { const u = ease(ramp(k.f, 40, 56)); k.yaw = YAW_IN * (1 - u) + YAW_OUT * u; k.neck = { ...k.neck, nod: (k.neck?.nod ?? 0) * (1 - u) - 50 * u }; }
const AWAY = expandClips([son.clip('Move_Walk_Fwd_Loop', { f: RELEASE, pos: S1, to: [S1[0] - 0.05, 0.55], expr: 'calm', look: 'up' })]);
for (const k of AWAY) k.neck = { ...k.neck, nod: -50 };
SON.push(...AWAY);
export const CUTS = [0, 20, 52, RELEASE];
export default {
  title: 'wif5 d: lantern', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'lake',
  frames: [0, 209], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.32, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3 at dusk: a low sky light, the sun under the horizon (weak, peach, from the far shore); lamp and lanterns
  light: { sun: [1.0, 0.66, 0.50], power: 0.45, sunDir: [0.2, 0.9, -0.25], sky: [0.42, 0.38, 0.62], ground: [0.22, 0.20, 0.22], hemi: 0.3,
    fill: [0.70, 0.66, 0.95], fillPower: 0.2, background: [0.10, 0.09, 0.16], lit: [1.0, 0.86, 0.74], shade: [0.56, 0.54, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.30, 0.24, 0.34], near: 18, far: 70 },
  set: 'lake', setModule: '/films/wif5/parts/d/set.js',
  make: { rise: { kind: 'ao_anim', prop: 'rise' }, sky: { kind: 'ao_anim', prop: 'sky' }, skyglow: { kind: 'ao_anim', prop: 'skyglow' } },
  cast: {
    dad: dad.cast({ at: [...D, 0], yaw: YAW_DAD, focus: 'camera0', lead: true }),
    son: son.cast({ at: [...MARKS.son0.slice(0, 2), 0], yaw: 46 }),
  },
  anim: {
    dad: DAD,
    son: SON,
  },
  direct: [
    { at: { f: 0 }, intent: 'insert', why: 'contact · his two fists round the bamboo crossbar, the lantern glowing over them, its light on his hands and his face below', cut: 'cut',
      cam: { pos: [0.35, 0.15, 1.5], aim: [0.27, 0.95, 1.78], lens: 26 } },
    { at: { f: 20 }, intent: 'low', why: 'D1 · at the water he holds the lit lantern up over his head; his son walks in to him along the bank', cut: 'cut',
      cam: { pos: [0.0, -1.1, 0.45], aim: [-0.2, 1.2, 1.22], lens: 20 } },
    { at: { f: 52 }, intent: 'low', why: 'D2 · side by side, both look up at it: its light on the father\'s hands and on the boy\'s face from above', cut: 'cut',
      cam: { pos: [0.1, -0.85, 1.1], aim: [0.05, 1.1, 1.45], lens: 22 } },
    { at: { f: RELEASE }, intent: 'high', why: 'D3 · it rises from his open hands over their heads, into a sky of lanterns over the water', cut: 'cut',
      cam: { pos: [0.1, -1.5, 0.95], aim: [0.1, 2.0, 2.9], lens: 20 } },
  ],
};
