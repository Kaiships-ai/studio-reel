// First Halden Bank lobby (our own set). Blender coordinates (x right, y into the room, z up), metres.
// Room x -3.6..5, y -8..7, ceiling 6.2; sun comes through three windows in the left wall.
import * as THREE from 'three';
import { B, lin, css, std } from '../../engine/look.js';

export const SUN_DIR = [0.76, -0.38, -0.53];                    // direction the light travels (Blender)
export const SUN_CENTER = [0.2, 1.8, 1.0], SUN_HALF = 6.8;     // one fixed shadow fit (room, doorway, pavement): no shimmer as shots move
export const ROOM = { X0: -3.6, X1: 5.0, Y0: -8.0, Y1: 7.0, H: 6.2 };
export const COUNTER = { CX0: 1.3, CX1: 2.0, CY0: -0.5, CH: 0.98 };   // low enough that props on top read from 1.1-1.4 m
const CT = COUNTER.CH + 0.07;                                    // counter top surface
export const STACK = [1.90, 0.70, CT + 0.016];                   // the twenties, sitting on the metal plate
export const TELLER_SPOT = [2.34, 1.00, 0.33];                   // on the raised floor behind the counter
// the entrance: double doors in the left wall between the first two windows, daylight and street outside
export const DOOR = { x: ROOM.X0, y0: 0.50, y1: 2.04, h: 2.75 };
// named marks (where a figure's root stands) and places (props, hand targets); Blender metres
export const MARKS = {
  customer: [0.92, 1.10, 0], teller: TELLER_SPOT, bench: [-1.20, 4.20, 0],
  door: [DOOR.x - 0.2, (DOOR.y0 + DOOR.y1) / 2, 0], street: [-6.2, (DOOR.y0 + DOOR.y1) / 2, 0],
};
export const PLACES = {
  plate: [1.90, 0.70, CT], stack: STACK, b1: [1.84, 1.10, CT], b2: [1.86, 1.30, CT],
  note: [1.22, 0.94, CT], note_end: [1.33, 0.90, CT], bag_on_counter: [1.53, 1.30, CT + 0.03],
  bag_grip: [1.436, 1.246, CT + 0.34],                           // Kai's hand on the near rim of the open bag (centre 1.53, 1.30; he faces yaw 30)
  sensor: [DOOR.x + 0.06, DOOR.y1 + 0.06, DOOR.h - 0.16],          // on the lobby-side casing, top of the north jamb
};
// solid set pieces a body must never be inside (Blender boxes, metres; checked by __dbg collide): the counter (top slab
// included) and the raised floor behind it (a foot standing on it is on its top face, so it gets 3 cm of grace)
export const COLLIDE = [
  { name: 'counter', lo: [COUNTER.CX0 - 0.10, COUNTER.CY0 - 0.10, 0], hi: [COUNTER.CX1 + 0.08, ROOM.Y1, COUNTER.CH + 0.07] },
  { name: 'raised-floor', lo: [COUNTER.CX1, COUNTER.CY0, 0], hi: [ROOM.X1, ROOM.Y1, TELLER_SPOT[2]], grace: 0.03 },
];
export const BENCH_YAW = -100;                                    // the bench (and its sleeper) faces the door
export const CAMERA_SIDE = [0, -1];                              // default side two-shots are seen from
// where a camera may go (x, y boxes): the lobby, kept 1.6 m off the entrance wall so the doorway reads at an angle
export const CAMERA_ROOM = [[[ROOM.X0 + 1.6, ROOM.Y0 + 0.5], [ROOM.X1 - 0.5, ROOM.Y1 - 0.6]]];

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

export const build = stage => buildBankLobby(stage);
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
  for (let i = 0; i < edges.length; i += 2) {
    const [a, b] = [edges[i], edges[i + 1]];
    if (a < DOOR.y0 && b > DOOR.y1) {                           // the pier the entrance is cut into
      box([X0 - 0.4, a, 0], [X0, DOOR.y0, H], M.stone_y, false);
      box([X0 - 0.4, DOOR.y1, 0], [X0, b, H], M.stone_y, false);
      box([X0 - 0.4, DOOR.y0, DOOR.h], [X0, DOOR.y1, H], M.stone_y, false);
    } else box([X0 - 0.4, a, 0], [X0, b, H], M.stone_y, false);
  }
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
  for (const [a, b] of [[Y0, DOOR.y0 - 0.13], [DOOR.y1 + 0.13, Y1]]) box([X0, a, 0], [X0 + 0.05, b, WH], M.tile_y, false);
  box([X0, Y1 - 0.09, WH], [X1, Y1, WH + 0.07], M.brass);
  box([X1 - 0.09, Y0, WH], [X1, Y1, WH + 0.07], M.brass);
  for (const [a, b] of [[Y0, DOOR.y0 - 0.13], [DOOR.y1 + 0.13, Y1]]) box([X0, a, WH], [X0 + 0.09, b, WH + 0.07], M.brass);
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
  const props = buildProps(stage, M, box, cyl, sphere);
  buildEntrance(stage, M, box, sphere, props);
  buildBench(stage, M);
  return { M, wins, props };
}

// ---------------------------------------------------------------- movable props (the runtime places them every frame)
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function cash(M, thick = 0.045) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.30, thick, 0.14), M.cash); a.position.y = thick / 2;
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.085, thick + 0.004, 0.146), M.band); b.position.y = thick / 2;
  for (const m of [a, b]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  g.userData.grip = [0, thick + 0.012, 0];                         // the hand dot sits on the top face, half sunk: held
  return g;
}
// the money bag: origin at the centre of its open mouth, body hanging down -Y (three), the $ facing +Z
function moneyBag(M) {
  const g = new THREE.Group(), H = 0.36;
  const pr = [[0.0, -H], [0.07, -H + 0.004], [0.13, -H + 0.03], [0.17, -H * 0.70], [0.168, -H * 0.48], [0.135, -H * 0.24],
    [0.105, -0.07], [0.104, -0.035], [0.118, -0.008], [0.122, 0.0]];
  const geo = new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 48); geo.rotateY(Math.PI);
  const map = canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = 'rgb(228,204,158)'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,80,40,0.25)'; c.lineWidth = 3;
    for (let x = 0; x < w; x += 14) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, h); c.stroke(); }
    c.font = '900 150px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgb(16,92,40)';
    c.save(); c.translate(w / 2, h * 0.38); c.scale(0.6, -1); c.fillText('$', 0, 0); c.restore();
  });
  const sack = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }));
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.115, 32), new THREE.MeshStandardMaterial({ color: lin(0.12, 0.07, 0.03), roughness: 1 }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = -0.05;
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.012, 8, 40), std([0.40, 0.22, 0.08], 0.8));
  rope.rotation.x = Math.PI / 2; rope.position.y = -0.05;
  for (const m of [sack, inner, rope]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  g.userData.H = H; g.userData.sack = sack;
  g.userData.grip = BAG_GRIP;
  return g;
}
// where a hand holds the bag (bag-local, three axes): on the rope rim, on the side toward the holder's body
export const BAG_GRIP = { R: [-0.108, -0.05, 0], L: [0.108, -0.05, 0] };
function buildProps(stage, M, box, cyl, sphere) {
  const { scene, prop } = stage;
  const out = {};
  const put = (name, o, pB, rot = 0) => { o.position.copy(B(...pB)); o.rotation.y = rot; scene.add(o); prop(o); out[name] = o;
    o.userData.rest = { pos: pB.slice(), rot }; return o; };
  // little metal plate (the dye pack's magnet sits under it, story-wise); steel top, darker rim, four screws
  {
    const g = new THREE.Group(), steel = std([0.70, 0.76, 0.86], 0.22, { metalness: 0.0 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.012, 0.26), std([0.22, 0.27, 0.36], 0.3)); rim.position.y = 0.006;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.006, 0.22), steel); top.position.y = 0.014;
    g.add(rim, top);
    for (const [x, z] of [[-0.16, -0.10], [0.16, -0.10], [-0.16, 0.10], [0.16, 0.10]]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 10), M.brass); s.position.set(x, 0.014, z); g.add(s); }
    g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    g.userData.top = top;
    put('plate', g, PLACES.plate, 0.1);
  }
  put('stack', cash(M, 0.07), STACK, 0.12);
  put('b1', cash(M), PLACES.b1, 1.35);
  put('b2', cash(M), PLACES.b2, 1.15);
  {
    const map = canvasTex(256, 160, (c, w, h) => {
      c.fillStyle = '#fbf8ee'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#20202a'; c.font = 'italic 900 34px Georgia, serif'; c.textAlign = 'center';
      c.fillText('THIS IS A', w / 2, 62); c.fillText('ROBBERY', w / 2, 108);
      c.fillRect(60, 124, 136, 4);
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.003, 0.11), [M.band, M.band, new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), M.band, M.band, M.band]);
    m.position.y = 0.0015; m.castShadow = m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m); put('note', g, PLACES.note, -0.25);
  }
  const bag = moneyBag(M);
  put('bag', bag, [PLACES.bag_on_counter[0], PLACES.bag_on_counter[1], PLACES.bag_on_counter[2] + bag.userData.H]);
  return out;
}

function buildEntrance(stage, M, box, sphere, props) {
  const { scene, glow } = stage, { y0, y1, h } = DOOR, X0 = ROOM.X0, T = 0.4;
  // casing inside and out, reveal lining through the wall, brass threshold
  for (const [xa, xb] of [[X0, X0 + 0.06], [X0 - T - 0.06, X0 - T]]) {
    box([xa, y0 - 0.12, 0], [xb, y0, h + 0.12], M.wood_dark);
    box([xa, y1, 0], [xb, y1 + 0.12, h + 0.12], M.wood_dark);
    box([xa, y0 - 0.12, h], [xb, y1 + 0.12, h + 0.14], M.wood_dark);
  }
  box([X0 - T, y0 - 0.02, 0], [X0, y0, h], M.wood_x); box([X0 - T, y1, 0], [X0, y1 + 0.02, h], M.wood_x);
  box([X0 - T, y0, h - 0.02], [X0, y1, h], M.wood_x);
  box([X0 - T - 0.02, y0, 0], [X0 + 0.02, y1, 0.015], M.brass);
  // two leaves swung fully open, out onto the pavement; glass shows the sunny street reflected
  const glass = new THREE.MeshBasicMaterial({ color: lin(0.62, 0.84, 1.0).multiplyScalar(1.15) });
  const lw = (y1 - y0) / 2;
  for (const [yh, s] of [[y0, -1], [y1, 1]]) {
    const yy = yh + s * 0.03;
    box([X0 - T - lw, yy - 0.025, 0.02], [X0 - T - 0.02, yy + 0.025, h - 0.03], M.wood_dark);
    const gl = box([X0 - T - lw + 0.10, yy - 0.03, 0.95], [X0 - T - 0.12, yy + 0.03, h - 0.20], glass); gl.castShadow = false;
    box([X0 - T - lw + 0.06, yy - 0.06 * s - 0.012, 1.0], [X0 - T - 0.16, yy - 0.06 * s + 0.012, 1.04], M.brass);
  }
  // sensor box on the lobby-side casing, a tiny light that the runtime blinks
  {
    const [sx, sy, sz] = PLACES.sensor;
    box([sx, sy - 0.045, sz - 0.07], [sx + 0.05, sy + 0.045, sz + 0.07], std([0.16, 0.17, 0.20], 0.4));
    const led = new THREE.MeshBasicMaterial({ color: lin(1.0, 0.12, 0.08) });
    const m = sphere([sx + 0.054, sy, sz + 0.035], 0.013, led, false); m.castShadow = false;
    glow(m, 1.0);
    const base = led.color.clone(), gbase = m.userData.glow.color.clone();
    props.sensor = { mesh: m, set: k => { led.color.copy(base).multiplyScalar(0.25 + 3.0 * k); m.userData.glow.color.copy(gbase).multiplyScalar(0.15 + 4.0 * k); } };
    props.sensor.set(0);
  }
  // outside: pavement with joints, kerb, street, and a pot of green either side of the door
  const pave = new THREE.MeshStandardMaterial({ map: checker([0.86, 0.84, 0.80], [0.82, 0.80, 0.76], 1.2, [0.55, 0.54, 0.52]), roughness: 0.9 });
  pave.userData.axes = 'XY';
  const pv = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, ROOM.Y1 - ROOM.Y0 + 10), pave);
  pv.position.copy(B(X0 - T - 1.6, (ROOM.Y0 + ROOM.Y1) / 2, -0.1)); pv.receiveShadow = true; scene.add(pv);
  {
    const p = pv.geometry.attributes.position, uv = pv.geometry.attributes.uv, v = new THREE.Vector3(); pv.updateMatrixWorld();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(pv.matrixWorld); uv.setXY(i, v.x / 1.2, -v.z / 1.2); }
  }
  box([X0 - T - 3.4, ROOM.Y0 - 5, -0.35], [X0 - T - 3.2, ROOM.Y1 + 5, -0.0], std([0.70, 0.70, 0.72], 0.8), false);
  box([-14, ROOM.Y0 - 5, -0.5], [X0 - T - 3.4, ROOM.Y1 + 5, -0.15], std([0.20, 0.22, 0.30], 0.9), false);
  for (const yy of [y0 - 0.55, y1 + 0.55]) {
    const x = X0 - T - 0.35;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.15, 0.42, 24), std([0.80, 0.32, 0.12], 0.6));
    pot.position.copy(B(x, yy, 0.21)); pot.castShadow = pot.receiveShadow = true; scene.add(pot); stage.prop(pot);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.30, 24, 16), std([0.10, 0.50, 0.18], 0.7));
    bush.position.copy(B(x, yy, 0.66)); bush.castShadow = bush.receiveShadow = true; scene.add(bush); stage.prop(bush);
  }
}

function buildBench(stage, M) {
  const g = new THREE.Group(), add = (w, hh, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m);
    b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); };
  for (let i = 0; i < 4; i++) add(1.40, 0.035, 0.09, 0, 0.45, 0.13 - i * 0.10, M.wood_x);
  for (let i = 0; i < 2; i++) add(1.40, 0.10, 0.03, 0, 0.66 + i * 0.16, -0.22, M.wood_x);
  for (const x of [-0.6, 0.6]) { add(0.05, 0.45, 0.05, x, 0.225, 0.12, M.black); add(0.05, 0.92, 0.05, x, 0.46, -0.20, M.black); }
  g.position.copy(B(...MARKS.bench)); g.rotation.y = BENCH_YAW * Math.PI / 180;   // seat centre on the mark: a sitter's root goes there
  stage.scene.add(g); stage.prop(g);
}
