#!/usr/bin/env node
// Face-visibility gate for toon hair (Studio 27/11: the long styles curtained the face, a narrow slot between two walls of hair).
// The head and the style, rendered headless the way scalpgate.mjs renders them, from the sheet's front, 3/4 and low front views;
// the face is the head's front where the face is drawn (FACE below, the head's centre frame, W). Its share still in sight with the
// hair on, against the same view bald, must be at least FACE_MIN in every view.
//   FACE_MIN, FACE  written 27/11 before any style was measured; never loosened (a style that fails is changed, not this)
//   node styles/stick-man/tools/gates/facegate-hair.mjs [style ...] [--neck]   (--neck: the designed lengths, { neck: true, cut: null })
import { pathToFileURL } from 'node:url';
const { toonHair, HAIR_STYLES } = await import('#kit/cast/hair.js');
const { W_M, HEAD_H } = await import('#engine/cast.js');
const { hairTris, renderView, HEAD, VIEWS } = await import('./scalpgate.mjs');

export const FACE_MIN = 0.85;
// the face: within 40 deg of its middle, from the chin (-0.42 W) to the brows' top (0.30 W): both eyes, both cheeks, the mouth
export const FACE = { lon: 40, lo: -0.42, hi: 0.30 };
// q34s: the sheet's close 3/4 (hairsheet.html COLS az 38) with the face where that render drew it: 17 deg from the lens, not
// the 30 deg faceTurn 0.8 gives (measured on hair-sheet-mw.jpg 27/11, lob 3/4: the eyes 0.1 W nearer the slab), so a third value,
// the face's own turn
export const FACE_VIEWS = { front: VIEWS.front, q34: VIEWS.q34, q34s: [38, 2.3, 0.45], low: VIEWS.low };
// the face as drawn: cast.js turns it 80 % as far as the skull (faceTurn), so its middle sits 0.2 x the lens's yaw toward the lens,
// and -0.40 sin(el) HEAD_H (up for a low lens) (cast.js slide); the zone follows it
const TURN = 0.8;
// each mark as it lands on the head (faces.js LAYOUT: the eyes at the head's middle, the mouth 0.175 W below; the eyes measured
// +-0.09-0.12 W apart on the sheet's renders, so +-0.105), as an ellipse
// [cx, cy, rx, ry] (W) on the face card, a little wider than the eye and mouth drawn; each must stay FEATURE_MIN in sight
// (Studio 27/11: a slab across the far eye passed the whole-face 85 %)
export const FEATURE_MIN = 0.95;
export const FEATURES = { eyeL: [-0.105, 0, 0.055, 0.065], eyeR: [0.105, 0, 0.055, 0.065], mouth: [0, -0.175, 0.12, 0.05] };
const onCard = (HP, o, [yaw, el, turn = TURN]) => { const x = HP[3 * o] / W_M, y = HP[3 * o + 1] / W_M, z = HP[3 * o + 2] / W_M, r = Math.hypot(x, z), lon = Math.atan2(x, z) - (1 - turn) * yaw * Math.PI / 180;
  return [r * Math.sin(lon), y + 0.40 * Math.sin(el * Math.PI / 180) * HEAD_H, z]; };
const inFeature = (p, [cx, cy, rx, ry]) => p[2] > 0 && ((p[0] - cx) / rx) ** 2 + ((p[1] - cy) / ry) ** 2 <= 1;
const inFace = (HP, o, [yaw, el]) => { const x = HP[3 * o] / W_M, y = HP[3 * o + 1] / W_M, z = HP[3 * o + 2] / W_M, lon = Math.atan2(x, z) * 180 / Math.PI - (1 - TURN) * yaw, dy = -0.40 * Math.sin(el * Math.PI / 180) * HEAD_H;   // a low lens lifts the face (faces.js dyp = -512 sl[1]; seen in docs/hair-sheet/facezone-low.png)
  return z > 0 && Math.abs(lon) <= FACE.lon && y - dy >= FACE.lo && y - dy <= FACE.hi; };

// { view: share } for a hair group maker (() => THREE.Group) or a style name with its patch
export function faceShare(style, patch, feat) {
  const make = typeof style === 'function' ? style : toonHair(style, null, patch), tris = hairTris(make()), out = {};
  for (const [k, v] of Object.entries(FACE_VIEWS)) {
    const bald = renderView([], HEAD, [], v), hair = renderView(tris, HEAD, [], v); let n = 0, seen = 0; const fn = {}, fs = {};
    for (const f in FEATURES) fn[f] = fs[f] = 0;
    for (let o = 0; o < bald.L.length; o++) { if (!bald.L[o]) continue; const vis = hair.L[o] === 1 || hair.L[o] === 2, p = onCard(bald.HP, o, v);
      for (const f in FEATURES) if (inFeature(p, FEATURES[f])) { fn[f]++; fs[f] += vis; }
      if (!inFace(bald.HP, o, v)) continue; n++; if (vis) seen++; }
    out[k] = seen / n; if (feat) for (const f in FEATURES) feat[k] = { ...feat[k], [f]: fn[f] ? fs[f] / fn[f] : 1 }; }
  return out;
}
// { view: { face, eyeL, eyeR, mouth } }
export function featureShare(style, patch) { const feat = {}, face = faceShare(style, patch, feat); for (const k in face) feat[k] = { face: face[k], ...feat[k] }; return feat; }
export const passes = r => Object.values(r).every(v => v.face >= FACE_MIN && Object.keys(FEATURES).every(f => v[f] >= FEATURE_MIN));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), neck = a.includes('--neck'), json = a.includes('--json'), styles = a.filter(x => !x.startsWith('--')); let bad = 0; const all = {};
  for (const s of styles.length ? styles : HAIR_STYLES) { const r = featureShare(s, neck ? { neck: true, cut: null } : undefined), ok = passes(r); bad += !ok; all[s] = r; if (json) continue;
    console.log(s.padEnd(10), Object.entries(r).map(([k, x]) => `${k} ${Object.values(x).map(y => (100 * y).toFixed(0)).join('/')}`).join('  '), '(face/eyeL/eyeR/mouth %)', ok ? 'PASS' : 'FAIL'); }
  if (json) console.log(JSON.stringify(all));
  process.exit(bad ? 1 : 0);
}
