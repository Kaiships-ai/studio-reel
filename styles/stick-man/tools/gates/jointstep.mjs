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
// where a channel's change shows on the figure (Blender world points of pose l): what it moves, not its pivot (an elbow
// flex moves the elbow and the forearm, not the shoulder; a lean moves the chest and the head, not the pelvis), so a film
// report can ask whether the shot's camera sees it. The library gate has no camera and ignores this.
const FLEXED = { kneeFlex: ['knee', 'ankle'], elbowFlex: ['elbow', 'hand'], footPitch: ['ankle', 'toe'] };
const along = (a, b) => [0.25, 0.5, 0.75, 1].map(u => a.map((x, i) => x + (b[i] - x) * u));
export function stepPoints(k, l) {
  if (k === 'torsoLean' || k === 'torsoRoll') {
    const hip = l.skel?.pelvis ?? l.L.hip.map((x, i) => (x + l.R.hip[i]) / 2), neck = l.skel?.neck ?? l.L.shoulder.map((x, i) => (x + l.R.shoulder[i]) / 2);
    return [...along(hip, neck), l.L.shoulder, l.R.shoulder, ...(l.skel?.head ? [l.skel.head] : [])];
  }
  const s = k.slice(-1), name = k.slice(0, -1), [a, b] = (FLEXED[name] || name.split('-')).map(j => l[s][j]);
  return FLEXED[name] ? [a, ...along(a, b)] : along(a, b);          // a bone turning about its first joint: from a quarter along
}
