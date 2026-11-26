// The seam of a neck-bound long style (kit/cast/hair.js st.neck): how far the lengths' tops open away from the crown's mass
// as the head moves on the neck. Every vertex of a bound lock in its top 0.12 W, carried by the neck each frame and read in the
// head's frame, against the scalp field's surface along its direction: how much further outside it than at rest, mm (0 = the lengths sit on the
// crown as built), and how far they slide along it (mm, the top's travel in the head's frame).
//   node test/unit/hair-seam.mjs [style ...]     (prints the worst frame per style and clip)
import * as THREE from 'three';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';
await rigStick();
const { toonHair, scalpField, styleOf } = await import('../../styles/stick-man/kit/cast/hair.js');
const { W_M } = await import('../../styles/stick-man/engine/cast.js');
const { play } = await import('./wardrobe-measure.mjs');
const { CLIPS } = await import('./hair-measure.mjs');

// measured on the designed lengths bound to the neck (patch { neck: true, cut: null }) until Studio settles the seam
export async function seam(style, clips = CLIPS, patch = { neck: true, cut: null }) {
  const g = toonHair(style, null, patch)(), f = scalpField(style, patch), tops = [], d = new THREE.Vector3(), v = new THREE.Vector3(); g.updateMatrixWorld(true);
  g.traverse(o => { if (!o.isMesh || !o.parent?.userData.neckBound) return; const A = o.geometry.attributes.position, ys = []; for (let i = 0; i < A.count; i++) ys.push(A.getY(i));
    const top = Math.max(...ys); for (let i = 0; i < A.count; i++) if (A.getY(i) > top - 0.12 * W_M) { const p = new THREE.Vector3().fromBufferAttribute(A, i); p.out0 = p.length() - f(d.copy(p).normalize()).r; tops.push(p); } });
  const out = {};
  for (const clip of clips) { let w = { mm: 0, f: -1, slide: 0 };
    await play(['sweater:coral'], 'adult', { clip, whole: true }, { spec: { hair: [toonHair(style, null, patch)] }, each: (fr, S) => { if (!S.neckLm) return;
      for (const p of tops) { v.copy(p).applyMatrix4(S.neckLm); const r = f(d.copy(v).normalize()).r, mm = 1000 * (v.length() - r - p.out0); if (mm > w.mm) w = { ...w, mm, f: fr }; w.slide = Math.max(w.slide, 1000 * v.distanceTo(p)); } } });
    out[clip] = w; }
  return out;
}
if (process.argv[1]?.endsWith('hair-seam.mjs')) for (const s of process.argv.slice(2)) { const r = await seam(s), worst = Object.entries(r).sort((a, b) => b[1].mm - a[1].mm)[0];
  console.log('SEAM', s, 'max', worst[1].mm.toFixed(1), 'mm', worst[0], 'f' + worst[1].f, JSON.stringify(Object.fromEntries(Object.entries(r).map(([c, x]) => [c, [+x.mm.toFixed(1), +x.slide.toFixed(0)]])))); }
