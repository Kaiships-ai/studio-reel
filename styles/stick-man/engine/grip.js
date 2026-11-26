// The air between a hand and the prop it holds (tools/gates/handgrip.mjs reads it from the rows as held[].gapCm): from
// the hand's drawn edge (its world radius over the hand and its ink hull: the figure's scale and gloves included) to the
// nearest point on the prop's visible drawn triangles, ink hulls included (a round can or a balloon is its surface,
// never its box; hidden meshes are left out). The grip socket is never
// the anchor: the engine snaps it onto the hand, so it always read 0 (a tin or a bundle off the hand passed).
import * as THREE from 'three';

const _c = new THREE.Vector3(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _bb = new THREE.Box3(), _t = new THREE.Triangle();

// the hand's drawn world radius from its centre, m: the dot and every mesh under it (a glove's ink hull)
export function handRadius(hand) {
  hand.updateWorldMatrix(true, true);
  const c = hand.getWorldPosition(new THREE.Vector3()); let r = 0;
  hand.traverseVisible(o => {
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
  const c = hand.getWorldPosition(_c).clone(), r = handRadius(hand);
  prop.updateWorldMatrix(true, true);
  let best = Infinity;
  prop.traverseVisible(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); if (g.boundingBox.isEmpty()) return;
    // the world box is a lower bound: a mesh whose box is farther than the best so far cannot be nearer
    if (_bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld).distanceToPoint(c) >= best) return;
    const P = g.attributes.position, I = g.index, n = I ? I.count : P.count, M = o.matrixWorld;
    const v = k => (I ? I.getX(k) : k);
    for (let k = 0; k + 2 < n; k += 3) {
      _t.a.fromBufferAttribute(P, v(k)).applyMatrix4(M); _t.b.fromBufferAttribute(P, v(k + 1)).applyMatrix4(M); _t.c.fromBufferAttribute(P, v(k + 2)).applyMatrix4(M);
      const dd = _t.closestPointToPoint(c, _p).distanceTo(c); if (dd < best) best = dd;
    }
  });
  if (best === Infinity) return { cm: null, anchor: 'empty' };
  return { cm: +(Math.max(0, best - r) * 100).toFixed(2), anchor: 'edge' };
}
