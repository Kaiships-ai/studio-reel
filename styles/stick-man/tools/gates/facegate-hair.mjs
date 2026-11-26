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
export const FACE_VIEWS = { front: VIEWS.front, q34: VIEWS.q34, low: VIEWS.low };
// the face as drawn: cast.js turns it 80 % as far as the skull (faceTurn), so its middle sits 0.2 x the lens's yaw toward the lens,
// and -0.40 sin(el) HEAD_H (up for a low lens) (cast.js slide); the zone follows it
const TURN = 0.8;
const inFace = (HP, o, [yaw, el]) => { const x = HP[3 * o] / W_M, y = HP[3 * o + 1] / W_M, z = HP[3 * o + 2] / W_M, lon = Math.atan2(x, z) * 180 / Math.PI - (1 - TURN) * yaw, dy = -0.40 * Math.sin(el * Math.PI / 180) * HEAD_H;   // a low lens lifts the face (faces.js dyp = -512 sl[1]; seen in docs/hair-sheet/facezone-low.png)
  return z > 0 && Math.abs(lon) <= FACE.lon && y - dy >= FACE.lo && y - dy <= FACE.hi; };

// { view: share } for a hair group maker (() => THREE.Group) or a style name with its patch
export function faceShare(style, patch) {
  const make = typeof style === 'function' ? style : toonHair(style, null, patch), tris = hairTris(make()), out = {};
  for (const [k, v] of Object.entries(FACE_VIEWS)) {
    const bald = renderView([], HEAD, [], v), hair = renderView(tris, HEAD, [], v); let n = 0, seen = 0;
    for (let o = 0; o < bald.L.length; o++) { if (!bald.L[o] || !inFace(bald.HP, o, v)) continue; n++; if (hair.L[o] === 1 || hair.L[o] === 2) seen++; }
    out[k] = seen / n; }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), neck = a.includes('--neck'), json = a.includes('--json'), styles = a.filter(x => !x.startsWith('--')); let bad = 0; const all = {};
  for (const s of styles.length ? styles : HAIR_STYLES) { const r = faceShare(s, neck ? { neck: true, cut: null } : undefined), ok = Object.values(r).every(x => x >= FACE_MIN); bad += !ok; all[s] = r; if (json) continue;
    console.log(s.padEnd(10), Object.entries(r).map(([k, x]) => `${k} ${(100 * x).toFixed(1)}%`).join('  '), ok ? 'PASS' : 'FAIL'); }
  if (json) console.log(JSON.stringify(all));
  process.exit(bad ? 1 : 0);
}
