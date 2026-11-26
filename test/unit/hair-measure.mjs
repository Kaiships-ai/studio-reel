// How deep a rigid hair goes into the body it sits on, headless, through the real rig (the way wardrobe-measure.mjs measures
// cloth): a clip played on a figure in the coral sweater wearing one toon hair, and on every frame the hair's drawn surface (its
// fill mesh, every vertex outside the head) against the body as drawn: the torso shell (closed: a point is in it when a ray from it
// crosses the shell an odd number of times) and the limb lines at their drawn radius (a sleeve's where it has one), the hands left
// out (a hand on the hair is contact). Used by stick-hair-body.test.mjs and by any sweep of it.
import * as THREE from 'three';
import { play, line, LIMB_R } from './wardrobe-measure.mjs';

const { toonHair } = await import('../../styles/stick-man/kit/cast/hair.js');
const { W_M, HEAD_H } = await import('../../styles/stick-man/engine/cast.js');

// the clips a long hair meets the body in: the head turned, looked up, back and down, nodded and shaken, the body bent to the floor,
// sat down and seated, running, turning on the spot
export const CLIPS = ['Adult_Idle_LookAround_Loop', 'Gest_LookUp_Once', 'Adult_Gest_LookBack_Once', 'Adult_Gest_NodYes_Once', 'Adult_Gest_ShakeNo_Once',
  'Adult_Act_PickUp_Once', 'Adult_Trans_SitDown_Once', 'Adult_Idle_Sit_Loop', 'Adult_Move_Run_Fwd_Loop', 'Adult_Move_TurnLeft_Once'];
const HA = 0.5 * W_M, HB = 0.5 * HEAD_H * W_M, CELL = 0.04, v = new THREE.Vector3(), _t = new THREE.Triangle(), _q = new THREE.Vector3();

// the hair's fill vertices that stand out of the head, in the hair group's frame (the head-centre frame), and the lowest of them (W
// below the head's centre): every mesh of the style but the ink hulls
export function hairPoints(style) {
  const g = (typeof style === 'function' ? style : toonHair(style))(), pts = [], seen = new Set(); let low = 0; g.updateMatrixWorld(true);
  g.traverse(o => { if (!o.isMesh || !o.parent?.isGroup && o.parent !== g) return; const A = o.geometry.attributes.position;
    for (let i = 0; i < A.count; i++) { v.fromBufferAttribute(A, i).applyMatrix4(o.matrixWorld); v.y -= g.position.y;   // (the group's own lift undone: the head's centre)
      if (Math.hypot(v.x / HA, v.y / HB, v.z / HA) < 1.0) continue; const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`; if (seen.has(k)) continue; seen.add(k);
      pts.push(v.clone()); low = Math.min(low, v.y / W_M); } });
  return { pts, low };
}

// the torso's triangles in world space, bucketed by their (y, z) cells for a ray along +x, and by 3D cell for the nearest point
function torsoIndex(S) {
  const T = S.parts.torso, A = T.geometry.attributes.position, I = T.geometry.index.array, M = T.matrixWorld, cols = new Map(), tris = [];
  for (let t = 0; t < I.length; t += 3) { const a = new THREE.Vector3().fromBufferAttribute(A, I[t]).applyMatrix4(M), b = new THREE.Vector3().fromBufferAttribute(A, I[t + 1]).applyMatrix4(M), c = new THREE.Vector3().fromBufferAttribute(A, I[t + 2]).applyMatrix4(M);
    const k = tris.push([a, b, c]) - 1, y0 = Math.floor(Math.min(a.y, b.y, c.y) / CELL), y1 = Math.floor(Math.max(a.y, b.y, c.y) / CELL), z0 = Math.floor(Math.min(a.z, b.z, c.z) / CELL), z1 = Math.floor(Math.max(a.z, b.z, c.z) / CELL);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const key = y * 4096 + z; (cols.get(key) || cols.set(key, []).get(key)).push(k); } }
  const box = new THREE.Box3(); for (const t of tris) for (const p of t) box.expandByPoint(p);
  return { tris, cols, box };
}
const ray = new THREE.Ray(), X = new THREE.Vector3(1, 0, 0), hit = new THREE.Vector3();
function inTorso(p, ix) {
  if (!ix.box.containsPoint(p)) return 0;
  const list = ix.cols.get(Math.floor(p.y / CELL) * 4096 + Math.floor(p.z / CELL)) || []; let n = 0; ray.set(p, X);
  for (const k of list) { const [a, b, c] = ix.tris[k]; if (ray.intersectTriangle(a, b, c, false, hit)) n++; }
  if (!(n & 1)) return 0;
  let m = 1e9; for (const [a, b, c] of ix.tris) { if (Math.abs(a.y - p.y) > 0.2) continue; _t.set(a, b, c).closestPointToPoint(p, _q); m = Math.min(m, _q.distanceTo(p)); }
  return m;
}
// limb segments in world space with their drawn radius: the line's rings, a sleeve's radius where it has one, the hand's ring left out
function limbSegs(S) {
  const out = [];
  for (const k of ['armL', 'armR', 'legL', 'legR']) { const L = line(S, k).map(p => p.applyMatrix4(S.parts.limbs[k].matrixWorld)), sl = S.wardrobe.sleeves.filter(s => s.arm === k);
    for (let i = 0; i + 2 < L.length; i++) out.push({ k, a: L[i], b: L[i + 1], r: Math.max(LIMB_R, ...sl.filter(s => i >= s.rings[0] && i < s.rings[1]).map(s => s.r)) }); }
  return out;
}
const segD = (p, a, b) => { const ab = _q.subVectors(b, a), t = Math.max(0, Math.min(1, v.subVectors(p, a).dot(ab) / ab.lengthSq())); return p.distanceTo(v.copy(a).addScaledVector(ab, t)); };

// the deepest the hair goes into the body on this frame (mm; <= 0 nowhere in it) and where
export function hairInBody(S, P) {
  const H = S.parts.hair, M = H.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(0, toonHairLift(H), 0)), ix = torsoIndex(S), segs = limbSegs(S);
  let worst = { mm: -1e9, what: '' }; const w = new THREE.Vector3(), box = ix.box.clone(); for (const s of segs) box.expandByPoint(s.a).expandByPoint(s.b); box.expandByScalar(0.05);
  for (const p of P) { w.copy(p).applyMatrix4(M); if (!box.containsPoint(w)) continue;
    const d = inTorso(w, ix); if (d && 1000 * d > worst.mm) worst = { mm: 1000 * d, what: 'torso' };
    for (const s of segs) { if (Math.abs(w.y - 0.5 * (s.a.y + s.b.y)) > 0.12) continue; const e = s.r - segD(w, s.a, s.b); if (1000 * e > worst.mm) worst = { mm: 1000 * e, what: s.k }; } }
  return worst;
}
// the toon hair group's offset under the head's hair group (toonHair builds on the head's own centre)
const toonHairLift = H => { let y = 0; H.traverse(o => { if (o.name?.startsWith('toonHair:') || o.userData.hairControl) y = o.position.y; }); return y; };

// one style through every clip of CLIPS: the worst frame of each, { clip: { mm, what, f } }
export async function sweep(style, clips = CLIPS) {
  const { pts } = hairPoints(style), out = {}, make = typeof style === 'function' ? style : toonHair(style);
  for (const clip of clips) { let worst = { mm: -1e9, what: '', f: -1 };
    await play(['sweater:coral'], 'adult', { clip, whole: true }, { spec: { hair: [make] }, each: (f, S) => { S.root.updateMatrixWorld(true); const r = hairInBody(S, pts); if (r.mm > worst.mm) worst = { ...r, f }; } });
    out[clip] = worst; }
  return out;
}
