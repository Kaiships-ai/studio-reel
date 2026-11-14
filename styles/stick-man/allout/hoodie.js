// A worn grey hoodie as a costume layer, built clean like the cops' uniform: one closed smooth garment on the torso (the
// Blender study's body profile), the study's thick hood shell (assets/costume/hoodie_grey.glb: hood, its rolled face rim,
// the cords' centrelines), two light cords. Ink on the silhouettes, the face opening (one smooth loop), the hem band, the
// hem's edge (two clean notches: the "ragged" read) and the pocket; nothing else. Two flat toon tones plus the hood's
// inside tone, neutral grey. Arms leave from under the garment as the cops' arms do.
//   import '/styles/stick-man/allout/costume.js'; import '/styles/stick-man/allout/hoodie.js'
//   cast: { kid: { spec: 'ENGINEER', costume: ['hoodie:grey'] } }        hood up (give the spec hair: [], a hair cap is bigger than the hood)
//         { spec: 'ENGINEER', costume: ['hoodie:grey:down'] }    hood down, folded on the upper back (a cap can go on the head:
//                                                                  hair: [hairCap(..), flatCap(red, red)] from engine/cast.js)
//   or on the spec itself: SPECS.KID = { ..., costume: ['hoodie:grey'] } (engine/play.js takes the spec's costume by default)
// How it moves (one rig, one physics, all in the engine):
//   garment   follows the torso's spine bend and squash exactly (engine/cast.js bendPt), like the torso it covers
//   hood      the shell is skinned between the chest and the head about the neck pivot (see "The hood's skinning" below):
//             part of the head's turn and swing, the rest turns the head inside the hood (a cowl shows the hood's inside
//             there); a push-out keeps it off the head, the jersey and the upper arms. Stretch p99 stays under 15 %.
//   follow-through  PHYS.on: the hood's back peak is a damped mass-spring (3.5 Hz, zeta 0.6) on the posed peak; its lag
//             (turns, nods, run starts and stops) turns the upper hood about the head centre (soft-clamped to 7 deg).
//             Settles in ~8-10 frames.
//   cords     PHYS.on: two inextensible verlet chains (allout/cloth.js) from the rim at the throat, gravity, drag, a soft
//             tether toward hanging at rest, colliding with the head's volume, the jersey's own surface and the arm bones.
//   A frame that does not follow the last one (a still, a cut) starts from rest: the same frame always gives the same picture.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { solid, W_M, HEAD_C, HEAD_H, HIP_V, SPINE_L, spineParams, bendPt, spineFrame } from '../engine/cast.js';
import { PHYS } from '../engine/body.js';
import { Cloth } from './cloth.js';
import { toon } from '../engine/look.js';
import { HOOKS } from '../engine/play.js';

const W = W_M, DEG = Math.PI / 180, HEAD_Y = HEAD_C[1] * W, PIV_Y = (HIP_V + SPINE_L) * W, HA_M = 0.5 * W, HB_M = 0.5 * HEAD_H * W;
const SRC = await new GLTFLoader().loadAsync('/styles/stick-man/assets/costume/hoodie_grey.glb').then(g => g.scene);
const PIECES = {};
SRC.traverse(o => { if (o.isMesh) PIECES[o.name] = o; });

// ---------------------------------------------------------------- look
const INK = 0.046 * W;
const GREY = [0.30, 0.30, 0.30], INSIDE = 0.78, LIP_TONE = 0.0, CORD_RGB = [0.80, 0.80, 0.79];   // neutral grey; the cowl (the hood inside seen round the head) a step darker; the shell's own inner face and lip dark, so the lip reads with the rim as one line
const mat = rgb => toon(rgb, { shade: [0.70, 0.70, 0.70], rimCool: 0, sheen: 0, rough: 1, rim: 0, soft: 0, char: 1 });
const CLOTH_MAT = (t => { t.vertexColors = true; return t; })(mat(GREY));
const INSIDE_MAT = mat(GREY.map(c => c * 0.5));   // the garment's inside at the hem
const INK_MAT = new THREE.MeshBasicMaterial({ color: 0x0b0b0c });
const INK_BACK = new THREE.MeshBasicMaterial({ color: 0x0b0b0c, side: THREE.BackSide });
const CORD_MAT = mat(CORD_RGB);
const RIM_K = 1.0, RIM_OVER = 0.007, LINE_R = 0.0042, CORD_R = 0.0062, CORD_INK = 0.0042, CORD_N = 10;   // RIM_OVER: the rim's second pass drawn this much fatter (m), over the lip beside it
const ONE = new THREE.Vector3(1, 1, 1);

// ---------------------------------------------------------------- the garment: the study's body profile
// The kit torso (an egg, radius 0.171, 0.54 m tall from y 0.762) plus 1.8 cm of jersey; below the belly it hangs straight,
// blouses a little and rolls in over the ribbed hem band. DEPTH: the front-back squash of the kit torso.
const DEPTH = 0.8, R2 = 0.189, H2 = 0.576, Z0 = 0.744, SH_BOT = 0.826, SH_TOP = 1.318, BAND = [0.776, 0.838], RB = 0.1755;
const sstep = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function shellR(z) {
  const h = z - Z0, rr = h < R2 ? Math.sqrt(Math.max(0, R2 ** 2 - (R2 - h) ** 2)) : h > H2 - R2 ? Math.sqrt(Math.max(0, R2 ** 2 - (h - (H2 - R2)) ** 2)) : R2;
  const zw = Z0 + R2; if (z >= zw) return rr * (1.10 - 0.20 * (h / H2) ** 2);
  const rmax = R2 * (1.10 - 0.20 * (R2 / H2) ** 2), s = Math.max(0, Math.min(1, (zw - z) / (zw - 0.80)));
  return rmax * (1 - 0.02 * s) + 0.007 * Math.exp(-(((z - 0.858) / 0.022) ** 2)) - (rmax * 0.035 + 0.009) * sstep(0.846, 0.826, z);
}
const hemDrop = th => -0.006 * (0.5 + 0.5 * Math.cos(th));                       // the hem hangs ~1 cm lower at the front
// the "ragged" read by shape: two clean V notches in the hem band (front, viewer's left; back right), nothing else
const NOTCH = [[-0.42, 0.11, 0.032], [2.55, 0.09, 0.024]];                       // [angle (0 = front), half width (rad), depth (m)]
const notchAt = th => { let d = 0; for (const [c, w, dp] of NOTCH) { const a = Math.abs(Math.atan2(Math.sin(th - c), Math.cos(th - c))); if (a < w) d = Math.max(d, dp * (1 - a / w)); } return d; };
const SEG = 160;
// radius profile (r, y) of the garment, bottom (open: the hem edge) to top (closed)
function profile() {
  const pts = [[RB - 0.022, BAND[0] + 0.004], [RB - 0.012, BAND[0] + 0.0005], [RB - 0.004, BAND[0] + 0.001], [RB - 0.001, BAND[0] + 0.004]];   // the hem's edge turns in
  for (let y = BAND[0] + 0.008; y <= BAND[1] - 0.004; y += 0.006) pts.push([RB, y]);
  // the blouse rolls in over the band: one smooth S from the band to the body, no step (a step grows a spur in the ink hull)
  const y0 = BAND[1] - 0.002, y1 = 0.858, r1 = shellR(y1);
  for (let i = 1; i <= 8; i++) { const u = i / 8, y = y0 + (y1 - y0) * u; pts.push([RB + (r1 - RB) * Math.sin(u * Math.PI / 2), y]); }
  for (let y = y1 + 0.010; y < SH_TOP - 0.03; y += 0.010) pts.push([shellR(y), y]);
  for (let y = SH_TOP - 0.03; y < SH_TOP; y += 0.004) pts.push([shellR(y), y]);
  pts.push([0, SH_TOP + 0.002]);
  return pts;
}
// a lathe on the profile, squashed to DEPTH, the hem dropped at the front and notched; returns the geometry and, for the
// notch, how far each bottom-band vertex was raised
const bandK = y => Math.max(0, 1 - (y - BAND[0]) / (BAND[1] - BAND[0]));
function shapeHem(x, y, z) {
  const th = Math.atan2(x, z / DEPTH), k = sstep(1.0, 0.85, y);
  return y + hemDrop(th) * k + notchAt(th) * bandK(y);
}
// under a hood that is up, the garment's top is drawn in a little (7 % from the shoulders up), so the hood's skirt always lies
// on it with a clean edge instead of cutting through it
const tuck = y => 1 - 0.07 * sstep(1.04, 1.18, y);
// and where the hood's skirt ends on the shoulders and the back (its crease), the garment comes out to meet it from below,
// so the skirt's edge lies on the jersey all the way round: no gap to the background, no cut through the skirt
function seamOf(crease) {
  const a = crease.map(([x, y, z]) => { let t = Math.atan2(x, z / DEPTH); if (t < 0) t += 2 * Math.PI; return [t, y, Math.hypot(x, z / DEPTH)]; }).sort((p, q) => p[0] - q[0]);
  const t0 = a[0][0], t1 = a[a.length - 1][0], FADE = 20 * DEG;   // faded in over 20 deg from each end of the crease (no step at the throat)
  return th => { if (th < 0) th += 2 * Math.PI; if (th < t0 || th > t1) return null; let i = 0; while (i + 2 < a.length && a[i + 1][0] < th) i++;
    const u = (th - a[i][0]) / Math.max(1e-6, a[i + 1][0] - a[i][0]); return [a[i][1] + (a[i + 1][1] - a[i][1]) * u, a[i][2] + (a[i + 1][2] - a[i][2]) * u, sstep(t0, t0 + FADE, th) * sstep(t1, t1 - FADE, th)]; };
}
function garmentK(th, y, r0, seam, down) {
  let k = down ? 1 : tuck(y); const sm = seam && y > 0.95 ? seam(th) : null;
  if (sm) { const [yc, rc, f] = sm, rt = rc + 0.014, rb = r0 * k;
    const r = y <= yc ? Math.max(rb, rb + (rt - rb) * sstep(yc - 0.12, yc, y)) : rt + (rb - rt) * sstep(yc + 0.02, yc + 0.06, y); k = (rb + (r - rb) * f) / r0; }
  return k;
}
// the part of the garment the hood does not cover (its ink hull is grown from this only: a hull grown under the hood pokes
// through the hood's skirt as stray marks)
function underHood(g) {
  const P = g.attributes.position, I = g.index.array, keepT = [];
  const cut = i => { const x = P.getX(i), z = P.getZ(i), th = Math.atan2(x, z / DEPTH), sm = SEAM(th); return sm ? 1.10 + (sm[0] + 0.01 - 1.10) * sm[2] : 1.10; };
  for (let t = 0; t < I.length; t += 3) if (P.getY(I[t]) < cut(I[t]) || P.getY(I[t + 1]) < cut(I[t + 1]) || P.getY(I[t + 2]) < cut(I[t + 2])) keepT.push(I[t], I[t + 1], I[t + 2]);
  const o = new THREE.BufferGeometry(); o.setAttribute('position', P.clone()); o.setIndex(keepT); return o;
}
function garmentGeo(down, crease) {
  const g = new THREE.LatheGeometry(profile().map(([r, y]) => new THREE.Vector2(r, y)), SEG);
  g.scale(1, 1, DEPTH);
  const N0 = g.attributes.normal.array.slice();   // the plain body's normals: the top drawn in or out under the hood shades like the body
  const P = g.attributes.position, seam = crease ? seamOf(crease) : null;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r0 = Math.hypot(x, z / DEPTH), k = r0 > 1e-4 ? garmentK(Math.atan2(x, z / DEPTH), y, r0, seam, down) : 1;
    P.setXYZ(i, x * k, shapeHem(x, y, z), z * k);
  }
  g.computeVertexNormals();
  // where the top is drawn in under the hood or comes out to meet its skirt, a recomputed normal tilts up and catches the
  // light as a pale band below the hood: keep the plain body's normal there
  const N = g.attributes.normal;
  for (let i = 0; i < N.count; i++) { const w = down ? 0 : sstep(0.98, 1.06, P.getY(i)); if (!w) continue;
    _gn.set(N.getX(i), N.getY(i), N.getZ(i)).lerp(_gm.set(N0[3 * i], N0[3 * i + 1], N0[3 * i + 2]), w).normalize(); N.setXYZ(i, _gn.x, _gn.y, _gn.z); }
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(P.count * 3).fill(1), 3));
  return g;
}
const _gn = new THREE.Vector3(), _gm = new THREE.Vector3();
// the inside of the garment seen through the open hem and the notches: a dark disc just inside the band
function insideGeo() {
  const g = new THREE.CylinderGeometry(RB - 0.012, RB - 0.012, 0.05, SEG, 1, false); g.scale(1, 1, DEPTH); g.translate(0, BAND[0] + 0.03, 0);
  const P = g.attributes.position; for (let i = 0; i < P.count; i++) if (P.getY(i) < BAND[0] + 0.01) P.setY(i, shapeHem(P.getX(i), P.getY(i), P.getZ(i)) + 0.004);
  g.computeVertexNormals(); return g;
}
// a point on the garment surface at angle th (0 = front) and height y, `out` metres off it
const onSurf = (th, y, out = 0.003) => { const r = (y < BAND[1] ? RB : y < 0.858 ? RB + (shellR(0.858) - RB) * Math.sin((y - BAND[1]) / (0.858 - BAND[1]) * Math.PI / 2) : shellR(y)) + out; return new THREE.Vector3(r * Math.sin(th), y, DEPTH * r * Math.cos(th)); };
function lineGeos() {
  const ring = (f, n = 256) => { const pts = []; for (let i = 0; i < n; i++) { const th = i / n * Math.PI * 2, p = f(th); pts.push(p); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), n, LINE_R, 6, true); };
  // the top of the hem band (under the blouse lip) and the hem's bottom edge, notches and all
  const bandTop = ring(th => { const p = onSurf(th, BAND[1] - 0.001, 0.0025); p.y = shapeHem(p.x, p.y, p.z); return p; });
  const hemEdge = ring(th => { const p = onSurf(th, BAND[0], 0.0015); p.y = shapeHem(p.x, BAND[0], p.z) + 0.001; return p; }, 512);
  // the kangaroo pocket: sides slanted in to the top edge
  const pk = [], side = (sg, up) => { for (let i = 0; i <= 8; i++) { const t = up ? i / 8 : 1 - i / 8, y = 0.868 + t * 0.15, hw = 0.150 - t * 0.055; pk.push([sg * Math.asin(Math.min(1, hw / shellR(y))), y]); } };
  side(-1, true); for (let i = 1; i < 10; i++) { const x = -0.095 + 0.19 * i / 10; pk.push([Math.asin(x / shellR(1.018)), 1.018]); } side(1, false);
  const pocket = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pk.map(([th, y]) => { const p = onSurf(th, y, 0.004); p.y = shapeHem(p.x, y, p.z); return p; }), false, 'catmullrom', 0.1), 96, LINE_R, 6, false);
  return [bandTop, pocket];   // the hem's edge is the garment's own ink silhouette (a traced edge doubled it)
}

// ---------------------------------------------------------------- the hood: the study's closed thick shell
const HOOD_C = new THREE.Vector3(0, HEAD_Y, 0);
function hoodGeos() {
  const g = PIECES.hood.geometry.clone(); roundLip(g); g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3), out = new Uint8Array(P.count), u = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { u.set(P.getX(i), P.getY(i), P.getZ(i)).sub(HOOD_C); n.set(N.getX(i), N.getY(i), N.getZ(i)); out[i] = hoodOut()[i]; const v = out[i] ? 1 : LIP_TONE; col.set([v, v, v], 3 * i); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  smoothNormals(g, out, 32);
  broadNormals(g, out);
  // the rolled lip next to the face rim is a thin tube in the drape; its own curvature puts glossy toon stripes beside the
  // rim in a close-up. Within 2 cm of the rim its shading normal is the broad one (out from the head centre): one flat tone
  { const R = PIECES.hood_rim.geometry.attributes.position, cell = 0.025, grid = new Map(), v = new THREE.Vector3(), w = new THREE.Vector3();
    for (let j = 0; j < R.count; j += 2) { const k = `${Math.floor(R.getX(j) / cell)},${Math.floor(R.getY(j) / cell)},${Math.floor(R.getZ(j) / cell)}`; (grid.get(k) || grid.set(k, []).get(k)).push(j); }
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); let d = Infinity;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of grid.get(`${Math.floor(x / cell) + a},${Math.floor(y / cell) + b},${Math.floor(z / cell) + c}`) || []) d = Math.min(d, Math.hypot(R.getX(j) - x, R.getY(j) - y, R.getZ(j) - z));
      const k = 1 - sstep(0.012, 0.024, d); if (k <= 0) continue;
      v.set(N.getX(i), N.getY(i), N.getZ(i)); w.set(x, y - HEAD_Y, z).normalize(); if (!out[i]) w.negate(); v.lerp(w, k).normalize(); N.setXYZ(i, v.x, v.y, v.z); } }
  // the ink hull from the outer surface only (a hull grown from the inner surface grows into the head: hatching)
  const idx = g.index.array, keep = [];
  for (let t = 0; t < idx.length; t += 3) if (out[idx[t]] && out[idx[t + 1]] && out[idx[t + 2]]) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  const outer = new THREE.BufferGeometry(); outer.setAttribute('position', g.attributes.position.clone()); outer.setIndex(keep);
  return { g, outer, rim: thickRim(PIECES.hood_rim.geometry.clone()), out };
}
// the draped mesh carries the cloth sim's small ripples; toon shading turns them into wavy terminators. Shading normals are
// averaged over the surface (each side of the shell on its own) so the two tones split along one clean curve, as on the cops
function smoothNormals(g, out, iters) {
  const P = g.attributes.position, N = g.attributes.normal, n = P.count, key = new Map(), id = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = `${Math.round(P.getX(i) * 2e4)},${Math.round(P.getY(i) * 2e4)},${Math.round(P.getZ(i) * 2e4)},${out[i]}`; let v = key.get(k); if (v == null) { v = key.size; key.set(k, v); } id[i] = v; }
  const m = key.size, nb = Array.from({ length: m }, () => new Set()), I = g.index.array;
  for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const u = id[I[t + a]], v = id[I[t + b]], ou = out[I[t + a]], ov = out[I[t + b]]; if (u !== v && ou === ov) { nb[u].add(v); nb[v].add(u); } }
  let A = new Float64Array(3 * m); for (let i = 0; i < n; i++) { A[3 * id[i]] += N.getX(i); A[3 * id[i] + 1] += N.getY(i); A[3 * id[i] + 2] += N.getZ(i); }
  const norm = X => { for (let v = 0; v < m; v++) { const l = Math.hypot(X[3 * v], X[3 * v + 1], X[3 * v + 2]) || 1; X[3 * v] /= l; X[3 * v + 1] /= l; X[3 * v + 2] /= l; } };
  norm(A);
  for (let it = 0; it < iters; it++) { const B = new Float64Array(3 * m);
    for (let v = 0; v < m; v++) { B[3 * v] = A[3 * v]; B[3 * v + 1] = A[3 * v + 1]; B[3 * v + 2] = A[3 * v + 2]; for (const u of nb[v]) { B[3 * v] += A[3 * u]; B[3 * v + 1] += A[3 * u + 1]; B[3 * v + 2] += A[3 * u + 2]; } }
    norm(B); A = B; }
  for (let i = 0; i < n; i++) N.setXYZ(i, A[3 * id[i]], A[3 * id[i] + 1], A[3 * id[i] + 2]);
}
// the hood's lip along the face rim, rounded: the drape left the shell's edge flared ~1 cm out past the rim tube at the brow,
// which drew a sharp point (a notch) in the outline where the brim meets the rim. Umbrella smoothing of the shell's outer
// positions within LIP_D of the rim (welded by position, full strength at the rim, none from LIP_D out) rounds it off.
// The skirt (below SKIRT_Y) is smoothed the same way: its gathers caught the screen-space AO as a smeared grey band at
// the nape and drew fold marks on the shoulders from the side.
const LIP_Y = [1.56, 1.62], LIP_D = 0.045, LIP_IT = 10;
const SKIRT_Y = [1.44, 1.26], SKIRT_IT = 60;
function roundLip(g) {
  const P = g.attributes.position, n = P.count, key = new Map(), id = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = `${Math.round(P.getX(i) * 2e4)},${Math.round(P.getY(i) * 2e4)},${Math.round(P.getZ(i) * 2e4)}`; let v = key.get(k); if (v == null) { v = key.size; key.set(k, v); } id[i] = v; }
  const m = key.size, X = new Float64Array(3 * m), nb = Array.from({ length: m }, () => new Set()), I = g.index.array, w = new Float64Array(m);
  const O = hoodOut(), inner = new Uint8Array(m);
  for (let i = 0; i < n; i++) { X[3 * id[i]] = P.getX(i); X[3 * id[i] + 1] = P.getY(i); X[3 * id[i] + 2] = P.getZ(i); if (!O[i]) inner[id[i]] = 1; }
  for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const u = id[I[t + a]], v = id[I[t + b]]; if (u !== v) { nb[u].add(v); nb[v].add(u); } }
  const R = PIECES.hood_rim.geometry.attributes.position, cell = 0.05, grid = new Map();
  for (let j = 0; j < R.count; j += 2) { const k = `${Math.floor(R.getX(j) / cell)},${Math.floor(R.getY(j) / cell)},${Math.floor(R.getZ(j) / cell)}`; (grid.get(k) || grid.set(k, []).get(k)).push(j); }
  for (let v = 0; v < m; v++) { const x = X[3 * v], y = X[3 * v + 1], z = X[3 * v + 2]; let d = Infinity;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of grid.get(`${Math.floor(x / cell) + a},${Math.floor(y / cell) + b},${Math.floor(z / cell) + c}`) || []) d = Math.min(d, Math.hypot(R.getX(j) - x, R.getY(j) - y, R.getZ(j) - z));
    w[v] = inner[v] ? 0 : 0.5 * Math.max((1 - sstep(0.012, LIP_D, d)) * sstep(LIP_Y[0], LIP_Y[1], y), sstep(SKIRT_Y[0], SKIRT_Y[1], y) * sstep(0.02, 0.06, d)); }
  for (let it = 0; it < Math.max(LIP_IT, SKIRT_IT); it++) { const Y = X.slice();
    for (let v = 0; v < m; v++) { if (!w[v] || !nb[v].size) continue; let sx = 0, sy = 0, sz = 0; for (const u of nb[v]) { sx += X[3 * u]; sy += X[3 * u + 1]; sz += X[3 * u + 2]; } const k = nb[v].size;
      Y[3 * v] += w[v] * (sx / k - X[3 * v]); Y[3 * v + 1] += w[v] * (sy / k - X[3 * v + 1]); Y[3 * v + 2] += w[v] * (sz / k - X[3 * v + 2]); }
    X.set(Y); }
  for (let i = 0; i < n; i++) P.setXYZ(i, X[3 * id[i]], X[3 * id[i] + 1], X[3 * id[i] + 2]);
}
// the hood's outer shading normals, blended toward a broad form (BROAD of the way): out from the head centre round the head,
// out from the body's axis where the skirt lies on the shoulders and the back (blended over BR_Y: a narrow blend bent the
// terminator into a step on the back of the hood). The drape's gathers and the skirt's folds
// otherwise put a smeared second terminator on the skirt under the back of the hood (a grey patch at the nape); the cops'
// uniform has one clean terminator per form
const BROAD = 1.0, BR_Y = [1.58, 1.12];
function broadNormals(g, out) {
  const P = g.attributes.position, N = g.attributes.normal, h = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { if (!out[i]) continue; const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    h.set(x / (HA_M * HA_M), (y - HEAD_Y) / (HB_M * HB_M), z / (HA_M * HA_M)).normalize();
    const yy = Math.min(y, SH_TOP - 0.02), dr = (shellR(yy + 0.005) - shellR(yy - 0.005)) / 0.01;
    b.set(x, -dr * Math.hypot(x, z / DEPTH), z / (DEPTH * DEPTH)).normalize();
    h.lerp(b, sstep(BR_Y[0], BR_Y[1], y)).normalize();
    n.set(N.getX(i), N.getY(i), N.getZ(i)).lerp(h, BROAD).normalize(); N.setXYZ(i, n.x, n.y, n.z); }
}
// the hood's lower edge where it lies on the shoulders and the back (from one end of the face rim round the back to the
// other): one ink line, the crease a hood makes on the body
function creaseLine(g, out) {
  const P = g.attributes.position, pts = [];
  for (let a = 76; a <= 284; a += 3) {
    const th = a * DEG; let best = null;
    for (let i = 0; i < P.count; i++) { if (!out[i]) continue; const x = P.getX(i), y = P.getY(i), z = P.getZ(i), d = Math.atan2(Math.sin(Math.atan2(x, z / DEPTH) - th), Math.cos(Math.atan2(x, z / DEPTH) - th));
      if (Math.abs(d) < 2.5 * DEG && (!best || y < best[1])) best = [x, y, z]; }
    if (best) pts.push(best);
  }
  const sm = pts.map((p, i) => [0, 1, 2].map(c => { let s = 0, w = 0; for (let k = -3; k <= 3; k++) { const q = pts[Math.max(0, Math.min(pts.length - 1, i + k))]; s += q[c]; w++; } return s / w; }));
  return sm.map(([x, y, z]) => { const r = Math.hypot(x, z) || 1; return [x + 0.003 * x / r, y + 0.002, z + 0.003 * z / r]; });
}
// the face rim, 60 % thicker than the study's tube: it covers the hood's rolled lip beside it, so rim and lip read as one
// clean line (a grey lip between the tube and the fabric shows as glossy stripes in a close-up). Each vertex moves away from
// the tube's centre there (the mean of the tube's vertices within 2 cm)
function thickRim(g) {
  const P = g.attributes.position, n = P.count, src = P.array.slice(), cell = 0.02, grid = new Map(), key = (a, b, c) => `${a},${b},${c}`;
  for (let j = 0; j < n; j++) { const k = key(Math.floor(src[3 * j] / cell), Math.floor(src[3 * j + 1] / cell), Math.floor(src[3 * j + 2] / cell)); (grid.get(k) || grid.set(k, []).get(k)).push(j); }
  for (let i = 0; i < n; i++) { const x = src[3 * i], y = src[3 * i + 1], z = src[3 * i + 2]; let sx = 0, sy = 0, sz = 0, m = 0;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of grid.get(key(cx + a, cy + b, cz + c)) || []) {
      const d = Math.hypot(src[3 * j] - x, src[3 * j + 1] - y, src[3 * j + 2] - z); if (d < 0.02) { sx += src[3 * j]; sy += src[3 * j + 1]; sz += src[3 * j + 2]; m++; } }
    if (m) { sx /= m; sy /= m; sz /= m; P.setXYZ(i, sx + (x - sx) * RIM_K, sy + (y - sy) * RIM_K, sz + (z - sz) * RIM_K); } }
  g.computeVertexNormals(); return g;
}
let OUT = null;
function hoodOut() { if (OUT) return OUT; const g = PIECES.hood.geometry.clone(); g.computeVertexNormals(); const P = g.attributes.position, N = g.attributes.normal; OUT = new Uint8Array(P.count);
  for (let i = 0; i < P.count; i++) OUT[i] = (P.getX(i) * N.getX(i) + (P.getY(i) - HEAD_Y) * N.getY(i) + P.getZ(i) * N.getZ(i)) > 0 ? 1 : 0; return OUT; }
// the hood's inside round the head: a shell 3 mm over the skull in the inside tone, open where the face is (the study's face
// opening: half width 70 deg, up to +38 deg about the head centre, and open all the way under the chin). It turns with the
// head, so when the head turns or nods inside the hood, what shows in the opening is the hood's inside, not the bare side
// of the head.
const OPEN = { w: 1.22, c: -0.45, h: 1.12 };
function cowl() {
  const g = new THREE.SphereGeometry(0.5 * W + 0.003, 72, 48); g.scale(1, HEAD_H, 1);
  const m = toon(GREY.map(c => c * INSIDE), { shade: [1, 1, 1], rimCool: 0, sheen: 0, rough: 1, rim: 0, soft: 0, char: 1 }), base = m.onBeforeCompile;   // one tone
  m.onBeforeCompile = (sh, r) => { base(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCowl;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCowl = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCowl;').replace('void main() {', `void main() {
      vec3 cd = normalize(vCowl / vec3(1.0, ${HEAD_H.toFixed(3)}, 1.0)); float cth = atan(cd.x, cd.z), cph = asin(clamp(cd.y, -1.0, 1.0));
      if (pow(cth / ${OPEN.w.toFixed(3)}, 2.0) + pow((cph - (${OPEN.c.toFixed(3)})) / ${OPEN.h.toFixed(3)}, 2.0) < 1.0) discard;`); };
  m.customProgramCacheKey = () => 'hoodie-cowl';
  const c = new THREE.Mesh(g, m); c.castShadow = false; c.receiveShadow = false; c.userData.noInk = true; c.name = 'hood_cowl'; return c;
}
// a hood down (day 2): the hood folded flat on the upper back, built clean from primitives: the neckline as a soft rolled
// collar round the base of the head, the folded hood as a low U-shaped pad lying on the jersey from the collar down to the
// shoulder blades (thickest at the fold, a 1 cm lip at its edge), one ink line round the pad's edge and one across it where
// the hood's face opening lies, and the fabric bunched round the back of the neck above it (a soft roll, so the hood reads
// from the side, not a bare tube neck). All of it rides the garment (the spine bend), like the pocket.
const DN = { yTop: 1.225, yBot: 0.99, w: 0.175, t0: 0.010, t1: 0.026 };
const dnW = y => DN.w * Math.sqrt(Math.max(0, 1 - Math.pow((DN.yTop - y) / (DN.yTop - DN.yBot), 3)));
function backPt(x, y, out = 0) {       // a point on the (untucked) garment's back at x, y, `out` metres along its normal
  const r = Math.max(shellR(Math.min(y, SH_TOP - 0.02)), Math.abs(x) + 1e-3), z = -DEPTH * Math.sqrt(Math.max(0, r * r - x * x));
  const n = new THREE.Vector3(x / (r * r), 0, z / (DEPTH * DEPTH * r * r)).normalize(); return new THREE.Vector3(x, y, z).addScaledVector(n, out);
}
const dnT = (u, v) => DN.t0 + DN.t1 * Math.pow(Math.max(0, 1 - u * u), 0.7) * (1 - 0.55 * v);
function downGeos() {
  const NU = 28, NV = 22, pos = [], idx = [], outer = [];
  const P = (u, v) => { const y = DN.yTop + (DN.yBot + 0.004 - DN.yTop) * v; return backPt(u * dnW(y), y, dnT(u, v)); };
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const p = P(-1 + 2 * i / NU, j / NV); pos.push(p.x, p.y, p.z); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  // the lip: from the pad's edge down onto the jersey (sides and bottom)
  const base = pos.length / 3, edge = [];
  for (let j = 0; j <= NV; j++) edge.push([-1, j / NV]); for (let i = 1; i < NU; i++) edge.push([-1 + 2 * i / NU, 1]); for (let j = NV; j >= 0; j--) edge.push([1, j / NV]);
  const inkEdge = edge.filter(([, v]) => v >= 0.12);   // the line starts under the collar
  edge.forEach(([u, v]) => { const y = DN.yTop + (DN.yBot + 0.004 - DN.yTop) * v, q = backPt(u * dnW(y), y, dnT(u, v)), r = backPt(u * dnW(y) * 1.02, y, -0.006); pos.push(q.x, q.y, q.z, r.x, r.y, r.z); });
  for (let k = 0; k + 1 < edge.length; k++) { const a = base + 2 * k, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, c, b, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // make the normals face out (away from the body's axis): flip the winding if they do not
  const N = g.attributes.normal; let dot = 0; for (let i = 0; i < (NU + 1) * (NV + 1); i++) dot += N.getZ(i); if (dot > 0) { const I = g.index.array; for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; } g.index.needsUpdate = true; g.computeVertexNormals(); }
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length).fill(1), 3));
  const og = new THREE.BufferGeometry(); og.setAttribute('position', g.attributes.position.clone()); og.setIndex(g.index.array.slice(0, NU * NV * 6)); og.index = new THREE.BufferAttribute(g.index.array.slice(0, NU * NV * 6), 1);
  // the collar: a rolled tube round the base of the head (lower at the front), on the jersey
  const ring = []; for (let i = 0; i < 96; i++) { const th = i / 96 * Math.PI * 2, y = 1.205 + 0.04 * (0.5 - 0.5 * Math.cos(th)), r = shellR(y) + 0.010; ring.push(new THREE.Vector3(r * Math.sin(th), y, DEPTH * r * Math.cos(th))); }
  const collar = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 192, 0.017, 10, true);
  collar.setAttribute('color', new THREE.BufferAttribute(new Float32Array(collar.attributes.position.count * 3).fill(1), 3));
  // ink: round the pad's edge, and across it where the hood's opening lies
  const rimPts = inkEdge.map(([u, v]) => { const y = DN.yTop + (DN.yBot + 0.004 - DN.yTop) * v; return backPt(u * dnW(y), y, dnT(u, v) + 0.001); });
  const edgeLine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, false, 'centripetal'), 160, LINE_R * 1.3, 6, false);
  const open = []; for (let i = 0; i <= 24; i++) { const u = -0.82 + 1.64 * i / 24, v = 0.10 + 0.32 * (1 - u * u), y = DN.yTop + (DN.yBot - DN.yTop) * v; open.push(backPt(u * dnW(y), y, dnT(u, v) + 0.002)); }
  const openLine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(open), 64, LINE_R, 6, false);
  // the bunch: the hood's fabric gathered round the back of the neck where it falls (a soft roll behind and beside the neck,
  // thickest at the nape, thinning to nothing at the throat beside the cords), so the hood down reads from the side and the
  // three-quarter, not only from the back
  const bunch = (() => { const N = 64, R = th => { const a = Math.abs(Math.atan2(Math.sin(th), Math.cos(th))); return 0.004 + 0.036 * sstep(0.70, 2.7, a) * (0.4 + 0.6 * sstep(0.70, 1.4, a)); }, pts = [];
    for (let i = 0; i <= N; i++) { const th = BUNCH_TH + (2 * Math.PI - 2 * BUNCH_TH) * i / N, cy = 1.205 + 0.04 * (0.5 - 0.5 * Math.cos(th)), y = cy - 0.010 - 0.55 * R(th), r = shellR(y);
      const nx = Math.sin(th), nz = Math.cos(th) / DEPTH, nl = Math.hypot(nx, nz), o = R(th) + 0.004;
      pts.push([new THREE.Vector3(r * Math.sin(th) + o * nx / nl, y, DEPTH * r * Math.cos(th) + o * nz / nl), R(th)]); }
    const curve = new THREE.CatmullRomCurve3(pts.map(p => p[0]), false, 'centripetal'), SEGS = 160, RAD = 14, tg = new THREE.TubeGeometry(curve, SEGS, 1, RAD, false), P = tg.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= SEGS; i++) { curve.getPointAt(i / SEGS, c); const u = i / SEGS * N, k = Math.min(N - 1, Math.floor(u)), rr = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * (u - k);
      for (let j = 0; j <= RAD; j++) { const q = i * (RAD + 1) + j; v.fromBufferAttribute(P, q).sub(c).multiplyScalar(rr).add(c); P.setXYZ(q, v.x, v.y, v.z); } }
    tg.computeVertexNormals(); tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(P.count * 3).fill(1), 3)); return tg; })();
  return { pad: g, padOuter: og, collar, edgeLine, openLine, bunch };
}
const BUNCH_TH = 40 * DEG;   // the bunch runs from 40 deg beside the throat round the back to the other side
// a cord's rest centreline (CORD_N points, top first) from the study's cord tube, kept in front of the jersey
function cordLine(name) {
  const a = PIECES[name].geometry.attributes.position.array, ys = []; for (let i = 1; i < a.length; i += 3) ys.push(a[i]);
  const y0 = Math.max(...ys), y1 = Math.min(...ys), pts = [];
  for (let k = 0; k < CORD_N; k++) { const yy = y0 + (y1 - y0) * k / (CORD_N - 1), band = 0.6 * Math.abs(y0 - y1) / (CORD_N - 1) + 1e-4; let sx = 0, sz = 0, m = 0;
    for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i + 1] - yy) <= band) { sx += a[i]; sz += a[i + 2]; m++; }
    pts.push([sx / Math.max(1, m), yy, sz / Math.max(1, m)]); }
  for (const p of pts.slice(1)) { const th = Math.atan2(p[0], p[2] / DEPTH), zs = onSurf(th, p[1], 0.012).z; if (p[2] < zs) p[2] = zs; }
  return pts;
}
// a tube whose vertices are rewritten in place each frame (fixed topology: no allocation per frame)
class Strand {
  constructor(n, r, radial, mat, cap = true) {
    this.n = n; this.r = r; this.k = radial; const g = new THREE.BufferGeometry(), idx = [];
    const nv = n * radial + (cap ? 2 : 0);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial; idx.push(a, b, a + radial, b, b + radial, a + radial); }
    if (cap) { const c0 = n * radial, c1 = c0 + 1; for (let j = 0; j < radial; j++) { idx.push(c0, (j + 1) % radial, j); const o = (n - 1) * radial; idx.push(c1, o + j, o + (j + 1) % radial); } }
    g.setIndex(idx); this.cap = cap;
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.userData.noInk = true;
  }
  set(pts, rOf = () => this.r) {
    const { n, k } = this, P = this.mesh.geometry.attributes.position, N = this.mesh.geometry.attributes.normal;
    const t = new THREE.Vector3(), nr = new THREE.Vector3(1, 0, 0), bn = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      t.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) { nr.set(0, 0, 1); if (Math.abs(nr.dot(t)) > 0.9) nr.set(1, 0, 0); }
      nr.addScaledVector(t, -nr.dot(t)).normalize(); bn.crossVectors(t, nr); const r = rOf(i);
      for (let j = 0; j < k; j++) { const a = 2 * Math.PI * j / k; d.copy(nr).multiplyScalar(Math.cos(a)).addScaledVector(bn, Math.sin(a)); P.setXYZ(i * k + j, pts[i].x + d.x * r, pts[i].y + d.y * r, pts[i].z + d.z * r); N.setXYZ(i * k + j, d.x, d.y, d.z); }
    }
    if (this.cap) {
      const e0 = pts[0].clone().addScaledVector(t.subVectors(pts[0], pts[1]).normalize(), rOf(0) * 0.6), e1 = pts[n - 1].clone().addScaledVector(t.subVectors(pts[n - 1], pts[n - 2]).normalize(), rOf(n - 1) * 0.6);
      P.setXYZ(n * k, e0.x, e0.y, e0.z); P.setXYZ(n * k + 1, e1.x, e1.y, e1.z); N.setXYZ(n * k, 0, 1, 0); N.setXYZ(n * k + 1, 0, -1, 0);
    }
    P.needsUpdate = N.needsUpdate = true; this.mesh.geometry.computeBoundingSphere();
  }
}
// a smooth curve through a chain's points, m samples
const smoothPts = (pts, m) => { const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); return c.getSpacedPoints(m - 1); };

const keep = m => { m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; m.userData.noInk = true; m.traverse(c => { c.frustumCulled = false; }); return m; };
const restOf = m => [m, ...m.children.filter(c => c.isMesh && !c.userData.over)].map(x => { const g = x.geometry; return { g, p: g.attributes.position.array.slice(), n: g.attributes.normal ? g.attributes.normal.array.slice() : null }; });

// The hood's skinning, by rest height y. The head's turn relative to the chest splits into a twist (about its own axis) and
// a swing (nod, tilt) about the neck pivot; the swing in turn is the head centre's shift plus a turn about that centre.
//   twist  TW_BOT at the skirt (it slides round on the shoulders, as a loose neckline is dragged), all of it from Y_HI (the
//          cheeks) up, spread between as 1 / the hood's radius (every edge shears alike); TW_THROAT less at the front of the
//          throat, where the cords hang. The face opening turns with the face: the face stays framed through a 90 deg turn
//          (a crescent of the hood's inside showed at TW 0.4-0.9) and the stretch p99 stays under 15 %
//   shift  the head centre's shift, 10 % at the skirt (it slides on the shoulders) to 100 % from the ears up
//   swing  KS of the head's swing about its centre, from the jaw up, and more toward the face opening (nodW: all of it at the
//          brim, fading round the crown to the back): a nod carries the opening with the face. The extra follows the nod's
//          angle up to ~NOD_SAT (tanh), past that the head turns inside the hood (a full follow of the dosed 45 deg nod
//          stretches the back of the hood 25 %); what cuts into the hood is pushed out (below)
// The skirt is kept on the jersey and the hood off the head by a push-out (continuous in position: no ripples).
const Y_LO = 1.095, Y_HI = 1.40, TW_TOP = 1.0, TW_BOT = 0.75, TW_Y0 = 1.095, TW_THROAT = 0.3, KS = 0.25;
const wShift = y => 0.1 + 0.9 * sstep(1.10, 1.40, y);
const wRot = y => KS * sstep(1.10, 1.40, y), NOD_SAT = 26 * DEG, NOD_Y = [1.15, 1.35], NOD_DIR = 40 * DEG, NOD_EPS = 0.15;
const TWIST = (() => { const P = PIECES.hood.geometry.attributes.position, n = 80, dy = (Y_HI - TW_Y0) / n, r = new Float64Array(n).fill(0.05);
  for (let i = 0; i < P.count; i++) { const b = Math.floor((P.getY(i) - TW_Y0) / dy); if (b >= 0 && b < n) r[b] = Math.max(r[b], Math.hypot(P.getX(i), P.getZ(i))); }
  const c = new Float64Array(n + 1); for (let b = 0; b < n; b++) c[b + 1] = c[b] + dy / r[b];
  return { dy, c: c.map(v => TW_BOT + (TW_TOP - TW_BOT) * v / c[n]), n }; })();
const wTwist = y => { const u = (y - TW_Y0) / TWIST.dy; if (u <= 0) return TW_BOT; if (u >= TWIST.n) return TW_TOP; const b = Math.floor(u); return TWIST.c[b] + (TWIST.c[b + 1] - TWIST.c[b]) * (u - b); };
const wLag = y => sstep(1.20, 1.72, y);
function nodW(y, z) { const dy = y - HEAD_Y, c = (dy * Math.sin(NOD_DIR) + z * Math.cos(NOD_DIR)) / Math.sqrt(dy * dy + z * z + NOD_EPS * NOD_EPS); return Math.max(0, Math.min(1, 0.5 + 0.5 * c)) * sstep(NOD_Y[0], NOD_Y[1], y); }
// the follow-through spring (the back peak of the hood) and its soft clamp
const PEAK = new THREE.Vector3(0, 1.62, -0.30), SPR_F = 3.5, SPR_Z = 0.6, SPR_GAIN = 0.55, LAG_MAX = 7 * DEG, SUB = 8, PRE = 40;
const HEAD_GAP = 0.006, JERSEY_GAP = 0.003, ARM_R = 0.0138 + 0.010;   // the arm's ink tube radius plus a gap
const _ab = new THREE.Vector3(), _av = new THREE.Vector3(), _cp = new THREE.Vector3();
const CORD_TETHER = 0.004, CORD_GAP = 0.006, _t3 = new THREE.Vector3(), _jl = new THREE.Vector3(), _jr = new THREE.Vector3(), _jw = new THREE.Vector3(), _jt = new THREE.Vector3(), _jo = new THREE.Vector3(), _jq = new THREE.Quaternion();

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const Y_AX = new THREE.Vector3(0, 1, 0);
// swing-twist split of q about y (twist applied first, in the head's own frame): q = S * T
function swingTwist(q) {
  const T = new THREE.Quaternion(0, q.y, 0, q.w); if (T.lengthSq() < 1e-12) T.set(0, 0, 0, 1); T.normalize();
  const S = q.clone().multiply(T.clone().invert()); return { S, T };
}

const CREASE = creaseLine(PIECES.hood.geometry, hoodOut()), SEAM = seamOf(CREASE);
// the hood-up garment's elliptic radius at angle th (0 = front) and height y (rest; the hem's shaping left out)
function garmentR(th, y, down = false) {
  if (y > SH_TOP) return 0; const r0 = y < BAND[1] ? RB : shellR(y); return r0 * garmentK(th, y, r0, down ? null : SEAM, down);
}

export function hoodie(S, { down = false } = {}) {
  const root = S.root, torso = S.parts.torso, body = torso.parent, head = S.parts.head.parent;
  torso.visible = false;                                            // the garment is the body's surface now
  const G = new THREE.Group(); G.name = 'hoodie'; root.add(G);
  const gGeo = garmentGeo(down, down ? null : CREASE), garment = keep(solid(gGeo, CLOTH_MAT, INK, down ? gGeo : underHood(gGeo))), inside = keep(new THREE.Mesh(insideGeo(), INSIDE_MAT));
  const lines = lineGeos().map(g => keep(new THREE.Mesh(g, INK_MAT)));
  const H = hoodGeos(), hood = keep(solid(H.g, CLOTH_MAT, INK, H.outer)), rim = keep(new THREE.Mesh(H.rim, INK_MAT));
  // the hood's ink thins toward its skirt's edge and over the flaps at the throat (25 % at the edge): a full-width hull hangs
  // below the edge as a black band and catches the folds there as stray marks; the edge itself is the crease line / the rim
  if (!down) { const hg = hood.children[0].geometry, P = hg.attributes.position, N = hg.attributes.normal, T = hg.attributes.inkT;
    for (let i = 0; i < P.count; i++) { const t = T.getX(i), x = P.getX(i) - t * N.getX(i), y = P.getY(i) - t * N.getY(i), z = P.getZ(i) - t * N.getZ(i), sm = SEAM(Math.atan2(x, z / DEPTH));
      const kf = sstep(1.20, 1.34, y), ks = sm ? 1 - 0.75 * (1 - sstep(sm[0], sm[0] + 0.08, y)) : kf, f = sm ? sm[2] : 0;   // the front flaps (throat) too
      const k = kf + (ks - kf) * f, t2 = t * k;
      P.setXYZ(i, x + t2 * N.getX(i), y + t2 * N.getY(i), z + t2 * N.getZ(i)); T.setX(i, t2); } }
  // the ink hulls stay out of the renderer's depth/normal prepass (engine/look.js): an inflated shell there gives the
  // screen-space AO a false surface 3 cm out, which shows as a blocky pale/dark patch where the skirt lies on the chest
  for (const m of [hood, garment]) m.children[0].userData.noPrepass = true;
  const D = down ? downGeos() : null;
  const downP = D ? [keep(solid(D.pad, CLOTH_MAT, INK, D.padOuter)), keep(solid(D.collar, CLOTH_MAT, INK * 0.8)), keep(new THREE.Mesh(D.edgeLine, INK_MAT)), keep(new THREE.Mesh(D.openLine, INK_MAT)), keep(solid(D.bunch, CLOTH_MAT, INK * 0.8))] : [];
  // the face is a card drawn in front of the head (engine/cast.js FACE_2D) after the opaque pass; where the hood or its rim is
  // the nearest surface they are drawn again over it (same geometry, depth test EQUAL), so a brow or an eye that slides
  // under the hood's brim is covered by it instead of being painted on the fabric
  const overMat = (m => { m.vertexColors = true; m.transparent = true; m.depthWrite = false; m.depthFunc = THREE.EqualDepth; return m; })(mat(GREY));
  const over = (g, m) => { const o = new THREE.Mesh(g, m); o.renderOrder = 3; o.frustumCulled = false; o.userData.noInk = true; o.userData.noPrepass = true; o.userData.over = true; return o; };
  hood.add(over(H.g, overMat)); rim.add(over(H.rim, (m => { m.transparent = true; m.depthWrite = false; m.depthFunc = THREE.LessEqualDepth; m.polygonOffset = true; m.polygonOffsetFactor = -6; m.polygonOffsetUnits = -120;
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(normal) * ${RIM_OVER.toFixed(4)};`); }; m.customProgramCacheKey = () => 'hoodie-rim-over';
    return m; })(INK_MAT.clone()))); rim.children[rim.children.length - 1].renderOrder = 4;   // the rim's pass after the hood's
  const creaseRest = down ? null : CREASE, crease = down ? null : new Strand(creaseRest.length, LINE_R * 1.45, 6, INK_MAT, false);
  if (crease) G.add(crease.mesh);
  if (!down) head.add(cowl());

  const bodyP = [garment, inside, ...lines, ...downP].map(m => ({ m, parts: restOf(m) })), hoodP = (down ? [] : [hood, rim]).map(m => ({ m, parts: restOf(m) }));
  for (const P of [...bodyP, ...hoodP]) G.add(P.m);
  // per part: the ink offset of a hull vertex (its source point on the hood is rest - inkT * normal) and, per source point,
  // whether it lies outside the jersey at rest (only those are kept outside it)
  for (const P of hoodP) for (const q of P.parts) {
    const nv = q.p.length / 3; q.ink = q.g.attributes.inkT ? q.g.attributes.inkT.array.slice() : null; q.outG = new Float32Array(nv);
    for (let i = 0; i < nv; i++) { const t = q.ink ? q.ink[i] : 0, x = q.p[3 * i] - t * (q.n ? q.n[3 * i] : 0), y = q.p[3 * i + 1] - t * (q.n ? q.n[3 * i + 1] : 0), z = q.p[3 * i + 2] - t * (q.n ? q.n[3 * i + 2] : 0);
      const c = Math.hypot(x, z / DEPTH) - garmentR(Math.atan2(x, z / DEPTH), y); q.outG[i] = c >= -0.001 ? Math.min(JERSEY_GAP, Math.max(0, c)) + 1 : 0; }   // 0: inside the jersey at rest (left alone); else 1 + its rest clearance
  }
  const RIM_C0 = (() => { const A = H.rim.attributes.position.array, c = new THREE.Vector3(); for (let i = 0; i < A.length; i += 3) c.x += A[i], c.y += A[i + 1], c.z += A[i + 2]; return c.multiplyScalar(3 / A.length).sub(HOOD_C).normalize(); })();
  // the hood's rest edges, for the stretch numbers
  const hq = (hoodP[0] || { parts: [{ p: new Float32Array(0) }] }).parts[0], E = (() => { const s = new Set(), e = [], I = down ? [] : H.g.index.array, p = hq.p;
    for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) { const k = a < b ? a * 1e5 + b : b * 1e5 + a; if (s.has(k)) continue; s.add(k);
      const r = Math.hypot(p[3 * a] - p[3 * b], p[3 * a + 1] - p[3 * b + 1], p[3 * a + 2] - p[3 * b + 2]); if (r > 1e-5) e.push(a, b, r); }
    return Float64Array.from(e); })();
  // cords: a light strand inside a black back-faced strand (its outline), black aglets at the tips
  const cords = ['cord0', 'cord1'].map(n => { const rest = cordLine(n), body_ = new Strand(24, CORD_R, 8, CORD_MAT), ink = new Strand(24, CORD_R + CORD_INK, 8, INK_BACK, false), ag = new Strand(4, CORD_R * 1.25, 8, INK_MAT);
    for (const s of [body_, ink, ag]) G.add(s.mesh); return { rest, body: body_, ink, ag }; });

  const ST = { t: null };
  const cloth = PHYS.on;
  const pinned = down;   // the hood down rides the chest only
  // the posed frames this frame: chest (rest root metres -> posed root-local, rigid with the top of the spine) and the head
  function frames(joint) {
    const ch = S.chan || {}, B = joint ? spineParams({ bend: ch.bend, side: ch.side, twist: ch.twist }, S.rig?.sq || 0) : spineParams({}, 0);
    body.updateMatrix(); head.updateMatrix();
    const qb = body.quaternion, bp = body.position, top = spineFrame(B, SPINE_L);
    const Mc = new THREE.Matrix4().compose(bp, qb, ONE).multiply(new THREE.Matrix4().compose(top.p.clone().multiplyScalar(W), top.q, ONE)).multiply(new THREE.Matrix4().makeTranslation(0, -PIV_Y, 0));
    const Mh = head.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(0, -HEAD_Y, 0));
    // the head relative to the chest about the neck pivot: rotation q, scale s, residual shift d
    const Rel = Mc.clone().invert().multiply(Mh), t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    Rel.decompose(t, q, s);
    const p0 = new THREE.Vector3(0, PIV_Y, 0), c0 = new THREE.Vector3(0, HEAD_Y, 0);
    // Rel(x) = q (s * x) + t; the hood takes it about the neck pivot: p0 + q (s * (x - c0) + c0 - p0) + d, equal at full weight
    const d = t.clone().add(c0.clone().multiply(s).applyQuaternion(q)).sub(c0.clone().sub(p0).applyQuaternion(q)).sub(p0);
    const { S: Sw, T: Tw } = swingTwist(q);
    const dc = p0.clone().add(c0.clone().sub(p0).applyQuaternion(Sw)).sub(c0).add(d), C = c0.clone().add(dc);   // the head centre's shift, posed centre
    // the upper arms (shoulder to elbow) in the chest frame
    const Mci = Mc.clone().invert(), arms = [];
    for (const sd of ['L', 'R']) { const r = S.rig?.[sd]; if (r?.shoulder && r?.elbow) arms.push([r.shoulder.clone().multiplyScalar(W).applyMatrix4(Mci), r.elbow.clone().multiplyScalar(W).applyMatrix4(Mci)]); }
    const aS = 2 * Math.acos(Math.min(1, Math.abs(Sw.w))), gNod = aS > 1e-4 ? NOD_SAT * Math.tanh(aS / NOD_SAT) / aS : 1;
    return { B, qb, bp, Mc, Mh, q, s, d, Sw, Tw, p0, c0, dc, C, Qi: q.clone().invert(), arms, gNod };
  }
  // one rest point of the hood -> chest-relative posed: twist, scale, swing about the head centre, shift, then the lag
  const _qs = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _I = new THREE.Quaternion(), _l = new THREE.Vector3();
  function skin(F, x, y, z, lag, out, nIn, nOut) {
    const wt = wTwist(y) - TW_THROAT * sstep(1.22, 0.35, Math.abs(Math.atan2(x, z))) * sstep(1.34, 1.15, y), wr = wRot(y) + (1 - wRot(y)) * F.gNod * nodW(y, z), ws = wShift(y), wl = wLag(y);
    _qt.slerpQuaternions(_I, F.Tw, wt); _qs.slerpQuaternions(_I, F.Sw, wr); _q.copy(_qs).multiply(_qt);
    const sx = 1 + (F.s.x - 1) * ws, sy = 1 + (F.s.y - 1) * ws, sz = 1 + (F.s.z - 1) * ws;
    out.set(x * sx, (y - F.c0.y) * sy, z * sz).applyQuaternion(_q).add(F.c0).addScaledVector(F.dc, ws);
    if (nIn) nOut.copy(nIn).applyQuaternion(_q);
    if (lag && wl > 0) { _q2.slerpQuaternions(_I, lag, wl); out.sub(F.C).applyQuaternion(_q2).add(F.C); if (nIn) nOut.applyQuaternion(_q2); }
    return out;
  }
  // keep a posed point (chest frame) off the head (its posed ellipsoid) and, if it was outside the jersey at rest, outside it;
  // returns how deep it was
  function push(F, v, outG) {
    let depth = 0;
    _l.copy(v).sub(F.C).applyQuaternion(F.Qi); const ax = HA_M * F.s.x + HEAD_GAP, ay = HB_M * F.s.y + HEAD_GAP, az = HA_M * F.s.z + HEAD_GAP, k = Math.hypot(_l.x / ax, _l.y / ay, _l.z / az);
    if (k < 1 && k > 1e-6) { depth = _l.length() * (1 / k - 1); _l.multiplyScalar(1 / k).applyQuaternion(F.q).add(F.C); v.copy(_l); }
    // the upper arms leave the body under the hood's flaps: the flaps lie over them (pushed off each upper arm's capsule)
    if (outG && F.arms) for (const [a, b] of F.arms) { _ab.subVectors(b, a); const u = Math.max(0, Math.min(1, _av.subVectors(v, a).dot(_ab) / _ab.lengthSq())); _cp.copy(a).addScaledVector(_ab, u);
      const d = v.distanceTo(_cp); if (d < ARM_R && d > 1e-6) { depth = Math.max(depth, ARM_R - d); v.sub(_cp).multiplyScalar(ARM_R / d).add(_cp); } }
    if (outG && v.y < SH_TOP && v.y > 0.95) { const r = Math.hypot(v.x, v.z / DEPTH), g = garmentR(Math.atan2(v.x, v.z / DEPTH), v.y) + (outG - 1);
      if (r < g && r > 1e-4) { depth = Math.max(depth, (g - r) * 0.9); v.x *= g / r; v.z *= g / r; } }
    return depth;
  }
  const _s0 = new THREE.Vector3(), _s1 = new THREE.Vector3(), _nn = new THREE.Vector3();
  // a rest vertex of a hood part, posed and pushed (a hull vertex moves by its source point's push)
  function poseVert(F, q, i, lag, out, nOut) {
    const x = q.p[3 * i], y = q.p[3 * i + 1], z = q.p[3 * i + 2];
    if (q.n) _nn.set(q.n[3 * i], q.n[3 * i + 1], q.n[3 * i + 2]);
    if (pinned) { out.set(x, y, z); if (q.n) nOut.copy(_nn); return 0; }
    skin(F, x, y, z, lag, out, q.n ? _nn : null, nOut);
    const t = q.ink ? q.ink[i] : 0;
    if (!t) return push(F, out, q.outG[i]);
    skin(F, x - t * _nn.x, y - t * _nn.y, z - t * _nn.z, lag, _s0); _s1.copy(_s0); const dp = push(F, _s1, q.outG[i]); out.add(_s1.sub(_s0)); return dp;
  }

  // ---- per frame, after the figure is posed
  function update(Q = {}, joint) {
    const F = frames(joint); ST.F = F;
    const warp = (x, y, z, out, nx, ny, nz, nout) => {
      out.set(x / W, y / W - HIP_V, z / W); if (nout) nout.set(nx, ny, nz);
      bendPt(F.B, out, nout || null); out.multiplyScalar(W).applyQuaternion(F.qb).add(F.bp); if (nout) nout.applyQuaternion(F.qb);
    };
    for (const P of bodyP) for (const q of P.parts) {
      const A = q.g.attributes.position, N = q.g.attributes.normal;
      for (let i = 0; i < A.count; i++) { warp(q.p[3 * i], q.p[3 * i + 1], q.p[3 * i + 2], _v, q.n ? q.n[3 * i] : 0, q.n ? q.n[3 * i + 1] : 1, q.n ? q.n[3 * i + 2] : 0, _n); A.setXYZ(i, _v.x, _v.y, _v.z); if (N) { _n.normalize(); N.setXYZ(i, _n.x, _n.y, _n.z); } }
      A.needsUpdate = true; if (N) N.needsUpdate = true; q.g.computeBoundingSphere();
    }
    root.updateMatrixWorld(true); ST.RW = root.matrixWorld.clone(); ST.vols = S.vols || []; ST.rig = S.rig;
    drawHood(ST.lag || null);
    if (!cloth || ST.t == null) restCords();
  }
  // the hood's render meshes from the frames and the current lag (a quaternion in the chest frame about the head centre)
  function drawHood(lag) {
    const F = ST.F; if (!F) return;
    const Mc = F.Mc, nM = new THREE.Matrix3().getNormalMatrix(Mc), nO = new THREE.Vector3(); let corr = 0;
    for (const P of hoodP) for (const q of P.parts) {
      const A = q.g.attributes.position, N = q.g.attributes.normal;
      for (let i = 0; i < A.count; i++) {
        const dp = poseVert(F, q, i, lag, _v, nO); if (!q.ink && P.m === hood) corr = Math.max(corr, dp);
        _v.applyMatrix4(Mc); A.setXYZ(i, _v.x, _v.y, _v.z);
        if (N && q.n) { nO.applyMatrix3(nM).normalize(); N.setXYZ(i, nO.x, nO.y, nO.z); }
      }
      A.needsUpdate = true; if (N) N.needsUpdate = true; q.g.computeBoundingSphere();
    }
    ST.corr = corr;
    if (crease) { const n = creaseRest.length; crease.set(creaseRest.map(([x, y, z]) => { const v = skin(F, x, y, z, lag, new THREE.Vector3()); push(F, v, 1 + JERSEY_GAP); return v.applyMatrix4(Mc); }), i => crease.r * Math.min(1, 0.1 + 0.9 * Math.min(i, n - 1 - i) / 6)); }
  }
  // a cord's anchor (its rest top) on the posed hood, root-local, kept outside the jersey: the push-out works in the chest's
  // frame, which in a deep bend sits a few cm off the garment's own bend 13 cm below the top of the spine, so the anchor is
  // checked against the jersey as drawn too (jerseyDepth)
  function anchor(c) { const F = ST.F, [x, y, z] = c.rest[0]; if (pinned) return _a.set(x, y, z).applyMatrix4(F.Mc).clone(); const v = skin(F, x, y, z, ST.lag || null, new THREE.Vector3()); push(F, v, 1 + CORD_R + CORD_GAP); v.applyMatrix4(F.Mc);
    return jerseyDepth(v, CORD_R + CORD_GAP) > 0 ? v.copy(_jo) : v; }
  // the cords at rest: hanging as modelled from the posed anchor, turned with the chest
  function restCords() {
    const F = ST.F, qc = new THREE.Quaternion(); F.Mc.decompose(_a, qc, _b);
    for (const c of cords) { const A = anchor(c), pts = c.rest.map(p => new THREE.Vector3(p[0] - c.rest[0][0], p[1] - c.rest[0][1], p[2] - c.rest[0][2]).applyQuaternion(qc).add(A)); drawCord(c, pts); }
  }
  function drawCord(c, pts) {
    const sm = c.sm = smoothPts(pts, 24); c.body.set(sm); c.ink.set(sm);
    const e = sm[23], d = _b.subVectors(sm[23], sm[21]).normalize(); c.ag.set([0, 1, 2, 3].map(k => e.clone().addScaledVector(d, -0.016 + k * 0.0055)));
  }
  const p1 = S.pose, p2 = S.pose2;
  S.pose = (P = {}) => { const r = p1(P); update(P, false); return r; };
  S.pose2 = (Q = {}) => { const r = p2(Q); update(Q, true); return r; };
  if (cloth) { const f0 = S.face; S.face = (P = {}) => { const r = f0(P); step(P.t); return r; }; }
  S.hoodie = ST;
  return G;

  // ---------------------------------------------------------------- PHYS.on: the follow-through spring and the cords
  function step(t) {
    if (!ST.F || t === ST.t) return;
    const F = ST.F, RW = ST.RW, RWi = RW.clone().invert(), fresh = ST.t == null || t !== ST.t + 1;
    // the peak's posed place (world) and the head centre (world), without lag
    const tgt = skin(F, PEAK.x, PEAK.y, PEAK.z, null, new THREE.Vector3()).applyMatrix4(F.Mc).applyMatrix4(RW);
    // cords: chains from the posed anchors, colliding with the body's volumes (+ the jersey) and the arm bones
    if (!ST.chains) ST.chains = cords.map(c => { const pts = c.rest, Ed = [], Bd = [];
      for (let k = 0; k + 1 < CORD_N; k++) Ed.push([k, k + 1, Math.hypot(...[0, 1, 2].map(j => pts[k + 1][j] - pts[k][j]))]);
      for (let k = 0; k + 2 < CORD_N; k++) Bd.push([k, k + 2, Math.hypot(...[0, 1, 2].map(j => pts[k + 2][j] - pts[k][j]))]);
      const pin = new Uint8Array(CORD_N); pin[0] = 1; return new Cloth(CORD_N, Ed, Bd, pin, { bend: 0.12, damp: 0.05, iters: 10, margin: 0.0275, tether: CORD_TETHER }); });
    // the head's volume, and the jersey itself (the garment's own surface: the torso's volumes lie under it, so a cord kept
    // off them alone floats in front of the jersey in one place and sinks into it in another)
    const cols = ST.vols.filter(V => V.kind === 'head').map(V => p => { const l = p.clone().applyMatrix4(RWi).divideScalar(W), s = V.push(l, 0.012 / W); return s ? s.multiplyScalar(W).applyMatrix4(RW) : null; });
    cols.push(p => { const l = p.clone().applyMatrix4(RWi), d = jerseyDepth(l, CORD_R + CORD_GAP); if (d <= 0) return null; return l.copy(_jo).applyMatrix4(RW); });
    const caps = []; for (const sd of ['L', 'R']) { const r = ST.rig?.[sd]; if (!r?.shoulder) continue; const P3 = q => q.clone().multiplyScalar(W).applyMatrix4(RW); caps.push([P3(r.shoulder.clone().lerp(r.elbow, 0.45)), P3(r.elbow), 0.0138], [P3(r.elbow), P3(r.hand), 0.0138]); }   // the upper arm from where it leaves the body
    const anc = cords.map(c => anchor(c).applyMatrix4(RW));
    if (fresh) {
      ST.P = tgt.clone(); ST.V = new THREE.Vector3(); ST.tgtPrev = tgt.clone(); ST.ancPrev = anc.map(a => a.clone());
      const qc = new THREE.Quaternion(); F.Mc.clone().premultiply(RW).decompose(_a, qc, _b);
      ST.chains.forEach((ch, i) => { const c = cords[i]; for (let j = 0; j < CORD_N; j++) ch.set(j, new THREE.Vector3(c.rest[j][0] - c.rest[0][0], c.rest[j][1] - c.rest[0][1], c.rest[j][2] - c.rest[0][2]).applyQuaternion(qc).add(anc[i]).toArray()); });
    }
    const w = 2 * Math.PI * SPR_F, k = w * w, cdamp = 2 * SPR_Z * w, dt = 1 / (30 * SUB), qcW = new THREE.Quaternion();
    // the cords' soft tether: each point is drawn a little toward where it hangs at rest below its anchor, turned with the
    // chest's heading only (gravity keeps its direction when the body leans), so a cord swings after a fast turn and settles
    // back to hanging instead of lying along the path its anchor travelled
    { F.Mc.clone().premultiply(RW).decompose(_a, qcW, _b); const f = new THREE.Vector3(0, 0, 1).applyQuaternion(qcW); qcW.setFromAxisAngle(Y_AX, Math.atan2(f.x, f.z)); }
    const runs = fresh ? PRE : 1;
    for (let f = 0; f < runs; f++) for (let s = 0; s < SUB; s++) {
      const u = fresh ? 1 : (s + 1) / SUB, T = _a.lerpVectors(ST.tgtPrev, tgt, u);
      // the peak: semi-implicit Euler on a damped spring to its posed place
      ST.V.addScaledVector(_b.subVectors(T, ST.P).multiplyScalar(k).addScaledVector(ST.V, -cdamp), dt); ST.P.addScaledVector(ST.V, dt);
      ST.chains.forEach((ch, i) => { const A = new THREE.Vector3().lerpVectors(ST.ancPrev[i], anc[i], u), c = cords[i], tg = c.rest.map((r, j) => j ? _t3.set(r[0] - c.rest[0][0], r[1] - c.rest[0][1], r[2] - c.rest[0][2]).applyQuaternion(qcW).add(A).toArray() : A.toArray());
        ch.sub(dt, j => tg[j], cols, caps); leash(ch); });
    }
    ST.tgtPrev = tgt.clone(); ST.ancPrev = anc.map(a => a.clone()); ST.t = t;
    // the lag: the turn that carries the posed peak onto the sprung one, about the head centre, in the chest frame (scaled, soft-clamped)
    const C = F.C, McW = F.Mc.clone().premultiply(RW), McWi = McW.clone().invert();
    const a = tgt.clone().applyMatrix4(McWi).sub(C).normalize(), b = ST.P.clone().applyMatrix4(McWi).sub(C).normalize();
    const lag = new THREE.Quaternion().setFromUnitVectors(a, b), ang = 2 * Math.acos(Math.min(1, Math.abs(lag.w)));
    const want = LAG_MAX * Math.tanh(SPR_GAIN * ang / LAG_MAX);
    ST.lag = ang > 1e-5 ? new THREE.Quaternion().slerpQuaternions(_I, lag, want / ang) : null;
    drawHood(ST.lag);
    ST.chains.forEach((ch, i) => { const pts = []; for (let j = 0; j < CORD_N; j++) pts.push(new THREE.Vector3(ch.x[3 * j], ch.x[3 * j + 1], ch.x[3 * j + 2]).applyMatrix4(RWi)); drawCord(cords[i], pts); });
    if (!down && /hoodstats/.test(globalThis.location?.search || '')) console.error('HOODIE ' + JSON.stringify(stats(t, want, fresh)));
  }
  // how deep a root-local point is inside the jersey grown by `grow` (m; <= 0 outside). _jo is set to the point moved out
  // onto that surface (along the garment's elliptic radius at its rest height). The garment's warp (engine/cast.js bendPt:
  // the spine's twist, bend and squash) carries a rest point to the spine's frame at its height plus its offset in that
  // frame, so it is undone by finding the height whose frame's plane holds the point (a few Newton steps along the spine).
  function jerseyDepth(l, grow) {
    const F = ST.F, B = F.B; _jl.copy(l).sub(F.bp).applyQuaternion(_jq.copy(F.qb).invert()).divideScalar(W);
    let yr = _jl.y / B.s, fr = null;
    for (let k = 0; k < 6; k++) { fr = spineFrame(B, yr); _jt.copy(_jl).sub(fr.p); const dy = _jt.dot(_jw.copy(Y_AX).applyQuaternion(fr.q)) / B.s; yr += dy; if (Math.abs(dy) < 1e-5) break; }
    fr = spineFrame(B, yr); _jr.copy(_jl).sub(fr.p).applyQuaternion(fr.q.invert()).multiplyScalar(Math.sqrt(B.s));
    const x = _jr.x * W, y = (yr + HIP_V) * W, z = _jr.z * W;
    if (y > SH_TOP - 0.01 || y < BAND[0]) return -Infinity;   // above the shoulders or below the hem: no jersey there
    const th = Math.atan2(x, z / DEPTH), r = Math.hypot(x, z / DEPTH), g = (y < BAND[1] ? RB : shellR(y)) * (down ? 1 : tuck(y)) + grow;   // the jersey as drawn, less the seam under the hood's skirt (a shelf a cord must not catch on)
    if (r < 1e-4 || r >= g) return g - r;
    _jw.set(x * g / r / W, y / W - HIP_V, z * g / r / W); bendPt(F.B, _jw); _jo.copy(_jw).multiplyScalar(W).applyQuaternion(F.qb).add(F.bp);
    return g - r;
  }
  // a cord does not stretch: follow-the-leader from the anchor down (each point at most its rest length from the one above;
  // its previous position moves with it, so the correction adds no speed)
  function leash(ch) {
    const x = ch.x, p = ch.p;
    for (const [i, j, r] of ch.edges) { const dx = x[3 * j] - x[3 * i], dy = x[3 * j + 1] - x[3 * i + 1], dz = x[3 * j + 2] - x[3 * i + 2], l = Math.hypot(dx, dy, dz);
      if (l > r) { const k = r / l - 1; for (const [c, d] of [[0, dx], [1, dy], [2, dz]]) { x[3 * j + c] += d * k; p[3 * j + c] += d * k; } } }
  }
  // numbers: the hood's deepest vertex inside a body volume (m), its edges' stretch (p99, max), the peak's lag (deg) and
  // its motion relative to the posed peak (m/frame), the cords' stretch
  function stats(t, lagA, fresh) {
    const RWi = ST.RW.clone().invert(), A = hq.g.attributes.position.array; let pen = 0, penAt = -1;
    for (let i = 0; i < A.length / 3; i++) { if (H.out[i]) continue; _v.set(A[3 * i], A[3 * i + 1], A[3 * i + 2]).divideScalar(W);
      for (const V of ST.vols) { const h = V.test(_v, 0); if (h && h.depth * W > pen) { pen = h.depth * W; penAt = i; } } }
    const st = [], so = []; for (let e = 0; e < E.length; e += 3) { const a = E[e], b = E[e + 1]; if (H.out[a] && H.out[b]) so.push(Math.hypot(A[3 * a] - A[3 * b], A[3 * a + 1] - A[3 * b + 1], A[3 * a + 2] - A[3 * b + 2]) / E[e + 2] - 1); st.push(Math.hypot(A[3 * a] - A[3 * b], A[3 * a + 1] - A[3 * b + 1], A[3 * a + 2] - A[3 * b + 2]) / E[e + 2] - 1); }
    let wi = 0; for (let e = 0; e < st.length; e++) if (st[e] > st[wi]) wi = e; const wy = +hq.p[3 * E[3 * wi] + 1].toFixed(3), wz = +hq.p[3 * E[3 * wi] + 2].toFixed(3); st.sort((x, y) => x - y);
    const rel = ST.P.clone().sub(ST.tgtPrev), move = ST.relPrev && !fresh ? rel.distanceTo(ST.relPrev) : 0; ST.relPrev = rel;
    // the cords as drawn (the smoothed tube's centreline, root-local): cordPen, how deep the tube's surface goes into the jersey
    // (m); cordBody, into a body.js volume (head, torso slices); cordFly, how far the lower two thirds of a cord stand off the jersey (m: a cord that hangs lies on it)
    let cordPen = 0, cordFly = 0, cordBody = 0; const cordPenD = [0, -1, 0];
    for (const c of cords) c.sm.forEach((q, j) => { const d = jerseyDepth(q, CORD_R); cordPen = Math.max(cordPen, d); if (j >= 8 && d > -Infinity) cordFly = Math.max(cordFly, -d); if (d > cordPenD[0]) cordPenD.splice(0, 3, d, j, +q.y.toFixed(3));
      _v.copy(q).divideScalar(W); for (const V of ST.vols) { const h = V.test(_v, CORD_R / W); if (h) cordBody = Math.max(cordBody, h.depth * W); } });
    const cs = ST.chains.map(ch => ch.stretch());
    // cordV: the fastest point of a cord against its anchor this frame (m/frame; under 0.002 in a hold = settled, no jitter)
    let cordV = 0; for (const c of cords) { const a0 = c.sm[0], rel = c.sm.map(q => q.clone().sub(a0)); if (c.relPrev && !fresh) rel.forEach((q, j) => { cordV = Math.max(cordV, q.distanceTo(c.relPrev[j])); }); c.relPrev = rel; }
    // the face opening against the face: the angle (deg) between where the rim's centre sits round the head centre and where
    // it sat at rest turned with the head (0: the opening frames the face as at rest)
    const RA = rim.geometry.attributes.position.array, rc = new THREE.Vector3(); for (let i = 0; i < RA.length; i += 3) rc.x += RA[i], rc.y += RA[i + 1], rc.z += RA[i + 2];
    rc.multiplyScalar(3 / RA.length).applyMatrix4(ST.F.Mc.clone().invert()).sub(ST.F.C).normalize();
    const rimOff = rc.angleTo(RIM_C0.clone().applyQuaternion(ST.F.q)) / DEG;
    return { t, rimOff: +rimOff.toFixed(2), pen: +pen.toFixed(4), penAt: penAt >= 0 ? +hq.p[3 * penAt + 1].toFixed(3) : null, p99: +st[Math.floor(0.99 * (st.length - 1))].toFixed(4), max: +st[st.length - 1].toFixed(4), min: +st[0].toFixed(4), outP99: +(so.sort((x, y) => x - y), so[Math.floor(0.99 * (so.length - 1))]).toFixed(4), outMax: +so[so.length - 1].toFixed(4), worst: [wy, wz, H.out[E[3 * wi]]],
      lag: +(lagA / DEG).toFixed(2), sw: +(2 * Math.acos(Math.min(1, Math.abs(ST.F.Sw.w))) / DEG).toFixed(1), tw: +(2 * Math.acos(Math.min(1, Math.abs(ST.F.Tw.w))) / DEG).toFixed(1), d: +ST.F.d.length().toFixed(4), corr: +(ST.corr || 0).toFixed(4), move: +move.toFixed(4), cord: +Math.max(...cs).toFixed(4), cordPen: +cordPen.toFixed(4), cordFly: +cordFly.toFixed(4), cordBody: +cordBody.toFixed(4), cordPenAt: cordPenD.slice(1), cordV: +cordV.toFixed(4) };
  }
}

// the costume item 'hoodie:<colour>[:down]' (grey is the only colour today)
const prev = HOOKS.costume;
HOOKS.costume = (S, list, o) => {
  const mine = list.filter(x => String(x).startsWith('hoodie')), rest = list.filter(x => !String(x).startsWith('hoodie'));
  if (rest.length && prev) prev(S, rest, o);
  for (const it of mine) hoodie(S, { down: String(it).split(':')[2] === 'down' });
};
