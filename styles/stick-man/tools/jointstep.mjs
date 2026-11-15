// The one-frame joint change a stick-man figure is judged by, shared by the film report (shot.mjs "largest one-frame
// joint change", "frames over 25 deg") and the motion library's gate (motionlib.mjs), so a clip the library passes
// is a clip the film passes: two copies of this list drifted (the gate had no foot pitch and no torso, and let a joint
// turn as fast as its capture did; Hot Money ep01 SH060 foot 36.6 deg/f, SH172 elbow 35.1 deg/f, both library PASS).
// A pose is cast.js rigWorld(): { torsoLean, torsoRoll, L: { kneeFlex, elbowFlex, footPitch, shoulder, elbow, hand,
// hip, knee, ankle, ... }, R: { ... } } (degrees, Blender metres).
export const JOINT_STEP_MAX = 25;
const FLEX = ['kneeFlex', 'elbowFlex', 'footPitch'];
const SEGS = [['shoulder', 'elbow'], ['elbow', 'hand'], ['hip', 'knee'], ['knee', 'ankle']];
const dirAng = (a0, b0, a1, b1) => { const u = b0.map((x, i) => x - a0[i]), v = b1.map((x, i) => x - a1[i]), lu = Math.hypot(...u), lv = Math.hypot(...v);
  return lu < 1e-6 || lv < 1e-6 ? 0 : Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, i) => s + x * v[i], 0) / (lu * lv)))) * 180 / Math.PI; };
// every channel's change from pose m to pose l: [[name, deg], ...]
export function jointSteps(m, l) {
  const out = [['torsoLean', Math.abs(l.torsoLean - m.torsoLean)], ['torsoRoll', Math.abs(l.torsoRoll - m.torsoRoll)]];
  for (const s of ['L', 'R']) {
    for (const k of FLEX) out.push([k + s, Math.abs(l[s][k] - m[s][k])]);
    for (const [x, y] of SEGS) out.push([x + '-' + y + s, dirAng(m[s][x], m[s][y], l[s][x], l[s][y])]);
  }
  return out;
}
