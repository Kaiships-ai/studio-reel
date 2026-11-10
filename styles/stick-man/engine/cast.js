// Posable 3D stick figures: squashed-sphere head with a sliding face decal, capsule torso with painted clothes,
// thin black tube limbs, hair and hats as solids. Each solid gets an inverted-hull outline 3.6 % of the head width.
// Units: W = head width. Pose numbers are in W, in the figure's own plane (u = its right as the camera sees it, v = up).
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, lin, css, B, INK_RGB } from './look.js';

export const W_M = 0.60;                     // head width in metres
const W = W_M;
const INK_T = 0.054 * W;                     // outline width: the reference measures 5.4-6.4 % of head width
const LIMB_R = 0.038 * W / 2;                // limbs stay a thinner line than the outline
export const HEAD_C = [0.0, 2.43], HEAD_H = 0.94, HIP_V = 1.34, SHOULDER_V = 2.00;
export const TORSO = { cx: 0.0, cy: 1.72, w: 0.57, h: 0.90, depth: 0.80 };
const HA = 0.5 * W, HB = 0.5 * HEAD_H * W;   // head half width / half height (m)
const DEG = Math.PI / 180;
const LOOK_RAD = 0.36;                       // face slide per unit of `look`

// eye rx, ry, lid (0 open .. 1 shut), brow tilt (deg, inner end down +), brow height, mouth
export const EXPR = {
  neutral: [0.050, 0.060, 0.0, 0, 0.165, 'flat'],
  smug: [0.052, 0.056, 0.45, 12, 0.150, 'smirk'],
  stern: [0.050, 0.055, 0.35, 20, 0.140, 'frown'],
  shock: [0.062, 0.078, 0.0, -8, 0.215, 'o'],
  happy: [0.050, 0.060, 0.0, -6, 0.175, 'smile'],
  closed: [0.055, 0.050, 1.0, -4, 0.150, 'smile'],
  worried: [0.050, 0.062, 0.0, -18, 0.190, 'wobble'],
  sly: [0.054, 0.052, 0.55, 6, 0.135, 'grin'],
  sleep: [0.055, 0.050, 1.0, 0, 0.140, 'flat'],
  grin: [0.050, 0.060, 0.0, -4, 0.180, 'grin'],
  calm: [0.050, 0.058, 0.32, -2, 0.158, 'smile'],
  // open-mouth twins: `<expr>_o` is shown while a word is being said (and for the sleeper's snore)
  happy_o: [0.050, 0.060, 0.0, -6, 0.180, 'open'],
  closed_o: [0.055, 0.050, 1.0, -4, 0.155, 'open'],
  calm_o: [0.050, 0.058, 0.32, -2, 0.162, 'open'],
  grin_o: [0.050, 0.060, 0.0, -4, 0.185, 'open'],
  sleep_o: [0.055, 0.050, 1.0, 0, 0.140, 'o'],
};
const EXPR_KEYS = Object.keys(EXPR);

const inkMat = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB) });
const hullMat = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB), side: THREE.BackSide });

// ------------------------------------------------------------------ outline
function hullGeo(geo, t) {
  let g = geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-5); g.computeVertexNormals();          // shared normals so the shell never cracks at seams
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  return g;
}
function solid(geo, mat, t = INK_T, hullSrc = geo) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  const h = new THREE.Mesh(hullGeo(hullSrc, t), hullMat); h.castShadow = false; h.receiveShadow = false;
  m.add(h); return m;
}

// ------------------------------------------------------------------ geometry helpers
const ell = (lat, lon, out = 0) => new THREE.Vector3((HA + out) * Math.cos(lat) * Math.sin(lon), (HB + out) * Math.sin(lat), (HA + out) * Math.cos(lat) * Math.cos(lon));
function lathe(profile, seg = 64) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
  g.rotateY(Math.PI);                                            // lathe seam to the back, front of the texture at u = 0.5
  return g;
}
// closed band hugging the head between two latitudes, rounded top and bottom
function bandGeo(lat0, lat1, thick, n = 14) {
  const pr = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, la = lat0 + (lat1 - lat0) * s, t = thick * Math.pow(Math.sin(Math.PI * s), 0.35) + 0.004 * W;
    pr.push([(HA + t) * Math.cos(la), (HB + t) * Math.sin(la)]);
  }
  for (let i = n; i >= 0; i--) { const la = lat0 + (lat1 - lat0) * i / n; pr.push([(HA - 0.01 * W) * Math.cos(la), (HB - 0.01 * W) * Math.sin(la)]); }
  pr.push(pr[0]);
  return lathe(pr);
}
// flat crescent brim sticking out in front, attached at height y where the head radius is rIn
function brimGeo(rIn, rx, rz, span = 80) {
  const s = new THREE.Shape(), N = 28;
  for (let i = 0; i <= N; i++) { const a = (-span + 2 * span * i / N) * DEG; const p = [Math.sin(a) * rx, Math.cos(a) * rz]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = N; i >= 0; i--) { const a = (-span + 2 * span * i / N) * DEG; s.lineTo(Math.sin(a) * rIn, Math.cos(a) * rIn); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012 * W, bevelEnabled: true, bevelThickness: 0.010 * W, bevelSize: 0.010 * W, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  return g;
}

// ------------------------------------------------------------------ hair and hats (built round the head centre)
const hairMat = col => toon(col, { shade: [0.82, 0.79, 0.93], sheen: 0, rough: 1, rim: 0.12 });   // near-flat: a deep shade tone turns the curl bumps into dark blotches
// One closed mass: from the head centre, the surface sits where each ray leaves the union of the curl spheres,
// so the silhouette is scalloped but there is one mesh and one hull (no inner outlines between curls).
// Where mask(dir) is 0 the surface tucks inside the head and is never seen.
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function massGeo(balls, mask, tilt, soft = 0) {
  const g = new THREE.SphereGeometry(1, 128, 96), p = g.attributes.position, d = new THREE.Vector3();
  const c = Math.cos(tilt), s = Math.sin(tilt);
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, d.y * c - d.z * s))), lon = Math.atan2(d.x, d.y * s + d.z * c);  // in the band's tilted frame
    const inner = 0.94 / Math.hypot(d.x / HA, d.y / HB, d.z / HA);
    let u = inner;
    const m = mask(lat, lon);
    if (m > 0) {
      let acc = soft ? Math.exp(inner / soft) : 0;
      for (const [bx, by, bz, br] of balls) {
        const bd = d.x * bx + d.y * by + d.z * bz, disc = bd * bd - (bx * bx + by * by + bz * bz) + br * br;
        if (disc >= 0) { const h = bd + Math.sqrt(disc); u = Math.max(u, h); if (soft) acc += Math.exp(h / soft); }
      }
      if (soft) u = soft * Math.log(acc);                         // smooth max: rounded valleys
    }
    const r = inner + (u - inner) * m;                             // soft mask: the hairline is a slope, not a jagged wall
    p.setXYZ(i, d.x * r, d.y * r, d.z * r);
  }
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-6); m.computeVertexNormals(); return m;
}
export function curls(col = [0.45, 0.25, 0.12], tilt = 18) {
  return () => {
    const balls = [], t = -tilt * DEG, c = Math.cos(t), s = Math.sin(t);
    const add = (lat, lon, r, out) => { const p = ell(lat, lon, out); balls.push([p.x, p.y * c - p.z * s, p.y * s + p.z * c, r]); };
    for (let i = 0; i < 12; i++) add(42 * DEG, (i * 30 + 15) * DEG, 0.17 * W * (1 + 0.10 * Math.sin(i * 2.1)), -0.03 * W);
    for (let i = 0; i < 8; i++) add(62 * DEG, (i * 45) * DEG, 0.17 * W, -0.04 * W);
    for (let i = 0; i < 4; i++) add(80 * DEG, (i * 90 + 45) * DEG, 0.16 * W, -0.05 * W);
    for (let i = 0; i < 9; i++) add(10 * DEG, (100 + i * 20) * DEG, 0.16 * W, -0.04 * W);   // down the back, under the band
    for (let i = 0; i < 7; i++) add(-14 * DEG, (120 + i * 20) * DEG, 0.15 * W, -0.05 * W);
    for (let i = 0; i < 5; i++) add(-34 * DEG, (140 + i * 20) * DEG, 0.13 * W, -0.06 * W);
    // above the band everywhere; below it only at the back and sides (the face stays clear)
    const mask = (lat, lon) => { const L = lat / DEG, O = Math.abs(lon) / DEG;
      return Math.max(sm(33, 39, L), sm(88, 102, O) * sm(-48, -40, L), sm(74, 86, O) * sm(2, 9, L)); };
    // hull from rounded valleys: no folds, no inner lines. No received shadow: the bumps would self-shadow into acne.
    const mop = solid(massGeo(balls, mask, -t), hairMat(col), INK_T, massGeo(balls, mask, -t, 0.012 * W)); mop.receiveShadow = false;
    const g = new THREE.Group(); g.add(mop);
    return g;
  };
}
export function hairCap(col = [0.30, 0.19, 0.12], tilt = 20) {
  return () => {
    const pr = [[0, -0.30 * W]];
    for (let i = 0; i <= 16; i++) { const la = (8 + 82 * i / 16) * DEG; pr.push([(HA + 0.03 * W) * Math.cos(la), (HB + 0.035 * W) * Math.sin(la)]); }
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const cap = solid(lathe(pr, 48), hairMat(col)); g.add(cap);
    return g;
  };
}
function stripeTex(base, draw) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = css(base); c.fillRect(0, 0, 1024, 128); draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function bandana(col = [0.86, 0.06, 0.06], tilt = 18) {
  return () => {
    // the band's outer face is the first half of the lathe profile (v 0..0.5); chevrons sit at the front (u 0.5)
    const map = stripeTex(col, c => {
      c.strokeStyle = '#fff'; c.lineWidth = 11; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = -2; i <= 2; i++) { const x = 512 + i * 40; c.beginPath(); c.moveTo(x - 9, 128 * (1 - 0.40)); c.lineTo(x + 7, 128 * (1 - 0.25)); c.lineTo(x - 9, 128 * (1 - 0.10)); c.stroke(); }
    });
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    g.add(solid(bandGeo(17 * DEG, 37 * DEG, 0.05 * W), toon([1, 1, 1], { map, sheen: 0.2 })));
    const m = toon(col, { sheen: 0.2 });
    for (const [lat, ry] of [[24, 0.5], [12, -0.4]]) {                 // knot tails at the back-right
      const k = new THREE.SphereGeometry(1, 16, 10); k.scale(0.05 * W, 0.12 * W, 0.025 * W);
      const t = solid(k, m); const p = ell(lat * DEG, 118 * DEG, 0.14 * W); t.position.copy(p); t.rotation.set(0, 128 * DEG, ry); g.add(t);
    }
    return g;
  };
}
export function visor(col = [0.10, 0.42, 0.30], tilt = 12) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    g.add(solid(bandGeo(22 * DEG, 38 * DEG, 0.06 * W), toon(col, { sheen: 0.3 })));
    const la = 22 * DEG, y = HB * Math.sin(la), rIn = HA * Math.cos(la) + 0.02 * W;
    const brim = solid(brimGeo(rIn, 0.62 * W, 0.86 * W), toon(col.map(c => Math.min(1, c * 1.5 + 0.05)), { sheen: 0.4, rough: 0.3 }));
    brim.position.set(0, y + 0.01 * W, 0); brim.rotation.x = 0.30; g.add(brim);
    return g;
  };
}
export function guardCap(col = [0.10, 0.15, 0.32], tilt = 8) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const y0 = 0.10 * W, R = 0.56 * W, Hc = 0.42 * W, pr = [[0, y0], [R * 0.9, y0]];
    for (let i = 0; i <= 16; i++) { const a = 90 * i / 16 * DEG; pr.push([R * Math.pow(Math.cos(a), 0.55), y0 + Hc * Math.sin(a)]); }
    g.add(solid(lathe(pr, 64), toon(col, { sheen: 0.35, rough: 0.35 })));
    const band = solid(bandGeo(4 * DEG, 14 * DEG, 0.07 * W), toon(col.map(c => c * 0.55), { sheen: 0.2 })); g.add(band);
    const brim = solid(brimGeo(HA * Math.cos(12 * DEG) + 0.03 * W, 0.62 * W, 0.92 * W), toon([0.03, 0.04, 0.08], { sheen: 0.5, rough: 0.25 }));
    brim.position.set(0, y0, 0); brim.rotation.x = 0.16; g.add(brim);
    const bg = new THREE.CylinderGeometry(0.06 * W, 0.06 * W, 0.03 * W, 24); bg.rotateX(Math.PI / 2);
    const badge = solid(bg, toon([1.0, 0.72, 0.16], { sheen: 0.8, rough: 0.2, shade: [0.7, 0.55, 0.5] }), INK_T * 0.6);
    const a = 42 * DEG; badge.position.set(0, y0 + Hc * Math.sin(a), R * Math.pow(Math.cos(a), 0.55) + 0.01 * W); badge.rotation.x = -0.5;
    g.add(badge);
    return g;
  };
}
// frames are tubes drawn ON the head surface (projected straight back onto it), so they hug it from any angle
function glasses() {
  const g = new THREE.Group(), r = 0.112 * W, lift = 0.022 * W;
  const onHead = (x, y) => { const z = HA * Math.sqrt(Math.max(0.02, 1 - (x / HA) ** 2 - (y / HB) ** 2)); const n = new THREE.Vector3(x / HA ** 2, y / HB ** 2, z / HA ** 2).normalize(); return new THREE.Vector3(x, y, z).addScaledVector(n, lift); };
  const tube = pts => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, pts.length > 3), 64, 0.013 * W, 8, pts.length > 3), inkMat); m.castShadow = true; return m; };
  for (const s of [-1, 1]) g.add(tube(Array.from({ length: 40 }, (_, i) => { const a = 2 * Math.PI * i / 40; return onHead(s * 0.15 * W + r * Math.cos(a), 0.02 * W + r * Math.sin(a)); })));
  g.add(tube([onHead(-0.038 * W, 0.03 * W), onHead(0, 0.038 * W), onHead(0.038 * W, 0.03 * W)]));
  return g;
}

// ------------------------------------------------------------------ face atlas (drawn in code, one cell per expression x blink)
const CELL = 512, COLS = 6;
let ATLAS = null;
function bez(p0, p1, p2, p3, n = 16) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
    o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return o;
}
function drawFace(g, expr, blink) {
  const INK = css(INK_RGB), ey = 0.02, dx = 0.150;
  let [rx, ry, lid, tilt, bh, mouth] = EXPR[expr];
  rx *= 1.30; ry *= 1.30; bh += 0.018;
  if (blink === 1 && lid < 1) { lid = Math.max(lid, 0.62); bh -= 0.012; }
  const line = (pts, w) => { g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); };
  g.strokeStyle = g.fillStyle = INK; g.lineCap = g.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const ex = s * dx;
    if (blink === 2 && lid < 1) line([[ex - rx * 1.15, ey - 0.004], [ex + rx * 1.15, ey - 0.004]], 0.030);
    else if (lid >= 1) {
      const arc = [];
      for (let i = 0; i <= 14; i++) { const t = Math.PI * (0.08 + 0.84 * i / 14);
        arc.push(expr === 'closed' ? [ex + rx * 1.1 * Math.cos(t), ey - 0.01 + ry * 0.9 * Math.sin(t)] : [ex + rx * 1.1 * Math.cos(t), ey + 0.012 - ry * 0.45 * Math.sin(t)]); }
      line(arc, 0.030);
    } else {
      const top = ey + ry * (1 - 2 * lid * 0.62);
      g.save(); g.beginPath(); g.rect(ex - 0.2, top - 0.4, 0.4, 0.4); g.clip();
      g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
      if (lid > 0) line([[ex - rx * 1.25, top], [ex + rx * 1.25, top]], 0.026);
    }
    const bl = 0.118, a = tilt * DEG * -s, bx = ex + s * 0.004, by = ey + bh - (blink === 2 ? 0.014 : 0);
    const p0 = [bx - bl * Math.cos(a), by - bl * Math.sin(a)], p1 = [bx + bl * Math.cos(a), by + bl * Math.sin(a)], mid = [bx, by + 0.012];
    line(bez(p0, mid, mid, p1, 10), 0.064);
  }
  const mx = 0, my = ey - 0.20;
  if (mouth === 'flat') line([[mx - 0.045, my], [mx + 0.045, my]], 0.028);
  else if (mouth === 'smirk') line(bez([mx - 0.05, my - 0.005], [mx - 0.01, my - 0.02], [mx + 0.03, my - 0.01], [mx + 0.065, my + 0.03]), 0.028);
  else if (mouth === 'frown') line(bez([mx - 0.055, my - 0.02], [mx - 0.02, my + 0.02], [mx + 0.02, my + 0.02], [mx + 0.055, my - 0.02]), 0.028);
  else if (mouth === 'smile') line(bez([mx - 0.075, my + 0.02], [mx - 0.03, my - 0.035], [mx + 0.03, my - 0.035], [mx + 0.075, my + 0.02]), 0.028);
  else if (mouth === 'wobble') line(bez([mx - 0.06, my], [mx - 0.03, my + 0.03], [mx, my - 0.03], [mx + 0.06, my + 0.005]), 0.026);
  else if (mouth === 'o') { g.beginPath(); g.ellipse(mx, my - 0.01, 0.036, 0.048, 0, 0, Math.PI * 2); g.fill(); }
  else if (mouth === 'open') {
    const top = bez([mx - 0.062, my + 0.018], [mx - 0.03, my + 0.004], [mx + 0.03, my + 0.004], [mx + 0.062, my + 0.018], 12);
    const bot = bez([mx + 0.062, my + 0.018], [mx + 0.05, my - 0.075], [mx - 0.05, my - 0.075], [mx - 0.062, my + 0.018], 14);
    g.beginPath(); [...top, ...bot].forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
    g.fillStyle = css([0.85, 0.22, 0.26]); g.beginPath(); g.ellipse(mx, my - 0.040, 0.030, 0.013, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = INK;
  }
  else if (mouth === 'grin') {
    const pts = bez([mx - 0.085, my + 0.025], [mx - 0.04, my - 0.06], [mx + 0.04, my - 0.06], [mx + 0.085, my + 0.025], 18);
    const shape = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.lineTo(mx - 0.085, my + 0.025); g.closePath(); };
    shape(); g.lineWidth = 0.028; g.stroke(); g.fillStyle = css([0.98, 0.98, 0.96]); g.fill(); g.fillStyle = INK;
  }
}
function atlas() {
  if (ATLAS) return ATLAS;
  const n = EXPR_KEYS.length * 3, rows = Math.ceil(n / COLS);
  const cv = document.createElement('canvas'); cv.width = COLS * CELL; cv.height = rows * CELL;
  const g = cv.getContext('2d');
  EXPR_KEYS.forEach((e, ei) => [0, 1, 2].forEach(b => {
    const i = ei * 3 + b, col = i % COLS, row = Math.floor(i / COLS);
    g.save(); g.translate(col * CELL + CELL / 2, row * CELL + CELL / 2); g.scale(CELL, -CELL);  // draw in W units, v up
    drawFace(g, e, b); g.restore();
  }));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  ATLAS = { tex, cols: COLS, rows };
  return ATLAS;
}
// spherical patch just above the head; UVs are the straight-on projection, so from the front it reads as the flat 2D face
function facePatch() {
  const R = 1.012, g = new THREE.SphereGeometry(HA * R, 48, 36, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.80, 1.6);
  g.scale(1, HEAD_H, 1);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / W, 0.5 + p.getY(i) / W);
  return g;
}

// ------------------------------------------------------------------ clothes (painted on the torso texture)
const TEX_W = 1536, TEX_H = 864;
function clothesCanvas(spec) {
  const T = TORSO, r = T.w / 2, v0 = T.cy - T.h / 2;
  const cv = document.createElement('canvas'); cv.width = TEX_W; cv.height = TEX_H; const g = cv.getContext('2d');
  // (u, v) on the front (W units) -> texture pixel; u wraps round the capsule by angle
  const P = (u, v) => [(0.5 + Math.asin(Math.max(-1, Math.min(1, u / r))) / (2 * Math.PI)) * TEX_W, (1 - (v - v0) / T.h) * TEX_H];
  const k = TEX_H / T.h;                                         // px per W, so widths stay in W units
  const poly = (pts, fill, ink = 0) => { g.beginPath(); pts.forEach((q, i) => { const [x, y] = P(...q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
    if (ink) { g.lineWidth = ink * k * 2; g.strokeStyle = css(INK_RGB); g.lineJoin = 'round'; g.stroke(); } g.fillStyle = css(fill); g.fill(); };
  const line = (pts, w, col) => { g.beginPath(); pts.forEach((q, i) => { const [x, y] = P(...q); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.lineWidth = w * k; g.strokeStyle = css(col); g.lineCap = g.lineJoin = 'round'; g.stroke(); };
  const dot = (c, rr, col) => { const [x, y] = P(...c); g.beginPath(); g.arc(x, y, rr * k, 0, Math.PI * 2); g.fillStyle = css(col); g.fill(); };
  const dense = (a, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  g.fillStyle = css(spec.shirt || [1, 1, 1]); g.fillRect(0, 0, TEX_W, TEX_H);
  const top = T.cy + T.h / 2, BRASS = [1.0, 0.70, 0.16];
  for (const c of spec.clothes || []) {
    if (c.vest) {
      g.fillStyle = css(c.vest); g.fillRect(0, 0, TEX_W, TEX_H);
      const L = s => [[s * 0.075, top + 0.02], [s * 0.075, top - 0.02], [s * 0.115, T.cy + 0.05], [s * 0.10, v0 + 0.03], [s * 0.10, v0 - 0.02]];
      const strip = [...L(-1).flatMap((q, i, a) => i ? dense(a[i - 1], q, 6).slice(1) : [q]), ...L(1).reverse().flatMap((q, i, a) => i ? dense(a[i - 1], q, 6).slice(1) : [q])];
      poly(strip, spec.shirt || [1, 1, 1]);
      for (const s of [-1, 1]) { line(L(s).slice(1, 4), 0.020, INK_RGB); dot([s * 0.19, T.cy + 0.14], 0.028, BRASS); }
      if (c.strap) {
        const a = [-T.w * 0.34, T.cy + T.h * 0.40], b = [T.w * 0.44, T.cy - T.h * 0.30];
        line(dense(a, b, 20), 0.085, INK_RGB); line(dense(a, b, 20), 0.050, c.strap);
      }
    }
    if (c.tie) {
      const t0 = top - 0.10;
      poly([[-0.045, t0], [0.045, t0], [0.075, t0 - 0.42], [0, t0 - 0.52], [-0.075, t0 - 0.42]], c.tie, 0.010);
      for (let i = 0; i < 4; i++) { const v = t0 - 0.08 - i * 0.10; line([[-0.05 - i * 0.006, v - 0.03], [0.05 + i * 0.006, v + 0.02]], 0.028, c.stripe || [1.0, 0.72, 0.35]); }
    }
    if (c.bowtie) {
      const v = top - 0.30;                                       // below the chin: the head hides the collar
      poly([[0, v], [-0.12, v - 0.07], [-0.12, v + 0.07]], c.bowtie, 0.009);
      poly([[0, v], [0.12, v + 0.07], [0.12, v - 0.07]], c.bowtie, 0.009);
      dot([0, v], 0.03, INK_RGB);
    }
    if (c.uniform) {
      const v = T.cy - T.h * 0.22;
      g.fillStyle = css([0.02, 0.02, 0.03]); const y = P(0, v)[1]; g.fillRect(0, y - 0.035 * k, TEX_W, 0.07 * k);
      poly([[-0.04, v - 0.04], [0.04, v - 0.04], [0.04, v + 0.04], [-0.04, v + 0.04]], BRASS, 0.007);
      dot([-0.14, T.cy + 0.22], 0.048, INK_RGB); dot([-0.14, T.cy + 0.22], 0.040, BRASS);
      for (const s of [-1, 1]) line(dense([s * 0.03, top - 0.02], [s * 0.05, v + 0.05], 8), 0.012, c.uniform.seam || [0.08, 0.11, 0.24]);
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function torsoGeo() {
  const T = TORSO, r = T.w / 2 * W, h = T.h * W, pr = [], n = 14;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / n; pr.push([r * Math.cos(a), r + r * Math.sin(a)]); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * i / n; pr.push([r * Math.cos(a), h - r + r * Math.sin(a)]); }
  const g = lathe(pr, 64); g.scale(1, 1, T.depth);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / h);
  return g;
}

// ------------------------------------------------------------------ limbs
class Tube {
  constructor(n, r, radial = 10) {
    this.n = n; this.r = r; this.k = radial;
    const g = new THREE.BufferGeometry(), idx = [];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * radial * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * radial * 3), 3));
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, inkMat); this.mesh.castShadow = true; this.mesh.frustumCulled = false;
  }
  set(pts) {
    const { n, r, k } = this, P = this.mesh.geometry.attributes.position, N = this.mesh.geometry.attributes.normal;
    const t = new THREE.Vector3(), nr = new THREE.Vector3(0, 0, 1), bn = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      t.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) { nr.set(0, 0, 1); if (Math.abs(nr.dot(t)) > 0.9) nr.set(1, 0, 0); }
      nr.addScaledVector(t, -nr.dot(t)).normalize();             // parallel transport: no twist along the limb
      bn.crossVectors(t, nr);
      for (let j = 0; j < k; j++) {
        const a = 2 * Math.PI * j / k; d.copy(nr).multiplyScalar(Math.cos(a)).addScaledVector(bn, Math.sin(a));
        P.setXYZ(i * k + j, pts[i].x + d.x * r, pts[i].y + d.y * r, pts[i].z + d.z * r); N.setXYZ(i * k + j, d.x, d.y, d.z);
      }
    }
    P.needsUpdate = N.needsUpdate = true;
  }
}
// Bone lengths (W). Leg = hip (v 1.38) to ankle (v 0.022) when straight; the arm hangs in a soft ~25 deg arc at rest.
export const LIMB = { thigh: 0.679, shin: 0.679, upper: 0.41, fore: 0.41, stub: 0.122 };
// Above this share of full reach the joint eases toward straight and the hose stretches (rubber hose), so a target is
// always reached exactly (feet never slide, props stay in the hand). Legs straighten fully (a standing leg never
// flickers bent); arms keep a soft 12 deg bend and stretch, easing over a wide range so a fast reach never snaps.
const SOFT = { leg: 0.965, arm: 0.96 };
// the hip-to-ankle distance (share of full leg length) at which the leg shows a knee flex of `flex` deg
export function legReach(flex) {
  const s = SOFT.leg, fs = 2 * Math.acos(s) / DEG;
  if (flex >= fs) return Math.cos(flex / 2 * DEG);
  let a = s, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (fs * (1 - sm(s, 1, m)) > flex) a = m; else b = m; }
  return (a + b) / 2;
}
const ROUND = { leg: 0.40, arm: 0.50 };                          // bend roundness: control-point reach as a share of the bone
const V = (a) => new THREE.Vector3(a[0], a[1], a[2] || 0);
// Arms never rubber-hose: exact two-bone geometry down to an elbow of ARM_MIN_FLEX; past that the bones stretch at most
// ARM_STRETCH and the hand stops short of its target (the body's reach assist in pose() keeps targets inside reach).
const ARM_MIN_FLEX = 15, ARM_STRETCH = 1.03;
// Two equal bones root -> joint -> end; pole = the side the joint points to. Returns the joint, the flex (deg, 0 = straight)
// and the end actually reached (an arm target past its reach is pulled in).
function ik(root, end, l, pole, soft, arm = false) {
  const ax = end.clone().sub(root); let d = Math.max(1e-6, ax.length()); ax.divideScalar(d);
  const rs = Math.cos(ARM_MIN_FLEX / 2 * DEG);
  if (arm && d > 2 * l * rs * ARM_STRETCH) { d = 2 * l * rs * ARM_STRETCH; end = root.clone().addScaledVector(ax, d); }
  const r = d / (2 * l), full = rr => 2 * Math.acos(Math.min(1, rr));
  const half = arm ? (r <= rs ? full(r) / 2 : ARM_MIN_FLEX / 2 * DEG) : r <= soft ? full(r) / 2 : full(soft) / 2 * (1 - sm(soft, 1, r));
  const perp = pole.clone().normalize(); perp.addScaledVector(ax, -perp.dot(ax));
  if (arm) {                                                       // pole near the arm's axis: blend toward down-and-out
    const fb = new THREE.Vector3(Math.sign(pole.x || 1) * 0.5, -1, -0.2).normalize(); fb.addScaledVector(ax, -fb.dot(ax));
    const w = Math.max(0, 1 - perp.length() / 0.45); perp.multiplyScalar(1 - w).addScaledVector(fb, w);
  }
  if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1).addScaledVector(ax, -ax.z);
  perp.normalize();
  const joint = root.clone().addScaledVector(ax, d / 2).addScaledVector(perp, d / 2 * Math.tan(half));
  return { joint, flex: 2 * half / DEG, end };
}
// One smooth tube through root, joint and end: two quadratic arcs sharing the chord direction as tangent at the joint,
// resampled to n points evenly by arc length (W units in, metres out).
function hose(a, k, e, round, n) {
  const t = e.clone().sub(a).normalize(), l1 = a.distanceTo(k), l2 = k.distanceTo(e);
  const c1 = k.clone().addScaledVector(t, -round * l1), c2 = k.clone().addScaledVector(t, round * l2), dense = [];
  const q = (p0, c, p1, s) => new THREE.Vector3().copy(p0).multiplyScalar((1 - s) ** 2).addScaledVector(c, 2 * (1 - s) * s).addScaledVector(p1, s * s);
  for (let i = 0; i <= 24; i++) dense.push(q(a, c1, k, i / 24));
  for (let i = 1; i <= 24; i++) dense.push(q(k, c2, e, i / 24));
  const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dense[i].distanceTo(dense[i - 1]));
  const out = [], tot = cum[cum.length - 1] || 1e-6; let j = 0;
  for (let i = 0; i < n; i++) {
    const s = tot * i / (n - 1); while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    out.push(dense[j].clone().lerp(dense[j + 1], Math.min(1, u)).multiplyScalar(W));
  }
  return out;
}
// FK arm in the figure's frame (gravity frame, not the leaning torso): fwd = upper arm swung forward (deg),
// out = away from the body (deg), flex = elbow bend (deg), the forearm folding forward and a little inward.
function armFK(sh, sg, a) {
  const f = (a.fwd || 0) * DEG, o = (a.out ?? 10) * DEG;
  const d = new THREE.Vector3(sg * Math.sin(o), -Math.cos(o) * Math.cos(f), Math.cos(o) * Math.sin(f)).normalize();
  const elbow = sh.clone().addScaledVector(d, LIMB.upper);
  const n = new THREE.Vector3(-sg * 0.25, 0, 1).addScaledVector(d, -new THREE.Vector3(-sg * 0.25, 0, 1).dot(d));
  if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
  n.normalize();
  const fl = (a.flex ?? 25) * DEG, fd = d.clone().multiplyScalar(Math.cos(fl)).addScaledVector(n, Math.sin(fl));
  return { elbow, hand: elbow.clone().addScaledVector(fd, LIMB.fore) };
}

function contactTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
}

// ------------------------------------------------------------------ reach assist
// When a hand target lies past REACH of the full arm, the body takes it there: the pelvis shifts toward it (weight onto
// the near leg), the torso rolls and pitches toward it, the shoulders twist, the knees give for a low target. A few
// damped Gauss-Newton steps on the over-reach, each parameter weighted by how readily a body uses it and held inside
// LIMITS of the pose it was given. Continuous in the targets, so a moving target never makes the body jump.
const REACH = 0.92;
const LIMITS = { dx: 0.28, lean: 20, pitch: [-12, 46], bob: [-0.18, 0.03], shTwist: 36 };
// how readily the body uses each (pitch 3 : lean 2 : pelvis shift 1.5 : twist 1.5 : knees 0.6), times the square of a
// natural step (0.1 W, 10 deg), so the shares do not depend on the units
const WEIGHT = { dx: 1.5 * 0.01, lean: 2 * 100, pitch: 3 * 100, bob: 0.6 * 0.01, shTwist: 1.5 * 100 };
const shoulderOf = (q, sg) => {
  const L = (q.lean || 0) * DEG, c = Math.cos(L), s = Math.sin(L), pt = (q.pitch || 0) * DEG, dx = q.dx || 0;
  const u = sg * TORSO.w * 0.40, y = SHOULDER_V + (q.shrug || 0) - HIP_V, yy = -u * s + y * c;
  const x = u * c + y * s + dx, a = (q.shTwist || 0) * DEG, uu = x - dx;
  return [dx + uu * Math.cos(a), yy * Math.cos(pt) + HIP_V + (q.bob || 0), yy * Math.sin(pt) + uu * Math.sin(a)];
};
export function reachAssist(P) {
  const front = new Set(P.front || []), T = [];
  for (const [side, sg] of [['L', -1], ['R', 1]]) {
    const h0 = P['hand' + side]; if (!h0) continue;
    const fk = P['armFK' + side], fw = fk ? Math.max(0, Math.min(1, fk.w ?? 1)) : 0;
    if (fw > 0.999) continue;
    T.push({ sg, w: 1 - fw, hand: [h0[0], h0[1], h0.length > 2 ? h0[2] : (front.has('arm' + side) ? 0.16 : 0.0)] });
  }
  if (!T.length) return P;
  const K = Object.keys(WEIGHT), q0 = Object.fromEntries(K.map(k => [k, P[k] || 0])), q = { ...q0, shrug: P.shrug || 0 };
  const lim = (k, x) => { const L = LIMITS[k], b = q0[k]; return Array.isArray(L) ? Math.max(Math.min(b, b + L[0]), Math.min(Math.max(b, b + L[1]), x)) : Math.max(b - L, Math.min(b + L, x)); };
  const over = (t, qq) => { const sh = shoulderOf(qq, t.sg); return Math.hypot(t.hand[0] - sh[0], t.hand[1] - sh[1], t.hand[2] - sh[2]) - REACH * 2 * LIMB.upper; };
  let moved = false;
  for (let it = 0; it < 6; it++) {
    for (const t of T) {
      const e = over(t, q); if (e <= 1e-5) continue;
      const g = {}; let gg = 0;
      for (const k of K) { const h = k === 'dx' || k === 'bob' ? 0.005 : 0.25, qq = { ...q, [k]: q[k] + h }; g[k] = (over(t, qq) - e) / h; gg += WEIGHT[k] * g[k] * g[k]; }
      if (gg < 1e-9) continue;
      for (const k of K) q[k] = lim(k, q[k] - 0.8 * t.w * e * WEIGHT[k] * g[k] / gg);   // a half-busy hand gets half the help
      moved = true;
    }
  }
  if (!moved) return P;
  return { ...P, ...Object.fromEntries(K.map(k => [k, q[k]])), assist: +Math.abs(q.pitch - q0.pitch + q.lean - q0.lean).toFixed(2) };
}

// ------------------------------------------------------------------ the figure
export function makeStick(spec) {
  const root = new THREE.Group(); root.name = spec.name || 'stick'; root.userData.stick = true;   // look.js: no screen ink (own hull)
  const body = new THREE.Group(); root.add(body);
  const torso = solid(torsoGeo(), toon([1, 1, 1], { map: clothesCanvas(spec), sheen: 0.45, rough: 0.30, rim: 0.12, soft: 0.6, shade: [0.62, 0.64, 0.88], rimLit: 0.30 }));
  torso.position.y = (TORSO.cy - TORSO.h / 2 - HIP_V) * W; body.add(torso);

  const head = new THREE.Group(); root.add(head);
  const hg = new THREE.SphereGeometry(HA, 64, 40); hg.scale(1, HEAD_H, 1);
  const headSolid = solid(hg, toon(spec.skin || [1, 1, 1], { shade: [0.74, 0.74, 0.92], rim: 0.12, sheen: 0.55, broad: 0.30, rough: 0.25, soft: 0.6, rimLit: 0.45 }));
  head.add(headSolid);
  const rig = new THREE.Group(); head.add(rig);
  const A = atlas(), map = A.tex.clone(); map.repeat.set(1 / A.cols, 1 / A.rows);
  const face = new THREE.Mesh(facePatch(), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  face.userData.noPrepass = true; face.renderOrder = 2; rig.add(face);
  if (spec.glasses) rig.add(glasses());
  for (const f of spec.hair || []) head.add(f());

  const limbs = { armL: new Tube(16, LIMB_R), armR: new Tube(16, LIMB_R), legL: new Tube(18, LIMB_R), legR: new Tube(18, LIMB_R) };
  const dotGeo = new THREE.SphereGeometry(0.040 * W, 16, 10), jointGeo = new THREE.SphereGeometry(LIMB_R * 1.05, 10, 8);
  const ball = geo => { const m = new THREE.Mesh(geo, inkMat); m.castShadow = true; root.add(m); return m; };
  const hands = { L: ball(dotGeo), R: ball(dotGeo) }, ankles = { L: ball(jointGeo), R: ball(jointGeo) }, toes = { L: ball(jointGeo), R: ball(jointGeo) };
  for (const t of Object.values(limbs)) root.add(t.mesh);

  const contact = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: lin(0.05, 0.09, 0.22),
    alphaMap: contactTex(), transparent: true, opacity: 0.42, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.scale.set(0.48 * W, 0.24 * W, 1); contact.position.set(0.03 * W, 0.004, 0);
  contact.userData.noPrepass = true; root.add(contact);

  const S = { root, yaw: 0, hand: {}, parts: { head: headSolid, torso, toes, ankles, hands } };
  const inv = new THREE.Matrix4();

  // pos (Blender metres), and either yaw (deg, 0 = facing Blender -Y) or face (a Blender point to turn toward)
  S.place = (P = {}) => {
    if (P.pos) root.position.copy(B(...P.pos));
    if (P.yaw != null) S.yaw = P.yaw * DEG;
    else if (P.face) { const d = B(...P.face).sub(root.position); S.yaw = Math.atan2(d.x, d.z); }
    root.rotation.y = S.yaw + (P.yaw_extra || 0) * DEG;
    root.updateMatrixWorld(true);
  };
  // a Blender world point -> this figure's (u, v) in W units
  S.toLocal = pB => { inv.copy(root.matrixWorld).invert(); const v = B(...pB).applyMatrix4(inv); return [v.x / W, v.y / W]; };

  // face only (expression cell, blink, eye slide): the reel runtime sets it after every prop has moved this frame
  S.face = (P = {}) => {
    const e = EXPR[P.expr] ? P.expr : 'neutral', cell = EXPR_KEYS.indexOf(e) * 3 + (P.blink || 0);
    map.offset.set((cell % A.cols) / A.cols, 1 - (Math.floor(cell / A.cols) + 1) / A.rows);
    rig.rotation.set(-(P.look_v || 0) * 0.12, (P.look || 0) * LOOK_RAD, 0);
  };
  // Extra keys for the reel runtime: pitch (deg, upper body forward about the hip), hands and feet may carry a
  // third number = depth toward where the figure faces (W), kneeF{L,R} = knee pushed forward (W), toeF = toe reach.
  S.pose = (P = {}) => {
    S.place(P);
    P = reachAssist(P);
    const dx = P.dx || 0, dz = P.bob || 0, lean = (P.lean || 0) * DEG, c = Math.cos(lean), s = Math.sin(lean);
    const pt = (P.pitch || 0) * DEG, pc = Math.cos(pt), ps = Math.sin(pt);
    const bt = (u, v) => { const y = v - HIP_V, yy = -u * s + y * c; return [u * c + y * s + dx, yy * pc + HIP_V + dz, yy * ps]; };
    body.position.set(dx * W, (HIP_V + dz) * W, 0); body.rotation.set(pt, 0, -lean);
    const hc = bt(HEAD_C[0] + (P.head_dx || 0), HEAD_C[1] + (P.head_dv || 0));
    head.position.set(hc[0] * W, hc[1] * W, hc[2] * W);
    head.rotation.set(pt * 0.6 + (P.head_pitch || 0) * DEG, 0, -(lean + (P.head_tilt || 0) * DEG));
    S.face(P);
    // Limbs. Extra keys: elbow{L,R} / kneeDir (or kneeDir{L,R}) = pole vectors (figure-local), armFK{L,R} =
    // {fwd, out, flex, w} swing the arm from the shoulder (w blends it over the hand target), footPitch{L,R} (deg,
    // + = toe up), shTwist / hipTwist (deg, + = the right shoulder / hip forward). Legacy bend{L,R} only picks a side.
    const front = new Set(P.front || []), rig = { pitch: P.pitch || 0, roll: P.lean || 0, assist: P.assist || 0, body: [P.dx || 0, P.bob || 0, P.shTwist || 0].map(x => +x.toFixed(3)) };
    const twist = (q, deg) => { const a = (deg || 0) * DEG, u = q[0] - dx; return [dx + u * Math.cos(a), q[1], q[2] + u * Math.sin(a)]; };
    for (const [side, sg] of [['L', -1], ['R', 1]]) {
      const sh = V(twist(bt(sg * TORSO.w * 0.40, SHOULDER_V + (P.shrug || 0) + (P['shrug' + side] || 0)), P.shTwist)), h0 = P['hand' + side];
      let hand = V(h0 ? [h0[0], h0[1], h0.length > 2 ? h0[2] : (front.has('arm' + side) ? 0.16 : 0.0)] : bt(sg * 0.41, 1.22));
      let pole;
      if (P['elbow' + side]) pole = V(P['elbow' + side]);
      else {
        pole = new THREE.Vector3(sg * 0.6, -0.2, -0.75);
        const b = P['bend' + side];
        if (b) { const ex = hand.x - sh.x, ey = hand.y - sh.y, ln = Math.hypot(ex, ey) || 1, k = Math.max(-1, Math.min(1, b / 0.1)); pole.multiplyScalar(0.4).add(new THREE.Vector3(-ey / ln * k, ex / ln * k, 0)); }
      }
      const fk = P['armFK' + side], fw = fk ? Math.max(0, Math.min(1, fk.w ?? 1)) : 0;
      if (fw > 0) {
        const k = armFK(sh, sg, fk), mid = sh.clone().lerp(k.hand, 0.5);
        hand.lerp(k.hand, fw); pole.normalize().lerp(k.elbow.clone().sub(mid).normalize(), fw);
      }
      const arm = ik(sh, hand, LIMB.upper, pole, SOFT.arm, true);
      hand = arm.end;
      const pts = hose(sh, arm.joint, hand, ROUND.arm, 16);
      limbs['arm' + side].set(pts); hands[side].position.copy(pts[15]); S.hand[side] = hand.toArray();
      const hb = bt(sg * 0.14, HIP_V + 0.04), hip = V(twist([hb[0], hb[1], 0], P.hipTwist));
      const f0 = P['foot' + side] || [sg * 0.22, 0.022], foot = V(f0);
      const kp = P['kneeDir' + side] || P.kneeDir || [sg * 0.15, 0, 1];
      const leg = ik(hip, foot, LIMB.thigh, V(kp), SOFT.leg);
      const lp = hose(hip, leg.joint, foot, ROUND.leg, 13);
      const td = P['toe' + side] ?? sg, h = new THREE.Vector3(0.10 * td, 0, P.toeF ?? 0.07).normalize(), pt = (P['footPitch' + side] || 0) * DEG;
      h.applyAxisAngle(new THREE.Vector3(0, 1, 0), (P['footYaw' + side] ?? P.footYaw ?? 0) * DEG);   // + turns the toe toward the figure's right
      const toeL = foot.clone().addScaledVector(h, LIMB.stub * Math.cos(pt)); toeL.y += LIMB.stub * Math.sin(pt) - 0.004;
      const toe = toeL.clone().multiplyScalar(W);
      for (let i = 1; i <= 5; i++) lp.push(lp[12].clone().lerp(toe, i / 5));
      limbs['leg' + side].set(lp); ankles[side].position.copy(lp[12]); toes[side].position.copy(toe);
      rig[side] = { hip, knee: leg.joint, ankle: foot, toe: toeL, shoulder: sh, elbow: arm.joint, hand,
        kneeFlex: leg.flex, elbowFlex: arm.flex, footPitch: P['footPitch' + side] || 0 };
    }
    S.rig = rig;
    contact.visible = P.contact !== false;
    contact.position.y = 0.004 + (P.ground || 0) * W;
    root.updateMatrixWorld(true);
    return S;
  };
  // the last pose's joints in Blender world metres (y = depth), flexes and pitches in degrees, for __dbg
  S.rigWorld = () => {
    const w = q => { const v = q.clone().multiplyScalar(W).applyMatrix4(root.matrixWorld); return [v.x, -v.z, v.y].map(x => +x.toFixed(4)); };
    const o = { torsoLean: +S.rig.pitch.toFixed(2), torsoRoll: +S.rig.roll.toFixed(2), assist: S.rig.assist, body: S.rig.body };
    for (const s of ['L', 'R']) {
      const r = S.rig[s];
      o[s] = { hip: w(r.hip), knee: w(r.knee), ankle: w(r.ankle), toe: w(r.toe), shoulder: w(r.shoulder), elbow: w(r.elbow), hand: w(r.hand),
        kneeFlex: +r.kneeFlex.toFixed(2), elbowFlex: +r.elbowFlex.toFixed(2), footPitch: +r.footPitch.toFixed(2) };
    }
    return o;
  };
  S.pose({});
  return S;
}

// ------------------------------------------------------------------ our cast
export const KAI = { name: 'Kai', shirt: [1, 1, 1], glasses: true, hair: [curls([0.42, 0.20, 0.08]), bandana()],
  clothes: [{ vest: [0.95, 0.30, 0.06], strap: [0.08, 0.50, 0.22] }] };
export const TELLER = { name: 'Teller', shirt: [1, 1, 1], hair: [hairCap([0.30, 0.17, 0.09]), visor([0.06, 0.45, 0.24])],
  clothes: [{ vest: [0.07, 0.38, 0.26] }, { bowtie: [0.80, 0.06, 0.08] }] };
export const GUARD = { name: 'Guard', shirt: [0.14, 0.21, 0.46], hair: [guardCap()], clothes: [{ uniform: {} }] };
