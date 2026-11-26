// The seam of a neck-bound long style (kit/cast/hair.js st.neck): how far the lengths' tops open away from the crown's mass
// as the head moves on the neck. Every vertex of a bound lock the crown covers at rest (inside the scalp's mass or within 2 mm of it, above the bell's hem at -0.45 W: below it the field runs off along the fall), carried by the neck each frame and read in the
// head's frame, against the crown's drawn surface (its fill vertices where hair grows): how much further from it than at rest, mm (0 = the lengths
// sit on the crown as built; capped at 50 mm), and how far they slide along it (mm, the top's travel in the head's frame).
//   node test/unit/hair-seam.mjs [style ...]     (prints the worst frame per style and clip)
import * as THREE from 'three';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
await rigStick();
const { toonHair, scalpField } = await import('../../styles/stick-man/kit/cast/hair.js');
const { W_M } = await import('../../styles/stick-man/engine/cast.js');
const { play } = await import('./wardrobe-measure.mjs');
const { CLIPS } = await import('./hair-measure.mjs');

// measured on the designed lengths bound to the neck (patch { neck: true, cut: null }) until Studio settles the seam
export async function seam(style, clips = CLIPS, patch = { neck: true, cut: null }) {
  const g = toonHair(style, null, patch)(), f = scalpField(style, patch), tops = [], d = new THREE.Vector3(), v = new THREE.Vector3(); g.updateMatrixWorld(true);
  const idx = [];   // [lock index in the group, vertex index, rest point]
  g.traverse(o => { if (!o.isMesh || !o.parent?.userData.neckBound) return; const k = o.parent.children.indexOf(o), A = o.geometry.attributes.position, ys = []; for (let i = 0; i < A.count; i++) ys.push(A.getY(i));
    for (let i = 0; i < A.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(A, i); p.out0 = Math.max(0, p.length() - f(d.copy(p).normalize()).r); if (p.out0 < 0.002 && p.y > -0.45 * W_M) { tops.push(p); idx.push([k, i]); } } });
  // the crown as drawn (its fill mesh where hair grows), on a 1 cm grid: a lock point's distance to it, rest vs drawn
  const crown = new Map(), C = 0.01, key = (x, y, z) => `${x},${y},${z}`; const SA = g.children[0].geometry.attributes.position;
  for (let i = 0; i < SA.count; i++) { const q = new THREE.Vector3().fromBufferAttribute(SA, i); if (f(d.copy(q).normalize()).k < 0.98) continue; const k = key(...q.toArray().map(x => Math.floor(x / C))); (crown.get(k) || crown.set(k, []).get(k)).push(q); }
  const near = p => { let m = 9; const c = p.toArray().map(x => Math.floor(x / C)); for (let r = 0; r <= 4 && m > r * C; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let e = -r; e <= r; e++) { if (Math.max(Math.abs(a), Math.abs(b), Math.abs(e)) !== r) continue; for (const q of crown.get(key(c[0] + a, c[1] + b, c[2] + e)) || []) m = Math.min(m, q.distanceTo(p)); } return Math.min(m, 0.05); };
  tops.forEach(p => { p.near0 = near(p); });
  const out = {};
  for (const clip of clips) { let w = { mm: 0, f: -1, slide: 0 };
    await play(['sweater:coral'], 'adult', { clip, whole: true }, { spec: { hair: [toonHair(style, null, patch)] }, each: (fr, S) => { if (!S.neckLm) return; let lg = null; S.parts.hair.traverse(o => { if (o.userData.neckBound) lg = o; });
      for (let n = 0; n < tops.length; n++) { const p = tops[n], [k, i] = idx[n]; v.fromBufferAttribute(lg.children[k].geometry.attributes.position, i);   /* as drawn (blended) */ const mm = 1000 * (near(v) - p.near0); if (mm > w.mm) w = { ...w, mm, f: fr }; w.slide = Math.max(w.slide, 1000 * v.distanceTo(p)); } } });
    out[clip] = w; }
  return out;
}
if (process.argv[1]?.endsWith('hair-seam.mjs')) for (const s of process.argv.slice(2)) { const r = await seam(s), worst = Object.entries(r).sort((a, b) => b[1].mm - a[1].mm)[0];
  console.log('SEAM', s, 'max', worst[1].mm.toFixed(1), 'mm', worst[0], 'f' + worst[1].f, JSON.stringify(Object.fromEntries(Object.entries(r).map(([c, x]) => [c, [+x.mm.toFixed(1), +x.slide.toFixed(0)]])))); }
