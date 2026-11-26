// How deep a rigid hair goes into the body it sits on, headless, through the real rig (the way wardrobe-measure.mjs measures
// cloth): a clip played on a figure in the coral sweater wearing one toon hair, and on every frame the hair's drawn surface (its
// fill mesh, every vertex outside the head) against the body as drawn: the torso shell (closed: a point is in it when a ray from it
// crosses the shell an odd number of times) and the limb lines at their drawn radius (a sleeve's where it has one), from where they
// leave the torso (wardrobe-measure.mjs's rings: an arm from its 4th, a leg from its 2nd) to the wrist (a hand on the hair is contact). Used by stick-hair-body.test.mjs and by any sweep of it.
import * as THREE from 'three';
import { play, line, LIMB_R } from './wardrobe-measure.mjs';

const { toonHair, scalpField } = await import('../../styles/stick-man/kit/cast/hair.js');
const { W_M, HEAD_H } = await import('../../styles/stick-man/engine/cast.js');

// the clips a long hair meets the body in: the head turned, looked up, back and down, nodded and shaken, the body bent to the floor,
// sat down and seated, running, turning on the spot
export const CLIPS = ['Adult_Idle_LookAround_Loop', 'Gest_LookUp_Once', 'Adult_Gest_LookBack_Once', 'Adult_Gest_NodYes_Once', 'Adult_Gest_ShakeNo_Once',
  'Adult_Act_PickUp_Once', 'Adult_Trans_SitDown_Once', 'Adult_Idle_Sit_Loop', 'Adult_Move_Run_Fwd_Loop', 'Adult_Move_TurnLeft_Once'];
// NEAR_W: a scalp point this close (W, along the ray from the head's centre: oblique at the nape, where the six styles of #212 stand
// up to 0.09 W off) to the head under it lies on the head. Where the clip itself puts the head in the body
// (Gest_LookUp_Once: the bare back of the head 61 mm into the upper back; Adult_Act_PickUp_Once: the chin 27 mm into the chest,
// measured 26/11), such a point is left out: no hair can be cut shorter than the head. Locks, tails, buns and thick masses always count
export const NEAR_W = 0.10;
const G = 0.02, NEAR_M = 0.06, HA = 0.5 * W_M, HB = 0.5 * HEAD_H * W_M, CELL = 0.04, v = new THREE.Vector3(), _t = new THREE.Triangle(), _q = new THREE.Vector3();

// the hair's fill vertices that stand out of the head, in the hair group's frame (the head-centre frame), and the lowest of them (W
// below the head's centre): every mesh of the style but the ink hulls, and of the scalp only where hair grows (not its hairline wall)
export function hairPoints(style, patch) {
  const g = (typeof style === 'function' ? style : toonHair(style, null, patch))(), pts = [], seen = new Set(); let low = 0; g.updateMatrixWorld(true);
  const f = typeof style === 'string' ? scalpField(style, patch) : null, dir = new THREE.Vector3(); let first = true;
  g.traverse(o => { if (!o.isMesh || !o.parent?.isGroup && o.parent !== g) return; const bound = o.parent?.userData.neckBound; const A = o.geometry.attributes.position, sc = first && f; first = false;
    for (let i = 0; i < A.count; i++) { v.fromBufferAttribute(A, i).applyMatrix4(o.matrixWorld); v.y -= g.position.y;   // (the group's own lift undone: the head's centre)
      if (Math.hypot(v.x / HA, v.y / HB, v.z / HA) < 1.0) continue;
      if (sc && f(dir.fromBufferAttribute(A, i).normalize()).k < 0.98) continue;   // the scalp's hairline wall: it goes under the skin by design (at the nape, the neck's)
      const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`; if (seen.has(key)) continue; seen.add(key);   // (a seam's twin)
      const q = v.clone(), e = Math.hypot(q.x / HA, q.y / HB, q.z / HA); if (sc && q.length() * (1 - 1 / e) < NEAR_W * W_M) q.base = q.clone().divideScalar(e);   // a thin scalp point: the head under it
      if (bound) { const U = o.parent.userData; let t = Math.max(0, Math.min(1, (U.neckTop - q.y) / U.neckRamp)); q.bound = t * t * (3 - 2 * t); } pts.push(q); low = Math.min(low, v.y / W_M); } });
  return { pts, low };
}

// the torso's triangles in world space (closed but for 8 edges at the neck, inside the head), bucketed by their (y, z) cells for a ray along +x, and by 3D cell for the nearest point
export function torsoIndex(S) {
  const T = S.parts.torso, A = T.geometry.attributes.position, I = T.geometry.index.array, M = T.matrixWorld, cols = new Map(), tris = [];
  for (let t = 0; t < I.length; t += 3) { const a = new THREE.Vector3().fromBufferAttribute(A, I[t]).applyMatrix4(M), b = new THREE.Vector3().fromBufferAttribute(A, I[t + 1]).applyMatrix4(M), c = new THREE.Vector3().fromBufferAttribute(A, I[t + 2]).applyMatrix4(M);
    const k = tris.push([a, b, c]) - 1, y0 = Math.floor(Math.min(a.y, b.y, c.y) / CELL), y1 = Math.floor(Math.max(a.y, b.y, c.y) / CELL), z0 = Math.floor(Math.min(a.z, b.z, c.z) / CELL), z1 = Math.floor(Math.max(a.z, b.z, c.z) / CELL);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const key = y * 4096 + z; (cols.get(key) || cols.set(key, []).get(key)).push(k); } }
  const box = new THREE.Box3(); for (const t of tris) for (const p of t) box.expandByPoint(p);
  // and by 3D cell (G m), for the nearest triangle to a point inside: only cells within NEAR_M of it (a point deeper than that is
  // reported at NEAR_M, far past HAIR_IN_MM: the verdict is the same, the search a few hundred triangles instead of all of them)
  const grid = new Map(), g = v => Math.floor(v / G);
  tris.forEach(([a, b, c], k) => { for (let x = g(Math.min(a.x, b.x, c.x)); x <= g(Math.max(a.x, b.x, c.x)); x++) for (let y = g(Math.min(a.y, b.y, c.y)); y <= g(Math.max(a.y, b.y, c.y)); y++) for (let z = g(Math.min(a.z, b.z, c.z)); z <= g(Math.max(a.z, b.z, c.z)); z++) { const key = (x * 1024 + y) * 1024 + z; (grid.get(key) || grid.set(key, []).get(key)).push(k); } });
  return { tris, cols, box, grid };
}
const ray = new THREE.Ray(), X = new THREE.Vector3(1, 0, 0), NX = new THREE.Vector3(-1, 0, 0), hit = new THREE.Vector3();
export function inTorso(p, ix) {
  if (!ix.box.containsPoint(p)) return 0;
  // in only when the rays both ways along x agree (the shell is open at the neck, inside the head: one ray through that rim miscounts)
  const list = ix.cols.get(Math.floor(p.y / CELL) * 4096 + Math.floor(p.z / CELL)) || [];
  for (const dir of [X, NX]) { let n = 0; ray.set(p, dir); for (const k of list) { const [a, b, c] = ix.tris[k]; if (ray.intersectTriangle(a, b, c, false, hit)) n++; } if (!(n & 1)) return 0; }
  let m = NEAR_M; const R = Math.ceil(NEAR_M / G), cx = Math.floor(p.x / G), cy = Math.floor(p.y / G), cz = Math.floor(p.z / G), seen = new Set();
  for (let x = cx - R; x <= cx + R; x++) for (let y = cy - R; y <= cy + R; y++) for (let z = cz - R; z <= cz + R; z++) for (const k of ix.grid.get((x * 1024 + y) * 1024 + z) || []) {
    if (seen.has(k)) continue; seen.add(k); const [a, b, c] = ix.tris[k]; _t.set(a, b, c).closestPointToPoint(p, _q); const e = _q.distanceTo(p); if (e < m) m = e; }   // (a degenerate triangle gives NaN: never the nearest)
  return m;
}
// limb segments in world space with their drawn radius: the line's rings, a sleeve's radius where it has one, the hand's ring left out
function limbSegs(S) {
  const out = [];
  for (const k of ['armL', 'armR', 'legL', 'legR']) { const L = line(S, k).map(p => p.applyMatrix4(S.parts.limbs[k].matrixWorld)), sl = S.wardrobe.sleeves.filter(s => s.arm === k);
    for (let i = k.startsWith('arm') ? 4 : 2; i + 2 < L.length; i++) out.push({ k, i, n: L.length, a: L[i], b: L[i + 1], r: Math.max(LIMB_R, ...sl.filter(s => i >= s.rings[0] && i < s.rings[1]).map(s => s.r)) }); }
  return out;
}

// every style through every clip, each clip played once: the rig does not move with the hair it wears and every toon style sits at
// the same lift on the head, so one run of the clip measures them all, frame by frame (CI's 10-minute checks budget).
// { style: { clip: { mm, what, f } } }
export async function sweepAll(styles, clips = CLIPS) {
  const P = Object.fromEntries(styles.map(s => [s, hairPoints(s).pts])), out = Object.fromEntries(styles.map(s => [s, {}]));
  for (const clip of clips) { for (const s of styles) out[s][clip] = { mm: -1e9, what: '', f: -1 };
    await play(['sweater:coral'], 'adult', { clip, whole: true }, { spec: { hair: [toonHair(styles[0])] }, each: (f, S) => { S.root.updateMatrixWorld(true); const ix = torsoIndex(S), segs = limbSegs(S);
      for (const s of styles) { const r = hairInBody(S, P[s], ix, segs); if (r.mm > out[s][clip].mm) out[s][clip] = { ...r, f }; } } }); }
  return out;
}
const segD = (p, a, b) => { const ab = _q.subVectors(b, a), t = Math.max(0, Math.min(1, v.subVectors(p, a).dot(ab) / ab.lengthSq())); return p.distanceTo(v.copy(a).addScaledVector(ab, t)); };

// the deepest the hair goes into the body on this frame (mm; <= 0 nowhere in it) and where
export function hairInBody(S, P, ix = torsoIndex(S), segs = limbSegs(S)) {
  const H = S.parts.hair, M = H.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(0, toonHairLift(H), 0));
  let worst = { mm: -1e9, what: '' }, headIn = 0; const w = new THREE.Vector3(), b0 = new THREE.Vector3(), box = ix.box.clone(); for (const s of segs) box.expandByPoint(s.a).expandByPoint(s.b); box.expandByScalar(0.05);
  const LN = S.neckLm, wb = new THREE.Vector3();
  for (const p of P) { if (p.bound && LN) w.copy(p).lerp(wb.copy(p).applyMatrix4(LN), p.bound).applyMatrix4(M); else w.copy(p).applyMatrix4(M); if (!box.containsPoint(w)) continue;
    if (p.base && inTorso(b0.copy(p.base).applyMatrix4(M), ix)) { headIn++; continue; }   // the clip puts the head itself in the body here
    const d = inTorso(w, ix); if (d && 1000 * d > worst.mm) worst = { mm: 1000 * d, what: 'torso', at: p };
    for (const s of segs) { if (Math.abs(w.y - 0.5 * (s.a.y + s.b.y)) > 0.12) continue; const e = s.r - segD(w, s.a, s.b); if (1000 * e > worst.mm) worst = { mm: 1000 * e, what: s.k, ring: `${s.i}/${s.n}`, at: p }; } }
  worst.headIn = headIn; return worst;
}
// the toon hair group's offset under the head's hair group (toonHair builds on the head's own centre)
// (only the style's own group, a child of the hair group: a neck-bound 'toonHair:lengths' group inside it sits at 0 and, read last,
// put every point HAT_LIFT too low: 9 mm into the collar for the side part with an empty lengths group, 28/11)
export const toonHairLift = H => { let y = 0; for (const o of H.children) if (o.name?.startsWith('toonHair:') || o.userData.hairControl) y = o.position.y; return y; };

// one style through every clip of CLIPS: the worst frame of each, { clip: { mm, what, f } }
export async function sweep(style, clips = CLIPS, patch) {
  const { pts } = hairPoints(style, patch), out = {}, make = typeof style === 'function' ? style : toonHair(style, null, patch);
  for (const clip of clips) { let worst = { mm: -1e9, what: '', f: -1 }, headIn = 0;
    await play(['sweater:coral'], 'adult', { clip, whole: true }, { spec: { hair: [make] }, each: (f, S) => { S.root.updateMatrixWorld(true); const r = hairInBody(S, pts); if (r.mm > worst.mm) worst = { ...r, f }; headIn += r.headIn; } });
    worst.headIn = headIn;
    out[clip] = worst; }
  return out;
}
