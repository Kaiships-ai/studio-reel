// reel.js · reel61 "force push" (ksa-reel-skit). Kai force pushed to main to fix one README typo; Clawd calmly lists the damage
// (11 people, 300 commits, standup at 9 a.m., everyone pulled, the team is typing); Kai gives up; Clawd had pushed a backup branch
// first ("You said, trust me. I didn't."), restores main… and refuses to touch the typo. Fact: `git push --force` rewrites the shared branch.
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
for (const k of ['body', 'limb']) CL.materials[k].color.set('#f0a03a');
// r2: the branch stands clear of Clawd (x -0.85), its name tag ×2.2 and above his head (legible ≥ 40 px in CK); its green light only reaches the glyph
SET.branch.g.position.x = -0.95; { const tag = SET.branch.g.children[SET.branch.g.children.length - 1]; tag.scale.setScalar(2.2); tag.position.set(0.4, 0.56, 0.02); }
SET.branchGlow.position.set(-0.93, 0.3, 0.12); SET.branchGlow.distance = 0.15;   // teal night grade + red alarm: albedo compensated so the toy reads Claude orange

// ---------------------------------------------------------------- voice: lines + words (src/vo.js), loudness (src/vo_env.js)
const LN = Object.fromEntries(VO_LINES.map(l => [l.id, l]));
const norm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
const W = (lid, w, n = 1) => { let c = 0; for (const x of VO_WORDS) if (x.line === lid && norm(x.w) === norm(w) && ++c === n) { if (x.est) console.warn('LOG est word keyed', lid, w); return x.s; } console.warn('LOG no word', lid, w); return LN[lid].s; };
const KW = VO_WORDS.filter(x => x.who === 'kai');
const s_ = (id) => LN[id].s, e_ = (id) => LN[id].e;
const envAt = (E, t) => { const f = t * 30, i = Math.floor(f), k = f - i; return lerp(E[Math.min(E.length - 1, Math.max(0, i))] ?? 0, E[Math.min(E.length - 1, i + 1)] ?? 0, k); };
const ez = (t, t0, d) => ss(seg(t, t0, t0 + d));                                    // 0 → 1 ease over d seconds
const win = (t, a, b, din = 0.15, dout = 0.2) => ez(t, a - din, din) * (1 - ez(t, b, dout));
const pulse = (t, t0, a, d = 0.22) => a * (t < t0 ? 0 : t < t0 + d * 0.3 ? ss((t - t0) / (d * 0.3)) : 1 - ss(clamp((t - t0 - d * 0.3) / (d * 0.7))));

// ---------------------------------------------------------------- beats (all keyed to measured words; l01 "pushed" is est → never used)
const B = {
  force1: W('l01', 'force'), main1: W('l01', 'main'), how: W('l02', 'How'), very: W('l03', 'Very'), dash: W('l03', 'Dash'), force3: W('l03', 'force'),
  main4: W('l04', 'main'), everyone: W('l05', "Everyone's"), week: W('l05', 'week'), eleven6: W('l06', 'Eleven'), three: W('l06', 'Three'), commits: W('l06', 'commits'),
  undo: W('l07', 'undo'), yes: W('l08', 'Yes'), nobody8: W('l08', 'nobody'), okay: W('l09', 'Okay'), pulled9: W('l09', 'pulled'),
  nine: W('l10', 'nine'), all11: W('l11', 'all'), eleven12: W('l12', 'eleven'), version: W('l12', 'version'),
  why: W('l13', 'Why'), push13: W('l13', 'push'), typo: W('l14', 'typo'), readme: W('l14', 'README'), sick: W('l15', 'sick'),
  typing: W('l16', 'typing'), eleven16: W('l16', 'eleven'), over: W('l17', 'over'), branch: W('l18', 'branch'), first: W('l18', 'first'),
  what: W('l19', 'what'), said: W('l20', 'said'), trust: W('l20', 'trust'), didnt: W('l20', "didn't"),
  clawd21: W('l21', 'Clawd'), saved: W('l21', 'saved'), job: W('l21', 'job'), restoring: W('l22', 'Restoring'), now22: W('l22', 'now'),
  fix: W('l23', 'fix'), typo23: W('l23', 'typo'), not: W('l24', 'Not'), touching: W('l24', 'touching'),
};
const T_END = Math.round((VO_END + 2.7) * 30) / 30;                                 // + the frozen face and the GIT end card after the button
B.freeze = e_('l24') + 0.08;
B.zscr = s_('l24') + 1.1; B.card = B.zscr + 1.2;                                     // r2: the punchline holds on Clawd ≥ 1.0 s, then the typo, the freeze, the card
B.wipe = e_('l06') + 0.15;                                                          // "300 commits" struck after the word's tail (r2)
B.pop = B.branch;                                                                   // r2: the branch springs up on the word "branch"
B.restored = e_('l22');                                                             // r2: restored as the line ends, held ≥ 1 s
const TYPE = []; for (let t0 = B.restoring; t0 < B.now22 + 0.3; t0 += 0.24) TYPE.push(t0);   // l22 typing hop loop

// ---------------------------------------------------------------- blocking (metres): Kai on the mouse (right), Clawd on the keys (left)
const KYAW = -0.32;
const HIP = V(0.002, 0.215, 0.0).applyAxisAngle(V(0, 1, 0), KYAW);
const KP = V(SEAT.x - HIP.x, DECK, SEAT.z - HIP.z);
K.holder.position.copy(KP); K.holder.rotation.y = KYAW;
K.pose([['sit', 0.5, 1]]); S.scene.updateMatrixWorld(true);
const KHEAD = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0));
// panic arms while seated: the arm bones of the 'afraid' clip slerped over the sit pose (reel58)
const ARMB = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
const AFR_T = Number(Q.get('afr') ?? 0.9); K.pose([['afraid', AFR_T, 1]]); const ARMQ = ARMB.map(n => K.bones[n].quaternion.clone()); K.pose([['sit', 0.5, 1]]);
const armsUp = (w) => { if (w < 1e-3) return; ARMB.forEach((n, i) => K.bones[n].quaternion.slerp(ARMQ[i], Math.min(1, w))); };
const KFILL_I = Number(Q.get('kfill') ?? 6), kfill = new THREE.SpotLight('#ffdcc0', KFILL_I, 3, 0.32, 0.7, 2);
kfill.position.copy(KHEAD).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(KHEAD).add(V(0, -0.12, 0)); S.scene.add(kfill, kfill.target);
const CP = V(-0.36, DECK, 0.06), CYAW = 0.38;
const CFACE = CP.clone().add(V(0, 7 * CL_S, 0));
const MID = KHEAD.clone().lerp(CFACE, 0.5);
const BRP = SET.branch.g.position.clone();

// ---------------------------------------------------------------- shots: hard cut on each speaker change + screen inserts
const fr = (x) => Math.round(x * 30) / 30;
const SHOTLIST = [[0, 'KH'], [B.force1 - 0.1, 'SCRH'], [s_('l02'), 'CC'], [s_('l03'), 'KC'], [B.dash - 0.08, 'SCRF'], [s_('l04'), 'CM'], [s_('l05'), 'KP'],
  [s_('l06'), 'CS'], [B.three - 0.1, 'SCRT'], [e_('l06') + 0.85, 'KC'], [s_('l08'), 'CC'], [B.nobody8 - 0.1, 'SCRN'], [s_('l09'), 'KC'],
  [s_('l10'), 'CO'], [B.nine - 0.1, 'SCRK'], [s_('l11'), 'KH'], [s_('l12'), 'CM'], [B.eleven12 - 0.08, 'SCRA'], [s_('l13'), 'KC'],
  [s_('l14'), 'CC'], [B.typo - 0.1, 'SCRR'], [s_('l15'), 'KP'], [s_('l16'), 'CS'], [B.typing - 0.08, 'SCRC'], [s_('l17'), 'KC'], [B.over + 0.4, 'W2'],
  [s_('l18'), 'CC'], [B.branch - 0.1, 'CK'], [s_('l19'), 'KC'], [s_('l20'), 'CC'], [B.trust - 0.08, 'SCRB'], [s_('l21'), 'KC'], [B.saved - 0.1, 'W2'],
  [s_('l22'), 'CK'], [B.now22 - 0.1, 'SCRM'], [B.restored + 1.1, 'KC'], [s_('l24'), 'CC'], [B.zscr, 'SCRZ'], [B.zscr + 0.6, 'KF'], [B.card, 'WE']];
// r2: a speaker shot that a screen insert would cut within HOLD_MIN is dropped; the insert starts on the line instead (no 3–6 frame flashes)
for (let i = SHOTLIST.length - 2; i >= 0; i--) { const [t, n] = SHOTLIST[i], [t2, n2] = SHOTLIST[i + 1];
  if (!/^S/.test(n) && /^SCR/.test(n2) && t2 - t < HOLD_MIN + 0.01) { SHOTLIST[i + 1][0] = t; SHOTLIST.splice(i, 1); } }
const CUTS = [...SHOTLIST.map(([t]) => t ? fr(t - 0.03) : 0), T_END], SHOTS = SHOTLIST.map(([, n]) => n);
const shotIdx = (t) => { let i = 0; while (i < CUTS.length - 2 && t >= CUTS[i + 1]) i++; return i; };

// ---------------------------------------------------------------- Kai
const BL = (a, b, every, seed) => { const o = []; for (let t = a + 0.6, i = 0; t < b; i++) { o.push(Math.round(t * 30) / 30); t += every * (0.7 + 0.6 * hsh(i, seed)); } return o; };
const FROZEN = [[e_('l06') + 0.2, s_('l07')], [B.over, s_('l18')], [B.touching, T_END]];      // no blinks while he is frozen
const KBLINK = BL(0, T_END, 3.0, 3).filter(t => !FROZEN.some(([a, b]) => t > a - 0.2 && t < b)), CBLINK = BL(0.4, T_END, 2.6, 7);
function kai(t, shot) {
  const tf = Math.min(t, B.freeze + 0.25);                                            // the button: Kai freezes (pose holds, no breath)
  const base = 0.25 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * tf / 6.5));
  K.pose([['sit', base, 1]]);
  const panic = Math.max(win(tf, 0, s_('l02') - 0.2, 0.01, 0.35), win(tf, s_('l11') - 0.12, e_('l12') + 0.4, 0.12, 0.35));
  armsUp(panic);
  K.holder.position.copy(KP);
  const L = { clawd: -0.42, screen: -0.78, cam: 0.05, away: 0.25 };
  const yawK = TR(tf, [[0, L.cam], [s_('l02') - 0.2, L.clawd, 2.6, 7], [B.very - 0.1, L.away, 2.6, 7], [s_('l04') - 0.1, L.clawd, 2.6, 7],
    [B.eleven6 + 0.15, L.screen, 2.6, 7], [e_('l06') + 0.2, L.cam, 2.6, 7], [s_('l07') - 0.1, L.clawd, 2.6, 7], [B.nine + 0.1, L.screen, 3.2, 8],
    [s_('l11') - 0.05, L.clawd, 2.6, 7], [B.eleven12 + 0.15, L.screen, 2.6, 7], [s_('l13') - 0.1, L.cam, 2.6, 7], [s_('l15') - 0.15, L.clawd, 2.6, 7],
    [B.typing + 0.1, L.screen, 2.6, 7], [s_('l17') - 0.1, L.cam, 2.4, 7], [s_('l18'), L.clawd, 2.4, 7], [B.trust + 0.1, L.screen, 3, 8],
    [s_('l21') - 0.1, L.clawd, 2.6, 7], [B.touching, L.cam, 5, 9]]);
  const pitchK = TR(tf, [[0, -0.12], [B.very - 0.1, -0.2, 2.6, 7], [s_('l05') - 0.1, -0.24, 2.6, 7], [e_('l05') + 0.2, -0.05, 2.6, 7], [e_('l06') + 0.2, 0.02, 2.6, 7],
    [B.okay, 0.14, 2.0, 7], [e_('l09') + 0.2, -0.02, 2.4, 7], [s_('l11'), 0.04, 2.6, 7], [s_('l13'), 0.0, 2.6, 7], [s_('l15') - 0.15, -0.06, 2.6, 7],
    [s_('l17') - 0.1, -0.3, 2.0, 7], [B.what - F(1), 0.08, 5, 9], [s_('l21'), 0.0, 2.4, 7], [s_('l23'), 0.04, 2.4, 7], [B.touching, 0.02, 3, 8]]);
  // nods on stressed words (1 frame before the sound); an exasperated head shake on "Why"; a tremble while scared
  const NOD = [[B.dash, 0.08], [B.week, 0.08], [B.undo, 0.08], [B.push13, 0.1], [B.sick, 0.06], [B.saved, 0.12], [B.fix, 0.1]];
  let nod = 0; for (const [t0, a] of NOD) nod += ring(tf, t0 - F(1), { f: 2.6, d: 6, a }) * (tf > t0 - F(1) ? 1 : 0) * Math.sin(Math.min(1, (tf - t0 + F(1)) * 12) * Math.PI / 2);
  let shake = 0; for (const [t0, a] of [[B.why, 0.1]]) if (tf > t0 - F(1)) shake += a * Math.exp(-(tf - t0) * 4) * Math.sin((tf - t0 + F(1)) * 2 * Math.PI * 4.0);
  const scared = Math.max(win(tf, 0, s_('l02'), 0.01, 0.3), win(tf, s_('l11') - 0.1, e_('l12') + 0.3, 0.2, 0.3)), tremble = 0.012 * scared * Math.sin(tf * 2 * Math.PI * 9);
  const flinch = tf > B.force1 - F(2) ? ring(tf, B.force1 - F(2), { f: 2.2, d: 5, a: 1 }) : 0;
  const snap = tf > B.what - F(1) ? ring(tf, B.what - F(1), { f: 2.2, d: 5, a: 1 }) : 0;
  const gulp = pulse(tf, e_('l06') + 0.75, 1, 0.35);
  const lean = TR(tf, [[0, 0.08], [s_('l03'), 0.04, 2.4, 7], [B.okay, -0.16, 1.6, 7], [e_('l09') + 0.3, -0.06, 2, 7], [s_('l11') - 0.1, 0.1, 2.6, 7],
    [s_('l13'), 0.04, 2.6, 7], [s_('l15') - 0.1, 0.12, 2.6, 7], [e_('l15') + 0.3, 0.04, 2.4, 7], [B.over - 0.1, 0.18, 1.4, 7], [B.what - F(1), 0.0, 5, 9],
    [B.clawd21 + 0.3, 0.1, 2.2, 7], [e_('l21') + 0.4, 0.02, 2, 7], [s_('l23') - 0.1, -0.12, 2, 7], [B.touching, -0.02, 3, 8]]);
  const tilt = TR(tf, [[0, 0], [s_('l07') - 0.1, 0.1, 2, 7], [e_('l07') + 0.3, 0, 1.6, 7], [B.clawd21, 0.12, 1.8, 7], [e_('l21') + 0.3, 0.03, 1.6, 7]]);
  const shrug = pulse(tf, B.very - 0.1, 1, 0.7) + 0.6 * pulse(tf, B.dash - 0.05, 1, 0.5);
  K.turn('Spine1', V(1, 0, 0), lean - 0.08 * flinch - 0.06 * snap); K.turn('Spine2', V(1, 0, 0), 0.05 * gulp - 0.04 * shrug);
  K.turn('LeftShoulder', V(0, 0, 1), 0.12 * shrug); K.turn('RightShoulder', V(0, 0, 1), -0.12 * shrug);
  K.turn('Neck', V(0, 1, 0), (yawK + shake) * 0.35); K.turn('Head', V(0, 1, 0), (yawK + shake + tremble) * 0.65);
  K.turn('Head', V(1, 0, 0), pitchK + nod - 0.1 * flinch - 0.12 * snap + 0.1 * gulp); K.turn('Head', V(0, 0, 1), tilt);
  K.root.updateMatrixWorld(true);
  kfill.position.copy(KHEAD).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(KHEAD).add(V(0, -0.12, 0)); kfill.target.updateMatrixWorld(); kfill.intensity = KFILL_I;
  const m = voMouth(t, KW, ENV_K), bl = blinks(t, KBLINK); K.talk.set({ ...m, blink: bl });
  return { yawK, m, bl, standing: false };
}

// ---------------------------------------------------------------- Clawd: talk bob, hops that land, arms, eye shapes
const S_ = { pos: V(), face: V(), sq: 1, body: 1, expr: 'neutral', talk: 0, scale: CL_S, flame: 1, arm: 0 };
const EYE = { neutral: [1, 1, 0, 0], happy: [1.05, 0.78, 0.45, 0], wide: [1.12, 1.25, 0.1, 0], squint: [1.05, 0.5, 0.2, 0], worried: [1, 0.92, 0, 0.22] };
// hops: [take-off, landing, height m]
const HOPS = [[s_('l02') - 0.02, B.how - 0.1, 0.05],                                  // the gasp: startle hop, lands before "How"
  [B.job + 0.36, B.job + 0.6, 0.06], [B.job + 0.66, B.job + 0.86, 0.035],             // "You saved my job." → 2 happy hops after the line
  ...TYPE.map(t0 => [t0, t0 + 0.16, 0.012])];                                          // "Restoring main now." typing hops
const EMPH = [[B.how, 0.05], [B.main4, -0.06], [B.eleven6, 0.05], [B.three, 0.05], [B.yes, -0.05], [B.eleven12, 0.04], [B.typo, 0.05], [B.eleven16, 0.04],
  [B.branch, 0.05], [B.said, 0.05], [B.not, -0.06]];
function clawd(t) {
  const talking = VO_LINES.some(l => l.who !== 'kai' && t > l.s - 0.05 && t < l.e + 0.05);
  const env = talking ? clamp((envAt(ENV_C, t) + envAt(ENV_C, t + F(1)) + envAt(ENV_C, t + F(2))) / 3 * 1.3) : 0;
  let y = 0, hsq = 0;
  for (const [a, b, h] of HOPS) if (t > a - 0.2 && t < b + 0.5) { const o = hop(t, a, b, h); y += o.y; hsq += o.sy; }
  hsq = Math.max(hsq, SQ.land - 1);
  let body = 1 + 0.008 * Math.sin(t * 2 * Math.PI / 3.2);
  for (const [t0, a] of EMPH) body += pulse(t, t0 - F(2), a, 0.3);
  const startle = pulse(t, s_('l11') + F(2), -0.06, 0.25) + pulse(t, B.what + F(2), -0.06, 0.25);   // Kai's yells: small flinches
  const sorry = 0.05 * win(t, s_('l17'), s_('l18') - 0.1, 0.2, 0.3);                               // deflates while Kai gives up
  const sq = body + hsq + startle - sorry + 0.045 * env;
  // yaw: toward Kai; a small turn to the screen when he points at it; turns away from Kai on "Not touching it."
  const toScr = Math.max(win(t, B.eleven6, e_('l06') + 0.2, 0.2, 0.3), win(t, B.nine - 0.1, e_('l10') + 0.2, 0.2, 0.3), win(t, B.typing, e_('l16') + 0.2, 0.2, 0.3));
  const away = win(t, B.not - 0.05, T_END + 1, 0.15, 0.1);
  const yaw = CYAW - 0.35 * toScr - 0.95 * away;
  let bow = 0; for (const [t0, a] of [[B.three, 0.1], [B.yes, 0.12], [B.nine, 0.14], [B.version, 0.12], [B.readme, 0.08], [B.didnt, 0.1]]) bow += pulse(t, t0 - 0.1, a, 0.6);
  const roll = 0.12 * win(t, s_('l04'), e_('l04') + 0.3, 0.2, 0.3) - 0.1 * win(t, B.typo - 0.1, e_('l14') + 0.3, 0.2, 0.3) + 0.1 * win(t, B.branch - 0.1, e_('l18') + 0.3, 0.2, 0.3)
    + 0.1 * win(t, B.said - 0.1, e_('l20') + 0.25, 0.2, 0.3);
  // arms: one points at the screen (l06, l16); one up proud on "first" and while restoring; both up after "saved my job"; folded in on "Not"
  const cheer = win(t, B.job + 0.3, s_('l22') - 0.05, 0.12, 0.3);
  const proud = Math.max(win(t, B.first - 0.05, e_('l18') + 0.5, 0.15, 0.3), win(t, s_('l22'), e_('l22') + 0.3, 0.15, 0.3));
  const point = Math.max(win(t, B.eleven6, e_('l06') + 0.2, 0.12, 0.3), win(t, B.typing, e_('l16') + 0.2, 0.12, 0.3));
  const fold = win(t, B.not - 0.05, T_END + 1, 0.15, 0.1);
  const inW = (a, b) => t >= a && t < b;
  const expr = inW(s_('l02') - 0.05, e_('l02') + 0.3) || inW(B.what + F(2), B.what + 0.45) ? 'wide'
    : inW(B.typo - 0.1, e_('l14') + 0.3) || inW(B.not - 0.1, T_END) ? 'squint'
    : inW(s_('l16') - 0.1, s_('l18') - 0.2) ? 'worried'
    : inW(s_('l18') - 0.1, e_('l18') + 0.6) || inW(B.said - 0.1, e_('l22') + 0.4) ? 'happy' : 'neutral';
  const lookX = TR(t, [[0, 0.5], [B.eleven6, -0.4, 3, 12], [e_('l06') + 0.2, 0.5, 3, 12], [B.nine - 0.05, -0.4, 4, 12], [e_('l10') + 0.1, 0.5, 3, 12],
    [B.typing, -0.4, 3, 12], [e_('l16') + 0.2, 0.5, 3, 12], [B.not, -0.6, 4, 12]]);
  CL.group.position.copy(CP); CL.group.rotation.set(0, yaw, 0);
  CL.update(t, { action: 'idle', blink: false, look: [lookX, 0] });
  const P = CL.parts;
  P.torso.rotation.set(bow, 0, roll);
  P.bounce.position.y = y / CL_S;
  P.bounce.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  P.arms.forEach(a => { a.rotation.set(0, 0, 0); a.position.y = 3.0; });
  const [Lr, R] = P.arms, upL = Math.max(cheer, point);
  Lr.position.y = 3.0 + 2.6 * upL + 0.8 * fold; Lr.rotation.z = -0.9 * upL - 0.35 * fold; Lr.rotation.y = 0.5 * cheer - 0.6 * point + 0.9 * fold;
  const upR = Math.max(cheer, proud);
  R.position.y = 3.0 + 2.6 * upR + 0.8 * fold; R.rotation.z = 0.9 * upR + 0.35 * fold; R.rotation.y = -0.5 * upR - 0.9 * fold;
  const bl = blinks(t, CBLINK), ex = EYE[expr];
  P.eyes.forEach((e, i) => { const sxn = i ? 1 : -1;
    e.scale.set(ex[0], Math.max(0.07, ex[1] * (1 - 0.93 * bl)), 1); e.position.y = 4.0 + ex[2] + 0.9 * bl * ex[1];
    e.position.x = sxn * 3.5 + lookX * 0.5; e.rotation.z = -sxn * ex[3]; });
  CL.group.updateMatrixWorld(true);
  let g = 0; for (const [, b] of HOPS) if (t > b) g = Math.max(g, Math.exp(-(t - b) * 14) * (t - b < 0.4 ? 1 : 0));
  SET.keyGlow.position.copy(CP).add(V(0, 0.03, 0.05)); SET.keyGlow.intensity = 1.6 * g;
  S_.pos.copy(CL.group.position); S_.face.copy(P.torso.localToWorld(V(0, 5, 4.6))); S_.sq = sq; S_.body = body; S_.expr = expr; S_.talk = env; S_.yaw = yaw; S_.blink = bl; S_.arm = upR; S_.flame = 1; S_.y = y;
  return S_;
}

// ---------------------------------------------------------------- props: the backup branch glyph, the alarm light, sparks
const sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 9, 3.2) }), sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sparkM, 14 * 4);
sparks.frustumCulled = false; S.scene.add(sparks); const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion();
const alarmOn = (t) => (t < B.okay) || (t >= B.nine && t < B.pop);                  // the push is live / the fall
function props(t) {
  const n = t < B.pop - F(1) ? 0 : clamp(step(t, B.pop - F(1), 3.4, 7), 0, 1.3);
  SET.branch.g.scale.setScalar(Math.max(1e-4, n)); SET.branch.g.position.y = DECK + 0.1 * pulse(t, B.pop - F(1), 1, 0.45);
  SET.branch.g.rotation.y = 0.8 * (1 - ez(t, B.pop, 0.45));
  SET.branchGlow.intensity = 1.2 * clamp(n);
  const hi = win(t, s_('l11'), s_('l17'), 0.3, 0.3), lvl = alarmOn(t) ? (0.35 + 0.65 * hi) * (0.55 + 0.45 * Math.sin(t * 2 * Math.PI * (0.9 + 0.5 * hi))) * (1 - ez(t, B.okay - 0.3, 0.3) * (t < B.nine ? 1 : 0)) : 0;
  SET.alarm.intensity = 3.2 * lvl; SET.alarmF.intensity = 1.3 * lvl;
  CL.materials.eye.clearcoat = lvl > 0.01 ? 0 : 1; CL.materials.eye.roughness = lvl > 0.01 ? 0.6 : 0.18;   // r2: no red glint in his eyes
  SET.lamp.intensity = 1.3 + 0.6 * ez(t, B.pop, 0.6);
}
const BURSTS = [[B.pop + 0.02, 3, 1, 'branch'], [B.job + 0.68, 2, 0.8, 'clawd']];
function drawSparks(t) {
  let n = 0, glow = 0;
  for (const [t0, seed, k, at] of BURSTS) {
    const u = t - t0; if (u < 0 || u > 0.6) continue;
    const o = at === 'branch' ? BRP.clone().add(V(0.05, 0.3, 0)) : CL.parts.torso.localToWorld(V(0, 9.5, 0));
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

// ---------------------------------------------------------------- the laptop screen (centre column: reads in a 9:16 insert)
const font = (px, w = 600, fam = 'Inter, "Helvetica Neue", Arial, sans-serif') => `${w} ${px}px ${fam}`;
const MONO = 'Menlo, "SF Mono", monospace';
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const RED = '#ff4d4d', GREEN = '#3fd27a', AMBER = '#f0b429', INK = '#e6edf3', DIM = '#7d8590';
const X0 = 420, CW = 760, CX = X0 + CW / 2;
const TEAM = ['A', 'M', 'J', 'S', 'T', 'R', 'L', 'P', 'N', 'K', 'D'], TCOL = ['#4493f8', '#a371f7', '#3fb950', '#d29922', '#db61a2', '#39c5cf', '#f78166', '#8b949e', '#56d364', '#e3b341', '#79c0ff'];
function avatar(g, x, y, r, i, red) {
  g.fillStyle = red ? RED : TCOL[i]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = '#0d1117'; g.font = font(Math.round(r * 1.05), 800); g.textAlign = 'center'; g.fillText(TEAM[i], x, y + 2);
}
function panel(g, title, sub) {
  g.fillStyle = '#161b22'; rr(g, X0, 90, CW, 700, 18); g.fill(); g.strokeStyle = '#30363d'; g.lineWidth = 3; g.stroke();
  g.textAlign = 'left'; g.fillStyle = INK; g.font = font(34, 700, MONO); g.fillText(title, X0 + 34, 146);
  if (sub) { g.fillStyle = DIM; g.font = font(26, 500); g.fillText(sub, X0 + 34 + g.measureText(title).width * 1.25 + 20, 148); }
  g.fillStyle = '#30363d'; g.fillRect(X0, 190, CW, 2);
}
function popIn(g, t, t0, x, y, fn, k0 = 0.4) {
  if (t < t0) return; const k = 1 + k0 * Math.exp(-(t - t0) * 9) * Math.cos((t - t0) * 20), a = ez(t, t0, 0.08);
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(k, k); fn(); g.restore();
}
function drawScreen(t) {
  const g = SET.ctx, w = SET.cv.width, h = SET.cv.height;
  g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h); g.textBaseline = 'middle'; g.textAlign = 'left';
  if (t < B.eleven6 - 0.15) {                                                         // 1 · the terminal: the push
    panel(g, '~/team-app', '— zsh');
    g.font = font(54, 700, MONO); g.fillStyle = GREEN; g.fillText('$', X0 + 40, 270); g.fillStyle = INK; g.fillText('git push', X0 + 90, 270);
    const fk = 1 + 0.35 * (pulse(t, B.dash - F(1), 1, 0.5) + pulse(t, B.force3 - F(1), 1, 0.5)), fa = 0.25 + 0.75 * Math.max(pulse(t, B.dash - F(1), 1, 0.7), pulse(t, B.force3 - F(1), 1, 0.7));
    g.save(); g.translate(X0 + 90 + g.measureText('git push ').width + 120, 270); g.scale(fk, fk);
    g.fillStyle = `rgba(255,60,60,${fa})`; rr(g, -128, -38, 256, 76, 10); g.fill(); g.fillStyle = '#ffd0d0'; g.textAlign = 'center'; g.fillText('--force', 0, 2); g.restore(); g.textAlign = 'left';
    g.fillStyle = INK; g.font = font(54, 700, MONO); g.fillText('origin main', X0 + 90, 350);
    g.fillStyle = DIM; g.font = font(30, 500, MONO); g.fillText('Writing objects: done.', X0 + 40, 450);
    const k = 0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 1.4);
    g.fillStyle = `rgba(255,60,60,${0.18 + 0.22 * k})`; rr(g, X0 + 24, 505, CW - 48, 150, 12); g.fill();
    g.fillStyle = RED; g.font = font(46, 800, MONO); g.fillText('+ main', X0 + 48, 548); g.fillText('(forced update)', X0 + 48, 612);
  } else if (t < B.nine - 0.1) {                                                       // 2 · the team on main: 11 people, 300 commits → wiped; pulled since?
    panel(g, 'main', '· team-app');
    popIn(g, t, B.eleven6 - F(1), CX, 290, () => { g.textAlign = 'center'; for (let i = 0; i < 11; i++) avatar(g, -300 + i * 60, -40, 26, i, t >= B.wipe + 0.04 * i);
      g.fillStyle = INK; g.font = font(64, 800); g.fillText('11 people', 0, 40); }, 0.3);
    popIn(g, t, B.three - F(1), CX, 470, () => { g.textAlign = 'center'; g.fillStyle = INK; g.font = font(64, 800, MONO); g.fillText('300 commits', 0, 0); }, 0.35);
    if (t >= B.wipe) { const k = ez(t, B.wipe, 0.18); g.strokeStyle = RED; g.lineWidth = 10; g.beginPath(); g.moveTo(CX - 250, 470); g.lineTo(CX - 250 + 500 * k, 470); g.stroke();
      popIn(g, t, B.wipe + 0.15, CX, 560, () => { g.rotate(-0.06); g.strokeStyle = RED; g.lineWidth = 6; rr(g, -230, -42, 460, 84, 10); g.stroke(); g.fillStyle = RED; g.textAlign = 'center'; g.font = font(50, 900); g.fillText('OVERWRITTEN', 0, 2); }, 0.6); }
    if (t >= B.nobody8 - F(1)) { const ok = t >= B.pulled9 + 0.45;
      g.fillStyle = ok ? 'rgba(63,210,122,0.15)' : 'rgba(240,180,41,0.15)'; rr(g, X0 + 40, 640, CW - 80, 110, 14); g.fill();
      g.textAlign = 'center'; g.fillStyle = ok ? GREEN : AMBER; g.font = font(48, 800); g.fillText(ok ? 'pulled since: nobody ✓' : 'pulled since: nobody?', CX, 695); }
  } else if (t < B.eleven12 - 0.1) {                                                   // 3 · 9 AM standup
    panel(g, 'Calendar', '· today');
    const k = 0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 1.6);
    popIn(g, t, B.nine - F(1), CX, 430, () => { g.textAlign = 'center'; g.fillStyle = `rgba(255,60,60,${0.2 + 0.2 * k})`; rr(g, -320, -190, 640, 380, 26); g.fill();
      g.strokeStyle = RED; g.lineWidth = 6; g.stroke(); g.fillStyle = RED; g.font = font(150, 900); g.fillText('9 AM', 0, -50); g.fillStyle = INK; g.font = font(64, 800); g.fillText('standup', 0, 100); }, 0.3);
  } else if (t < B.typo - 0.15) {                                                      // 4 · all eleven pulled your version
    panel(g, 'main', '· activity');
    for (let i = 0; i < 11; i++) { const r = Math.floor(i / 4), c = i % 4, n = r < 2 ? 4 : 3, x = CX + (c - (n - 1) / 2) * 160, y = 300 + r * 150, t0 = B.eleven12 + 0.07 * i;
      const fl = t >= t0 ? Math.abs(Math.cos(Math.min(1, (t - t0) / 0.16) * Math.PI)) : 1; g.save(); g.translate(x, y); g.scale(fl, 1); avatar(g, 0, 0, 56, i, t >= t0 + 0.08); g.restore(); }
    popIn(g, t, e_('l12'), CX, 720, () => { g.textAlign = 'center'; g.fillStyle = RED; g.font = font(56, 800); g.fillText('pulled your version', 0, 0); }, 0.3);
  } else if (t < B.typing - 0.15) {                                                    // 5 · the reason: one typo in the README
    panel(g, 'README.md', '· your diff');
    popIn(g, t, B.typo - F(1), CX, 330, () => { g.textAlign = 'left';
      g.fillStyle = 'rgba(255,60,60,0.22)'; g.fillRect(-340, -100, 680, 90); g.fillStyle = '#ffb3b3'; g.font = font(50, 700, MONO); g.fillText('- ## Instalation', -320, -55);
      g.fillStyle = 'rgba(63,210,122,0.22)'; g.fillRect(-340, 10, 680, 90); g.fillStyle = '#9be9b6'; g.fillText('+ ## Installation', -320, 55); }, 0.25);
    popIn(g, t, B.readme - F(1), CX, 560, () => { g.textAlign = 'center'; g.fillStyle = INK; g.font = font(62, 800); g.fillText('one typo fix', 0, 0); }, 0.3);
  } else if (t < B.first - 0.15) {                                                     // 6 · #team: everyone is typing…
    panel(g, '#team', '· chat');
    const dim = 1 - 0.65 * ez(t, B.over, 0.4); g.save(); g.globalAlpha = dim;
    for (let i = 0; i < 11; i++) { const t0 = B.typing + 0.09 * i; if (t < t0) continue; const c = i % 2, r = Math.floor(i / 2), x = X0 + 60 + c * 370, y = 245 + r * 92;
      popIn(g, t, t0, x, y, () => { avatar(g, 0, 0, 30, i, false); g.fillStyle = '#21262d'; rr(g, 44, -30, 270, 60, 30); g.fill();
        g.fillStyle = INK; g.textAlign = 'left'; g.font = font(30, 600); g.fillText('typing' + '.'.repeat(1 + Math.floor((t * 3 + i) % 3)), 66, 2); }, 0.3); }
    g.restore();
  } else if (t < B.now22 - 0.15) {                                                     // 7 · the backup branch
    panel(g, '~/team-app', '— zsh');
    g.font = font(54, 700, MONO); g.fillStyle = GREEN; g.fillText('$', X0 + 40, 270); g.fillStyle = INK; g.fillText('git branch', X0 + 90, 270);
    g.fillStyle = DIM; g.font = font(50, 600, MONO); g.fillText('  main', X0 + 40, 380);
    popIn(g, t, B.first - 0.1, X0 + 40, 470, () => { g.textAlign = 'left'; g.fillStyle = 'rgba(63,210,122,0.18)'; rr(g, -16, -48, CW - 50, 96, 12); g.fill();
      g.fillStyle = GREEN; g.font = font(52, 800, MONO); g.fillText('* clawd/backup-main', 0, 2); }, 0.25);
    popIn(g, t, B.trust - F(1), CX, 620, () => { g.textAlign = 'center'; g.fillStyle = INK; g.font = font(50, 800); g.fillText('pushed before yours ✓', 0, 0); }, 0.3);
  } else if (t < B.touching - 0.15) {                                                  // 8 · restoring main
    panel(g, 'main', '· restore');
    const k = ss(seg(t, B.now22 - 0.15, B.restored)), done = t >= B.restored;
    g.textAlign = 'center'; g.fillStyle = done ? GREEN : INK; g.font = font(56, 800); g.fillText(done ? 'main restored ✓' : 'restoring main…', CX, 320);
    g.fillStyle = '#21262d'; rr(g, X0 + 60, 410, CW - 120, 56, 28); g.fill(); g.fillStyle = GREEN; rr(g, X0 + 60, 410, Math.max(56, (CW - 120) * k), 56, 28); g.fill();
    if (done) popIn(g, t, B.restored, CX, 580, () => { g.textAlign = 'center'; g.fillStyle = INK; g.font = font(60, 800, MONO); g.fillText('300 commits back', 0, 0); }, 0.3);
  } else {                                                                             // 9 · the button: the typo is still there
    panel(g, 'README.md', '· main');
    g.fillStyle = INK; g.font = font(64, 800); g.fillText('team-app', X0 + 40, 290);
    g.font = font(58, 800, MONO); g.fillText('## Instalation', X0 + 40, 440);
    const wx = X0 + 40 + g.measureText('## ').width, ww = g.measureText('Instalation').width, k = ez(t, B.zscr + 0.15, 0.3);
    g.strokeStyle = RED; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 40 * k; i++) { const x = wx + ww * i / 40, y = 488 + 8 * Math.sin(i * 1.6); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = DIM; g.font = font(36, 500); g.fillText('npm install', X0 + 40, 600);
  }
  g.textAlign = 'left'; SET.tex.needsUpdate = true;
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
  return /^S/.test(name) ? [] : [kt, ct]; };                                          // r2: protect every head in frame (Kai's in C shots too)
function lift(i) {
  if (_lift[i] !== undefined) return _lift[i];
  _lift[i] = 0; let d = 0; if (/^S|^CK/.test(SHOTS[i])) return 0;   // CK: caption sits low (0.77), the tag owns the top
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
const SCRV = { SCRH: [0.5, 0.45, 4.9], SCRF: [0.5, 0.33, 4.9], SCRT: [0.5, 0.45, 5.3], SCRN: [0.5, 0.62, 4.9], SCRK: [0.5, 0.43, 5.1], SCRA: [0.5, 0.47, 5.3],
  SCRR: [0.5, 0.42, 5.1], SCRC: [0.5, 0.45, 5.5], SCRB: [0.5, 0.48, 5.1], SCRM: [0.5, 0.45, 5.1], SCRZ: [0.5, 0.45, 4.9] };
// r2 reframes (x, z): nothing important right of x 900 (IG buttons); measured with the probe in REVIEW.md
const NUDGE = { CC: [0.07, 0.25], CM: [0.12, 0.5], CS: [-0.08, 0], CO: [-0.2, 0], KP: [0.06, 0], W2: [0.13, 0.2], WE: [0.06, 0] };
function camFor(t, i) {
  const name = SHOTS[i], u = seg(t, CUTS[i], CUTS[i + 1]), dr = V(0.003 * Math.sin(t * 0.7 + i), 0.002 * Math.sin(t * 0.9 + 2 * i), 0);
  const push = (pos, tgt, k) => pos.clone().lerp(tgt, k * sio(u));
  let pos, tgt, fov, focus, ap, roll = 0;
  if (SCRV[name]) { const [a, b, d] = SCRV[name]; tgt = SET.scrW(a, b); pos = push(tgt.clone().add(V(0.03, 0.12, d)), tgt, PUSH.close); fov = 30; focus = tgt; ap = DOF.med; }
  else switch (name) {
    case 'WE': { tgt = V(-0.06, 0.5, -0.2); pos = push(V(-0.02, 0.5, 3.2), tgt, PUSH.med); fov = 34; focus = MID; ap = DOF.wide; break; }
    case 'W2': tgt = V(-0.1, 0.38, 0.0); pos = push(V(-0.12, 0.5, 3.0), tgt, PUSH.med); fov = 32; focus = MID; ap = DOF.wide; break;
    case 'KH': { const H = headMid(i); tgt = H.clone().add(V(0.02, 0.06, -0.3)); pos = push(H.clone().add(V(0.08, -0.12, 1.75)), tgt, PUSH.close * 1.2); fov = 32; focus = H; ap = DOF.med; break; }
    case 'KC': { const H = headMid(i); tgt = H.clone().add(V(0, 0.02, 0)); pos = push(H.clone().add(V(-0.3, -0.22, 1.9)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KF': { const H = headMid(i); tgt = H.clone().add(V(0, 0.03, 0)); pos = H.clone().add(V(-0.2, -0.12, 1.75)).lerp(tgt, 0.2 * ss(seg(t, CUTS[i], CUTS[i] + F(4))) + 0.05 * seg(t, CUTS[i] + F(4), CUTS[i + 1])); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KP': { const H = headMid(i); tgt = H.clone().add(V(-0.08, 0.06, -0.2)); pos = push(H.clone().add(V(-0.18, -0.14, 1.65)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'CM': tgt = CFACE.clone().add(V(0.2, 0.06, 0)); pos = push(CFACE.clone().add(V(0.14, -0.12, 3.0)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med; break;
    case 'CC': tgt = CFACE.clone().add(V(0, 0.02, 0)); pos = push(CFACE.clone().add(V(0.16, -0.1, 2.1)), tgt, PUSH.close * 0.5); fov = 30; focus = CFACE; ap = DOF.close; break;
    case 'CS': tgt = CFACE.clone().add(V(-0.2, 0.55, -0.9)); pos = push(CFACE.clone().add(V(0.7, 0.12, 2.9)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.6; break;
    case 'CO': tgt = CFACE.clone().add(V(0.12, 0.42, -0.8)); pos = push(CFACE.clone().add(V(0.45, 0.05, 2.6)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.6; break;
    case 'CK': { tgt = V(-0.5, 0.38, 0.04); pos = push(tgt.clone().add(V(0, 0.3, 3.8)), tgt, PUSH.med * 0.5); fov = 32; focus = CFACE; ap = DOF.wide; break; }
  }
  const nd = NUDGE[name]; if (nd) { pos.add(V(nd[0], 0, nd[1])); tgt.add(V(nd[0], 0, 0)); }
  pos.add(dr); tgt.y += lift(i);
  return { pos, tgt, fov, roll, focus: pos.distanceTo(focus), aperture: Number(Q.get('ap') || ap), shot: name, i };
}

// ---------------------------------------------------------------- captions (small white sans, centred) + the hook title + the GIT end card
const CAP = VO_LINES.map((l, i) => { const nx = VO_LINES[i + 1];
  return { txt: l.text, s: l.s - 0.04, e: nx ? Math.min(nx.s - 0.04, l.e + 0.9) : Math.min(B.freeze + 0.1, l.e + 0.9) }; });
const capY = sh => (sh && /^S|^CK/.test(sh) ? 0.77 : 0.36);   // caption centre (frame fraction) per shot: review/gate.py reads it via __dbg
function captions(g, t, s) {
  if (Q.has('nocap')) return;
  const H = g.canvas.height, Wd = g.canvas.width;
  const hook = (a) => {                               // r2 hook title = Kai's own line (no POV plate), x 180–900, y ≥ 230
    let fs = Math.round(H * 0.036); g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
    const l1 = 'I force pushed', l2 = 'to MAIN'; g.font = `800 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`;
    const w1 = g.measureText(l1).width, w2 = g.measureText(l2).width, y0 = H * 0.155, pw = w1 + fs * 1.2;
    g.fillStyle = 'rgba(6,8,12,0.82)'; rr(g, Wd / 2 - pw / 2, y0 - fs * 0.95, pw, fs * 3.2, fs * 0.35); g.fill();
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = fs * 0.4; g.fillStyle = '#ffffff'; g.fillText(l1, Wd / 2, y0);
    const k = 1 + 0.04 * Math.sin(t * 2 * Math.PI * 1.4);
    g.save(); g.translate(Wd / 2, y0 + fs * 1.32); g.scale(k, k); g.shadowBlur = 0; g.fillStyle = '#e5322d'; rr(g, -w2 / 2 - fs * 0.38, -fs * 0.66, w2 + fs * 0.76, fs * 1.32, fs * 0.25); g.fill();
    g.fillStyle = '#ffffff'; g.fillText(l2, 0, fs * 0.03); g.restore(); g.restore();
    window.__hookBox = [Wd / 2 - pw / 2, y0 - fs * 0.95, Wd / 2 + pw / 2, y0 + fs * 2.25]; };
  if (Q.has('cover')) { hook(1); return; }
  if (t >= B.card) {                                   // end card: one keyword on a solid plate, after the button (not spoken)
    const a = ez(t, B.card, 0.25), pop = 1 + 0.08 * Math.exp(-(t - B.card) * 8) * Math.sin((t - B.card) * 24);
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(5,8,12,0.55)'; g.fillRect(0, 0, Wd, H); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(Wd / 2, H * 0.3); g.scale(pop, pop);
    const f1 = Math.round(H * 0.026), f3 = Math.round(H * 0.02), fs = Math.round(H * 0.065);
    g.font = `600 ${f3}px Inter, "Helvetica Neue", Arial, sans-serif`; const pw = Math.min(Wd * 0.66, g.measureText('for the git undo cheat sheet').width + f3 * 2.4);
    g.fillStyle = '#0d1117'; rr(g, -pw / 2, -H * 0.1, pw, H * 0.2, H * 0.016); g.fill(); g.strokeStyle = 'rgba(217,119,87,0.6)'; g.lineWidth = 3; g.stroke();
    window.__cardBox = [Wd / 2 - pw / 2, H * 0.2, Wd / 2 + pw / 2, H * 0.4];
    g.font = `600 ${f1}px Inter, "Helvetica Neue", Arial, sans-serif`; g.fillStyle = '#ffffff'; g.fillText('Comment', 0, -H * 0.058);
    g.font = `800 ${fs}px Menlo, "SF Mono", monospace`; const tw = g.measureText('GIT').width;
    g.fillStyle = '#d97757'; rr(g, -tw / 2 - fs * 0.5, -fs * 0.7, tw + fs, fs * 1.4, fs * 0.3); g.fill();
    g.fillStyle = '#ffffff'; g.fillText('GIT', 0, fs * 0.04);
    g.font = `600 ${f3}px Inter, "Helvetica Neue", Arial, sans-serif`; g.fillStyle = '#e6edf3';
    g.fillText('for the git undo cheat sheet', 0, H * 0.068);
    g.restore(); return;
  }
  if (t < CAP[0].e + 0.25) hook(1 - ez(t, CAP[0].e - 0.05, 0.25));   // the hook title carries line 1; no duplicate caption under it
  const c = CAP.find(c => t >= c.s && t < c.e); if (!c || c === CAP[0]) return;
  const fs = Math.round(H * 0.025), y = H * capY(s && s.shot);
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
  const ins = /^SCR/.test(SHOTS[i]);                                                   // screen inserts: the camera sits behind the cast, so they are pure inserts
  K.holder.visible = CL.group.visible = SET.seat.visible = !ins && !Q.has('hide');
  SET.branch.g.visible = !ins && !/^C[CMSO]/.test(SHOTS[i]);   // r2: the tag never sits behind a close-up caption
  const s = camFor(t, i); s.k = k; return s;
}
const CUES = () => [                                  // r2: each hit on its on-screen moment, clear of word onsets (sfx.py ducks the rest)
  { t: W('l01', 'Clawd') + 0.45, kind: 'alarm' }, { t: B.dash - F(1), kind: 'tick' }, { t: B.wipe, kind: 'impact' },
  { t: s_('l09') - 0.15, kind: 'relief' }, { t: B.pulled9 + 0.45, kind: 'check' }, { t: e_('l10') + 0.03, kind: 'drop' },
  { t: B.eleven12 + 0.07 * 10 + 0.1, kind: 'flash' }, { t: e_('l12'), kind: 'stamp' }, { t: B.readme - F(1), kind: 'pop' },
  ...[0, 4, 8].map(i => ({ t: B.typing + 0.09 * i, kind: 'chat' })), { t: B.over + 0.32, kind: 'slump' },
  { t: B.pop, kind: 'branch' }, { t: s_('l19') - 0.12, kind: 'snap' },
  ...HOPS.filter(([, , h]) => h > 0.02).map(([, b, h]) => ({ t: b, kind: h >= 0.05 ? 'land_big' : 'land' })),
  { t: B.restored, kind: 'chime' }, { t: B.card, kind: 'card' }];
window.__cues = () => CUES().sort((a, b) => a.t - b.t).map(c => ({ ...c, t: +c.t.toFixed(3) }));
window.__dbg = { capY, topsAt, CAP, CAP_CLEAR, prep, CUTS, SHOTS, B, S_, K, CL, T_END, KHEAD, CFACE, LN, shotIdx, camera: S.camera, WORK: [], STATE_T: [] };
S.run({ prep, T_END, overlay: (t, s) => captions(S.g2, t, s) });
