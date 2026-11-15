// What the camera sees of a point: a film report judges a fault only where the audience can see it (Hot Money ep01
// SH245: a hand 40 cm off its target behind the counter failed the shot, and nobody could see it).
//   'in'        inside the frame, and a ray from the lens to it meets nothing opaque first
//   'occluded'  inside the frame, behind an opaque mesh (the set, another body, a prop someone else holds)
//   'off'       outside the frame, or behind the lens
// The ray tests the meshes the render draws, not the set's collision boxes: a box is not what the viewer sees, and the
// counter's glass is a collision box the viewer sees through. Glass and other see-through materials never hide a point.
import * as THREE from 'three';

export const VIS_MARGIN = 0.02;    // NDC: a point just past the frame edge still shows (the limb has thickness)
export const VIS_EPS = 0.05;       // m: a surface this close in front of the point is the point's own skin, not a cover

const ray = new THREE.Raycaster(), ndc = new THREE.Vector3(), eye = new THREE.Vector3(), dir = new THREE.Vector3();

const view = new THREE.Vector3();
// a mesh the render draws at the hit: in front of the near plane is clipped away (a camera 12 cm from a sign sees past it)
const drawn = (hit, camera) => -view.copy(hit.point).applyMatrix4(camera.matrixWorldInverse).z >= camera.near;
const opaque = hit => {
  const o = hit.object;
  if (!o.isMesh || o.isSprite) return false;
  for (let q = o; q; q = q.parent) if (!q.visible) return false;
  const m = Array.isArray(o.material) ? o.material[hit.face?.materialIndex ?? 0] : o.material;
  return !!m && m.visible !== false && m.colorWrite !== false && !m.transparent && (m.opacity ?? 1) >= 0.99 && m.blending !== THREE.AdditiveBlending;
};

// p: THREE.Vector3 in three's world; own(object) is true for the meshes of the body the point belongs to (its limbs and
// the props it holds), which never hide its own fault
export function pointVis(camera, scene, p, own = () => false) {
  ndc.copy(p).project(camera);
  if (!(ndc.z > -1 && ndc.z < 1) || Math.abs(ndc.x) > 1 + VIS_MARGIN || Math.abs(ndc.y) > 1 + VIS_MARGIN) return 'off';
  camera.getWorldPosition(eye); dir.subVectors(p, eye); const d = dir.length(); if (d < 1e-6) return 'in';
  ray.set(eye, dir.divideScalar(d)); ray.near = 0; ray.far = Math.max(0, d - VIS_EPS);
  for (const h of ray.intersectObject(scene, true)) if (drawn(h, camera) && opaque(h) && !own(h.object)) return 'occluded';
  return 'in';
}

// one fault's state from its sample points: seen if any point is seen, hidden if any is in the frame, else off
export const foldVis = states => (states.includes('in') ? 'in' : states.includes('occluded') ? 'occluded' : 'off');
