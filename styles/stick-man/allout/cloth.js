// A small position-based (Verlet) cloth for costume layers: particles, distance constraints (stretch) and second-ring
// distance constraints (bend), pinned particles that follow the body, gravity, air damping, and collision against the
// body's own solid volumes (engine/body.js: the head ellipsoid and the torso slices, the same volumes the arm contact
// solver uses) and the arm bones as capsules. Units: metres, world space (three.js, +y up). Deterministic: the result
// depends only on the start state and the sequence of steps.
import * as THREE from 'three';

export const G = 9.8;

export class Cloth {
  // n particles; edges / bends [[i, j, rest]]; pin: Uint8Array (1 = follows its target)
  constructor(n, edges, bends, pin, { stiff = 1, bend = 0.3, damp = 0.02, iters = 3, margin = 0.006, tether = 0, reach = Infinity } = {}) {
    Object.assign(this, { n, edges, bends, pin, stiff, bend, damp, iters, margin, tether, reach });
    this.x = new Float64Array(3 * n); this.p = new Float64Array(3 * n); this.contact = new Uint8Array(n);
  }
  set(i, v) { this.x.set(v, 3 * i); this.p.set(v, 3 * i); }
  // one sub-step of dt seconds: Verlet integration under gravity, then constraints, pins and collisions. pinAt(i) is
  // where particle i belongs on the body this sub-step: a pinned particle is put there; a free one is pulled toward it
  // by `tether` (times its own weight tw[i], 0..1) per iteration and never strays further than `reach` (3x for tw 0) (long-range attachment: a garment held on by its
  // seams and by friction, so it lags, swings and settles but never slides off the body)
  sub(dt, pinAt, colliders, capsules) {
    const { x, p, n } = this, k = 1 - this.damp, g = -G * dt * dt;
    for (let i = 0; i < n; i++) {
      if (this.pin[i]) continue;
      for (let c = 0; c < 3; c++) { const a = 3 * i + c, v = (x[a] - p[a]) * k; p[a] = x[a]; x[a] += v + (c === 1 ? g : 0); }
    }
    for (let it = 0; it < this.iters; it++) {
      this.solve(this.edges, this.stiff); this.solve(this.bends, this.bend);
      for (let i = 0; i < n; i++) {
        const t = pinAt(i);
        if (this.pin[i]) { x[3 * i] = t[0]; x[3 * i + 1] = t[1]; x[3 * i + 2] = t[2]; continue; }
        if (!this.tether && this.reach === Infinity) continue;
        let dx = x[3 * i] - t[0], dy = x[3 * i + 1] - t[1], dz = x[3 * i + 2] - t[2];
        const tw = this.tw ? this.tw[i] : 1, k = 1 - this.tether * tw, R = this.reach * (this.tw ? 1 + 2 * (1 - tw) : 1); dx *= k; dy *= k; dz *= k;
        const l = Math.hypot(dx, dy, dz); if (l > R) { const s = R / l; dx *= s; dy *= s; dz *= s; }
        x[3 * i] = t[0] + dx; x[3 * i + 1] = t[1] + dy; x[3 * i + 2] = t[2] + dz;
      }
      this.collide(colliders, capsules);
    }
  }
  solve(list, s) {
    const x = this.x, pin = this.pin;
    for (const [i, j, r] of list) {
      const dx = x[3 * j] - x[3 * i], dy = x[3 * j + 1] - x[3 * i + 1], dz = x[3 * j + 2] - x[3 * i + 2], l = Math.hypot(dx, dy, dz);
      if (l < 1e-9) continue;
      const wi = pin[i] ? 0 : 1, wj = pin[j] ? 0 : 1, ws = wi + wj; if (!ws) continue;
      const c = s * (l - r) / (l * ws);
      x[3 * i] += wi * c * dx; x[3 * i + 1] += wi * c * dy; x[3 * i + 2] += wi * c * dz;
      x[3 * j] -= wj * c * dx; x[3 * j + 1] -= wj * c * dy; x[3 * j + 2] -= wj * c * dz;
    }
  }
  // colliders: [(point THREE.Vector3, margin) -> surface point or null]; capsules: [[a, b, r]] (THREE.Vector3, metres)
  collide(colliders, capsules) {
    const x = this.x, v = _v, m = this.margin;
    for (let i = 0; i < this.n; i++) {
      if (this.pin[i]) continue;
      v.set(x[3 * i], x[3 * i + 1], x[3 * i + 2]); let hit = 0;
      for (const C of colliders) { const s = C(v, m); if (s) { v.copy(s); hit = 1; } }
      for (const [a, b, r] of capsules) {
        _ab.subVectors(b, a); const t = Math.max(0, Math.min(1, _av.subVectors(v, a).dot(_ab) / Math.max(1e-9, _ab.lengthSq())));
        _cp.copy(a).addScaledVector(_ab, t); const d = v.distanceTo(_cp), R = r + m;
        if (d < R && d > 1e-9) { v.sub(_cp).multiplyScalar(R / d).add(_cp); hit = 1; }
      }
      if (hit) { x[3 * i] = v.x; x[3 * i + 1] = v.y; x[3 * i + 2] = v.z; }
      this.contact[i] = hit;
    }
  }
  // the largest relative stretch of any edge (0.05 = 5 % longer than at rest)
  stretch(q = 1) {   // q < 1: that quantile of the edges instead of the worst one (0.99 = p99)
    const x = this.x, a = [];
    for (const [i, j, r] of this.edges) { const l = Math.hypot(x[3 * j] - x[3 * i], x[3 * j + 1] - x[3 * i + 1], x[3 * j + 2] - x[3 * i + 2]); a.push(l / r - 1); }
    a.sort((u, v) => u - v); return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1)))];
  }
  // the edge stretched most: [i, j, stretch]
  worst() { const x = this.x; let w = [0, 0, -1]; for (const [i, j, r] of this.edges) { const s = Math.hypot(x[3 * j] - x[3 * i], x[3 * j + 1] - x[3 * i + 1], x[3 * j + 2] - x[3 * i + 2]) / r - 1; if (s > w[2]) w = [i, j, s]; } return w; }
}
const _v = new THREE.Vector3(), _ab = new THREE.Vector3(), _av = new THREE.Vector3(), _cp = new THREE.Vector3();
