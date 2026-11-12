// The figure's body as solid volumes, so arms obey physics and anatomy (Kai, 2026-11-12: "làm gì có con người nào gãi
// đầu mà tay đâm xuyên qua đầu"). Ground truths, each one rule here:
//   - two solids never share space: the head and the torso are volumes the size they are drawn, an arm is a tube as thick
//     as its ink line; a hand that reaches into a volume stops on its surface (contact), an elbow is pushed outside
//   - bones keep their length: contact moves the hand and re-solves the elbow, it never stretches the arm
//   - joints bend within a range: JOINTS (deg), from clinical range-of-motion norms (shoulder 0-180, elbow 0-145, one way)
// All positions are the figure's root space in W units (head width = 1), the space cast.js S.pose2 works in.
import * as THREE from 'three';

export const JOINTS = { raise: [-20, 180], swing: [-180, 60], elbow: [0, 145] };
// the rest of the body's joint ranges (deg), clinical norms (AAOS): spine and neck channels as the pose gives them, hip
// / knee / ankle as measured on the solved leg. The ankle's 40 is weight-bearing (a deep squat needs ~38; 20 is the
// unloaded norm); past it the heel comes off the ground instead of the ankle bending further.
export const ROM = { bend: [-25, 80], side: [-35, 35], twist: [-45, 45], nod: [-45, 45], tilt: [-45, 45], turn: [-70, 70],
  hipFlex: [-20, 120], hipAbd: [-30, 45], knee: [0, 140], ankleDF: [-50, 40] };
// the spine and neck channels held inside their ranges; returns the pose with them clamped and how many were out
export function limitBody(Q = {}) {
  let hits = 0; const o = { ...Q };
  if (!PHYS.rom) return { Q: o, hits };
  for (const [part, keys] of [['spine', ['bend', 'side', 'twist']], ['neck', ['nod', 'tilt', 'turn']]]) {
    if (!Q[part]) continue; o[part] = { ...Q[part] };
    for (const k of keys) if (typeof Q[part][k] === 'number') { const c = clamp(Q[part][k], ROM[k]); if (c !== Q[part][k]) hits++; o[part][k] = c; }
  }
  return { Q: o, hits };
}
// segment masses as shares of the whole body (Winter, Biomechanics and Motor Control of Human Movement, table 4.1):
// a cartoon head is drawn big, but the body it moves is a person's, so balance uses a person's mass split
export const MASS = { head: 0.081, trunk: 0.497, upper: 0.028, fore: 0.022, thigh: 0.100, shank: 0.0465, foot: 0.0145 };
// the body's centre of mass from its joints (each segment's mass at its middle; head and trunk at their centres)
export function centreOfMass(K) {
  const c = new THREE.Vector3(), mid = (a, b) => a.clone().add(b).multiplyScalar(0.5); let m = 0;
  const add = (p, w) => { c.addScaledVector(p, w); m += w; };
  add(K.head, MASS.head); add(K.trunk, MASS.trunk);
  for (const s of [K.L, K.R]) { add(mid(s.shoulder, s.elbow), MASS.upper); add(mid(s.elbow, s.hand), MASS.fore);
    add(mid(s.hip, s.knee), MASS.thigh); add(mid(s.knee, s.ankle), MASS.shank); add(mid(s.heel || s.ankle, s.toe), MASS.foot); }
  return c.multiplyScalar(1 / m);
}
// PHYS.on = false skips the contact solve (joint ranges still hold): only for a side-by-side proof, never in a reel
export const PHYS = { on: true, rom: true, balance: true };
// balance (rig B4): with both soles on the ground a body stands only if its centre of mass is over the area its feet
// cover. Returns the horizontal shift (root space x, z, W) that brings it back inside, or null when it is inside or the
// body is not standing (stepping, jumping, falling are not standing). feet: [{ heel, toe, ankle }], gnd
export function balanceShift(com, feet, gnd = 0, { sole = 0.022, margin = 0.02 } = {}) {
  // how much each foot carries the body: 1 on the ground, fading to 0 as it lifts 6 cm (a step or a jump), so the
  // correction comes and goes smoothly instead of snapping when a foot leaves the ground
  const k = Math.min(...feet.map(f => Math.max(0, Math.min(1, 1 - (Math.min(f.heel.y, f.toe.y, f.ankle.y) - sole - gnd - 0.012) / 0.1))));
  if (k <= 0) return null;
  const P = feet.flatMap(f => [[f.heel.x, f.heel.z], [f.toe.x, f.toe.z], [f.ankle.x, f.ankle.z]]);
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of [...P].reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1)); if (H.length < 3) return null;
  const c = [com.x, com.z], cx = H.reduce((a, p) => a + p[0], 0) / H.length, cz = H.reduce((a, p) => a + p[1], 0) / H.length;
  // shrink the area by the margin so the answer lands a little inside, not on the edge
  const S = H.map(([x, z]) => { const dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1, k = Math.min(margin, l * 0.5) / l; return [x + dx * k, z + dz * k]; });
  if (S.every((p, i) => cr(p, S[(i + 1) % S.length], c) >= 0)) return null;
  let best = null;
  for (let i = 0; i < S.length; i++) { const a = S[i], b = S[(i + 1) % S.length], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] ** 2 + ab[1] ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1]) / L2)), q = [a[0] + ab[0] * t, a[1] + ab[1] * t], d = Math.hypot(q[0] - c[0], q[1] - c[1]);
    if (!best || d < best.d) best = { d, x: q[0] - c[0], z: q[1] - c[1] }; }
  return { d: best.d * k, x: best.x * k, z: best.z * k };
}
const clamp = (x, [a, b]) => Math.min(b, Math.max(a, x));

// FK arm channels held inside the joint ranges; returns the clamped channels and how many were out of range
export function limitArm(A = {}) {
  let hits = 0; const o = { ...A };
  for (const k of ['raise', 'swing', 'elbow']) if (typeof A[k] === 'number') { const c = clamp(A[k], JOINTS[k]); if (c !== A[k]) hits++; o[k] = c; }
  return { A: o, hits };
}

// the torso's rest shape as stacked elliptic slices (from its geometry, once): { y, cx, cz, rx, rz } in body space, W
export function torsoSlices(pos, { girth = 1, gz = 1, W, y0, n = 9 }) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 1; i < pos.length; i += 3) { const y = pos[i] / W + y0; lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const S = Array.from({ length: n }, () => ({ x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }));
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] * girth / W, y = pos[i + 1] / W + y0, z = pos[i + 2] * gz / W;
    const s = S[Math.min(n - 1, Math.floor((y - lo) / (hi - lo) * n))];
    s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.z0 = Math.min(s.z0, z); s.z1 = Math.max(s.z1, z);
  }
  const step = (hi - lo) / n;
  return S.filter(s => s.x1 > s.x0).map((s, i) => ({ y: lo + (i + 0.5) * step, cx: (s.x0 + s.x1) / 2, cz: (s.z0 + s.z1) / 2,
    rx: (s.x1 - s.x0) / 2, rz: (s.z1 - s.z0) / 2, ry: step * 0.85 }));
}

// an ellipsoid volume: centre c, orientation q, radii r; depth of a point inside (0 outside) and the outward normal
export function ellipsoid(c, q, r, kind) {
  const qi = q.clone().invert(), l = new THREE.Vector3();
  return {
    kind, c, q, r,
    test(p, margin = 0) {
      l.copy(p).sub(c).applyQuaternion(qi);
      const R = r.map(x => x + margin), s = Math.hypot(l.x / R[0], l.y / R[1], l.z / R[2]);
      if (s >= 1) return null;
      const depth = s < 1e-6 ? Math.min(...R) : l.length() * (1 / s - 1);
      const n = new THREE.Vector3(l.x / (R[0] * R[0]), l.y / (R[1] * R[1]), l.z / (R[2] * R[2]));
      if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
      return { depth, n: n.normalize().applyQuaternion(q) };
    },
    // the nearest way out, continuous in p: a head pushes a point straight out from its centre; a torso slice pushes
    // it out sideways in the slice's own plane (the torso is a stack of slices, so a hand slides over the belly at its
    // own height instead of popping over the top of a slice). Returns the point on the surface, or null if p is outside.
    push(p, margin = 0, fallback = null) {
      l.copy(p).sub(c).applyQuaternion(qi);
      const R = r.map(x => x + margin);
      if (Math.hypot(l.x / R[0], l.y / R[1], l.z / R[2]) >= 1) return null;
      if (kind === 'torso') {
        // out from a point 0.8 of the depth behind the centre: a hand in front of the spine always leaves by the front
        // (where arms work), so a target crossing the middle does not flip the hand to the other side
        const bz = -0.8 * R[2], dx = l.x / R[0], dz = (l.z - bz) / R[2];
        // walk out along (dx, dz) from the back point to the ellipse x^2 + z^2 = 1 (scaled): solve |b + t d| = 1
        const B0 = bz / R[2], a2 = dx * dx + dz * dz;
        if (a2 < 1e-12) { l.x = 0; l.z = R[2]; }
        else { const bq = 2 * B0 * dz, cq = B0 * B0 - 1, t = (-bq + Math.sqrt(bq * bq - 4 * a2 * cq)) / (2 * a2); l.x = t * dx * R[0]; l.z = (B0 + t * dz) * R[2]; }
      } else { const s = Math.max(1e-6, Math.hypot(l.x / R[0], l.y / R[1], l.z / R[2])); l.multiplyScalar(1 / s); }
      return l.clone().multiplyScalar(1.0005).applyQuaternion(q).add(c);
    },
  };
}

// the deepest point of an arm (shoulder sh -> elbow -> hand) inside any volume. Near the shoulder the upper arm is
// inside the torso by construction (the shoulder sits in it), so the torso only tests its outer half.
const _p = new THREE.Vector3();
export function armPenetration(sh, elbow, hand, vols, { limb = 0.023, handR = 0.05 } = {}) {
  let worst = null;
  const probe = (a, b, t0, n, seg, r) => {
    for (let i = 0; i <= n; i++) {
      const t = n ? t0 + (1 - t0) * i / n : 1; _p.copy(a).lerp(b, t);
      for (const v of vols) {
        if (v.kind === 'torso' && seg === 'upper' && t < 0.5) continue;
        const h = v.test(_p, seg === 'hand' ? handR : r);
        if (h && (!worst || h.depth > worst.depth)) worst = { ...h, seg, kind: v.kind, t };
      }
    }
  };
  probe(sh, elbow, 0.25, 6, 'upper', limb); probe(elbow, hand, 0, 8, 'fore', limb); probe(hand, hand, 0, 0, 'hand', limb);
  return worst;
}

// contact solve, from first principles and stateless (a pure function of the wanted pose, so neighbouring frames get
// neighbouring answers):
//   1. reach: the elbow folds at most JOINTS.elbow[1], so the hand comes no closer to the shoulder than dMin
//   2. the hand: a hand inside a volume goes to that volume's nearest surface (push), repeated while volumes overlap
//   3. the elbow: the bones keep their length, so the elbow lies on a circle round the shoulder-hand line; it stays on
//      the wanted side when it can, else turns round that line by the smallest angle (5 deg steps, at most 15) that
//      clears the body: a bigger swing in one frame reads as a pop
//   4. if no small turn clears it, the hand steps 2 cm out toward this arm's own side and front (an arm cannot reach
//      deep across its own body) and 3 is tried again; after 40 steps any turn is allowed
export function solveArm({ sh, elbow, hand, pole, l, vols, ik, flex, limb, handR, out = new THREE.Vector3(1, 0, 0.3) }) {
  const before = armPenetration(sh, elbow, hand, vols, { limb, handR });
  const dMin = 2 * l * Math.cos(JOINTS.elbow[1] / 2 * Math.PI / 180), o = out.clone().normalize();
  if (!before && hand.distanceTo(sh) >= dMin) return { elbow: elbow.clone(), hand: hand.clone(), flex, pen0: 0, pen: 0, limits: 0, moved: false };
  let H = hand.clone(), limits = 0;
  const reach = () => { const dv = H.clone().sub(sh), d = dv.length(); if (d >= dMin) return false; H = sh.clone().addScaledVector(d > 1e-6 ? dv.normalize() : o, dMin); limits = 1; return true; };
  const place = () => { for (let i = 0; i < 6; i++) { let moved = reach();
      for (const v of vols) { const q = v.push(H, handR, o); if (q) { H.copy(q); moved = true; } }
      if (!moved) return; } };
  // the wanted elbow's own side of the shoulder-hand line, so an arm that needs no turn keeps exactly the elbow it was
  // given (an IK pole is not the same plane as the FK elbow: using it made the elbow jump at the first touch)
  const a0 = hand.clone().sub(sh).normalize(), e0 = elbow.clone().sub(sh), P0 = e0.addScaledVector(a0, -e0.dot(a0));
  if (P0.lengthSq() < 1e-9) P0.copy(pole.lengthSq() > 1e-9 ? pole : o); P0.normalize();
  let best = null;
  for (let tries = 0; tries < 60 && !best; tries++) {
    place();
    const ax = H.clone().sub(sh).normalize();
    for (let k = 0; k <= (tries < 40 ? 6 : 72); k++) {
      const P = P0.clone().applyAxisAngle(ax, (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 5 * Math.PI / 180), r = ik(sh, H, l, P);
      const w = armPenetration(sh, r.joint, r.end, vols, { limb, handR });
      if (!w) { best = r; break; }
    }
    if (!best) H.addScaledVector(o, 0.02);                                     // no small turn clears it: the hand steps out toward its own side and front
  }
  const r = best || ik(sh, H, l, P0), after = best ? null : armPenetration(sh, r.joint, r.end, vols, { limb, handR });
  return { elbow: r.joint, hand: r.end, flex: r.flex, pen0: before ? before.depth : 0, pen: after ? after.depth : 0, limits, moved: true };
}
