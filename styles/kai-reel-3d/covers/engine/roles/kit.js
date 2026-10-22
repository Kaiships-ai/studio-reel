// roles/kit.js: the shared wardrobe kit. Parts attach to clawd.parts.torso / clawd.parts.arms (arm groups, userData.sx = ±1); the base is never edited.
// Torso units: body box BW×BH×D = 12×8×9, y=0 at the body bottom, +z = front. Eyes sit at x=±3.5, y 3.75..6.3 (EYE_Y0..EYE_Y1): never cover them,
// and never put a dark shape right under them (it reads as a mouth; Clawd has no mouth). Arms pivot at x=±5.75, y=3.
import * as THREE from 'three';
export { THREE };
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export const BW = 12, BH = 8, D = 9, EYE_Y0 = 3.75, EYE_Y1 = 6.3;   // body box (torso units) and the eye band no role may cover
export const mat = (c, r = 0.85, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...(e ? { emissive: new THREE.Color(e), emissiveIntensity: 1.6 } : {}) });
export const rb = (w, h, d, r, m) => { const x = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), m); x.castShadow = true; return x; };
export const at = (o, x, y, z) => (o.position.set(x, y, z), o);

export function shell(T, m, y0 = -0.25, y1 = EYE_Y0 - 0.05, t = 0.38) {   // a closed garment around the lower body
  const h = y1 - y0, cy = (y0 + y1) / 2;
  T.add(at(rb(BW + 2 * t, h, t, 0.3, m), 0, cy, D / 2 + t / 2), at(rb(BW + 2 * t, h, t, 0.3, m), 0, cy, -D / 2 - t / 2));
  for (const sx of [-1, 1]) T.add(at(rb(t, h, D + 2 * t, 0.3, m), sx * (BW / 2 + t / 2), cy, 0));
}
export function sleeves(arms, m, cuff) {
  for (const a of arms) { const sx = a.userData.sx; a.add(at(rb(2.1, 2.3, 2.6, 0.5, m), sx * 1.0, 0, 0)); if (cuff) a.add(at(rb(0.45, 2.45, 2.75, 0.2, cuff), sx * 2.0, 0, 0)); }
}
export function flameShape(s = 1) {
  const sh = new THREE.Shape(); sh.moveTo(0, -1 * s); sh.bezierCurveTo(0.9 * s, -0.9 * s, 0.9 * s, 0.1 * s, 0.25 * s, 1.1 * s);
  sh.bezierCurveTo(0.3 * s, 0.4 * s, 0, 0.3 * s, -0.15 * s, 0.6 * s); sh.bezierCurveTo(-0.5 * s, 0.1 * s, -0.9 * s, -0.6 * s, 0, -1 * s); return sh;
}

