// One continuous camera flight for an act's `direct` list (kit/acting/director.js), and the waypoints that keep a face to
// the lens. Each film that flew its camera had its own copy of flyCam; this is the one copy, with every option they used.
//   flyCam(WP, F0, F1, o)  waypoints [{ f, pos, aim, lens, roll? }] (Blender metres, frames in order) joined by a Catmull-Rom
//                          curve timed by their frames: one `direct` entry a frame, the camera never stops at a waypoint and
//                          never cuts. A slow drift is two waypoints close together. o: { off(f), shake(f) (both [x,y,z]
//                          added to pos and aim: ride a car, a handheld jitter), dof (value or f => value), intent, why }
//   faceCam(o)             waypoints that keep a figure's face to the lens as it turns and moves: the camera arcs round with
//                          it at eye height, `side` degrees off its nose, instead of hanging over the cap or staying behind
//                          its head while it turns away. Feed them to flyCam.
//   pathOf(keys)           { at(f), yaw(f) } from an actor's anim keys (a placed library clip, placeClip(...).keys, or hand
//                          keys): the easy way to fly with a clip, faceCam({ ...pathOf(placed.keys), f0, f1 })
//   faceAngle(fig, yaw, cam) how far round from the figure's nose the camera stands (deg, 0 = straight in front)
const sub3 = (a, b) => a.map((x, i) => x - b[i]), mul3 = (a, k) => a.map(x => x * k);
const DEG = Math.PI / 180;

// Catmull-Rom with non-uniform times (Barry-Goldman): C1 through every point, its speed set by the frame spacing
export function crT(P, T, t) {
  let j = 0; while (j + 2 < P.length && T[j + 1] <= t) j++;
  const i1 = j, i2 = Math.min(P.length - 1, j + 1), i0 = Math.max(0, i1 - 1), i3 = Math.min(P.length - 1, i2 + 1), p1 = P[i1], p2 = P[i2];
  const t1 = T[i1], t2 = T[i2], t0 = i0 === i1 ? t1 - (t2 - t1) : T[i0], t3 = i3 === i2 ? t2 + (t2 - t1) : T[i3];
  if (t2 <= t1) return p1.slice();
  const tt = Math.min(t2, Math.max(t1, t)), L = (a, b, ta, tb) => a.map((x, k) => ((tb - tt) * x + (tt - ta) * b[k]) / (tb - ta));
  const q0 = i0 === i1 ? sub3(mul3(p1, 2), p2) : P[i0], q3 = i3 === i2 ? sub3(mul3(p2, 2), p1) : P[i3];
  const A1 = L(q0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, q3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}

export function flyCam(WP, F0, F1, { off = () => [0, 0, 0], shake = () => [0, 0, 0], dof, intent = 'ms', why = 'one flight' } = {}) {
  const T = WP.map(w => w.f), P = WP.map(w => w.pos), A = WP.map(w => w.aim), Z = WP.map(w => [1 / w.lens]), R = WP.map(w => [w.roll || 0]);
  const out = [];
  for (let f = F0; f <= F1; f++) {
    const o = off(f), s = shake(f), pos = crT(P, T, f).map((v, i) => v + o[i] + s[i]), aim = crT(A, T, f).map((v, i) => v + o[i] + s[i]);
    const lens = 1 / crT(Z, T, f)[0], roll = crT(R, T, f)[0], d = typeof dof === 'function' ? dof(f) : dof;
    out.push({ at: { f }, intent, why, cut: 'cut', drift: 0,
      cam: { pos: pos.map(x => +x.toFixed(4)), aim: aim.map(x => +x.toFixed(4)), lens: +lens.toFixed(3), ...(Math.abs(roll) > 0.01 ? { roll: +roll.toFixed(2) } : {}) },
      ...(d ? { dof: d } : {}) });
  }
  return out;
}

// the figure's nose direction in Blender x/y for a kit yaw (deg, 0 = facing -Y; engine/cast.js place)
const nose = yaw => [Math.sin(yaw * DEG), -Math.cos(yaw * DEG)];
export function faceAngle(fig, yaw, cam) {
  const n = nose(yaw), d = [cam[0] - fig[0], cam[1] - fig[1]], l = Math.hypot(...d) || 1;
  return Math.acos(Math.max(-1, Math.min(1, (n[0] * d[0] + n[1] * d[1]) / l))) / DEG;
}

// keys [{ f, pos: [x, y, z?], yaw }] in any order, either channel may be missing on a key: linear between the keys that have
// it, held before the first and after the last
export function pathOf(keys) {
  const chan = get => keys.filter(k => get(k) != null).sort((a, b) => a.f - b.f).map(k => [k.f, get(k)]);
  const P = chan(k => k.pos && [k.pos[0], k.pos[1], k.pos[2] ?? 0]), Y = chan(k => k.yaw);
  const lerpAt = (C, f, fb) => { if (!C.length) return fb; if (f <= C[0][0]) return C[0][1]; const i = C.findIndex(c => c[0] > f); if (i < 0) return C.at(-1)[1];
    const [fa, a] = C[i - 1], [fz, b] = C[i], u = (f - fa) / (fz - fa); return Array.isArray(a) ? a.map((x, j) => x + (b[j] - x) * u) : a + (b - a) * u; };
  return { at: f => lerpAt(P, f, [0, 0, 0]), yaw: f => lerpAt(Y, f, 0) };
}

// at(f) -> the figure's [x, y, z] (feet), yaw(f) -> its yaw (deg); a waypoint every `every` frames from f0 to f1 (f1 always).
// dist and lens may be numbers or functions of the frame (a push in to the face)
export function faceCam({ at, yaw, f0, f1, every = 6, side = 25, dist = 2.2, eye = 1.3, look = 1.2, lens = 28 }) {
  const fs = [], val = (v, f) => (typeof v === 'function' ? v(f) : v); for (let f = f0; f < f1; f += every) fs.push(f); fs.push(f1);
  return fs.map(f => {
    const p = at(f), a = (yaw(f) + side) * DEG, n = [Math.sin(a), -Math.cos(a)], d = val(dist, f);
    return { f, pos: [p[0] + n[0] * d, p[1] + n[1] * d, p[2] + eye], aim: [p[0], p[1], p[2] + look], lens: val(lens, f) };
  });
}
