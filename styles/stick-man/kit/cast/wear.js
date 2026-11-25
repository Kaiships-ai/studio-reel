// What a costume layer is built from (kit/cast/wardrobe.js, kit/cast/drape.js): the torso's own surface as a function, and
// pieces made on it that ride it.
// Body space: the figure's `body` group (S.parts.torso.parent), metres, y = 0 at the hip, +z the front, +x the figure's
// right (its R arm). The torso is engine/cast.js torsoGeo (an egg: 0.54 m tall from y -0.042, radius 0.171 m) scaled by the
// spec's girth across (x) and 0.8 (0.9 + 0.1 girth) front to back (z), and bent by the spine (cast.js bendPt). A point on it
// is (th, y, d): th the lathe's angle (0 = the front, + toward +x), y its height, d metres out along the surface normal.
// Everything made here is built at rest in body space and bent each frame with the torso's own bend (warp below), vertex by
// vertex, as the torso is: a badge, a pocket or a tie keeps its offset off the shell through any pose, with no sim.
import * as THREE from 'three';
import { solid, W_M, TORSO, TORSO_Y0, HEAD_C, HEAD_H, HIP_V, bendPt } from '#engine/cast.js';
import { toon } from '#engine/look.js';

const W = W_M;
export const H_T = TORSO.h * W, R_T = TORSO.w / 2 * W, Y0 = TORSO_Y0 * W, Y1 = Y0 + H_T;

// the torso's lathe radius at body height y (m), before girth and depth (cast.js torsoGeo's profile)
export function torsoR(y) {
  const yl = Math.max(0, Math.min(H_T, y - Y0)), r = R_T;
  const rr = yl < r ? Math.sqrt(Math.max(0, r * r - (r - yl) ** 2)) : yl > H_T - r ? Math.sqrt(Math.max(0, r * r - (yl - (H_T - r)) ** 2)) : r;
  return rr * (1.10 - 0.20 * (yl / H_T) ** 2);
}
// the build a layer is sized from: girth across and front to back, the leg's length (bodies.js legScale)
export function fitOf(spec = {}) {
  const g = spec.girth ?? 1;
  // k: pieces and seams set closer together across a thin chest, wider apart across a broad one (a collar kept at its adult width floated as a bow tie on a heavy chest)
  return { gx: g, gz: 0.8 * (0.9 + 0.1 * g), leg: spec.legScale ?? 1, girth: g, head: spec.headScale ?? 1, k: g < 1 ? 0.35 + 0.65 * g : 1 + 0.5 * (g - 1) };
}
const _g = new THREE.Vector3();
// the surface point at (th, y) moved d out along its normal; n (optional) gets the normal
export function at(F, th, y, d = 0, out = new THREE.Vector3(), n = null) {
  const r = torsoR(y), x = r * F.gx * Math.sin(th), z = r * F.gz * Math.cos(th);
  const dr = (torsoR(y + 0.002) - torsoR(y - 0.002)) / 0.004, rho = Math.max(1e-6, Math.hypot(x / F.gx, z / F.gz));
  _g.set(x / (F.gx * F.gx * rho), -dr, z / (F.gz * F.gz * rho)).normalize();
  if (n) n.copy(_g);
  return out.set(x, y, z).addScaledVector(_g, d);
}
// metres of arc round the torso per radian at (th, y)
export const dsdth = (F, th, y) => Math.max(1e-3, torsoR(y) * Math.hypot(F.gx * Math.cos(th), F.gz * Math.sin(th)));
// the angle s metres of arc across from th at height y (drawn in on a thin chest, F.k)
export function thS(F, th, y, s, k = F.k) { s *= k; const n = Math.max(1, Math.ceil(Math.abs(s) / 0.02)); for (let i = 0; i < n; i++) th += s / n / dsdth(F, th, y); return th; }

// where the head sits on the body: the height at angle th at which the shell goes into the head (a collar or a scarf lies on this
// line all the way round; it is higher at the sides of a broad body)
export function neckY(F, th) {
  const hc = (HEAD_C[1] - HIP_V + (F.head - 1) * 0.5 * HEAD_H) * W, ra = 0.5 * W * F.head, rb = 0.5 * HEAD_H * W * F.head, p = new THREE.Vector3(), out = y => { at(F, th, y, 0, p); return (p.x * p.x + p.z * p.z) / (ra * ra) + (p.y - hc) ** 2 / (rb * rb) - 1; };
  let a = 0.30, b = Y1 - 0.01; for (let i = 0; i < 22; i++) { const m = (a + b) / 2; if (out(m) > 0) a = m; else b = m; } return (a + b) / 2;
}

// flat toon material for a layer (the cast's look: hard two-step ramp, no gloss, place light only a little)
export const wearMat = (rgb, o = {}) => { const m = toon(rgb, { sheen: 0, rough: 1, rim: 0, soft: 0, char: 1, shade: o.shade || [0.74, 0.74, 0.84], map: o.map }); if (o.vc) m.vertexColors = true; return m; };
// hard stripes: list = the stripe colours in order (linear), along u (or v); nearest filtered, so two colours never blend into
// a gradient (a scarf's gold ran into its black and read as metal: Kai's director 25/11)
export function stripes(list, along = 'u', repeat = 1) {
  const n = list.length, px = new Uint8Array(n * 4); list.forEach((c, i) => px.set([...c.map(x => Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))), 255], 4 * i));
  const t = new THREE.DataTexture(px, along === 'u' ? n : 1, along === 'u' ? 1 : n); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; if (along === 'u') t.repeat.set(repeat, 1); else t.repeat.set(1, repeat); t.needsUpdate = true; return t;
}
// a mesh with its ink hull (cast.js solid), hull kept out of the AO prepass; small pieces cast no shadow (a badge's
// shadow on the chest reads as dirt under the cel ramp)
// A plate brings its own outline (userData.hull): its border goes straight out across the surface, so the line round it has one
// width and no gap (a border vertex shared by a wide face and a thin wall went almost straight up, and the line broke)
export function inked(geo, mat, ink, { shadow = false } = {}) {
  const H = geo.userData.hull, m = H ? new THREE.Mesh(geo, mat) : solid(geo, mat, ink); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
  if (H) {
    const g = new THREE.BufferGeometry(), n = H.pos.length / 3, P = new Float32Array(3 * n), N = new Float32Array(3 * n), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromArray(H.dir, 3 * i); for (let c = 0; c < 3; c++) P[3 * i + c] = H.pos[3 * i + c] + v.getComponent(c) * ink; v.normalize().toArray(N, 3 * i); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('inkT', new THREE.Float32BufferAttribute(new Float32Array(n).fill(ink), 1)); g.setIndex(H.idx);
    const h = new THREE.Mesh(g, HULL_MAT); h.castShadow = h.receiveShadow = false; m.add(h);
  }
  const h = m.children[0]; h.userData.noPrepass = true; h.frustumCulled = false; m.userData.noInk = true;
  return m;
}

// orient every triangle of an indexed geometry away from a centre function (tri centroid -> the point it faces away from)
function orient(idx, P, centre) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromArray(P, 3 * idx[t]); b.fromArray(P, 3 * idx[t + 1]); c.fromArray(P, 3 * idx[t + 2]);
    m.copy(a).add(b).add(c).divideScalar(3); n.subVectors(b, a).cross(c.clone().sub(a));
    if (n.dot(m.clone().sub(centre(m, t))) < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
}
const geoOf = (P, idx, uv) => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx);
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
};

// A plate lying on the torso: rows [[y, sL, sR], ...] (body height, metres of arc across from th, left and right edges),
// d0..d1 its back and front off the surface, n columns across. A row with sL = sR is a point (a lapel's tip, a tie's).
export function plate(F, th, rows, d0, d1, n = 6) {
  rows = [...rows].sort((p, q) => q[0] - p[0]);
  // a long row span is cut into 1.5 cm steps, so a plate follows the belly instead of cutting a straight chord through it
  rows = rows.flatMap((r, i) => { if (!i) return [r]; const q = rows[i - 1], k = Math.max(1, Math.ceil((q[0] - r[0]) / 0.015)); return Array.from({ length: k }, (_, j) => r.map((x, c) => q[c] + (x - q[c]) * (j + 1) / k)); });
  const R = rows.length, P = [], NN = [], flat = [], idx = [], v = new THREE.Vector3(), nn = new THREE.Vector3(), id = (r, c, f) => (f * R + r) * (n + 1) + c;
  for (const [f, d] of [[0, d1], [1, d0]]) for (const [y, sL, sR] of rows) for (let c = 0; c <= n; c++) {
    const s = sL + (sR - sL) * c / n; at(F, thS(F, th, y, s), y, d, v, nn); P.push(v.x, v.y, v.z); NN.push(...nn.clone().multiplyScalar(f ? -1 : 1).toArray()); flat.push([s, y]);
  }
  for (let r = 0; r + 1 < R; r++) for (let c = 0; c < n; c++) for (const f of [0, 1]) {
    const a = id(r, c, f), b = id(r + 1, c, f), cc = id(r, c + 1, f), dd = id(r + 1, c + 1, f);
    idx.push(a, b, cc, cc, b, dd);
  }
  const ring = []; for (let c = 0; c <= n; c++) ring.push([0, c]); for (let r = 1; r < R; r++) ring.push([r, n]);
  for (let c = n - 1; c >= 0; c--) ring.push([R - 1, c]); for (let r = R - 2; r > 0; r--) ring.push([r, 0]);
  // each border point's way out across the surface (mitred at a corner), from the outline laid flat
  const pt = k => flat[id(...ring[(k + ring.length) % ring.length], 0)], K = ring.length, same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6; let area = 0; for (let k = 0; k < K; k++) { const [a, b] = [pt(k), pt(k + 1)]; area += a[0] * b[1] - b[0] * a[1]; }
  const outN = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), q = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l]; return area > 0 ? q : q.map(x => -x); }, e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), q2 = new THREE.Vector3();
  const way = ring.map((_, k) => { let i = 1, j = 1; while (i < K && same(pt(k), pt(k - i))) i++; while (j < K && same(pt(k), pt(k + j))) j++; const a = outN(pt(k - i), pt(k)), b = outN(pt(k), pt(k + j)), m = [a[0] + b[0], a[1] + b[1]], l = Math.hypot(...m) || 1, u = [m[0] / l, m[1] / l], g = Math.min(1.5, 1 / Math.max(0.2, u[0] * b[0] + u[1] * b[1]));
    const [s, y] = pt(k), t0 = thS(F, th, y, s); at(F, t0, y, 0, v); e1.copy(at(F, t0 + 0.002, y, 0, q2)).sub(v).normalize(); e2.copy(at(F, t0, y + 0.0005, 0, q2)).sub(v).normalize(); return new THREE.Vector3().addScaledVector(e1, u[0] * g).addScaledVector(e2, u[1] * g); });
  const nf = R * (n + 1), w0 = P.length / 3, HD = NN.slice(); for (let i = nf; i < w0; i++) { for (let k = 0; k < 3; k++) HD[3 * i + k] = -0.25 * NN[3 * i + k]; }   // (the back of the outline lies just off the cloth, never under it: there the line was lost)
  ring.forEach(([r, c], k) => { for (const f of [0, 1]) { const i = id(r, c, f), d = way[k], o = f ? 0.25 : 0.3; P.push(P[3 * i], P[3 * i + 1], P[3 * i + 2]); NN.push(...d.clone().normalize().toArray()); nn.fromArray(NN, 3 * id(r, c, 0)); HD.splice(3 * i, 3, d.x + nn.x * o, d.y + nn.y * o, d.z + nn.z * o); } });
  const sides = o => { const out = []; for (let k = 0; k < K; k++) { const j = (k + 1) % K, [a, b, e, f] = o === null ? [id(...ring[k], 0), id(...ring[j], 0), id(...ring[j], 1), id(...ring[k], 1)] : [w0 + 2 * k, w0 + 2 * j, w0 + 2 * j + 1, w0 + 2 * k + 1]; out.push(a, b, e, a, e, f); } return out; };
  // the front faces out from the torso, the back into it, the side walls out of the plate's middle
  const deep = (m, sg) => { const t = Math.atan2(m.x / F.gx, m.z / F.gz), k = new THREE.Vector3(), q = at(F, t, m.y, 0, new THREE.Vector3(), k); return q.addScaledVector(k, sg * 0.05); };
  const front = idx.filter((_, i) => idx[i - (i % 3)] < nf), back = idx.filter((_, i) => idx[i - (i % 3)] >= nf), wall = sides(0);
  orient(front, P, m => deep(m, -1)); orient(back, P, m => deep(m, 1));
  const mid = new THREE.Vector3(); for (let i = 0; i < 3 * w0; i += 3) mid.x += P[i], mid.y += P[i + 1], mid.z += P[i + 2]; mid.multiplyScalar(1 / w0);
  const c3 = new THREE.Vector3(); orient(wall, P, (m, t) => c3.copy(m).sub(new THREE.Vector3().fromArray(NN, 3 * wall[t])));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(NN, 3)); g.setIndex([...front, ...back, ...wall]);
  const hw = sides(null), hp = P.slice(0, 3 * w0); orient(hw, hp, (m, t) => { const k = ring.findIndex(([r, c]) => [id(r, c, 0), id(r, c, 1)].includes(hw[t])); return c3.copy(m).sub(way[Math.max(0, k)]); });
  g.userData.hull = { pos: hp, dir: HD, idx: [...front, ...back, ...hw], border: ring.map(([r, c]) => id(r, c, 0)), out: way }; return g;
}
// A band swept round the torso: section [[y, d], ...] (a closed loop) from th0 to th1 (a whole ring when th1 - th0 = 2 pi);
// u runs round it, so a stripe texture (stripes below) lays ribs or hard stripes on it
// base(th) lifts the section (its heights are then offsets from it: a collar's, from the neck's line); a section that is a
// function of th changes round it (a rounded collar end)
export function sweep(F, section, th0, th1, seg = 64, base = () => 0) {
  const sec = typeof section === 'function' ? section : () => section, J = sec(th0).length, ring = Math.abs(th1 - th0 - 2 * Math.PI) < 1e-6, K = ring ? seg : seg + 1, P = [], UV = [], idx = [], v = new THREE.Vector3();
  for (let k = 0; k < K; k++) { const th = th0 + (th1 - th0) * k / seg, b = base(th); for (const [y, d] of sec(th)) { at(F, th, b + y, d, v); P.push(v.x, v.y, v.z); UV.push(k / seg, 0.5); } }
  for (let k = 0; k < (ring ? K : K - 1); k++) for (let j = 0; j < J; j++) { const k1 = (k + 1) % K, j1 = (j + 1) % J; idx.push(k * J + j, k1 * J + j, k1 * J + j1, k * J + j, k1 * J + j1, k * J + j1); }
  const c = new THREE.Vector3(), mid = th => { const q = sec(th); return [base(th) + q.reduce((a, s) => a + s[0], 0) / J, q.reduce((a, s) => a + s[1], 0) / J]; };
  // faces outward from the section's middle at that angle
  const thAt = t => th0 + (th1 - th0) * (Math.floor(idx[t] / J) + 0.5) / seg;
  orient(idx, P, (m, t) => { const th = thAt(t); return at(F, th, ...mid(th), c).clone(); });
  if (!ring) for (const [k, sg] of [[0, -1], [K - 1, 1]]) {
    const cap = []; for (let j = 1; j + 1 < J; j++) cap.push(k * J, k * J + j, k * J + j + 1);
    const th = th0 + (th1 - th0) * k / seg, e = at(F, th, ...mid(th)).clone(), out = at(F, th + sg * 0.2 * Math.sign(th1 - th0), ...mid(th)).clone().sub(e);
    orient(cap, P, m => m.clone().sub(out)); idx.push(...cap);
  }
  return geoOf(P, idx, UV);
}
// a small solid built in a local frame (x across in metres of arc, y the height offset from y0, z out from the surface)
// laid on the torso round (th, y0) from d0 out; returns the same geometry
export function conform(F, geo, th, y0, d0 = 0) {
  const P = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { const y = y0 + P.getY(i); at(F, thS(F, th, y, P.getX(i), 1), y, d0 + P.getZ(i), v); P.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}
// a button: a disc r across, h thick, its back on the surface at d0
export const disc = (F, th, y, r, h = 0.003, d0 = 0.002, seg = 14) => conform(F, new THREE.CylinderGeometry(r, r * 0.92, h, seg).rotateX(Math.PI / 2).translate(0, 0, h / 2), th, y, d0);
// a tube along points [[th, y, d], ...] on the torso, radius r
export function tubeOn(F, pts, r, seg = 48, radial = 8) {
  const v = pts.map(([th, y, d]) => at(F, th, y, d).clone());
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), seg, r, radial, false);
}

// The torso is drawn with its lathe's rings bent and flat between them (cast.js bends vertices, not the surface): from the
// belly to the chest one straight span 0.2 m tall, which in a deep bend (a 60 deg sit) lies up to 7 mm inside the true
// curve. A piece on it bends the same way: its point is bent at the two rings round its height and placed between them, so it
// keeps its offset off the torso as drawn. v (and n) in W units, body space.
const RINGS = (() => { const r = R_T / W, h = H_T / W, y0 = Y0 / W, out = [];
  for (let i = 0; i <= 14; i++) out.push(y0 + r + r * Math.sin(-Math.PI / 2 + Math.PI / 2 * i / 14));
  for (let i = 0; i <= 14; i++) out.push(y0 + h - r + r * Math.sin(Math.PI / 2 * i / 14));
  return [...new Set(out.map(x => +x.toFixed(9)))].sort((p, q) => p - q); })();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _na = new THREE.Vector3(), _nb = new THREE.Vector3();
export function bendTorso(B, v, n = null) {
  const y = v.y; let i = 0; while (i + 1 < RINGS.length && RINGS[i + 1] < y) i++;
  if (y <= RINGS[0] || y >= RINGS[RINGS.length - 1] || RINGS[i + 1] - RINGS[i] < 0.02) return bendPt(B, v, n);
  const t = (y - RINGS[i]) / (RINGS[i + 1] - RINGS[i]);
  _a.set(v.x, RINGS[i], v.z); _b.set(v.x, RINGS[i + 1], v.z); if (n) { _na.copy(n); _nb.copy(n); }
  bendPt(B, _a, n ? _na : null); bendPt(B, _b, n ? _nb : null);
  v.lerpVectors(_a, _b, t); if (n) n.lerpVectors(_na, _nb, t).normalize();
}

// The pieces that ride the torso, bent each frame as the torso is: rest copies of each mesh and its hull, warped by the
// spine's bend (cast.js S.spineB). A frame with no bend leaves them at rest.
export function rider(group) {
  const parts = [];
  const add = m => { group.add(m); m.traverse(o => { if (!o.isMesh) return; const g = o.geometry; parts.push({ g, p: g.attributes.position.array.slice(), n: g.attributes.normal ? g.attributes.normal.array.slice() : null }); }); return m; };
  let flat = true;
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  function warp(B) {
    if (!B || (B.th < 1e-6 && Math.abs(B.tw) < 1e-6 && Math.abs(B.s - 1) < 1e-6)) { if (flat) return; B = { th: 0, phi: 0, tw: 0, s: 1 }; flat = true; } else flat = false;
    for (const q of parts) {
      const A = q.g.attributes.position, N = q.g.attributes.normal;
      for (let i = 0; i < A.count; i++) {
        v.set(q.p[3 * i] / W, q.p[3 * i + 1] / W, q.p[3 * i + 2] / W);
        if (q.n) nn.set(q.n[3 * i], q.n[3 * i + 1], q.n[3 * i + 2]);
        bendTorso(B, v, q.n ? nn : null); A.setXYZ(i, v.x * W, v.y * W, v.z * W); if (q.n) N.setXYZ(i, nn.x, nn.y, nn.z);
      }
      A.needsUpdate = true; if (N) N.needsUpdate = true;
    }
  }
  return { add, warp, parts };
}

// A sleeve: a coloured tube with its own thin ink edge laid along the drawn arm line (cast.js limbs: 16 rings of 10 points),
// from ring `from` to ring `to`, r thick. It is only a little thicker than the line it covers, so the arm stays a stick
// figure's arm, coloured, with the hand's black mitt at its end. Placed from the line's own points every frame.
export const HULL_MAT = solid(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial()).children[0].material;
const RADIAL = 10;
// `to` may lie between two rings (a short sleeve: so far past where this body's arm comes out of the torso); profile(u) (u 0..1
// along it) scales its radius (a puffed sleeve, a cuff's rounded edges)
export function sleeve(line, { rgb, from = 0, to = 13, r = 0.0178, ink = 0.0075, flare = 0, profile = null }) {
  const whole = Number.isInteger(to - from) && !profile, n = whole ? to - from + 1 : Math.max(5, Math.ceil((to - from) * 2.5) + 1), idx = [], nv = n * RADIAL + 2, a0 = n * RADIAL, a1 = a0 + 1;
  for (let i = 0; i + 1 < n; i++) for (let j = 0; j < RADIAL; j++) { const a = i * RADIAL + j, b = i * RADIAL + (j + 1) % RADIAL; idx.push(a, b, a + RADIAL, b, b + RADIAL, a + RADIAL); }
  for (let j = 0; j < RADIAL; j++) { const k = (j + 1) % RADIAL, o = (n - 1) * RADIAL; idx.push(a0, k, j, a1, o + j, o + k); }
  const make = () => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal']) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setIndex(idx); return g; };
  const m = new THREE.Mesh(make(), wearMat(rgb)), h = new THREE.Mesh(make(), HULL_MAT); m.castShadow = true; m.receiveShadow = true;
  h.geometry.setAttribute('inkT', new THREE.BufferAttribute(new Float32Array(nv).fill(ink), 1)); h.userData.noPrepass = true; m.userData.noInk = true; m.add(h); for (const x of [m, h]) x.frustumCulled = false;
  const c = new THREE.Vector3(), c1 = new THREE.Vector3(), v = new THREE.Vector3(), t = new THREE.Vector3(), L = line.geometry.attributes, last = L.position.count / RADIAL - 1;
  const ringAt = (i, o) => { o.set(0, 0, 0); for (let j = 0; j < RADIAL; j++) o.x += L.position.getX(i * RADIAL + j), o.y += L.position.getY(i * RADIAL + j), o.z += L.position.getZ(i * RADIAL + j); return o.divideScalar(RADIAL); }, _r = new THREE.Vector3();
  const centre = (f, o) => { const i = Math.min(last - 1, Math.floor(f)); ringAt(i, o); return f === i ? o : o.lerp(ringAt(i + 1, _r), f - i); };
  function place() {
    for (const [g, off, over] of [[m.geometry, 0, 0], [h.geometry, ink, 0.6 * ink]]) {
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < n; i++) { const R = from + (to - from) * i / (n - 1), R0 = Math.min(last, Math.round(R)), rr = (profile ? r * profile(i / (n - 1)) : r + flare * Math.max(0, (i - n + 4) / 3)) + off; centre(R, c);
        if (over && (i === 0 || i === n - 1)) { centre(i ? R - 0.5 : R + 0.5, c1); c.addScaledVector(t.subVectors(c, c1).normalize(), over); }
        for (let j = 0; j < RADIAL; j++) { const k = R0 * RADIAL + j; v.set(L.normal.getX(k), L.normal.getY(k), L.normal.getZ(k)); P.setXYZ(i * RADIAL + j, c.x + v.x * rr, c.y + v.y * rr, c.z + v.z * rr); N.setXYZ(i * RADIAL + j, v.x, v.y, v.z); }
        if (i === 0 || i === n - 1) { const o = i ? a1 : a0; P.setXYZ(o, c.x, c.y, c.z); centre(i ? R - 0.5 : R + 0.5, c1); t.subVectors(c, c1).normalize(); N.setXYZ(o, t.x, t.y, t.z); } }
      P.needsUpdate = N.needsUpdate = true;
    }
  }
  return { m, place, rings: [from, to], r };
}
// where this body's arm comes out of its torso, in rings of the arm line (the arm starts well inside a broad chest)
export const armOut = F => (F.girth < 1 ? 4.2 - 1.2 * (1 - F.girth) : 4.2 + 1.25 * (F.girth - 1));
// under a garment that hangs over the lower torso the figure's own outline there goes thin (its hull drawn in to t metres below
// height y): the belly's thick black line showed under a coat's front and an apron's hem. Before the first pose (cast.js keeps
// its rest copy of the hull from then on).
export function thinHull(torso, y, t = 0.003) {
  const g = torso.children[0].geometry, P = g.attributes.position, N = g.attributes.normal, T = g.attributes.inkT;
  for (let i = 0; i < P.count; i++) { const yb = P.getY(i) + Y0, w = Math.max(0, Math.min(1, (y - 0.02 - yb) / 0.05)); if (!w) continue; const k = (T.getX(i) - t) * w; P.setXYZ(i, P.getX(i) - N.getX(i) * k, P.getY(i) - N.getY(i) * k, P.getZ(i) - N.getZ(i) * k); T.setX(i, T.getX(i) - k); }
  P.needsUpdate = T.needsUpdate = true;
}
