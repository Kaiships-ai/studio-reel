// Run reference 01: the run cycle Kai approved (2026-11-14, artifact 4T62rGBoKWj7FYUNqj94Jk "Run cycle 3D theo
// reference"), key poses taken frame by frame from a reference video. 12 frames a cycle at 24 fps (a step on 6s, Williams
// p177), one leg's curves; the other leg runs half a cycle later. Ported 1:1: the tables and the solve are the page's, in
// its own units (a leg of 1.02, the ground at 0, x forward, y up); base.js gaitLoop scales them onto a body.
//   LEG  per frame [thigh angle from straight down, + forward; knee flex; foot angle from the shin] (deg)
//   ARM  per frame [upper arm from straight down, + forward; elbow flex] (deg), world angles (not from the trunk)
//   LEAN per half cycle: the trunk tipped forward from the hips (deg); HIPK: hip height per half cycle (share of the leg)
const LEG = [[30, 3, 82], [20, 58, 128], [-8, 36, 120], [-32, 2, 72], [-38, 65, 47], [-30, 92, 50], [-20, 112, 54], [4, 122, 55], [24, 130, 58], [45, 128, 62], [67, 51, 67], [48, 22, 76]];
const ARM = [[45, 108], [45, 112], [25, 100], [0, 90], [-105, 100], [-122, 100], [-135, 100], [-128, 78], [-112, 70], [-100, 72], [18, 85], [35, 100]];
const LEAN = [31, 33, 34, 35, 35, 33], HIPK = [1.0, 0.935, 0.915, 0.895, 1.0, 0.99];
const THIGH = 0.52, SHIN = 0.5, HB = 0.05, HD = 0.06, TF = 0.17, TD = 0.06, SOLE = HB + TF, TE = 3.2, BL = 0.5, R = Math.PI / 180, TAU = 2 * Math.PI;
// Catmull-Rom through a looping table
function cr(K, P, t) {
  const n = K.length; t = ((t % P) + P) % P; const i = Math.floor(t), u = t - i, o = [];
  for (let c = 0; c < K[0].length; c++) {
    const p0 = K[(i - 1 + n) % n][c], p1 = K[i % n][c], p2 = K[(i + 1) % n][c], p3 = K[(i + 2) % n][c];
    o.push(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u));
  }
  return o;
}
const dv = a => [Math.sin(a * R), -Math.cos(a * R)];
function fk(t) { const [th, kn, fr] = cr(LEG, 12, t), sh = th - kn, fa = sh + fr, k = dv(th).map(v => v * THIGH), s = dv(sh); return { a: [k[0] + SHIN * s[0], k[1] + SHIN * s[1]], fa }; }
function footPts(a, fa) { const f = dv(fa), n = dv(fa - 90); return { heel: [a[0] - HB * f[0] + HD * n[0], a[1] - HB * f[1] + HD * n[1]], toe: [a[0] + TF * f[0] + TD * n[0], a[1] + TF * f[1] + TD * n[1]] }; }
{ const f = fk(0), p = footPts(f.a, f.fa); HIPK[0] = -Math.min(p.heel[1], p.toe[1]); }
const hipH = t => cr(HIPK.map(v => [v]), 6, t % 6)[0];
const F0 = fk(0), XH = footPts(F0.a, F0.fa).heel[0], FT = fk(TE), V = (XH + SOLE - footPts(FT.a, FT.fa).toe[0]) / TE;
// the ankle relative to the hip: rolling heel to toe on the ground through the stance (the foot fixed, the body
// passing over it), then the leg's own angles through the swing
function ankle2D(tt, h) {
  tt = ((tt % 12) + 12) % 12; const f = fk(tt); let a = f.a;
  if (tt < TE + BL) {
    const rx = V * tt, fd = dv(f.fa), n = dv(f.fa - 90);
    let ap = f.fa >= 90 ? [XH - rx - (-HB * fd[0] + HD * n[0]), -h - (-HB * fd[1] + HD * n[1])] : [XH + SOLE - rx - (TF * fd[0] + TD * n[0]), -h - (TF * fd[1] + TD * n[1])];
    if (tt > TE - BL) { let w = (tt - (TE - BL)) / (2 * BL); w = w * w * (3 - 2 * w); ap = [ap[0] * (1 - w) + a[0] * w, ap[1] * (1 - w) + a[1] * w]; }
    a = ap;
  }
  return { a, fa: f.fa };
}
// the body at reference time t (frames at 24 fps, one cycle = 12): everything a gait needs, in reference units and degrees
export function refPose(t) {
  const h = hipH(t), thL = cr(LEG, 12, t)[0], thR = cr(LEG, 12, t + 6)[0], ph = TAU * (t - 1.7) / 12;
  const [uaR, elR] = cr(ARM, 12, t), [uaL, elL] = cr(ARM, 12, t + 6);
  return { hip: h, yaw: 0.12 * (thL - thR), roll: -5 * Math.cos(ph), sway: 0.025 * Math.cos(ph), lean: cr(LEAN.map(v => [v]), 6, t % 6)[0],
    legs: { L: ankle2D(t, h), R: ankle2D(t + 6, h) }, arms: { L: [uaL, elL], R: [uaR, elR] }, shoulderYaw: 0.07 * (uaL - uaR) * 0.9 };
}
// a cycle's numbers: frames at 24 fps, the leg's length, the travel a frame, how long a foot stays down (frames from its
// heel strike), and where it lands ahead of the hip at its strike
export const RUN_KAI01 = { name: 'run_kai01', cycle: 12, fps: 24, leg: THIGH + SHIN, speed: V, stance: TE, land: footPts(F0.a, F0.fa).heel[0] + HB, pose: refPose };
