// The wardrobe's hats (kit/cast/wardrobe.js): rigid on the head, no sim (Kai hates wobble). hatOf(kind) -> a group for the head.
import * as THREE from 'three';
import { lathe, W_M, HEAD_H, HAT_LIFT } from '#engine/cast.js';
import { DEG } from '#engine/mathx.js';
import { inked, wearMat } from './wear.js';
import { UNIFORM, mul } from './palette.js';

const HB = 0.5 * HEAD_H * W_M, sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const Y0H = HB * 0.62 + HAT_LIFT;
function visorGeo(r0, r1, span, thick) {
  const s = new THREE.Shape(), n = 16; for (let i = 0; i <= n; i++) { const a = -span + 2 * span * i / n; (i ? s.lineTo.bind(s) : s.moveTo.bind(s))(r1 * Math.sin(a), r1 * Math.cos(a)); }
  for (let i = n; i >= 0; i--) { const a = -span + 2 * span * i / n; s.lineTo(r0 * Math.sin(a), r0 * Math.cos(a)); }
  return new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false }).rotateX(Math.PI / 2);
}
// a cap's peak: the profile [[r, y], ...] (inner to outer) swept across the front, `thick` deep, narrowing to the band at its sides
function peakGeo(prof, span, thick) {
  const n = 24, m = prof.length, P = [], idx = [], id = (i, j, f) => (f * (n + 1) + i) * m + j;
  for (let f = 0; f < 2; f++) for (let i = 0; i <= n; i++) { const u = -1 + 2 * i / n, a = span * u, w = Math.sqrt(Math.max(0, 1 - u * u)); prof.forEach(([r, y]) => { const k = prof[0][0] + (r - prof[0][0]) * w, yy = prof[0][1] + (y - prof[0][1]) * w; P.push(k * Math.sin(a), yy - f * thick, k * Math.cos(a)); }); }
  for (let i = 0; i < n; i++) for (let j = 0; j + 1 < m; j++) { const q = [id(i, j, 0), id(i, j + 1, 0), id(i + 1, j, 0), id(i + 1, j + 1, 0)], r = [id(i, j, 1), id(i, j + 1, 1), id(i + 1, j, 1), id(i + 1, j + 1, 1)]; idx.push(q[0], q[1], q[2], q[2], q[1], q[3], r[0], r[2], r[1], r[2], r[3], r[1]); }
  for (let i = 0; i < n; i++) { const a = id(i, m - 1, 0), b = id(i + 1, m - 1, 0), c = id(i, m - 1, 1), d = id(i + 1, m - 1, 1); idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function hatOf(kind) {
  const g = new THREE.Group(), y0 = Y0H, put = (geo, c, ink = 0.006) => { const m = inked(geo, wearMat(c), ink, { shadow: true }); g.add(m); return m; };
  if (kind === 'police' || kind === 'pilot') {
    // the band sits on the skull (the head is 0.24 m in radius there), the crown flares over it, the peak comes down over the brow
    const c = kind === 'pilot' ? UNIFORM.pilot : UNIFORM.policeCap, b0 = y0 - 0.052;
    put(lathe([[0, b0 + 0.05], [0.252, b0 + 0.05], [0.272, b0 + 0.085], [0.312, b0 + 0.128], [0.302, b0 + 0.152], [0.12, b0 + 0.172], [0, b0 + 0.172]], 56), c, 0.012);
    const band = put(new THREE.CylinderGeometry(0.255, 0.262, 0.062, 56, 1, true).translate(0, b0 + 0.026, 0), kind === 'pilot' ? UNIFORM.gold : mul(c, 2.4), 0.008); band.material.side = THREE.DoubleSide;
    const pk = []; for (let i = 0; i <= 4; i++) pk.push([0.245 + 0.085 * i / 4, b0 + 0.002 - 0.050 * (i / 4) ** 1.4]); put(peakGeo(pk, 0.85, 0.012), UNIFORM.dark, 0.008);
    put(new THREE.CylinderGeometry(0.040, 0.040, 0.010, 6).rotateX(Math.PI / 2).translate(0, b0 + 0.094, 0.292), UNIFORM.gold, 0.006); put(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 16).rotateX(Math.PI / 2).translate(0, b0 + 0.094, 0.299), mul(UNIFORM.gold, 0.4), 0.003);
    if (kind === 'pilot') { const p2 = [[0.300, b0 - 0.024], [0.322, b0 - 0.038]].map(([r, y]) => [r, y + 0.009]); put(peakGeo(p2, 0.72, 0.006), UNIFORM.gold, 0.002);
      for (const sg of [-1, 1]) put(new THREE.SphereGeometry(0.03, 14, 10).scale(1.7, 0.5, 0.35).translate(sg * 0.070, b0 + 0.096, 0.284), UNIFORM.gold, 0.005); }
  } else if (kind === 'hard') {
    const c = UNIFORM.hard, pr = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pr.push([0.236 * Math.cos(a), y0 - 0.012 + 0.19 * Math.sin(a)]); }
    put(lathe([[0, y0 - 0.012], ...pr.slice(0, -1), [0, y0 + 0.178]], 48), c);
    put(lathe([[0.226, y0 - 0.016], [0.27, y0 - 0.022], [0.272, y0 - 0.012], [0.236, y0 + 0.006]], 48), mul(c, 0.9), 0.004);
    put(visorGeo(0.22, 0.31, 0.8, 0.010).translate(0, y0 - 0.006, 0), mul(c, 0.9), 0.004);
    const arc = []; for (let i = 0; i <= 14; i++) { const a = 0.35 + (Math.PI - 0.7) * i / 14; arc.push(new THREE.Vector3(0, y0 - 0.012 + 0.192 * Math.sin(a), 0.238 * Math.cos(a))); }
    put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 30, 0.013, 8, false), mul(c, 0.95), 0.003);
  } else if (kind === 'scrub') {                                  // a surgical cap: a soft dome to the hairline, its band, the tie at the back
    const c = UNIFORM.teal, pr = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pr.push([0.262 * Math.cos(a) ** 0.8, y0 - 0.040 + 0.205 * Math.sin(a)]); }
    put(lathe([[0, y0 - 0.040], ...pr.slice(0, -1), [0, y0 + 0.165]], 48), c); const b = put(new THREE.CylinderGeometry(0.262, 0.268, 0.050, 48, 1, true).translate(0, y0 - 0.020, 0), mul(c, 0.45), 0.004); b.material.side = THREE.DoubleSide;
    for (const sg of [-1, 1]) put(new THREE.SphereGeometry(0.030, 12, 10).scale(1.2, 0.8, 0.6).translate(sg * 0.034, y0 - 0.022, -0.275), mul(c, 0.45), 0.004);
  } else if (kind === 'toque') {
    const c = UNIFORM.toque, band = put(new THREE.CylinderGeometry(0.206, 0.206, 0.075, 48, 1, false).translate(0, y0 + 0.035, 0), mul(c, 0.94), 0.004);
    const pr = [[0.198, y0 + 0.07]]; for (let i = 1; i <= 12; i++) { const u = i / 12; pr.push([0.198 + 0.06 * Math.sin(u * Math.PI * 0.85) - 0.07 * u * u, y0 + 0.07 + 0.25 * u]); } pr.push([0, y0 + 0.32]);
    const puff = lathe(pr, 64), P = puff.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), y = P.getY(i), k = 1 + 0.045 * Math.cos(14 * Math.atan2(x, z)) * sstep(y0 + 0.07, y0 + 0.12, y); P.setXYZ(i, x * k, y, z * k); }
    puff.computeVertexNormals(); put(puff, c); band.renderOrder = 0;
  }
  g.rotation.x = -8 * DEG; return g;
}

