// Aerial motion for the stick cast (allout kit): jumps, flips, twists, cartwheels and free flight along a path, so a
// figure can leave the floor instead of acting on one spot. Built on the pose engine: each verb is a body owner (the
// root's path and heading, frame by frame), an add owner (whole-figure rotation: x_tumble / x_roll, and x_air, which
// hides the foot contact shadow while airborne) and pose instances for the limbs (squash before take-off, the air pose,
// the landing absorb), so the joints keep the pose engine's easing and the joint gate holds.
//
//   beats: { f, who: 'kai', do: 'leap', to | by, h, dur, flip, roll, twist, antic, air, land, landHold }
//          { f, who: 'kai', do: 'fly', path: [[x, y, z], ...], dur, antic, pitch, bank, barrel: { deg, from, to }, air,
//            land, landHold, spin }
//   leap: a ballistic hop to `to` (a mark / place / [x, y, z] on the floor) or `by` ([dx, dy] metres): `antic` frames of
//         squash, `dur` frames airborne on a parabola `h` m high, turning `flip` deg head over heels (+ = front flip),
//         `roll` deg sideways (a cartwheel), `twist` deg about the spine (a pirouette); lands into `land` (pose) for
//         `landHold` frames. The rotation turns about the body's centre, not the soles.
//   fly:  take-off squash, then along a smooth curve through `path` (the last point is the landing spot, its z the
//         floor), eased in and out along its length; the body leans into the speed (`pitch`, deg at full speed), banks
//         into every turn (`bank`, deg per deg/frame of heading change), may barrel-roll (`barrel`, deg between the
//         path fractions from..to) or turn about the spine (`spin`, deg over the flight); lands into `land`.
// Both verbs move the actor (st.pos / st.yaw end at the landing), so later beats start from there.
import * as THREE from 'three';
import { POSES, POSE_VERBS, compilePose } from '../engine/poses.js';
import { ACT } from '../engine/verbs_fx.js';
import { STAND } from '../engine/verbs.js';

const DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smoother = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const sn = (t, w, a = 0) => Math.sin(t * w + a);
const HC = 1.55;                                     // turn about this height (m above the soles): the belly, not the feet

// limbs for the air: squash, tuck, star, the flying pose, the landings
const P = {
  // launch: the squash before take-off: hips dropped, chest over the knees, arms swung back
  launch: { A: 1, T: 7, hold: 6, body: { pitch: 26, bob: -0.42, head_pitch: -20, shrug: 0.06 },
    feet: { L: [-0.30, 0.022, 0.06], R: [0.30, 0.022, -0.04] },
    hands: { L: { t: [-0.62, 1.12, 0.06], elbow: [-1, 0, -0.3] }, R: { t: [0.62, 1.12, 0.06], elbow: [1, 0, -0.3] } } },
  // tuck: knees to the chest, hands on the shins (the flip shape)
  tuck: { A: 1, T: 7, hold: 20, body: { pitch: 20, head_pitch: -12, shrug: 0.05 },
    feet: { L: [-0.18, 0.62, 0.30], R: [0.18, 0.60, 0.28] },
    hands: { L: { t: [-0.46, 1.32, 0.36], elbow: [-1, 0, -0.3] }, R: { t: [0.46, 1.30, 0.36], elbow: [1, 0, -0.3] } },
    cycle: t => ({ head_tilt: 3 * sn(t, 1.3) }) },
  // star: arms and legs flung wide (a spread jump, a cartwheel)
  star: { A: 1, T: 7, hold: 20, body: { pitch: -6, head_pitch: -12, shrug: 0.08 },
    feet: { L: [-0.62, 0.20, 0.0], R: [0.62, 0.20, 0.0] },
    hands: { L: { t: [-0.85, 2.30, 0.10], elbow: [-0.9, -0.4, 0] }, R: { t: [0.85, 2.30, 0.10], elbow: [0.9, -0.4, 0] } },
    cycle: t => ({ hands: { L: [0, 0.04 * sn(t, 1.1), 0], R: [0, 0.04 * sn(t, 1.1, 1.4), 0] } }) },
  // superman: one fist punched ahead (up the spine: the body lies along the flight), the other arm swept back, one knee bent
  superman: { A: 2, T: 6, hold: 40, body: { pitch: 2, head_pitch: -30, shrug: 0.04 },
    feet: { L: [-0.12, 0.06, -0.12], R: [0.16, 0.30, -0.34] },
    hands: { R: { t: [0.14, 2.72, 0.36], elbow: [1, 0, -0.3] }, L: { t: [-0.40, 1.45, -0.22], elbow: [-1, 0, -0.3] } },
    cycle: t => ({ hands: { L: [0.02 * sn(t, 0.9), 0.03 * sn(t, 1.3), 0.02 * sn(t, 1.1)] }, head_tilt: 4 * sn(t, 0.7), dx: 0.01 * sn(t, 1.7) }) },
  // land: the absorb: knees give, arms out for balance, then up
  land: { A: 0, T: 6, hold: 8, body: { pitch: 18, bob: -0.32, head_pitch: -6, shrug: 0.05 },
    feet: { L: [-0.30, 0.022, 0.04], R: [0.30, 0.022, -0.04] },
    hands: { L: { t: [-0.85, 1.55, 0.30], elbow: [-1, 0, -0.3] }, R: { t: [0.85, 1.55, 0.30], elbow: [1, 0, -0.3] } } },
  // hero_land: the superhero landing: one knee down, a fist on the floor, the other arm back, head up at the lens
  hero_land: { A: 0, T: 6, hold: 22, body: { pitch: 30, bob: -0.58, head_pitch: -30, shrug: 0.08 },
    feet: { L: [-0.34, 0.022, 0.36], R: [0.30, 0.20, -0.46] },
    hands: { R: { t: [0.32, 0.72, 0.56], elbow: [1, 0, -0.3] }, L: { t: [-0.80, 1.00, -0.30], elbow: [-1, 0, -0.3] } },
    cycle: t => ({ bob: 0.012 * sn(t, 1.8), head_tilt: 3 * sn(t, 1.1) }) },
};
Object.assign(POSES, P);
for (const n of Object.keys(P)) if (!POSE_VERBS[n]) POSE_VERBS[n] = ACT[n] = (p, st, C) => compilePose(n, p, st, C);

// Blender point -> three, and back
const toT = (x, y, z) => new THREE.Vector3(x, z, -y);
const toB = v => [v.x, -v.z, v.y];
// root (soles) for a body whose centre stays at `pos` + HC up, turned by yaw / tumble / roll (deg), as cast.js turns it
const E = new THREE.Euler(), Q = new THREE.Quaternion(), UP = new THREE.Vector3();
function rootFor(pos, yaw, tumble, roll) {
  E.set(tumble * DEG, yaw * DEG, -roll * DEG, 'YXZ'); Q.setFromEuler(E);
  UP.set(0, HC, 0).applyQuaternion(Q);
  const c = toT(pos[0], pos[1], (pos[2] || 0) + HC);
  return toB(c.sub(UP));
}
const body = (pos, yaw) => ({ pos, yaw, bob: 0, lean: 0, pitch: 0, footL: STAND.footL, footR: STAND.footR });
const merge = (...rs) => ({ end: Math.max(...rs.map(r => r.end || 0)), owners: rs.flatMap(r => r.owners || []), cues: rs.flatMap(r => r.cues || []) });
const pose = (name, at, st, C, o = {}) => compilePose(name, { at, ...o }, st, C);
const where = (C, p, st) => {
  if (p.to) { const q = (C.mark || C.point)(p.to).slice(); if (q[2] == null) q[2] = st.pos[2] || 0; return q; }
  const b = p.by || [0, 0]; return [st.pos[0] + b[0], st.pos[1] + b[1], st.pos[2] || 0];
};

function leap(p, st, C) {
  const t0 = p.at, A = p.antic ?? 8, D = p.dur ?? 22, LH = p.landHold ?? 8;
  const p0 = st.pos.slice(), y0 = st.yaw, p1 = where(C, p, st);
  const h = p.h ?? 1.0, flip = p.flip ?? 0, roll = p.roll ?? 0, twist = p.twist ?? 0;
  const ta = t0 + A, tl = ta + D, y1 = y0 + twist + (p.turn ?? 0);
  // the turn runs a little ahead of the arc (it starts on the push-off and finishes before the feet touch)
  const spinU = u => smoother(clamp((u - 0.04) / 0.86));
  const at = f => {
    if (f < ta) return { pos: p0, yaw: y0, tumble: 0, roll: 0, air: 0 };
    if (f >= tl) return { pos: p1, yaw: y1, tumble: 0, roll: 0, air: 0 };
    const u = (f - ta) / D, k = smooth(u) * 0.35 + u * 0.65;     // horizontal: near-constant speed, a touch of ease
    const pos = [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, p0[2] + (p1[2] - p0[2]) * u + 4 * h * u * (1 - u)];
    const s = spinU(u);
    return { pos, yaw: y0 + (y1 - y0) * s, tumble: flip * s, roll: roll * s, air: 1 };
  };
  st.pos = p1.slice(); st.yaw = y1;
  const r = merge(
    pose('launch', t0, st, C, { hold: Math.max(1, A - 6), antic: 1 }),
    pose(p.air || (flip || roll ? 'tuck' : 'star'), ta - 2, st, C, { hold: Math.max(4, D - 10), antic: 0 }),
    pose(p.land || 'land', tl - 2, st, C, { hold: LH, antic: 0 }));
  r.owners.push({ chan: 'body', start: t0, fade: 0, verb: 'leap', fn: f => { const s = at(f); return body(s.air ? rootFor(s.pos, s.yaw, s.tumble, s.roll) : s.pos, s.yaw); } });
  r.owners.push({ chan: 'add', start: t0, verb: 'leap', fn: f => { const s = at(f); return s.air ? { x_tumble: s.tumble, x_roll: s.roll, x_air: 1 } : {}; } });
  r.cues.push({ f: ta, name: 'whoosh', strength: 0.5 }, { f: tl, name: 'thud', strength: 0.7 });
  r.end = Math.max(r.end, tl + LH + 10);
  return r;
}

function fly(p, st, C) {
  const t0 = p.at, A = p.antic ?? 8, D = p.dur ?? 90, LH = p.landHold ?? 16;
  const p0 = st.pos.slice(), y0 = st.yaw;
  const pts = [p0, ...p.path.map(q => (typeof q === 'string' ? (C.mark || C.point)(q) : q).slice())];
  const curve = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(q[0], q[1], q[2] || 0)), false, 'centripetal', 0.5);
  curve.arcLengthDivisions = 600;
  const ta = t0 + A, tl = ta + D, maxP = p.pitch ?? 72, bank = p.bank ?? 9, spin = p.spin ?? 0;
  // ease along the length: a hard push-off, cruise, a braking flare before the touch-down
  // (a trapezoid speed profile: accelerate over the first a, cruise, brake over the last b; position = its integral)
  const ease = x => { x = clamp(x); const a = 0.16, b = 0.22, tot = 1 - a / 2 - b / 2;
    const s = x < a ? x * x / (2 * a) : x <= 1 - b ? a / 2 + (x - a) : a / 2 + (1 - b - a) + b / 2 - (1 - x) ** 2 / (2 * b);
    return clamp(s / tot); };
  const raw = f => { const u = ease((f - ta) / D), q = curve.getPointAt(u); return [q.x, q.y, q.z]; };
  const headingAt = f => { const a = raw(f - 1.5), b = raw(f + 1.5), dx = b[0] - a[0], dy = b[1] - a[1]; return Math.hypot(dx, dy) < 1e-4 ? null : Math.atan2(dx, -dy) / DEG; };
  const unwrap = (y, ref) => y + 360 * Math.round((ref - y) / 360);
  // precompute heading per frame (unwrapped, smoothed) so banking reads the turn rate, not its noise
  const H = [], N = D + 1; let prev = y0;
  for (let i = 0; i < N; i++) { const h = headingAt(ta + i); prev = h == null ? prev : unwrap(h, prev); H.push(prev); }
  const Hs = H.map((_, i) => { let s = 0, w = 0; for (let j = -4; j <= 4; j++) { const q = H[clamp(i + j, 0, N - 1)], k = 5 - Math.abs(j); s += q * k; w += k; } return s / w; });
  const y1 = unwrap(p.landYaw ?? Hs[N - 1], Hs[N - 1]);
  const at = f => {
    if (f < ta) return { pos: p0, yaw: y0, tumble: 0, roll: 0, air: 0 };
    if (f >= tl) return { pos: pts[pts.length - 1], yaw: y1, tumble: 0, roll: 0, air: 0 };
    const i = f - ta, u = i / D, pos = raw(f);
    // turn from the take-off heading into the flight in the first 12 frames, and to the landing heading in the last 10
    let yaw = Hs[i]; const kIn = smoother(i / 12), kOut = smoother((D - i) / 10);
    yaw = y0 + (unwrap(yaw, y0) - y0) * kIn; yaw = y1 + (unwrap(yaw, y1) - y1) * kOut;
    const a = raw(f - 1), b = raw(f + 1), hv = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, vz = (b[2] - a[2]) / 2;
    const climb = Math.atan2(vz, Math.max(hv, 1e-4)) / DEG;
    const kFly = smoother(i / 10) * smoother((D - i) / 14);
    const tumble = kFly * clamp(maxP * clamp(hv / 0.12) - 0.55 * climb, -20, 88);
    const turn = (Hs[Math.min(N - 1, i + 1)] - Hs[Math.max(0, i - 1)]) / 2;
    let roll = kFly * clamp(-bank * turn, -65, 65);
    if (p.barrel) { const { deg = 360, from = 0.55, to = 0.75 } = p.barrel; roll += deg * smoother((u - from) / (to - from)); }
    const sp = spin * smoother(u);
    return { pos, yaw: yaw + sp, tumble, roll, air: 1 };
  };
  st.pos = pts[pts.length - 1].slice(); st.yaw = y1;
  const r = merge(
    pose('launch', t0, st, C, { hold: Math.max(1, A - 6), antic: 1 }),
    pose(p.air || 'superman', ta - 2, st, C, { hold: Math.max(6, D - 14), antic: 0 }),
    pose(p.land || 'hero_land', tl - 3, st, C, { hold: LH, antic: 0 }));
  r.owners.push({ chan: 'body', start: t0, fade: 0, verb: 'fly', fn: f => { const s = at(f); return body(s.air ? rootFor(s.pos, s.yaw, s.tumble, s.roll) : s.pos, s.yaw); } });
  r.owners.push({ chan: 'add', start: t0, verb: 'fly', fn: f => { const s = at(f); return s.air ? { x_tumble: s.tumble, x_roll: s.roll, x_air: 1 } : {}; } });
  r.cues.push({ f: ta, name: 'whoosh', strength: 0.8 }, { f: tl, name: 'thud', strength: 1.0 });
  r.end = Math.max(r.end, tl + LH + 10);
  return r;
}

POSE_VERBS.leap = ACT.leap = leap;
POSE_VERBS.fly = ACT.fly = fly;
