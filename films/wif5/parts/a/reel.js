// wif5 part a, stills at final light: a busy New Year square counts down; on ONE everyone looks up at the big clock; at
// midnight (330) the women are gone mid-cheer. The dad's hand stays on air where his daughter's was, her red balloon rises
// free over where she stood, the old man holds his wife's empty handbag. People come only from person() (fits table); hands meet by arm IK
// on the clips' own keys (figure-local W units, engine/cast.js pose2).
import { person, bun, W_M } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
import { YAW, WALK, START, GONE, ELDERS, CLOCK, U, RIGHT, at, girl, dadAt, handAt, CAMS, balloonHand, balloonAt } from '/films/wif5/parts/a/path.js';

const SKIN = [[0.86, 0.72, 0.60], [0.74, 0.56, 0.44], [0.60, 0.43, 0.33], [0.90, 0.78, 0.66]];
const hair = c => [bun(c)];
const dadP = person({ name: 'wif5_dad', body: 'adult', outfit: ['sweater:coral'], face: ['excited'], skin: SKIN[0],
  clips: ['Move_Walk_Fwd_Loop', 'Idle_Stand_Loop', 'React_Surprise_Once'] });
const girlP = person({ name: 'wif5_girl', body: 'child', age: 'child', outfit: ['scarf:mustard', 'sweater:sky'], skin: SKIN[3], hair: hair([0.30, 0.16, 0.07]), prop: 'balloon', clips: ['Move_Walk_Fwd_Loop'] });
const oldM = person({ name: 'wif5_oldman', body: 'elder', age: 'elder', outfit: ['sweater:slate'], skin: SKIN[1], clips: ['Idle_Breath_Loop'] });
const oldW = person({ name: 'wif5_oldwoman', body: 'elder', age: 'elder', outfit: ['cardigan:plum', 'shirt:office', 'skirt:navy'], skin: SKIN[0], hair: hair([0.78, 0.76, 0.74]), clips: ['Idle_Breath_Loop'] });
const MEN = [['sweater:forest'], ['shirt:work'], ['pens', 'shirt:office', 'tie'], ['sweater:navy'], ['sweater:mustard']];
const GIRTH = [1, 1.35, 1, 1, 1];
const WOMEN = ['rose', 'sky', 'coral', 'teal', 'sand'];
const MCLIPS = ['Gest_Wave_Loop', 'Gest_Clap_Loop', 'Gest_LookUp_Once', 'React_Surprise_Once', 'Idle_Stand_Loop'];
const WCLIPS = ['Gest_Clap_Loop', 'Gest_LookUp_Once', 'Idle_Stand_Loop'];
// couples around the square, each facing the clock: [man, woman] spots
const COUPLES = [[[-3.4, 5.2], [-2.85, 5.25]], [[3.6, 3.4], [4.15, 3.5]], [[3.8, 7.4], [4.35, 7.3]], [[-3.6, -5.4], [-3.05, -5.3]], [[-4.6, -4.2], [-4.05, -4.1]]];
const men = MEN.map((o, i) => person({ name: `wif5_man${i}`, body: 'adult', outfit: o, girth: GIRTH[i], skin: SKIN[(i + 1) % 4], clips: MCLIPS }));
const women = WOMEN.map((c, i) => person({ name: `wif5_woman${i}`, body: 'adult', outfit: ['skirt:navy', `sweater:${c}`], girth: 0.9, skin: SKIN[(i + 2) % 4],
  hair: hair([[0.16, 0.09, 0.05], [0.42, 0.24, 0.10], [0.08, 0.06, 0.05], [0.55, 0.36, 0.16], [0.24, 0.13, 0.06]][i]), clips: WCLIPS }));

// ---- key tools
const DEG = Math.PI / 180, clone = k => JSON.parse(JSON.stringify(k));
const faceClock = p => Math.atan2(CLOCK[0] - p[0], -(CLOCK[1] - p[1])) / DEG;
const local = (P, pos, yaw, s) => { const d = [P[0] - pos[0], P[2], -(P[1] - pos[1])], c = Math.cos(yaw * DEG), n = Math.sin(yaw * DEG), k = W_M * s;
  return [(d[0] * c - d[2] * n) / k, d[1] / k, (d[0] * n + d[2] * c) / k]; };
const keyAt = (ks, f) => { let i = ks.findIndex(k => k.f >= f); if (i >= 0 && ks[i].f === f) return ks[i]; if (i < 0) i = ks.length;
  const k = clone(ks[Math.max(0, i - 1)]); k.f = f; delete k.expr; delete k.look; delete k.ease; ks.splice(i, 0, k); return k; };
const span = (ks, f0, f1, fn) => { for (const k of ks) if (k.f >= f0 && k.f <= f1) fn(k); return ks; };
const ramp = (f, a, b) => Math.max(0, Math.min(1, (f - a) / (b - a))), ease = u => u * u * (3 - 2 * u);
const grip = (k, P, s) => { const q = local(P, k.pos, k.yaw, s), side = q[0] < 0 ? 'armL' : 'armR'; k[side] = { ...k[side], ik: q, ikw: 1 }; return side; };
const raise = (k, side, w, to = { raise: 160, swing: 12, elbow: 28 }) => { const a = k[side] || {};
  k[side] = { ...a, ...Object.fromEntries(Object.entries(to).map(([n, v]) => [n, (a[n] ?? 0) * (1 - w) + v * w])) }; };
const nod = (k, w, deg, turn = null) => { const n = k.neck || {}; k.neck = { ...n, nod: (n.nod ?? 0) * (1 - w) + deg * w, ...(turn == null ? {} : { turn: (n.turn ?? 0) * (1 - w) + turn * w }) }; };
const gone = (ks, f) => { const out = ks.filter(k => k.f < f), last = clone(out.at(-1)); delete last.expr; delete last.look;
  return [...out, { ...last, f, ease: 'snap', pos: [last.pos[0], last.pos[1], -6] }]; };
const mark = (ks, f, o) => Object.assign(keyAt(ks, f), o);
const other = s => (s === 'armL' ? 'armR' : 'armL');

// ---- the girl: walks the whole countdown at her dad's side (a child only walks), her hand in his; gone at midnight
const sG = girlP.spec.scale ?? 1, sD = dadP.spec.scale ?? 1, sE = oldM.spec.scale ?? 1;
let G = expandClips([girlP.clip('Move_Walk_Fwd_Loop', { f: 0, pos: START, yaw: YAW, to: at(START, WALK) })]);
G = gone(G, GONE);
for (const k of G) if (k.f < GONE) { const side = grip(k, handAt(k.f), sG), o = other(side); k[o] = { ...k[o], ik: local(balloonHand(k.f), k.pos, k.yaw, sG), ikw: 1 };
  k[`x_hp${o === 'armL' ? 'L' : 'R'}_balloon`] = 1; }   // her other hand holds the kit balloon by its string
for (const k of G) if (k.f >= GONE) for (const x of Object.keys(k)) if (x.startsWith('x_hp')) delete k[x];   // gone: the set's balloon takes over
for (const k of G) if (k.f < GONE) { nod(k, ease(ramp(k.f, 282, 296)), -24, 20); nod(k, ease(ramp(k.f, 312, 322)), -22, -10); }
mark(G, 0, { expr: 'happy', look: 'dad' }); mark(G, 120, { expr: 'grin', look: CLOCK }); mark(G, 284, { expr: 'excited', look: CLOCK }); mark(G, 312, { expr: 'grin', look: 'dad' });

// ---- the dad: walks with her (his feet on her pace), cheers with his free arm, looks up on ONE; after midnight he stands
// where she left him, his hand still where hers was
const d0 = dadAt(0);
let D = expandClips([dadP.clip('Move_Walk_Fwd_Loop', { f: 0, pos: d0, yaw: YAW, to: at(d0, WALK * 1.6) })]).filter(k => k.f < GONE);
for (const k of D) { const p = dadAt(k.f), dx = p[0] - k.pos[0], dy = p[1] - k.pos[1]; k.pos = [p[0], p[1], k.pos[2] || 0]; k.yaw = YAW;   // his body on her pace
  for (const l of ['legL', 'legR']) if (k[l]?.footW) k[l] = { ...k[l], footW: [k[l].footW[0] + dx, k[l].footW[1] + dy, k[l].footW[2]] }; }
const hold = grip(D[0], handAt(0), sD), free = other(hold);
for (const k of D) { grip(k, handAt(k.f), sD); nod(k, ease(ramp(k.f, 282, 294)), -32, 40); nod(k, ease(ramp(k.f, 312, 322)), 10, 15); }   // up at the clock (on his left), then down to her   // up at the clock, then down to her
for (const f of [70, 80, 112, 122, 306, 316]) keyAt(D, f);
span(D, 70, 122, k => raise(k, free, ease(Math.min(ramp(k.f, 70, 80), 1 - ramp(k.f, 112, 122))), { raise: 112, swing: 38, elbow: 60 }));
span(D, 306, GONE, k => raise(k, free, ease(ramp(k.f, 306, 316))));
const dEnd = dadAt(GONE);
const D2 = expandClips([dadP.clip('Idle_Stand_Loop', { f: GONE, pos: dEnd, yaw: YAW, ease: 'snap' }), dadP.clip('Idle_Stand_Loop', { f: 400 }), dadP.clip('Idle_Stand_Loop', { f: 470 })]);
for (const f of [GONE, 331, 340, 352, 366, 380, 420, 450, 462, 480, 496, 500]) keyAt(D2, f);
const he = handAt(GONE - 1), handUp = [dEnd[0] + U[0] * 0.35 - RIGHT[0] * 0.2, dEnd[1] + U[1] * 0.35 - RIGHT[1] * 0.2, 1.95];   // he reaches up after her balloon
for (const k of D2) { k.pos = [...dEnd, 0]; k.yaw = YAW;          // his hand stays out where hers was; his head goes up after the balloon, then down
  const w = ease(ramp(k.f, 352, 380)) * (1 - 0.7 * ease(ramp(k.f, 462, 496))); k[hold] = { ...k[hold], ik: local(he.map((v, i) => v * (1 - w) + handUp[i] * w), [...dEnd, 0], YAW, sD), ikw: 1 };
  nod(k, 1, -12, 25); nod(k, ramp(k.f, 334, 352), -34, 20); nod(k, ease(ramp(k.f, 352, 380)), -40, 10); nod(k, ease(ramp(k.f, 462, 496)), 22, 30); raise(k, free, Math.max(0, 1 - ramp(k.f, GONE, 340))); }
D = [...D, ...D2];
mark(D, 0, { expr: 'grin', look: 'camera' }); mark(D, 150, { expr: 'happy', look: 'girl' }); mark(D, 284, { expr: 'excited', look: CLOCK }); mark(D, 312, { expr: 'grin', look: 'girl' });
mark(D, GONE, { expr: 'shock', look: balloonAt(334).c }); mark(D, 352, { expr: 'shock', look: balloonAt(362).c }); mark(D, 380, { expr: 'sad', look: balloonAt(420).c }); mark(D, 470, { expr: 'sad', look: [...girl(GONE), 0.1] });

// ---- the old couple: hand in hand, their joined hands go up at midnight; she is gone, his hand stays up
const yE = faceClock([(ELDERS.man[0] + ELDERS.woman[0]) / 2, ELDERS.man[1]]), low = [ELDERS.hand[0], ELDERS.hand[1] + 0.06, 0.62], up = ELDERS.hand;
const elder = (p, pos, n) => { const ks = expandClips([p.clip('Idle_Breath_Loop', { f: 0, pos, yaw: yE, times: n })]); for (const f of [290, 300, 312, 322, GONE - 1]) keyAt(ks, f); return ks; };
const handE = f => { const w = ease(ramp(f, 300, 316)); return low.map((v, i) => v * (1 - w) + up[i] * w); };
let OM = elder(oldM, ELDERS.man, 5), OW = gone(elder(oldW, ELDERS.woman, 3), GONE);
for (const f of [340, 360, 450]) keyAt(OM, f);
for (const f of [352]) keyAt(OM, f);
for (const [ks, s] of [[OM, sE], [OW, oldW.spec.scale ?? 1]]) for (const k of ks) if (k.f < GONE || ks === OM) {
  const side = grip(k, handE(Math.min(k.f, GONE)), s); nod(k, ease(ramp(k.f, 286, 300)) * (1 - 0.6 * ramp(k.f, 336, 350)), -26);
  if (ks === OW) { const q = local(ELDERS.bag0, k.pos, k.yaw, s); k[other(side)] = { ...k[other(side)], ik: q, ikw: 1 }; }
} 
mark(OM, 0, { expr: 'happy', look: 'oldwoman' }); mark(OM, 290, { expr: 'grin', look: CLOCK }); mark(OM, 336, { expr: 'worried', look: [...ELDERS.woman, 1.2] }); mark(OM, 352, { expr: 'sad', look: [ELDERS.bag0[0], ELDERS.bag0[1], 0.1] });   // her bag on the snow; his hand stays up, holding nothing
mark(OW, 0, { expr: 'happy', look: 'oldman' }); mark(OW, 290, { expr: 'grin', look: CLOCK });

// ---- the crowd: couples clap and wave, look up on ONE, throw their arms up at midnight; the women are gone at 330
const cast = {}, anim = {};
COUPLES.forEach(([mp, wp], i) => {
  const ym = faceClock(mp), yw = faceClock(wp);
  const M = expandClips([men[i].clip(i % 2 ? 'Gest_Clap_Loop' : 'Gest_Wave_Loop', { f: 0, pos: mp, yaw: ym, times: 2 }), men[i].clip('Gest_Clap_Loop', { f: 186 }),
    men[i].clip('Gest_LookUp_Once', { f: 272 }), men[i].clip('React_Surprise_Once', { f: 346 }), men[i].clip('Idle_Stand_Loop', { f: 406 })]);
  let Wk = expandClips([women[i].clip('Gest_Clap_Loop', { f: 0, pos: wp, yaw: yw, times: 3 }), women[i].clip('Gest_LookUp_Once', { f: 272 })]);
  for (const ks of [M, Wk]) { for (const f of [300, 308, 318, 324, 329, 336, 344]) keyAt(ks, f);
    span(ks, 300, 346, k => { const w = ease(Math.min(ramp(k.f, 308, 318), 1 - ramp(k.f, 336, 346))); raise(k, 'armL', w); raise(k, 'armR', w, { raise: 150, swing: 18, elbow: 34 }); }); }
  Wk = gone(Wk, GONE);
  mark(M, 0, { expr: i % 2 ? 'grin' : 'happy', look: CLOCK }); mark(M, 300, { expr: 'excited' }); mark(M, 346, { expr: 'shock', look: [...wp, 1.4] });
  mark(Wk, 0, { expr: i % 2 ? 'happy' : 'grin', look: CLOCK }); mark(Wk, 300, { expr: 'excited' });
  cast[`man${i}`] = men[i].cast({ at: [...mp, 0], yaw: ym }); cast[`woman${i}`] = women[i].cast({ at: [...wp, 0], yaw: yw });
  anim[`man${i}`] = M; anim[`woman${i}`] = Wk;
});

// ---- cameras: one shot a beat (each a cut); a still is read at its beat frame
const cam = (f, why, pos, aim, lens, to) => ({ at: { f }, intent: 'still', why: `P1 · ${why}`, cut: 'cut', cam: { pos, aim, lens },
  to: to || { pos, aim, lens }, move: { from: { f }, dur: 1, ease: 'linear' } });
export const SHOTS = { 0: 0, 90: 86, 200: 196, contact_hands: 226, contact_old: 246, 300: 294, 310: 306, 329: 318, 342: 330, 360: 350, 450: 440 };
export const STILLS = { beat_0: 0, beat_90: 90, beat_200: 200, contact_dad_daughter_hands: 230, contact_old_couple_hands: 250, beat_300: 300, beat_310: 310, beat_329: 329, beat_342: 342, beat_360: 360, beat_450: 450 };

export default {
  title: 'wif5 a: countdown', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'square',
  frames: [0, 504], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.62, 0.70, 1.0], power: 0.7, sunDir: [0.35, 0.55, -0.76], sky: [0.34, 0.40, 0.62], ground: [0.30, 0.24, 0.20], hemi: 0.32,
    fill: [1.0, 0.86, 0.70], fillPower: 0.25, background: [0.035, 0.045, 0.095], lit: [1.0, 0.90, 0.76], shade: [0.66, 0.62, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.065, 0.08, 0.125], near: 18, far: 80 },
  set: 'square', setModule: '/films/wif5/parts/a/set.js',
  make: { clock: { kind: 'ao_anim', prop: 'clock' }, snow: { kind: 'ao_anim', prop: 'snow' }, board: { kind: 'ao_anim', prop: 'board' }, balloon: { kind: 'ao_anim', prop: 'balloon' }, bag: { kind: 'ao_anim', prop: 'bag' } },
  cast: { dad: dadP.cast({ at: [...d0, 0], yaw: YAW, lead: true }), girl: girlP.cast({ at: [...START, 0], yaw: YAW }),
    oldman: oldM.cast({ at: [...ELDERS.man, 0], yaw: yE }), oldwoman: oldW.cast({ at: [...ELDERS.woman, 0], yaw: yE }), ...cast },
  anim: { dad: D, girl: G, oldman: OM, oldwoman: OW, ...anim },
  direct: CAMS().map(c => cam(...c)),
};
