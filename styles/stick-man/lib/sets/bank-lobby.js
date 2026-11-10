// First Halden Bank lobby (our own set). Blender coordinates (x right, y into the room, z up), metres.
// Room x -3.6..5, y -8..7, ceiling 6.2; sun comes through three windows in the left wall.
import * as THREE from 'three';
import { B, lin, css, std } from '../../engine/look.js';

export const SUN_DIR = [0.76, -0.38, -0.53];                    // direction the light travels (Blender)
export const ROOM = { X0: -3.6, X1: 5.0, Y0: -8.0, Y1: 7.0, H: 6.2 };
export const COUNTER = { CX0: 1.3, CX1: 2.0, CY0: -0.5, CH: 1.12 };
export const STACK = [1.52, 0.86, 1.19];                         // counter top under the cash stack
export const TELLER_SPOT = [2.30, 0.95, 0.33];                   // on the raised floor behind the counter

function lcg(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function bricks({ c1, c2, mortar, bw, bh, gap, offset, nx, ny, ppm = 256, bevel = 0.5, seed = 7 }) {
  const rnd = lcg(seed), Wt = Math.round(bw * nx * ppm), Ht = Math.round(bh * ny * ppm);
  const cv = document.createElement('canvas'); cv.width = Wt; cv.height = Ht; const g = cv.getContext('2d');
  g.fillStyle = css(mortar); g.fillRect(0, 0, Wt, Ht);
  const gp = Math.max(1.5, gap * ppm), bwp = bw * ppm, bhp = bh * ppm;
  for (let r = 0; r < ny; r++) {
    const off = ((r * offset) % 1) * bwp;
    for (let c = -1; c <= nx; c++) {
      const t = rnd(), col = [0, 1, 2].map(i => c1[i] + (c2[i] - c1[i]) * t);
      const x = c * bwp + off + gp / 2, y = Ht - (r + 1) * bhp + gp / 2, w = bwp - gp, h = bhp - gp;
      g.fillStyle = css(col); g.fillRect(x, y, w, h);
      if (bevel > 0) {                                           // soft bevel: light top edge, dark bottom and right edge
        const e = Math.min(6, h * 0.12);
        g.fillStyle = `rgba(255,255,255,${0.12 * bevel})`; g.fillRect(x, y, w, e);
        g.fillStyle = `rgba(40,20,60,${0.14 * bevel})`; g.fillRect(x, y + h - e, w, e); g.fillRect(x + w - e * 0.6, y, e * 0.6, h);
      }
    }
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = 8; tx.userData.tile = [bw * nx, bh * ny]; return tx;
}
// Blender's checker alternates colour every 0.4 m while the grout (brick mortar) runs every 0.8 m
function checker(c1, c2, size, line) {
  const P = 512, cv = document.createElement('canvas'); cv.width = cv.height = P; const g = cv.getContext('2d');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = css((i + j) % 2 ? c2 : c1); g.fillRect(i * P / 2, j * P / 2, P / 2, P / 2); }
  g.fillStyle = css(line); const lw = Math.max(1.5, 0.006 * P / size);
  g.fillRect(0, 0, lw / 2, P); g.fillRect(P - lw / 2, 0, lw / 2, P); g.fillRect(0, 0, P, lw / 2); g.fillRect(0, P - lw / 2, P, lw / 2);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = 16; tx.userData.tile = [size, size]; return tx;
}

export async function buildBankLobby(stage) {
  const { scene, prop, glow } = stage;
  const T = {
    stone: bricks({ c1: [1.0, 0.72, 0.34], c2: [0.96, 0.64, 0.28], mortar: [0.60, 0.36, 0.16], bw: 1.0, bh: 0.46, gap: 0.012, offset: 0.5, nx: 4, ny: 8 }),
    tile: bricks({ c1: [0.03, 0.46, 0.42], c2: [0.02, 0.38, 0.36], mortar: [0.01, 0.14, 0.15], bw: 0.42, bh: 0.21, gap: 0.02, offset: 0.5, nx: 6, ny: 6, ppm: 400, bevel: 1.2, seed: 11 }),
    floor: checker([0.90, 0.84, 0.68], [0.16, 0.50, 0.46], 0.8, [0.22, 0.24, 0.24]),
    wood: bricks({ c1: [0.56, 0.24, 0.09], c2: [0.49, 0.20, 0.08], mortar: [0.22, 0.09, 0.04], bw: 1.7, bh: 0.19, gap: 0.004, offset: 0.37, nx: 2, ny: 10, ppm: 300, bevel: 0.3, seed: 5 }),
  };
  const tex = (t, axes, rough) => { const m = new THREE.MeshStandardMaterial({ map: t, roughness: rough }); m.userData.axes = axes; return m; };
  const M = {
    stone: tex(T.stone, 'XZ', 0.8), stone_y: tex(T.stone, 'YZ', 0.8),
    tile: tex(T.tile, 'XZ', 0.3), tile_y: tex(T.tile, 'YZ', 0.3),
    floor: tex(T.floor, 'XY', 0.85),
    wood: tex(T.wood, 'YZ', 0.5), wood_x: tex(T.wood, 'XZ', 0.5),
    wood_dark: std([0.22, 0.08, 0.03], 0.5), marble: std([0.95, 0.92, 0.86], 0.2),
    brass: std([1.0, 0.62, 0.10], 0.28, { emissive: lin(1.0, 0.62, 0.10), emissiveIntensity: 0.06 }),
    steel: std([0.52, 0.64, 0.82], 0.3), steel_dark: std([0.20, 0.28, 0.42], 0.35),
    green: std([0.02, 0.26, 0.18], 0.5), ceiling: std([0.10, 0.44, 0.46], 0.9), beam: std([0.30, 0.13, 0.05], 0.6),
    black: std([0.03, 0.03, 0.04], 0.5), cash: std([0.30, 0.66, 0.26], 0.7), band: std([0.96, 0.92, 0.74], 0.7),
    lampshade: std([0.02, 0.45, 0.20], 0.3, { emissive: lin(0.1, 0.9, 0.4), emissiveIntensity: 0.25 }),
    glow: new THREE.MeshBasicMaterial({ color: lin(1.0, 0.86, 0.60).multiplyScalar(5.0) }),
    sky: new THREE.MeshBasicMaterial({ color: lin(0.50, 0.76, 1.0).multiplyScalar(1.6) }),
  };

  function planarUV(mesh) {
    const ax = mesh.material.userData.axes; if (!ax) return;
    const [tw, th] = mesh.material.map.userData.tile, p = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv, v = new THREE.Vector3();
    mesh.updateMatrixWorld();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      const bl = { X: v.x, Y: -v.z, Z: v.y };
      uv.setXY(i, bl[ax[0]] / tw, bl[ax[1]] / th);
    }
    uv.needsUpdate = true;
  }
  function add(mesh, ink, cast = true) {
    mesh.castShadow = cast; mesh.receiveShadow = true;
    scene.add(mesh); planarUV(mesh); if (ink) prop(mesh); return mesh;
  }
  function box(lo, hi, mat, ink = true) {
    const a = B(...lo), b = B(...hi);
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.z - a.z)), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); return add(m, ink);
  }
  function cyl(loc, r, h, mat, axis = 'Y', seg = 48, r2 = r) {     // axis along Blender Y (into the wall) unless 'Z'
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat);
    m.position.copy(B(...loc)); if (axis === 'Y') m.rotation.x = Math.PI / 2; return add(m, true);
  }
  function sphere(loc, r, mat, ink = true) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), mat); m.position.copy(B(...loc)); return add(m, ink); }

  const { X0, X1, Y0, Y1, H } = ROOM;
  // ---- shell (no ink)
  box([X0 - 0.4, Y0, -0.2], [X1 + 0.4, Y1 + 0.4, 0], M.floor, false);
  box([X0 - 0.4, Y0, H], [X1 + 0.4, Y1 + 0.4, H + 0.2], M.ceiling, false);
  box([X0 - 0.4, Y1, 0], [X1 + 0.4, Y1 + 0.4, H], M.stone, false);
  box([X1, Y0, 0], [X1 + 0.4, Y1, H], M.stone_y, false);
  box([X0 - 0.4, Y0 - 0.4, 0], [X1 + 0.4, Y0, H], M.stone, false);
  const wins = [[-0.5, 1.7], [3.05, 1.7], [6.0, 1.3]], WZ0 = 1.5, WZ1 = 5.0;
  const edges = [Y0, ...wins.flatMap(([c, w]) => [c - w / 2, c + w / 2]), Y1];
  for (let i = 0; i < edges.length; i += 2) box([X0 - 0.4, edges[i], 0], [X0, edges[i + 1], H], M.stone_y, false);
  for (const [cy, w] of wins) {
    box([X0 - 0.4, cy - w / 2, 0], [X0, cy + w / 2, WZ0], M.stone_y, false);
    box([X0 - 0.4, cy - w / 2, WZ1], [X0, cy + w / 2, H], M.stone_y, false);
    const fx = X0 - 0.2;
    box([X0 - 0.45, cy - w / 2 - 0.08, WZ0 - 0.08], [X0 + 0.12, cy + w / 2 + 0.08, WZ0], M.marble);
    for (let k = 0; k < 4; k++) { const y = cy - w / 2 + k * w / 3; box([fx - 0.035, y - 0.035, WZ0], [fx + 0.035, y + 0.035, WZ1], M.green); }
    for (let k = 0; k < 6; k++) { const z = WZ0 + k * (WZ1 - WZ0) / 5; box([fx - 0.035, cy - w / 2, z - 0.035], [fx + 0.035, cy + w / 2, z + 0.035], M.green); }
  }
  box([X0 - 6, Y0 - 4, -2], [X0 - 5.9, Y1 + 8, 14], M.sky, false).castShadow = false;
  const WH = 1.25;
  box([X0, Y1 - 0.05, 0], [X1, Y1, WH], M.tile, false);
  box([X1 - 0.05, Y0, 0], [X1, Y1, WH], M.tile_y, false);
  box([X0, Y0, 0], [X0 + 0.05, Y1, WH], M.tile_y, false);
  box([X0, Y1 - 0.09, WH], [X1, Y1, WH + 0.07], M.brass);
  box([X1 - 0.09, Y0, WH], [X1, Y1, WH + 0.07], M.brass);
  box([X0, Y0, WH], [X0 + 0.09, Y1, WH + 0.07], M.brass);
  box([X0, Y1 - 0.18, H - 0.35], [X1, Y1, H], M.marble);
  for (const y of [-4.5, -1.5, 1.5, 4.5]) box([X0, y - 0.14, H - 0.36], [X1, y + 0.14, H], M.beam);

  // ---- pendant lamps
  for (const [x, y] of [[-1.2, 0.0], [-1.2, 4.0], [3.4, 2.2], [3.4, 5.6], [-1.2, -4.0]]) {
    cyl([x, y, H - 0.75], 0.015, 1.5, M.black, 'Z', 10);
    cyl([x, y, H - 1.52], 0.16, 0.10, M.brass, 'Z', 32, 0.06);
    glow(sphere([x, y, H - 1.78], 0.24, M.glow), 0.35).castShadow = false;
    const pl = new THREE.PointLight(lin(1.0, 0.80, 0.55), 4.0, 0, 2); pl.position.copy(B(x, y, H - 2.15)); scene.add(pl);
  }

  // ---- teller counter with raised panels, and the raised floor the tellers stand on
  const { CX0, CX1, CY0, CH } = COUNTER;
  box([CX1, CY0, 0], [X1, Y1, TELLER_SPOT[2]], M.wood_dark);
  box([CX0, CY0, 0.10], [CX1, Y1, CH], M.wood);
  box([CX0 - 0.04, CY0 - 0.04, 0], [CX1 + 0.04, Y1, 0.12], M.wood_dark);
  box([CX0 - 0.10, CY0 - 0.10, CH], [CX1 + 0.08, Y1, CH + 0.07], M.marble);
  for (let y = CY0 + 0.25; y + 1.0 < Y1; y += 1.2) {
    box([CX0 - 0.025, y, 0.30], [CX0, y + 1.0, CH - 0.14], M.wood_x);
    box([CX0 - 0.035, y + 0.10, 0.40], [CX0 - 0.02, y + 0.90, CH - 0.24], M.wood_dark);
  }
  box([CX0 + 0.08, CY0 - 0.025, 0.30], [CX1 - 0.08, CY0, CH - 0.14], M.wood_dark);
  box([CX0 - 0.10, CY0 - 0.10, CH + 0.07], [CX0 - 0.06, Y1, CH + 0.10], M.brass);
  for (const sy of [2.15, 4.3, 6.2]) {                           // banker lamps
    const bx = CX1 - 0.16;
    cyl([bx, sy, CH + 0.085], 0.085, 0.03, M.brass, 'Z', 24);
    cyl([bx, sy, CH + 0.22], 0.012, 0.26, M.brass, 'Z', 10);
    const sh = glow(cyl([bx - 0.06, sy, CH + 0.37], 0.075, 0.30, M.lampshade, 'Z', 20), 0.6); sh.rotation.set(Math.PI / 2, 0, 0);
    const l = new THREE.PointLight(lin(1.0, 0.9, 0.65), 0.6, 2.5, 2); l.position.copy(B(bx - 0.12, sy, CH + 0.27)); scene.add(l);
  }
  // cash stack on the counter (hero prop)
  const [hx, hy, hz] = [CX0 + 0.22, 0.86, CH + 0.07];
  for (const [dx, dy, dz, rot] of [[0, 0, 0, 0.12], [0.01, 0.01, 0.045, -0.10], [-0.01, 0, 0.09, 0.22], [0.30, 0.20, 0, 1.35], [0.31, 0.21, 0.045, 1.15]]) {
    const g = new THREE.Group(); g.position.copy(B(hx + dx, hy + dy, hz + dz)); g.rotation.y = rot;
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.15), M.cash); a.position.y = 0.0225;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.049, 0.156), M.band); b.position.y = 0.0225;
    for (const m of [a, b]) { m.castShadow = m.receiveShadow = true; g.add(m); }
    scene.add(g); prop(g);
  }
  // service bell
  cyl([CX0 + 0.16, -0.22, CH + 0.078], 0.06, 0.016, M.black, 'Z', 24);
  sphere([CX0 + 0.16, -0.22, CH + 0.10], 0.05, M.steel);

  // ---- vault on the back wall
  const vx = 3.45, vz = 1.95, vr = 1.45;
  cyl([vx, Y1 - 0.08, vz], vr + 0.22, 0.30, M.steel_dark, 'Y', 64);
  cyl([vx, Y1 - 0.28, vz], vr, 0.22, M.steel, 'Y', 64);
  cyl([vx, Y1 - 0.41, vz], vr * 0.78, 0.05, M.steel_dark, 'Y', 64);
  cyl([vx, Y1 - 0.44, vz], vr * 0.70, 0.04, M.steel, 'Y', 64);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; cyl([vx + Math.cos(a) * vr * 0.88, Y1 - 0.40, vz + Math.sin(a) * vr * 0.88], 0.07, 0.07, M.brass, 'Y', 16); }
  cyl([vx, Y1 - 0.52, vz], 0.20, 0.16, M.brass, 'Y', 32);
  for (let i = 0; i < 3; i++) { const a = (i * 60 + 15) * Math.PI / 180, m = cyl([vx, Y1 - 0.58, vz], 0.035, 1.25, M.steel_dark, 'Z', 12); m.rotation.set(0, 0, -a); }
  for (let i = 0; i < 6; i++) { const a = (i * 60 + 15) * Math.PI / 180; sphere([vx + Math.sin(a) * 0.625, Y1 - 0.58, vz + Math.cos(a) * 0.625], 0.075, M.brass); }
  for (const zz of [vz + 0.75, vz - 0.75]) box([vx + vr - 0.05, Y1 - 0.42, zz - 0.16], [vx + vr + 0.30, Y1 - 0.12, zz + 0.16], M.steel_dark);

  // ---- sign band; lettering is a cut-out plane with no ink, like Blender's W_noink
  box([0.2, Y1 - 0.10, 4.05], [X1 - 0.3, Y1, 5.05], M.green);
  box([0.2, Y1 - 0.13, 5.02], [X1 - 0.3, Y1, 5.09], M.brass);
  box([0.2, Y1 - 0.13, 4.01], [X1 - 0.3, Y1, 4.08], M.brass);
  try { await document.fonts.load('bold 200px Rockwell'); } catch { /* fall back to Georgia */ }
  {
    const cv = document.createElement('canvas'); cv.width = 2400; cv.height = 300; const g = cv.getContext('2d');
    g.font = 'bold 190px Rockwell, "Rockwell Extra Bold", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '10px';
    g.fillStyle = 'rgb(70,40,5)'; g.fillText('FIRST HALDEN BANK', 1205, 167);
    g.fillStyle = '#fff'; g.fillText('FIRST HALDEN BANK', 1200, 160);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tx, color: lin(1.0, 0.66, 0.14), roughness: 0.28, alphaTest: 0.5,
      emissive: lin(1.0, 0.66, 0.14), emissiveIntensity: 0.10, emissiveMap: tx });
    const w = 4.6, m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 300 / 2400), mat);
    m.position.copy(B(2.45, Y1 - 0.125, 4.55)); m.receiveShadow = true; m.userData.noPrepass = true; scene.add(m);
  }
  // ---- door to the back office
  box([-0.95, Y1 - 0.09, 0], [0.15, Y1, 2.55], M.wood_dark);
  box([-0.85, Y1 - 0.11, 0.02], [0.05, Y1 - 0.04, 2.45], M.wood_x);
  box([-0.72, Y1 - 0.125, 1.75], [-0.08, Y1 - 0.11, 1.98], M.brass);
  sphere([-0.05, Y1 - 0.16, 1.1], 0.05, M.brass);
  // ---- deposit boxes on the right wall
  for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
    const yy = 0.2 + c * 0.62, zz = 1.45 + r * 0.42;
    box([X1 - 0.10, yy, zz], [X1 - 0.04, yy + 0.56, zz + 0.36], M.steel);
    sphere([X1 - 0.11, yy + 0.28, zz + 0.18], 0.03, M.brass);
  }

  // ---- light: sun, plus warm bounce where each window's sun pool lands (floor and counter front)
  const sd = new THREE.Vector3(...SUN_DIR).normalize();
  for (const [cy] of wins) {
    const zc = (WZ0 + WZ1) / 2, t = zc / -sd.z, px = X0 + sd.x * t, py = cy + sd.y * t;
    const onCounter = px > CX0 - 0.2;
    stage.addBounce([Math.min(px, CX0 - 0.35), py, onCounter ? 0.6 : 0.25], [1.0, 0.70, 0.42], 1.6, 4.5);
  }
  stage.addBounce([X1 - 1.0, 0.5, 2.0], [1.0, 0.75, 0.50], 0.8, 5.0);       // right wall picks up the lit floor
  return { M, wins };
}
