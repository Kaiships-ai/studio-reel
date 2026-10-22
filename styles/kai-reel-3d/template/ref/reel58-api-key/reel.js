// reel.js · reel58 "API key" (ksa-reel-skit, first "Kai & Clawd" campaign reel). Kai pushed his API key to his public 2-star
// todo-app repo; Clawd calmly lists how bad it is (bots found it in 47 s, deleting the commit leaves it in the history, someone
// abroad is using it, the bill counter races); Kai panics; Clawd already turned the key off last night, and made a new one…
// which he put in the README. Facts: Truffle Security canary key (found in 47 s, abroad within 4 min); git history; rotate the key.
// Pure function of t. Motion numbers from src/motion.js; every hit keyed to a spoken word (W()); cut to whoever speaks.
import * as THREE from 'three';
import { createStage, V, seg, ss, sio, lerp, clamp, hsh } from './stage.js';
import { buildSet, DECK, SCR, SEAT } from './set.js';
import { loadKai, loadClawdDefault } from './cast.js';
import { voMouth } from './kai-talk.js';
import { SQ, SNAP, PUSH, DOF, step, ring, TR, hop, blinks, F, HOLD_MIN } from './motion.js';

const Q = new URLSearchParams(location.search);
const S = createStage();
const SET = buildSet(S);
const K = await loadKai(S.scene, S.renderer);
const CL_S = 0.045, CL = loadClawdDefault(S.scene, CL_S);
for (const k of ['body', 'limb']) CL.materials[k].color.set('#f0a03a');   // teal night grade + red alarm: albedo compensated so the toy reads Claude orange

// ---------------------------------------------------------------- voice: lines + words (src/vo.js), loudness (src/vo_env.js)
const LN = Object.fromEntries(VO_LINES.map(l => [l.id, l]));
const norm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
const W = (lid, w, n = 1) => { let c = 0; for (const x of VO_WORDS) if (x.line === lid && norm(x.w) === norm(w) && ++c === n) return x.s; console.warn('LOG no word', lid, w); return LN[lid].s; };
const KW = VO_WORDS.filter(x => x.who === 'kai');
const s_ = (id) => LN[id].s, e_ = (id) => LN[id].e;
const envAt = (E, t) => { const f = t * 30, i = Math.floor(f), k = f - i; return lerp(E[Math.min(E.length - 1, Math.max(0, i))] ?? 0, E[Math.min(E.length - 1, i + 1)] ?? 0, k); };
const ez = (t, t0, d) => ss(seg(t, t0, t0 + d));                                    // 0 → 1 ease over d seconds
const win = (t, a, b, din = 0.15, dout = 0.2) => ez(t, a - din, din) * (1 - ez(t, b, dout));
const pulse = (t, t0, a, d = 0.22) => a * (t < t0 ? 0 : t < t0 + d * 0.3 ? ss((t - t0) / (d * 0.3)) : 1 - ss(clamp((t - t0 - d * 0.3) / (d * 0.7))));

// ---------------------------------------------------------------- beats (all keyed to words)
const B = {
  pushed: W('l01', 'pushed'), key1: W('l01', 'key'), github: W('l01', 'GitHub'), which: W('l02', 'Which'), repo: W('l02', 'repo'),
  todo: W('l03', 'todo'), pub: W('l04', 'public'), two: W('l05', 'two'), nobody: W('l05', 'Nobody'),
  bots: W('l06', 'Bots'), found: W('l06', 'found'), f47: W('l06', 'forty-seven'), seconds: W('l06', 'seconds'),
  okay: W('l07', 'Okay'), deleted: W('l07', 'deleted'), history: W('l08', 'history'), bad: W('l09', 'bad'),
  country: W('l10', 'country'), using: W('l10', 'using'), right: W('l10', 'Right'),
  bill: W('l11', 'bill'), up: W('l11', 'UP'), good: W('l12', 'Good'), popular: W('l12', 'popular'), now12: W('l12', 'now'),
  clawd13: W('l13', 'Clawd'), something: W('l13', 'something'), already: W('l14', 'already'), off: W('l14', 'off'), last: W('l14', 'Last'),
  what: W('l15', 'what'), said: W('l16', 'said'), checked: W('l16', 'checked'),
  clawd17: W('l17', 'Clawd'), saved: W('l17', 'saved'), card17: W('l17', 'card'), newk: W('l18', 'new'),
  nice: W('l19', 'Nice'), where: W('l19', 'Where'), readme: W('l20', 'README'), lose: W('l20', 'lose'),
};
const T_END = Math.round((VO_END + 2.7) * 30) / 30;                                 // + the frozen face and the KEY end card after the button
B.freeze = e_('l20') + 0.08; B.card = B.freeze + 1.05;
B.timerEnd = B.f47 + 0.3; B.do6 = W('l06', 'do') + 0.22;                                                              // the 00:47 lands as "forty-seven" finishes
B.stand = s_('l11'); B.sit = s_('l14');
const CHECKS = [B.checked - 0.02, B.checked + 0.2, W('l16', 'everything', 2) + 0.1];  // checklist ticks (l16), the 4th on "new" (l18)
const BOT_ON = (i) => i < 8 ? e_('l05') + 0.04 + i * 0.05 : e_('l06') + 0.1 + (i - 8) * 0.04;   // r1: 8 eyes open right after "Nobody looks at it." (before "Bots"), the rest after the line
const BOT_OFF = (i) => B.off + 0.2 + i * 0.045;                                      // "turned that key off": the eyes shut in a slow wave (seen in the WO wide)
const BOT_BACK = (i) => B.freeze + 0.1 + i * 0.035;                                  // the button: they all come back, behind frozen Kai, in the silence

// ---------------------------------------------------------------- blocking (metres): Kai on the mouse (right), Clawd on the keys (left)
const KYAW = -0.32;
const HIP = V(0.002, 0.215, 0.0).applyAxisAngle(V(0, 1, 0), KYAW);
const KP = V(SEAT.x - HIP.x, DECK, SEAT.z - HIP.z), KSTAND = V(0.06, 0, 0.3);
K.holder.position.copy(KP); K.holder.rotation.y = KYAW;
K.pose([['sit', 0.5, 1]]); S.scene.updateMatrixWorld(true);
const KHEAD = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0));
// panic arms while seated: the arm bones of the 'afraid' clip (hands up by the face) slerped over the sit pose (reel58, new motion)
const ARMB = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
const AFR_T = Number(Q.get('afr') ?? 0.9); K.pose([['afraid', AFR_T, 1]]); const ARMQ = ARMB.map(n => K.bones[n].quaternion.clone()); K.pose([['sit', 0.5, 1]]);
const armsUp = (w) => { if (w < 1e-3) return; ARMB.forEach((n, i) => K.bones[n].quaternion.slerp(ARMQ[i], Math.min(1, w))); };
const KFILL_I = Number(Q.get('kfill') ?? 6), kfill = new THREE.SpotLight('#ffdcc0', KFILL_I, 3, 0.32, 0.7, 2);
kfill.position.copy(KHEAD).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(KHEAD).add(V(0, -0.12, 0)); S.scene.add(kfill, kfill.target);
const CP = V(-0.36, DECK, 0.06), CYAW = 0.38;
const CFACE = CP.clone().add(V(0, 7 * CL_S, 0));
const MID = KHEAD.clone().lerp(CFACE, 0.5);
const KEYP = SET.apiKey.g.position.clone();

// ---------------------------------------------------------------- shots: hard cut on each speaker change + screen inserts
const fr = (x) => Math.round(x * 30) / 30;
const SHOTLIST = [[0, 'SCRH'], [B.pushed - 0.75, 'KH'], [s_('l02'), 'CC'], [s_('l03'), 'KC'], [s_('l04'), 'CM'], [s_('l05'), 'KP'], [B.two - 0.08, 'SCRS'], [B.nobody - 0.1, 'KP'],
  [s_('l06'), 'CS'], [B.f47 - 0.1, 'SCRT'], [e_('l06') + 0.55, 'KC'], [s_('l08'), 'CO'], [B.history - 0.08, 'SCRG'], [s_('l09'), 'KC'], [s_('l10'), 'CX'],
  [B.country - 0.12, 'SCRP'], [B.right - 0.15, 'CE'],
  [s_('l11'), 'KS'], [B.up + 0.14, 'SCRB'], [s_('l12'), 'CM'], [s_('l13'), 'KS'], [s_('l14'), 'CK'], [B.off + 0.12, 'WO'], [s_('l15'), 'KC'], [s_('l16'), 'CC'], [B.checked - 0.12, 'SCRC'],
  [s_('l17'), 'KC'], [B.saved - 0.1, 'W2'], [s_('l18'), 'CK'], [s_('l19'), 'KC'], [s_('l20'), 'CC'], [B.readme - 0.06, 'SCRR'], [B.freeze, 'KF'], [B.card, 'WE']];
const CUTS = [...SHOTLIST.map(([t]) => t ? fr(t - 0.03) : 0), T_END], SHOTS = SHOTLIST.map(([, n]) => n);
const shotIdx = (t) => { let i = 0; while (i < CUTS.length - 2 && t >= CUTS[i + 1]) i++; return i; };
const STAND = [CUTS[SHOTS.indexOf('KS')], CUTS[SHOTS.indexOf('CK')]];               // "Why is my bill going UP?" → "do something!": Kai on his feet

// ---------------------------------------------------------------- Kai
const BL = (a, b, every, seed) => { const o = []; for (let t = a + 0.6, i = 0; t < b; i++) { o.push(Math.round(t * 30) / 30); t += every * (0.7 + 0.6 * hsh(i, seed)); } return o; };
const FROZEN = [[e_('l06') + 0.2, B.okay - 0.05], [B.readme + 0.2, T_END]];        // no blinks while he is frozen (the reveals)
const KBLINK = BL(0, T_END, 3.0, 3).filter(t => !FROZEN.some(([a, b]) => t > a - 0.2 && t < b)), CBLINK = BL(0.4, T_END, 2.6, 7);
function kai(t, shot) {
  const tf = Math.min(t, B.freeze + 0.25);                                            // the button: Kai freezes (pose holds, no breath)
  const standing = t >= STAND[0] && t < STAND[1];
  const base = 0.25 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * tf / 6.5));
  if (standing) { const w = 1 - clamp(step(t, B.something - 0.15, 3.2, 7)); K.pose([['cast_a_spell', 2.4 + 0.3 * seg(t, B.something, STAND[1]), 1 - w], ['afraid', 0.3 + 0.35 * seg(t, B.stand, B.up + 0.6), w]]); }
  else K.pose([['sit', base, 1]]);
  const panic = standing ? 0 : Math.max(win(tf, 0, s_('l02') - 0.2, 0.01, 0.35), win(tf, B.bad - 0.1, e_('l09') + 0.4, 0.12, 0.35), win(tf, B.readme + 0.25, T_END, 0.25, 0.1));
  armsUp(panic);
  K.holder.position.copy(KP); if (standing) K.holder.position.add(KSTAND);
  // look targets (yaw: − = toward Clawd, screen behind = −0.75, the key on the deck = −0.2 + pitch down)
  const L = { clawd: -0.42, screen: -0.78, cam: 0.05, away: 0.25, key: -0.18 };
  const yawK = TR(tf, [[0, L.cam], [s_('l02') - 0.2, L.clawd, 2.6, 7], [B.todo - 0.1, L.away, 2.6, 7], [s_('l05') - 0.1, L.clawd, 2.6, 7], [B.bots + 0.15, L.screen, 2.6, 7],
    [e_('l06') + 0.2, L.cam, 2.6, 7], [B.okay + 0.1, L.clawd, 2.4, 7], [B.history + 0.1, L.screen, 3.2, 8], [s_('l09') - 0.1, L.clawd, 3, 8],
    [B.country + 0.15, L.screen, 2.6, 7], [s_('l11') - 0.05, L.clawd, 2.6, 7], [B.off + 0.1, L.key, 2.6, 7], [s_('l15') - 0.15, L.cam, SNAP.dur ? 5 : 5, 9],
    [B.what - F(1), L.clawd, 5, 9], [B.readme + 0.08, L.screen, 3.4, 8], [B.lose - 0.05, L.cam, 3.4, 9]]);
  const pitchK = TR(tf, [[0, -0.12], [B.todo - 0.1, -0.22, 2.6, 7], [s_('l05') - 0.1, -0.02, 2.6, 7], [B.bots + 0.15, -0.05, 2.6, 7], [e_('l06') + 0.2, 0.02, 2.6, 7],
    [B.okay, 0.14, 2.0, 7], [B.deleted, -0.02, 2.4, 7], [B.history + 0.1, -0.08, 3, 8], [s_('l09') - 0.1, -0.2, 3, 8], [B.country + 0.15, -0.06, 2.6, 7],
    [s_('l11'), 0.04, 2.6, 7], [B.off + 0.1, -0.3, 2.6, 7], [s_('l15') - 0.15, 0.02, 5, 9], [s_('l17'), -0.04, 2.4, 7], [s_('l19'), 0.08, 2.0, 7],
    [B.readme + 0.08, -0.04, 3, 8], [B.lose - 0.05, 0.05, 3.4, 9]]);
  // nods on stressed words (1 frame before the sound); head shakes on "Nobody" and "do something"; a tremble while scared
  const NOD = [[B.pushed, -0.06], [B.github, 0.1], [B.todo, 0.05], [B.two, 0.06], [B.deleted, 0.12], [B.bad, 0.08], [B.bill, 0.08], [B.saved, 0.12], [B.card17, 0.06], [B.nice, 0.12], [B.where, 0.05]];
  let nod = 0; for (const [t0, a] of NOD) nod += ring(tf, t0 - F(1), { f: 2.6, d: 6, a }) * (tf > t0 - F(1) ? 1 : 0) * Math.sin(Math.min(1, (tf - t0 + F(1)) * 12) * Math.PI / 2);
  let shake = 0; for (const [t0, a] of [[B.nobody, 0.1], [B.something, 0.08]]) if (tf > t0 - F(1)) shake += a * Math.exp(-(tf - t0) * 5) * Math.sin((tf - t0 + F(1)) * 2 * Math.PI * 4.0);
  const scared = win(tf, s_('l09') - 0.1, e_('l10') + 0.3, 0.2, 0.3), tremble = 0.012 * scared * Math.sin(tf * 2 * Math.PI * 9);
  // body: hunched panic in the hook, the frozen gulp, the relief exhale (lean back), scared pull-back, awe lean-in, casual lean back
  const flinch = tf > B.pushed - F(2) ? ring(tf, B.pushed - F(2), { f: 2.2, d: 5, a: 1 }) : 0;
  const snap = tf > B.what - F(1) ? ring(tf, B.what - F(1), { f: 2.2, d: 5, a: 1 }) : 0;
  const gulp = pulse(tf, e_('l06') + 0.75, 1, 0.35);
  const lean = TR(tf, [[0, 0.08], [s_('l03'), 0.04, 2.4, 7], [B.okay, -0.16, 1.6, 7], [B.deleted + 0.2, -0.08, 2, 7], [B.history + 0.05, 0.1, 2.6, 7],
    [s_('l09'), -0.1, 2.6, 7], [s_('l15'), 0.02, 3, 8], [B.clawd17 + 0.4, 0.07, 0.8, 7], [B.saved - 0.1, 0.12, 2.2, 7], [e_('l17') + 0.3, 0.02, 2, 7], [B.nice - 0.1, -0.14, 1.8, 7], [B.readme + 0.1, 0.0, 2.6, 8], [B.lose, -0.12, 3, 8]]);
  const tilt = TR(tf, [[0, 0], [B.todo - 0.1, 0.1, 2, 7], [s_('l05'), 0, 1.6, 7], [B.clawd17, 0.12, 1.8, 7], [e_('l17') + 0.3, 0.04, 1.6, 7], [B.readme + 0.1, 0, 2, 7]]);
  const shrug = pulse(tf, B.todo - 0.1, 1, 0.7);
  const sk = standing ? 0.5 : 1;
  K.turn('Spine1', V(1, 0, 0), (lean - 0.08 * flinch - 0.06 * snap) * (standing ? 0.3 : 1)); K.turn('Spine2', V(1, 0, 0), 0.05 * gulp - 0.04 * shrug);
  K.turn('LeftShoulder', V(0, 0, 1), 0.12 * shrug); K.turn('RightShoulder', V(0, 0, 1), -0.12 * shrug);
  K.turn('Neck', V(0, 1, 0), (yawK + shake) * 0.35 * sk); K.turn('Head', V(0, 1, 0), (yawK + shake + tremble) * 0.65 * sk);
  K.turn('Head', V(1, 0, 0), (pitchK + nod - 0.1 * flinch - 0.12 * snap + 0.1 * gulp) * sk); K.turn('Head', V(0, 0, 1), tilt * sk);
  K.root.updateMatrixWorld(true);
  const H = standing ? K.bones.Head.getWorldPosition(V(0, 0, 0)) : KHEAD;
  kfill.position.copy(H).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(H).add(V(0, -0.12, 0)); kfill.target.updateMatrixWorld(); kfill.intensity = KFILL_I;
  const m = t > B.freeze ? { shape: 'O', open: 0.55 } : voMouth(t, KW, ENV_K), bl = blinks(t, KBLINK); K.talk.set({ ...m, blink: bl });
  return { yawK, m, bl, standing };
}

// ---------------------------------------------------------------- Clawd: talk bob, hops that land, arms, eye shapes
const S_ = { pos: V(), face: V(), sq: 1, body: 1, expr: 'neutral', talk: 0, scale: CL_S, flame: 1, arm: 0 };
const EYE = { neutral: [1, 1, 0, 0], happy: [1.05, 0.78, 0.45, 0], wide: [1.12, 1.25, 0.1, 0], squint: [1.05, 0.5, 0.2, 0], worried: [1, 0.92, 0, 0.22] };
// hops: [take-off, landing, height m]
const HOPS = [[B.good - F(1), B.good + 0.22, 0.035], [B.popular - F(2), B.popular + 0.3, 0.07],
  [B.off - 0.2, B.off + 0.02, 0.05], [B.checked - F(1), B.checked + 0.16, 0.018], [B.saved + 0.12, B.saved + 0.42, 0.06], [B.saved + 0.5, B.saved + 0.74, 0.035],
  [B.newk - F(2), B.newk + 0.26, 0.05]];
const EMPH = [[B.which, -0.05], [B.pub, -0.06], [B.found, 0.05], [B.history, -0.08], [B.already, 0.06], [B.last, 0.08], [B.said, 0.05]];
function clawd(t) {
  const talking = VO_LINES.some(l => l.who !== 'kai' && t > l.s - 0.05 && t < l.e + 0.05);
  const env = talking ? clamp((envAt(ENV_C, t) + envAt(ENV_C, t + F(1)) + envAt(ENV_C, t + F(2))) / 3 * 1.3) : 0;
  let y = 0, hsq = 0;
  for (const [a, b, h] of HOPS) if (t > a - 0.2 && t < b + 0.5) { const o = hop(t, a, b, h); y += o.y; hsq += o.sy; }
  hsq = Math.max(hsq, SQ.land - 1);
  let body = 1 + 0.008 * Math.sin(t * 2 * Math.PI / 3.2);
  for (const [t0, a] of EMPH) body += pulse(t, t0 - F(2), a, 0.3);
  const startle = pulse(t, B.something + F(2), -0.1, 0.25) + pulse(t, B.up + F(2), -0.06, 0.25);   // Kai's yells: small flinches
  const sorry = 0.06 * win(t, B.history - 0.1, e_('l08') + 0.4, 0.2, 0.4);                          // deflates a little on "history"
  const sq = body + hsq + startle - sorry + 0.045 * env;
  // yaw: toward Kai; glances to the bots on the wall (left) on "Bots"; turns to the camera to whisper
  const toWall = win(t, B.bots + 0.05, B.seconds + 0.2, 0.2, 0.3), toCam = win(t, s_('l10') - 0.1, e_('l10') + 0.1, 0.25, 0.3);
  const yaw = CYAW - 0.75 * toWall - 0.3 * toCam + 0.2 * win(t, B.off - 0.3, B.off + 0.5, 0.15, 0.3);
  // lean: whisper lean-in, a nod on "Bots", sorry bow, proud bow on "README"; innocent head tilt (roll) on "You said" + "Which repo?"
  let bow = 0.14 * toCam; for (const [t0, a] of [[B.bots, 0.1], [B.pub, 0.12], [B.history, 0.12], [B.readme, 0.14]]) bow += pulse(t, t0 - 0.1, a, 0.6);
  const roll = 0.12 * win(t, B.which - 0.1, e_('l02') + 0.3, 0.2, 0.3) - 0.1 * win(t, B.history - 0.1, e_('l08') + 0.3, 0.2, 0.3) + 0.1 * win(t, B.said - 0.1, e_('l16') + 0.25, 0.2, 0.3)
    + 0.1 * win(t, B.readme + 0.2, B.freeze + 0.2, 0.2, 0.3);
  // arms: both up on "popular" / "saved" / "new key"; one up proud on "already … off" / "Last night"; one points to the wall on "Bots"
  const cheer = Math.max(win(t, B.popular - 0.08, e_('l12') + 0.3, 0.12, 0.3), win(t, B.saved + 0.1, e_('l17') + 0.3, 0.12, 0.3), win(t, B.newk - 0.08, e_('l18') + 0.3, 0.12, 0.3));
  const proud = Math.max(win(t, B.already - 0.1, e_('l14') + 0.35, 0.15, 0.3), win(t, B.readme - 0.08, e_('l20') + 0.2, 0.12, 0.25));
  const point = win(t, B.bots, B.seconds + 0.2, 0.12, 0.3);
  const inW = (a, b) => t >= a && t < b;
  const expr = inW(B.up + F(2), B.up + 0.45) || inW(B.something + F(2), B.something + 0.45) ? 'wide'
    : inW(B.pub - 0.1, e_('l04') + 0.4) ? 'squint'
    : inW(B.history - 0.15, e_('l09') + 0.3) ? 'worried'
    : inW(B.right - 0.1, e_('l10') + 0.3) ? 'wide'
    : inW(s_('l12') - 0.1, e_('l12') + 0.4) || inW(B.last - 0.1, e_('l14') + 0.4) || inW(B.said - 0.1, T_END) ? 'happy' : 'neutral';
  const lookX = TR(t, [[0, 0.5], [B.bots, -0.6, 3, 12], [B.seconds + 0.2, 0.5, 3, 12], [B.country - 0.05, -0.4, 4, 12], [B.using, 0.2, 4, 12], [B.right, 0, 3, 12],
    [e_('l10') + 0.1, 0.5, 3, 12], [B.off - 0.1, -0.2, 3, 12], [B.last, 0.5, 3, 12]]);
  CL.group.position.copy(CP); CL.group.rotation.set(0, yaw, 0);
  CL.update(t, { action: 'idle', blink: false, look: [lookX, 0] });
  const P = CL.parts;
  P.torso.rotation.set(bow, 0, roll);
  P.bounce.position.y = y / CL_S;
  P.bounce.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  P.arms.forEach(a => { a.rotation.set(0, 0, 0); a.position.y = 3.0; });
  const [Lr, R] = P.arms, upL = Math.max(cheer, point);
  Lr.position.y = 3.0 + 2.6 * upL; Lr.rotation.z = -0.9 * upL; Lr.rotation.y = 0.5 * cheer - 0.6 * point;
  const upR = Math.max(cheer, proud);
  R.position.y = 3.0 + 2.6 * upR; R.rotation.z = 0.9 * upR; R.rotation.y = -0.5 * upR;
  const bl = blinks(t, CBLINK) * (inW(B.right - 0.1, e_('l10')) ? 0 : 1), ex = EYE[expr];
  P.eyes.forEach((e, i) => { const sxn = i ? 1 : -1;
    e.scale.set(ex[0], Math.max(0.07, ex[1] * (1 - 0.93 * bl)), 1); e.position.y = 4.0 + ex[2] + 0.9 * bl * ex[1];
    e.position.x = sxn * 3.5 + lookX * 0.5; e.rotation.z = -sxn * ex[3]; });
  CL.group.updateMatrixWorld(true);
  let g = 0; for (const [, b] of HOPS) if (t > b) g = Math.max(g, Math.exp(-(t - b) * 14) * (t - b < 0.4 ? 1 : 0));
  SET.keyGlow.position.copy(CP).add(V(0, 0.03, 0.05)); SET.keyGlow.intensity = 1.6 * g;
  S_.pos.copy(CL.group.position); S_.face.copy(P.torso.localToWorld(V(0, 5, 4.6))); S_.sq = sq; S_.body = body; S_.expr = expr; S_.talk = env; S_.yaw = yaw; S_.blink = bl; S_.arm = upR; S_.flame = 1; S_.y = y;
  return S_;
}

// ---------------------------------------------------------------- props: the two gold keys, the bot eyes, the alarm light, sparks
const GOLD = new THREE.Color('#e9b443'), GREY = new THREE.Color('#4d4f57'), EM = new THREE.Color('#5a3a08');
const sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 4.2, 1.6) }), sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sparkM, 14 * 4);
sparks.frustumCulled = false; S.scene.add(sparks); const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion();
const _bq = new THREE.Quaternion();
const live = (t) => t >= B.bots && t < B.off;                                        // the leaked key is being used
function props(t) {
  // the API key: gold → power-down flicker → grey on "off"
  const u = t - B.off, flick = u > -0.02 && u < 0.22 ? (Math.floor(u * 40) % 2 ? 0.25 : 1) : 1, k = ez(t, B.off + 0.12, 0.2);
  SET.apiKey.m.color.copy(GOLD).lerp(GREY, k); SET.apiKey.m.emissive.copy(EM).multiplyScalar((1 - k) * flick); SET.apiKey.m.metalness = 0.35 * (1 - k);
  SET.apiKey.tagM.color.setScalar(1 - 0.45 * k);
  SET.keyShine.intensity = 0;                                                         // v1: its specular made a hot spot on Clawd; the key glows by emissive only
  // the new key: pops up from nothing on "new" (spring overshoot), lands flat
  const n = t < B.newk - F(1) ? 0 : clamp(step(t, B.newk - F(1), 3.4, 7), 0, 1.3);
  SET.newKey.g.scale.setScalar(Math.max(1e-4, n)); SET.newKey.g.position.y = DECK + 0.004 + 0.12 * pulse(t, B.newk - F(1), 1, 0.45);
  SET.newKey.g.rotation.y = -0.3 + 0.6 * (1 - ez(t, B.newk, 0.4));
  // bot eyes: slot pairs open (3 f), blink now and then, flare on "Right now", shut in a wave on "off", all come back on "README"
  const flare = live(t) ? 1 + 1.6 * pulse(t, B.right - 0.02, 1, 0.9) : 1;
  SET.botEyes.material.color.setRGB(6 * flare, 0.35 * flare, 0.25 * flare);
  SET.BOTS.forEach((b, i) => {
    const on = (t >= BOT_ON(i) && t < BOT_OFF(i)) || t >= BOT_BACK(i);
    const t0 = t >= BOT_BACK(i) ? BOT_BACK(i) : BOT_ON(i), t1 = BOT_OFF(i);
    let o = on ? clamp((t - t0) / F(3)) : t >= t1 && t < t1 + F(3) ? 1 - (t - t1) / F(3) : 0;
    const bp = 2.2 + 2.5 * hsh(i, 9), ph = ((t + hsh(i, 8) * bp) % bp); if (ph < F(4)) o *= Math.abs(ph / F(2) - 1);
    const lx = 0.012 * Math.sin(t * 0.9 + i), s = b.s * o;
    for (const sx of [-1, 1]) { _bq.identity(); _m4.compose(b.p.clone().add(V(sx * 0.03 * b.s + lx, 0, 0)), _bq, V(b.s, Math.max(1e-4, s), 1)); SET.botEyes.setMatrixAt(i * 2 + (sx > 0), _m4); }
  });
  SET.botEyes.instanceMatrix.needsUpdate = true;
  // alarm: a slow red pulse while the key is live (stronger from "Right now" to "do something!"), off with the key
  const back = ez(t, BOT_BACK(0), 0.2), hi = Math.max(win(t, B.right, B.off, 0.3, 0.05), back), lvl = live(t) || back > 0 ? (0.35 + 0.65 * hi) * (0.55 + 0.45 * Math.sin((t - B.bots) * 2 * Math.PI * (0.9 + 0.5 * hi))) : 0;
  SET.alarm.intensity = 3.2 * lvl; SET.alarmF.intensity = 1.3 * lvl;
  SET.lamp.intensity = 1.3 + 0.5 * ez(t, B.off + 0.2, 0.6);
}
const BURSTS = [[B.popular + 0.02, 1, 0.9, 'clawd'], [B.saved + 0.42, 2, 0.8, 'clawd'], [B.newk + 0.02, 3, 1, 'key']];
function drawSparks(t) {
  let n = 0, glow = 0;
  for (const [t0, seed, k, at] of BURSTS) {
    const u = t - t0; if (u < 0 || u > 0.6) continue;
    const o = at === 'key' ? SET.newKey.g.position.clone().add(V(0, 0.05, 0)) : CL.parts.torso.localToWorld(V(0, 9.5, 0));
    for (let i = 0; i < 14; i++) {
      const a = hsh(i, seed) * 2 * Math.PI, el = 0.4 + 0.9 * hsh(i, seed + 1), sp = (0.5 + 0.8 * hsh(i, seed + 2)) * k, life = 0.25 + 0.3 * hsh(i, seed + 3);
      if (u > life) continue; const r = (1 - u / life) * 0.006 * (0.6 + hsh(i, seed + 4));
      const p = o.clone().add(V(Math.cos(a) * Math.cos(el) * sp * u, Math.sin(el) * sp * u - 2.6 * u * u, Math.sin(a) * Math.cos(el) * sp * u * 0.6 + 0.12 * u));
      _m4.compose(p, _q, V(r, r, r)); sparks.setMatrixAt(n++, _m4);
    }
    glow = Math.max(glow, Math.exp(-u * 9) * k);
  }
  for (let i = n; i < 14 * 4; i++) { _m4.makeScale(0, 0, 0); sparks.setMatrixAt(i, _m4); }
  sparks.instanceMatrix.needsUpdate = true;
  SET.screenGlow.intensity = 0.6 + 2.0 * glow;
}

// ---------------------------------------------------------------- the laptop screen: GitHub (repo page → .env → history → calls → README)
const font = (px, w = 600, fam = 'Inter, "Helvetica Neue", Arial, sans-serif') => `${w} ${px}px ${fam}`;
const MONO = 'Menlo, "SF Mono", monospace';
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const RED = '#ff4d4d', GREEN = '#3fd27a', INK = '#e6edf3', DIM = '#7d8590';
const callsAt = (t) => t < B.right ? 0 : Math.round(48213 * Math.pow(ss(seg(Math.min(t, B.off), B.right, B.off)), 1.2) + 37 * Math.min(t, B.off) % 37);
function botHead(g, x, y, s, a, eyesA) {          // a little scanner bot peeking in (dark head, antenna, two red slot eyes)
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#2b3240'; rr(g, -60, -46, 120, 92, 22); g.fill(); g.strokeStyle = '#4a5466'; g.lineWidth = 5; g.stroke();
  g.fillStyle = '#4a5466'; g.fillRect(-4, -78, 8, 34); g.beginPath(); g.arc(0, -82, 10, 0, 7); g.fill();
  g.fillStyle = `rgba(255,60,50,${eyesA})`; g.shadowColor = '#ff3020'; g.shadowBlur = 24 * eyesA; rr(g, -36, -14, 18, 34, 6); g.fill(); rr(g, 18, -14, 18, 34, 6); g.fill();
  g.restore();
}
function drawScreen(t) {
  const g = SET.ctx, w = SET.cv.width, h = SET.cv.height, readme = t >= B.readme - 0.15;
  g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h); g.textBaseline = 'middle'; g.textAlign = 'left';
  // header: repo, Public pill, stars
  g.fillStyle = '#161b22'; g.fillRect(0, 0, w, 120); g.fillStyle = '#30363d'; g.fillRect(0, 120, w, 2);
  g.font = font(44, 600); g.fillStyle = '#4493f8'; g.fillText('kai', 50, 62); g.fillStyle = DIM; g.fillText('/', 128, 62); g.fillStyle = '#4493f8'; g.font = font(44, 700); g.fillText('todo-app', 160, 62);
  const pubK = 1 + 0.25 * pulse(t, B.pub - F(1), 1, 0.5), pubR = pulse(t, B.pub - F(1), 1, 0.9);
  g.save(); g.translate(460, 62); g.scale(pubK, pubK); g.strokeStyle = pubR > 0.05 ? RED : DIM; g.lineWidth = 3; rr(g, 0, -24, 128, 48, 24); g.stroke();
  g.fillStyle = pubR > 0.05 ? RED : DIM; g.font = font(28, 600); g.fillText('Public', 22, 1); g.restore();
  const stK = 1 + 0.5 * pulse(t, B.two - F(1), 1, 0.7);
  g.save(); g.translate(1330, 62); g.scale(stK, stK); g.fillStyle = '#21262d'; rr(g, -10, -30, 230, 60, 12); g.fill(); g.strokeStyle = '#30363d'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#e3b341'; g.font = font(34, 700); g.fillText('★ Star', 12, 1); g.fillStyle = INK; g.fillText('2', 168, 1); g.restore();
  if (readme) { drawReadme(g, t, w, h); SET.tex.needsUpdate = true; return; }
  // left: the file (.env) with the key line
  const X = 50, Y = 170;
  g.fillStyle = '#161b22'; rr(g, X, Y, 960, 560, 14); g.fill(); g.strokeStyle = '#30363d'; g.lineWidth = 2; g.stroke();
  g.fillStyle = INK; g.font = font(30, 700, MONO); g.fillText('.env', X + 30, Y + 44); g.fillStyle = DIM; g.font = font(24, 500); g.fillText('add everything · just now', X + 140, Y + 46);
  const off = t >= B.off + 0.1, keyA = live(t) || t < B.bots ? 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 1.4) : 0.4;
  const rows = [['1', '# config', DIM], ['2', 'APP_NAME=todo-app', INK], ['3', 'API_KEY=sk-TOTALLY-REAL-123', off ? DIM : '#ffb3b3'], ['4', 'DEBUG=true', INK]];
  rows.forEach(([n, txt, c], i) => { const yy = Y + 130 + i * 78;
    if (i === 2) { g.fillStyle = off ? 'rgba(120,120,130,0.18)' : `rgba(255,60,60,${0.18 + 0.3 * keyA + 0.3 * pulse(t, B.key1 - F(1), 1, 0.5)})`; g.fillRect(X + 4, yy - 36, 952, 72); }
    g.fillStyle = '#6e7681'; g.font = font(30, 500, MONO); g.fillText(n, X + 30, yy); g.fillStyle = c; g.font = font(i === 2 ? 38 : 32, i === 2 ? 800 : 500, MONO); g.fillText(txt, X + 90, yy);
    if (i === 2 && off) { g.strokeStyle = DIM; g.lineWidth = 4; g.beginPath(); g.moveTo(X + 86, yy); g.lineTo(X + 760, yy); g.stroke(); } });
  // the commit row: deleted on "deleted" (relief) → the ghost comes back on "history"
  const del = t >= B.deleted + 0.12, ghost = ez(t, B.history - 0.05, 0.35);
  const cy = Y + 470; g.font = font(28, 600, MONO);
  if (!del) { g.fillStyle = DIM; g.fillText('● a1f9c3e  add everything', X + 30, cy); }
  else if (ghost < 0.01) { g.fillStyle = GREEN; g.fillText('✓ commit deleted', X + 30, cy); }
  else { g.globalAlpha = ghost; g.fillStyle = RED; g.fillText('git log --all', X + 30, cy - 10); g.font = font(26, 600, MONO); g.fillText('● a1f9c3e  add everything   ← still in history', X + 30, cy + 34); g.globalAlpha = 1; }
  if (ghost > 0.01 && t < B.country) {                                               // r1: the ghost commit, big and red
    g.save(); g.globalAlpha = ghost; const k = 1 + 0.15 * (1 - ez(t, B.history - 0.05, 0.3));
    g.translate(530, 380); g.scale(k * 0.74, k * 0.74); g.fillStyle = 'rgba(40,8,10,0.95)'; rr(g, -440, -150, 880, 300, 20); g.fill(); g.strokeStyle = RED; g.lineWidth = 6; g.stroke();
    g.textAlign = 'center'; g.fillStyle = '#ffb3b3'; g.font = font(34, 700, MONO); g.fillText('git log --all', 0, -95);
    g.fillStyle = RED; g.font = font(46, 800, MONO); g.fillText('a1f9c3e add everything', 0, -25);
    g.font = font(38, 800, MONO); g.fillText('API_KEY=sk-TOTALLY-REAL-123', 0, 40); g.fillStyle = INK; g.font = font(40, 900); g.fillText('STILL IN HISTORY', 0, 105); g.restore(); g.textAlign = 'left';
  }
  // right panel: timer (l06) → map ping (l10) → calls + bill meter (l10–l14) → stamp (l14) → checklist (l16)
  const PX = 1050, PY = 170, PW = 500;
  g.fillStyle = '#161b22'; rr(g, PX, PY, PW, 560, 14); g.fill(); g.strokeStyle = '#30363d'; g.lineWidth = 2; g.stroke();
  if (t >= B.do6 - 0.05 && t < B.country - 0.2) {                                  // bot found it: 00:00 → 00:47
    const sec = Math.round(47 * Math.pow(seg(t, B.do6, B.timerEnd), 0.8)), done = t >= B.timerEnd;
    g.fillStyle = done ? RED : INK; g.font = font(30, 700); g.textAlign = 'center'; g.fillText(done ? 'KEY FOUND BY A BOT' : 'scanning…', PX + PW / 2, PY + 70);
    const k = 1 + 0.18 * pulse(t, B.timerEnd - F(1), 1, 0.5);
    g.save(); g.translate(PX + PW / 2, PY + 220); g.scale(k, k); g.font = font(150, 800, MONO); g.fillStyle = done ? RED : INK; g.fillText(`00:${String(sec).padStart(2, '0')}`, 0, 0); g.restore();
    botHead(g, PX + PW / 2, PY + 430, 1.0, ez(t, B.do6, 0.15), done ? 1 : 0.6 + 0.4 * Math.sin(t * 20)); g.textAlign = 'left';
  } else if (t >= B.country - 0.2) {
    const frozen = t >= B.off + 0.05;
    g.textAlign = 'center'; g.fillStyle = frozen ? DIM : RED; g.font = font(30, 700); g.fillText(frozen ? 'API calls' : '⚠ API calls · another country', PX + PW / 2, PY + 60);
    // a dotted mini map with a ping far away
    for (let i = 0; i < 90; i++) { const mx = PX + 50 + (i % 15) * 28, my = PY + 110 + Math.floor(i / 15) * 22; if (hsh(i, 4) > 0.42) { g.fillStyle = '#30363d'; g.beginPath(); g.arc(mx, my, 5, 0, 7); g.fill(); } }
    if (!frozen) { const pu = ((t - B.country) % 0.9) / 0.9; g.strokeStyle = `rgba(255,77,77,${1 - pu})`; g.lineWidth = 4; g.beginPath(); g.arc(PX + 400, PY + 150, 8 + 40 * pu, 0, 7); g.stroke(); g.fillStyle = RED; g.beginPath(); g.arc(PX + 400, PY + 150, 9, 0, 7); g.fill(); }
    // calls counter + the bill meter
    const c = callsAt(t), up = t >= B.right;
    g.font = font(96, 800, MONO); g.fillStyle = frozen ? DIM : up ? '#ffb3b3' : INK; g.fillText(c.toLocaleString('en-US'), PX + PW / 2, PY + 320);
    const fill = frozen ? Math.max(0, 1 - ez(t, B.off + 0.1, 0.5)) * seg(B.off, B.right, B.off + 1.5) : seg(Math.min(t, B.off), B.right, B.off + 1.5);
    g.fillStyle = '#21262d'; rr(g, PX + 50, PY + 400, PW - 100, 40, 20); g.fill(); g.fillStyle = frozen ? GREEN : RED; rr(g, PX + 50, PY + 400, Math.max(40, (PW - 100) * fill), 40, 20); g.fill();
    g.font = font(30, 700); g.fillStyle = frozen ? GREEN : RED; g.fillText(frozen ? 'BILL  ■ stopped' : up ? 'BILL  ▲▲▲' : 'BILL', PX + PW / 2, PY + 490);
    // "very popular": a traffic line shooting up over the meter
    if (t >= B.popular - 0.05 && !frozen) { const k = ez(t, B.popular - 0.05, 0.35); g.strokeStyle = RED; g.lineWidth = 6; g.beginPath();
      for (let i = 0; i <= 20; i++) { const xx = PX + 60 + i * 19, yy = PY + 380 - Math.pow(i / 20, 3) * 200 * k - 6 * hsh(i, 3); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
      g.fillStyle = RED; g.font = font(32, 800); g.fillText('traffic +9000%', PX + PW / 2 + 40, PY + 175 - 10 * k); }
    g.textAlign = 'left';
  }
  // the stamp on "off" (+ "2:14 AM" on "Last night")
  if (t >= B.off + 0.05) {
    const u = t - B.off - 0.05, k = 1 + 0.6 * Math.max(0, 1 - u / 0.12) ** 2, a = ez(t, B.off + 0.05, 0.08);
    g.save(); g.globalAlpha = a * (t >= B.checked - 0.15 ? 1 - ez(t, B.checked - 0.15, 0.15) : 1); g.translate(560, 690); g.rotate(-0.09); g.scale(k, k);
    g.strokeStyle = GREEN; g.lineWidth = 10; rr(g, -330, -80, 660, 160, 18); g.stroke(); g.fillStyle = GREEN; g.font = font(70, 900); g.textAlign = 'center';
    g.fillText('KEY OFF ✓', 0, -12); g.font = font(36, 700, MONO); g.fillText(t >= B.last ? 'revoked last night · 2:14 AM' : 'revoked', 0, 52); g.restore();
  }
  // the checklist (l16 → l18): Clawd's night shift
  if (t >= B.checked - 0.15) {
    const a = ez(t, B.checked - 0.15, 0.15); g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(13,17,23,0.94)'; rr(g, 430, 200, 740, 620, 22); g.fill(); g.strokeStyle = '#d97757'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#d97757'; g.font = font(40, 800); g.fillText("✻ Clawd's night shift", 480, 280);
    const items = [['scanned your commit', CHECKS[0]], ['found the key', CHECKS[1]], ['turned it off', CHECKS[2]], ['made you a new one', B.newk]];
    items.forEach(([txt, t0], i) => { const yy = 400 + i * 105, ok = t >= t0, pk = 1 + 0.3 * pulse(t, t0, 1, 0.3);
      g.save(); g.translate(500, yy); g.scale(pk, pk); g.fillStyle = ok ? GREEN : '#30363d'; rr(g, -26, -26, 52, 52, 10); g.fill(); g.fillStyle = '#0d1117'; g.font = font(40, 900); g.textAlign = 'center'; if (ok) g.fillText('✓', 0, 2); g.restore();
      g.fillStyle = ok ? INK : DIM; g.font = font(42, 700); g.textAlign = 'left'; g.fillText(txt, 550, yy); });
    g.restore();
  }
  // scanner bots peek in at the screen edges while the key is live
  if (live(t) || (t >= BOT_ON(0) && t < B.off)) for (let i = 0; i < 4; i++) { const t0 = BOT_ON(0) + 0.12 * i, a = ez(t, t0, 0.15) * (1 - ez(t, B.off, 0.12)); if (a < 0.01) continue;
    const xs = [70, 1530, 380, 1250][i], ys = [930, 930, 1000, 1000][i], up = 60 * ez(t, t0, 0.2);
    botHead(g, xs, ys - up, 0.85, a, 0.7 + 0.3 * Math.sin(t * 11 + i)); }
  SET.tex.needsUpdate = true;
}
function drawReadme(g, t, w, h) {                  // the button: README.md with the new key in it, bots coming back (centre column: reads in a 9:16 insert)
  const X = 420, Y = 160, CW = 760;
  g.fillStyle = '#161b22'; rr(g, X, Y, CW, h - 200, 14); g.fill(); g.strokeStyle = '#30363d'; g.lineWidth = 2; g.stroke();
  g.fillStyle = INK; g.font = font(30, 700, MONO); g.fillText('README.md', X + 30, Y + 44); g.fillStyle = DIM; g.font = font(22, 500); g.fillText('edited by Clawd · just now', X + 230, Y + 46);
  g.fillStyle = INK; g.font = font(60, 800); g.fillText('todo-app', X + 36, Y + 140);
  g.fillStyle = DIM; g.font = font(30, 500); g.fillText('My todo app. 2 stars.', X + 36, Y + 200);
  g.fillStyle = INK; g.font = font(40, 800); g.fillText('My new API key', X + 36, Y + 300); g.fillStyle = DIM; g.font = font(30, 600); g.fillText('(so I won’t lose it)', X + 36, Y + 350);
  const k = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 2.2), pop = 1 + 0.12 * pulse(t, B.readme + 0.05, 1, 0.5);
  g.save(); g.translate(X + 30, Y + 470); g.scale(pop, pop); g.fillStyle = `rgba(255,60,60,${0.25 + 0.35 * k})`; rr(g, 0, -80, CW - 60, 160, 12); g.fill();
  g.fillStyle = '#ffb3b3'; g.font = font(46, 800, MONO); g.fillText('API_KEY=', 24, -34); g.fillText('sk-TOTALLY-REAL-456', 24, 34); g.restore();
  for (let i = 0; i < 4; i++) { const t0 = BOT_BACK(0) + 0.1 * i, a = ez(t, t0, 0.15); if (a < 0.01) continue;
    const xs = [250, 1350, 250, 1350][i], ys = [330, 330, 700, 700][i], up = 40 * ez(t, t0, 0.2); botHead(g, xs, ys + 40 - up, 0.85, a, 0.75 + 0.25 * Math.sin(t * 11 + i)); }
}

const _hm = {};
function headMid(i) {
  if (!_hm[i]) { kai((CUTS[i] + CUTS[i + 1]) / 2, SHOTS[i]); _hm[i] = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0)); }
  return _hm[i];
}
// ---------------------------------------------------------------- cameras (fixed anchors per shot; slow push-in, tiny handheld drift)
const CAP_CLEAR = 0.43, _lift = {}, _tc = new THREE.PerspectiveCamera(30, S.W / S.H, 0.01, 100);
const topsAt = (name) => { K.root.updateMatrixWorld(true); CL.group.updateMatrixWorld(true);
  const kt = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.29, 0)), ct = CL.parts.torso.localToWorld(V(0, 8.3, 0));
  return /^S/.test(name) ? [] : /^K/.test(name) ? [kt] : /^C/.test(name) ? [ct] : [kt, ct]; };
function lift(i) {
  if (_lift[i] !== undefined) return _lift[i];
  _lift[i] = 0; let d = 0; if (/^S/.test(SHOTS[i])) return 0;
  const n = Math.ceil((CUTS[i + 1] - CUTS[i]) * 15);
  for (let k = 0; k <= n; k++) {
    const te = lerp(CUTS[i] + 0.01, CUTS[i + 1] - 0.02, k / n); kai(te, SHOTS[i]); clawd(te); const s = camFor(te, i), pts = topsAt(SHOTS[i]);
    for (let it = 0; it < 8; it++) {
      _tc.fov = s.fov; _tc.updateProjectionMatrix(); _tc.position.copy(s.pos); _tc.up.set(0, 1, 0); _tc.lookAt(s.tgt.clone().add(V(0, d, 0))); _tc.rotateZ(s.roll || 0); _tc.updateMatrixWorld();
      const ys = pts.map(p => p.clone().project(_tc)).filter(q => Math.abs(q.x) < 1.1 && q.z < 1).map(q => q.y);
      if (!ys.length) break; const over = Math.max(...ys) - (1 - 2 * CAP_CLEAR); if (over <= 0.005) break;
      d += over * 0.5 * s.pos.distanceTo(s.tgt) * Math.tan(s.fov * Math.PI / 360) * 1.05;
    }
  }
  return (_lift[i] = d);
}
function camFor(t, i) {
  const name = SHOTS[i], u = seg(t, CUTS[i], CUTS[i + 1]), dr = V(0.003 * Math.sin(t * 0.7 + i), 0.002 * Math.sin(t * 0.9 + 2 * i), 0);
  const push = (pos, tgt, k) => pos.clone().lerp(tgt, k * sio(u));
  let pos, tgt, fov, focus, ap, roll = 0;
  switch (name) {
    case 'WE': { tgt = V(-0.06, 0.5, -0.2); pos = push(V(-0.02, 0.5, 3.2), tgt, PUSH.med); fov = 34; focus = MID; ap = DOF.wide; break; }
    case 'W2': tgt = V(-0.1, 0.38, 0.0); pos = push(V(-0.12, 0.5, 3.0), tgt, PUSH.med); fov = 32; focus = MID; ap = DOF.wide; break;
    case 'WO': tgt = V(-0.2, 0.75, -0.6); pos = push(V(0.25, 0.7, 3.6), tgt, PUSH.med); fov = 36; focus = KEYP; ap = DOF.wide * 0.6; break;
    case 'CE': tgt = CFACE.clone().add(V(-0.45, 0.5, -0.9)); pos = push(CFACE.clone().add(V(0.75, 0.0, 2.6)), tgt, PUSH.med); fov = 34; focus = CFACE; ap = DOF.med * 0.5; break;
    case 'KH': { const H = headMid(i); tgt = H.clone().add(V(0.02, 0.06, -0.3)); pos = push(H.clone().add(V(0.08, -0.12, 1.75)), tgt, PUSH.close * 1.2); fov = 32; focus = H; ap = DOF.med; break; }
    case 'KC': { const H = headMid(i); tgt = H.clone().add(V(0, 0.02, 0)); pos = push(H.clone().add(V(-0.3, -0.22, 1.9)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KF': { const H = headMid(i); tgt = H.clone().add(V(0, 0.03, 0)); pos = H.clone().add(V(-0.2, -0.12, 1.75)).lerp(tgt, 0.2 * ss(seg(t, CUTS[i], CUTS[i] + F(4))) + 0.05 * seg(t, CUTS[i] + F(4), CUTS[i + 1])); fov = 30; focus = H; ap = DOF.close; break; }   // r2: snap push-in, then hold
    case 'KP': { const H = headMid(i); tgt = H.clone().add(V(-0.08, 0.06, -0.2)); pos = push(H.clone().add(V(-0.18, -0.14, 1.65)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KS': { const H = headMid(i); tgt = H.clone().add(V(-0.05, -0.12, 0)); pos = push(H.clone().add(V(-0.2, -0.22, 2.1)), tgt, PUSH.med); fov = 32; focus = H; ap = DOF.med; break; }
    case 'CM': tgt = CFACE.clone().add(V(0.2, 0.06, 0)); pos = push(CFACE.clone().add(V(0.14, -0.12, 3.0)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med; break;
    case 'CC': tgt = CFACE.clone().add(V(0, 0.02, 0)); pos = push(CFACE.clone().add(V(0.16, -0.1, 2.1)), tgt, PUSH.close * 0.5); fov = 30; focus = CFACE; ap = DOF.close; break;
    case 'CX': tgt = CFACE.clone().add(V(0, 0.03, 0)); pos = push(CFACE.clone().add(V(0.12, -0.04, 2.3)), tgt, PUSH.close); fov = 30; focus = CFACE; ap = DOF.close; break;
    case 'CS': tgt = CFACE.clone().add(V(-0.2, 0.55, -0.9)); pos = push(CFACE.clone().add(V(0.7, 0.12, 2.9)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.6; break;
    case 'CO': tgt = CFACE.clone().add(V(0.12, 0.42, -0.8)); pos = push(CFACE.clone().add(V(0.45, 0.05, 2.6)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.6; break;
    case 'CK': { tgt = KEYP.clone().add(V(-0.14, 0.14, 0)); pos = push(tgt.clone().add(V(0.3, 0.75, 2.7)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.7; break; }
    case 'SCRH': { tgt = SET.scrW(0.29, 0.45); pos = push(tgt.clone().add(V(0.0, 0.1, 3.7)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.close; break; }
    case 'SCRG': { tgt = SET.scrW(0.33, 0.38); pos = push(tgt.clone().add(V(0.05, 0.15, 3.5)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.med; break; }
    case 'SCRP': { tgt = SET.scrW(0.82, 0.3); pos = push(tgt.clone().add(V(-0.2, 0.15, 2.7)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.med; break; }
    case 'SCRB': { tgt = SET.scrW(0.82, 0.48); pos = push(tgt.clone().add(V(-0.2, 0.15, 2.7)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.med; break; }
    case 'SCRS': { tgt = SET.scrW(0.88, 0.12); pos = push(tgt.clone().add(V(-0.05, 0.1, 1.9)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.close; break; }
    case 'SCRT': { tgt = SET.scrW(0.83, 0.42); pos = push(tgt.clone().add(V(-0.25, 0.2, 2.9)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.med; break; }
    case 'SCRC': { tgt = SET.scrW(0.5, 0.5); pos = push(tgt.clone().add(V(0.05, 0.25, 5.2)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.med; break; }
    case 'SCRR': { tgt = SET.scrW(0.5, 0.52); pos = push(tgt.clone().add(V(0.08, 0.3, 5.2)), tgt, PUSH.med); fov = 30; focus = tgt; ap = DOF.med; break; }
  }
  pos.add(dr); tgt.y += lift(i);
  return { pos, tgt, fov, roll, focus: pos.distanceTo(focus), aperture: Number(Q.get('ap') || ap), shot: name, i };
}

// ---------------------------------------------------------------- captions (small white sans, centred) + the hook title + the KEY end card
const CAP = VO_LINES.map((l, i) => { const nx = VO_LINES[i + 1];
  return { txt: l.text, s: l.s - 0.04, e: nx ? Math.min(nx.s - 0.04, l.e + 0.9) : Math.min(B.freeze + 0.1, l.e + 0.9) }; });
function captions(g, t, s) {
  if (Q.has('nocap')) return;
  const H = g.canvas.height, Wd = g.canvas.width;
  if (t >= B.card) {                                   // end card: one keyword, after the button (not spoken)
    const a = ez(t, B.card, 0.25), pop = 1 + 0.08 * Math.exp(-(t - B.card) * 8) * Math.sin((t - B.card) * 24);
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(5,8,12,0.45)'; g.fillRect(0, 0, Wd, H); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(Wd / 2, H * 0.3); g.scale(pop, pop);
    g.font = `600 ${Math.round(H * 0.026)}px Inter, "Helvetica Neue", Arial, sans-serif`; g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = H * 0.01;
    g.fillText('Comment', 0, -H * 0.058);
    const fs = Math.round(H * 0.065); g.font = `800 ${fs}px Menlo, "SF Mono", monospace`; const tw = g.measureText('KEY').width;
    g.shadowBlur = 0; g.fillStyle = '#d97757'; rr(g, -tw / 2 - fs * 0.5, -fs * 0.7, tw + fs, fs * 1.4, fs * 0.3); g.fill();
    g.fillStyle = '#ffffff'; g.fillText('KEY', 0, fs * 0.04);
    g.font = `600 ${Math.round(H * 0.02)}px Inter, "Helvetica Neue", Arial, sans-serif`; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = H * 0.01;
    g.fillText('for the leaked-key checklist', 0, H * 0.068);
    g.restore(); return;
  }
  if (t < 2.7) {                                       // hook title (first 2.7 s)
    const a = 1 - ez(t, 2.45, 0.25), fs = Math.round(H * 0.036);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`;
    const l1 = 'POV: your API key', l2 = 'is PUBLIC', w2 = g.measureText(l2).width, y0 = H * 0.15;
    const w1 = g.measureText(l1).width; g.fillStyle = 'rgba(6,8,12,0.82)'; rr(g, Wd / 2 - w1 / 2 - fs * 0.6, y0 - fs * 0.95, w1 + fs * 1.2, fs * 3.2, fs * 0.35); g.fill();   // r2: plate, so the title never sits on the repo header
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = fs * 0.4; g.fillStyle = '#ffffff'; g.fillText(l1, Wd / 2, y0);
    const k = 1 + 0.06 * Math.sin(t * 2 * Math.PI * 1.4);
    g.save(); g.translate(Wd / 2, y0 + fs * 1.32); g.scale(k, k); g.shadowBlur = 0; g.fillStyle = '#e5322d'; rr(g, -w2 / 2 - fs * 0.38, -fs * 0.66, w2 + fs * 0.76, fs * 1.32, fs * 0.25); g.fill();
    g.fillStyle = '#ffffff'; g.fillText(l2, 0, fs * 0.03); g.restore(); g.restore();
  }
  const c = CAP.find(c => t >= c.s && t < c.e); if (!c) return;
  const fs = Math.round(H * 0.025), y = H * (s && /^S/.test(s.shot) ? 0.77 : 0.36);
  g.save(); g.font = `600 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = c.txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText(tr).width > Wd * 0.62 && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur);
  const pw = Math.max(...lines.map(l => g.measureText(l).width)) + fs * 1.1, ph = lines.length * fs * 1.25 + fs * 0.6;
  g.fillStyle = 'rgba(8,10,16,0.45)'; rr(g, Wd / 2 - pw / 2, y - ph / 2, pw, ph, fs * 0.4); g.fill();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = fs * 0.4; g.shadowOffsetY = fs * 0.06; g.fillStyle = '#ffffff';
  lines.forEach((l, i) => g.fillText(l, Wd / 2, y + (i - (lines.length - 1) / 2) * fs * 1.25));
  g.restore();
}

// ---------------------------------------------------------------- frame
function prep(t) {
  const i = shotIdx(t);
  drawScreen(t);
  if (/^K/.test(SHOTS[i])) headMid(i);
  lift(i);
  const k = kai(t, SHOTS[i]); clawd(t); props(t); drawSparks(t);
  const ins = /^SCR[CRHG]/.test(SHOTS[i]);                                              // wide screen inserts: the camera sits behind the cast, so it is a pure insert
  K.holder.visible = CL.group.visible = SET.seat.visible = !ins && !Q.has('hide');
  const s = camFor(t, i); s.k = k; return s;
}
const CUES = () => [
  { t: 0, kind: 'alarm' }, { t: B.pub - F(1), kind: 'tick' }, { t: B.two - F(1), kind: 'pop' },
  ...[0, 3, 6].map(i => ({ t: BOT_ON(i), kind: 'bot' })), { t: BOT_ON(8), kind: 'bots' },
  { t: B.do6, kind: 'timer' }, { t: B.timerEnd + 0.1, kind: 'impact' },
  { t: W('l07', 'Okay') + 0.33, kind: 'relief' }, { t: B.deleted + 0.12, kind: 'check' }, { t: B.history - 0.05, kind: 'drop' },
  { t: B.country - 0.05, kind: 'ping' }, { t: B.right - 0.02, kind: 'flare' }, { t: e_('l10') + 0.04, kind: 'counter' },
  { t: STAND[0], kind: 'stand' }, { t: B.popular - 0.05, kind: 'chart' }, { t: B.something - 0.1, kind: 'whoosh' },
  ...HOPS.map(([, b, h]) => ({ t: b, kind: h >= 0.05 ? 'land_big' : h <= 0.02 ? 'tap' : 'land' })),
  { t: B.off + 0.38, kind: 'poweroff' }, { t: B.off + 0.6, kind: 'eyesoff' }, { t: e_('l14') + 0.05, kind: 'stamp' }, { t: STAND[1], kind: 'sit' },
  { t: B.what - F(1), kind: 'snap' }, { t: CHECKS[0], kind: 'check' }, 
  ...BURSTS.filter(([, n]) => n !== 2).map(([t]) => ({ t, kind: 'sparkle' })), { t: W('l18', 'key') + 0.2, kind: 'keypop' },
  { t: BOT_BACK(0), kind: 'bots' }, { t: B.card, kind: 'card' }];
window.__cues = () => CUES().sort((a, b) => a.t - b.t).map(c => ({ ...c, t: +c.t.toFixed(3) }));
window.__dbg = { topsAt, CAP, CAP_CLEAR, prep, CUTS, SHOTS, B, S_, K, CL, T_END, KHEAD, CFACE, LN, shotIdx, camera: S.camera, WORK: [], STATE_T: [] };
S.run({ prep, T_END, overlay: (t, s) => captions(S.g2, t, s) });
