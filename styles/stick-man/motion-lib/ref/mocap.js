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
const STILL = 0.02;
// cast.js FOOT.out: the rig's own toe-out (deg); a captured foot's turn is written on top of it
const FOOT_OUT = 8;
// a segment's frame from its forward and up (clip space): f, u made square, r = the figure's right (clip space is a
// mirror of Blender's, so right is -(f x u) there)
const seg = (fv, uv) => { const u = nrm(uv), f = nrm(add(fv, mul(u, -dot(fv, u)))); return { f, u, r: mul(cross(f, u), -1) }; };
// a child frame on its parent's, in the rig's order (YXZ: yaw about up, then pitch about the side, then roll about forward)
const rel = (Pf, Cf) => {
  const cf = [dot(Cf.f, Pf.f), dot(Cf.f, Pf.r), dot(Cf.f, Pf.u)], cu = [dot(Cf.u, Pf.f), dot(Cf.u, Pf.r), dot(Cf.u, Pf.u)];
  const y = Math.atan2(cf[1], cf[0]), p = Math.asin(Math.max(-1, Math.min(1, -cf[2])));
  const uP = [Math.sin(p) * Math.cos(y), Math.sin(p) * Math.sin(y), Math.cos(p)], rH = [-Math.sin(y), Math.cos(y), 0];
  return { yaw: y * DEG, pitch: p * DEG, roll: Math.atan2(dot(cu, rH), dot(cu, uP)) * DEG };
};
const ROLL_ELBOW = 30;
export function mocapCycle(src, { legM, once = false, roll = true }) {
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
  // <Bone>_f / _u are directions (a bone's forward and up, tools/mocap_dump.py), not positions: they are not moved or scaled
  const isDir = n => /_[fu]$/.test(n);
  const W = F.map((f, t) => { const o = {}; for (const [n, p] of Object.entries(f)) o[n] = isDir(n) ? p : mul(add(p, [v * t, 0, 0]), k); return o; });
  const hip0 = mix(W[0].LeftUpLeg, W[0].RightUpLeg, 0.5)[0]; for (const f of W) for (const [n, p] of Object.entries(f)) if (!isDir(n)) p[0] -= hip0;
  const advance = v * N * k;
  // stances: a foot whose ankle is near its rest height is down; it stays on one print (the mean of where it was)
  const prints = {};
  for (const sd of ['Left', 'Right']) {
    // and still: an ankle skimming low through a swing (it passes under the ankle's stance height for a frame or two) is
    // not a step; a planted ankle moves under STILL m a frame (it rolls heel to toe), a skimming one several centimetres
    const at = i => { const j = ((i % N) + N) % N, p = W[j][sd + 'Foot']; return add(p, [Math.floor(i / N) * advance, 0, 0]); };
    // (the slower of its two moves, so the strike and the push-off frames still count)
    const spd = i => once ? Math.min(i > 0 ? len(V(at(i - 1), at(i)).slice(0, 2)) : 1, i < N - 1 ? len(V(at(i), at(i + 1)).slice(0, 2)) : 1)
      : Math.min(len(V(at(i - 1), at(i)).slice(0, 2)), len(V(at(i), at(i + 1)).slice(0, 2)));
    const low = h => W.map((f, i) => f[sd + 'Foot'][2] < (rest + h) * k && spd(i) < STILL), dn = low(0.025);
    // A one-off moving over the ground: a foot standing still a while (8 frames or more) a few centimetres above the
    // capture's own floor is down too (Mixamo "Run To Stop" ends standing ~4 cm up; the hips' height comes from the knees,
    // base.js legBob, not from that floor). Only a spell with no low frame in it: a stance's own end (the heel lifting,
    // the ankle rising) stays a swing
    if (once) { const lo = low(0.06); for (let i = 0; i < N;) { if (!lo[i]) { i++; continue; } let j = i; while (j < N && lo[j]) j++;
      if (j - i >= 8 && !dn.slice(i, j).some(Boolean)) for (let q = i; q < j; q++) dn[q] = true; i = j; } }
    prints[sd] = W.map(() => null);
    // a one-off does not wrap: a stance under way on its first frame starts there; a foot down the whole capture (an idle)
    // stands on one print, the mean of where it was
    // a foot whose ankle stays within 3 cm all through (a heel raised as the weight shifts) never left the ground
    const hs = W.map(f => f[sd + 'Foot'][2]);
    if (dn.every(Boolean) || Math.max(...hs) - Math.min(...hs) < 0.03 * k) { const m = W.map(f => f[sd + 'Foot']).reduce((a, b) => add(a, b)).map(x => x / N); prints[sd] = W.map(() => m); continue; }
    for (let i = 0; i < N; i++) if (dn[i] && (once && i === 0 || !dn[(i - 1 + N) % N])) {
      const run = []; for (let j = i; dn[j % N] && run.length < N && !(once && j >= N); j++) run.push(j);
      const at = run.map(j => add(W[j % N][sd + 'Foot'], [j >= N ? advance : 0, 0, 0])), m = mix(at[0], at.reduce((a, b) => add(a, b)).map(x => x / at.length), PIN);
      for (const j of run) prints[sd][j % N] = j >= N ? add(m, [-advance, 0, 0]) : m;
    }
  }
  // a swinging foot: the captured ankle, carried from the print it left to the one it lands on. A print is pinned (PIN),
  // not where the ankle was on the frame it lifts or lands, so the gap at each end (print less ankle, height included)
  // fades across the swing instead of jumping on the first or last frame of it
  const raw = (sd, i) => { const a = W[i][sd + 'Foot']; return [a[0], a[1], a2z(a[2])]; }, a2z = z => z - rest * k;
  const swingAt = (sd, t) => {
    const P = prints[sd], up = i => !P[((i % N) + N) % N], wrap = i => ((i % N) + N) % N;
    let ea = t - 1; while (ea > t - N && up(ea)) ea--; let sb = t + 1; while (sb < t + N && up(sb)) sb++;
    const okA = once ? ea >= 0 && !up(ea) : !up(ea), okB = once ? sb < N && !up(sb) : !up(sb);
    // (a gap is the print less the ankle on one frame: the same wherever a loop's cycle puts that frame)
    const gap = i => { const j = wrap(i), p = P[j], r = raw(sd, j); return [p[0] - r[0], p[1] - r[1], -r[2]]; };
    const oA = okA ? gap(ea) : null, oB = okB ? gap(sb) : null, r = raw(sd, t);
    const w = okA && okB ? (t - ea) / (sb - ea) : okA ? 0 : 1, e = w * w * (3 - 2 * w);
    const o = oA && oB ? oA.map((v, q) => v + (oB[q] - v) * e) : oA || oB || [0, 0, 0];
    return [r[0] + o[0], r[1] + o[1], Math.max(0.006, r[2] + o[2])];
  };
  const restPitch = (() => { const f = F[0], p = V(f.LeftFoot, f.LeftToeBase); return Math.atan2(p[2], Math.hypot(p[0], p[1])) * DEG; })();
  const footPitch = (f, sd) => { const p = V(f[sd + 'Foot'], f[sd + 'ToeBase']); return Math.atan2(p[2], Math.hypot(p[0], p[1])) * DEG - restPitch; };
  const frames = W.map((f, t) => {
    const hm = mix(f.LeftUpLeg, f.RightUpLeg, 0.5);
    // the trunk and head from the bones' own turn (pelvis = Hips, chest = Spine2, head = Head), each against the one
    // below it as the rig chains them: pelvis {yaw, pitch, roll} on the root's heading, spine {twist, bend, side} on the
    // pelvis, neck {turn, nod, tilt} on the chest (rel(): yaw about the parent's up, pitch about its side, roll about the
    // forward; signs as the rig's: + turns right, tips forward, leans right)
    const P = seg(f.Hips_f, f.Hips_u), C = seg(f.Spine2_f, f.Spine2_u), Hd = seg(f.Head_f, f.Head_u);
    const heading = Math.atan2(P.f[1], P.f[0]) * DEG, H = { f: [Math.cos(heading / DEG), Math.sin(heading / DEG), 0], r: [-Math.sin(heading / DEG), Math.cos(heading / DEG), 0], u: [0, 0, 1] };
    const pelvis = rel(H, P), spine = rel(P, C), neck = rel(C, Hd);
    // the chest's frame for the arms: x = the figure's right, y = up the trunk, z = forward
    const xC = C.r, yC = C.u, zC = C.f;
    const inC = p => [dot(p, xC), dot(p, yC), dot(p, zC)];
    const arm = (sd, sg) => {
      const d = nrm(inC(V(f[sd + 'Arm'], f[sd + 'ForeArm']))), fd = nrm(inC(V(f[sd + 'ForeArm'], f[sd + 'Hand'])));
      const raise = Math.asin(Math.max(-1, Math.min(1, sg * d[0]))) * DEG, swing = Math.atan2(d[2], -d[1]) * DEG, elbow = Math.acos(Math.max(-1, Math.min(1, dot(d, fd)))) * DEG;
      let b0 = nrm([-sg * 0.25, 0.3, 1]); b0 = nrm(add(b0, mul(d, -dot(b0, d)))); const ba = nrm(add(fd, mul(d, -dot(fd, d))));
      const roll = sg * Math.atan2(dot(d, cross(b0, ba)), dot(b0, ba)) * DEG;
      return { raise, swing, elbow, roll };
    };
    const leg = sd => { const pr = prints[sd][t];
      return pr ? { footW: [pr[0], pr[1], 0], pitch: footPitch(f, sd) } : { footW: swingAt(sd, t), pitch: footPitch(f, sd) }; };
    const knee = sd => { const a = nrm(V(f[sd + 'UpLeg'], f[sd + 'Leg'])), b = nrm(V(f[sd + 'Leg'], f[sd + 'Foot'])); return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * DEG; };
    // a foot's turn: its toe's heading on the root's, less the rig's own toe-out (cast.js FOOT.out), + toward the right
    // A foot pointing near straight up or down (kicked up behind in a run) has no heading: its turn fades out as the toe
    // leaves the horizontal (cos of its pitch under 0.7)
    const toe = sd => { const d = V(f[sd + 'Foot'], f[sd + 'ToeBase']), h = Math.hypot(d[0], d[1]) / (len(d) || 1);
      const y = Math.atan2(d[1], d[0]) * DEG - heading - (sd === 'Left' ? -FOOT_OUT : FOOT_OUT), w = Math.min(1, Math.max(0, (h - 0.5) / 0.4));
      return ((y + 540) % 360 - 180) * w * w * (3 - 2 * w); };
    const L = leg('Left'), R = leg('Right'); L.yaw = toe('Left'); R.yaw = toe('Right');
    return { kneeL: knee('Left'), kneeR: knee('Right'), down: { L: !!prints.Left[t], R: !!prints.Right[t] }, hipZ: hm[2] - rest * k, pos: [hm[0], 0, 0], hipY: hm[1],
      heading, pelvis: { yaw: pelvis.yaw, pitch: pelvis.pitch, roll: pelvis.roll }, spine: { twist: spine.yaw, bend: spine.pitch, side: spine.roll }, neck: { turn: neck.yaw, nod: neck.pitch, tilt: neck.roll },
      armL: arm('Left', -1), armR: arm('Right', 1), legL: L, legR: R };
  });
  // the elbow's fold plane (roll; a loop on the move leaves it to the rig, `roll: false`, as its closing steps fold the
  // arm in the rig's plane): measured only where the elbow is bent (ROLL_ELBOW deg or more; near straight the plane
  // is undefined and the captured one flips), unwrapped so it never jumps a turn, filled across the straight frames from
  // the bent ones on either side (a loop wraps), and faded to the rig's own plane as the elbow straightens
  for (const sd of ['armL', 'armR']) {
    const ok = frames.map(f => f[sd].elbow >= ROLL_ELBOW);
    if (!roll || !ok.some(Boolean)) { for (const f of frames) f[sd].roll = 0; continue; }
    let prev = null; for (const f of frames) { if (f[sd].elbow < ROLL_ELBOW) continue; let r = f[sd].roll; if (prev != null) r += 360 * Math.round((prev - r) / 360); f[sd].roll = prev = r; }
    const idx = ok.flatMap((v, i) => v ? [i] : []);
    for (let i = 0; i < N; i++) if (!ok[i]) {
      const nx = idx.find(j => j > i) ?? (once ? null : idx[0] + N), pv = [...idx].reverse().find(j => j < i) ?? (once ? null : idx[idx.length - 1] - N);
      const rv = j => frames[((j % N) + N) % N][sd].roll;
      frames[i][sd].roll = nx == null ? rv(pv) : pv == null ? rv(nx) : rv(pv) + (rv(nx) - rv(pv)) * (i - pv) / (nx - pv);
    }
    for (const f of frames) { const e = f[sd].elbow, w = Math.min(1, Math.max(0, (e - ROLL_ELBOW / 2) / ROLL_ELBOW)); f[sd].roll *= w * w * (3 - 2 * w); }
  }
  // the prints of the cycle: the left one it starts on, and the right one the next step lands on (the first right print
  // after the left strike)
  let rIdx = 0; for (let i = 1; i < N; i++) if (prints.Right[i] && !prints.Right[i - 1]) { rIdx = i; break; }
  const Lx = prints.Left[0] ? prints.Left[0][0] : 0, Rx = prints.Right[rIdx] ? prints.Right[rIdx][0] : Lx + advance / 2;
  // the hips' height standing (the first frame's), for a one-off's flight
  const standHip = frames[0].hipZ;
  const lane = (Math.abs(prints.Left[0]?.[1] ?? 0) + Math.abs(prints.Right[rIdx]?.[1] ?? 0)) / 2;
  // the right print the cycle ends on (a capture of four steps has two right prints: the closing step starts from the
  // second, not the first)
  let rEnd = null; for (let i = N - 1; i >= 0 && !rEnd; i--) if (prints.Right[i] && !prints.Right[(i - 1 + N) % N]) rEnd = prints.Right[i];
  return { frames, cycle: N, advance, scale: k, firstPrint: Lx, prints: { L: Lx, R: Rx, yL: prints.Left[0]?.[1] ?? -lane, yR: prints.Right[rIdx]?.[1] ?? lane, Rend: rEnd ? rEnd[0] : Rx, yRend: rEnd ? rEnd[1] : lane }, lane, standHip };
}
