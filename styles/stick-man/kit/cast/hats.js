// The wardrobe's hats (kit/cast/wardrobe.js): rigid on the head, no sim (Kai hates wobble). hatOf(kind) -> a group for the head.
import * as THREE from 'three';
import { lathe, W_M, HEAD_H, HAT_LIFT } from '#engine/cast.js';
import { DEG } from '#engine/mathx.js';
import { inked, wearMat } from './wear.js';
import { UNIFORM, mul } from './palette.js';

const HB = 0.5 * HEAD_H * W_M, sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const Y0H = HB * 0.62 + HAT_LIFT;
// a cap's peak: the profile [[r, y], ...] (inner to outer) swept across the front, `thick` deep, a closed solid whose outline is a
// half ellipse (the angle runs evenly round its edge: run evenly across, its two corners were cut off in one step, and a top
// and an edge that shared points were shaded as one smear)
function peakGeo(prof, span, thick) {
  const n = 40, m = prof.length, P = [], N = [], idx = [], tris = (a, b, c, d) => { for (const [p, q, r] of [[a, b, c], [a, c, d]]) { const i = P.length / 3, u = new THREE.Vector3().subVectors(q, p), w = new THREE.Vector3().subVectors(r, p), k = u.cross(w); if (k.lengthSq() < 1e-14) continue; k.normalize(); for (const v of [p, q, r]) { P.push(v.x, v.y, v.z); N.push(k.x, k.y, k.z); } idx.push(i, i + 1, i + 2); } };
  const at_ = (i, j, f) => { const t = -Math.PI / 2 + Math.PI * i / n, a = span * Math.sin(t), w = Math.max(0.02, Math.cos(t)), [r, y] = prof[j], k = prof[0][0] + (r - prof[0][0]) * w; return new THREE.Vector3(k * Math.sin(a), prof[0][1] + (y - prof[0][1]) * w - f * thick, k * Math.cos(a)); };
  for (let i = 0; i < n; i++) { for (let j = 0; j + 1 < m; j++) { tris(at_(i, j, 0), at_(i, j + 1, 0), at_(i + 1, j + 1, 0), at_(i + 1, j, 0)); tris(at_(i, j, 1), at_(i + 1, j, 1), at_(i + 1, j + 1, 1), at_(i, j + 1, 1)); } for (const [j, sg] of [[m - 1, 1], [0, -1]]) { const q = [at_(i, j, 0), at_(i, j, 1), at_(i + 1, j, 1), at_(i + 1, j, 0)]; sg > 0 ? tris(...q) : tris(...q.reverse()); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(idx); return g;
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
    // one brim all round, drawn out at the front (a ring and a separate visor showed two lips)
    const brim = lathe([[0.226, y0 - 0.018], [0.266, y0 - 0.022], [0.270, y0 - 0.014], [0.234, y0 + 0.004]], 72), Q = brim.attributes.position; for (let i = 0; i < Q.count; i++) { const x = Q.getX(i), z = Q.getZ(i), r = Math.hypot(x, z), f = sstep(0.55, 0.95, z / r) * sstep(0.235, 0.262, r) * 0.052; Q.setXYZ(i, x * (1 + f / r), Q.getY(i) - 0.10 * f, z * (1 + f / r)); } brim.computeVertexNormals(); put(brim, mul(c, 0.9), 0.005);
    const arc = []; for (let i = 0; i <= 14; i++) { const a = 0.35 + (Math.PI - 0.7) * i / 14; arc.push(new THREE.Vector3(0, y0 - 0.012 + 0.192 * Math.sin(a), 0.238 * Math.cos(a))); }
    put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 30, 0.013, 8, false), mul(c, 0.95), 0.003);
  } else if (kind === 'scrub') {                                  // a surgical cap: a soft dome to the hairline, its band, the tie at the back
    const c = UNIFORM.teal, pr = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pr.push([0.262 * Math.cos(a) ** 0.8, y0 - 0.040 + 0.205 * Math.sin(a)]); }
    put(lathe([[0, y0 - 0.040], ...pr.slice(0, -1), [0, y0 + 0.165]], 48), c); const b = put(new THREE.CylinderGeometry(0.262, 0.268, 0.050, 48, 1, true).translate(0, y0 - 0.020, 0), mul(c, 0.45), 0.004); b.material.side = THREE.DoubleSide;
    for (const sg of [-1, 1]) put(new THREE.SphereGeometry(0.030, 12, 10).scale(1.2, 0.8, 0.6).translate(sg * 0.034, y0 - 0.022, -0.275), mul(c, 0.45), 0.004);
  } else if (kind === 'toque') {
    const c = UNIFORM.toque; put(new THREE.CylinderGeometry(0.206, 0.206, 0.075, 48, 1, false).translate(0, y0 + 0.035, 0), mul(c, 0.94), 0.004);
    const pr = [[0.198, y0 + 0.07]]; for (let i = 1; i <= 12; i++) { const u = i / 12; pr.push([0.198 + 0.06 * Math.sin(u * Math.PI * 0.85) - 0.07 * u * u, y0 + 0.07 + 0.25 * u]); } pr.push([0, y0 + 0.32]);
    const puff = lathe(pr, 64), P = puff.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), y = P.getY(i), k = 1 + 0.045 * Math.cos(14 * Math.atan2(x, z)) * sstep(y0 + 0.07, y0 + 0.12, y); P.setXYZ(i, x * k, y, z * k); }
    puff.computeVertexNormals(); put(puff, c);
  }
  g.rotation.x = -8 * DEG; return g;
}

// hair or a hat of the figure's own under a hat it puts on: what stands above the new hat's band goes in under it (a curl came out
// of a cap's crown; a spec's own hat stood inside it)
export function tuckHair(S, kind) {
  const hair = S.parts.hair, head = S.parts.head.parent; if (!hair?.children.length) return; const band = Y0H + { police: -0.05, pilot: -0.05, scrub: -0.04, hard: -0.02, toque: 0 }[kind], A = 0.5 * W_M * 0.96, v = new THREE.Vector3(); head.updateWorldMatrix(true, true); const Hi = head.matrixWorld.clone().invert(), c = Math.cos(8 * DEG), s = Math.sin(8 * DEG);
  hair.traverse(o => { if (!o.isMesh) return; const M = Hi.clone().multiply(o.matrixWorld), Mi = M.clone().invert(), P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); if (v.y * c + v.z * s < band) continue; const e = Math.hypot(v.x / A, v.y / (A * HEAD_H), v.z / A); if (e > 1) v.multiplyScalar(1 / e); v.applyMatrix4(Mi); P.setXYZ(i, v.x, v.y, v.z); } P.needsUpdate = true; o.geometry.computeVertexNormals(); });
}
