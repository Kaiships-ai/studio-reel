// reel.js · reel57 "Permission" (first ksa-reel-skit). Clawd asks permission for every tiny thing; each "Yes" clicks the giant
// ENTER key under Kai; Kai gives up and turns on skip permissions (YOLO mode); Clawd happily "cleans up" and his home folders
// (giant manila folders behind them + the Finder on screen) poof one by one; then, with nothing left, Clawd politely asks
// "Do you want to proceed?" over `ls ~/`. Facts: the rm -rf … ~/ incidents (Oct + Dec 2025), --dangerously-skip-permissions.
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
for (const k of ['body', 'limb']) CL.materials[k].color.set('#f2a531');   // the night grade (violet ambient + blue screen light) pushed the toy to crimson: albedo compensated so it reads Claude orange

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
  clean1: W('l01', 'clean'), sure: W('l02', 'Sure'), ask1: W('l02', 'Can'), yes1: W('l03', 'Yes'), ask2: W('l04', 'Can'), again: W('l04', 'again'),
  uh: s_('l05'), yes2: W('l05', 'Yes'), ask3: W('l06', 'open'), ask4: W('l06', 'one', 1), ask5: W('l06', 'one', 2),
  y3: W('l07', 'Yes', 1), y4: W('l07', 'Yes', 2), y5: W('l07', 'Yes', 3), stopAsk: W('l07', 'Stop'),
  sigh: s_('l08'), okay: W('l08', 'Okay'), skip: W('l08', 'Skip'), yolo: W('l08', 'YOLO'), ooh: W('l09', 'Ooh'), go: W('l09', 'GO'),
  finally: W('l10', 'Finally'), peace: W('l10', 'peace'), cleaning: W('l11', 'Cleaning'), stuff: W('l11', 'stuff'),
  wait: W('l12', 'Wait'), wheres: W('l12', "Where's"), desktop: W('l12', 'Desktop'), cleaned: W('l13', 'cleaned'),
  where14: W('l14', 'Where'), photos: W('l14', 'PHOTOS'), superc: W('l15', 'Super'), clean15: W('l15', 'clean'), now15: W('l15', 'now'),
  stop16: W('l16', 'Stop'), ask16: W('l16', 'ASK'), said: W('l17', 'said'), questions: W('l17', 'questions'),
  done18: W('l18', 'done'), do18: W('l18', 'Do'), proceed: W('l18', 'proceed'),
};
const T_END = Math.round((VO_END + 2.2) * 30) / 30;                                 // + the YOLO end card after the button
B.sighA = s_('l08') - 0.43; B.sighB = s_('l10') - 0.98;                         // measured sigh onsets (tags sit before the line's first word)
B.end = e_('l18') + 0.35; B.card = e_('l18') + 0.55;
// permission prompts: [pop, approved (Kai's "Yes"), title, command]
const PROMPTS = [[B.ask1, B.yes1, 'Bash command', 'ls old-project/'], [B.ask2, B.yes2, 'Bash command', 'ls old-project/'],
  [B.ask3, B.y3, 'Read file', 'package.json'], [B.ask4, B.y4, 'Read file', 'README.md'], [B.ask5, B.y5, 'Read file', 'index.js'],
  [B.do18 - 0.02, 99, 'Bash command', 'ls ~/']];
const YES = [B.yes1, B.yes2, B.y3, B.y4, B.y5];                                     // the ENTER key clicks under Kai
B.toggle = B.skip + 0.05;                                                       // ⏵⏵ bypass permissions on: flips as he finishes "YOLO mode."
B.rm = B.cleaning + 0.18;
// what gets deleted (physical folder and/or Finder icon), each on a word
const POOF = { Documents: B.stuff - 0.02, Desktop: e_('l11') + 0.16, Photos: B.photos + 0.02, Music: B.clean15, Downloads: B.clean15 + 0.1, 'old-project': B.clean15 + 0.2 };
const TYPE = []; for (let t = B.cleaning - 0.16; t < B.wait + 0.3; t += 0.24) TYPE.push(t);   // Clawd's typing hops (feet on the keys)

// ---------------------------------------------------------------- blocking (metres): Kai on the ENTER key (right), Clawd on the keys (left)
const KYAW = -0.32;
const HIP = V(0.002, 0.215, 0.0).applyAxisAngle(V(0, 1, 0), KYAW);
const KP = V(SEAT.x - HIP.x, DECK, SEAT.z - HIP.z);
K.holder.position.copy(KP); K.holder.rotation.y = KYAW;
K.pose([['sit', 0.5, 1]]); S.scene.updateMatrixWorld(true);
const KHEAD = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0));
const KFILL_I = Number(Q.get('kfill') ?? 6), kfill = new THREE.SpotLight('#ffdcc0', KFILL_I, 3, 0.32, 0.7, 2);
kfill.position.copy(KHEAD).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(KHEAD).add(V(0, -0.12, 0)); S.scene.add(kfill, kfill.target);
const CP = V(-0.34, DECK, 0.06), CYAW = 0.38;
const CFACE = CP.clone().add(V(0, 7 * CL_S, 0));
const MID = KHEAD.clone().lerp(CFACE, 0.5);

// ---------------------------------------------------------------- shots: hard cut on each speaker change; two screen inserts
const fr = (x) => Math.round(x * 30) / 30;
const SHOTLIST = [[0, 'W'], [s_('l02'), 'CM'], [s_('l03'), 'KC'], [s_('l04'), 'CC'], [s_('l05'), 'KP'], [s_('l06'), 'CS'], [s_('l07'), 'KC'],
  [B.skip - 0.1, 'SCR'], [s_('l09'), 'CC'], [B.sighB - 0.05, 'KC'], [s_('l11') - 0.1, 'W2'], [s_('l12'), 'KC'], [s_('l13'), 'CM'], [s_('l14'), 'KM'],
  [s_('l15'), 'CW'], [s_('l16'), 'KS'], [s_('l17'), 'CC'], [s_('l18'), 'CM'], [B.do18 - 0.08, 'SCR2'], [B.end, 'WE']];
const CUTS = [...SHOTLIST.map(([t]) => t ? fr(t - 0.03) : 0), T_END], SHOTS = SHOTLIST.map(([, n]) => n);
const shotIdx = (t) => { let i = 0; while (i < CUTS.length - 2 && t >= CUTS[i + 1]) i++; return i; };
const STAND = [CUTS[SHOTS.indexOf('KS')], CUTS[SHOTS.indexOf('KS') + 1]];          // "Stop! Why didn't you ASK?" Kai on his feet

// ---------------------------------------------------------------- Kai
const BL = (a, b, every, seed) => { const o = []; for (let t = a + 0.6, i = 0; t < b; i++) { o.push(Math.round(t * 30) / 30); t += every * (0.7 + 0.6 * hsh(i, seed)); } return o; };
const KBLINK = BL(0, T_END, 3.0, 3).filter(t => t < B.peace - 0.3 || t > B.wait + 0.4), CBLINK = BL(0.4, T_END, 2.6, 7);
const press = (t) => { let p = 0; for (const t0 of YES) { const u = t - (t0 - F(1)); if (u > 0) p = Math.max(p, u < F(2) ? u / F(2) : u < F(5) ? 1 : Math.max(0, 1 - (u - F(5)) / F(5))); } return p; };
const STAND_CLIP = Q.get('sclip'), STAND_T = Number(Q.get('st') ?? 0.6);
function kai(t, shot) {
  const standing = t >= STAND[0] && t < STAND[1];
  const down = ez(t, B.end - 0.05, 0.5);                                              // the end: slumps, chin into his hand
  const base = 0.25 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / 6.5));
  if (standing && STAND_CLIP) K.pose([[STAND_CLIP, STAND_T, 1]]);
  else if (standing) { const w = clamp(step(t, B.ask16 - 0.15, 3.2, 7)); K.pose([['cast_a_spell', 2.4 + 0.3 * seg(t, B.stop16, B.ask16), 1 - w], ['afraid', 0.3 + 0.3 * seg(t, B.ask16, STAND[1]), w]]); }
  else K.pose(down > 0.001 ? [['sit', base, 1 - down], ['sitB', 4.5, down]] : [['sit', base, 1]]);
  const dip = 0.016 * press(t);
  K.holder.position.y = KP.y - dip; SET.seat.position.y = -dip;
  // look targets (yaw: − = toward Clawd, screen behind = −0.75; + = the Photos folder behind his left shoulder)
  const L = { clawd: -0.42, screen: -0.75, cam: 0.02, photos: 0.62 };
  const yawK = TR(t, [[0, L.clawd], [B.ask1 + 0.15, L.screen, 2.6, 7], [B.yes1 + 0.25, L.clawd, 2.6, 7], [B.ask2 + 0.25, L.screen, 2.6, 7],
    [B.uh, L.clawd, 2.4, 7], [B.ask3 + 0.1, L.screen, 2.6, 7], [s_('l07') - 0.1, L.clawd, 2.6, 7], [B.skip - 0.15, L.screen, 2.6, 7],
    [B.ooh + 0.2, L.clawd, 2.6, 7], [B.finally, L.cam, 2.0, 7], [B.wait - F(1), L.screen, SNAP.f ?? 5, 9], [B.desktop + 0.4, L.clawd, 3, 8],
    [B.where14 - 0.1, L.photos, 5, 9], [s_('l15') + 0.2, L.clawd, 3, 8], [STAND[1], L.clawd, 3, 8], [B.do18, L.screen, 2.4, 7], [B.end, L.cam, 2, 7]]);
  const pitchK = TR(t, [[0, -0.05], [B.ask1 + 0.15, -0.3, 2.6, 7], [B.yes1 + 0.25, -0.05, 2.6, 7], [B.ask2 + 0.25, -0.3, 2.6, 7], [B.uh, -0.02, 2.4, 7],
    [B.ask3 + 0.1, -0.32, 2.6, 7], [s_('l07') - 0.1, -0.05, 2.6, 7], [B.skip - 0.15, -0.3, 2.6, 7], [B.ooh + 0.2, -0.05, 2.6, 7],
    [B.finally, -0.2, 1.6, 7], [B.wait - F(1), -0.12, 5, 9], [B.desktop + 0.4, -0.04, 3, 8], [B.where14 - 0.1, -0.08, 5, 9],
    [s_('l15') + 0.2, 0.02, 3, 8], [B.do18, -0.28, 2.4, 7], [B.end, 0.1, 2, 7]]);
  // nods on stressed words (1 frame before the sound); the three "Yes" nods grow; head shakes on "Stop asking" / "Stop!"
  const NOD = [[B.clean1, 0.08], [B.yes1, 0.12], [B.yes2, 0.06], [B.y3, 0.1], [B.y4, 0.16], [B.y5, 0.26], [B.okay, 0.1], [B.yolo, 0.14], [B.peace, 0.06], [B.desktop, 0.08], [B.photos, 0.14]];
  let nod = 0; for (const [t0, a] of NOD) nod += ring(t, t0 - F(1), { f: 2.6, d: 6, a }) * (t > t0 - F(1) ? 1 : 0) * Math.sin(Math.min(1, (t - t0 + F(1)) * 12) * Math.PI / 2);
  let shake = 0; for (const t0 of [B.stopAsk, B.ask16]) if (t > t0 - F(1)) shake += 0.12 * Math.exp(-(t - t0) * 6) * Math.sin((t - t0 + F(1)) * 2 * Math.PI * 4.2);
  // body: sigh slump, relaxed lean back (eyes shut), the double-take jolt, leans of panic
  const slump = pulse(t, B.sighA, 1, 0.9) + 0.7 * pulse(t, B.sighB, 1, 0.9);
  const relax = ez(t, B.finally - 0.1, 0.6) * (1 - ez(t, B.wait - F(2), F(5)));
  const jolt = t > B.wait - F(1) ? ring(t, B.wait - F(1), { f: 2.2, d: 5, a: 1 }) : 0;
  const lean = 0.1 * slump - 0.16 * relax + TR(t, [[0, 0], [B.y5 - 0.1, 0.1, 2.4, 7], [B.stopAsk + 0.6, 0, 1.8, 7], [B.photos - 0.1, 0.12, 3, 8], [s_('l15') + 0.3, -0.06, 2.4, 7], [STAND[1], 0, 2, 7]]);
  const tilt = TR(t, [[0, 0], [B.again - 0.1, 0.12, 2, 7], [B.yes2 + 0.4, 0, 1.6, 7], [B.said - 0.1, -0.1, 2, 7], [e_('l17') + 0.3, 0, 1.6, 7]]);
  const sk = standing ? 0.5 : 1;
  K.turn('Spine1', V(1, 0, 0), lean - 0.06 * jolt + 0.12 * down); K.turn('Spine2', V(1, 0, 0), 0.06 * down + 0.05 * slump);
  K.turn('Neck', V(0, 1, 0), (yawK + shake) * 0.35 * sk); K.turn('Head', V(0, 1, 0), (yawK + shake) * 0.65 * sk);
  K.turn('Head', V(1, 0, 0), (pitchK + nod - 0.1 * jolt + 0.08 * slump + 0.2 * down) * sk); K.turn('Head', V(0, 0, 1), tilt * sk);
  K.root.updateMatrixWorld(true);
  if (standing) { const H = K.bones.Head.getWorldPosition(V(0, 0, 0)); kfill.position.copy(H).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(H).add(V(0, -0.12, 0)); }
  else { kfill.position.copy(KHEAD).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(KHEAD).add(V(0, -0.12, 0)); }
  kfill.target.updateMatrixWorld(); kfill.intensity = KFILL_I;
  const shut = t > B.peace + 0.1 && t < B.wait - F(1) ? 1 : 0;                       // "peace and quiet": eyes shut until "Wait."
  const m = voMouth(t, KW, ENV_K), bl = Math.max(blinks(t, KBLINK), shut); K.talk.set({ ...m, blink: bl });
  return { yawK, m, bl, standing, down };
}

// ---------------------------------------------------------------- Clawd: talk bob, hops that land, arms, eye shapes
const S_ = { pos: V(), face: V(), sq: 1, body: 1, expr: 'neutral', talk: 0, scale: CL_S, flame: 1, arm: 0 };
const EYE = { neutral: [1, 1, 0, 0], happy: [1.05, 0.78, 0.45, 0], wide: [1.12, 1.25, 0.1, 0], squint: [1.05, 0.5, 0.2, 0], worried: [1, 0.92, 0, 0.22] };
// hops: [take-off, landing, height m]
const HOPS = [[0.1, 0.32, 0.035], [B.sure - F(1), B.sure + 0.2, 0.025], [B.ask3, B.ask3 + 0.2, 0.02], [B.ask4, B.ask4 + 0.22, 0.03], [B.ask5, B.ask5 + 0.24, 0.045],
  [B.go - F(2), B.go + 0.36, 0.09], ...TYPE.map(t0 => [t0, t0 + 0.15, 0.016]), [B.superc, B.superc + 0.24, 0.05], [B.now15 - 0.04, B.now15 + 0.24, 0.06],
  [B.done18 - F(1), B.done18 + 0.24, 0.04]];
const EMPH = [[B.ask1, -0.05], [B.ask2, -0.06], [B.cleaned, 0.1], [B.questions, -0.04], [B.do18, -0.05]];
function clawd(t) {
  const talking = VO_LINES.some(l => l.who !== 'kai' && t > l.s - 0.05 && t < l.e + 0.05);
  const env = talking ? clamp((envAt(ENV_C, t) + envAt(ENV_C, t + F(1)) + envAt(ENV_C, t + F(2))) / 3 * 1.3) : 0;
  let y = 0, hsq = 0;
  for (const [a, b, h] of HOPS) if (t > a - 0.2 && t < b + 0.5) { const o = hop(t, a, b, h); y += o.y; hsq += o.sy; }
  hsq = Math.max(hsq, SQ.land - 1);                                                  // back-to-back hops: a landing and the next crouch never stack below the land squash
  let body = 1 + 0.008 * Math.sin(t * 2 * Math.PI / 3.2);
  for (const [t0, a] of EMPH) body += pulse(t, t0 - F(2), a, 0.3);
  const startle = pulse(t, B.stop16 + F(2), -0.1, 0.25);                              // Kai's "Stop!": a small flinch
  const sq = body + hsq + startle + 0.045 * env;
  // yaw: toward Kai; faces front while typing on the keys; turns to the screen for the last prompt
  const typing = win(t, B.cleaning - 0.2, B.wait + 0.3, 0.2, 0.3);
  const yaw = CYAW - (CYAW - 0.05) * typing - 0.45 * win(t, B.do18 - 0.15, B.end + 0.2, 0.25, 0.4);
  // lean: polite bow on every "Can I…", the innocent head tilt (roll) on "You said no more questions."
  let bow = 0; for (const t0 of [B.ask1, B.ask2, B.ask3, B.proceed]) bow += pulse(t, t0 - 0.1, 0.12, 0.6);
  const roll = 0.14 * win(t, B.said - 0.1, e_('l17') + 0.25, 0.2, 0.3);
  // arms: begging (both a little up) while asking; both up on GO / Super clean; one up proud on "cleaned" / "done"; typing taps
  const ask = Math.max(win(t, B.ask1, e_('l02'), 0.15, 0.25), win(t, B.ask2, e_('l04'), 0.15, 0.25), win(t, B.ask3 - 0.1, e_('l06'), 0.15, 0.25), win(t, B.do18, e_('l18') + 0.2, 0.15, 0.3));
  const cheer = Math.max(win(t, B.go - 0.08, B.go + 0.7, 0.12, 0.3), win(t, B.superc - 0.08, e_('l15') + 0.4, 0.12, 0.3));
  const proud = Math.max(win(t, B.cleaned - 0.1, e_('l13') + 0.35, 0.15, 0.3), win(t, B.done18 - 0.08, B.done18 + 0.5, 0.12, 0.25));
  const tap = typing * (0.5 + 0.5 * Math.sin((t - B.cleaning) * 2 * Math.PI / 0.24));
  const inW = (a, b) => t >= a && t < b;
  const expr = inW(B.stop16 + F(2), B.stop16 + 0.5) || inW(0.1, 0.75) ? 'wide'
    : inW(B.sure - 0.1, e_('l02') + 0.3) || inW(B.go - 0.3, e_('l09') + 0.6) || inW(B.cleaning - 0.3, e_('l11') + 0.8) || inW(B.cleaned - 0.1, e_('l13') + 0.5)
      || inW(B.superc - 0.1, e_('l15') + 0.5) || inW(B.said - 0.1, T_END) ? 'happy'
    : inW(B.ooh - 0.05, B.go - 0.3) ? 'wide' : inW(B.ask1, e_('l06') + 0.3) ? 'neutral' : 'neutral';
  const lookX = TR(t, [[0, 0.5], [B.ask3, -0.2, 3, 12], [B.ask4, 0.3, 3, 12], [B.ask5, -0.2, 3, 12], [e_('l06'), 0.5, 3, 12], [B.cleaning - 0.2, 0, 3, 12], [B.wait + 0.3, 0.5, 3, 12]]);
  CL.group.position.copy(CP); CL.group.rotation.set(0, yaw, 0);
  CL.update(t, { action: 'idle', blink: false, look: [lookX, 0] });
  const P = CL.parts;
  P.torso.rotation.set(bow, 0, roll);
  P.bounce.position.y = y / CL_S;
  P.bounce.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  P.arms.forEach(a => { a.rotation.set(0, 0, 0); a.position.y = 3.0; });
  const up2 = Math.max(cheer, 0.35 * ask), [Lr, R] = P.arms;
  Lr.position.y = 3.0 + 2.6 * up2 + 0.6 * tap; Lr.rotation.z = -0.9 * up2; Lr.rotation.y = 0.5 * up2 - 0.4 * ask;
  const upR = Math.max(up2, proud);
  R.position.y = 3.0 + 2.6 * upR + 0.6 * (1 - tap) * typing; R.rotation.z = 0.9 * upR; R.rotation.y = -0.5 * upR + 0.4 * ask * (1 - proud);
  const bl = blinks(t, CBLINK), ex = EYE[expr];
  P.eyes.forEach((e, i) => { const sxn = i ? 1 : -1;
    e.scale.set(ex[0], Math.max(0.07, ex[1] * (1 - 0.93 * bl)), 1); e.position.y = 4.0 + ex[2] + 0.9 * bl * ex[1];
    e.position.x = sxn * 3.5 + lookX * 0.5; e.rotation.z = -sxn * ex[3]; });
  CL.group.updateMatrixWorld(true);
  // key glow under his feet on each landing
  let g = 0; for (const [, b] of HOPS) if (t > b) g = Math.max(g, Math.exp(-(t - b) * 14) * (t - b < 0.4 ? 1 : 0));
  SET.keyGlow.position.copy(CP).add(V(0, 0.03, 0.05)); SET.keyGlow.intensity = 1.6 * g;
  S_.pos.copy(CL.group.position); S_.face.copy(P.torso.localToWorld(V(0, 5, 4.6))); S_.sq = sq; S_.body = body; S_.expr = expr; S_.talk = env; S_.yaw = yaw; S_.blink = bl; S_.arm = upR; S_.flame = 1; S_.y = y;
  return S_;
}

// ---------------------------------------------------------------- folders: anticipation squash → pop to nothing + dust puff + paper bits
const NP = 16, puffM = new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 1, emissive: new THREE.Color('#5a5040') });
const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), puffM, NP * 4); puffs.frustumCulled = false; S.scene.add(puffs);
const sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 4.2, 1.6) }), sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sparkM, 14 * 3);
sparks.frustumCulled = false; S.scene.add(sparks); const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion();
const FOLDERS = Object.entries(SET.folders).map(([name, f], i) => ({ name, ...f, t0: POOF[name], seed: i * 7 + 3 }));
function drawFolders(t) {
  let n = 0;
  for (const f of FOLDERS) {
    const u = t - f.t0, pre = F(3), gone = F(5);
    let sx = 1, sy = 1;
    if (u > -pre && u <= 0) { const k = (u + pre) / pre; sx = 1 + 0.12 * k; sy = 1 - 0.1 * k; }                 // anticipation
    else if (u > 0) { const k = clamp(u / gone); sx = (1.12) * (1 - ss(k)) + 1e-4; sy = (0.9 + 0.5 * k) * (1 - ss(k)) + 1e-4; }
    f.pv.scale.set(sx, sy, sx); f.g.visible = u < gone;
    if (u > 0 && u < 0.9) for (let i = 0; i < NP; i++) {                           // dust puff (expands, rises, shrinks)
      const a = hsh(i, f.seed) * 2 * Math.PI, r0 = 0.08 + 0.12 * hsh(i, f.seed + 1), life = 0.5 + 0.4 * hsh(i, f.seed + 2); if (u > life) continue;
      const k = u / life, sp = 0.35 + 0.4 * hsh(i, f.seed + 3);
      const p = f.base.clone().add(V(Math.cos(a) * (r0 + sp * k * 0.5), 0.1 + 0.3 * hsh(i, f.seed + 4) + 0.18 * k, Math.sin(a) * (r0 + sp * k * 0.3) * 0.5));
      const r = 0.05 * (0.6 + 0.8 * hsh(i, f.seed + 5)) * Math.sin(Math.PI * Math.min(1, k * 1.6 + 0.15)) * (1 - k * 0.3);
      _m4.compose(p, _q, V(r, r, r)); puffs.setMatrixAt(n++, _m4);
    }
  }
  for (let i = n; i < NP * 4; i++) { _m4.makeScale(0, 0, 0); puffs.setMatrixAt(i, _m4); }
  puffs.instanceMatrix.needsUpdate = true;
}
const BURSTS = [[B.go + 0.02, 1, 1], [B.superc + 0.02, 2, 0.8], [B.now15, 3, 1], [B.done18, 4, 0.7]];
function drawSparks(t) {
  let n = 0, glow = 0;
  for (const [t0, seed, k] of BURSTS) {
    const u = t - t0; if (u < 0 || u > 0.6 || n > 14 * 3 - 14) continue;
    const o = CL.parts.torso.localToWorld(V(0, 9.5, 0));
    for (let i = 0; i < 14; i++) {
      const a = hsh(i, seed) * 2 * Math.PI, el = 0.4 + 0.9 * hsh(i, seed + 1), sp = (0.5 + 0.8 * hsh(i, seed + 2)) * k, life = 0.25 + 0.3 * hsh(i, seed + 3);
      if (u > life) continue; const r = (1 - u / life) * 0.006 * (0.6 + hsh(i, seed + 4));
      const p = o.clone().add(V(Math.cos(a) * Math.cos(el) * sp * u, Math.sin(el) * sp * u - 2.6 * u * u, Math.sin(a) * Math.cos(el) * sp * u * 0.6 + 0.12 * u));
      _m4.compose(p, _q, V(r, r, r)); sparks.setMatrixAt(n++, _m4);
    }
    glow = Math.max(glow, Math.exp(-u * 9) * k);
  }
  for (let i = n; i < 14 * 3; i++) { _m4.makeScale(0, 0, 0); sparks.setMatrixAt(i, _m4); }
  sparks.instanceMatrix.needsUpdate = true;
  SET.screenGlow.intensity = 0.6 + 2.0 * glow;
}

// ---------------------------------------------------------------- the monitor: Claude Code (left) + Finder of Kai's home folder (right)
const font = (px, w = 600, fam = 'Inter, "Helvetica Neue", Arial, sans-serif') => `${w} ${px}px ${fam}`;
const MONO = 'Menlo, "SF Mono", monospace';
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const LOG = [[B.clean1, '> clean up my old project', '#f2efe8'], [B.yes1 + 0.2, '● Bash(ls old-project/) ✓', '#8b8798'], [B.yes2 + 0.2, '● Bash(ls old-project/) ✓', '#8b8798'],
  [B.y3 + 0.2, '● Read(package.json) ✓', '#8b8798'], [B.y4 + 0.2, '● Read(README.md) ✓', '#8b8798'], [B.y5 + 0.2, '● Read(index.js) ✓', '#8b8798'],
  [B.stopAsk, '> stop asking!', '#f2efe8'], [B.toggle, '> --dangerously-skip-permissions', '#ff8fb1'], [B.cleaning - 0.1, '● Cleaning up…', '#8b8798'],
  [B.rm, '● Bash(rm -rf tests/patches/plan/ ~/)', '#ffb27a'], [POOF.Documents, '  ⎿ removed ~/Documents', '#8b8798'], [POOF.Desktop, '  ⎿ removed ~/Desktop', '#8b8798'],
  [POOF.Photos, '  ⎿ removed ~/Photos', '#8b8798'], [POOF.Music, '  ⎿ removed ~/Music ~/Downloads …', '#8b8798'], [B.now15 + 0.1, '● All clean! ✨', '#e9e4d8'],
  [B.stop16, '> STOP', '#ff6b5e']];
const ICONS = ['Desktop', 'Documents', 'Photos', 'Music', 'Downloads', 'old-project'];
function folderIcon(g, x, y, s, name, t) {      // macOS-like blue folder + label; poofs at POOF[name]
  const t0 = POOF[name] ?? 99, u = t - t0;
  if (u > 0.5) return;
  let k = 1; if (u > -F(3) && u <= 0) k = 1 + 0.12 * (u + F(3)) / F(3); else if (u > 0) k = 1.12 * (1 - ss(clamp(u / F(5))));
  g.save(); g.translate(x, y); g.scale(k, k);
  if (k > 0.02) {
    g.fillStyle = '#4a9be8'; rr(g, -70 * s, -56 * s, 60 * s, 22 * s, 6 * s); g.fill();
    g.fillStyle = '#62b0f5'; rr(g, -70 * s, -44 * s, 140 * s, 100 * s, 10 * s); g.fill();
    g.fillStyle = '#8cc8ff'; rr(g, -70 * s, -30 * s, 140 * s, 86 * s, 10 * s); g.fill();
    g.fillStyle = '#e9e6f0'; g.font = font(26 * s, 600); g.textAlign = 'center'; g.fillText(name, 0, 92 * s);
  }
  g.restore();
  if (u > 0 && u < 0.5) { for (let i = 0; i < 9; i++) { const a = hsh(i, x) * 6.28, d = 30 + 90 * (u / 0.5) * (0.5 + hsh(i, y)); g.fillStyle = `rgba(240,230,214,${0.8 * (1 - u / 0.5)})`;
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 10 * (1 - u / 0.5) + 3, 0, 7); g.fill(); } }
}
function card(g, x, y, w, title, cmd, approved, a, t) {
  g.save(); g.globalAlpha = a;
  g.fillStyle = '#17141f'; rr(g, x, y, w, 380, 18); g.fill(); g.strokeStyle = '#d97757'; g.lineWidth = 4; rr(g, x, y, w, 380, 18); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#d97757'; g.font = font(30, 700, MONO); g.fillText(title, x + 34, y + 46);
  g.fillStyle = '#ffffff'; g.font = font(44, 700, MONO); g.fillText(cmd, x + 54, y + 112);
  g.fillStyle = '#e9e4d8'; g.font = font(34, 600, MONO); g.fillText('Do you want to proceed?', x + 34, y + 186);
  const ok = approved;
  g.fillStyle = ok ? 'rgba(80,220,130,0.22)' : 'rgba(217,119,87,0.16)'; rr(g, x + 24, y + 216, w - 48, 52, 10); g.fill();
  g.fillStyle = ok ? '#62e294' : '#ffb59a'; g.font = font(32, 700, MONO); g.fillText(ok ? '✓ 1. Yes' : '❯ 1. Yes', x + 40, y + 243);
  g.fillStyle = '#8b8798'; g.font = font(28, 500, MONO); g.fillText("  2. Yes, and don't ask again", x + 40, y + 297); g.fillText('  3. No', x + 40, y + 343);
  g.restore();
}
function drawScreen(t) {
  const g = SET.ctx, w = SET.cv.width, h = SET.cv.height, yolo = t >= B.toggle;
  g.fillStyle = '#100e18'; g.fillRect(0, 0, w, h); g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = '#1d1a28'; g.fillRect(0, 0, w, 64);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(30 + i * 30, 32, 9, 0, 7); g.fill(); });
  g.font = font(26, 600, MONO); g.fillStyle = '#d97757'; g.fillText('✻ Claude Code', 130, 33);
  // terminal (left): the log, the cards over it, the status bar
  const TW = 900;
  g.fillStyle = '#14121d'; g.fillRect(0, 64, TW, h - 64);
  const vis = LOG.filter(([t0]) => t >= t0).slice(-14); g.font = font(26, 500, MONO);
  vis.forEach(([, txt, c], i) => { g.fillStyle = c; g.fillText(txt, 30, 182 + i * 46); });
  if (Math.floor(t * 2) % 2) { g.fillStyle = '#f2efe8'; g.fillRect(30, 182 + vis.length * 46 - 14, 13, 28); }
  // prompts: pending ones pile up (newest on top, offset); an approved one flashes green then flies up and out
  const live = PROMPTS.map((p, i) => ({ p, i })).filter(({ p: [t0, ty] }) => t >= t0 && t < ty + 0.45);
  live.forEach(({ p: [t0, ty, title, cmd] }, k) => {
    const u = t - t0, pop = 1 + 0.06 * Math.exp(-u * 9) * Math.sin(u * 30), out = ez(t, ty + 0.15, 0.3);
    const d = live.length - 1 - k, x = 50 + d * 18, y = 330 - d * 40 - 260 * sio(out) + 30 * (1 - ez(t, t0, 0.12));
    g.save(); g.translate(x + 400, y + 190); g.scale(pop, pop); g.translate(-(x + 400), -(y + 190));
    card(g, x, y, 800, title, cmd, t >= ty, (1 - out) * ez(t, t0, 0.08) * (d ? 0.75 : 1), t); g.restore();
  });
  // status bar
  const flash = yolo ? Math.exp(-(t - B.toggle) * 4) : 0;
  g.fillStyle = yolo ? `rgba(255,80,130,${0.2 + 0.55 * flash})` : '#1a1724'; g.fillRect(0, 64, TW, 84);   // mode bar (stylised: top, so it reads over the folders)
  g.font = font(yolo ? 32 : 26, 800, MONO); g.fillStyle = yolo ? '#ffb3c9' : '#6f6a80';
  g.fillText(yolo ? '⏵⏵ bypass permissions on' : '? for shortcuts', 30, 106);
  // Finder (right): Kai's home folder
  const fx = TW + 24, fy = 88, fw = w - fx - 24, fh = h - fy - 24;
  g.fillStyle = '#23202d'; rr(g, fx, fy, fw, fh, 16); g.fill(); g.fillStyle = '#2d2a3a'; rr(g, fx, fy, fw, 62, 16); g.fill(); g.fillRect(fx, fy + 40, fw, 22);
  g.fillStyle = '#d8d4e2'; g.font = font(28, 700); g.fillText('⌂  kai', fx + 28, fy + 32);
  ICONS.forEach((n, i) => folderIcon(g, fx + fw * (i % 2 ? 0.72 : 0.28), fy + 190 + Math.floor(i / 2) * 250, 1.15, n, t));
  if (t > POOF['old-project'] + 0.4) { g.fillStyle = '#7d7890'; g.font = font(28, 600); g.textAlign = 'center'; g.fillText('This folder is empty', fx + fw / 2, fy + fh / 2); g.textAlign = 'left'; }
  SET.tex.needsUpdate = true;
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
    case 'W': case 'WE': { tgt = V(-0.02, 0.5, -0.2); pos = push(V(0.0, 0.46, name === 'WE' ? 3.2 : 3.15), tgt, name === 'WE' ? PUSH.med : PUSH.close); fov = 34; focus = MID; ap = DOF.wide; break; }
    case 'W2': tgt = V(-0.08, 0.42, -0.3); pos = push(V(-0.22, 0.7, 3.5), tgt, PUSH.med); fov = 34; focus = CFACE; ap = DOF.wide; break;
    case 'KC': { const H = headMid(i); tgt = H.clone().add(V(0, 0.02, 0)); pos = push(H.clone().add(V(-0.3, -0.22, 1.9)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KP': { const H = headMid(i); tgt = H.clone().add(V(-0.08, 0.06, -0.2)); pos = push(H.clone().add(V(-0.18, -0.14, 1.65)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KM': { const H = headMid(i); tgt = H.clone().add(V(0.14, -0.2, -0.2)); pos = push(H.clone().add(V(-0.3, -0.18, 2.9)), tgt, PUSH.med); fov = 32; focus = H; ap = DOF.med * 0.6; break; }
    case 'KS': { const H = headMid(i); tgt = H.clone().add(V(0, -0.1, 0)); pos = push(H.clone().add(V(-0.15, -0.2, 2.0)), tgt, PUSH.med); fov = 32; focus = H; ap = DOF.med; break; }
    case 'CM': tgt = CFACE.clone().add(V(0.2, 0.06, 0)); pos = push(CFACE.clone().add(V(0.14, -0.12, 3.0)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med; break;
    case 'CW': tgt = V(-0.5, 0.34, -0.3); pos = push(V(-0.42, 0.55, 3.1), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.6; break;
    case 'CC': tgt = CFACE.clone().add(V(0, 0.02, 0)); pos = push(CFACE.clone().add(V(0.16, -0.1, 2.1)), tgt, PUSH.close * 0.5); fov = 30; focus = CFACE; ap = DOF.close; break;
    case 'CS': tgt = CFACE.clone().add(V(-0.12, 0.5, -0.9)); pos = push(CFACE.clone().add(V(0.6, 0.12, 2.9)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.6; break;
    case 'SCR': { tgt = SET.scrW(0.19, 0.32); pos = push(tgt.clone().add(V(0.04, 0.3, 3.3)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.close; break; }
    case 'SCR2': { tgt = SET.scrW(0.28, 0.45); pos = push(tgt.clone().add(V(0.1, 0.5, 4.2)), tgt, PUSH.med); fov = 30; focus = tgt; ap = DOF.med; break; }
  }
  pos.add(dr); tgt.y += lift(i);
  return { pos, tgt, fov, roll, focus: pos.distanceTo(focus), aperture: Number(Q.get('ap') || ap), shot: name, i };
}

// ---------------------------------------------------------------- captions (small white sans, centred) + the YOLO end card
const CAP = VO_LINES.map((l, i) => { const nx = VO_LINES[i + 1];
  return { txt: l.text, s: l.s - 0.04, e: nx ? Math.min(nx.s - 0.04, l.e + 0.9) : Math.min(B.card, l.e + 0.9) }; });
function captions(g, t, s) {
  if (Q.has('nocap')) return;
  const H = g.canvas.height, Wd = g.canvas.width;
  if (t >= B.card) {                                   // end card: one keyword, after the button (not spoken)
    const a = ez(t, B.card, 0.25), pop = 1 + 0.08 * Math.exp(-(t - B.card) * 8) * Math.sin((t - B.card) * 24);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(Wd / 2, H * 0.27); g.scale(pop, pop);
    g.font = `600 ${Math.round(H * 0.024)}px Inter, "Helvetica Neue", Arial, sans-serif`; g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = H * 0.01;
    g.fillText('Comment', 0, -H * 0.055);
    const fs = Math.round(H * 0.06); g.font = `800 ${fs}px Menlo, "SF Mono", monospace`; const tw = g.measureText('YOLO').width;
    g.shadowBlur = 0; g.fillStyle = '#d97757'; rr(g, -tw / 2 - fs * 0.45, -fs * 0.7, tw + fs * 0.9, fs * 1.4, fs * 0.3); g.fill();
    g.fillStyle = '#ffffff'; g.fillText('YOLO', 0, fs * 0.04);
    g.font = `600 ${Math.round(H * 0.019)}px Inter, "Helvetica Neue", Arial, sans-serif`; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = H * 0.01;
    g.fillText('for settings that block rm -rf', 0, H * 0.065);
    g.restore(); return;
  }
  if (t < 2.6) {                                       // hook title (first 2.6 s): promises the payoff
    const a = 1 - ez(t, 2.35, 0.25), fs = Math.round(H * 0.034);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`;
    const l1 = 'POV: you finally turn on', l2 = 'YOLO mode', w2 = g.measureText(l2).width, y0 = H * 0.17;
    g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = fs * 0.4; g.fillStyle = '#ffffff'; g.fillText(l1, Wd / 2, y0);
    g.shadowBlur = 0; g.fillStyle = '#d97757'; rr(g, Wd / 2 - w2 / 2 - fs * 0.35, y0 + fs * 0.62, w2 + fs * 0.7, fs * 1.3, fs * 0.25); g.fill();
    g.fillStyle = '#ffffff'; g.fillText(l2, Wd / 2, y0 + fs * 1.29); g.restore();
  }
  const c = CAP.find(c => t >= c.s && t < c.e); if (!c) return;
  const fs = Math.round(H * 0.025), y = H * (s && /^S/.test(s.shot) ? 0.77 : 0.36);
  g.save(); g.font = `600 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = c.txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText(tr).width > Wd * 0.62 && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur);
  const pw = Math.max(...lines.map(l => g.measureText(l).width)) + fs * 1.1, ph = lines.length * fs * 1.25 + fs * 0.6;   // soft plate: captions stay readable over the terminal text
  g.fillStyle = 'rgba(10,8,18,0.45)'; rr(g, Wd / 2 - pw / 2, y - ph / 2, pw, ph, fs * 0.4); g.fill();
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
  const k = kai(t, SHOTS[i]); clawd(t); drawFolders(t); drawSparks(t);
  if (Q.has('hide')) { K.holder.visible = false; CL.group.visible = false; }
  const s = camFor(t, i); s.k = k; return s;
}
const CUES = () => [
  ...PROMPTS.map(([t0]) => ({ t: t0, kind: 'prompt' })), ...YES.map(t => ({ t: t - F(1), kind: 'enter' })),
  ...HOPS.map(([, b, h]) => ({ t: b, kind: h >= 0.05 ? 'land_big' : h <= 0.02 ? 'tap' : 'land' })),
  { t: B.toggle, kind: 'toggle' }, { t: B.rm, kind: 'rm' },
  ...Object.entries(POOF).map(([n, t]) => ({ t, kind: SET.folders[n] ? 'poof' : 'poof_ui' })),
  ...BURSTS.map(([t]) => ({ t, kind: 'sparkle' })), { t: B.wait - F(1), kind: 'snap' }, { t: STAND[0], kind: 'stand' },
  { t: B.end, kind: 'slump' }, { t: B.card, kind: 'card' }];
window.__cues = () => CUES().sort((a, b) => a.t - b.t).map(c => ({ ...c, t: +c.t.toFixed(3) }));
window.__dbg = { topsAt, CAP, CAP_CLEAR, prep, CUTS, SHOTS, B, S_, K, CL, T_END, KHEAD, CFACE, LN, shotIdx, camera: S.camera, WORK: [], STATE_T: [], POOF, PROMPTS };
S.run({ prep, T_END, overlay: (t, s) => captions(S.g2, t, s) });
