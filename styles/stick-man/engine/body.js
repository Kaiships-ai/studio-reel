// The figure's body as solid volumes, so arms obey physics and anatomy (Kai, 2026-11-12: "làm gì có con người nào gãi
// đầu mà tay đâm xuyên qua đầu"). Ground truths, each one rule here:
//   - two solids never share space: the head and the torso are volumes the size they are drawn, an arm is a tube as thick
//     as its ink line; a hand that reaches into a volume stops on its surface (contact), an elbow is pushed outside
//   - bones keep their length: contact moves the hand and re-solves the elbow, it never stretches the arm
//   - joints bend within a range: JOINTS (deg), from clinical range-of-motion norms (shoulder 0-180, elbow 0-145, one way)
// All positions are the figure's root space in W units (head width = 1), the space cast.js S.pose2 works in.
import * as THREE from 'three';

export const JOINTS = { raise: [-20, 180], swing: [-180, 60], elbow: [0, 145] };
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
    kind,
    test(p, margin = 0) {
      l.copy(p).sub(c).applyQuaternion(qi);
      const R = r.map(x => x + margin), s = Math.hypot(l.x / R[0], l.y / R[1], l.z / R[2]);
      if (s >= 1) return null;
      const depth = s < 1e-6 ? Math.min(...R) : l.length() * (1 / s - 1);
      const n = new THREE.Vector3(l.x / (R[0] * R[0]), l.y / (R[1] * R[1]), l.z / (R[2] * R[2]));
      if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
      return { depth, n: n.normalize().applyQuaternion(q) };
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

// contact solve: move the hand out of any volume along its surface normal, push the elbow outward if the upper arm is
// inside, re-solve the elbow each time (bones keep their length), then keep the elbow inside its range
export function solveArm({ sh, elbow, hand, pole, l, vols, ik, flex, limb, handR, out = new THREE.Vector3(1, 0, 0.3) }) {
  const before = armPenetration(sh, elbow, hand, vols, { limb, handR });
  let E = elbow.clone(), H = hand.clone(), P = pole.clone(), F = flex, it = 0, w = before;
  const safePole = () => { if (!(P.lengthSq() > 1e-6) || !Number.isFinite(P.x)) P.copy(out); P.normalize(); };
  while (w && it++ < 80) {
    const k = it < 20 ? 0.7 : 1.3;                                            // small steps first, firmer if it has not converged
    if (w.seg === 'upper') { P.addScaledVector(w.n, 0.6 * k); safePole(); H.addScaledVector(w.n, w.depth * 0.3 * k + 0.002); }
    else H.addScaledVector(w.n, k * w.depth / Math.max(0.6, w.seg === 'hand' ? 1 : w.t) + 0.002);   // small steps: the hand ends on the surface, not flung past it
    safePole();
    const r = ik(sh, H, l, P); E = r.joint; H = r.end; F = r.flex;
    w = armPenetration(sh, E, H, vols, { limb, handR });
  }
  let limits = 0;
  const dMin = 2 * l * Math.cos(JOINTS.elbow[1] / 2 * Math.PI / 180), dv = H.clone().sub(sh), d = dv.length();
  if (d < dMin) { H = sh.clone().addScaledVector(d > 1e-6 ? dv.normalize() : out.clone().normalize(), dMin); const r = ik(sh, H, l, P); E = r.joint; H = r.end; F = r.flex; limits++; }
  const after = armPenetration(sh, E, H, vols, { limb, handR });
  return { elbow: E, hand: H, flex: F, pen0: before ? before.depth : 0, pen: after ? after.depth : 0, limits, moved: !!before };
}
