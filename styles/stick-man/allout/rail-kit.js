// Rail kit: shared builders for the railroad-canyon sets (canyon-edge).
// Blender metres (x right, y into the set, z up), allout look: physically lit, bevelled, never inked.
//   track(K, o)            ties, steel rails with a real profile, tie plates + spikes, joint bars + bolts, instanced ballast
//   loco(K, o)             a 4-4-0 American steam locomotive + tender; { group, drive(m), lamp(k), funnel }
//   coach(K, o)            a wooden passenger coach (planks, arched windows, clerestory, gold lettering, bogies)
//   canyonWall(K, o)       a tall layered sandstone wall (strata texture, ledges, overhang, broken top, faceted)
//   mesa(K, o)             a stepped mesa on the horizon
//   sky(K, o)              blue dome with soft fluffy clouds that rides the camera
//   atmos(K, root, o)      aerial haze + canyon-depth haze on every set material, and the depth squash that lets the
//                          sets reach kilometres past the stage camera's 80 m far plane (see the note at atmos)
//   heatMat / bendable     the rail glow ramp (magenta -> hot pink -> yellow-white) and the track buckle (a sideways snake)
//   collideFromMeshes(COLLIDE, root, o)  one Blender box per standing mesh, measured from the real meshes
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tex, rng, col, label, B } from './kit.js';

export const GAUGE = 1.435, RAIL_X = GAUGE / 2, RAIL_H = 0.115, TIE_TOP = 0.04, PLATE = 0.012;
export const RAIL_TOP = TIE_TOP + PLATE + RAIL_H;                  // 0.167: the rail head top over the ground

// ---------------------------------------------------------------- noise
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967295; }
export function vnoise(x, y, s = 1) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s = 1, o = 4) { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; } return t / n; }

// ---------------------------------------------------------------- shader patches (one onBeforeCompile per material)
// Shared per-set uniforms (atmos) + per-material ones (heat, bend). Every patched material computes its world position
// itself, so the haze, the glow and the buckle work on instanced meshes too.
const SHARED = new WeakMap();
function patch(m, U) {
  if (m.userData.rkPatched) return; m.userData.rkPatched = true;
  const heat = m.userData.rkHeat, bend = m.userData.rkBend, deep = !m.userData.rkNoDeep, haze = !m.userData.rkNoHaze;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, { rkDeepA: U.deepA, rkDeepS: U.deepS, rkDeepL: U.deepL, rkHaze: U.haze, rkHazeCol: U.hazeCol, rkDeep: U.deep, rkDeepCol: U.deepCol, rkSunHaze: U.sunHaze, rkSunDir: U.sunDir });
    if (heat) Object.assign(sh.uniforms, { rkHeat: heat.heat, rkHeatY: heat.y, rkHeatSpread: heat.spread, rkHeatK: heat.k });
    if (bend) Object.assign(sh.uniforms, { rkBendAmp: bend.amp, rkBendC: bend.c, rkBendL: bend.L });
    const defs = `${heat ? '#define RK_HEAT\n' : ''}${bend ? '#define RK_BEND\n' : ''}${deep ? '#define RK_DEEP\n' : ''}${haze ? '#define RK_HAZE\n' : ''}`;
    sh.vertexShader = defs + `varying vec3 vRkW; varying vec3 vRkL; varying vec3 vRkP;
uniform float rkDeepA, rkDeepS, rkDeepL;
#ifdef RK_BEND
uniform float rkBendAmp, rkBendC, rkBendL;
float rkSnake(float y) { float s = (y - rkBendC) / rkBendL; if (abs(s) > 0.5) return 0.0; float w = 1.0 - 4.0 * s * s; return rkBendAmp * sin(6.2831853 * 1.5 * s) * w * w; }
#endif
` + sh.vertexShader.replace('#include <project_vertex>', `
vec4 mvPosition = vec4( transformed, 1.0 );
vRkP = transformed;
#ifdef USE_BATCHING
mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
#endif
#ifdef RK_BEND
mvPosition.x += rkSnake(-mvPosition.z);
#endif
vRkL = vec3(mvPosition.x, -mvPosition.z, mvPosition.y);
vec4 rkWp = modelMatrix * mvPosition; vRkW = rkWp.xyz;
mvPosition = viewMatrix * rkWp;
gl_Position = projectionMatrix * mvPosition;
#ifdef RK_DEEP
{ float dd = length(mvPosition.xyz); if (dd > rkDeepA) { float x = dd - rkDeepA; float nd = rkDeepA + rkDeepS * x / (x + rkDeepL); gl_Position = projectionMatrix * vec4(mvPosition.xyz * (nd / dd), 1.0); } }
#endif
`);
    sh.fragmentShader = defs + `varying vec3 vRkW; varying vec3 vRkL; varying vec3 vRkP;
uniform vec3 rkHaze, rkHazeCol, rkDeep, rkDeepCol, rkSunDir; uniform vec4 rkSunHaze;
#ifdef RK_HEAT
uniform float rkHeat, rkHeatY, rkHeatSpread, rkHeatK;
vec3 rkRamp(float t) { vec3 a = vec3(0.42, 0.0, 0.85), b = vec3(1.0, 0.04, 0.62), c = vec3(1.0, 0.62, 0.04), d = vec3(1.0, 0.92, 0.45);
  return t < 0.4 ? mix(a, b, t / 0.4) : t < 0.8 ? mix(b, c, (t - 0.4) / 0.4) : mix(c, d, (t - 0.8) / 0.2); }
#endif
` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
#ifdef RK_HEAT
{ float d = abs(vRkL.y - rkHeatY); float f = clamp(1.0 - d / max(rkHeatSpread, 0.001), 0.0, 1.0); float t = rkHeat * (0.35 + 0.65 * f) * smoothstep(0.0, 0.25, f);
  float web = (vRkP.y > 0.024 && vRkP.y < 0.07) ? 0.25 : 1.0;
  float on = smoothstep(0.02, 0.2, t); totalEmissiveRadiance += rkRamp(clamp(t, 0.0, 1.0)) * on * rkHeatK * web; diffuseColor.rgb *= 1.0 - 0.75 * on * web; }
#endif`)
      .replace('#include <fog_fragment>', `#ifdef RK_HAZE
{ vec3 dv = vRkW - cameraPosition; float hd = length(dv);
  float k = (1.0 - exp(-max(hd - rkHaze.x, 0.0) / rkHaze.y)) * rkHaze.z;
  float below = clamp((rkDeep.x - vRkW.y) / rkDeep.y, 0.0, 1.0); below = below * below * (3.0 - 2.0 * below);
  float sunk = pow(max(dot(normalize(dv), rkSunDir), 0.0), 8.0) * rkSunHaze.w * k;
  vec3 hz = mix(mix(rkHazeCol, rkDeepCol, below), rkSunHaze.rgb, sunk);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, hz, clamp(max(k, below * rkDeep.z), 0.0, 1.0)); }
#endif
#include <fog_fragment>`);
  };
  const key0 = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => (key0 ? key0() : '') + `|rk${heat ? 'H' : ''}${bend ? 'B' : ''}${deep ? 'D' : ''}${haze ? 'Z' : ''}`;
  m.needsUpdate = true;
}

// atmos: the set's air. Call at the end of build(): every mesh material under root gets
//  haze  { color, near, dist, max }  aerial perspective: colour = mix(colour, haze, (1 - exp(-(d - near) / dist)) * max)
//  deep  { z, depth, color, max }   below z (Blender) the world sinks into `color` over `depth` metres (the canyon floor
//                                   nobody has seen)
//  sun   { color, k, pow }           the haze brightens toward the sun (warm glow round the sun direction)
// The depth squash: the stage camera's far plane is 80 m (engine/look.js). Every vertex past `squash.from` metres is
// pulled along its own ray into [from, from + span] (order kept, screen position exact), so canyons, mesas and the
// vanishing point of a 500 m track still draw; lighting, shadows and the haze use the true positions. Long triangles
// are tessellated by the builders (a wall column is <= 4 m) so the squash never bends a surface visibly.
// Frustum culling is off for these meshes (their true bounds lie past the far plane).
export function atmos(K, root, { haze = {}, deep = {}, sun = {}, squash = {} } = {}) {
  let U = SHARED.get(root);
  if (!U) { U = { deepA: { value: 0 }, deepS: { value: 0 }, deepL: { value: 0 }, haze: { value: new THREE.Vector3() }, hazeCol: { value: new THREE.Color() },
    deep: { value: new THREE.Vector3() }, deepCol: { value: new THREE.Color() }, sunHaze: { value: new THREE.Vector4() }, sunDir: { value: new THREE.Vector3(0, -1, 0) } }; SHARED.set(root, U); }
  U.deepA.value = squash.from ?? 62; U.deepS.value = squash.span ?? 17.5; U.deepL.value = squash.L ?? 160;
  U.haze.value.set(haze.near ?? 15, haze.dist ?? 260, haze.max ?? 0.85); U.hazeCol.value.copy(col(haze.color ?? '#cbc4cc'));
  U.deep.value.set((deep.z ?? -30), deep.depth ?? 120, deep.max ?? 0.97); U.deepCol.value.copy(col(deep.color ?? '#2c3790'));
  { const c = col(sun.color ?? '#fff1d8'); U.sunHaze.value.set(c.r, c.g, c.b, sun.k ?? 0.35); }
  if (sun.dir) U.sunDir.value.copy(B(...sun.dir).normalize().negate());
  root.traverse(o => { if (!o.isMesh || o.userData.rkSkip) return; o.frustumCulled = false;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && !m.userData.rkSkip) patch(m, U); });
  return U;
}

// the heat glow: a material whose emissive ramps along local y round `y` (spread metres); keys heat 0..1
export function heatMat(K, base, { y = 0, spread = 1.5, k = 1.7 } = {}) {
  const m = base.clone(); m.userData = { ...base.userData };
  m.userData.rkHeat = { heat: { value: 0 }, y: { value: y }, spread: { value: spread }, k: { value: k } };
  return m;
}
// the buckle: a sideways snake of `amp` metres over L metres round local y = c (applied in the track's own frame)
export function bendable(m, B0 = null) { m.userData.rkBend = B0 || { amp: { value: 0 }, c: { value: 0 }, L: { value: 25 } }; return m.userData.rkBend; }

// ---------------------------------------------------------------- instancing and baking
// list: [{ p: [x, y, z], s: n | [sx, sy, sz], r: [rx, ry, rz] (deg, Blender axes), c: colour, m: Matrix4 (overrides p/s/r) }]
const _zAxis = new THREE.Vector3(0, 0, 1), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function itemMatrix(it, out = new THREE.Matrix4()) {
  if (it.m) return out.copy(it.m);
  const r = it.r || [0, 0, 0], s = it.s ?? 1, sv = Array.isArray(s) ? s : [s, s, s];
  _e.set(r[0] * Math.PI / 180, r[2] * Math.PI / 180, -r[1] * Math.PI / 180, 'YXZ'); _q.setFromEuler(_e);
  _p.copy(B(...it.p)); _s.set(sv[0], sv[2], sv[1]); return out.compose(_p, _q, _s);
}
// instanced: one draw call, for thousands of small floor pieces (stones). The engine's ink prepass ignores
// instanceMatrix, so these never enter it (noPrepass): use bake() for anything the depth pass must see.
export function instanced(K, geo, mat, list, { parent = K.root, cast = false, recv = true, colors = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => { im.setMatrixAt(i, itemMatrix(it, _m)); if (colors && it.c != null) im.setColorAt(i, col(it.c)); });
  im.count = list.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.frustumCulled = false; im.userData.noPrepass = true; K.add(im, parent, { cast, recv }); im.castShadow = cast; return im;
}
// bake: the same geometry many times into one plain BufferGeometry (positions, normals, uvs, optional per-item colour);
// items keep their order, so geometry.setDrawRange(0, k * per) shows the first k (per = index count of one item)
export function bake(geo, list, { colors = false } = {}) {
  const g0 = geo.index ? geo : geo, P = g0.attributes.position, N = g0.attributes.normal, UV = g0.attributes.uv, C = g0.attributes.color, I = g0.index;
  const nv = P.count, ni = I ? I.count : nv, n = list.length;
  const pos = new Float32Array(n * nv * 3), nor = new Float32Array(n * nv * 3), uv = UV ? new Float32Array(n * nv * 2) : null, cl = (colors || C) ? new Float32Array(n * nv * 3) : null, idx = new Uint32Array(n * ni);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), m = new THREE.Matrix4(), c = new THREE.Color();
  list.forEach((it, k) => { itemMatrix(it, m); nm.getNormalMatrix(m); if (it.c != null) c.copy(col(it.c)); else c.setRGB(1, 1, 1);
    for (let i = 0; i < nv; i++) { const o = (k * nv + i) * 3; v.fromBufferAttribute(P, i).applyMatrix4(m); pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o] = v.x; nor[o + 1] = v.y; nor[o + 2] = v.z; }
      if (uv) { uv[(k * nv + i) * 2] = UV.getX(i); uv[(k * nv + i) * 2 + 1] = UV.getY(i); }
      if (cl) { const cr = C ? C.getX(i) : 1, cg = C ? C.getY(i) : 1, cb = C ? C.getZ(i) : 1; cl[o] = cr * c.r; cl[o + 1] = cg * c.g; cl[o + 2] = cb * c.b; } }
    for (let i = 0; i < ni; i++) idx[k * ni + i] = k * nv + (I ? I.getX(i) : i); });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); if (cl) out.setAttribute('color', new THREE.BufferAttribute(cl, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.userData.per = ni; return out;
}
export function merged(K, geo, mat, list, { parent = K.root, cast = true, recv = true, colors = false } = {}) {
  if (!list.length) return null;
  const g = bake(geo, list, { colors }); if (g.attributes.color) { mat.vertexColors = true; }
  const x = new THREE.Mesh(g, mat); K.add(x, parent, { cast, recv }); x.userData.per = g.userData.per; x.userData.items = list.length; return x;
}
// show the first n items of a baked mesh (or an instanced one)
export function showFirst(mesh, n) { if (mesh.isInstancedMesh) mesh.count = n; else mesh.geometry.setDrawRange(0, n * mesh.userData.per); }
const upper = (ys, v) => { let lo = 0, hi = ys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ys[m] <= v) lo = m + 1; else hi = m; } return lo; };
// a member (beam, strut, wire) between two Blender points as an item matrix: a unit box along its length, w x h thick
export function beamMatrix(a, b, w = 0.1, h = w, roll = 0) {
  const A = B(...a), Bv = B(...b), d = Bv.clone().sub(A), L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), d.clone().normalize());
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), roll));
  return new THREE.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(w, h, L));
}
export const unitBox = (r = 0) => r > 0 ? new RoundedBoxGeometry(1, 1, 1, 2, r) : new THREE.BoxGeometry(1, 1, 1);

// ---------------------------------------------------------------- surfaces
export const RSURF = {
  // weathered tie wood: grey-tan with grain, cracks and darker ends
  tie: (seed = 3) => tex(256, 128, (g, w, h) => { const r = rng(seed); g.fillStyle = '#a89078'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${r() > 0.5 ? '60,42,30' : '235,220,200'},${0.08 + 0.12 * r()})`; g.lineWidth = 1 + 2 * r(); const y = r() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6 * (r() - 0.5), w * 0.7, y + 6 * (r() - 0.5), w, y + 4 * (r() - 0.5)); g.stroke(); }
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(40,28,20,0.45)'; g.lineWidth = 1.5; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + 40 * r(), y + 4 * (r() - 0.5)); g.stroke(); }
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(50,35,25,0.35)'); gr.addColorStop(0.08, 'rgba(0,0,0,0)'); gr.addColorStop(0.92, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(50,35,25,0.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  // ballast bed seen from afar: a carpet of red, cream and grey pebbles
  ballast: (seed = 4) => tex(512, 512, (g, w, h) => { const r = rng(seed); g.fillStyle = '#7a5a50'; g.fillRect(0, 0, w, h);
    const P = ['#8a5244', '#a8634c', '#d9c4a6', '#a29c96', '#7c8494', '#6a4a40', '#c08878', '#e2d2b8', '#b8aca2'];
    for (let i = 0; i < 2600; i++) { const x = r() * w, y = r() * h, s = 3 + 6 * r(); g.fillStyle = P[Math.floor(r() * P.length)]; g.beginPath(); g.ellipse(x, y, s, s * (0.6 + 0.4 * r()), r() * 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.3, s * 0.45, s * 0.3, 0, 0, 7); g.fill(); } }, { repeat: [1, 1] }),
  // orange desert sand with soft blotches and a few pebbles
  sand: (base = '#d4803f', seed = 5) => tex(512, 512, (g, w, h) => { const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() > 0.5 ? `rgba(255,220,170,${0.04 + 0.05 * r()})` : `rgba(120,40,20,${0.04 + 0.05 * r()})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + 60 * r(), 10 + 30 * r(), r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = 1.5 + 3 * r(); g.fillStyle = ['#8a4a36', '#e6c9a4', '#9a8c84', '#6f3b30'][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(x, y, s, s * 0.7, 0, 0, 7); g.fill(); } }, { repeat: [1, 1] }),
};

// ---------------------------------------------------------------- the rail: a real profile (head / web / foot) swept along y
const PROFILE = (() => { const R = [[0, 0], [0.064, 0], [0.066, 0.004], [0.064, 0.009], [0.014, 0.019], [0.009, 0.028], [0.009, 0.068], [0.013, 0.075],
  [0.031, 0.079], [0.033, 0.084], [0.033, 0.106], [0.030, 0.112], [0.022, 0.115], [0, 0.1155]];
  const s = RAIL_H / 0.1155; const pts = R.map(([x, z]) => [x, z * s]); const L = pts.slice(1, -1).reverse().map(([x, z]) => [-x, z]); return [...pts.slice(0, -1), [0, RAIL_H], ...L]; })();
// zone colour per profile edge: head top polished, head sides steel, web and foot rusty
function railColor(za, zb) { const z = (za + zb) / 2; return z > RAIL_H * 0.93 ? [0.66, 0.62, 0.58] : z > RAIL_H * 0.7 ? [0.17, 0.15, 0.16] : [0.20, 0.11, 0.07]; }
export function railGeom(len, { step = 0.5, caps = true } = {}) {
  const n = Math.max(1, Math.ceil(len / step)), P = PROFILE, pos = [], nor = [], colr = [], uv = [], idx = [];
  for (let e = 0; e < P.length; e++) {
    const a = P[e], b = P[(e + 1) % P.length]; if (a[0] === b[0] && a[1] === b[1]) continue;
    const nx = b[1] - a[1], nz = -(b[0] - a[0]), nl = Math.hypot(nx, nz) || 1, c = railColor(a[1], b[1]), base = pos.length / 3;
    for (let i = 0; i <= n; i++) { const y = len * i / n;
      for (const p of [a, b]) { pos.push(p[0], p[1], -y); nor.push(nx / nl, nz / nl, 0); colr.push(...c); uv.push(y, p[1]); } }
    for (let i = 0; i < n; i++) { const q = base + i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  }
  if (caps) { const tri = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), []);
    for (const [y, s] of [[0, 1], [len, -1]]) { const base = pos.length / 3;
      for (const p of P) { pos.push(p[0], p[1], -y); nor.push(0, 0, s); colr.push(0.55, 0.52, 0.5); uv.push(0, 0); }
      for (const t of tri) s > 0 ? idx.push(base + t[0], base + t[1], base + t[2]) : idx.push(base + t[0], base + t[2], base + t[1]); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  // three: x across, y up, -z along (= Blender y); the profile winds so the normals point out
  return g;
}
export function railMat(K, o = {}) { const m = K.mat([1, 1, 1], o.rough ?? 0.45, { metal: 0.3, env: 0.7 }); m.vertexColors = true; return m; }

// ---------------------------------------------------------------- track
// A straight track along local +y from y0 to y1 (centre x), every part in the track group's own frame (meshes sit at
// identity, the geometry carries the position), so the heat glow and the buckle read local y. Returns
// { group, rails: [{ mesh, y0, y1, side, hero, move(dy) }], hero, mats: { rail (= heat material) }, bend, joints, tieYs }.
// hero = the four rail pieces meeting at the joint nearest heroY (separate meshes; move(dy) slides one along y).
// o: x, jointEvery (m), gapM (m), parent, seed, heroY (null = none), dense: [[ya, yb], ...] full ballast stones (default
// round the hero joint), sparse (fraction of stones elsewhere), bend (true: the track can buckle; uniforms in .bend),
// tie (spacing), heat { y, spread }, stones (false = none), width (ballast top half width), ballast (bed), tieMat
export function track(K, { y0 = -50, y1 = 50, x = 0, jointEvery = 11.9, gapM = 0.03, parent = K.root, seed = 1, heroY = null, dense = null, sparse = 0.06,
  bend = false, tie = 0.6, heat = {}, stones = true, width = 1.85, ballast = true, tieMat = null, rot = 0, at = null, cast = true } = {}) {
  const r = rng(seed), g = K.group(at || [x, 0, 0], rot, parent); g.name = 'track';
  const out = { group: g, rails: [], hero: [], mats: {} };
  const BEND = bend ? { amp: { value: 0 }, c: { value: (y0 + y1) / 2 }, L: { value: 25 } } : null; out.bend = BEND;
  const mk = m => { if (BEND) bendable(m, BEND); return m; };
  const L = y1 - y0;
  // ballast bed: a trapezoid prism with the pebble texture (texture tile 1.2 m)
  if (ballast) { const bm = mk(K.mat([1, 1, 1], 0.95, { map: RSURF.ballast(seed + 2) })); bm.side = THREE.DoubleSide;
    const sh = new THREE.Shape(); sh.moveTo(-width - 0.6, -0.1); sh.lineTo(width + 0.6, -0.1); sh.lineTo(width, 0.022); sh.lineTo(-width, 0.022); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, steps: Math.ceil(L / (bend ? 0.5 : 4)) });
    geo.scale(1, 1, -1); geo.translate(0, 0, -y0);
    const uvA = geo.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / 1.2, uvA.getY(i) / 1.2);
    const bed = new THREE.Mesh(geo, bm); K.add(bed, g, { cast: false }); bed.userData.floor = true; out.bed = bed; }
  // ties (baked, per-tie tone), tie plates and spike heads
  const tm = mk(tieMat || K.mat([1, 1, 1], 0.88, { map: RSURF.tie(seed + 5) }));
  const ties = [], tieYs = [];
  for (let y = y0 + tie / 2; y < y1; y += tie) { const jy = y + (r() - 0.5) * 0.05; tieYs.push(jy); const k = 0.78 + 0.32 * r();
    ties.push({ p: [(r() - 0.5) * 0.06, jy, TIE_TOP - 0.075 + (r() - 0.5) * 0.008], r: [0, (r() - 0.5) * 1.2, (r() - 0.5) * 2.2], c: [k, k * (0.96 + 0.06 * r()), k * (0.9 + 0.1 * r())] }); }
  out.tieYs = tieYs;
  out.ties = merged(K, new RoundedBoxGeometry(2.6, 0.15, 0.22, 2, 0.02), tm, ties, { parent: g, colors: true, cast }); out.ties.userData.floor = true; const clipList = [[out.ties, ties.map(t => t.p[1])]];
  const steel = mk(K.mat([0.16, 0.15, 0.16], 0.55, { metal: 0.6 })), rust = mk(K.mat([0.30, 0.17, 0.11], 0.7, { metal: 0.3 }));
  const plates = [], spikes = [];
  for (const ty of tieYs) for (const sx of [-1, 1]) { plates.push({ p: [sx * RAIL_X, ty, TIE_TOP + PLATE / 2], s: [0.2, 0.18, PLATE] });
    for (const dx of [-0.05, 0.05]) spikes.push({ p: [sx * RAIL_X + dx * 1.05, ty + (dx > 0 ? 0.05 : -0.05), TIE_TOP + PLATE + 0.008], s: [0.028, 0.022, 0.018] }); }
  out.plates = merged(K, new THREE.BoxGeometry(1, 1, 1), rust, plates, { parent: g, cast: false }); out.plates.userData.floor = true;
  out.spikes = merged(K, new THREE.BoxGeometry(1, 1, 1), steel, spikes, { parent: g, cast: false }); out.spikes.userData.floor = true;
  clipList.push([out.plates, plates.map(t => t.p[1])], [out.spikes, spikes.map(t => t.p[1])]);
  // rails: pieces of jointEvery metres with gapM gaps; the joint nearest heroY is four separate pieces (both rails)
  const hm = mk(heatMat(K, railMat(K), { y: heat.y ?? (heroY ?? 0), spread: heat.spread ?? 1.5 })); out.mats.heat = hm; out.mats.rail = hm;
  const joints = []; { let j = heroY != null ? heroY - Math.ceil((heroY - y0) / jointEvery) * jointEvery : y0; while (j <= y1 + 0.01) { joints.push(j); j += jointEvery; } }
  const pieces = []; for (let i = 0; i + 1 < joints.length; i++) pieces.push([Math.max(y0, joints[i]) + gapM / 2, Math.min(y1, joints[i + 1]) - gapM / 2]);
  if (joints[joints.length - 1] < y1 - 0.5) pieces.push([joints[joints.length - 1] + gapM / 2, y1]);
  const step = bend ? 0.5 : 1e9, plain = [];
  for (const [a, b] of pieces) for (const sx of [-1, 1]) {
    const isHero = heroY != null && (Math.abs(a - gapM / 2 - heroY) < 0.01 || Math.abs(b + gapM / 2 - heroY) < 0.01);
    if (!isHero) { plain.push([a, b, sx]); continue; }
    const geo = railGeom(b - a, { step: 0.25 }); const base = B(sx * RAIL_X, a, TIE_TOP + PLATE); geo.translate(base.x, base.y, base.z);
    const m = new THREE.Mesh(geo, hm); K.add(m, g, { cast }); m.userData.floor = true; let at0 = 0;
    const rec = { mesh: m, y0: a, y1: b, side: sx, hero: true, move: dy => { geo.translate(0, 0, -(dy - at0)); at0 = dy; } };
    out.rails.push(rec); out.hero.push(rec); }
  // the plain pieces: one baked mesh per standard length (shared profile), the odd end pieces on their own
  { const byLen = new Map(); for (const [a, b, sx] of plain) { const k = (b - a).toFixed(3); if (!byLen.has(k)) byLen.set(k, []); byLen.get(k).push({ p: [sx * RAIL_X, a, TIE_TOP + PLATE] }); }
    for (const [k, list] of byLen) { const m = merged(K, railGeom(+k, { step }), hm, list, { parent: g, cast }); m.userData.floor = true; out.rails.push({ mesh: m, baked: true }); clipList.push([m, list.map(t => t.p[1] + (+k))]); } }
  // joint bars (both faces of the web) with 4 bolts each: nuts on the inside face (toward the track centre), bolt ends outside
  const bars = [], nuts = [], ends = [];
  for (const jy of joints) { if (jy < y0 + 0.3 || jy > y1 - 0.3) continue;
    for (const sx of [-1, 1]) for (const face of [-1, 1]) { const bx = sx * RAIL_X + face * 0.021;
      bars.push({ p: [bx, jy, TIE_TOP + PLATE + 0.052], s: [0.018, 0.62, 0.062] });
      for (const dy of [-0.225, -0.075, 0.075, 0.225]) { const inward = face === -sx;
        (inward ? nuts : ends).push({ p: [bx + face * (inward ? 0.019 : 0.024), jy + dy, TIE_TOP + PLATE + 0.052], s: inward ? [0.022, 0.04, 0.04] : [0.03, 0.017, 0.017], j: jy + 0.3 }); } } }
  out.joints = joints;
  if (bars.length) { out.bars = merged(K, new RoundedBoxGeometry(1, 1, 1, 1, 0.1), mk(K.mat([0.26, 0.15, 0.10], 0.62, { metal: 0.4 })), bars, { parent: g, cast });
    out.nuts = merged(K, new THREE.CylinderGeometry(0.5, 0.5, 1, 6).rotateZ(Math.PI / 2), mk(K.mat([0.14, 0.11, 0.11], 0.45, { metal: 0.6 })), nuts, { parent: g, cast });
    out.boltEnds = merged(K, new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateZ(Math.PI / 2), steel, ends, { parent: g, cast: false });
    for (const k of ['bars', 'nuts', 'boltEnds']) out[k].userData.floor = true;
    clipList.push([out.bars, bars.map(t => t.p[1] + 0.31)], [out.nuts, nuts.map(t => t.j)], [out.boltEnds, ends.map(t => t.j)]); }
  // ballast stones: dense near the hero joint (or the given ranges), sparse elsewhere; never on top of a tie or a rail
  if (stones) {
    const D = dense || (heroY != null ? [[heroY - 16, heroY + 26]] : [[y0, Math.min(y1, y0 + 40)]]);
    const PC = ['#8d5040', '#a8604a', '#d0b898', '#9a9490', '#86828a', '#5c4038', '#b87a68', '#dccab0', '#6e5048', '#a89a8e', '#7a4a3e'];
    const near = [], far = [], inTie = y => { const i = Math.round((y - (y0 + tie / 2)) / tie); const ty = tieYs[Math.max(0, Math.min(tieYs.length - 1, i))]; return Math.abs(y - ty) < 0.14; };
    for (let y = y0; y < y1; y += 0.05) { const isD = D.some(([a, b]) => y >= a && y <= b), n = isD ? 36 : 36 * sparse;
      let k = Math.floor(n) + (r() < n - Math.floor(n) ? 1 : 0);
      while (k-- > 0) { const xx = (r() * 2 - 1) * (width + 0.35), yy = y + r() * 0.05, s = 0.019 + 0.022 * r() * r() + 0.008 * r();
        if (Math.abs(xx) < 1.33 && inTie(yy)) continue; if (Math.abs(Math.abs(xx) - RAIL_X) < 0.085) continue;
        const edge = Math.max(0, Math.abs(xx) - width) / 0.55;
        (isD ? near : far).push({ p: [xx, yy, 0.016 - edge * 0.12 + s * 0.3], s: [s * (0.9 + 0.5 * r()), s * (0.9 + 0.5 * r()), s * (0.55 + 0.3 * r())], r: [r() * 40, r() * 40, r() * 360], c: PC[Math.floor(r() * PC.length)] }); } }
    const lumpy = d => { const sg = new THREE.IcosahedronGeometry(1, d), p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.86 + 0.24 * vnoise(p.getX(i) * 2.1 + 3, p.getY(i) * 2.1 + p.getZ(i) * 1.7, 5); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } sg.computeVertexNormals(); return sg; };
    const sm = mk(K.mat([1, 1, 1], 0.82, { env: 0.9 }));
    out.stones = instanced(K, lumpy(1), sm, near, { parent: g }); out.stonesFar = instanced(K, lumpy(0), sm, far, { parent: g });
    out.stones.userData.floor = out.stonesFar.userData.floor = true; out.stoneCount = near.length + far.length;
    clipList.push([out.stones, near.map(t => t.p[1])], [out.stonesFar, far.map(t => t.p[1])]);
  }
  // clip(y): show only the part of the track up to local y (a line still being laid); clip(Infinity) shows it all
  out.clip = yMax => { for (const [m, ys] of clipList) showFirst(m, upper(ys, yMax)); for (const h of out.hero) h.mesh.visible = h.y1 <= yMax; };
  return out;
}

// ---------------------------------------------------------------- locomotive (4-4-0 American)
// local: the pilot tip at y = 0, facing -y; rails at x = +-RAIL_X, rail top at RAIL_TOP. Returns { group, drive(m), lamp(k),
// funnel: [x, y, z] local top of the stack, wheels }. livery: { boiler, smokebox, cab, wheel, trim (brass), roof, pilot, tender }
export function loco(K, { parent = K.root, livery = {}, name = 'loco', lampPower = 60, number = '7' } = {}) {
  const L = { boiler: [0.05, 0.05, 0.06], smokebox: [0.10, 0.10, 0.11], cab: [0.62, 0.10, 0.07], wheel: [0.70, 0.10, 0.07], trim: [0.86, 0.62, 0.22], roof: [0.08, 0.07, 0.07], pilot: [0.66, 0.11, 0.07], tender: [0.55, 0.09, 0.07], frame: [0.06, 0.06, 0.07], ...livery };
  const g = K.group([0, 0, 0], 0, parent); g.name = name;
  const M = { boiler: K.mat(L.boiler, 0.28, { physical: true, clearcoat: 0.8, env: 1.2 }), smoke: K.mat(L.smokebox, 0.45, { metal: 0.2 }), cab: K.mat(L.cab, 0.4, { physical: true, clearcoat: 0.6 }),
    wheel: K.mat(L.wheel, 0.4, { physical: true, clearcoat: 0.5 }), brass: K.mat(L.trim, 0.25, { metal: 0.85, env: 1.4 }), roof: K.mat(L.roof, 0.5), pilot: K.mat(L.pilot, 0.45),
    tender: K.mat(L.tender, 0.4, { physical: true, clearcoat: 0.5 }), frame: K.mat(L.frame, 0.5, { metal: 0.3 }), tyre: K.mat([0.16, 0.16, 0.17], 0.35, { metal: 0.7 }),
    glassDark: K.mat([0.06, 0.07, 0.09], 0.15, { env: 1.5 }), wood: K.mat([0.42, 0.26, 0.15], 0.8) };
  const Z = RAIL_TOP;
  // wheels: a group per wheel spinning about local x
  const wheels = [];
  const wheel = (y, rad, x, spokes, red = true) => {
    const w = K.group([x, y, Z + rad], 0, g); const sx = Math.sign(x);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.13, 40).rotateZ(Math.PI / 2), M.tyre); K.add(t, w);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.035, rad + 0.035, 0.03, 40).rotateZ(Math.PI / 2), M.tyre); fl.position.x = -sx * 0.05; K.add(fl, w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(rad - 0.06, 0.04, 8, 40).rotateY(Math.PI / 2), red ? M.wheel : M.tyre); rim.position.x = sx * 0.03; K.add(rim, w);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(rad - 0.08, rad - 0.08, 0.04, 32).rotateZ(Math.PI / 2), M.frame); disc.position.x = -sx * 0.01; K.add(disc, w);
    for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI * 2, s = new THREE.Mesh(new RoundedBoxGeometry(0.05, rad * 0.95, 0.06, 1, 0.012), M.wheel);
      s.position.set(sx * 0.035, Math.cos(a) * rad * 0.47, Math.sin(a) * rad * 0.47); s.rotation.x = a; K.add(s, w); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.2, rad * 0.22, 0.14, 20).rotateZ(Math.PI / 2), M.wheel); hub.position.x = sx * 0.04; K.add(hub, w);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.09, rad * 0.09, 0.06, 16).rotateZ(Math.PI / 2), M.brass); cap.position.x = sx * 0.1; K.add(cap, w);
    if (rad > 0.6) { const cw = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad * 0.62, 0.05, 24, 1, false, -0.7, 1.4).rotateZ(Math.PI / 2), M.frame); cw.position.x = sx * 0.05; K.add(cw, w); }
    w.userData.r = rad; wheels.push(w); return w; };
  const DR = 0.8, LR = 0.42, dY = [5.2, 6.95], lY = [1.95, 3.05];
  for (const sx of [-1, 1]) { for (const y of dY) wheel(y, DR, sx * RAIL_X, 14); for (const y of lY) wheel(y, LR, sx * RAIL_X, 8); }
  // frame, running boards, valance
  K.box([-0.55, 1.2, Z + 0.55], [0.55, 7.3, Z + 1.05], M.frame, { parent: g, r: 0.03 });
  for (const sx of [-1, 1]) { K.box([sx * 0.95 - 0.22, 2.9, Z + 1.32], [sx * 0.95 + 0.22, 7.1, Z + 1.38], M.frame, { parent: g, r: 0.01 });
    K.box([sx * 1.17 - 0.02, 2.9, Z + 1.18], [sx * 1.17 + 0.02, 7.1, Z + 1.38], M.cab, { parent: g, r: 0.008 });
    K.box([sx * 1.17 - 0.03, 2.9, Z + 1.36], [sx * 1.17 + 0.03, 7.1, Z + 1.42], M.brass, { parent: g, r: 0.008 }); }
  // boiler, smokebox, bands, domes, stack, bell, whistle
  const BZ = Z + 2.0, BR = 0.7;
  K.cyl([0, 4.9, BZ], BR, 4.2, M.boiler, { axis: 'y', parent: g, seg: 40 });
  K.cyl([0, 2.0, BZ], BR + 0.04, 1.55, M.smoke, { axis: 'y', parent: g, seg: 40 });
  K.cyl([0, 1.2, BZ], BR - 0.02, 0.08, M.smoke, { axis: 'y', parent: g, seg: 40 });
  K.cyl([0, 1.15, BZ], 0.32, 0.04, M.brass, { axis: 'y', parent: g });
  K.card([0, 1.12, BZ - 0.42], 0.34, 0.2, label(number, { w: 128, h: 80, bg: '#d9a43a', fg: '#2a1408' }), { parent: g, env: 0.6 });
  for (const y of [2.8, 3.55, 4.35, 5.15, 5.95, 6.75]) K.cyl([0, y, BZ], BR + 0.018, 0.07, M.brass, { axis: 'y', parent: g, seg: 40 });
  K.lathe([0, 4.2, BZ + BR - 0.08], [[0, 0], [0.42, 0], [0.4, 0.06], [0.3, 0.12], [0.3, 0.5], [0.33, 0.54], [0.24, 0.66], [0, 0.7]], M.brass, { parent: g });
  K.lathe([0, 5.75, BZ + BR - 0.08], [[0, 0], [0.38, 0], [0.34, 0.08], [0.26, 0.14], [0.26, 0.4], [0.28, 0.44], [0.18, 0.54], [0, 0.57]], M.brass, { parent: g });
  K.lathe([0, 3.35, BZ + BR + 0.32], [[0, 0], [0.2, 0], [0.19, 0.06], [0.14, 0.18], [0.1, 0.27], [0, 0.3]], M.brass, { parent: g });
  K.box([-0.03, 3.3, BZ + BR - 0.05], [0.03, 3.4, BZ + BR + 0.34], M.frame, { parent: g, r: 0.01 });
  const ST = BZ + BR - 0.06;
  K.lathe([0, 2.05, ST], [[0, 0], [0.3, 0], [0.26, 0.12], [0.22, 0.5], [0.26, 0.75], [0.42, 1.05], [0.58, 1.3], [0.62, 1.42], [0.6, 1.47], [0.5, 1.45], [0.0, 1.45]], M.smoke, { parent: g, seg: 48 });
  K.torus([0, 2.05, ST + 1.44], 0.6, 0.035, M.brass, { parent: g });
  K.torus([0, 2.05, ST + 0.12], 0.27, 0.03, M.brass, { parent: g });
  const funnel = [0, 2.05, ST + 1.5];
  K.cyl([0.18, 7.0, BZ + BR + 0.35], 0.035, 0.35, M.brass, { parent: g });
  // headlamp: a brass box lantern on the smokebox top, lens facing -y
  const hl = K.group([0, 0.98, BZ + BR + 0.42], 0, g);
  K.cube([0, 0.22, 0], [0.62, 0.6, 0.56], M.brass, { parent: hl, r: 0.04 });
  K.cube([0, 0.22, 0.34], [0.5, 0.5, 0.14], M.cab, { parent: hl, r: 0.03 });
  K.cyl([0, 0.22, 0.47], 0.1, 0.16, M.frame, { parent: hl });
  K.cyl([0, -0.05, -0.02], 0.25, 0.08, M.brass, { parent: hl, axis: 'y' });
  K.box([-0.04, 0.4, -0.5], [0.04, 0.5, -0.26], M.frame, { parent: hl });
  const lensMat = new THREE.MeshStandardMaterial({ color: col([1, 0.95, 0.8]), emissive: col([1, 0.85, 0.5]), emissiveIntensity: 0.2, roughness: 0.1, metalness: 0, envMap: K.ENV }); lensMat.userData.noToon = true;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.21, 40), lensMat); lens.position.copy(B(0, -0.1, -0.02)); K.add(lens, hl, { cast: false });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({ map: tex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,215,140,0.5)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  halo.material.userData.noToon = true; halo.material.userData.rkNoHaze = true; halo.position.copy(B(0, -0.14, -0.02)); halo.userData.noPrepass = true; K.add(halo, hl, { cast: false, recv: false });
  const lampL = K.point([0, -0.6, -0.1], [1, 0.86, 0.6], 0, 45, { parent: hl });
  const spot = new THREE.SpotLight(col([1, 0.88, 0.62]), 0, 60, 0.38, 0.55, 1.2); spot.position.copy(B(0, -0.2, 0)); spot.target.position.copy(B(0, -12, -BZ - BR - 0.4 + RAIL_TOP)); hl.add(spot, spot.target);
  // cab
  const cab = K.group([0, 7.0, Z + 1.38], 0, g);
  K.box([-1.18, 0, 0], [1.18, 1.85, 2.15], M.cab, { parent: cab, r: 0.03 });
  for (const sx of [-1, 1]) { K.box([sx * 1.185 - 0.01, 0.2, 1.05], [sx * 1.185 + 0.01, 0.85, 1.8], M.glassDark, { parent: cab, r: 0.005 }); K.box([sx * 1.185 - 0.01, 1.0, 1.05], [sx * 1.185 + 0.01, 1.6, 1.8], M.glassDark, { parent: cab, r: 0.005 });
    for (const [a, b] of [[0.15, 0.9], [0.95, 1.65]]) { K.box([sx * 1.19 - 0.015, a, 1.0], [sx * 1.19 + 0.015, b, 1.05], M.brass, { parent: cab, r: 0.006 }); K.box([sx * 1.19 - 0.015, a, 1.8], [sx * 1.19 + 0.015, b, 1.85], M.brass, { parent: cab, r: 0.006 }); }
    K.box([sx * 1.19 - 0.01, 0.1, 0.45], [sx * 1.19 + 0.01, 1.75, 0.5], M.brass, { parent: cab, r: 0.005 }); }
  for (const sx of [-1, 1]) K.box([sx * 0.62 - 0.32, -0.015, 1.2], [sx * 0.62 + 0.32, 0.01, 1.75], M.glassDark, { parent: cab, r: 0.01 });
  const roofD = K.mat(L.roof, 0.5, { side: THREE.DoubleSide });
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.35, 40, 1, true, -0.42, 0.84).rotateX(-Math.PI / 2), roofD);
  roof.position.copy(B(0, 0.92, 2.45 - 3.2)); K.add(roof, cab);
  // cylinders, crossheads, steam chest
  for (const sx of [-1, 1]) { K.cyl([sx * 1.02, 2.5, Z + 1.0], 0.3, 1.0, M.boiler, { axis: 'y', parent: g }); for (const y of [1.99, 3.01]) K.cyl([sx * 1.02, y, Z + 1.0], 0.32, 0.05, M.brass, { axis: 'y', parent: g });
    K.box([sx * 1.02 - 0.24, 2.1, Z + 1.28], [sx * 1.02 + 0.24, 2.9, Z + 1.58], M.boiler, { parent: g, r: 0.04 }); }
  // pilot (cowcatcher): slats fanning from the buffer beam to a pointed nose
  K.box([-1.2, 1.0, Z + 0.78], [1.2, 1.25, Z + 1.18], M.pilot, { parent: g, r: 0.03 });
  for (const sx of [-1, 1]) K.cyl([sx * 0.45, 0.92, Z + 0.98], 0.08, 0.22, M.brass, { axis: 'y', parent: g });
  { const slats = []; const tip = [0, -0.35, Z + 0.1];
    for (let i = 0; i <= 10; i++) { const x = -1.1 + 2.2 * i / 10; slats.push({ m: beamMatrix([x, 1.02, Z + 0.86], [x * 0.12, tip[1] + Math.abs(x) * 0.55, Z + 0.08], 0.07, 0.035) }); }
    instanced(K, unitBox(0.01), M.pilot, slats, { parent: g, cast: true, colors: false });
    K.box([-1.15, 0.95, Z + 0.06], [1.15, 1.05, Z + 0.14], M.frame, { parent: g, r: 0.01 }); }
  // rods: coupling rod per side (driver to driver) and main rod (crosshead to the front driver's pin)
  const rods = [];
  for (const sx of [-1, 1]) { const c = K.box([-0.025, -0.05, -0.04], [0.025, dY[1] - dY[0] + 0.05, 0.04], M.frame, { parent: g, r: 0.01 }); c.userData.side = sx;
    const mr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 1), M.brass); K.add(mr, g); rods.push({ sx, c, mr }); }
  // tender
  const T = K.group([0, 9.0, 0], 0, g);
  for (const sx of [-1, 1]) for (const y of [1.0, 2.05, 3.85, 4.9]) wheel(9.0 + y, LR, sx * RAIL_X, 8, true);
  K.box([-1.15, 0.55, Z + 0.62], [1.15, 5.45, Z + 0.95], M.frame, { parent: T, r: 0.03 });
  K.box([-1.22, 0.6, Z + 0.95], [1.22, 5.4, Z + 2.25], M.tender, { parent: T, r: 0.05 });
  K.box([-1.25, 0.58, Z + 2.2], [1.25, 5.42, Z + 2.32], M.brass, { parent: T, r: 0.02 });
  K.box([-1.25, 0.58, Z + 0.92], [1.25, 5.42, Z + 1.0], M.frame, { parent: T, r: 0.01 });
  { const logs = [], q = rng(7); for (let i = 0; i < 26; i++) { const x = -0.9 + 1.8 * q(), y = 0.9 + 2.2 * q(), z = Z + 2.3 + 0.2 * q(); logs.push({ m: beamMatrix([x - 0.1, y, z], [x + 0.1, y + 0.9, z + 0.03], 0.16, 0.16) }); }
    instanced(K, new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2), M.wood, logs, { parent: T, colors: false }); }
  // drive: turn every wheel for a travelled distance (m), animate the rods
  const drive = dist => { for (const w of wheels) w.rotation.x = dist / w.userData.r;
    const th = dist / DR;
    for (const { sx, c, mr } of rods) { const a = th + (sx > 0 ? 0 : Math.PI / 2), py = -Math.sin(a) * 0.36, pz = Math.cos(a) * 0.36;
      c.position.copy(B(sx * (RAIL_X + 0.16), (dY[0] + dY[1]) / 2 + py, Z + DR + pz));
      const pin = B(sx * (RAIL_X + 0.21), dY[0] + py, Z + DR + pz), xh = B(sx * (RAIL_X + 0.21), 3.3, Z + 1.0);
      const d = pin.clone().sub(xh), len = d.length();
      mr.position.copy(xh).add(pin).multiplyScalar(0.5); mr.quaternion.setFromUnitVectors(_zAxis, d.normalize()); mr.scale.set(1, 1, len); } };
  const lamp = k => { lensMat.emissiveIntensity = 0.2 + 5.5 * k; halo.material.opacity = Math.min(1, 1.2 * k); lampL.intensity = lampPower * k; spot.intensity = lampPower * 6 * k; };
  drive(0); lamp(0);
  return { group: g, drive, lamp, funnel, wheels, lens, materials: M, length: 14.6 };
}

// ---------------------------------------------------------------- coach
// a wooden passenger coach: local y = 0 at the front end, length L along +y, rails at x = +-RAIL_X.
export function coach(K, { parent = K.root, name = 'coach', color = [0.36, 0.13, 0.08], letters = 'RED MESA LINE', L = 15, trim = '#d9a43a', band = null, windows = 11, seed = 2 } = {}) {
  const g = K.group([0, 0, 0], 0, parent); g.name = name; const Z = RAIL_TOP, W = 1.42, z0 = Z + 1.05, z1 = Z + 3.35;
  const cc = col(color), hx = '#' + cc.getHexString(THREE.SRGBColorSpace);
  // side texture: vertical planks, a lettering band, arched windows with gold frames, a dark base line
  const side = tex(2048, 320, (c, w, h) => { const r = rng(seed); c.fillStyle = hx; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 14) { const k = 0.85 + 0.25 * r(); c.fillStyle = `rgba(${k > 1 ? 255 : 0},${k > 1 ? 230 : 0},${k > 1 ? 200 : 0},${Math.abs(k - 1) * 0.5})`; c.fillRect(x, 0, 14, h); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, 0, 2, h); }
    if (band) { c.fillStyle = band; c.fillRect(0, h * 0.06, w, h * 0.17); }
    c.fillStyle = trim; c.fillRect(0, h * 0.05, w, 4); c.fillRect(0, h * 0.23, w, 4); c.fillRect(0, h * 0.9, w, 5);
    c.font = `900 ${h * 0.13}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = trim; c.strokeStyle = 'rgba(40,20,5,0.8)'; c.lineWidth = 3;
    const t = letters.split('').join(String.fromCharCode(8202)); c.strokeText(t, w / 2, h * 0.145); c.fillText(t, w / 2, h * 0.145);
    const n = windows, ww = w / (n + 1) * 0.55;
    for (let i = 0; i < n; i++) { const cx = w * (i + 1) / (n + 1), y0 = h * 0.3, y1 = h * 0.7;
      c.fillStyle = trim; c.beginPath(); c.moveTo(cx - ww / 2 - 6, y1 + 6); c.lineTo(cx - ww / 2 - 6, y0 + ww / 2); c.arc(cx, y0 + ww / 2, ww / 2 + 6, Math.PI, 0); c.lineTo(cx + ww / 2 + 6, y1 + 6); c.closePath(); c.fill();
      const gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#5a6f8f'); gr.addColorStop(0.5, '#1d2232'); gr.addColorStop(1, '#2a2430'); c.fillStyle = gr;
      c.beginPath(); c.moveTo(cx - ww / 2, y1); c.lineTo(cx - ww / 2, y0 + ww / 2); c.arc(cx, y0 + ww / 2, ww / 2, Math.PI, 0); c.lineTo(cx + ww / 2, y1); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(cx - ww / 2 + 6, y0 + ww / 2); c.lineTo(cx - ww / 6, y0 + ww / 2); c.lineTo(cx - ww / 2 + 6, y1 - 10); c.fill();
      c.fillStyle = 'rgba(255,215,140,0.25)'; c.fillRect(cx - ww / 2, y1 - 26, ww, 22); }
  });
  const sideM = K.mat([1, 1, 1], 0.55, { map: side, physical: true, clearcoat: 0.25 }), body = K.mat(color, 0.6), dark = K.mat([0.07, 0.06, 0.06], 0.5, { metal: 0.3 }), gold = K.mat(trim, 0.3, { metal: 0.8 });
  const roofM = K.mat([0.16, 0.10, 0.08], 0.7), endM = K.mat(cc.clone().multiplyScalar(0.8).toArray(), 0.6, { map: tex(256, 256, (c, w, h) => { c.fillStyle = hx; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, 0, 2, h); } }) });
  K.box([-W, 0.6, z0], [W, L - 0.6, z1], body, { parent: g, r: 0.04 });
  for (const sx of [-1, 1]) K.card([sx * (W + 0.006), L / 2, (z0 + z1) / 2], L - 1.2, z1 - z0, side, { parent: g, rotZ: sx * 90, env: 0.6 });
  for (const [y, s] of [[0.6, 1], [L - 0.6, -1]]) K.card([0, y - s * 0.006, (z0 + z1) / 2], 2 * W, z1 - z0, endM.map, { parent: g, rotZ: s > 0 ? 0 : 180, env: 0.5 });
  // roof: a low curved deck + a clerestory with little windows
  roofM.side = THREE.DoubleSide; const rf = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, L - 0.3, 40, 1, true, -0.58, 1.16).rotateX(-Math.PI / 2), roofM);
  rf.position.copy(B(0, L / 2, z1 - 2.6 + 0.32)); K.add(rf, g);
  K.box([-0.72, 1.4, z1 + 0.2], [0.72, L - 1.4, z1 + 0.72], body, { parent: g, r: 0.03 });
  for (let y = 2.0; y < L - 1.6; y += 0.9) for (const sx of [-1, 1]) K.box([sx * 0.725 - 0.01, y, z1 + 0.32], [sx * 0.725 + 0.01, y + 0.55, z1 + 0.6], K.mat([0.55, 0.62, 0.7], 0.15), { parent: g, r: 0.005, cast: false });
  K.box([-0.85, 1.25, z1 + 0.7], [0.85, L - 1.25, z1 + 0.8], roofM, { parent: g, r: 0.03 });
  // end platforms with railings and steps, couplers, underframe and two bogies
  for (const [y0, y1] of [[0, 0.6], [L - 0.6, L]]) { K.box([-1.3, y0, z0 - 0.12], [1.3, y1, z0], dark, { parent: g, r: 0.01 });
    const ye = y0 < 1 ? y0 + 0.05 : y1 - 0.05; for (const x of [-1.25, -0.5, 0.5, 1.25]) K.cyl([x, ye, z0 + 0.5], 0.02, 1.0, gold, { parent: g });
    K.cyl([-0.875, ye, z0 + 1.0], 0.025, 0.75, gold, { parent: g, axis: 'x' }); K.cyl([0.875, ye, z0 + 1.0], 0.025, 0.75, gold, { parent: g, axis: 'x' });
    for (const sx of [-1, 1]) for (let s = 0; s < 3; s++) K.box([sx * 1.25 - 0.18, y0 + 0.1, z0 - 0.3 - s * 0.28], [sx * 1.25 + 0.18, y1 - 0.1, z0 - 0.26 - s * 0.28], dark, { parent: g, r: 0.005 }); }
  K.box([-1.2, 0.8, Z + 0.75], [1.2, L - 0.8, z0], dark, { parent: g, r: 0.02 });
  for (const yc of [2.6, L - 2.6]) { K.box([-1.15, yc - 1.1, Z + 0.45], [1.15, yc + 1.1, Z + 0.75], dark, { parent: g, r: 0.03 });
    for (const sx of [-1, 1]) for (const dy of [-0.75, 0.75]) { K.cyl([sx * RAIL_X, yc + dy, Z + 0.42], 0.42, 0.12, dark, { parent: g, axis: 'x' }); K.cyl([sx * (RAIL_X + 0.07), yc + dy, Z + 0.42], 0.1, 0.06, gold, { parent: g, axis: 'x' }); } }
  return { group: g, length: L, z0, z1, W };
}

// ---------------------------------------------------------------- canyon wall
// Strata bands for a wall: [{ z0, z1, c (hex), off (m, how far the band stands out) }] bottom to top.
const PAL = {
  red: ['#7a2c22', '#9c3524', '#c64727', '#e07a40', '#e58f52', '#f0b070', '#e8c49a', '#b8402a', '#703534', '#8c3a2c', '#d0602e'],
  pink: ['#e0507a', '#c03a6a', '#e86a5a', '#f0a060', '#f6c070', '#b02e5a', '#8a2c6a', '#e47a8a', '#f2b090', '#d24a48'],
  dusk: ['#7c3b5a', '#9a4a6a', '#b85a70', '#c8807a', '#a85a6a', '#6a3a5c', '#d09080'],
};
export function strata({ zb = -2, H = 50, seed = 1, pal = 'red', ledge = 0.6, big = 1.6, lowSafe = 6 } = {}) {
  const r = rng(seed), P = PAL[pal] || pal, out = []; let z = zb;
  while (z < H + 12) { const t = 1.5 + 6 * r() * r() + 1.2 * r(); const off = (z < lowSafe ? 0.35 : 1) * (r() < 0.25 ? big * (0.5 + 0.5 * r()) : ledge * r());
    out.push({ z0: z, z1: z + t, c: P[Math.floor(r() * P.length)], off, wav: 0.2 + 0.8 * r() }); z += t; }
  return out;
}
function strataTex(bands, zb, ztop, seed = 1, { lines = true } = {}) {
  return tex(512, 2048, (g, w, h) => { const r = rng(seed), Y = z => h * (1 - (z - zb) / (ztop - zb));
    for (const b of bands) { g.fillStyle = b.c; g.fillRect(0, Y(b.z1) - 1, w, Y(b.z0) - Y(b.z1) + 2); }
    // wavy fine strata inside each band (lighter / darker), the reference's flowing lines
    for (const b of bands) { const n = Math.max(1, Math.round((b.z1 - b.z0) * 1.6));
      for (let i = 0; i < n; i++) { const z = b.z0 + (b.z1 - b.z0) * (i + r()) / n, y = Y(z), amp = 3 + 14 * b.wav * r(), ph = r() * 7, fr = 1 + Math.floor(3 * r());
        g.strokeStyle = r() > 0.45 ? `rgba(255,150,70,${0.1 + 0.16 * r()})` : `rgba(70,8,28,${0.12 + 0.2 * r()})`; g.lineWidth = 1 + 4 * r() * r();
        g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x / w * Math.PI * 2 * fr + ph) * amp + Math.sin(x / w * Math.PI * 2 * (fr + 2) + ph * 2) * amp * 0.35; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } }
    if (lines) for (const b of bands) { g.fillStyle = 'rgba(60,12,24,0.55)'; g.fillRect(0, Y(b.z0) - 1.5, w, 3); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,160,90' : '60,6,30'},${0.05 + 0.07 * r()})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + 50 * r(), 4 + 16 * r(), 0, 0, 7); g.fill(); }
  }, { repeat: [1, 1] });
}
// canyonWall: a displaced grid in a local frame (local x = along the wall, z up, the face looks toward local -y), placed
// by `at` + `rotZ` (deg; -90 = the face looks toward -x, +90 = toward +x). The top folds back into a plateau `top` m deep.
// o: L, H, zb (bottom), step (m between columns), fine [u0, u1, step], amp (noise relief, m), crag (top roughness, m),
//    bands (strata), pal, ledge/big (band offsets), texL (m of wall per texture repeat), flat (faceted shading)
export function canyonWall(K, { at = [0, 0, 0], rotZ = 0, L = 200, H = 50, zb = -2, step = 2.5, fine = null, amp = 0.8, crag = 6, top = 30, seed = 1, pal = 'red',
  bands = null, ledge = 0.6, big = 1.6, texL = 45, flat = true, rows = 1.4, parent = K.root, rough = 0.95, tint = null, lowSafe = 6, recess = 0.35, plateau = '#7a2a24', topRows = 8, slope = false, caps = false } = {}) {
  const S = bands || strata({ zb, H, seed, pal, ledge, big, lowSafe }), ztop = H + crag + 2;
  const us = []; { let u = 0; while (u < L) { us.push(u); const st = fine && u >= fine[0] && u < fine[1] ? fine[2] : step; u += st * (0.85 + 0.3 * hash2(us.length, 3, seed)); } us.push(L); }
  const zs = []; { let z = zb; const cuts = S.map(b => b.z0).filter(z => z > zb && z < ztop); while (z < ztop) { zs.push(z); z += rows; }
    for (const c of cuts) zs.push(c - 0.12, c + 0.12); zs.sort((a, b) => a - b); }
  const off = z => { for (const b of S) if (z < b.z1) return b.off; return S[S.length - 1].off; };
  const topZ = u => H + crag * (fbm(u / 22, 0.5, seed + 3, 3) - 0.5) * 2 + crag * 0.6 * Math.max(0, vnoise(u / 5.5, 1.5, seed + 4) - 0.55) * 3;
  const nu = us.length, nz = zs.length + topRows, pos = new Float32Array(nu * nz * 3), uv = new Float32Array(nu * nz * 2), cl = new Float32Array(nu * nz * 3);
  const P = col(plateau);
  for (let i = 0; i < nu; i++) { const u = us[i], tz = topZ(u);
    for (let j = 0; j < nz; j++) { let x = u, y, z, k = i * nz + j;
      if (j < zs.length && zs[j] <= tz) { z = zs[j]; const d = off(z) + amp * (fbm(u / 9, z / 6, seed, 4) - 0.5) * 2 + amp * 0.5 * (vnoise(u / 2.2, z / 1.8, seed + 7) - 0.5);
        y = -d; uv[k * 2] = u / texL; uv[k * 2 + 1] = (z - zb) / (ztop - zb);
        const rec = Math.min(1, Math.max(0, (d - off(z) + amp) / (2 * amp))); const sh = 1 - recess * (1 - rec) - 0.12 * (fbm(u / 30, z / 25, seed + 9, 2) - 0.5);
        cl[k * 3] = sh; cl[k * 3 + 1] = sh * (0.97 + 0.03 * rec); cl[k * 3 + 2] = sh * (1.0 + 0.04 * (1 - rec)); }
      else { const jj = Math.max(0, j - zs.findIndex(q => q > tz)); const back = (jj + 1) / topRows; z = slope ? tz + (zb - tz) * back * back + (back < 1 ? 0.6 * (vnoise(u / 4, jj, seed + 5) - 0.5) : 0) : tz + 0.6 * (vnoise(u / 4, jj, seed + 5) - 0.5) - back * 0.4;
        y = -(off(tz) - 0.3) + back * top; uv[k * 2] = u / texL; uv[k * 2 + 1] = (tz - zb) / (ztop - zb) + 0.002;
        cl[k * 3] = P.r * 1.5; cl[k * 3 + 1] = P.g * 1.5; cl[k * 3 + 2] = P.b * 1.5; }
      pos[k * 3] = x; pos[k * 3 + 1] = z; pos[k * 3 + 2] = -y; } }
  const idx = []; for (let i = 0; i + 1 < nu; i++) for (let j = 0; j + 1 < nz; j++) { const a = i * nz + j, b = (i + 1) * nz + j; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // end caps: the column's own outline (face up, plateau back and down) closed along the bottom
  let P3 = Array.from(pos), U2 = Array.from(uv), C3 = Array.from(cl);
  if (caps) for (const i of [0, nu - 1]) { const pts = []; for (let j = 0; j < nz; j++) { const k = i * nz + j; pts.push(new THREE.Vector2(pos[k * 3 + 2], pos[k * 3 + 1])); }
    pts.push(new THREE.Vector2(pts[pts.length - 1].x, zb), new THREE.Vector2(pts[0].x, zb));
    const tri = THREE.ShapeUtils.triangulateShape(pts, []), base = P3.length / 3;
    for (const p of pts) { P3.push(us[i], p.y, p.x); U2.push(0.2, Math.max(0, (p.y - zb) / (ztop - zb))); C3.push(P.r * 1.4, P.g * 1.4, P.b * 1.4); }
    for (const t of tri) idx.push(base + t[0], base + t[1], base + t[2]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U2, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C3, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = K.mat(tint || [1, 1, 1], rough, { map: strataTex(S, zb, ztop, seed), env: 0.6, physical: true }); m.specularIntensity = 0.06; m.vertexColors = true; m.flatShading = flat; m.side = THREE.DoubleSide; m.map.repeat.set(1, 1);
  m.map.wrapS = THREE.RepeatWrapping; m.map.wrapT = THREE.ClampToEdgeWrapping;
  const grp = K.group(at, rotZ, parent), mesh = new THREE.Mesh(geo, m); K.add(mesh, grp, { cast: true, recv: true }); mesh.userData.wall = true;
  mesh.userData.bands = S; return mesh;
}

// a mesa on the horizon: a stepped, irregular prism with strata and a flat top
export function mesa(K, { at = [0, 0, 0], r = 60, h = 40, seed = 1, pal = 'red', parent = K.root, n = 28, steps = 3, zb = -40 } = {}) {
  const q = rng(seed), S = strata({ zb, H: h, seed, pal, ledge: 0, big: 0 }), ztop = h + 2;
  const ring = Array.from({ length: n }, (_, i) => r * (0.7 + 0.5 * fbm(i / n * 6, 0.3, seed, 3)));
  const levels = []; for (let s = 0; s <= steps; s++) levels.push(zb + (h - zb) * s / steps);
  const prof = []; for (let s = 0; s < levels.length; s++) { const k = 1 - 0.12 * s - 0.06 * q(); prof.push([levels[s], k]); if (s < steps) prof.push([levels[s] + (levels[s + 1] - levels[s]) * 0.85, k - 0.02]); }
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = ring[i % n];
    for (const [z, k] of prof) { pos.push(Math.cos(a) * rr * k, z, -Math.sin(a) * rr * k); uv.push(i / n * 4, (z - zb) / (ztop - zb)); } }
  const np = prof.length; for (let i = 0; i < n; i++) for (let j = 0; j + 1 < np; j++) { const a = i * np + j, b = (i + 1) * np + j; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const c0 = pos.length / 3; pos.push(0, h, 0); uv.push(0.5, (h - zb) / (ztop - zb)); for (let i = 0; i < n; i++) idx.push(c0, i * np + np - 1, (i + 1) * np + np - 1);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = K.mat([1, 1, 1], 0.95, { map: strataTex(S, zb, ztop, seed, { lines: false }), env: 0.6, physical: true }); m.specularIntensity = 0.06; m.flatShading = true; m.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, m); mesh.position.copy(B(...at)); K.add(mesh, parent, { cast: false }); return mesh;
}

// ---------------------------------------------------------------- sky: a dome that rides the camera, soft fluffy clouds
export function sky(K, { zenith = '#3f78d6', mid = '#6f9fe6', horizon = '#d9d2e6', low = '#cbc4cc', clouds = 22, seed = 11, r = 60, sunAt = null, sunDir = null, sunK = 1, cloudK = 1 } = {}) {
  if (sunDir && !sunAt) { const d = B(...sunDir).normalize().negate(), th = Math.acos(Math.max(-1, Math.min(1, d.y))); let ph = Math.atan2(d.z, -d.x); if (ph < 0) ph += Math.PI * 2; sunAt = [ph / (Math.PI * 2), th / Math.PI]; }
  const t = tex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h / 2); gr.addColorStop(0, zenith); gr.addColorStop(0.55, mid); gr.addColorStop(0.92, horizon); gr.addColorStop(1, low);
    g.fillStyle = gr; g.fillRect(0, 0, w, h / 2); g.fillStyle = low; g.fillRect(0, h / 2, w, h / 2);
    if (sunAt) { const [su, sv] = sunAt; const sg = g.createRadialGradient(su * w, sv * h, 0, su * w, sv * h, h * 0.22); sg.addColorStop(0, `rgba(255,250,235,${0.98 * sunK})`); sg.addColorStop(0.06, `rgba(255,250,235,${0.9 * sunK})`); sg.addColorStop(0.2, `rgba(255,245,225,${0.4 * sunK})`); sg.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h / 2); }
    const q = rng(seed);
    const puff = (x, y, s, a) => { const rg = g.createRadialGradient(x, y - s * 0.15, s * 0.1, x, y, s); rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.55, `rgba(250,250,255,${a * 0.85})`); rg.addColorStop(1, 'rgba(240,244,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); };
    for (let i = 0; i < clouds; i++) { const cx = q() * w, cy = h * (0.22 + 0.24 * q() * q()), s = (18 + 46 * q() * (1 - (cy / h - 0.2) * 1.2)) * cloudK, n = 5 + Math.floor(8 * q());
      // shaded underside, then the bright puffs on top
      g.fillStyle = 'rgba(170,180,215,0.35)'; g.beginPath(); g.ellipse(cx, cy + s * 0.35, s * (1.6 + 0.8 * q()), s * 0.35, 0, 0, 7); g.fill();
      for (let k = 0; k < n; k++) { const dx = (k / (n - 1) - 0.5) * s * (2.6 + q()), dy = -Math.sin(k / (n - 1) * Math.PI) * s * (0.5 + 0.4 * q()); puff(cx + dx, cy + dy, s * (0.5 + 0.45 * q()), 0.75 + 0.2 * q()); }
      for (let k = 0; k < 3; k++) puff(cx + (q() - 0.5) * s * 1.6, cy - s * 0.25 - q() * s * 0.3, s * (0.45 + 0.3 * q()), 0.9); }
    // a far wispy layer near the horizon
    for (let i = 0; i < 40; i++) { const x = q() * w, y = h * (0.42 + 0.07 * q()); g.fillStyle = `rgba(255,255,255,${0.12 + 0.15 * q()})`; g.beginPath(); g.ellipse(x, y, 40 + 120 * q(), 4 + 8 * q(), 0, 0, 7); g.fill(); }
  });
  const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, fog: false }); m.userData.noToon = true; m.userData.rkSkip = true;
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), m); d.frustumCulled = false; d.renderOrder = -10; d.userData.noPrepass = true; d.userData.noInk = true; d.userData.rkSkip = true;
  d.onBeforeRender = (rd, sc, cam) => { d.position.copy(cam.position); d.updateMatrixWorld(); };
  K.root.add(d); return d;
}

// ---------------------------------------------------------------- ground
// slab: a flat top from lo to hi (Blender), tessellated every `step` m, with a short skirt; uv in metres / tile
export function slab(K, lo, hi, mat, { step = 4, tile = 4, parent = K.root, skirt = 0, recv = true } = {}) {
  const sx = hi[0] - lo[0], sy = hi[1] - lo[1], g = new THREE.PlaneGeometry(sx, sy, Math.max(1, Math.ceil(sx / step)), Math.max(1, Math.ceil(sy / step)));
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx / tile, uv.getY(i) * sy / tile);
  g.rotateX(-Math.PI / 2); g.translate((lo[0] + hi[0]) / 2, hi[2], -(lo[1] + hi[1]) / 2);
  const m = new THREE.Mesh(g, mat); K.add(m, parent, { cast: false, recv }); m.userData.floor = true;
  if (skirt > 0) K.box([lo[0], lo[1], hi[2] - skirt], [hi[0], hi[1], hi[2] - 0.01], mat, { parent, r: 0, cast: false }).userData.floor = true;
  return m;
}

// ---------------------------------------------------------------- dressing helpers shared by the outdoor sets
export function shrub(K, at, s = 1, { parent = K.root, seed = 1, c = [0.30, 0.42, 0.20] } = {}) {
  const q = rng(seed), g = K.group(at, 0, parent), m = K.mat(c, 0.85), m2 = K.mat(col(c).multiplyScalar(1.3).toArray(), 0.85);
  for (let i = 0; i < 5; i++) K.sphere([(q() - 0.5) * 0.5 * s, (q() - 0.5) * 0.5 * s, 0.18 * s + q() * 0.15 * s], (0.18 + 0.14 * q()) * s, i % 2 ? m : m2, { parent: g, seg: 10, sz: 0.8 });
  return g;
}
export function cactus(K, at, s = 1, { parent = K.root, seed = 1 } = {}) {
  const q = rng(seed), g = K.group(at, q() * 360, parent), m = K.mat([0.28, 0.48, 0.30], 0.6);
  K.cyl([0, 0, 0.8 * s], 0.13 * s, 1.6 * s, m, { parent: g, seg: 12 }); K.sphere([0, 0, 1.6 * s], 0.13 * s, m, { parent: g, seg: 12 });
  for (const sx of [-1, 1]) { const h = (0.6 + 0.4 * q()) * s; K.cyl([sx * 0.28 * s, 0, h], 0.09 * s, 0.1 * s, m, { parent: g, axis: 'x', seg: 10 }); K.cyl([sx * 0.33 * s, 0, h + 0.25 * s], 0.09 * s, 0.5 * s, m, { parent: g, seg: 10 }); K.sphere([sx * 0.33 * s, 0, h + 0.5 * s], 0.09 * s, m, { parent: g, seg: 10 }); }
  return g;
}
export function rock(K, at, s = 1, { parent = K.root, seed = 1, c = [0.62, 0.30, 0.20] } = {}) {
  const geo = new THREE.IcosahedronGeometry(s, 1), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + 0.45 * vnoise(p.getX(i) / s * 1.7 + seed, p.getY(i) / s * 1.7 + p.getZ(i) / s, seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
  geo.computeVertexNormals(); const m = K.mat(c, 0.9); m.flatShading = true; const x = new THREE.Mesh(geo, m); x.position.copy(B(at[0], at[1], at[2] + s * 0.25)); x.rotation.y = seed; return K.add(x, parent);
}
// telegraph pole with a crossarm and green glass insulators; returns the insulator tops (Blender) for the wires
export function pole(K, at, { parent = K.root, h = 7.2, seed = 1, arms = 1 } = {}) {
  const q = rng(seed), g = K.group(at, (q() - 0.5) * 6, parent), wood = K.mat([0.36, 0.26, 0.19], 0.85), glass = K.mat([0.35, 0.62, 0.5], 0.15, { env: 1.4 });
  K.cyl([0, 0, h / 2], 0.11, h, wood, { parent: g, r2: 0.085, seg: 12 }); const tops = [];
  for (let a = 0; a < arms; a++) { const z = h - 0.35 - a * 0.6; K.box([-0.85, -0.06, z - 0.06], [0.85, 0.06, z + 0.06], wood, { parent: g, r: 0.01 });
    for (const x of [-0.75, -0.3, 0.3, 0.75]) { K.cyl([x, 0, z + 0.14], 0.035, 0.16, glass, { parent: g, seg: 10 }); tops.push([at[0] + x, at[1], at[2] + z + 0.22]); } }
  return tops;
}
// wires between consecutive pole tops (a sagging catenary per pair), one instanced draw for all
export function wires(K, rows, { parent = K.root, sag = 0.5, r = 0.012 } = {}) {
  const list = [];
  for (const row of rows) for (let i = 0; i + 1 < row.length; i++) { const a = row[i], b = row[i + 1], n = 8;
    for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, P = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - 4 * sag * t * (1 - t)];
      list.push({ m: beamMatrix(P(t0), P(t1), r, r) }); } }
  return instanced(K, unitBox(0), K.mat([0.08, 0.07, 0.07], 0.5), list, { parent, colors: false });
}

// ---------------------------------------------------------------- collision from the real meshes
// After build: one box per visible mesh that stands above `floor` and is smaller than `big` m, in Blender coordinates.
// Ties, rails, ballast, walls and anything marked userData.floor / userData.noCollide (or under a skipped prop) are left out.
const _b = new THREE.Box3();
export function collideFromMeshes(COLLIDE, root, { floor = 0.05, big = 6, skip = [], maxZ = 2.4, min = 0.06 } = {}) {
  COLLIDE.length = 0; root.updateMatrixWorld(true);
  const skipObj = new Set(); root.traverse(o => { if (skip.includes(o.name)) o.traverse(c => skipObj.add(c)); });
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || skipObj.has(o) || o.userData.floor || o.userData.noCollide || o.userData.wall || o.userData.noPrepass) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    _b.setFromObject(o); if (_b.isEmpty()) return;
    const lo = [_b.min.x, -_b.max.z, _b.min.y], hi = [_b.max.x, -_b.min.z, _b.max.y];
    const sz = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    if (hi[2] <= floor || lo[2] > maxZ || Math.max(...sz) > big || Math.max(sz[0], sz[1]) < min) return;
    COLLIDE.push({ name: o.name || o.parent?.name || 'mesh', lo: lo.map(v => +v.toFixed(3)), hi: hi.map(v => +v.toFixed(3)) });
  });
  return COLLIDE;
}
