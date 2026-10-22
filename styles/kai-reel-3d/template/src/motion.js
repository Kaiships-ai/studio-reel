// motion.js: every easing / spring / squash number of the reel lives here (Motion Lab: no inline motion numbers in reel.js).
export const FPS = 30, F = (n) => n / FPS;
// squash & stretch [sy] (sx = sz = 1/√sy is done by clawd2.js): crouch → launch stretch → land squash, +10–30 % for phone size
export const SQ = { crouch: 0.75, stretch: 1.28, land: 0.7, deflate: 0.9, puff: 1.1, recoil: 0.78, shrink: 0.86 };
export const T = { crouch: F(5), launch: F(2), land: F(3) };                 // crouch 5 f → launch 2 f → land squash 3 f
export const SPRING = { f: 3.2, d: 6.2 };                                     // settle: damping ratio ≈ 0.55
export const LAG = { eyes: F(2), legs: F(4), tails: F(6), secondary: F(4) }; // overlap
export const SECONDARY = 0.6;                                                 // secondary travel = 60 % of the hero's
export const SNAP = { dur: F(6), hold: F(10) };                               // double-take: 2 snaps of 6 f, 10 f hold
export const HOLD_MIN = F(12);                                                // every readable pose holds ≥ 12 f
export const PUSH = { wide: 0.04, med: 0.06, close: 0.08 };                   // slow push-ins, ≤ 10 % per shot
export const DOF = { wide: 0.45, med: 0.8, close: 1.0 };                      // aperture → CoC (stage.js), shallow like Morphy

// step response of a damped spring (0 → 1 with overshoot), zero start velocity
export const step = (t, t0, f = SPRING.f, d = SPRING.d) => { if (t <= t0) return 0; const w = 2 * Math.PI * f, x = t - t0; return 1 - Math.exp(-d * x) * (Math.cos(w * x) + d / w * Math.sin(w * x)); };
// impact: jumps to a at t0 and rings out to 0
export const ring = (t, t0, { f = 4.5, d = 9, a = 1 } = {}) => t <= t0 ? 0 : a * Math.exp(-d * (t - t0)) * Math.cos(2 * Math.PI * f * (t - t0));
// track: [[t0, v0], [t1, v1, f?, d?], ...] → v0 + Σ Δv·step (each key springs in from its time)
export const TR = (t, k, f = SPRING.f, d = SPRING.d) => { let v = k[0][1]; for (let i = 1; i < k.length; i++) v += (k[i][1] - k[i - 1][1]) * step(t, k[i][0], k[i][2] ?? f, k[i][3] ?? d); return v; };
export const arc = (t, t0, t1, h) => { if (t < t0 || t > t1) return 0; const a = (t - t0) / (t1 - t0); return h * 4 * a * (1 - a); };
// a hop: crouch before t0 (5 f), stretch in the air, land squash at t1 (3 f) then settle → { y, sy }
export function hop(t, t0, t1, h) {
  let sy = 0, y = 0;
  if (t > t0 - T.crouch && t <= t0) sy += (SQ.crouch - 1) * Math.sin(Math.PI / 2 * (t - t0 + T.crouch) / T.crouch);
  if (t > t0 && t < t1) { y = arc(t, t0, t1, h); const a = (t - t0) / (t1 - t0); sy += (SQ.stretch - 1) * (a < 0.5 ? Math.min(1, a / (T.launch / (t1 - t0))) : 1 - 0.8 * (a - 0.5) / 0.5); }
  if (t >= t1 && t < t1 + T.land) sy += SQ.land - 1;                          // R5: hold the land squash 3 f (was a ring that read 1 f)
  else if (t >= t1) sy += ring(t, t1 + T.land, { f: 4.5, d: 9, a: SQ.land - 1 });
  return { y, sy };
}
// blink 0..1 around each time (close 2 f, open 4 f)
export function blinks(t, times) { let b = 0; for (const t0 of times) { const f = (t - t0) * FPS; if (f > -2 && f <= 0) b = Math.max(b, (f + 2) / 2); else if (f > 0 && f < 4) b = Math.max(b, 1 - f / 4); } return b; }
