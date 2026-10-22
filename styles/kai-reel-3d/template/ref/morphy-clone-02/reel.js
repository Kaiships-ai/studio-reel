// reel.js · morphy-clone-02: @agentmorphy reel #2 ("switch to Haiku", DePWQ17gwit) 1:1 with our cast. Same script word for
// word, every line part on Morphy's measured onset (vo/make_vo.py), his 18 cuts at his times, his shot grammar (low two-shot
// on the giant keyboard, Kai close low, Clawd medium, Kai profile up at the screen, Clawd extreme close dutch, Clawd at the
// screen, last wide holds through the usage limit). Surpass = acting + a screen that tells the story: the model chip flips,
// Haiku shrinks Clawd and wrecks the site, Opus grows him back and fixes it, the usage limit powers him down.
// Pure function of t. Every motion number from src/motion.js; every hit keyed to a spoken word (W()).
import * as THREE from 'three';
import { createStage, V, seg, ss, sio, lerp, clamp, hsh } from './stage.js';
import { buildSet, DECK, SCR, SEAT } from './set.js';
import { loadKai, loadClawdDefault } from './cast.js';
import { voMouth } from './kai-talk.js';
import { SQ, SNAP, PUSH, DOF, LAG, step, ring, TR, hop, blinks, F } from './motion.js';

const Q = new URLSearchParams(location.search);
const S = createStage();
const SET = buildSet(S);
const K = await loadKai(S.scene, S.renderer);
const CL_S = 0.045, CL = loadClawdDefault(S.scene, CL_S);                         // v2: the default Clawd, one size for both models

// ---------------------------------------------------------------- voice: lines + words (src/vo.js), loudness (src/vo_env.js)
const LN = Object.fromEntries(VO_LINES.map(l => [l.id, l]));
const norm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
const W = (lid, w, n = 1) => { let c = 0; for (const x of VO_WORDS) if (x.line === lid && norm(x.w) === norm(w) && ++c === n) return x.s; console.warn('LOG no word', lid, w); return LN[lid].s; };
const WE = (lid, w, n = 1) => { let c = 0; for (const x of VO_WORDS) if (x.line === lid && norm(x.w) === norm(w) && ++c === n) return x.e; return LN[lid].e; };
const KW = VO_WORDS.filter(x => x.who === 'kai');
const T_END = VO_END;                                                               // v4: + Kai's whispered button after the usage limit
const s_ = (id) => LN[id].s, e_ = (id) => LN[id].e;
const envAt = (E, t) => { const f = t * 30, i = Math.floor(f), k = f - i; return lerp(E[Math.min(E.length - 1, Math.max(0, i))] ?? 0, E[Math.min(E.length - 1, i + 1)] ?? 0, k); };

// ---------------------------------------------------------------- blocking (metres): Kai on his popped-up key (right), Clawd on the keys (left)
const KYAW = -0.32;                                                                 // Kai faces camera, cheated toward Clawd
const HIP = V(0.002, 0.215, 0.0).applyAxisAngle(V(0, 1, 0), KYAW);
const KP = V(SEAT.x - HIP.x, DECK, SEAT.z - HIP.z);
K.holder.position.copy(KP); K.holder.rotation.y = KYAW;
K.pose([['sit', 0.5, 1]]); S.scene.updateMatrixWorld(true);
const KHEAD = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0));      // fixed framing anchor (no per-frame jitter)
const KFILL_I = Number(Q.get('kfill') ?? 6), kfill = new THREE.SpotLight('#ffdcc0', KFILL_I, 3, 0.32, 0.7, 2);
kfill.position.copy(KHEAD).add(V(-0.25, 0.3, 1.05)); kfill.target.position.copy(KHEAD).add(V(0, -0.12, 0)); S.scene.add(kfill, kfill.target);
const CP = V(-0.34, DECK, 0.06), CYAW = 0.38;                                          // Clawd faces Kai, cheated 3/4 to camera
const CFACE = CP.clone().add(V(0, 7 * CL_S, 0));                                      // Clawd's eye line (legs 2 + eye centre 5 units)
const MID = KHEAD.clone().lerp(CFACE, 0.5);

// ---------------------------------------------------------------- beats (all keyed to words)
const B = {
  haiku1: W('l01', 'Haiku'), done1: s_('l02'), polishK: W('l03', 'design.'), perfect1: s_('l04'), polished: W('l04', 'polished.'),
  menu: W('l05', "menu's"), logo: W('l05', 'logo.'), fixed: s_('l06'), no1: W('l07', 'No,'), no2: W('l07', 'no,', 1), no3: W('l07', 'no,', 2), no4: W('l07', 'no.'),
  notlike: W('l07', 'Not'), stop: W('l07', 'Stop.'), perfect2: s_('l08'), opus: W('l09', 'Opus'), broke: W('l10', 'broke'), fixit: s_('l11'),
  isee: s_('l12'), oh: s_('l13'), nice13: W('l13', 'nice.'), polish14: W('l14', 'polish'), done2: s_('l15'), okay16: s_('l16'), actually: W('l16', 'actually'),
  pricing: W('l17', 'pricing'), done3: s_('l18'), yes1: W('l19', 'Yes.', 1), yes2: W('l19', 'Yes.', 2), okay19: W('l19', 'Okay.'), onboarding: W('l19', 'onboarding...'),
  usage: s_('l20'), reached: W('l20', 'reached.'), l21: s_('l21'), codex: W('l21', 'Codex.'),
};
B.swap1 = e_('l01') - 0.08;  B.swap2 = e_('l09') + 0.05;                             // model swaps (v2: a squash pop + squint; the screen chip flips)
// Clawd "works" (arm up, sparks, the screen changes): each lands on the line that reports it
const WORK = [[B.perfect1 + 0.15, 'S1'], [B.fixed - 0.05, 'S2'], [B.perfect2 + 0.1, 'S3'], [B.isee + 1.45, 'S4'], [B.polish14 + 0.85, 'S5'], [B.done3 - 0.1, 'S6']];
const STATE_T = [[0, 'S0'], ...WORK.map(([t, s]) => [t + 0.12, s]), [B.usage + 0.02, 'S7']];
// ---------------------------------------------------------------- shots (v2, Kai: "just cut to whoever is speaking"): a hard cut on each
// speaker change, on the line's first frame; same speaker = hold. Exceptions: the opening order + Clawd's 1-word "Done." hold the two-shot;
// two big listener reactions get a shot (Clawd switching to Opus; Opus fixing the site at the screen); Kai's collapse ends on the two-shot.
const fr = (x) => Math.round(x * 30) / 30;
const SHOTLIST = [[0, 'W'], [s_('l03'), 'KC'], [s_('l04'), 'CM'], [s_('l05'), 'KP'], [s_('l06'), 'CC'], [s_('l07'), 'KM'], [s_('l08'), 'CC'], [s_('l09'), 'KC'],
  [B.swap2, 'CM'], [s_('l10'), 'KC'], [s_('l12'), 'CC'], [WORK[3][0] - 0.2, 'CS'], [s_('l13'), 'KU'], [s_('l15'), 'CM'], [s_('l16'), 'KX'], [s_('l18'), 'CS2'],
  [s_('l19'), 'KC3'], [s_('l20'), 'CM'], [B.reached + 0.9, 'WE'], [B.codex - 0.02, 'CCE']];   // v4: "…I'm trying Codex." → Clawd's one eye snaps open
const CUTS = [...SHOTLIST.map(([t]) => t ? fr(t - 0.03) : 0), T_END], SHOTS = SHOTLIST.map(([, n]) => n);
const shotIdx = (t) => { let i = 0; while (i < CUTS.length - 2 && t >= CUTS[i + 1]) i++; return i; };
const STAND = [CUTS[SHOTS.indexOf('KM')], CUTS[SHOTS.indexOf('KM') + 1]];                                                    // "No, no, no, no. … Stop." Kai on his feet (Morphy's grammar)

// ---------------------------------------------------------------- Kai: sit clip (stand clip in the panic shot) + additive head/spine/shoulders
const BL = (a, b, every, seed) => { const o = []; for (let t = a + 0.6, i = 0; t < b; i++) { o.push(Math.round(t * 30) / 30); t += every * (0.7 + 0.6 * hsh(i, seed)); } return o; };
const KBLINK = BL(0, T_END, 3.0, 3), CBLINK = BL(0.4, B.usage, 2.6, 7);
// panic pose (review/clips.png, 4 clips × 5 times): 'afraid' 0.15 → 0.6 = hands up, palms out ("no, no, no, no"); 'cast_a_spell' 2.55 = one arm thrust, palm out ("Stop.")
const STAND_CLIP = Q.get('sclip'), STAND_T = Number(Q.get('st') ?? 0.6);
function kai(t, shot) {
  const standing = t >= STAND[0] && t < STAND[1];
  const down = step(t, B.reached + 1.4, 1.2, 7);                                    // the end: slumps, chin into his hand (wide shot only, no lens risk)
  const base = 0.25 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / 6.5));        // breathing inside the upright stretch of the sit clip
  if (standing && STAND_CLIP) K.pose([[STAND_CLIP, STAND_T, 1]]);
  else if (standing) { const w = clamp(step(t, B.stop - 0.12, 3.2, 7)); K.pose([['afraid', 0.15 + 0.45 * seg(t, STAND[0], B.stop), 1 - w], ['cast_a_spell', 2.55, w]]); }
  else K.pose(down > 0.001 ? [['sit', base, 1 - down], ['sitB', 4.5, down]] : [['sit', base, 1]]);
  // look: Clawd by default; up at the screen when the site is the subject; camera-ish in his close-ups
  const look = { clawd: -0.42, screen: -0.75, cam: 0.05, down: 0 };
  const yawK = TR(t, [[0, look.clawd], [B.polishK - 0.6, look.screen, 2.4, 7], [s_('l04') + 0.2, look.clawd, 2.4, 7], [s_('l05') - 0.3, look.screen, 2.4, 7],
    [s_('l06') + 0.1, look.clawd, 2.4, 7], [B.broke - 0.45, look.clawd + 0.12, 2.4, 7], [e_('l10') + 0.1, look.clawd, 2.4, 7], [B.isee + 1.2, look.screen, 2.4, 7],
    [B.oh - 0.05, look.screen + 0.12, 5, 9], [B.nice13 + 0.3, look.clawd, 2.2, 7], [B.done2 + 0.1, look.screen, 2.4, 7], [s_('l17') - 0.2, look.clawd, 2.4, 7],
    [B.done3 + 0.1, look.screen, 2.4, 7], [B.yes1 - 0.2, look.clawd + 0.2, 2.4, 7], [B.usage + 0.15, look.screen, 3, 8], [B.reached + 1.0, look.clawd, 1.6, 7]]);
  const up = { screen: -0.32, flat: -0.05 };
  const pitchK = TR(t, [[0, up.flat], [B.polishK - 0.6, up.screen, 2.4, 7], [s_('l04') + 0.2, up.flat, 2.4, 7], [s_('l05') - 0.3, up.screen - 0.05, 2.4, 7],
    [s_('l06') + 0.1, up.flat, 2.4, 7], [B.broke - 0.45, 0.08, 2.4, 7], [e_('l10') + 0.1, 0.06, 2.0, 7], [B.isee + 1.2, up.screen, 2.4, 7],
    [B.oh - 0.05, up.screen - 0.12, 5, 9], [B.nice13 + 0.3, up.flat, 2.2, 7], [B.done2 + 0.1, up.screen, 2.4, 7], [s_('l17') - 0.2, up.flat, 2.4, 7],
    [B.done3 + 0.1, up.screen, 2.4, 7], [B.yes1 - 0.2, up.flat - 0.08, 2.4, 7], [B.usage + 0.15, up.screen, 3, 8], [B.reached + 1.0, 0.1, 1.6, 7]]);
  // nods (+pitch) and shakes (yaw) on the stressed word, 1 frame before the sound
  const NOD = [[B.haiku1, 0.08], [B.polishK, 0.1], [B.logo, 0.08], [W('l09', 'Opus'), 0.08], [B.broke, 0.1], [W('l11', 'please.'), 0.08], [B.nice13, 0.12],
    [W('l14', 'polish'), 0.1], [B.okay16 + 0.1, 0.12], [W('l16', 'nice.'), 0.1], [W('l17', 'page.'), 0.08], [B.yes1, 0.2], [B.yes2, 0.26], [B.okay19, 0.12], [B.codex, 0.06]];
  let nod = 0; for (const [t0, a] of NOD) nod += ring(t, t0 - F(1), { f: 2.6, d: 6, a }) * (t > t0 - F(1) ? 1 : 0) * Math.sin(Math.min(1, (t - t0 + F(1)) * 12) * Math.PI / 2);
  let shake = 0; for (const t0 of [B.no1, B.no2, B.no3, B.no4, B.stop]) if (t > t0 - F(1)) shake += 0.11 * Math.exp(-(t - t0) * 7) * Math.sin((t - t0 + F(1)) * 2 * Math.PI * 4.2);
  const lean = TR(t, [[0, 0], [s_('l10') - 0.1, 0.16, 2.4, 7], [e_('l10') + 0.15, 0, 1.8, 7], [s_('l17') - 0.1, 0.1, 2, 7], [e_('l17') + 0.3, 0, 1.6, 7], [B.okay19, 0.12, 2, 7], [B.usage + 0.1, 0.04, 2.6, 7]]);
  const tilt = TR(t, [[0, 0], [B.menu - 0.1, 0.14, 2, 7], [e_('l05') + 0.2, 0, 1.6, 7], [B.actually - 0.1, 0.1, 1.8, 7], [e_('l16') + 0.3, 0, 1.6, 7]]);
  const ohk = t > B.oh - F(2) ? ring(t, B.oh - F(2), { f: 2.2, d: 5, a: 1 }) : 0;   // "Oh," a small surprised jolt back
  const sk = standing ? 0.5 : 1;                                                     // the stand clip already moves the head: lighter layers
  K.turn('Spine1', V(1, 0, 0), lean - 0.05 * ohk + 0.12 * down); K.turn('Spine2', V(1, 0, 0), 0.06 * down);
  K.turn('Neck', V(0, 1, 0), (yawK + shake) * 0.35 * sk); K.turn('Head', V(0, 1, 0), (yawK + shake) * 0.65 * sk);
  K.turn('Head', V(1, 0, 0), (pitchK + nod - 0.08 * ohk + 0.2 * down) * sk); K.turn('Head', V(0, 0, 1), tilt * sk);
  K.root.updateMatrixWorld(true);
  kfill.intensity = standing ? 0 : KFILL_I;                                        // the face fill sits at seated head height: off when he stands
  const m = voMouth(t, KW, ENV_K), bl = blinks(t, KBLINK); K.talk.set({ ...m, blink: bl });
  return { yawK, m, bl, standing, down };
}

// ---------------------------------------------------------------- Clawd (v2): small, readable beats only, no overshoot springs
// talk bob (squash follows his voice loudness) · blink · a squash on the stressed word · eye shapes · one arm raise when he works.
// Every transition is a smoothstep ease (no ringing); no hops, spins, floating or wobble (review/clawd-speed.png checks it).
const S_ = { pos: V(), face: V(), sq: 1, body: 1, expr: 'neutral', talk: 0, scale: CL_S, flame: 1 };
const ez = (t, t0, d) => ss(seg(t, t0, t0 + d));                                    // 0 → 1 ease over d seconds
const pulse = (t, t0, a, d = 0.22) => a * (t < t0 ? 0 : t < t0 + d * 0.3 ? ss((t - t0) / (d * 0.3)) : 1 - ss(clamp((t - t0 - d * 0.3) / (d * 0.7))));   // in-out, no ring
const EYE = { neutral: [1, 1, 0, 0], happy: [1.05, 0.78, 0.45, 0], wide: [1.12, 1.25, 0.1, 0], squint: [1.05, 0.5, 0.2, 0], worried: [1, 0.92, 0, 0.22] };   // slots stay slots (Morphy's)
const EMPH = () => [[B.done1, 0.08], [B.perfect1, 0.07], [B.fixed, 0.08], [B.perfect2, 0.09], [B.isee, -0.05], [B.done2, -0.05], [B.done3, -0.05], [B.usage, -0.06],
  [B.swap2 + 0.05, -0.1], [B.codex + 0.02, 0.06]];   // v4: Haiku stretches up proud (+), Opus gives a small calm nod (−)        // swap 1 lands on 'Done.' (its own pulse)
let _emph = null;
function clawd(t) {
  _emph = _emph || EMPH();
  const off = ez(t, B.reached + 0.2, 1.2);                                            // usage limit: powers down
  // body squash: breath + talk bob + emphasis pulses + power-down sag
  const talking = VO_LINES.some(l => l.who !== 'kai' && t > l.s - 0.05 && t < l.e + 0.05);
  const env = talking ? clamp((envAt(ENV_C, t) + envAt(ENV_C, t + F(1)) + envAt(ENV_C, t + F(2))) / 3 * 1.3) : 0;   // 3-frame mean: a bob, not a flutter
  let body = 1 + 0.008 * Math.sin(t * 2 * Math.PI / 3.2) * (1 - off);
  for (const [t0, a] of _emph) body += pulse(t, t0 - F(2), a, 0.3);
  body += -0.08 * off;
  const sq = body + 0.045 * env;
  // yaw: toward Kai; eases to the screen while Opus fixes it (CS shot) and back on "Oh,"; a small turn to the screen on the pricing "Done."
  const yaw = CYAW + (Math.PI - 0.75 - CYAW) * (ez(t, B.isee + 1.0, 0.45) - ez(t, B.oh + 0.15, 0.45)) - 0.5 * (ez(t, B.done3 - 0.4, 0.3) - ez(t, B.done3 + 0.5, 0.35));
  const lean = -0.08 * (ez(t, B.isee - 0.05, 0.25) - ez(t, e_('l12') + 0.2, 0.35)) + 0.06 * (ez(t, B.broke - 0.1, 0.3) - ez(t, e_('l11'), 0.4))
    + 0.09 * off * off;                                                                 // "I see that." leans in; leans back at the tattle; tips forward when off
  // arm: raise the right arm toward the screen while he works (held, eased, no wag)
  let arm = 0; for (const [w0] of WORK) arm = Math.max(arm, ez(t, w0 - 0.15, 0.18) - ez(t, w0 + 0.45, 0.25));
  arm = Math.max(arm, ez(t, B.onboarding - 0.1, 0.2) * (1 - ez(t, B.reached + 0.25, 0.3)));   // starts the onboarding … frozen, then drops
  const armL = ez(t, B.perfect2 - 0.12, 0.16) - ez(t, B.perfect2 + 0.7, 0.25);                  // "Perfect!" (the wrecked site): both arms up
  // eye shape per beat
  const inW = (a, b) => t >= a && t < b;
  const expr = inW(B.swap1, B.swap1 + 0.35) || inW(B.swap2, B.swap2 + 0.35) ? 'squint'
    : inW(B.done1 - 0.1, e_('l02') + 0.5) || inW(B.perfect1 - 0.1, e_('l04') + 0.4) || inW(B.fixed - 0.1, e_('l06') + 0.5) || inW(B.perfect2 - 0.1, e_('l08') + 0.4) ? 'happy'
    : inW(B.no1 - 0.2, B.stop + 0.5) ? 'happy'                                              // oblivious while Kai panics
    : inW(B.broke - 0.1, e_('l11') + 0.2) ? 'squint'                                          // Opus side-eyes the tattle
    : inW(B.isee - 0.1, e_('l12') + 0.5) ? 'squint' : inW(B.nice13, B.nice13 + 0.8) ? 'happy'
    : inW(B.usage, B.reached + 0.2) ? 'wide' : 'neutral';
  const look = [TR(t, [[0, 0.5], [B.isee + 0.1, -0.5, 3, 12], [B.isee + 0.55, 0.5, 3, 12], [e_('l12') + 0.2, 0.5]]), -0.25 * off];
  CL.group.position.copy(CP); CL.group.rotation.set(0, yaw, 0);
  CL.update(t, { action: 'idle', blink: false, look });
  const P = CL.parts;
  P.torso.rotation.set(lean, 0, 0);                                                  // idle's side sway removed (no wobble)
  P.bounce.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  P.arms.forEach(a => { a.rotation.set(0, 0, 0); a.position.y = 3.0; });
  const Lr = P.arms[0]; Lr.position.y = 3.0 + 2.6 * armL; Lr.rotation.z = -0.9 * armL; Lr.rotation.y = 0.5 * armL;
  const R = P.arms[1]; R.position.y = 3.0 + 2.6 * arm; R.rotation.z = 0.9 * arm; R.rotation.y = -0.5 * arm;
  // eyes: shape ← expression (eased 0.12 s), blink, power-down closes them
  const bl = Math.max(blinks(t, CBLINK), ez(t, B.reached + 0.4, 0.8));
  const ex = EYE[expr];
  const peek = ez(t, B.codex + 0.03, 0.07);                                           // "…I'm trying Codex." → one eye snaps open, wide
  P.eyes.forEach((e, i) => { const sxn = i ? 1 : -1, b = i ? bl : bl * (1 - peek), x_ = i ? ex : peek > 0.01 ? EYE.wide : ex;
    e.scale.set(x_[0], Math.max(0.07, x_[1] * (1 - 0.93 * b)), 1); e.position.y = 4.0 + x_[2] + look[1] * 0.4 * (1 - peek * (1 - i)) + 0.9 * b * x_[1];
    e.position.x = sxn * 3.5 + look[0] * 0.5; e.rotation.z = -sxn * x_[3]; });
  CL.group.updateMatrixWorld(true);
  S_.pos.copy(CL.group.position); S_.face.copy(P.torso.localToWorld(V(0, 5, 4.6))); S_.sq = sq; S_.body = body; S_.expr = expr; S_.talk = env; S_.yaw = yaw; S_.blink = bl; S_.arm = arm; S_.flame = 1 - off;
  return S_;
}

// ---------------------------------------------------------------- sparks: Clawd's "work" (and the model swaps) throw HDR sparks
const NP = 14, sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 3.4, 1.2) }), sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sparkM, NP * 3);
sparks.frustumCulled = false; S.scene.add(sparks); const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion();
const BURSTS = WORK.map(([t0], i) => [t0 + 0.05, i, 0.8]);
function drawSparks(t) {
  let n = 0; const glow = [0];
  for (const [t0, seed, k] of BURSTS) {
    const u = t - t0; if (u < 0 || u > 0.6 || n >= NP * 3 - NP) continue;
    const o = CL.parts.arms[1].localToWorld(V(2.6, 0, 0.6));                        // his raised right hand
    for (let i = 0; i < NP; i++) {
      const a = hsh(i, seed) * 2 * Math.PI, el = 0.3 + 0.9 * hsh(i, seed + 1), sp = (0.5 + 0.8 * hsh(i, seed + 2)) * k, life = 0.25 + 0.3 * hsh(i, seed + 3);
      if (u > life) continue; const r = (1 - u / life) * 0.006 * (0.6 + hsh(i, seed + 4));
      const p = o.clone().add(V(Math.cos(a) * Math.cos(el) * sp * u, Math.sin(el) * sp * u - 2.6 * u * u, Math.sin(a) * Math.cos(el) * sp * u * 0.6 + 0.12 * u));
      _m4.compose(p, _q, V(r, r, r)); sparks.setMatrixAt(n++, _m4);
    }
    glow[0] = Math.max(glow[0], Math.exp(-u * 9) * k);
  }
  for (let i = n; i < NP * 3; i++) { _m4.makeScale(0, 0, 0); sparks.setMatrixAt(i, _m4); }
  sparks.instanceMatrix.needsUpdate = true;
  SET.screenGlow.intensity = 0.6 + 2.5 * glow[0];
}

// ---------------------------------------------------------------- the monitor: Claude Code on the left, the site preview on the right
const stateAt = (t) => { let s = STATE_T[0]; for (const x of STATE_T) if (t >= x[0]) s = x; return s; };
const prevState = (t) => { let p = STATE_T[0], s = STATE_T[0]; for (const x of STATE_T) if (t >= x[0]) { p = s; s = x; } return p; };
const font = (px, w = 600, fam = 'Inter, "Helvetica Neue", Arial, sans-serif') => `${w} ${px}px ${fam}`;
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function site(g, st, x0, y0, w, h, t, ts) {           // draws one state of the site into the preview rect
  g.save(); rr(g, x0, y0, w, h, 14); g.clip();
  const u = t - ts, pop = (k) => 1 + 0.08 * Math.exp(-u * 6) * Math.sin(u * 22) * k;
  const bg = { S0: '#202030', S1: '#1b1430', S2: '#1b1430', S3: '#1b1430', S4: '#15151f', S5: '#120f1c', S6: '#120f1c', S7: '#120f1c' }[st];
  g.fillStyle = bg; g.fillRect(x0, y0, w, h);
  const cx = x0 + w / 2;
  const logo = (x, y, s) => { g.fillStyle = '#e8743b'; rr(g, x, y - 26 * s, 40 * s, 40 * s, 9 * s); g.fill(); g.fillStyle = '#16131f'; g.fillRect(x + 11 * s, y - 16 * s, 5 * s, 14 * s); g.fillRect(x + 24 * s, y - 16 * s, 5 * s, 14 * s);
    g.fillStyle = '#f4efe8'; g.font = font(34 * s, 700); g.textBaseline = 'middle'; g.fillText('kaiships', x + 52 * s, y - 6 * s); };
  const nav = (x, y, pill) => { g.font = font(24, 500); g.fillStyle = '#c9c3d8'; ['Product', 'Docs', 'Pricing', 'Login'].forEach((s, i) => { const xx = x + i * 120;
    if (pill) { g.fillStyle = 'rgba(255,120,200,0.35)'; rr(g, xx - 14, y - 22, 104, 44, 22); g.fill(); g.fillStyle = '#ffd6f2'; } g.fillText(s, xx, y); }); };
  const grad = (x1, x2, a, b) => { const gr = g.createLinearGradient(x1, 0, x2, 0); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  g.textBaseline = 'middle';
  if (st === 'S0') {                                   // the draft: plain, left aligned, grey
    logo(x0 + 50, y0 + 70, 1); nav(x0 + w - 520, y0 + 64, false);
    g.fillStyle = '#e7e3ee'; g.font = font(70, 700); g.fillText('Ship it while you sleep.', x0 + 60, y0 + 300);
    g.fillStyle = '#8f8aa3'; g.font = font(28, 400); g.fillText('Your agent crew builds, tests and deploys overnight.', x0 + 62, y0 + 380);
    g.fillStyle = '#4a4660'; rr(g, x0 + 60, y0 + 450, 240, 70, 10); g.fill(); g.fillStyle = '#e7e3ee'; g.font = font(26, 600); g.fillText('Start building', x0 + 90, y0 + 486);
  } else if (st === 'S1' || st === 'S2' || st === 'S3') {   // Haiku's "polish": glow + gradient … with the menu ON the logo; then the logo "fix"
    const bad = st === 'S3' ? 1 : 0, big = st === 'S1' ? 1 : st === 'S2' ? pop(1) * 3.6 : 3.6;
    const gl = g.createRadialGradient(cx, y0 + 330, 20, cx, y0 + 330, 520); gl.addColorStop(0, 'rgba(170,80,255,0.45)'); gl.addColorStop(1, 'rgba(170,80,255,0)'); g.fillStyle = gl; g.fillRect(x0, y0, w, h);
    g.save(); if (bad) { g.translate(cx, y0 + h / 2); g.rotate(-0.07); g.translate(-cx, -(y0 + h / 2)); }
    g.textAlign = 'center'; g.fillStyle = grad(cx - 420, cx + 420, '#c58bff', '#ff7ac8'); g.font = font(92, 800);
    g.shadowColor = 'rgba(255,120,220,0.9)'; g.shadowBlur = 30; g.fillText('Ship it while you sleep.', cx + (bad ? 120 : 0), y0 + 400); g.shadowBlur = 0;
    g.fillStyle = '#d9c9f2'; g.font = font(30, 400); g.fillText('Your agent crew builds, tests and deploys overnight.', cx, y0 + 490);
    for (let k = 0; k < (bad ? 3 : 1); k++) { const bx = cx - 150 + (bad ? (k - 1) * 230 : 0), by = y0 + 580 + (bad ? k * 26 : 0);
      g.fillStyle = grad(bx, bx + 300, '#a34bff', '#ff5fb0'); rr(g, bx, by, 300, 76, 38); g.fill(); g.fillStyle = '#fff'; g.font = font(28, 700); g.fillText('Start building', bx + 150, by + 38); }
    g.textAlign = 'left'; g.restore();
    logo(x0 + 50, y0 + 70 + (big - 1) * 30, big);                                    // S2/S3: the "fixed" logo, huge
    nav(x0 + 70, y0 + 66, true);                                                      // the bug: the menu sits on the logo
  } else {                                              // Opus: clean → polished → pricing
    const pol = st !== 'S4';
    if (pol) { const a = g.createRadialGradient(x0 + w * 0.25, y0 + h * 0.15, 10, x0 + w * 0.25, y0 + h * 0.15, w * 0.6); a.addColorStop(0, 'rgba(232,116,59,0.35)'); a.addColorStop(1, 'rgba(232,116,59,0)');
      g.fillStyle = a; g.fillRect(x0, y0, w, h); const b = g.createRadialGradient(x0 + w * 0.85, y0 + h * 0.7, 10, x0 + w * 0.85, y0 + h * 0.7, w * 0.5); b.addColorStop(0, 'rgba(110,90,255,0.32)'); b.addColorStop(1, 'rgba(110,90,255,0)'); g.fillStyle = b; g.fillRect(x0, y0, w, h); }
    logo(x0 + 50, y0 + 70, 1); nav(x0 + w - 520, y0 + 64, false);
    g.textAlign = 'center';
    if (st === 'S4' || st === 'S5') {
      g.fillStyle = pol ? grad(cx - 400, cx + 400, '#ffd2a6', '#e8743b') : '#f4efe8'; g.font = font(pol ? 96 : 84, 800); g.fillText('Ship it while you sleep.', cx, y0 + 330);
      g.fillStyle = '#b8b2c8'; g.font = font(30, 400); g.fillText('Your agent crew builds, tests and deploys overnight.', cx, y0 + 420);
      g.fillStyle = '#e8743b'; rr(g, cx - 270, y0 + 490, 260, 72, 14); g.fill(); g.fillStyle = '#fff'; g.font = font(27, 700); g.fillText('Start building', cx - 140, y0 + 527);
      g.strokeStyle = '#5e5874'; g.lineWidth = 2; rr(g, cx + 10, y0 + 490, 260, 72, 14); g.stroke(); g.fillStyle = '#e7e3ee'; g.fillText('See a demo', cx + 140, y0 + 527);
      if (pol) { g.fillStyle = 'rgba(255,255,255,0.06)'; rr(g, cx - 380, y0 + 620, 760, 220, 18); g.fill(); g.strokeStyle = 'rgba(255,210,166,0.35)'; rr(g, cx - 380, y0 + 620, 760, 220, 18); g.stroke();
        for (let i = 0; i < 4; i++) { g.fillStyle = i ? 'rgba(255,255,255,0.12)' : 'rgba(232,116,59,0.8)'; rr(g, cx - 340, y0 + 660 + i * 42, i ? 520 - i * 90 : 300, 18, 9); g.fill(); } }
    } else {                                            // S6 / S7 pricing
      g.fillStyle = '#f4efe8'; g.font = font(84, 800); g.fillText('Simple pricing.', cx, y0 + 230);
      g.fillStyle = '#b8b2c8'; g.font = font(28, 400); g.fillText('Start free. Upgrade when your crew grows.', cx, y0 + 305);
      [['Free for builders', '$0', 0], ['Pro', '$20', 1], ['Team', '$50', 0]].forEach(([n, p, hot], i) => { const bx = cx - 520 + i * 360, by = y0 + 380 + (u < 0.6 && st === 'S6' ? 40 * Math.exp(-u * 8) * (i + 1) : 0);
        g.fillStyle = hot ? 'rgba(232,116,59,0.16)' : 'rgba(255,255,255,0.05)'; rr(g, bx, by, 320, 420, 20); g.fill(); g.strokeStyle = hot ? '#e8743b' : '#3c3750'; g.lineWidth = hot ? 4 : 2; rr(g, bx, by, 320, 420, 20); g.stroke();
        g.textAlign = 'left'; g.fillStyle = '#e7e3ee'; g.font = font(30, 700); g.fillText(n, bx + 30, by + 56); g.font = font(64, 800); g.fillText(p, bx + 30, by + 140);
        for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(255,255,255,0.14)'; rr(g, bx + 30, by + 200 + k * 40, 220 - k * 30, 14, 7); g.fill(); }
        g.fillStyle = hot ? '#e8743b' : '#2e2a40'; rr(g, bx + 30, by + 340, 260, 54, 12); g.fill(); g.textAlign = 'center'; });
    }
    g.textAlign = 'left';
  }
  g.restore();
}
const TERM = () => [[0, '> switch to haiku 5.5', '#f2efe8'], [B.swap1 + 0.2, '● Model: haiku 5.5', '#8b8798'], [s_('l03'), '> polish the design', '#f2efe8'], [WORK[0][0], '● Polished ✓', '#8b8798'],
  [s_('l05'), "> the menu's on the logo", '#f2efe8'], [WORK[1][0], '● Fixed ✓', '#8b8798'], [B.stop, '> stop', '#ff7a6a'], [WORK[2][0], '● Perfect ✓', '#8b8798'],
  [s_('l09'), '> switch to opus 5.5', '#f2efe8'], [B.swap2 + 0.2, '● Model: opus 5.5', '#8b8798'], [s_('l11'), '> fix it, please', '#f2efe8'], [B.isee, '● Reading the layout…', '#8b8798'],
  [WORK[3][0], '● Nav + logo fixed', '#8b8798'], [s_('l14'), '> now polish it', '#f2efe8'], [WORK[4][0], '● Done', '#8b8798'], [s_('l17'), '> add a pricing page', '#f2efe8'],
  [WORK[5][0], '● Done', '#8b8798'], [B.onboarding - 0.3, '> and the onboarding', '#f2efe8'], [B.usage, '⚠ Usage limit reached', '#ff6b5e']];
const TL = TERM();
function drawScreen(t) {
  const g = SET.ctx, w = SET.cv.width, h = SET.cv.height;
  g.fillStyle = '#100e18'; g.fillRect(0, 0, w, h);
  // title bar + model chip
  g.fillStyle = '#1d1a28'; g.fillRect(0, 0, w, 64);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(30 + i * 30, 32, 9, 0, 7); g.fill(); });
  g.font = font(26, 600, 'Menlo, monospace'); g.textBaseline = 'middle'; g.fillStyle = '#d97757'; g.fillText('✻ Claude Code', 130, 33);
  const model = t < B.swap1 + 0.2 ? 'opus 5.5' : t < B.swap2 + 0.2 ? 'haiku 5.5' : 'opus 5.5';
  const flip = Math.max(Math.exp(-Math.max(0, t - B.swap1 - 0.2) * 5) * (t > B.swap1 + 0.2 ? 1 : 0), Math.exp(-Math.max(0, t - B.swap2 - 0.2) * 5) * (t > B.swap2 + 0.2 ? 1 : 0));
  g.fillStyle = `rgba(232,116,59,${0.25 + 0.6 * flip})`; rr(g, w - 250, 14, 220, 38, 19); g.fill(); g.fillStyle = '#ffe2cc'; g.font = font(24, 700, 'Menlo, monospace'); g.textAlign = 'center'; g.fillText(model, w - 140, 34); g.textAlign = 'left';
  // terminal column
  g.fillStyle = '#14121d'; g.fillRect(0, 64, 400, h - 64);
  const vis = TL.filter(([t0]) => t >= t0).slice(-15); g.font = font(19, 500, 'Menlo, monospace');
  vis.forEach(([t0, txt, c], i) => { g.fillStyle = c; g.fillText(txt, 22, 110 + i * 42); });
  if (Math.floor(t * 2) % 2 && t < B.usage) { g.fillStyle = '#f2efe8'; g.fillRect(22, 110 + vis.length * 42 - 12, 11, 24); }
  // site preview (browser frame)
  const x0 = 420, y0 = 84, pw = w - 440, ph = h - 104;
  g.fillStyle = '#24212f'; rr(g, x0, y0, pw, ph, 16); g.fill();
  g.fillStyle = '#2f2b3d'; rr(g, x0 + 160, y0 + 14, 420, 34, 17); g.fill(); g.fillStyle = '#a7a1b8'; g.font = font(20, 500); g.fillText('kaiships.ai' + (stateAt(t)[1] >= 'S6' ? '/pricing' : ''), x0 + 182, y0 + 32);
  const [ts, st] = stateAt(t), [, pst] = prevState(t), sx = x0 + 10, sy = y0 + 60, sw = pw - 20, sh = ph - 70;
  const k = clamp((t - ts) / 0.22);
  if (k < 1 && pst !== st) { site(g, pst, sx, sy, sw, sh, t, ts); g.globalAlpha = ss(k); }
  site(g, st, sx, sy, sw, sh, t, ts); g.globalAlpha = 1;
  if (k < 1 && st !== 'S7') { const bx = sx + sw * (k * 1.4 - 0.2), sg = g.createLinearGradient(bx - 140, 0, bx + 140, 0);   // the change sweeps across
    sg.addColorStop(0, 'rgba(255,220,190,0)'); sg.addColorStop(0.5, 'rgba(255,220,190,0.35)'); sg.addColorStop(1, 'rgba(255,220,190,0)'); g.fillStyle = sg; g.fillRect(sx, sy, sw, sh); }
  if (st === 'S7') {                                    // usage limit: the site dims, a red banner drops in
    const d = ss(clamp((t - ts) / 0.35)); g.fillStyle = `rgba(8,6,12,${0.55 * d})`; g.fillRect(x0, y0, pw, ph);
    const by = lerp(y0 - 120, y0 + 70, sio(d)); g.fillStyle = '#3a1416'; rr(g, x0 + 120, by, pw - 240, 110, 16); g.fill(); g.strokeStyle = '#ff6b5e'; g.lineWidth = 4; rr(g, x0 + 120, by, pw - 240, 110, 16); g.stroke();
    g.fillStyle = '#ff8a7e'; g.font = font(44, 800); g.fillText('⚠ Usage limit reached', x0 + 170, by + 42); g.fillStyle = '#d7b3b0'; g.font = font(24, 500); g.fillText('Resets at 3:00 AM · upgrade for more', x0 + 172, by + 84);
  }
  SET.tex.needsUpdate = true;
  SET.scrMat.color.setScalar(t >= B.usage ? lerp(1.25, 0.95, clamp((t - B.usage) / 0.5)) : 1.25);
}

const _hm = {};
function headMid(i) {            // Kai's head at the middle of shot i (framing anchor: no per-frame jitter, follows the stand/slump)
  if (!_hm[i]) { kai((CUTS[i] + CUTS[i + 1]) / 2, SHOTS[i]); _hm[i] = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0)); }
  return _hm[i];
}
// ---------------------------------------------------------------- cameras (fixed anchors per shot; slow push-in, tiny handheld drift)
// captions never on a head: each shot tilts up until the head tops (Kai's afro top, Clawd's band/dome) sit under the caption block
const CAP_CLEAR = 0.43, _lift = {}, _tc = new THREE.PerspectiveCamera(30, S.W / S.H, 0.01, 100);
const topsAt = (name) => { K.root.updateMatrixWorld(true); CL.group.updateMatrixWorld(true);
  const kt = K.bones.Head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.29, 0)), ct = CL.parts.torso.localToWorld(V(0, 8.3, 0));
  return /^K/.test(name) ? [kt] : /^C/.test(name) ? [ct] : [kt, ct]; };
function lift(i) {
  if (_lift[i] !== undefined) return _lift[i];
  _lift[i] = 0; let d = 0;
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
    case 'W': case 'WE': { tgt = V(-0.08, 0.5, -0.3); pos = push(V(-0.06, 0.42, 3.1), tgt, name === 'WE' ? PUSH.med : PUSH.wide); fov = 34; focus = MID; ap = DOF.wide; break; }
    case 'W2': tgt = V(-0.1, 0.55, -0.4); pos = push(V(-0.12, 0.6, 2.6), tgt, PUSH.wide); fov = 36; focus = MID; ap = DOF.wide; break;
    case 'KC': case 'KU': case 'KC3': { const H = headMid(i), up = name === 'KU' ? 0.07 : 0; tgt = H.clone().add(V(0, 0.02 + up, 0)); pos = push(H.clone().add(V(-0.3, -0.22, 1.9)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KX': { const H = headMid(i); tgt = H.clone().add(V(0, 0.02, 0)); pos = push(H.clone().add(V(-0.14, -0.2, 1.4)), tgt, PUSH.close); fov = 28; focus = H; ap = DOF.close; break; }
    case 'KP': { const H = headMid(i); tgt = H.clone().add(V(-0.08, 0.06, -0.2)); pos = push(H.clone().add(V(-0.18, -0.14, 1.65)), tgt, PUSH.close); fov = 30; focus = H; ap = DOF.close; break; }
    case 'KM': case 'KM2': { const H = headMid(i); tgt = H.clone().add(V(0, name === 'KM' ? -0.08 : -0.02, 0)); pos = push(H.clone().add(V(-0.15, name === 'KM' ? -0.2 : -0.18, name === 'KM' ? 1.9 : 2.2)), tgt, PUSH.med); fov = 32; focus = H; ap = DOF.med; break; }
    case 'CM': tgt = CFACE.clone().add(V(0.2, 0.06, 0)); pos = push(CFACE.clone().add(V(0.14, -0.12, 3.0)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med; break;
    case 'CC': tgt = CFACE.clone().add(V(0, 0.02, 0)); pos = push(CFACE.clone().add(V(0.16, -0.1, 2.1)), tgt, PUSH.close * 0.5); fov = 30; focus = CFACE; ap = DOF.close; break;
    case 'CCE': tgt = CFACE.clone().add(V(0, -0.02, 0)); pos = push(CFACE.clone().add(V(0.16, -0.1, 2.0)), tgt, PUSH.close * 0.8); fov = 30; focus = CFACE; ap = DOF.close; break;
    case 'CCD': tgt = CFACE.clone().add(V(0, 0.0, 0)); pos = push(CFACE.clone().add(V(0.14, -0.12, 1.1)), tgt, PUSH.close * 0.5); fov = 30; focus = CFACE; ap = DOF.close; roll = 0.22; break;
    case 'CS': tgt = CFACE.clone().add(V(-0.05, 0.3, -0.7)); pos = push(CFACE.clone().add(V(0.7, 0.05, 2.2)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.7; break;
    case 'CS2': tgt = CFACE.clone().add(V(0.15, 0.1, -0.3)); pos = push(CFACE.clone().add(V(-0.55, -0.12, 2.3)), tgt, PUSH.med); fov = 32; focus = CFACE; ap = DOF.med * 0.7; break;
  }
  pos.add(dr); tgt.y += lift(i);
  return { pos, tgt, fov, roll, focus: pos.distanceTo(focus), aperture: Number(Q.get('ap') || ap), shot: name, i };
}

// ---------------------------------------------------------------- captions: Morphy style (small white sans, centred, one line, mid-frame)
const CAP = VO_LINES.map((l, i) => { const nx = VO_LINES[i + 1];
  return { txt: l.text, s: l.s - 0.04, e: nx ? Math.min(nx.s - 0.04, l.e + 0.9) : T_END }; });
function captions(g, t) {
  if (Q.has('nocap')) return;
  const c = CAP.find(c => t >= c.s && t < c.e); if (!c) return;
  const H = g.canvas.height, Wd = g.canvas.width, fs = Math.round(H * 0.025), y = H * 0.36;
  g.save(); g.font = `600 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = c.txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (g.measureText(tr).width > Wd * 0.7 && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur);
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
  const k = kai(t, SHOTS[i]); const cl = clawd(t); drawSparks(t);
  if (Q.has('hide')) { K.holder.visible = false; CL.group.visible = false; }
  const s = camFor(t, i); s.k = k; return s;
}
window.__cues = () => [...WORK.map(([t]) => ({ t, kind: 'spark' })), { t: B.swap1, kind: 'swap' }, { t: B.swap2, kind: 'swap' }, { t: B.usage + 0.3, kind: 'down' }, { t: B.codex + 0.03, kind: 'eye' }];
window.__dbg = { topsAt, CAP, CAP_CLEAR, prep, CUTS, SHOTS, B, S_, K, CL, T_END, KHEAD, CFACE, LN, shotIdx, camera: S.camera, WORK, STATE_T };
S.run({ prep, T_END, overlay: (t) => captions(S.g2, t) });
