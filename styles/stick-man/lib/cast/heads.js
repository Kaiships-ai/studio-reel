// Head redesign proposals (Kai 11/11: "thiết kế lại phần đầu, 3 kiểu dựa trên reference"). Each is a full head: proportion
// (spec.head = [width, height] scale of the round head), a hair shape built as clean flat solids (no curl pile), and Kip's
// headband. Shapes come from the reference shorts: A the kid (wide round head, one smooth hair dome puffing over the band),
// B the rival (taller egg, one slick pompadour swoop), C the court (even round head, smooth cap with a clean hairline
// and a top bun). View: faces3d.html?spec=KIP_A|KIP_B|KIP_C&glasses=0&names=grin,smug&yaws=0,35,75,180
import * as THREE from 'three';
import { toon } from '../../engine/look.js';
import { KAI, W_M, HEAD_H, solid, bandana } from '../../engine/cast.js';

const W = W_M, HA = 0.5 * W, HB = 0.5 * HEAD_H * W, DEG = Math.PI / 180;
// hair reads as one flat colour with a single soft shade step, like the reference (never a glossy or bumpy mass)
const hairMat = col => toon(col, { shade: [0.86, 0.84, 0.94], sheen: 0, rough: 1, rim: 0, soft: 0.4 });
const ell = (lat, lon, out = 0) => new THREE.Vector3((HA + out) * Math.cos(lat) * Math.sin(lon), (HB + out) * Math.sin(lat), (HA + out) * Math.cos(lat) * Math.cos(lon));
// a smooth skull cap: the head surface pushed out by `out` above a hairline that rises at the front (front, side, back lat)
function capGeo(front, side, back, out, outLow = out, split = 40) {   // outLow: thinner below `split` lat, where a band sits over it
  const g = new THREE.SphereGeometry(1, 96, 64), p = g.attributes.position, d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const lon = Math.atan2(d.x, d.z), c = Math.cos(lon), line = c >= 0 ? side + (front - side) * c : side + (back - side) * -c;
    const lat = Math.asin(Math.max(-1, Math.min(1, d.y))) / DEG, k = Math.min(1, Math.max(0, (lat - line) / 6));   // a soft 6 deg edge
    const o = lat > split ? out : outLow + (out - outLow) * Math.max(0, (lat - split + 6) / 6), r = (1 / Math.hypot(d.x / HA, d.y / HB, d.z / HA)) * (0.97 + (0.03 + o / HA) * k);
    p.setXYZ(i, d.x * r, d.y * r, d.z * r);
  }
  g.computeVertexNormals(); return g;
}
const blob = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 32, 20); g.scale(rx, ry, rz); return g; };
const place = (m, p, rot = [0, 0, 0]) => { m.position.copy(p); m.rotation.set(...rot.map(a => a * DEG)); return m; };

// A: smooth dome. One smooth hair dome that puffs out above the band and lies flat under it at the sides (no curl pile);
// the widest, roundest head (the reference kid)
export function smoothDome(col = [0.45, 0.24, 0.10]) {
  return () => {
    const g = new THREE.Group(), m = hairMat(col);
    g.add(solid(capGeo(30, 6, -14, 0.10 * W, 0.022 * W, 42), m));   // puffs out above the band, lies flat under it
    return g;
  };
}
// B: pompadour. A close slicked cap and one long swoop riding from the forehead back over the crown, its front lifted and
// rolled forward (the reference rival); the taller egg head
export function pompadour(col = [0.20, 0.12, 0.08]) {
  return () => {
    const g = new THREE.Group(), m = hairMat(col);
    g.add(solid(capGeo(40, 12, -16, 0.03 * W), m));
    g.add(place(solid(blob(0.40 * W, 0.11 * W, 0.40 * W), m), new THREE.Vector3(0.02 * W, HB * 0.90, 0.04 * W), [-12, 0, -4]));
    g.add(place(solid(blob(0.30 * W, 0.10 * W, 0.15 * W), m), new THREE.Vector3(0.07 * W, HB * 0.80, 0.36 * W), [-30, 10, -8]));
    return g;
  };
}
// C: smooth cap with a clean hairline and a round bun on top (the reference court figures)
export function topBun(col = [0.16, 0.10, 0.07]) {
  return () => {
    const g = new THREE.Group(), m = hairMat(col);
    g.add(solid(capGeo(34, 6, -24, 0.04 * W), m));
    g.add(place(solid(blob(0.15 * W, 0.13 * W, 0.15 * W), m), new THREE.Vector3(0, HB + 0.10 * W, -0.02 * W)));
    return g;
  };
}

const BAND = bandana();
export const KIP_A = { ...KAI, name: 'Kip A', glasses: false, head: [1.07, 0.93], hair: [smoothDome(), BAND] };
export const KIP_B = { ...KAI, name: 'Kip B', glasses: false, head: [0.94, 1.07], hair: [pompadour(), BAND] };
export const KIP_C = { ...KAI, name: 'Kip C', glasses: false, head: [1.0, 1.0], hair: [topBun(), BAND] };
