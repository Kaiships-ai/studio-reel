// The pavement in front of First Halden Bank, daytime (our own set). Blender coordinates (x along the street, y into
// the buildings, z up), metres. The bank facade's front face is the plane y = 0; the pavement runs y -4..0, the kerb
// is at y -4, the road beyond it. The camera normally stands on the road side looking +y.
import * as THREE from 'three';
import { B, lin, css, std } from '../../engine/look.js';
import { makeHatchback, makePoliceCar } from '../props/vehicles.js';

export const SUN_DIR = [0.42, 0.62, -0.66];                     // direction the light travels: falls on the facade from front-left
export const SUN_CENTER = [0.4, -3.0, 1.0], SUN_HALF = 10.0;    // one fixed shadow fit for the whole pavement
export const FACADE = { X0: -4.2, X1: 4.2, H: 7.6, T: 0.5 };
export const DOOR = { x0: -0.77, x1: 0.77, h: 2.75 };          // same opening as the lobby entrance (1.54 m x 2.75 m)
export const KERB_Y = -4.0;
export const MARKS = {
  door: [0.0, -0.55, 0], stroll_start: [-5.0, -1.9, 0], burst: [1.2, -1.9, 0],
  crowd_1: [-0.8, -2.7, 0], crowd_2: [2.6, -1.35, 0], crowd_3: [3.7, -3.3, 0], officer: [-1.4, -4.3, 0],
  police_stop: [-2.6, -5.4, 0], hatchback: [-9.6, -5.2, 0],
};
export const PLACES = {
  sensor: [DOOR.x1 + 0.20, -0.07, DOOR.h - 0.12],                // street-side casing, top of the right jamb
  bag_burst: [1.2, -1.9, 1.55], bag_rest: [0.35, -0.9, 0.36],
  lamp: [-6.2, -3.55, 0], hydrant: [-4.4, -3.5, 0], mailbox: [-2.9, -3.45, 0], tree: [7.9, -2.9, 0],
};
export const CAMERA_SIDE = [0, -1];
// the wide shot looks down the pavement toward -x (road on the left, buildings on the right)
export const CAMERA_WIDE = { cam: [7.2, -3.3, 1.75], tgt: [-0.6, -2.5, 1.25], lens: 24 };
// where a camera may go (x, y boxes): over the road and the near pavement, never inside a building
export const CAMERA_ROOM = [[[-12, -12], [12, -0.8]]];

function lcg(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(w, h, draw, repeat = false) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// blocks with mortar joints and a soft bevel; tile = metres covered by one texture repeat
function blocks({ c1, c2, mortar, bw, bh, gap, offset, nx, ny, ppm = 220, bevel = 0.5, seed = 7 }) {
  const rnd = lcg(seed), Wt = Math.round(bw * nx * ppm), Ht = Math.round(bh * ny * ppm);
  const t = canvasTex(Wt, Ht, g => {
    g.fillStyle = css(mortar); g.fillRect(0, 0, Wt, Ht);
    const gp = Math.max(1.5, gap * ppm), bwp = bw * ppm, bhp = bh * ppm;
    for (let r = 0; r < ny; r++) {
      const off = ((r * offset) % 1) * bwp;
      for (let c = -1; c <= nx; c++) {
        const k = rnd(), col = [0, 1, 2].map(i => c1[i] + (c2[i] - c1[i]) * k);
        const x = c * bwp + off + gp / 2, y = Ht - (r + 1) * bhp + gp / 2, w = bwp - gp, h = bhp - gp;
        g.fillStyle = css(col); g.fillRect(x, y, w, h);
        if (bevel > 0) {
          const e = Math.min(6, h * 0.12);
          g.fillStyle = `rgba(255,255,255,${0.12 * bevel})`; g.fillRect(x, y, w, e);
          g.fillStyle = `rgba(40,20,60,${0.12 * bevel})`; g.fillRect(x, y + h - e, w, e); g.fillRect(x + w - e * 0.6, y, e * 0.6, h);
        }
      }
    }
  }, true);
  t.userData.tile = [bw * nx, bh * ny]; return t;
}
// sunny glass: pale sky gradient with two diagonal glints
function glassTex(seed = 1) {
  return canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(170,205,236)'); gr.addColorStop(1, 'rgb(118,160,205)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    const o = (seed * 37) % 60;
    for (const [x, ww] of [[40 + o, 46], [130 + o, 18]]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + ww, 0); g.lineTo(x + ww - 150, h); g.lineTo(x - 150, h); g.closePath(); g.fill(); }
  });
}
function signTex(text, { bg, fg, w = 2048, h = 256, font = 'bold 150px Georgia, serif', border = null }) {
  return canvasTex(w, h, g => {
    g.fillStyle = css(bg); g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = css(border); g.lineWidth = 14; g.strokeRect(18, 18, w - 36, h - 36); }
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '8px';
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillText(text, w / 2 + 5, h / 2 + 7);
    g.fillStyle = css(fg); g.fillText(text, w / 2, h / 2 + 2);
  });
}
function skyTex() {
  return canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0.0, 'rgb(40,108,204)'); gr.addColorStop(0.42, 'rgb(96,160,228)'); gr.addColorStop(0.52, 'rgb(150,194,238)'); gr.addColorStop(1, 'rgb(170,202,234)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rnd = lcg(29);
    for (let i = 0; i < 18; i++) {                               // flat-bottomed painted cumulus, lit from the top
      const cx = rnd() * w, cy = h * (0.18 + 0.26 * rnd()), s = 30 + 50 * rnd();
      for (let k = 0; k < 6; k++) {
        const x = cx + (k - 2.5) * s * 0.9, r = s * (0.7 + 0.6 * Math.sin(k * 1.7 + i));
        g.fillStyle = 'rgb(214,228,244)'; g.beginPath(); g.ellipse(x, cy, r * 1.2, r * 0.8, 0, Math.PI, 0); g.fill();
        g.fillStyle = 'rgb(243,247,252)'; g.beginPath(); g.ellipse(x, cy - r * 0.12, r * 1.05, r * 0.64, 0, Math.PI, 0); g.fill();
      }
    }
  });
}

export const build = stage => buildStreet(stage);
export async function buildStreet(stage) {
  const { scene, prop, glow } = stage;
  const T = {
    stone: blocks({ c1: [0.80, 0.50, 0.26], c2: [0.74, 0.45, 0.23], mortar: [0.42, 0.25, 0.13], bw: 1.0, bh: 0.46, gap: 0.014, offset: 0.5, nx: 4, ny: 8 }),
    slab: blocks({ c1: [0.40, 0.33, 0.26], c2: [0.36, 0.29, 0.23], mortar: [0.19, 0.15, 0.13], bw: 0.6, bh: 0.6, gap: 0.016, offset: 0.5, nx: 6, ny: 6, ppm: 200, bevel: 0.6, seed: 13 }),
    mint: blocks({ c1: [0.36, 0.66, 0.52], c2: [0.32, 0.62, 0.48], mortar: [0.22, 0.42, 0.34], bw: 2.0, bh: 0.16, gap: 0.006, offset: 0.0, nx: 2, ny: 12, ppm: 160, bevel: 0.6, seed: 3 }),
    rose: blocks({ c1: [0.90, 0.56, 0.44], c2: [0.86, 0.52, 0.40], mortar: [0.62, 0.32, 0.24], bw: 0.42, bh: 0.20, gap: 0.014, offset: 0.5, nx: 6, ny: 10, ppm: 220, bevel: 0.8, seed: 21 }),
    lobby: blocks({ c1: [0.90, 0.84, 0.68], c2: [0.16, 0.50, 0.46], mortar: [0.22, 0.24, 0.24], bw: 0.8, bh: 0.8, gap: 0.01, offset: 0.0, nx: 2, ny: 2, ppm: 120, bevel: 0, seed: 2 }),
  };
  const tex = (t, axes, rough) => { const m = new THREE.MeshStandardMaterial({ map: t, roughness: rough }); m.userData.axes = axes; return m; };
  const M = {
    stone: tex(T.stone, 'XZ', 0.8), stone_y: tex(T.stone, 'YZ', 0.8), slab: tex(T.slab, 'XY', 0.9),
    mint: tex(T.mint, 'XZ', 0.85), mint_y: tex(T.mint, 'YZ', 0.85), rose: tex(T.rose, 'XZ', 0.85), rose_y: tex(T.rose, 'YZ', 0.85),
    lobby: tex(T.lobby, 'XY', 0.85),
    cream: std([0.86, 0.72, 0.52], 0.7), plinth: std([0.50, 0.46, 0.44], 0.8), marble: std([0.95, 0.92, 0.86], 0.25),
    wood_dark: std([0.22, 0.08, 0.03], 0.5), wood: std([0.50, 0.22, 0.09], 0.5), green: std([0.02, 0.26, 0.18], 0.5),
    brass: std([1.0, 0.62, 0.10], 0.28, { emissive: lin(1.0, 0.62, 0.10), emissiveIntensity: 0.06 }),
    teal: std([0.03, 0.40, 0.38], 0.6), kerb: std([0.36, 0.35, 0.37], 0.8), road: std([0.07, 0.08, 0.11], 0.95),
    paint: std([0.92, 0.92, 0.90], 0.8), lamp: std([0.04, 0.18, 0.14], 0.4), black: std([0.03, 0.03, 0.04], 0.5),
    hydrant: std([0.98, 0.70, 0.08], 0.4), mail: std([0.06, 0.20, 0.55], 0.4), leaf: std([0.16, 0.50, 0.20], 0.7),
    bark: std([0.30, 0.17, 0.08], 0.8), planter: std([0.55, 0.52, 0.50], 0.8), soil: std([0.18, 0.10, 0.05], 1.0),
    navy: std([0.08, 0.14, 0.30], 0.5), plum: std([0.32, 0.10, 0.20], 0.5),
    glass: new THREE.MeshBasicMaterial({ map: glassTex(1) }), glass2: new THREE.MeshBasicMaterial({ map: glassTex(2) }),
    lampglass: new THREE.MeshBasicMaterial({ color: lin(1.0, 0.95, 0.85) }),
    glow: new THREE.MeshBasicMaterial({ color: lin(1.0, 0.86, 0.60).multiplyScalar(4.0) }),
  };

  function planarUV(mesh) {
    const ax = mesh.material.userData?.axes; if (!ax) return;
    const [tw, th] = mesh.material.map.userData.tile, p = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv, v = new THREE.Vector3();
    mesh.updateMatrixWorld();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      const bl = { X: v.x, Y: -v.z, Z: v.y };
      uv.setXY(i, bl[ax[0]] / tw, bl[ax[1]] / th);
    }
    uv.needsUpdate = true;
  }
  function add(mesh, ink, cast = true) { mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); planarUV(mesh); if (ink) prop(mesh); return mesh; }
  function box(lo, hi, mat, ink = true) {
    const a = B(...lo), b = B(...hi);
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.z - a.z)), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); return add(m, ink);
  }
  function cyl(loc, r, h, mat, axis = 'Z', seg = 32, r2 = r, ink = true) {   // axis: Blender Z (upright), Y or X
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat);
    m.position.copy(B(...loc)); if (axis === 'Y') m.rotation.x = Math.PI / 2; if (axis === 'X') m.rotation.z = Math.PI / 2;
    return add(m, ink);
  }
  function sphere(loc, r, mat, ink = true, sy = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), mat); m.scale.y = sy; m.position.copy(B(...loc)); return add(m, ink);
  }
  function plane(loc, w, h, mat) {                         // painted card facing the street (-y), no ink
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(B(...loc)); m.receiveShadow = true;
    m.userData.noPrepass = true; scene.add(m); return m;
  }

  // ---------------------------------------------------------------- sky and far silhouettes (no ink, no shadows)
  {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex(), color: lin(0.80, 0.80, 0.80), side: THREE.BackSide, fog: false }));
    sky.rotation.y = 0.6; scene.add(sky);
    const rnd = lcg(41), hazes = [[0.60, 0.70, 0.84], [0.55, 0.66, 0.82], [0.64, 0.73, 0.86]];
    for (const [y0, k] of [[26, 0.0], [16, 1.0]]) {
      for (let x = -46; x < 46;) {
        const w = 4 + 6 * rnd(), h = (k ? 9 : 14) + (k ? 9 : 14) * rnd(), c = hazes[Math.floor(rnd() * 3)].map(v => v * (k ? 0.94 : 1.03));
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), new THREE.MeshBasicMaterial({ color: lin(...c) }));
        m.position.copy(B(x + w / 2, y0 + 3 * rnd(), h / 2 - 1)); scene.add(m);
        x += w + 0.5 * rnd();
      }
    }
  }

  // ---------------------------------------------------------------- ground: pavement slabs, kerb, road, zebra, far pavement
  box([-24, KERB_Y, -0.2], [24, 0.6, 0], M.slab, false);
  box([-24, KERB_Y - 0.18, -0.16], [24, KERB_Y, 0.0], M.kerb, false);
  box([-24, -20, -0.3], [24, KERB_Y - 0.18, -0.16], M.road, false);
  box([-24, -24, -0.2], [24, -20, 0.0], M.slab, false);
  for (let x = -22; x < 22; x += 3.2) box([x, -12.1, -0.16], [x + 1.6, -11.95, -0.155], M.paint, false);
  for (let y = KERB_Y - 0.6; y > -19.6; y -= 1.0) box([6.3, y - 0.5, -0.16], [9.3, y, -0.155], M.paint, false);

  // ---------------------------------------------------------------- the bank facade
  const { X0, X1, H, T: FT } = FACADE, { x0, x1, h } = DOOR;
  box([X0, 0, 0], [x0, FT, H], M.stone, false);
  box([x1, 0, 0], [X1, FT, H], M.stone, false);
  box([x0, 0, h], [x1, FT, H], M.stone, false);
  for (const [a, b] of [[X0 - 0.04, x0 - 0.12], [x1 + 0.12, X1 + 0.04]]) box([a, -0.08, 0], [b, 0, 0.45], M.plinth);
  box([X0 - 0.12, -0.12, H], [X1 + 0.12, FT, H + 0.14], M.marble);
  // columns with base and capital; their shadows fall across the stone
  for (const cx of [-1.70, 1.70]) {
    const cy = -0.48;
    box([cx - 0.38, cy - 0.38, 0], [cx + 0.38, cy + 0.38, 0.42], M.marble);
    cyl([cx, cy, 2.70], 0.25, 4.56, M.cream, 'Z', 40, 0.22);
    box([cx - 0.36, cy - 0.36, 4.98], [cx + 0.36, cy + 0.36, 5.20], M.marble);
  }
  // entablature with the green sign band and brass lettering, cornice above
  box([X0, -0.86, 5.20], [X1, 0, 6.00], M.cream);
  box([X0 - 0.14, -1.00, 6.00], [X1 + 0.14, 0, 6.18], M.marble);
  box([-2.95, -0.90, 5.30], [2.95, -0.86, 5.90], M.green);
  for (const z of [5.27, 5.90]) box([-2.98, -0.93, z], [2.98, -0.86, z + 0.05], M.brass);
  try { await document.fonts.load('bold 200px Rockwell'); } catch { /* fall back to Georgia */ }
  {
    const t = canvasTex(2400, 300, g => {
      g.font = 'bold 190px Rockwell, "Rockwell Extra Bold", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '10px';
      g.fillStyle = 'rgb(70,40,5)'; g.fillText('FIRST HALDEN BANK', 1205, 167);
      g.fillStyle = '#fff'; g.fillText('FIRST HALDEN BANK', 1200, 160);
    });
    const mat = new THREE.MeshStandardMaterial({ map: t, color: lin(1.0, 0.66, 0.14), roughness: 0.28, alphaTest: 0.5,
      emissive: lin(1.0, 0.66, 0.14), emissiveIntensity: 0.12, emissiveMap: t });
    plane([0, -0.915, 5.60], 5.3, 5.3 * 300 / 2400, mat);
  }
  // windows either side of the columns: glass, green bars like the lobby, marble sill, keystone
  for (const cx of [-3.05, 3.05]) {
    const wx = 0.5, z0 = 1.25, z1 = 4.35;
    box([cx - wx, -0.03, z0], [cx + wx, 0, z1], M.glass, false).castShadow = false;
    for (let k = 0; k < 4; k++) { const x = cx - wx + k * 2 * wx / 3; box([x - 0.03, -0.07, z0], [x + 0.03, -0.01, z1], M.green); }
    for (let k = 0; k < 5; k++) { const z = z0 + k * (z1 - z0) / 4; box([cx - wx, -0.07, z - 0.03], [cx + wx, -0.01, z + 0.03], M.green); }
    box([cx - 0.62, -0.16, z0 - 0.10], [cx + 0.62, 0, z0], M.marble);
    box([cx - 0.16, -0.06, z1], [cx + 0.16, 0, z1 + 0.34], M.marble);
  }
  // the doorway: casing, reveal, threshold, the lit lobby glimpsed through it, two leaves swung out onto the pavement
  box([x0 - 0.12, -0.06, 0], [x0, 0, h + 0.12], M.wood_dark);
  box([x1, -0.06, 0], [x1 + 0.12, 0, h + 0.12], M.wood_dark);
  box([x0 - 0.12, -0.06, h], [x1 + 0.12, 0, h + 0.14], M.wood_dark);
  box([x0, 0, 0], [x0 + 0.02, FT, h], M.wood); box([x1 - 0.02, 0, 0], [x1, FT, h], M.wood); box([x0, 0, h - 0.02], [x1, FT, h], M.wood);
  box([x0, -0.04, -0.01], [x1, FT + 0.02, 0.015], M.brass);
  {
    const D = 4.0;
    box([x0 - 0.8, FT, -0.2], [x1 + 0.8, FT + D, 0], M.lobby, false);
    box([x0 - 0.8, FT + D, 0], [x1 + 0.8, FT + D + 0.2, 3.4], M.teal, false);
    box([x0 - 1.0, FT, 0], [x0 - 0.8, FT + D, 3.4], M.teal, false); box([x1 + 0.8, FT, 0], [x1 + 1.0, FT + D, 3.4], M.teal, false);
    box([x0 - 1.0, FT, 3.4], [x1 + 1.0, FT + D + 0.2, 3.6], M.teal, false);
    glow(sphere([0, FT + 2.4, 2.75], 0.20, M.glow, false), 0.35).castShadow = false;
    const pl = new THREE.PointLight(lin(1.0, 0.80, 0.55), 3.0, 0, 2); pl.position.copy(B(0, FT + 2.2, 2.4)); scene.add(pl);
  }
  {
    const lw = (x1 - x0) / 2;
    for (const [xh, s] of [[x0, -1], [x1, 1]]) {
      const xx = xh + s * 0.03;
      box([xx - 0.025, -lw, 0.02], [xx + 0.025, -0.02, h - 0.03], M.wood_dark);
      box([xx - 0.03, -lw + 0.10, 0.95], [xx + 0.03, -0.12, h - 0.20], M.glass2).castShadow = false;
      box([xx - 0.06 * s - 0.012, -lw + 0.06, 1.0], [xx - 0.06 * s + 0.012, -0.16, 1.04], M.brass);
    }
  }
  const props = {};
  {                                                              // sensor box, a tiny light the runtime blinks (same as the lobby)
    const [sx, sy, sz] = PLACES.sensor;
    box([sx - 0.045, sy - 0.05, sz - 0.07], [sx + 0.045, sy + 0.02, sz + 0.07], std([0.16, 0.17, 0.20], 0.4));
    const led = new THREE.MeshBasicMaterial({ color: lin(1.0, 0.12, 0.08) });
    const m = sphere([sx, sy - 0.054, sz + 0.035], 0.013, led, false); m.castShadow = false;
    glow(m, 1.0);
    const base = led.color.clone(), gbase = m.userData.glow.color.clone();
    props.sensor = { mesh: m, set: k => { led.color.copy(base).multiplyScalar(0.25 + 3.0 * k); m.userData.glow.color.copy(gbase).multiplyScalar(0.15 + 4.0 * k); } };
    props.sensor.set(0);
  }

  // ---------------------------------------------------------------- two neighbouring shops (invented names)
  const shops = [
    { a: -10.8, b: X0 - 0.05, wall: M.mint, wallY: M.mint_y, h: 5.6, sign: 'PEBBLE & FERN', sub: 'flowers', bg: [0.95, 0.92, 0.82], fg: [0.06, 0.30, 0.20],
      stripes: ['rgb(250,246,236)', 'rgb(54,128,96)'], frame: M.green, glass: M.glass },
    { a: X1 + 0.05, b: 10.8, wall: M.rose, wallY: M.rose_y, h: 5.2, sign: 'LARKSPUR BAKERY', sub: 'since 1931', bg: [0.20, 0.10, 0.18], fg: [1.0, 0.84, 0.50],
      stripes: ['rgb(250,246,236)', 'rgb(176,64,82)'], frame: M.plum, glass: M.glass2 },
  ];
  for (const s of shops) {
    const cx = (s.a + s.b) / 2, W = s.b - s.a;
    box([s.a, 0, 0], [s.b, 0.4, s.h], s.wall, false);
    box([s.a - 0.06, -0.10, s.h], [s.b + 0.06, 0.4, s.h + 0.16], M.marble);
    // shop window and door with a frame, a low stall riser under the glass
    const gx0 = cx - W / 2 + 0.5, gx1 = cx + 0.7, dx0 = cx + 1.0, dx1 = cx + 1.95;
    box([gx0 - 0.08, -0.08, 0], [gx1 + 0.08, 0, 0.55], s.frame);
    box([gx0, -0.03, 0.55], [gx1, 0, 2.75], s.glass, false).castShadow = false;
    for (const x of [gx0 - 0.08, gx1, (gx0 + gx1) / 2 - 0.04]) box([x, -0.07, 0.55], [x + 0.08, -0.01, 2.80], s.frame);
    box([gx0 - 0.08, -0.07, 2.75], [gx1 + 0.08, -0.01, 2.83], s.frame);
    box([dx0, -0.05, 0], [dx1, 0, 2.6], s.frame);
    box([dx0 + 0.12, -0.07, 1.0], [dx1 - 0.12, -0.05, 2.4], s.glass, false).castShadow = false;
    sphere([dx0 + 0.16, -0.09, 1.2], 0.04, M.brass);
    // fascia with the painted name
    box([cx - W / 2 + 0.25, -0.10, 3.25], [cx + W / 2 - 0.25, 0, 3.95], s.frame);
    const st = signTex(s.sign, { bg: s.bg, fg: s.fg, border: s.fg, font: 'bold 132px Georgia, serif' });
    plane([cx, -0.105, 3.60], W - 0.7, 0.60, new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 }));
    // striped awning: slanted canvas and a straight valance
    const stripe = canvasTex(256, 32, (g, w, hh) => { for (let i = 0; i < 2; i++) { g.fillStyle = s.stripes[i]; g.fillRect(i * w / 2, 0, w / 2, hh); } }, true);
    stripe.repeat.set((W - 0.8) / 0.5, 1);
    const cm = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.8, side: THREE.DoubleSide });
    const depth = 1.45, drop = 0.55, L = Math.hypot(depth, drop);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 0.03, L), cm);
    aw.position.copy(B(cx, -depth / 2, 3.15 - drop / 2)); aw.rotation.x = Math.atan2(drop, depth); add(aw, true);
    box([cx - (W - 0.8) / 2, -depth - 0.03, 2.38], [cx + (W - 0.8) / 2, -depth + 0.01, 2.62], cm);
    // upper floor windows with sills
    for (const k of [-1, 1]) {
      const wx = cx + k * W / 4;
      box([wx - 0.5, -0.03, 4.05], [wx + 0.5, 0, s.h - 0.35], s.glass, false).castShadow = false;
      box([wx - 0.58, -0.10, 3.97], [wx + 0.58, 0, 4.05], M.marble);
      box([wx - 0.03, -0.06, 4.05], [wx + 0.03, -0.01, s.h - 0.35], s.frame);
    }
  }
  // further buildings down the street, plain and paler
  for (const [a, b, hh, c] of [[-24, -10.85, 9.0, [0.80, 0.78, 0.86]], [10.85, 16, 7.8, [0.84, 0.80, 0.70]], [16, 24, 10.5, [0.70, 0.78, 0.86]]]) {
    box([a, 0, 0], [b, 0.4, hh], std(c, 0.85), false);
    for (let x = a + 1.0; x + 1.0 < b; x += 2.2) for (let z = 1.2; z + 1.6 < hh; z += 2.4) box([x, -0.03, z], [x + 1.0, 0, z + 1.5], M.glass, false).castShadow = false;
  }

  // ---------------------------------------------------------------- street furniture
  {
    const [lx, ly] = PLACES.lamp;
    cyl([lx, ly, 0.25], 0.13, 0.5, M.lamp, 'Z', 24, 0.10);
    cyl([lx, ly, 2.4], 0.055, 3.9, M.lamp, 'Z', 16);
    box([lx - 0.03, ly - 0.03, 4.2], [lx + 0.03, ly + 0.03, 4.3], M.lamp);
    cyl([lx, ly, 4.42], 0.20, 0.30, M.lampglass, 'Z', 6, 0.14).castShadow = false;
    cyl([lx, ly, 4.63], 0.03, 0.14, M.lamp, 'Z', 6, 0.24);
    sphere([lx, ly, 4.74], 0.05, M.lamp);
  }
  {
    const [hx, hy] = PLACES.hydrant;
    cyl([hx, hy, 0.04], 0.17, 0.08, M.hydrant, 'Z', 24);
    cyl([hx, hy, 0.34], 0.13, 0.56, M.hydrant, 'Z', 24);
    cyl([hx, hy, 0.63], 0.15, 0.05, M.hydrant, 'Z', 24);
    sphere([hx, hy, 0.66], 0.12, M.hydrant, true, 0.8);
    cyl([hx, hy, 0.80], 0.035, 0.06, M.hydrant, 'Z', 12);
    cyl([hx, hy, 0.44], 0.055, 0.40, M.hydrant, 'X', 16);
    cyl([hx, hy - 0.12, 0.42], 0.07, 0.10, M.hydrant, 'Y', 16);
  }
  {
    const [mx, my] = PLACES.mailbox;
    for (const [ox, oy] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box([mx + ox - 0.03, my + oy - 0.03, 0], [mx + ox + 0.03, my + oy + 0.03, 0.30], M.black);
    box([mx - 0.23, my - 0.25, 0.30], [mx + 0.23, my + 0.25, 1.00], M.mail);
    cyl([mx, my, 1.00], 0.23, 0.50, M.mail, 'Y', 32).scale.set(1, 1, 1);
    box([mx - 0.13, my - 0.255, 0.90], [mx + 0.13, my - 0.24, 0.95], M.black);
    const card = signTex('MAIL', { bg: [0.06, 0.20, 0.55], fg: [1, 1, 1], w: 512, h: 256, font: 'bold 150px Georgia, serif' });
    plane([mx, -0.26 + my, 0.62], 0.32, 0.16, new THREE.MeshStandardMaterial({ map: card, roughness: 0.6 }));
  }
  {
    const [tx, ty] = PLACES.tree;
    box([tx - 0.55, ty - 0.55, 0], [tx + 0.55, ty + 0.55, 0.50], M.planter);
    box([tx - 0.47, ty - 0.47, 0.50], [tx + 0.47, ty + 0.47, 0.52], M.soil, false);
    cyl([tx, ty, 1.55], 0.07, 2.1, M.bark, 'Z', 12, 0.05);
    for (const [ox, oy, oz, r] of [[0, 0, 3.0, 0.75], [-0.45, 0.1, 2.65, 0.52], [0.48, -0.05, 2.70, 0.55], [0.1, -0.35, 2.55, 0.45], [0.05, 0.2, 3.55, 0.48]]) sphere([tx + ox, ty + oy, oz], r, M.leaf);
  }
  {
    const hb = makeHatchback(stage, { body: [0.40, 0.66, 0.78] });
    hb.position.copy(B(...MARKS.hatchback)); hb.position.y += -0.16; scene.add(hb); prop(hb);
    const pc = makePoliceCar(stage);
    pc.position.copy(B(...MARKS.police_stop)); pc.position.y += -0.16; pc.rotation.y = Math.PI; scene.add(pc); prop(pc);
    pc.userData.rest = { pos: [MARKS.police_stop[0], MARKS.police_stop[1], -0.16], rot: Math.PI };
    props.police = pc;
  }
  {
    const bag = moneyBag();
    bag.position.copy(B(...PLACES.bag_rest)); scene.add(bag); prop(bag);
    bag.userData.rest = { pos: PLACES.bag_rest.slice(), rot: 0 };
    props.bag = bag;
  }

  // ---------------------------------------------------------------- light: warm bounce off the sunlit pavement onto the facade
  stage.addBounce([0, -1.2, 0.4], [1.0, 0.78, 0.55], 1.4, 6.0);
  stage.addBounce([-6.5, -1.2, 0.4], [1.0, 0.78, 0.55], 1.0, 6.0);
  stage.addBounce([6.5, -1.2, 0.4], [1.0, 0.78, 0.55], 1.0, 6.0);
  return { M, props };
}

// the money bag (same shape as the lobby's): origin at the centre of its open mouth, body hanging down, $ facing +Z
export function moneyBag() {
  const g = new THREE.Group(), H = 0.36;
  const pr = [[0.0, -H], [0.07, -H + 0.004], [0.13, -H + 0.03], [0.17, -H * 0.70], [0.168, -H * 0.48], [0.135, -H * 0.24],
    [0.105, -0.07], [0.104, -0.035], [0.118, -0.008], [0.122, 0.0]];
  const geo = new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 48); geo.rotateY(Math.PI);
  const map = canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = 'rgb(214,166,104)'; c.fillRect(0, 0, w, h);
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
  return g;
}
