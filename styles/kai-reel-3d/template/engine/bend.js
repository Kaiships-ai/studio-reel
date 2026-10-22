// bend.js: the FOLD. Everything is authored in FLAT space (street along +x, ground y = 0, z across the street).
// A bend deformer curls the world past x = X0 around an axis parallel to z: arc length s = x − X0 maps onto a circle
// of radius 1/k, so the street ahead lifts into a wall, a ceiling, a full loop. Points above the street sit inside
// the curl (radius 1/k − y). Past uMax radians the street continues straight along the tangent.
// The same map runs in GLSL (world geometry) and JS (characters, camera, sprites → rigid frames).
// A travelling shockwave (the landing) adds a flat-space y-offset before the bend.
import * as THREE from 'three';

export const B = {
  uBendK: { value: 0 },          // curvature 1/m (0 = flat; negative bows down)
  uBendX0: { value: 0 },         // where the curl starts
  uBendMax: { value: Math.PI },  // radians before the street continues straight (π = Inception ceiling)
  uWaveX: { value: 0 },          // shockwave origin (flat x)
  uWaveT: { value: -1 },         // seconds since the impact (<0 = off)
  uWaveA: { value: 0 },          // amplitude (m)
};

export const BEND_GLSL = /* glsl */`
uniform float uBendK, uBendX0, uBendMax, uWaveX, uWaveT, uWaveA;
float waveY(vec3 p){
  if (uWaveT < 0.0) return 0.0;
  float d = abs(p.x - uWaveX) + 0.35 * abs(p.z), front = uWaveT * 38.0;
  float k = d - front;
  return uWaveA * exp(-k * k / 18.0) * exp(-uWaveT * 0.9) * smoothstep(0.0, 6.0, d) - 0.0;
}
// flat → world; th = local rotation about +z
vec3 bendP(vec3 p, out float th){
  th = 0.0;
  p.y += waveY(p);
  float s = p.x - uBendX0;
  if (s <= 0.0 || abs(uBendK) < 1e-5) return p;
  float sm = uBendMax / abs(uBendK);
  float sa = min(s, sm), ex = s - sa;
  th = uBendK * sa;
  float c = cos(th), si = sin(th);
  return vec3(uBendX0 + si / uBendK - p.y * si + ex * c, (1.0 - c) / uBendK + p.y * c + ex * si, p.z);
}
vec3 rotZ(vec3 v, float th){ float c = cos(th), s = sin(th); return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z); }
`;

// ---------------------------------------------------------------------------- JS mirror
export function waveY(p) {
  const t = B.uWaveT.value; if (t < 0) return 0;
  const d = Math.abs(p.x - B.uWaveX.value) + 0.35 * Math.abs(p.z), k = d - t * 38;
  const sm = Math.min(1, Math.max(0, d / 6)); const s6 = sm * sm * (3 - 2 * sm);
  return B.uWaveA.value * Math.exp(-k * k / 18) * Math.exp(-t * 0.9) * s6;
}
// returns { p: world position, th: rotation about +z }
export function bendP(p, out = new THREE.Vector3()) {
  const K = B.uBendK.value, X0 = B.uBendX0.value, y = p.y + waveY(p);
  const s = p.x - X0;
  if (s <= 0 || Math.abs(K) < 1e-5) { out.set(p.x, y, p.z); return { p: out, th: 0 }; }
  const sm = B.uBendMax.value / Math.abs(K), sa = Math.min(s, sm), ex = s - sa, th = K * sa, c = Math.cos(th), si = Math.sin(th);
  out.set(X0 + si / K - y * si + ex * c, (1 - c) / K + y * c + ex * si, p.z);
  return { p: out, th };
}
const _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1);
// rigid frame for an object authored at flat position `p` with flat orientation `q`: world matrix = T(bend(p)) · Rz(th) · R(q)
export function bendFrame(p, q = new THREE.Quaternion()) {
  const { p: wp, th } = bendP(p, new THREE.Vector3());
  const wq = _q.setFromAxisAngle(_z, th).clone().multiply(q);
  return { pos: wp, quat: wq, th };
}
// world ↔ flat for a rigid object: M_flat (object authored in flat space) and M_world → toFlat = M_flat · M_world⁻¹
export function toFlatMatrix(Mflat, Mworld, out = new THREE.Matrix4()) { return out.copy(Mflat).multiply(Mworld.clone().invert()); }
