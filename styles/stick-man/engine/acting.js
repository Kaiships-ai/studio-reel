// The automatic acting layer: blinks, expression timing, idle life, eyes on whatever is moving, settle springs.
// Nothing here is written in the reel data; all of it is a pure function of the frame and a per-actor seed.
import { hash, clamp, smoother, settle, rightB, fwdB, angDiff } from './verbs.js';

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
    bob: (sleep ? 0.022 : 0.010) * br,
    head_tilt: (sleep ? 2.4 : 1.4) * Math.sin(6.283 * f / 101 + b) + 0.6 * Math.sin(6.283 * f / 43 + c),
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

// sum of settle springs after impacts / stops: [{f, amp}]
export const springs = (events, f) => events.reduce((s, e) => s + e.amp * settle(f - e.f), 0);

export { angDiff };
