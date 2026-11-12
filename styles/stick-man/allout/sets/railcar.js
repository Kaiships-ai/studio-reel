// Railcar: two views of the trains in motion. Blender metres; the car runs along y, its floor at z = FLOOR.
// setOpts.mode:
//   'inside' (default): the rival's luxury car. Red velvet high-backed seats in facing pairs along both sides with small
//            pedestal tables, polished mahogany panels under a green trim band, an orange wood ceiling with cross beams, brass
//            pendant and wall lamps that glow (emissive + small point lights), a deep blue carpet, windows on both sides onto a
//            bright painted canyon that scrolls with key `scroll` (m travelled). A teacup and saucer on the near table.
//            MARKS seat = the near seat facing the camera (camera at y < 0 looking +y down the aisle side).
//   'outside': our plain wooden coach on a timber trestle in afternoon sun, seen from its -x side: red-brown planks, one big
//            open arched window with a bench inside (MARKS window_seat, facing -x out of the window), 'RED MESA LINE' painted
//            on a green band, the canyon backdrop sliding past behind (key `scroll`), key `bounce` 0..1 shakes the coach.
// Props (K.anim): car (keys scroll, bounce), cup (inside; key steam 0..1 is someone else's fx anchor: PLACES.cup).
import { createKit, SURF, label, tex, rng, B } from '../kit.js';
import { sky, atmos, merged, beamMatrix, unitBox, collideFromMeshes, RSURF, track, RAIL_TOP } from '../rail-kit.js';

export const SUN_DIR = [0.55, 0.45, -0.70];
export const SUN_CENTER = [0, 2, 2], SUN_HALF = 7;
const FLOOR = RAIL_TOP + 1.05, HW = 1.45, LEN = 16;
export const PLACES = { cup: [-0.62, 2.18, FLOOR + 0.74], table: [-0.75, 2.2, FLOOR + 0.7], window: [-HW, 0, FLOOR + 1.35], lamp: [0, 3, FLOOR + 2.2] };
// seat marks are floor-level points under the seat (the engine's sit pose drops the hips 0.56 m and puts the feet forward)
export const MARKS = { seat: [-0.78, 3.0, FLOOR], aisle: [0.25, 0.5, FLOOR], window_seat: [-0.62, 0, FLOOR] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-40, -40], [40, 40]]];
export const COLLIDE = [];
export const INSIDE_LOOK = {
  light: { sun: [1.0, 0.9, 0.75], power: 1.6, sky: [0.75, 0.6, 0.55], ground: [0.35, 0.3, 0.5], hemi: 0.5, fill: [1.0, 0.8, 0.6], fillPower: 0.4, lit: [1.04, 0.98, 0.92], shade: [0.78, 0.6, 0.85], lamp: 1.2 },
  grade: { exp: 1.06, lift: 0.02, sat: 1.15, haze: 0.0, shadow: { c: [0.3, 0.16, 0.42], k: 0.3 }, shoulder: 0.25 },
};
export const OUTSIDE_LOOK = {
  light: { sun: [1.0, 0.86, 0.68], power: 3.4, sky: [0.58, 0.6, 0.95], ground: [0.85, 0.48, 0.36], hemi: 0.4, fill: [0.78, 0.64, 1.0], fillPower: 0.45, lit: [1.04, 1.0, 0.95], shade: [0.8, 0.6, 0.92], lamp: 0.6 },
  grade: { exp: 1.03, lift: 0.02, sat: 1.15, haze: 0.15, shadow: { c: [0.38, 0.18, 0.46], k: 0.35 }, shoulder: 0.25 },
};
// the painted canyon that slides past the windows: sky, puffy clouds, striped walls, mesas, a blue drop
function canyonView(seed = 3, withSky = true) {
  const hy = withSky ? 0.6 : 0.42;                  // the horizon row; without sky the top is transparent (the real sky shows)
  return tex(2048, 512, (g, w, h) => { const r = rng(seed);
    if (withSky) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a6fd0'); gr.addColorStop(0.45, '#8fb4ea'); gr.addColorStop(0.62, '#e4d6e2'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) { const cx = r() * w, cy = h * (0.1 + 0.25 * r()), s = 18 + 24 * r(); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(cx + (k - 2.5) * s * 0.6, cy - Math.abs(Math.sin(k)) * s * 0.4, s * 0.6, s * 0.42, 0, 0, 7); g.fill(); } } }
    g.fillStyle = '#d9a48a'; g.fillRect(0, h * hy - 2, w, h * (1 - hy) + 2);
    for (let i = 0; i < 9; i++) { const x = r() * w, mw = 80 + 140 * r(), mh = 22 + 34 * r(); g.fillStyle = ['#c87a8a', '#b8688a', '#d89090'][i % 3]; g.fillRect(x, h * hy - mh, mw, mh + 4); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, h * hy - mh, mw, 4); }
    const C = ['#e0507a', '#f09a58', '#c03a6a', '#f6c070', '#d24a48', '#9c2a58', '#e86a52'];
    let y = h * (hy + 0.03); while (y < h) { const t = 5 + 14 * r(); g.fillStyle = C[Math.floor(r() * C.length)]; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 90 + y) * 3); g.lineTo(w, y + t); g.lineTo(0, y + t); g.fill(); y += t; }
    const dg = g.createLinearGradient(0, h * (hy + 0.2), 0, h); dg.addColorStop(0, 'rgba(40,60,190,0)'); dg.addColorStop(0.5, 'rgba(36,52,180,0.8)'); dg.addColorStop(1, 'rgba(30,44,170,1)'); g.fillStyle = dg; g.fillRect(0, h * (hy + 0.2), w, h * (0.8 - hy));
  }, { repeat: [1, 1] });
}

export async function build(stage, opts = {}) {
  const OUT = opts.mode === 'outside';
  const K = createKit(stage, { env: OUT ? { top: [0.45, 0.58, 0.98], mid: [0.86, 0.72, 0.82], bottom: [0.7, 0.42, 0.32], panels: [{ dir: [-0.55, -0.45, 0.7], size: 2.6, color: [1, 0.92, 0.78], power: 6 }] }
    : { top: [0.85, 0.55, 0.3], mid: [0.6, 0.35, 0.25], bottom: [0.2, 0.22, 0.45], panels: [{ dir: [1, 0, 0.2], w: 6, h: 2, color: [0.9, 0.92, 1], power: 2.5 }, { dir: [-1, 0, 0.2], w: 6, h: 2, color: [0.9, 0.92, 1], power: 2.5 }, { dir: [0, 0, 1], w: 3, h: 3, color: [1, 0.8, 0.5], power: 2 }] }, envK: 0.8 });
  stage.scene.background = null;
  const r = rng(61), THREE = K.THREE;
  const view = canyonView(OUT ? 5 : 3, !OUT);
  const car = K.group([0, 0, 0]); car.name = 'car';
  const backs = [];
  if (!OUT) {
    // ---- the luxury car interior
    const M = { panel: K.mat([0.32, 0.12, 0.08], 0.35, { map: SURF.wood([0.34, 0.13, 0.08], 6, 21), physical: true, clearcoat: 0.6 }), ceil: K.mat([1, 1, 1], 0.45, { map: SURF.wood([0.86, 0.42, 0.16], 8, 22), repeat: [1, 1], physical: true, clearcoat: 0.5 }),
      beam: K.mat([0.52, 0.22, 0.10], 0.4, { physical: true, clearcoat: 0.5 }), velvet: K.mat([0.78, 0.06, 0.10], 0.85, { physical: true, sheen: 1, sheenColor: [1, 0.35, 0.4] }), green: K.mat([0.10, 0.38, 0.22], 0.5),
      brass: K.mat([0.92, 0.70, 0.30], 0.25, { metal: 0.9, env: 1.4 }), carpet: K.mat([0.10, 0.14, 0.42], 0.95), glass: K.glass([0.9, 0.95, 1], { opacity: 0.12 }), dark: K.mat([0.18, 0.08, 0.05], 0.4, { physical: true, clearcoat: 0.7 }) };
    K.box([-HW, -2, FLOOR - 0.1], [HW, LEN, FLOOR], M.carpet, { parent: car, r: 0 });
    // walls: panels below the windows, posts between them, a green band and brass rail above; windows every 1.6 m
    for (const s of [-1, 1]) { const x = s * HW;
      K.box([x - 0.06, -2, FLOOR], [x + 0.06, LEN, FLOOR + 0.82], M.panel, { parent: car, r: 0 });
      K.box([x - s * 0.08, -2, FLOOR + 0.8], [x - s * 0.02, LEN, FLOOR + 0.86], M.brass, { parent: car, r: 0.01 });
      K.box([x - 0.06, -2, FLOOR + 1.95], [x + 0.06, LEN, FLOOR + 2.3], M.panel, { parent: car, r: 0 });
      K.box([x - s * 0.09, -2, FLOOR + 2.22], [x - s * 0.05, LEN, FLOOR + 2.4], M.green, { parent: car, r: 0.01 });
      for (let y = -2; y < LEN; y += 1.6) { K.box([x - 0.07, y - 0.18, FLOOR + 0.82], [x + 0.07, y + 0.18, FLOOR + 1.95], M.panel, { parent: car, r: 0.01 });
        K.box([x - s * 0.1, y - 0.2, FLOOR + 0.82], [x - s * 0.07, y + 0.2, FLOOR + 1.95], M.brass, { parent: car, r: 0.01 }); }
      K.box([x - 0.01, -2, FLOOR + 0.84], [x + 0.01, LEN, FLOOR + 1.94], M.glass, { parent: car, r: 0, cast: false });
      const bd = K.card([x + s * 3.0, LEN / 2 - 1, FLOOR + 1.0], 40, 10, view, { parent: car, rotZ: s > 0 ? -90 : 90, emissive: 1.25 }); backs.push(bd); }
    // ceiling: orange planks, cross beams, a raised centre (clerestory)
    K.box([-HW, -2, FLOOR + 2.4], [HW, LEN, FLOOR + 2.5], M.ceil, { parent: car, r: 0 });
    for (let y = -2; y < LEN; y += 1.6) K.box([-HW, y - 0.07, FLOOR + 2.3], [HW, y + 0.07, FLOOR + 2.42], M.beam, { parent: car, r: 0.01 });
    for (const s of [-1, 1]) K.box([s * 0.55 - 0.06, -2, FLOOR + 2.3], [s * 0.55 + 0.06, LEN, FLOOR + 2.42], M.beam, { parent: car, r: 0.01 });
    // the far end wall with a door
    K.box([-HW, LEN - 0.1, FLOOR], [HW, LEN, FLOOR + 2.4], M.panel, { parent: car, r: 0 }); K.box([-0.45, LEN - 0.14, FLOOR], [0.45, LEN - 0.1, FLOOR + 2.0], M.dark, { parent: car, r: 0.01 });
    K.box([-0.5, LEN - 0.16, FLOOR + 2.0], [0.5, LEN - 0.1, FLOOR + 2.08], M.brass, { parent: car, r: 0.01 });
    // seats: high-backed red velvet chairs in facing pairs along both sides, a pedestal table between each pair
    const seat = (x, y, face) => { const g = K.group([x, y, FLOOR], face > 0 ? 180 : 0, car);   // face -1: looks -y
      K.box([-0.34, -0.3, 0], [0.34, 0.3, 0.3], M.dark, { parent: g, r: 0.02 }); K.box([-0.36, -0.32, 0.3], [0.36, 0.3, 0.46], M.velvet, { parent: g, r: 0.05 });
      K.box([-0.4, 0.22, 0.3], [0.4, 0.38, 1.55], M.velvet, { parent: g, r: 0.06 }); K.box([-0.44, 0.3, 0.2], [0.44, 0.42, 1.62], M.dark, { parent: g, r: 0.03 });
      for (const sx of [-0.4, 0.4]) { K.box([sx - 0.05, -0.3, 0.3], [sx + 0.05, 0.3, 0.68], M.velvet, { parent: g, r: 0.04 }); K.box([sx - 0.055, -0.32, 0.66], [sx + 0.055, 0.32, 0.7], M.brass, { parent: g, r: 0.01 }); }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) K.sphere([-0.25 + i * 0.17, 0.215, 0.6 + j * 0.3], 0.018, M.brass, { parent: g, seg: 8 });
      return g; };
    for (const s of [-1, 1]) for (let y = 3.05; y < LEN - 1; y += 3.0) { seat(s * 0.78, y, -1); if (y > 4) seat(s * 0.78, y - 1.7, 1); }
    const table = (x, y) => { const g = K.group([x, y, FLOOR], 0, car); K.cyl([0, 0, 0.35], 0.03, 0.7, M.dark, { parent: g }); K.cyl([0, 0, 0.03], 0.2, 0.06, M.dark, { parent: g }); K.cyl([0, 0, 0.71], 0.28, 0.03, M.dark, { parent: g, seg: 40 }); K.torus([0, 0, 0.725], 0.28, 0.008, M.brass, { parent: g }); return g; };
    for (const s of [-1, 1]) for (let y = 2.2; y < LEN - 1; y += 3.0) table(s * 0.75, y);
    // teacup and saucer on the near table
    const cup = K.group([-0.62, 2.18, FLOOR + 0.725], 0, car); cup.name = 'cup';
    { const china = K.mat([0.97, 0.95, 0.92], 0.25, { physical: true, clearcoat: 1 }), rim = K.mat([0.9, 0.7, 0.3], 0.25, { metal: 0.9 });
      K.lathe([0, 0, 0], [[0, 0], [0.07, 0.002], [0.075, 0.008], [0.06, 0.01], [0, 0.008]], china, { parent: cup });
      K.lathe([0, 0, 0.008], [[0, 0], [0.025, 0], [0.04, 0.02], [0.046, 0.055], [0.044, 0.058], [0.0, 0.03]], china, { parent: cup });
      K.cyl([0, 0, 0.055], 0.04, 0.004, K.mat([0.45, 0.22, 0.08], 0.15), { parent: cup }); K.torus([0, 0, 0.063], 0.046, 0.003, rim, { parent: cup, rx: Math.PI / 2 });
      K.torus([0.055, 0, 0.035], 0.016, 0.004, china, { parent: cup, rx: 0 }); }
    K.prop('cup', cup);
    // lamps: brass pendants with glowing globes down the middle, wall sconces between windows
    const glowM = K.mat([1, 0.95, 0.8], 0.2, { emit: [1, 0.82, 0.5], emitK: 2.2 }); const pend = [], globes = [];
    for (let y = 0.6; y < LEN; y += 3.2) for (const x of [-0.6, 0.6]) { pend.push({ m: beamMatrix([x, y, FLOOR + 2.3], [x, y, FLOOR + 1.95], 0.015, 0.015) }); globes.push({ p: [x, y, FLOOR + 1.88], s: 0.09 });
      K.point([x, y, FLOOR + 1.8], [1, 0.8, 0.5], 0.9, 3.2); }
    for (const s of [-1, 1]) for (let y = -1.2; y < LEN; y += 3.2) { globes.push({ p: [s * (HW - 0.14), y, FLOOR + 2.06], s: 0.06 }); pend.push({ m: beamMatrix([s * (HW - 0.06), y, FLOOR + 2.0], [s * (HW - 0.14), y, FLOOR + 2.0], 0.02, 0.02) }); }
    merged(K, unitBox(0), M.brass, pend, { parent: car }); merged(K, new THREE.SphereGeometry(1, 16, 10), glowM, globes, { parent: car, cast: false });
    for (const s of [-1, 1]) K.area([s * (HW - 0.05), 6, FLOOR + 1.4], [0, 6, FLOOR + 0.8], 14, 1.0, [0.95, 0.95, 1.0], 2.2, { parent: car });
  } else {
    // ---- our plain wooden coach, outside, on a timber trestle
    sky(K, { sunDir: SUN_DIR, zenith: '#2552b8', mid: '#4a7fd2', horizon: '#c4c6e6', low: '#aaa6cc', clouds: 16, seed: 9, cloudK: 0.8 });
    const vp = tex(512, 512, (g, w, h) => { const q = rng(4); g.fillStyle = '#6e2a1a'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { const k = 0.85 + 0.3 * q(); g.fillStyle = `rgba(${k > 1 ? 255 : 0},${k > 1 ? 200 : 0},${k > 1 ? 160 : 0},${Math.abs(k - 1) * 0.6})`; g.fillRect(x, 0, 32, h);
        for (let j = 0; j < 7; j++) { g.strokeStyle = `rgba(30,10,5,${0.08 + 0.1 * q()})`; g.lineWidth = 1 + 2 * q(); g.beginPath(); const xx = x + q() * 32; g.moveTo(xx, 0); g.bezierCurveTo(xx + 4 * (q() - 0.5), h * 0.3, xx + 4 * (q() - 0.5), h * 0.7, xx, h); g.stroke(); }
        g.fillStyle = 'rgba(20,6,2,0.6)'; g.fillRect(x, 0, 3, h); } }, { repeat: [1, 1] });
    const M = { wall: K.mat([1, 1, 1], 0.55, { map: vp, physical: true, clearcoat: 0.3 }), frame: K.mat([0.40, 0.15, 0.08], 0.5, { physical: true, clearcoat: 0.4 }), green: K.mat([0.10, 0.38, 0.24], 0.55),
      dark: K.mat([0.12, 0.06, 0.05], 0.7), seat: K.mat([0.42, 0.22, 0.12], 0.6), roof: K.mat([0.16, 0.10, 0.08], 0.7), iron: K.mat([0.08, 0.08, 0.09], 0.5, { metal: 0.4 }), timber: K.mat([0.42, 0.34, 0.27], 0.85, { map: RSURF.tie(31) }) };
    vp.repeat.set(LEN / 4, 1);
    const z0 = FLOOR, z1 = FLOOR + 2.55, wz0 = FLOOR + 0.95, wz1 = FLOOR + 1.85, ww = 0.82;   // the big arched window at y = 0
    // near side (-x) with the opening: wall pieces round it, an arched head, a frame
    const nx = -HW, wcy = 0;
    K.box([nx - 0.06, -LEN / 2, z0], [nx + 0.06, wcy - ww / 2, z1], M.wall, { parent: car, r: 0 }); K.box([nx - 0.06, wcy + ww / 2, z0], [nx + 0.06, LEN / 2, z1], M.wall, { parent: car, r: 0 });
    K.box([nx - 0.06, wcy - ww / 2, z0], [nx + 0.06, wcy + ww / 2, wz0], M.wall, { parent: car, r: 0 });
    { const sh = new THREE.Shape(); sh.moveTo(-ww / 2, 0); sh.lineTo(ww / 2, 0); sh.lineTo(ww / 2, z1 - wz1 + 0.0); sh.lineTo(-ww / 2, z1 - wz1); sh.closePath();
      const hole = new THREE.Path(); hole.moveTo(-ww / 2, 0.0005); hole.lineTo(ww / 2, 0.0005); hole.absarc(0, 0.0005, ww / 2, 0, Math.PI, false); sh.holes.push(hole);
      const head = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false, curveSegments: 24 }), M.wall); head.rotation.y = -Math.PI / 2; head.position.copy(B(nx + 0.06, wcy, wz1)); K.add(head, car); }
    { const fr = new THREE.Shape(); const R0 = ww / 2 + 0.09, R1 = ww / 2; fr.moveTo(-R0, -(wz1 - wz0) - 0.06); fr.lineTo(-R0, 0); fr.absarc(0, 0, R0, Math.PI, 0, true); fr.lineTo(R0, -(wz1 - wz0) - 0.06); fr.lineTo(R1, -(wz1 - wz0) - 0.06); fr.lineTo(R1, 0); fr.absarc(0, 0, R1, 0, Math.PI, false); fr.lineTo(-R1, -(wz1 - wz0) - 0.06); fr.closePath();
      const f = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 24 }), M.frame); f.rotation.y = -Math.PI / 2; f.position.copy(B(nx - 0.07, wcy, wz1)); K.add(f, car); }
    K.box([nx - 0.16, wcy - ww / 2 - 0.12, wz0 - 0.06], [nx + 0.08, wcy + ww / 2 + 0.12, wz0], M.frame, { parent: car, r: 0.015 });
    // the far side wall (closed, two small windows onto the backdrop), ends, floor, roof with a clerestory
    K.box([HW - 0.06, -LEN / 2, z0], [HW + 0.06, LEN / 2, z1], M.wall, { parent: car, r: 0 });
    for (const y of [-0.9, 0.9]) { K.box([HW - 0.07, y - 0.32, wz0 + 0.1], [HW - 0.05, y + 0.32, wz1 - 0.05], K.mat([0.75, 0.85, 1.0], 0.1, { emit: [0.7, 0.8, 1.0], emitK: 0.5 }), { parent: car, r: 0 }); }
    K.box([-HW, -LEN / 2, z0 - 0.1], [HW, LEN / 2, z0], M.dark, { parent: car, r: 0 });
    K.box([-HW - 0.12, -LEN / 2, z1], [HW + 0.12, LEN / 2, z1 + 0.12], M.roof, { parent: car, r: 0.03 }); K.box([-0.7, -LEN / 2 + 1, z1 + 0.12], [0.7, LEN / 2 - 1, z1 + 0.55], M.wall, { parent: car, r: 0.02 });
    K.box([-0.82, -LEN / 2 + 0.9, z1 + 0.55], [0.82, LEN / 2 - 0.9, z1 + 0.64], M.roof, { parent: car, r: 0.02 });
    // the lettering band above the windows and the trim lines
    K.box([nx - 0.1, -LEN / 2, z1 - 0.45], [nx - 0.05, LEN / 2, z1 - 0.05], M.green, { parent: car, r: 0.01 });
    K.card([nx - 0.105, 0, z1 - 0.25], 8.5, 0.36, label('RED MESA LINE', { w: 2048, h: 90, bg: null, fg: '#e8b34a', font: 'Georgia, serif', weight: 900 }), { parent: car, rotZ: -90, transparent: true, env: 0.5 });
    for (const z of [z0 + 0.04, z1 - 0.47]) K.box([nx - 0.1, -LEN / 2, z], [nx - 0.05, LEN / 2, z + 0.04], M.frame, { parent: car, r: 0.01 });
    // painted (dark) window shapes along the rest of the side, a door at the end
    for (const y of [-6, -4.4, -2.8, 2.8, 4.4, 6]) { K.box([nx - 0.075, y - 0.34, wz0 + 0.1], [nx - 0.065, y + 0.34, wz1 - 0.08], K.mat([0.12, 0.13, 0.2], 0.15, { env: 1.4 }), { parent: car, r: 0.02 });
      K.box([nx - 0.08, y - 0.4, wz0 + 0.04], [nx - 0.07, y + 0.4, wz0 + 0.1], M.frame, { parent: car, r: 0.01 }); }
    // inside: a wooden bench under the window (a figure sits there, facing out), the opposite bench, a lamp
    K.box([-0.95, -0.7, z0], [-0.3, 0.7, z0 + 0.42], M.seat, { parent: car, r: 0.02 }); K.box([-0.34, -0.7, z0 + 0.42], [-0.22, 0.7, z0 + 1.05], M.seat, { parent: car, r: 0.02 });
    K.box([0.6, -0.7, z0], [HW - 0.06, 0.7, z0 + 0.42], M.seat, { parent: car, r: 0.02 }); K.box([HW - 0.18, -0.7, z0 + 0.42], [HW - 0.06, 0.7, z0 + 1.05], M.seat, { parent: car, r: 0.02 });
    K.point([0, 0, z1 - 0.3], [1, 0.82, 0.55], 1.0, 3.5, { parent: car });
    // underframe, bogies, the trestle and track beneath
    K.box([-1.2, -LEN / 2 + 1, RAIL_TOP + 0.75], [1.2, LEN / 2 - 1, z0 - 0.1], M.iron, { parent: car, r: 0.02 });
    for (const yc of [-5, 5]) for (const dy of [-0.75, 0.75]) for (const sx of [-1, 1]) K.cyl([sx * 0.7175, yc + dy, RAIL_TOP + 0.42], 0.42, 0.12, M.iron, { parent: car, axis: 'x' });
    track(K, { y0: -60, y1: 60, at: [0, 0, 0], seed: 4, heroY: null, stones: false, ballast: false });
    const tw = []; for (let y = -60; y < 60; y += 0.6) tw.push({ p: [0, y, -0.3], s: [3.2, 0.25, 0.3] }); for (const sx of [-0.8, 0.8]) tw.push({ p: [sx, 0, -0.6], s: [0.3, 120, 0.4] });
    for (let y = -54; y < 60; y += 9) for (let z = 0; z > -40; z -= 4) { const a = 1.3 + 0.012 * -z; for (const s of [-1, 1]) tw.push({ m: beamMatrix([s * a, y, z - 0.8], [s * (a + 0.05), y, z - 4.8], 0.24, 0.24) }, { m: beamMatrix([-a, y, z - 0.8], [a, y, z - 4.8], 0.12, 0.12) }); }
    merged(K, unitBox(0.01), M.timber, tw);
    // the canyon backdrop: a big painted, self-lit strip far behind the car, scrolling
    backs.push(K.card([60, 0, -27], 320, 150, view, { rotZ: -90, emissive: 1.15, transparent: true }));   // horizon row at z ~ 3.5
  }
  view.repeat.set(OUT ? 2 : 0.5, 1);
  K.anim('car', car, (f, v) => { view.offset.x = (v('scroll', 0) / (OUT ? 130 : 80)) % 1;
    const b = v('bounce', 0); car.position.y = b * (0.025 * Math.sin(f * 1.9) + 0.018 * Math.sin(f * 3.7 + 1)); car.rotation.z = b * 0.008 * Math.sin(f * 1.3); });
  atmos(K, K.root, { haze: { color: '#b8b4dc', near: 60, dist: 600, max: 0.3 }, deep: { z: -20, depth: 60, color: '#2034c4', max: OUT ? 0.9 : 0 }, sun: { color: '#fff0d6', k: 0.05, dir: SUN_DIR } });
  collideFromMeshes(COLLIDE, K.root, { skip: OUT ? ['cup', 'car'] : ['cup'], big: 8, floor: FLOOR + 0.06, maxZ: FLOOR + 2.4 });   // outside: the coach shell's box holds the rider in the window seat (a false hit)
  return { props: K.props };
}
