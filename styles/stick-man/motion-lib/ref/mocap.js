// Motion capture onto the stick-man rig. A source is a cycle of joint positions taken from a rigged animation (Mixamo
// FBX, dumped by tools/mocap_dump.py in Blender: Blender world metres, the character facing -Y, its left at +X, Z up,
// recorded in place). mocapCycle turns it into this rig's pose channels a frame, for one body:
//   - the in-place cycle is put back on the ground: the body travels at the speed its planted feet slide back
//   - everything is scaled by this body's leg against the source's (hip joint to ankle)
//   - a foot down on the ground is pinned to one print for its whole stance (so it never slides on our ground)
//   - hips (height, sideways, turn, tilt), trunk lean, shoulder turn, head nod come from the joints; arms are solved into
//     raise / swing / elbow / roll in the chest's frame (cast.js armDirs, inverted)
// The values are the angles the figure should show; gaitLoop writes them back through the 'kaiships' dose.
// Mixamo's animations may be used in projects but not redistributed as files: only these derived joint tables live
// here (the stick-man style is dev-only and never ships), never the FBX.
const DEG = 180 / Math.PI, V = (a, b) => [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(...a), nrm = a => { const l = len(a) || 1; return a.map(v => v / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a, b, w) => a.map((v, i) => v + (b[i] - v) * w), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map(v => v * k);
// Blender (Mixamo) -> clip space: forward +x, the figure's left -y, up z
const toClip = p => [-p[1], -p[0], p[2]];

// PIN: where a stance's print sits between the ankle at the heel strike (0) and its mean over the stance (1): at the
// strike the leg is long and near straight, so a print set back from there snaps the knee straight then bent
const PIN = 0.35;
export function mocapCycle(src, { legM, once = false }) {
  let F = src.frames.map(f => Object.fromEntries(Object.entries(f).map(([k, p]) => [k, toClip(p)])));
  const same = (a, b) => Object.keys(a).every(k => len(V(a[k], b[k])) < 1e-3);
  if (F.length > 2 && same(F[0], F[F.length - 1])) F = F.slice(0, -1);            // the last frame repeats the first
  const N = F.length;
  const legOf = f => len(V(f.LeftUpLeg, f.LeftFoot)), k = legM / Math.max(...F.map(legOf));
  const rest = Math.min(...F.flatMap(f => [f.LeftFoot[2], f.RightFoot[2]]));     // the ankle's height over the sole
  // the travel: the planted feet slide back in place at the body's speed
  const v = once ? 0 : (() => { const s = []; for (const sd of ['Left', 'Right']) for (let i = 0; i < N; i++) { const a = F[i][sd + 'Foot'], b = F[(i + 1) % N][sd + 'Foot'];
    if (a[2] < rest + 0.02 && b[2] < rest + 0.02) s.push(a[0] - b[0]); }
    s.sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; })();
  // start the cycle on the left heel strike (the frame the left ankle comes down), the hips at x = 0
  const down = i => F[i].LeftFoot[2] < rest + 0.02;
  let s0 = 0; if (!once) for (let i = 0; i < N; i++) if (down(i) && !down((i - 1 + N) % N)) { s0 = i; break; }   // a one-off keeps its order
  F = [...F.slice(s0), ...F.slice(0, s0)];
  const W = F.map((f, t) => { const o = {}; for (const [n, p] of Object.entries(f)) o[n] = mul(add(p, [v * t, 0, 0]), k); return o; });
  const hip0 = mix(W[0].LeftUpLeg, W[0].RightUpLeg, 0.5)[0]; for (const f of W) for (const p of Object.values(f)) p[0] -= hip0;
  const advance = v * N * k;
  // stances: a foot whose ankle is near its rest height is down; it stays on one print (the mean of where it was)
  const prints = {};
  for (const sd of ['Left', 'Right']) {
    const dn = W.map(f => f[sd + 'Foot'][2] < (rest + 0.025) * k);
    prints[sd] = W.map(() => null);
    for (let i = 0; i < N; i++) if (dn[i] && !dn[(i - 1 + N) % N]) {
      const run = []; for (let j = i; dn[j % N] && run.length < N; j++) run.push(j);
      const at = run.map(j => add(W[j % N][sd + 'Foot'], [j >= N ? advance : 0, 0, 0])), m = mix(at[0], at.reduce((a, b) => add(a, b)).map(x => x / at.length), PIN);
      for (const j of run) prints[sd][j % N] = j >= N ? add(m, [-advance, 0, 0]) : m;
    }
  }
  const restPitch = (() => { const f = F[0], p = V(f.LeftFoot, f.LeftToeBase); return Math.atan2(p[2], Math.hypot(p[0], p[1])) * DEG; })();
  const footPitch = (f, sd) => { const p = V(f[sd + 'Foot'], f[sd + 'ToeBase']); return Math.atan2(p[2], Math.hypot(p[0], p[1])) * DEG - restPitch; };
  const frames = W.map((f, t) => {
    const hm = mix(f.LeftUpLeg, f.RightUpLeg, 0.5), hl = V(f.RightUpLeg, f.LeftUpLeg);
    const yaw = Math.atan2(hl[0], -hl[1]) * DEG, roll = Math.atan2(hl[2], Math.hypot(hl[0], hl[1])) * DEG;
    const up = V(hm, f.Neck), lean = Math.atan2(up[0], up[2]) * DEG, side = Math.atan2(-up[1], up[2]) * DEG;
    const sl = V(f.RightArm, f.LeftArm), syaw = Math.atan2(sl[0], -sl[1]) * DEG;
    const hd = V(f.Neck, f.HeadTop_End || f.Head), nod = Math.atan2(hd[0], hd[2]) * DEG - lean;
    // the chest's frame: x = the figure's right, y = up the trunk, z = forward
    const yC = nrm(V(f.Spine1 || hm, f.Neck)); let xC = V(f.LeftArm, f.RightArm); xC = nrm(add(xC, mul(yC, -dot(xC, yC)))); const zC = cross(xC, yC);
    const inC = p => [dot(p, xC), dot(p, yC), dot(p, zC)];
    const arm = (sd, sg) => {
      const d = nrm(inC(V(f[sd + 'Arm'], f[sd + 'ForeArm']))), fd = nrm(inC(V(f[sd + 'ForeArm'], f[sd + 'Hand'])));
      const raise = Math.asin(Math.max(-1, Math.min(1, sg * d[0]))) * DEG, swing = Math.atan2(d[2], -d[1]) * DEG, elbow = Math.acos(Math.max(-1, Math.min(1, dot(d, fd)))) * DEG;
      let b0 = nrm([-sg * 0.25, 0.3, 1]); b0 = nrm(add(b0, mul(d, -dot(b0, d)))); const ba = nrm(add(fd, mul(d, -dot(fd, d))));
      const roll = sg * Math.atan2(dot(d, cross(b0, ba)), dot(b0, ba)) * DEG;
      // the elbow's fold plane (roll) is left to the rig: the captured one flips where the arm passes straight
      return { raise, swing, elbow, roll: 0 };
    };
    const leg = sd => { const pr = prints[sd][t], a = f[sd + 'Foot'];
      return pr ? { footW: [pr[0], pr[1], 0], pitch: footPitch(f, sd) } : { footW: [a[0], a[1], Math.max(0.006, a[2] - rest * k)], pitch: footPitch(f, sd) }; };
    const knee = sd => { const a = nrm(V(f[sd + 'UpLeg'], f[sd + 'Leg'])), b = nrm(V(f[sd + 'Leg'], f[sd + 'Foot'])); return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * DEG; };
    return { kneeL: knee('Left'), kneeR: knee('Right'), down: { L: !!prints.Left[t], R: !!prints.Right[t] }, hipZ: hm[2] - rest * k, pos: [hm[0], 0, 0], hipY: hm[1], yaw, roll, lean, side, twist: syaw - yaw, nod,
      armL: arm('Left', -1), armR: arm('Right', 1), legL: leg('Left'), legR: leg('Right') };
  });
  // the prints of the cycle: the left one it starts on, and the right one the next step lands on (the first right print
  // after the left strike)
  let rIdx = 0; for (let i = 1; i < N; i++) if (prints.Right[i] && !prints.Right[i - 1]) { rIdx = i; break; }
  const Lx = prints.Left[0] ? prints.Left[0][0] : 0, Rx = prints.Right[rIdx] ? prints.Right[rIdx][0] : Lx + advance / 2;
  // the hips' height standing (the first frame's), for a one-off's flight
  const standHip = frames[0].hipZ;
  const lane = (Math.abs(prints.Left[0]?.[1] ?? 0) + Math.abs(prints.Right[rIdx]?.[1] ?? 0)) / 2;
  return { frames, cycle: N, advance, scale: k, firstPrint: Lx, prints: { L: Lx, R: Rx, yL: prints.Left[0]?.[1] ?? -lane, yR: prints.Right[rIdx]?.[1] ?? lane }, lane, standHip };
}
