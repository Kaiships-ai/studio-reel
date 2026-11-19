// The set's solid pieces, read from what the set built instead of from a hand list: every box mesh of the act (the
// allout/kit.js and setKit K.box walls, furniture, floors, jambs) plus the set's COLLIDE. A hand list misses what nobody wrote into it
// (Hot Money ep01 r5: room 2's bed and nightstand were in COLLIDE_ROOM2, the engine read COLLIDE, and a hot dog let go
// over the bed fell through it to the floor; the walls and the door jamb a bag swung through were in no list at all).
//   solidBoxes(root, skip)   [{ name, mesh, box (its geometry's box) }]: the box meshes under root, outside skip (a set prop, an actor)
//   restBoxes(boxes, COLLIDE) [{ name, lo, hi }] Blender metres: what a prop lands on and is stopped by (propobj.js),
//                            overhead boxes (bottom above OVERHEAD) left out
//   inBoxes(pts, boxes)      the deepest box each point set is in, by the box's own (turned) axes (a COLLIDE { lo, hi } too)
// A mesh with userData.hollow (a crate's open inside, a counter's knee space) is left out; so is an ink hull (BackSide)
// and anything hidden.
import * as THREE from 'three';

const toB = v => [v.x, -v.z, v.y];
const under = (o, set) => { for (let q = o; q; q = q.parent) if (set.has(q)) return true; return false; };
const shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };

export function solidBoxes(root, skip = new Set()) {
  const out = [];
  root.traverse(m => {
    if (!m.isMesh || !(m.geometry instanceof THREE.BoxGeometry) || m.userData.hollow || under(m, skip)) return;   // RoundedBoxGeometry too (allout/kit.js K.box)
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    // drawn opaque (as engine/visible.js opaque, less the visibility: an act's group is hidden while it is built)
    if (mats.every(x => !x || x.side === THREE.BackSide || x.visible === false || x.colorWrite === false || x.transparent || (x.opacity ?? 1) < 0.99 || x.blending === THREE.AdditiveBlending)) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const box = m.geometry.boundingBox.clone(); m.updateWorldMatrix(true, false);   // the geometry's own box: a set may translate it
    const c = toB(box.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld)).map(x => x.toFixed(2)).join(', ');
    out.push({ name: `${m.name || m.parent?.name || 'box'} at (${c})`, mesh: m, box });
  });
  return out;
}

// a box whose bottom is this high (Blender metres) is overhead (a ceiling, a lintel, a beam), never what a prop falls on
// or into: propobj.js blocks a prop up to 0.5 m under a box, so a room-wide ceiling would shove a prop let go at 2 m
// out of the room
export const OVERHEAD = 1.8;

// world corners of a box mesh as an axis-aligned box (Blender metres); a box turned off the axes is boxed loosely, so a
// piece turned more than 5 deg about anything but the vertical is not a rest surface; an overhead box is left out
export function restBoxes(boxes, collide = []) {
  const out = [...collide], c = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
  for (const b of boxes) {
    if (!b.mesh.visible) continue;                                     // its own flag: the act's group is hidden while built
    b.mesh.updateWorldMatrix(true, false); b.mesh.matrixWorld.decompose(c, q, s); e.setFromQuaternion(q, 'YXZ');
    if (Math.abs(e.x) > 0.09 || Math.abs(e.z) > 0.09) continue;
    const bb = b.box.clone().applyMatrix4(b.mesh.matrixWorld);
    const lo = toB(bb.min), hi = toB(bb.max);
    if (lo[2] > OVERHEAD) continue;
    out.push({ name: b.name, lo: [lo[0], hi[1], lo[2]], hi: [hi[0], lo[1], hi[2]] });
  }
  return out;
}

// points (three.js world) against boxes: [{ name, depth (m), at (three world point) }] for each box a point is more than
// `grace` inside, the deepest point per box
export function inBoxes(pts, boxes, grace = 0.01) {
  const out = [], inv = new THREE.Matrix4(), l = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Quaternion(), k = new THREE.Vector3();
  for (const b of boxes) {
    if (!b.mesh) {                                                     // a COLLIDE entry: { name, lo, hi } Blender metres
      let best = null;
      for (const p of pts) { const v = toB(p), d = Math.min(...[0, 1, 2].flatMap(i => [v[i] - b.lo[i], b.hi[i] - v[i]]));
        if (d > grace && (!best || d > best.depth)) best = { name: b.name, depth: d, at: p }; }
      if (best) out.push(best); continue;
    }
    if (!shown(b.mesh)) continue;
    b.mesh.updateWorldMatrix(true, false); inv.copy(b.mesh.matrixWorld).invert(); b.mesh.matrixWorld.decompose(c, q, k);
    let best = null;
    for (const p of pts) {
      l.copy(p).applyMatrix4(inv);
      const { min, max } = b.box, d = Math.min(Math.min(l.x - min.x, max.x - l.x) * k.x, Math.min(l.y - min.y, max.y - l.y) * k.y, Math.min(l.z - min.z, max.z - l.z) * k.z);
      if (d > grace && (!best || d > best.depth)) best = { name: b.name, depth: d, at: p };
    }
    if (best) out.push(best);
  }
  return out;
}

// a prop's drawn box in its own frame (lights, glows, see-through cones and ink hulls left out: a torch's beam is not the
// torch), each mesh's geometry box taken through the mesh-to-object matrix once, so a turned prop is not boxed twice
export function drawnBox(o) {
  const loc = new THREE.Box3(), bb = new THREE.Box3(), inv = new THREE.Matrix4().copy(o.matrixWorld).invert(), rel = new THREE.Matrix4();
  o.traverseVisible(m => {
    if (!m.isMesh || !m.geometry || m.material?.transparent || m.material?.blending === THREE.AdditiveBlending || m.material?.side === THREE.BackSide) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    loc.union(bb.copy(m.geometry.boundingBox).applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld)));
  });
  return loc;
}

// sample points in a prop's drawn box (its local box `loc`, the object's matrixWorld): a 4 x 4 x 4 grid inset 15 % from
// each face, so a round prop (a duffel, a bun) is judged by its body, not by the empty corners of its box
export const INSET = 0.15;
export function boxPoints(loc, matrixWorld, n = 4) {
  const P = [], v = new THREE.Vector3();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    const u = [i, j, k].map(x => INSET + (1 - 2 * INSET) * x / (n - 1));
    v.set(loc.min.x + (loc.max.x - loc.min.x) * u[0], loc.min.y + (loc.max.y - loc.min.y) * u[1], loc.min.z + (loc.max.z - loc.min.z) * u[2]);
    P.push(v.clone().applyMatrix4(matrixWorld));
  }
  return P;
}
export { toB };
