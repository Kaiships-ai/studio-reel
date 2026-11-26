// The air between a hand and the prop it holds (tools/gates/handgrip.mjs reads it from the rows as held[].gapCm): from
// the hand's drawn edge (its world radius over the hand and its ink hull: the figure's scale and gloves included) to the
// nearest point of the prop's meshes, ink hulls included, each measured in its own frame (a tilted prop is its mesh,
// not its world box). The grip socket is never
// the anchor: the engine snaps it onto the hand, so it always read 0 (a tin or a bundle off the hand passed).
import * as THREE from 'three';

const _c = new THREE.Vector3(), _l = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();

// the hand's drawn world radius from its centre, m: the dot and every mesh under it (a glove's ink hull)
export function handRadius(hand) {
  hand.updateWorldMatrix(true, true);
  const c = hand.getWorldPosition(new THREE.Vector3()); let r = 0;
  hand.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    o.getWorldScale(_s);
    r = Math.max(r, g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld).distanceTo(c) + g.boundingSphere.radius * Math.max(_s.x, _s.y, _s.z));
  });
  return r;
}

// hand: the hand Mesh; prop: Object3D -> { cm, anchor: 'edge' }, or { cm: null, anchor: 'empty' } for a prop with
// nothing drawn to measure to (a fault, never read as rows made before the gate)
export function gripGap(hand, prop) {
  const c = hand.getWorldPosition(_c), r = handRadius(hand);
  prop.updateWorldMatrix(true, true);
  let best = Infinity;
  prop.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); if (g.boundingBox.isEmpty()) return;
    _l.copy(c).applyMatrix4(_m.copy(o.matrixWorld).invert());
    const p = g.boundingBox.clampPoint(_l, new THREE.Vector3()).applyMatrix4(o.matrixWorld);
    best = Math.min(best, p.distanceTo(c));
  });
  if (best === Infinity) return { cm: null, anchor: 'empty' };
  return { cm: +(Math.max(0, best - r) * 100).toFixed(2), anchor: 'edge' };
}
