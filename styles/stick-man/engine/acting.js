// The automatic acting layer: blinks, expression timing, idle life, eyes on whatever is moving, settle springs.
// Nothing here is written in the reel data; all of it is a pure function of the frame and a per-actor seed.
import { hash, clamp, smooth, smoother, settle, rightB, fwdB, angDiff } from './verbs.js';
import { EXPR, mixFace } from './faces.js';

// ---------------------------------------------------------------- micro-animation timing (FORENSIC.md section 3)
// Reference head moves: 12-15 f, a slow start (7 % of the travel in the first eighth: 0.07 0.21 0.34 0.48 0.63 0.75 0.86 1),
// then a long hold that still breathes. slowIn is that spacing (0.07 at 1/8, 0.50 at 1/2, 0.93 at 7/8).
export const MOVE_T = 13;
export const slowIn = x => { x = clamp(x, 0, 1); return 0.5 * x + 0.5 * smoother(x); };
// a move with a small overshoot that settles back (follow-through): 1 + over at ~85 %, back to 1 at the end
export const slowInOver = (x, over = 0.06) => slowIn(x) + over * Math.sin(Math.PI * clamp((x - 0.55) / 0.6, 0, 1)) * (x < 1.15 ? 1 : 0);

// Blinks (face-research.md rule 12-13; Trutoiu 2011, Bentivoglio 1997). A blink closes fast and opens slowly; the value
// is how far the lid is down (0 open .. 1 shut) and multiplies over the expression's own lid (faces.js eye). regular 7 f
// = close 2, shut 1, open 4; fast 5 f (anxious, angry) = close 2, open 3; long 9 f (a change of thought, a big look) =
// close 3, shut 2, open 4. Was [1, 2, 2, 1]: 4 f, symmetric, every 15-45 f (~60 a minute, 3x the reference).
export const BLINKS = { regular: [0.5, 1, 1, 0.75, 0.5, 0.25, 0.1], fast: [0.5, 1, 0.66, 0.33, 0.1], long: [0.33, 0.66, 1, 1, 1, 0.75, 0.5, 0.25, 0.1] };
// free blinks come a seeded gap after the last blink of any kind: a speaker every 60-100 f, a listener every 90-150 f
// (~22 / ~15 a minute; people blink ~26 a minute talking, ~17 at rest; the reference ~22). One in ten is doubled.
export const BLINK_GAP = { talk: [60, 100], listen: [90, 150] }, DOUBLE_BLINK = 0.1;
export const blinkAt = (list, fr) => { let v = 0; for (const b of list) { const k = fr - b.f, S = BLINKS[b.shape] || BLINKS.regular; if (k >= 0 && k < S.length) v = Math.max(v, S[k]); } return v; };
// o: { forced: [{f, shape}] (blinks another layer draws, e.g. the change blinks of faceChanges: free blinks keep their
// distance), quiet: [[a, b)] (no free blink overlaps one: a take's anticipation, accent and hold), gap: [min, max],
// shapeAt: f -> BLINKS name }. An array is read as the old expression-swap frames.
export function blinkTrack(seed, f0, f1, o = {}) {
  if (Array.isArray(o)) o = { forced: o.map(f => ({ f: f - 1 })) };
  const F = (o.forced || []).slice().sort((a, b) => a.f - b.f), quiet = o.quiet || [], [g0, g1] = o.gap || BLINK_GAP.talk;
  const shapeAt = o.shapeAt || (() => 'regular'), out = [];
  const hit = (s, n) => quiet.find(([a, b]) => s < b && s + n > a);
  let last = f0 - Math.round(g0 * hash(seed, 7)), k = 0;
  for (let i = 0; ; i++) {
    let s = last + g0 + Math.round((g1 - g0) * hash(seed, i, 11));
    if (k < F.length && F[k].f < s + 20) { last = Math.max(last, F[k].f); k++; continue; }   // a forced blink is the next one
    if (s >= f1) break;
    const shape = shapeAt(s), n = BLINKS[shape].length;
    for (let q = hit(s, n); q; q = hit(s, n)) s = q[1];                                     // after the take, never inside it
    out.push({ f: s, shape }); last = s;
    if (hash(seed, i, 13) < DOUBLE_BLINK && !hit(s + n + 2, n)) { out.push({ f: s + n + 2, shape }); last = s + n + 2; }
  }
  return { starts: out.map(b => b.f), list: out, at: fr => blinkAt(out, fr) };
}

// [{f, expr}] sorted; the expression in force at frame f
export const exprAt = (track, f) => { let e = track[0]?.expr || 'neutral'; for (const k of track) if (k.f <= f) e = k.expr; else break; return e; };

// idle life: breathing, a slow head drift, hands that never freeze. Amplitudes in W units / degrees.
export function idle(seed, f, posture) {
  const a = 6.283 * hash(seed, 1), b = 6.283 * hash(seed, 2), c = 6.283 * hash(seed, 3);
  const sleep = posture === 'sit';
  const br = Math.sin(6.283 * f / (sleep ? 96 : 78) + a);
  return {
    bob: (sleep ? 0.040 : 0.010) * br,                                // a sleeper breathes deep and his head lolls
    head_tilt: (sleep ? 4.5 : 1.4) * Math.sin(6.283 * f / 101 + b) + 0.6 * Math.sin(6.283 * f / 43 + c),
    head_dx: 0.006 * Math.sin(6.283 * f / 67 + c),
    head_dv: (sleep ? 0.018 : 0.006) * br,
    hand: [0.012 * Math.sin(6.283 * f / 53 + a), 0.010 * Math.sin(6.283 * f / 37 + b), 0.008 * Math.sin(6.283 * f / 61 + c)],
    shrug: (sleep ? 0.010 : 0.014) * Math.max(-0.4, br),           // the in-breath lifts the shoulders; the out-breath drops less
    snore: sleep && br > 0.55,
  };
}

// micro saccades: every 12-30 frames the gaze steps a little off the target and back, 2-frame moves
export function saccade(seed, f) {
  let t = 0, i = 0, prev = [0, 0];
  while (true) {
    const gap = 12 + Math.round(18 * hash(seed, i, 23));
    const cur = [0.10 * (hash(seed, i, 29) - 0.5), 0.25 * (hash(seed, i, 31) - 0.5)];
    if (f < t + gap) { const u = smoother((f - t) / 2); return [prev[0] + (cur[0] - prev[0]) * u, prev[1] + (cur[1] - prev[1]) * u]; }
    t += gap; i++; prev = cur;
  }
}

// focus: explicit look_at segments, overridden by props in motion (the hand that moves one, and everyone watching)
export function focusAt(actor, f, focus, active) {
  let best = null;
  for (const a of active) if (f >= a.from && f < a.to && (a.by === actor.name || actor.watch !== false) && (!best || a.from > best.from)) best = a;
  if (best) return { key: 'prop:' + best.prop, prop: best.prop, from: best.from };
  let seg = null;
  for (const s of focus) if (s.from <= f) seg = s;
  const t = seg ? seg.target : actor.focus;
  return { key: String(t), target: t, from: seg ? seg.from : -1e9, cut: !!seg?.cut };
}

// a focus change, d frames after it (rule 14): the pupils dart there in GAZE_T frames, the head starts HEAD_LAG frames
// later and turns over HEAD_T frames (eyes lead, the heavier head lags 20-40 ms: Bizzi 1971). 0..1 each.
export const HEAD_LAG = 2, HEAD_T = 5;
export const focusEase = d => ({ eye: smoother(clamp((d + 1) / 3, 0, 1)), head: smoother(clamp((d + 1 - HEAD_LAG) / HEAD_T, 0, 1)) });

// face slide (look, look_v) from the head toward a world point, in the figure's own frame
export function gaze(headB, yaw, pB) {
  const d = [pB[0] - headB[0], pB[1] - headB[1], pB[2] - headB[2]], R = rightB(yaw), F = fwdB(yaw);
  const u = d[0] * R[0] + d[1] * R[1], z = d[0] * F[0] + d[1] * F[1];
  const ang = Math.atan2(u, Math.max(z, -0.3)), elev = Math.atan2(d[2], Math.hypot(u, z));
  return [clamp(ang / 0.85, -1.05, 1.05), clamp(elev / 0.25, -1.6, 1.6)];
}

// ---------------------------------------------------------------- the body acts (every reel gets this for free)
// Idle beats: every 36-75 frames (seeded per actor) the body moves to a new pose in MOVE_T frames with a slow start and
// a small overshoot, then HOLDS it (the hold still breathes: idle()). A weight shift, a look, or a hand move leads (the
// other two follow at under half size). The runtime staggers the channels (head first, body 2 f, arms 4 f later), so
// the head leads and the limbs follow through. Values add onto the pose keys (W, deg; arm = FK fwd/out/flex).
// (Was: a new small pose every 12-24 f held 1-3 f, a constant fidget: no head hold >= 6 f in the test scene.)
const IDLE_T0 = -400;
function beatPose(seed, i) {
  // the weight goes side to side (alternating), the rest is seeded; a value is 0.5-1 of its range so every beat moves
  const h = k => 2 * hash(seed, i, k) - 1, a = k => (h(k) < 0 ? -1 : 1) * (0.5 + 0.5 * Math.abs(h(k + 100))), alt = i % 2 ? 1 : -1;
  const kind = Math.floor(3 * hash(seed, i, 40)), big = k => (kind === k ? 1 : 0.45);
  return { dx: 0.14 * alt * (0.6 + 0.4 * Math.abs(h(41))) * big(0), lean: 4.5 * alt * big(0), hipTwist: 7 * a(43) * big(0), bob: -0.020 * Math.abs(h(54)) * big(0),
    head_tilt: 8 * a(44) * big(1), head_dx: 0.05 * a(45) * big(1), head_pitch: 7 * a(46) * big(1), look: 0.30 * a(47) * big(1),
    L: [14 * a(48) * big(2), 7 * a(49) * big(2), 24 * a(50) * big(2)], R: [14 * a(51) * big(2), 7 * a(52) * big(2), 24 * a(53) * big(2)] };
}
const mixPose = (a, b, u) => Object.fromEntries(Object.keys(a).map(k => [k, Array.isArray(a[k]) ? a[k].map((x, j) => x + (b[k][j] - x) * u) : a[k] + (b[k] - a[k]) * u]));
export const idleGap = (seed, i) => 48 + Math.round(52 * hash(seed, i, 61));   // holds of 35-87 f between idle moves (reference holds up to 86 f)
export function idleBeats(seed, f) {
  let t = IDLE_T0 + Math.round(20 * hash(seed, 60)), i = 0;
  for (;;) {
    const gap = idleGap(seed, i);
    if (f < t + gap) return mixPose(beatPose(seed, i - 1), beatPose(seed, i), slowInOver((f - t) / MOVE_T, 0.05));
    t += gap; i++;
  }
}

// The moving hold of a figure animated from keys (motion.js playActor adds it while the keys hold). Degrees on the spine,
// neck and pelvis, W on bob and hip.x. Breath: one cycle every 90-120 f (3-4 s, a person at rest), the chest bends
// 1.6 deg and the head nods a third of it back. Head drift: two octaves per axis, the second half the size at about twice
// the rate, periods and phases seeded per figure so two figures never move in step (one sine reads mechanical). Weight
// shifts: a new small pose every 40-80 f, moved in MOVE_T frames with no kick (smoother): the hips 4 cm side to side, the
// spine against them, a glance; the head follows the body HOLD_LAG frames late (overlap). Sized so a locked-camera hold
// reads like the Rick clips' holds (styles/stick-man/bench: motion while the camera is still).
export const HOLD_LAG = 3;
function holdBeat(seed, i) {
  const h = k => 2 * hash(seed, i, k) - 1, alt = i % 2 ? 1 : -1, w = 0.6 + 0.4 * Math.abs(h(80));
  return { hip: 0.07 * alt * w, side: 3.5 * alt * w, roll: -2 * alt * w, tilt: -3.5 * alt * w + 1.2 * h(81), turn: 7 * h(82), nod: 2.5 * h(83) };
}
function holdBeatAt(seed, f) {
  let t = IDLE_T0 + Math.round(20 * hash(seed, 79)), i = 0;
  for (;;) {
    const gap = 40 + Math.round(40 * hash(seed, i, 78));
    if (f < t + gap) return mixPose(holdBeat(seed, i - 1), holdBeat(seed, i), smoother((f - t) / MOVE_T));
    t += gap; i++;
  }
}
export function holdLife(seed, f) {
  const ph = k => 6.283 * hash(seed, k), per = (k, T) => T * (0.85 + 0.3 * hash(seed, k));
  const br = Math.sin(6.283 * f / (90 + 30 * hash(seed, 71)) + ph(72));
  const oct = (k, A, T) => A * Math.sin(6.283 * f / per(k, T) + ph(k + 1)) + 0.5 * A * Math.sin(6.283 * f / per(k + 2, 0.47 * T) + ph(k + 3));
  const b = holdBeatAt(seed, f), bh = holdBeatAt(seed, f - HOLD_LAG);
  return { 'spine.bend': 1.6 * br, bob: 0.007 * br, 'hip.x': b.hip, 'spine.side': b.side + oct(91, 1.0, 150), 'pelvis.roll': b.roll,
    'neck.nod': -0.5 * br + oct(73, 1.3, 67) + bh.nod, 'neck.tilt': oct(77, 2.0, 101) + bh.tilt, 'neck.turn': oct(85, 2.6, 89) + bh.turn };
}

// An expression change comes with a body accent on the same frame: a head lift or dip, a shoulder shrug, a tilt. Every
// take and fast face has one (rule 10; it was missing for panic, scream, pain, angry and furious).
const ACCENT = {
  shock: { head_dv: 0.05, head_pitch: -9, shrug: 0.08, pitch: -4 },
  scream: { head_dv: 0.06, head_pitch: -12, shrug: 0.10, pitch: -5 },
  panic: { head_dv: 0.04, head_pitch: -6, shrug: 0.10, tilt: 6 },
  pain: { head_dv: -0.03, head_pitch: 8, shrug: 0.08, tilt: 6 },
  angry: { head_pitch: 7, head_dv: -0.02, shrug: 0.04, lean: 3 }, furious: { head_pitch: 9, head_dv: -0.03, shrug: 0.07, lean: 4 },
  manic: { head_dv: 0.04, head_pitch: -6, tilt: 9 }, laugh: { head_dv: 0.03, head_pitch: -8, shrug: 0.05, tilt: 5 },
  excited: { head_dv: 0.05, head_pitch: -6, shrug: 0.06 },
  sad: { head_pitch: 9, head_dv: -0.03, shrug: -0.03, tilt: 5 }, suspicious: { head_pitch: 4, tilt: -7, lean: -2 },
  worried: { shrug: 0.07, head_pitch: 6, head_dv: -0.02, tilt: 5 },
  happy: { head_dv: 0.03, shrug: 0.03, tilt: 7 }, grin: { head_dv: 0.03, shrug: 0.04, tilt: 7, pitch: -2 },
  closed: { head_pitch: 7, head_dv: -0.02, tilt: 6 }, calm: { head_pitch: 4, tilt: 4 },
  smug: { head_pitch: -5, tilt: 8, lean: 2 }, sly: { head_pitch: 3, tilt: -8, lean: -2 },
  stern: { head_pitch: 8, head_dv: -0.03, shrug: -0.02 }, neutral: { head_pitch: 4, head_dv: -0.015 },
};
// The accent is an attitude, not a twitch. Normal / slow change: a 3-frame anticipation the other way, a MOVE_T slow-in
// rise with a small overshoot. Fast change: 2 f anticipation, a 6 f rise. Take: the take's own phases (dip in the
// anticipation, up on ones on the face's accent frames, hold, settle on twos), so face and head hit together (ASK p. 286).
// Small take: no anticipation, a third of the size. Held (breathing) until the next change or ACC_HOLD frames, then
// released over ACC_OUT frames. 1.6x the old size (FORENSIC: the reference's big beats travel ~2.3 W).
const ACC_A = 3, ACC_HOLD = 60, ACC_OUT = 24, ACC_K = 2.0, ACC_DIP = 0.3, SMALL_K = 0.3;
const easeOut = x => 1 - (1 - clamp(x, 0, 1)) ** 2;
const twos = (a, n) => clamp((a - (a % 2) + 2) / n, 0, 1);                 // on twos: a new value every 2nd frame
function accentEnv(c, a) {
  if (c.cls === 'take') {
    const { accent, hold, settle, over } = TAKE, A = c.antic;
    if (a < -A) return null;
    if (a < 0) return -ACC_DIP * smooth(twos(a + A, A));
    if (a < accent) return -ACC_DIP + (1 + over + ACC_DIP) * easeOut((a + 1) / accent);
    if (a < accent + hold) return 1 + over;
    return 1 + over * (1 - smooth(twos(a - accent - hold, settle)));
  }
  if (c.cls === 'small') { const { accent, total, over } = SMALL_TAKE; if (a < 0) return null;
    return SMALL_K * (a < accent ? (1 + over) * easeOut((a + 1) / accent) : 1 + over * (1 - slowIn((a - accent + 1) / (total - accent)))); }
  const fast = c.cls === 'fast', A = fast ? 2 : ACC_A, T = fast ? FACE_TIMING.fast.T : c.cls === 'slow' ? FACE_TIMING.slow.T : MOVE_T, d = a + A;
  if (d < 0) return null;
  return d < A ? -0.15 * smooth(d / A) : -0.15 + 1.15 * slowInOver((d - A) / T, 0.08 / 1.15);
}
export function exprAccent(track, f, seed) {
  const o = {}, list = faceChanges(track);
  for (const c of list) {
    const A = ACCENT[baseOf(c.to)]; if (!A) continue;
    const a = f - c.kf, env = accentEnv(c, a); if (env == null) continue;
    const next = list[c.i + 1], end = Math.min(next ? next.kf - c.kf : 1e9, ACC_HOLD);
    if (a >= end + ACC_OUT) continue;
    const e = ACC_K * env * (a > end ? 1 - slowIn((a - end) / ACC_OUT) : 1);
    const sg = hash(seed, c.kf, 71) < 0.5 ? -1 : 1;
    for (const [n, v] of Object.entries(A)) { const key = n === 'tilt' ? 'head_tilt' : n; o[key] = (o[key] || 0) + v * e * (n === 'tilt' || n === 'lean' ? sg : 1); }
  }
  return o;
}

// A hand action pulls the body: the torso leans and twists toward the busy hand, the weight goes onto the near leg,
// the free arm counter-swings, and the head follows a few frames late (it counter-tilts first, then catches up).
// off{L,R} = busy hand minus its rest spot (figure-local W, already weighted by how busy the hand is); late = the same
// LATE frames earlier. Returns pose-key adds plus arm{L,R} FK adds for a resting arm.
export const LATE = 4;
function lean3(oL, oR) {
  const u = oL[0] + oR[0], v = oL[1] + oR[1], z = oL[2] + oR[2];
  return { lean: clamp(9 * u, -8, 8), pitch: clamp(8 * Math.max(0, z) - 5 * Math.max(0, v - 0.7), -5, 9), shTwist: clamp(16 * (oR[2] - oL[2]), -14, 14),
    dx: clamp(0.10 * u, -0.06, 0.06), hipTwist: clamp(5 * (oR[2] - oL[2]), -5, 5) };
}
export function bodyFollow(off, late) {
  const a = lean3(off.L, off.R), b = lean3(late.L, late.R);
  const o = { ...a, head_tilt: -0.9 * (a.lean - b.lean), head_pitch: -0.8 * (a.pitch - b.pitch) + 4 * clamp(-(late.L[1] + late.R[1]), 0, 1), arm: {} };
  for (const [s, other, sg] of [['L', 'R', -1], ['R', 'L', 1]]) {
    const q = off[other];                                          // the free arm swings back against the busy one
    o.arm[s] = { fwd: clamp(-14 * q[2], -12, 6), out: clamp(6 * Math.abs(q[0]) + 4 * Math.max(0, q[1]), 0, 8), flex: clamp(10 * Math.hypot(...q), 0, 14) };
  }
  return o;
}

// sum of settle springs after impacts / stops: [{f, amp}]
export const springs = (events, f) => events.reduce((s, e) => s + e.amp * settle(f - e.f), 0);

export { angDiff };

// ---------------------------------------------------------------- faces lead the voice, marks, body acting (q2)
// An expression change lands EXPR_LEAD frames before its word (the face reads first, then the sound): a beat's expr
// frame = min(beat frame, word start - EXPR_LEAD). Gate: GATES.md "Acting gates" (>= 3 frames before the word).
export const EXPR_LEAD = 4;
// the expression key in force at f, with when it began and the word it belongs to
export const exprKeyAt = (track, f) => { let k = track[0] || { f: -1e9, expr: 'neutral' }; for (const x of track) if (x.f <= f) k = x; else break; return k; };

// a beat's `mark: 'question'` (or [kind, frames]) shows a head-attached emotion mark (faces.js MARK_NAMES) for `dur` frames
export function markOwner(b) {
  const [kind, dur] = Array.isArray(b.mark) ? b.mark : [b.mark, b.markDur ?? 36], t0 = b.at;
  return { chan: 'add', start: t0, verb: 'mark', fn: f => (f >= t0 && f < t0 + dur ? { ['x_mark_' + kind]: f - t0 + 1 } : {}) };
}

// Which verbs count as the body acting (the acting gate: >= 70 % of a lead's on-screen frames). Head-only and set-up
// verbs do not: idle, talk, look_at, place, hold, mark, and the nod / tilt gestures.
const NOT_BODY = new Set(['idle', 'talk', 'look_at', 'place', 'hold', 'mark', 'stand']);
export const isBodyVerb = v => !NOT_BODY.has(v.name) && !(v.name === 'gesture' && (v.kind === 'nod' || v.kind === 'tilt'));

// Auto-acting: every lead's frames that no body verb covers get key poses picked from the words spoken there (then the
// face in force, then a default rotation), one pose per ~1.3 s, each one released as the next one rises. Explicit beats
// always win: a gap is the time between them. A lead = cast `lead: true`, or a `talk` beat, or a shot subject
// (`lead: false` opts out). Turn it off per act with `auto: false`.
const TEXT_POSES = [
  [/^(whisper\w*|quiet\w*|secret\w*|hush|soft\w*|barely|tickle\w*|shh)$/, ['lean_in', 'shush', 'tiptoe']],
  [/^(hear|heard|hears|listen\w*|ears?|sound\w*|hearing)$/, ['cup_ear', 'lean_in']],
  [/^(loud\w*|boom\w*|bang|blast\w*|explod\w*|roar\w*|honk\w*|nois\w*|scream\w*|yell\w*)$/, ['cover_ears', 'recoil', 'brace', 'cower']],
  [/^(threshold|pain\w*|hurt\w*|damag\w*|ouch|ache)$/, ['clutch', 'cover_ears', 'facepalm']],
  [/^(rock|concert\w*|party|cheer\w*|win\w*|yes|best|fun)$/, ['celebrate']],
  [/^(think\w*|thought|wonder\w*|idea|why|how|maybe|guess\w*)$/, ['think']],
  [/^(big|bigger|huge|massive|ten|times|power\w*|every|more|levels?|five|whole)$/, ['arms_wide', 'present']],
  [/^(miles?|away|far|distance|across|world|island|volcano\w*|sea)$/, ['shade_eyes', 'point_lean']],
  [/^(police|chief|officer|boss|guard\w*|cannons?|fire)$/, ['hands_on_hips', 'arms_crossed']],
  [/^(talk\w*|say\w*|said|tell\w*|told|ask\w*|chat\w*|conversation)$/, ['present', 'lean_in']],
  [/^(decibels?|db|hundred|thousand|eighty\S*|sixty|thirty|seventy|twenty|forty|fifty|ninety|number\w*)$/, ['present', 'point_lean', 'arms_wide']],
  [/^(city|traffic|cars?|streets?|hours?)$/, ['hands_on_hips', 'brace']],
];
const EXPR_POSES = { panic: ['flail', 'cower'], scream: ['flail', 'cower'], angry: ['hands_on_hips', 'arms_crossed'], furious: ['hands_on_hips'],
  shock: ['recoil', 'lean_away'], worried: ['brace', 'shrug'], smug: ['arms_crossed', 'hands_on_hips'], sly: ['lean_in', 'arms_crossed'],
  happy: ['present', 'shrug'], grin: ['present', 'hands_on_hips'], excited: ['celebrate'], dizzy: ['wobble'], pain: ['clutch', 'cover_ears'],
  sad: ['shrug'], cry: ['facepalm'], confused: ['think', 'shrug'], blush: ['shrug'], proud: ['hands_on_hips'], nervous: ['shrug', 'lean_away'],
  suspicious: ['arms_crossed', 'think'], deadpan: ['arms_crossed'], manic: ['flail', 'laugh'], closed: ['laugh', 'shrug'],
  laugh: ['laugh', 'celebrate'], skeptic: ['arms_crossed', 'think'], bored: ['arms_crossed', 'hands_on_hips'] };   // names added by the face rebuild
const DEFAULT_POSES = ['hands_on_hips', 'present', 'arms_crossed', 'shrug', 'think', 'lean_in'];
const norm = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
export function autoActing({ R, actors, words, fps, win }) {
  if (R.auto === false) return [];
  const out = [], subj = new Set((R.shots || []).flatMap(s => s.of || []));
  for (const a of actors) {
    a.lead = a.c.lead ?? (a.verbs.some(v => v.name === 'talk') || subj.has(a.name));
    if (!a.lead) continue;
    const busy = a.verbs.filter(isBodyVerb).map(v => [v.start, v.end]).sort((x, y) => x[0] - y[0]);
    for (const [wa, wb] of win) {
      let cur = wa - 12, prevPose = null, i = 0;
      const gaps = [];
      for (const [s, e] of busy) { if (e <= cur) continue; if (s > cur) gaps.push([cur, Math.min(s, wb), s < wb]); cur = Math.max(cur, e); if (cur >= wb) break; }
      if (cur < wb) gaps.push([cur, wb, false]);
      for (const [g0, g1, closes] of gaps) {
        const len = g1 - g0; if (len < 18) continue;
        const n = Math.max(1, Math.round(len / 48)), L = len / n;          // fewer, bigger poses, held longer
        for (let k = 0; k < n; k++) {
          const s = Math.round(g0 + k * L), e = Math.round(g0 + (k + 1) * L);
          const said = words.filter(w => w.t1 * fps > s && w.t0 * fps < e + 6).map(w => norm(w.word));
          const ex = exprKeyAt(a.exprs, s + 10).expr, cand = [];
          for (const w of said) for (const [re, ps] of TEXT_POSES) if (re.test(w)) cand.push(...ps);
          cand.push(...(EXPR_POSES[ex] || []), ...DEFAULT_POSES.slice((a.seed + i) % DEFAULT_POSES.length), ...DEFAULT_POSES);
          const pose = cand.find(c => c !== prevPose) || DEFAULT_POSES[0];
          const A = 4, T = MOVE_T, last = k === n - 1, Rl = 14;
          // the last pose before an explicit verb releases 3 frames before it: that verb's hands then take over from the
          // pose (never from a hand already on its way down, which would reverse the arm)
          const hold = Math.max(4, (e - s) - A - T - (last && closes ? 3 : 0));
          const hl = (a.holdLog || []).filter(h => h.f <= s).pop() || { L: null, R: null };
          const other = actors.find(o => o !== a);
          out.push({ f: s, who: a.name, do: pose, hold, dur: T, antic: A, out: Rl, hand: hash(a.seed, i, 91) < 0.3 ? 'L' : 'R',
            busy: { L: !!hl.L, R: !!hl.R }, ...(pose === 'point_lean' ? { to: other ? other.st0 : [a.st0[0] + 1, a.st0[1] - 2, 1.5] } : {}), auto: true });
          prevPose = pose; i++;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- the face, frame by frame (micro-animation layer)
// Visemes: the mouth follows the letters of each spoken word (a cheap phoneme guess, good enough for a cartoon): vowels
// open (a widest, e / i wide, o / u round), m b p close, f v show teeth, the rest half-open. Keys sit at the middle of
// each sound, spread over the word (vowels take twice as long), the mouth leads the sound by 1 frame, closes in pauses
// longer than 2 frames, and a 3-tap filter in-betweens every frame. Stressed words (the longest, or with ! / ?) open
// 1.25x. Returns f -> {open, wide, round, teeth} (open 0 = closed).
const V = { a: { open: 0.95, wide: 0.6 }, e: { open: 0.55, wide: 0.9 }, i: { open: 0.45, wide: 1 }, o: { open: 0.75, round: 1 },
  u: { open: 0.5, round: 1 }, w: { open: 0.22, round: 1 }, m: { open: 0 }, f: { open: 0.12, teeth: 1 }, th: { open: 0.2, wide: 0.4 },
  sh: { open: 0.28, round: 0.5 }, c: { open: 0.3, wide: 0.5 } };
const LET = ch => 'a'.includes(ch) ? 'a' : 'ei'.includes(ch) ? (ch === 'e' ? 'e' : 'i') : 'o' === ch ? 'o' : 'u' === ch ? 'u' : 'w' === ch ? 'w'
  : 'mbp'.includes(ch) ? 'm' : 'fv'.includes(ch) ? 'f' : 'c';
export function phonemes(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return [];
  if (w.length > 3 && w.endsWith('e') && !/[aeiou]e$/.test(w)) w = w.slice(0, -1);       // silent final e
  w = w.replace(/ee|ea|ie/g, 'E').replace(/oo|ou/g, 'O').replace(/ai|ay/g, 'A').replace(/th/g, 'T').replace(/sh|ch/g, 'S').replace(/y$/, 'i');
  const o = [];
  for (const ch of w) {
    const k = ch === 'E' ? 'e' : ch === 'O' ? 'u' : ch === 'A' ? 'a' : ch === 'T' ? 'th' : ch === 'S' ? 'sh' : LET(ch);
    if (o.length && o[o.length - 1] === k && k === 'c') continue;                         // runs of consonants: one shape
    o.push(k);
  }
  return o;
}
export function visemeTrack(words, fps, lines) {
  const ws = words.filter(w => !lines || lines.includes(w.line));
  if (!ws.length) return () => null;
  const longest = Math.max(...ws.map(w => w.t1 - w.t0)), keys = [];
  for (let j = 0; j < ws.length; j++) {
    const w = ws[j], a = w.t0 * fps - 1, b = w.t1 * fps - 1, ph = phonemes(w.word); if (!ph.length) continue;
    const stress = (/[!?]/.test(w.word) || w.t1 - w.t0 >= longest - 1e-6) ? 1.25 : 1;
    const wt = ph.map(p => ('aeiou'.includes(p) ? 2 : 1)), tot = wt.reduce((x, y) => x + y, 0);
    let c = a; keys.push({ f: a - 1.5, open: 0 });
    ph.forEach((p, i) => { const d = (b - a) * wt[i] / tot, v = V[p]; keys.push({ f: c + d / 2, open: (v.open || 0) * stress, wide: v.wide || 0, round: v.round || 0, teeth: v.teeth || 0 }); c += d; });
    const nx = ws[j + 1]; if (!nx || nx.t0 * fps - 1 - b > 2) keys.push({ f: b + 1.5, open: 0 });
  }
  keys.sort((x, y) => x.f - y.f);
  const raw = f => {
    if (f <= keys[0].f || f >= keys[keys.length - 1].f) return { open: 0, wide: 0, round: 0, teeth: 0 };
    let i = 0; while (keys[i + 1].f < f) i++;
    const p = keys[i], q = keys[i + 1], u = smooth((f - p.f) / Math.max(1e-6, q.f - p.f));
    return Object.fromEntries(['open', 'wide', 'round', 'teeth'].map(k => [k, (p[k] || 0) + ((q[k] || 0) - (p[k] || 0)) * u]));
  };
  const f0 = keys[0].f - 2, f1 = keys[keys.length - 1].f + 2;
  return f => {
    if (f < f0 || f > f1) return null;
    const a = raw(f - 0.5), b = raw(f), c = raw(f + 0.5);
    return Object.fromEntries(Object.keys(b).map(k => [k, 0.25 * a[k] + 0.5 * b[k] + 0.25 * c[k]]));
  };
}

// ---------------------------------------------------------------- the face, change by change (face-research.md section 10)
// Every expression key starts a change of one class:
//   take    shock / scream / panic from a non-take face: anticipation TAKE.antic f before the key (on twos: lids squint,
//           brows drop, mouth shuts, head dips), accent on ones from the key to an overshoot, a hold at the extreme, a
//           settle on twos (ASK pp. 284-286). Frightened eyes stay open: no blink in the anticipation, accent or hold.
//   small   a key with `small: true`: the Rathbone take, no anticipation, a 4 f accent cushioned to 10 f (ASK p. 292).
//   fast    6 f, overshoot 0.10: pain, furious, angry, manic, laugh, excited, and take -> take.
//   normal  10 f, soft overshoot 0.04. slow 16 f: sad, bored, sleep, cry, and a tense face (take / fast) released
//           into a calm one.
//   cut     a key with `cut` (an `ease: 'snap'` anim key): the new face is already there.
// A key overrides with `take: true | false`, `small: true` or `exprSpeed: 'fast' | 'normal' | 'slow'`.
// Inside a normal / slow / fast change the features overlap (ASK p. 249, frames from the key): pupils 1 f early in 3 f,
// brows on the key over T, lids and eye size 1 f late (T - 2), mouth 2 f late (T + 2); the head accent's anticipation
// starts 3 f early (exprAccent). A normal / slow change opens out of a blink that starts 1 f before the key (when the
// eye kind changes, or FORCED_BLINK_GAP frames after the last forced one); a change of eye kind swaps on the shut
// frame (a fast change hides it in a fast blink), a change of mouth kind on the gasp's peak. A new change always starts
// from the face on screen (rule 1): the mixed face of the change it interrupts, never that change's target (the SH240
// pop).
const baseOf = e => String(e || 'neutral').replace(/_[oO]$/, '');
export const FACE_CLASS = {
  take: new Set(['shock', 'scream', 'panic']),
  fast: new Set(['pain', 'furious', 'angry', 'manic', 'laugh', 'excited']),
  slow: new Set(['sad', 'bored', 'sleep', 'cry']),
  calm: new Set(['neutral', 'calm', 'happy', 'grin', 'closed', 'deadpan', 'smug', 'proud', 'blush', 'sleep', 'bored', 'sad']),
};
export const FACE_T = 10;
const LAG = { gaze: -1, brow: 0, lid: 1, mouth: 2 }, LEN = { brow: 0, lid: -2, mouth: 2 };
export const FACE_TIMING = {
  fast: { T: 6, over: 0.10, lag: { gaze: -1, brow: 0, lid: 0, mouth: 1 }, len: { brow: 0, lid: 0, mouth: 0 } },
  normal: { T: FACE_T, over: 0.04, lag: LAG, len: LEN },
  slow: { T: 16, over: 0.04, lag: LAG, len: LEN },
};
export const TAKE = { antic: 5, accent: 4, hold: 3, settle: 8, over: 0.20 }, SMALL_TAKE = { accent: 4, total: 10, over: 0.10 };
export const GAZE_T = 3, FORCED_BLINK_GAP = 60;
// kept for older callers: a take's accent length, the take faces
export const TAKE_T = TAKE.accent, TAKES = FACE_CLASS.take, FACE_SPEED = { take: TAKE_T, gaze: GAZE_T };

export function changeClass(from, k) {
  const to = baseOf(k.expr), fr = baseOf(from), takeFace = FACE_CLASS.take.has(to);
  if (k.cut) return 'cut';
  if (k.small) return 'small';
  if (k.take === true || (k.take !== false && takeFace && !FACE_CLASS.take.has(fr))) return 'take';
  if (k.exprSpeed) return k.exprSpeed;
  if (takeFace || FACE_CLASS.fast.has(to)) return 'fast';
  if (FACE_CLASS.slow.has(to) || ((FACE_CLASS.take.has(fr) || FACE_CLASS.fast.has(fr)) && FACE_CLASS.calm.has(to))) return 'slow';
  return 'normal';
}
const eyeKind = e => (EXPR[e] || EXPR[baseOf(e)] || EXPR.neutral).eye;
const MEMO = new WeakMap();
// the changes of an expression track ([{f, expr, cut?, take?, small?, exprSpeed?}] sorted by f): { i, kf (key frame),
// s (first frame anything moves), from, to, cls, antic, end (the face is exactly `to` from here), quiet ([a, b): no free
// blink), blink ({f, shape} | null), swap (frame the eye kind swaps, or null: swap inside the squeeze) }
export function faceChanges(track) {
  const m = MEMO.get(track); if (m && m.n === track.length && m.last === track[track.length - 1]) return m.list;
  const list = []; let from = track[0]?.expr || 'neutral', lastBlink = -1e9;
  for (let j = 1; j < track.length; j++) {
    const k = track[j]; if (k.expr === from) continue;
    const cls = changeClass(from, k), kf = k.f, prev = list[list.length - 1];
    let s = cls === 'take' ? kf - TAKE.antic : cls === 'cut' || cls === 'small' ? kf : kf + FACE_TIMING[cls].lag.gaze;
    if (prev) s = Math.min(Math.max(s, prev.s + 1), Math.max(kf, prev.s + 1));
    const c = { i: list.length, key: k, kf, s, from, to: k.expr, cls, antic: cls === 'take' ? kf - s : 0, quiet: null, blink: null, swap: null };
    if (cls === 'cut') c.end = kf;
    else if (cls === 'take') { c.end = kf + TAKE.accent + TAKE.hold + TAKE.settle; c.quiet = [s, kf + TAKE.accent + TAKE.hold]; c.swap = kf; }
    else if (cls === 'small') { c.end = kf + SMALL_TAKE.total; c.quiet = [kf, kf + SMALL_TAKE.accent]; c.swap = kf; }
    else {
      const t = FACE_TIMING[cls];
      c.end = kf + Math.max(...['brow', 'lid', 'mouth'].map(g => t.lag[g] + Math.ceil(1.15 * (t.T + t.len[g])))) + 1;
      const kinds = eyeKind(from) !== eyeKind(k.expr);
      // a fast change blinks only to hide a change of eye kind (a fast 5 f blink: its shut frame is the key)
      if (kinds || (cls !== 'fast' && kf - 1 - lastBlink >= FORCED_BLINK_GAP)) { c.blink = { f: kf - 1, shape: cls === 'slow' ? 'long' : cls === 'fast' ? 'fast' : 'regular' }; lastBlink = kf - 1; }
      if (kinds) c.swap = cls === 'fast' ? kf : kf + 1;                     // the shut frame of the change blink
    }
    list.push(c); from = k.expr;
  }
  MEMO.set(track, { n: track.length, last: track[track.length - 1], list });
  return list;
}
// the change on screen at f (the last one that has started), or null
export function changeAt(track, f) { let c = null; for (const x of faceChanges(track)) if (x.s <= f) c = x; else break; return c; }

// the face of change c at frame f, without hold drift or lip-sync
function changeState(track, c, f) {
  const a = f - c.kf, b = c.to;
  if (f >= c.end) return { a: b, b, u: 1, ug: 1, phase: 'hold', change: c };
  const from = fromOf(track, c), base = { a: from, b, change: c, squeeze: false, swapEye: c.swap == null ? null : f >= c.swap };
  if (c.cls === 'take') {
    const { accent, hold, settle, over } = TAKE;
    if (a < 0) return { ...base, u: 0, ug: 0, antic: smooth(twos(a + c.antic, c.antic)), phase: 'antic' };
    if (a < accent) { const u = (1 + over) * easeOut((a + 1) / accent); return { ...base, u, ug: clamp((a + 1) / 2, 0, 1), antic: 1 - (a + 1) / accent, phase: 'accent' }; }
    if (a < accent + hold) return { ...base, u: 1 + over, ug: 1, phase: 'hold' };
    return { ...base, u: 1 + over * (1 - smooth(twos(a - accent - hold, settle))), ug: 1, phase: 'settle' };
  }
  if (c.cls === 'small') {
    const { accent, total, over } = SMALL_TAKE;
    const u = a < accent ? (1 + over) * easeOut((a + 1) / accent) : 1 + over * (1 - slowIn((a - accent + 1) / (total - accent)));
    return { ...base, u, ug: clamp((a + 1) / 2, 0, 1), phase: a < accent ? 'accent' : 'settle' };
  }
  const t = FACE_TIMING[c.cls], g = n => slowInOver((a + 1 - t.lag[n]) / (t.T + t.len[n]), t.over);
  const uf = { gaze: slowIn((a + 1 - t.lag.gaze) / GAZE_T), brow: g('brow'), lid: g('lid'), mouth: g('mouth') };
  return { ...base, u: uf.brow, ug: uf.gaze, uf, phase: 'change' };
}
// where change c starts from: the face on screen the frame before it moves. A finished change gives its expression
// name; an unfinished one gives its mixed face (faces.js mixFace accepts either as `a`)
function fromOf(track, c) {
  if ('from0' in c) return c.from0;
  const list = faceChanges(track), p = list[c.i - 1], g = c.s - 1;
  if (!p || g >= p.end) c.from0 = c.from;
  else { const { F } = mixFace(changeState(track, p, g)); c.from0 = { ...F, name: c.from }; }
  return c.from0;
}

// The face state at frame f (faces.js mixFace draws it): a, b (from / to: a name, or a mixed face for a), u (the brow
// clock, the main one), uf ({gaze, brow, lid, mouth}: each feature's own clock), ug (gaze), antic (0..1: the take's
// anticipation), swapEye, squeeze, blink (the change blink, 0..1), phase, change; in a hold the brows, lids and mouth
// width drift on slow seeded sines, so a held face is alive but never twitches.
export function faceStateAt(track, f, seed, talk = null) {
  const k = exprKeyAt(track, f), c = changeAt(track, f);
  const st = c ? changeState(track, c, f) : { a: k.expr, b: k.expr, u: 1, ug: 1, phase: 'hold', change: null };
  let blink = 0;
  if (c) for (const x of faceChanges(track).slice(Math.max(0, c.i - 1), c.i + 2)) if (x.blink) blink = Math.max(blink, blinkAt([x.blink], f));
  const ph = q => 6.283 * hash(seed, q);
  const life = { brow: 0.007 * Math.sin(6.283 * f / 47 + ph(81)), tilt: 2.2 * Math.sin(6.283 * f / 71 + ph(82)),
    lid: 0.05 * (0.5 + 0.5 * Math.sin(6.283 * f / 59 + ph(83))), mw: 0.05 * Math.sin(6.283 * f / 37 + ph(84)) };
  return { ...st, blink, life, talk: talk ? talk(f) : null, key: k };
}
