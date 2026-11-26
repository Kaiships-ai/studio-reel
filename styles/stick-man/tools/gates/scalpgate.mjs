#!/usr/bin/env node
// Scalp gate: does a toon hair style cover the scalp? The head (the engine's ellipsoid) and the style as toonHair builds it
// (every fill mesh, and every ink hull drawn the way the engine draws it: its back faces only) are rendered with a depth
// buffer, headless, from six views of the head; a head pixel nothing stands in front of, on the scalp (kit/cast/scalpline.js,
// less the style's declared `bare`), is bare scalp. Used by test/unit/stick-scalp-cover.test.mjs.
//   node styles/stick-man/tools/gates/scalpgate.mjs [style ...] [--png <dir>]   (a table of bare shares; --png: one mask per view,
//   bare scalp magenta, face grey, hair brown, ink black)
import * as THREE from 'three';
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const { toonHair, HAIR_STYLES, styleOf, bareOf } = await import('../../kit/cast/hair.js');
const { W_M, HEAD_H } = await import('../../engine/cast.js');
const { inScalp } = await import('../../kit/cast/scalpline.js');

// the camera's direction from the head's centre: [yaw deg (0 = the face, + = round to the figure's left), elevation deg]
// front, 3/4 and the back as the sheet shows them; low front (the sheet's low camera); the head turned to profile; the
// head looking up (seen from under the chin)
export const VIEWS = { front: [0, 0], q34: [45, 0], low: [0, -25], back: [180, 0], turn: [90, 0], lookup: [0, -55] };
const R = 320, SPAN = 1.0 * W_M;   // pixels across; the half-width of the window (m): the widest style (the afro) fits

function headMesh() { const g = new THREE.SphereGeometry(0.5 * W_M, 64, 40); g.scale(1, HEAD_H, 1); return g; }

// every triangle of the hair group in the head's centre frame: { a, b, c, hull }
function hairTris(g) {
  g.updateMatrixWorld(true); const out = [], lift = g.position.y;
  g.traverse(o => { if (!o.isMesh) return; const hull = !!o.parent?.isMesh, P = o.geometry.attributes.position, I = o.geometry.index, N = o.geometry.attributes.normal;
    const at = i => new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).setY(new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).y - lift);
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld), nat = i => new THREE.Vector3().fromBufferAttribute(N, i).applyMatrix3(nm);
    const n = I ? I.count : P.count, V = [], NV = [];
    for (let i = 0; i < P.count; i++) { V.push(at(i)); if (hull) NV.push(nat(i)); }
    for (let t = 0; t < n; t += 3) { const [i, j, k] = I ? [I.getX(t), I.getX(t + 1), I.getX(t + 2)] : [t, t + 1, t + 2];
      out.push({ a: V[i], b: V[j], c: V[k], hull, n: hull ? NV[i].clone().add(NV[j]).add(NV[k]) : null }); } });
  return out;
}

// one view: the share of the head's pixels that are bare scalp, and the label buffer (0 nothing, 1 bare scalp, 2 face or
// declared bare, 3 hair, 4 ink)
function renderView(tris, head, bare, [yaw, el]) {
  const y = yaw * Math.PI / 180, e = el * Math.PI / 180, dir = new THREE.Vector3(Math.sin(y) * Math.cos(e), Math.sin(e), Math.cos(y) * Math.cos(e));
  const right = new THREE.Vector3(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right).normalize();
  const Z = new Float32Array(R * R).fill(-1e9), L = new Uint8Array(R * R), HP = new Float32Array(R * R * 3);
  const px = p => [(p.dot(right) / SPAN * 0.5 + 0.5) * R, (0.5 - p.dot(up) / SPAN * 0.5) * R, p.dot(dir)];
  const raster = (a, b, c, label, keep) => {
    const A = px(a), B = px(b), C = px(c), area = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (Math.abs(area) < 1e-12) return;
    const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(R - 1, Math.ceil(Math.max(A[0], B[0], C[0]))), y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(R - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const sx = i + 0.5, sy = j + 0.5, w0 = ((B[0] - sx) * (C[1] - sy) - (B[1] - sy) * (C[0] - sx)) / area, w1 = ((C[0] - sx) * (A[1] - sy) - (C[1] - sy) * (A[0] - sx)) / area, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * A[2] + w1 * B[2] + w2 * C[2], o = j * R + i; if (z <= Z[o]) continue;
      Z[o] = z; L[o] = label; if (keep) { HP[3 * o] = w0 * a.x + w1 * b.x + w2 * c.x; HP[3 * o + 1] = w0 * a.y + w1 * b.y + w2 * c.y; HP[3 * o + 2] = w0 * a.z + w1 * b.z + w2 * c.z; } } };
  for (const [a, b, c] of head) raster(a, b, c, 1, true);
  for (const t of tris) { if (t.hull && t.n.dot(dir) > 0) continue; raster(t.a, t.b, t.c, t.hull ? 4 : 3, false); }   // an ink hull shows its back faces only
  let headPx = 0, barePx = 0;
  for (let o = 0; o < R * R; o++) { if (L[o] === 0) continue; headPx++;
    if (L[o] !== 1) continue; const x = HP[3 * o] / W_M, yy = HP[3 * o + 1] / W_M, z = HP[3 * o + 2] / W_M, lon = Math.atan2(x, z) * 180 / Math.PI;
    if (inScalp(lon, yy, bare, x)) barePx++; else L[o] = 2; }
  return { share: barePx / headPx, px: barePx, L };
}

function headTris() { const g = headMesh(), P = g.attributes.position, I = g.index, out = [], v = i => new THREE.Vector3().fromBufferAttribute(P, i);
  for (let t = 0; t < I.count; t += 3) out.push([v(I.getX(t)), v(I.getX(t + 1)), v(I.getX(t + 2))]); return out; }
const HEAD = headTris();

// { view: { share, px } } for one style (patch: fields over the style's own, as toonHair takes them); keepL: the label buffers too
export function scalpBare(style, patch, keepL = false) {
  const tris = hairTris(toonHair(style, null, patch)()), bare = bareOf({ ...styleOf(style), ...patch }), out = {};
  for (const [k, v] of Object.entries(VIEWS)) { const r = renderView(tris, HEAD, bare, v); out[k] = keepL ? r : { share: r.share, px: r.px }; }
  return out;
}

const COL = [[128, 128, 128], [255, 0, 255], [215, 212, 205], [110, 70, 40], [10, 10, 10]];
export function png(L, file) {
  const raw = Buffer.alloc((R * 3 + 1) * R); for (let j = 0; j < R; j++) { raw[j * (R * 3 + 1)] = 0; for (let i = 0; i < R; i++) { const c = COL[L[j * R + i]], o = j * (R * 3 + 1) + 1 + 3 * i; raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; } }
  const crc = b => { let c, k = -1; for (let n = 0; n < b.length; n++) { c = (k ^ b[n]) & 0xff; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; k = (k >>> 8) ^ c; } return (k ^ -1) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(R, 0); ih.writeUInt32BE(R, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), pi = a.indexOf('--png'), dir = pi >= 0 ? a.splice(pi, 2)[1] : null, styles = a.length ? a : HAIR_STYLES;
  if (dir) mkdirSync(dir, { recursive: true });
  for (const s of styles) { const r = scalpBare(s, undefined, !!dir);
    console.log(s.padEnd(10), Object.entries(r).map(([k, x]) => `${k} ${(100 * x.share).toFixed(2)}%`).join('  '));
    if (dir) for (const [k, x] of Object.entries(r)) png(x.L, `${dir}/${s}_${k}.png`); }
}
