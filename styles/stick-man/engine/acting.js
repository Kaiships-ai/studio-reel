// The automatic acting layer: blinks, expression timing, idle life, eyes on whatever is moving, settle springs.
// Nothing here is written in the reel data; all of it is a pure function of the frame and a per-actor seed.
import { hash, clamp, smooth, smoother, settle, rightB, fwdB, angDiff } from './verbs.js';

const BLINK = [1, 2, 2, 1];                                       // half, shut, shut, half

// blink starts: seeded gaps of 15-45 frames (0.5-1.5 s), plus one centred on each expression swap
export function blinkTrack(seed, f0, f1, swaps) {
  const forced = swaps.map(s => s - 2), starts = [];
  let f = f0 + Math.round(4 + 20 * hash(seed, 7));
  for (let i = 0; f < f1; i++) {
    if (!forced.some(s => Math.abs(s - f) < 10)) starts.push(f);
    f += 15 + Math.round(30 * hash(seed, i, 11));
  }
  starts.push(...forced);
  starts.sort((a, b) => a - b);
  return { starts, at: fr => { for (const s of starts) if (fr >= s && fr < s + 4) return BLINK[fr - s]; return 0; } };
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
  return { key: String(t), target: t, from: seg ? seg.from : -1e9 };
}

// face slide (look, look_v) from the head toward a world point, in the figure's own frame
export function gaze(headB, yaw, pB) {
  const d = [pB[0] - headB[0], pB[1] - headB[1], pB[2] - headB[2]], R = rightB(yaw), F = fwdB(yaw);
  const u = d[0] * R[0] + d[1] * R[1], z = d[0] * F[0] + d[1] * F[1];
  const ang = Math.atan2(u, Math.max(z, -0.3)), elev = Math.atan2(d[2], Math.hypot(u, z));
  return [clamp(ang / 0.85, -1.05, 1.05), clamp(elev / 0.25, -1.6, 1.6)];
}

// ---------------------------------------------------------------- the body acts (every reel gets this for free)
// Idle beats: every 12-24 frames (seeded per actor) the body moves to a new small pose and holds it 2-4 frames: a
// weight shift, a look, or a hand move leads (the other two follow at under half size), so a standing figure is
// never a still picture and never a looping wobble. Values add onto the pose keys (W, deg; arm = FK fwd/out/flex).
const IDLE_T0 = -400;
function beatPose(seed, i) {
  // the weight goes side to side (alternating), the rest is seeded; a value is 0.5-1 of its range so every beat moves
  const h = k => 2 * hash(seed, i, k) - 1, a = k => (h(k) < 0 ? -1 : 1) * (0.5 + 0.5 * Math.abs(h(k + 100))), alt = i % 2 ? 1 : -1;
  const kind = Math.floor(3 * hash(seed, i, 40)), big = k => (kind === k ? 1 : 0.5);
  return { dx: 0.10 * alt * (0.6 + 0.4 * Math.abs(h(41))) * big(0), lean: 3.2 * alt * big(0), hipTwist: 6 * a(43) * big(0), bob: -0.016 * Math.abs(h(54)) * big(0),
    head_tilt: 6 * a(44) * big(1), head_dx: 0.03 * a(45) * big(1), head_pitch: 5 * a(46) * big(1), look: 0.25 * a(47) * big(1),
    L: [12 * a(48) * big(2), 6 * a(49) * big(2), 22 * a(50) * big(2)], R: [12 * a(51) * big(2), 6 * a(52) * big(2), 22 * a(53) * big(2)] };
}
const mixPose = (a, b, u) => Object.fromEntries(Object.keys(a).map(k => [k, Array.isArray(a[k]) ? a[k].map((x, j) => x + (b[k][j] - x) * u) : a[k] + (b[k] - a[k]) * u]));
export function idleBeats(seed, f) {
  let t = IDLE_T0 + Math.round(20 * hash(seed, 60)), i = 0;
  for (;;) {
    const gap = 12 + Math.round(12 * hash(seed, i, 61));
    if (f < t + gap) { const hold = 1 + Math.floor(3 * hash(seed, i, 62)); return mixPose(beatPose(seed, i - 1), beatPose(seed, i), smooth((f - t) / (gap - hold))); }
    t += gap; i++;
  }
}

// An expression change comes with a body accent on the same frame: a head lift or dip, a shoulder shrug, a tilt.
const ACCENT = {
  shock: { head_dv: 0.05, head_pitch: -9, shrug: 0.08, pitch: -4 },
  worried: { shrug: 0.07, head_pitch: 6, head_dv: -0.02, tilt: 5 },
  happy: { head_dv: 0.03, shrug: 0.03, tilt: 7 }, grin: { head_dv: 0.03, shrug: 0.04, tilt: 7, pitch: -2 },
  closed: { head_pitch: 7, head_dv: -0.02, tilt: 6 }, calm: { head_pitch: 4, tilt: 4 },
  smug: { head_pitch: -5, tilt: 8, lean: 2 }, sly: { head_pitch: 3, tilt: -8, lean: -2 },
  stern: { head_pitch: 8, head_dv: -0.03, shrug: -0.02 }, neutral: { head_pitch: 4, head_dv: -0.015 },
};
export function exprAccent(track, f, seed) {
  const o = {};
  for (let j = 1; j < track.length; j++) {
    const k = track[j]; if (k.expr === track[j - 1].expr) continue;
    const d = f - k.f; if (d < 0 || d >= 16) continue;
    const e = d < 3 ? smoother((d + 1) / 3) : Math.exp(-(d - 2) / 4.5), A = ACCENT[k.expr]; if (!A) continue;
    const sg = hash(seed, k.f, 71) < 0.5 ? -1 : 1;
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
