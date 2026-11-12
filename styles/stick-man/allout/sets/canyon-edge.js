// Canyon edge: two rival lines side by side on a ledge (design approved by Kai at stick pilot A, gate 2, 2026-11-12).
// The engineer's BLUE line (x = OX, a 4 cm gap at every joint, the hero joint at y = 0, blue sleepers) next to the wall,
// the rival's PURPLE line (x = RX, tight rails, no gaps, purple sleepers) on the lip side, then the drop into the canyon:
// when the purple line buckles it has nowhere to go but over the lip. Blender metres. Look: EDGE_LOOK (the approved
// "canyon colour": afternoon sun, blue sky, saturated red-orange wall, violet shade); heat reads through the props.
// setOpts.sky: 'day' (default, the approved look) | 'noon' | 'flat' (the two looks Kai did not pick, kept for other reels)
// Story props (K.anim; keys via `set` beats):
//   joint   hero joint on the blue right rail at y = 0: gap 0..1 (1 = 4 cm, 0 = touching), heat 0..1
//   rtrack  the purple line: buckle 0..1 (a sideways snake, 1.4 m at 1 over 22 m round y = BK), heat 0..1
//   board   thermometer + calendar: temp 0..1, month 0 = MAY .. 1 = JULY
//   loco    blue 4-4-0 + coach on the blue line, facing -y: y (front y)
//   rloco   purple 4-4-0 + coach on the purple line, facing -y: y (front y), off 0..1 (derails toward the drop: slides out
//           and tips over the lip), fall (seconds after the lip: drops into the canyon at g = 9.8, scraping the cliff face, never through it), lamp 0..1
import { createKit, tex, rng, B, SURF } from '/styles/stick-man/allout/kit.js';
import { track, loco, coach, canyonWall, mesa, sky, atmos, slab, shrub, cactus, rock, pole, wires, collideFromMeshes, RSURF, RAIL_X, RAIL_TOP } from '/styles/stick-man/allout/rail-kit.js';

export const OX = 1.45, RX = -1.65, LIP = -4.3, BK = 9;
export const SUN_DIR = [0.38, 0.62, -0.69];
export const SUN_CENTER = [0, 4, 0.5], SUN_HALF = 13;
export const PLACES = { joint: [OX + RAIL_X, 0, RAIL_TOP], kink: [RX, BK, RAIL_TOP], board: [3.6, 1.6, 1.3] };
export const MARKS = { eng: [OX + 1.1, 0.05, 0], mag: [RX - 1.6, BK - 4, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-90, -160], [3.4, 320]]];
export const COLLIDE = [];
const NEAR_BANDS = [
  [-1, 0.6, '#4a1416', 0.1], [0.6, 4.4, '#d2621e', 0.15], [4.4, 5.1, '#e8a050', 0.3], [5.1, 8.8, '#cf4a1c', 0.4], [8.8, 12.4, '#c2201c', 0.7],
  [12.4, 13.3, '#5a1420', 0.5], [13.3, 16.8, '#d6601e', 1.2], [16.8, 17.8, '#8a1c24', 1.0], [17.8, 21.5, '#7c1e36', 1.8], [21.5, 22.4, '#9a2c40', 1.6],
  [22.4, 80, '#681630', 2.2]].map(([z0, z1, c, off]) => ({ z0, z1, c, off, wav: 0.7 }));
const SKY = {
  day: { zenith: '#2552b8', mid: '#4a7fd2', horizon: '#c4c6e6', low: '#aaa6cc', clouds: 16, cloudK: 0.7, haze: '#9e9ad0', deep: '#2b358c' },
  noon: { zenith: '#9fb4d8', mid: '#d6dce6', horizon: '#fbf1dc', low: '#f2dcc0', clouds: 3, cloudK: 0.35, haze: '#f0dcc4', deep: '#7a4a5a' },
  flat: { zenith: '#3a6fd8', mid: '#6aa0ee', horizon: '#ffd9a8', low: '#ffc890', clouds: 0, cloudK: 0, haze: '#f6b98c', deep: '#3a2a6a' },
};
const BLUE = [0.10, 0.30, 0.85], PURPLE = [0.42, 0.12, 0.62];
export const EDGE_LOOK = {
  light: { sun: [1.0, 0.85, 0.64], power: 3.8, sky: [0.56, 0.52, 0.92], ground: [0.85, 0.42, 0.30], hemi: 0.32, fill: [0.78, 0.62, 0.98], fillPower: 0.45, lit: [1.04, 1.0, 0.95], shade: [0.80, 0.58, 0.92], lamp: 1 },
  grade: { exp: 1.1, lift: 0.045, sat: 1.06, haze: 0.3, shadow: { c: [0.50, 0.20, 0.36], k: 0.22 }, shoulder: 0.25 },
  look: { ao: 0.7, aoRadius: 0.6, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.08, bloom: 0.45, hot: 0.3, ink: 2.1 },
};

export async function build(stage, opts = {}) {
  const S = SKY[opts.sky] || SKY.day;
  const K = createKit(stage, { env: { top: [0.42, 0.56, 0.98], mid: [0.84, 0.70, 0.84], bottom: [0.80, 0.42, 0.28],
    panels: [{ dir: [-0.38, -0.62, 0.69], size: 2.6, color: [1, 0.92, 0.78], power: 6 }, { dir: [1, 0.2, 0.25], w: 6, h: 3, color: [0.95, 0.5, 0.3], power: 1.6 }] }, envK: 0.55 });
  stage.scene.background = null;
  const r = rng(31);
  sky(K, { sunDir: opts.sunDir || SUN_DIR, zenith: S.zenith, mid: S.mid, horizon: S.horizon, low: S.low, clouds: S.clouds, seed: 14, cloudK: S.cloudK });
  const sand = K.mat([1, 1, 1], 0.95, { map: RSURF.sand(opts.sky === 'noon' ? '#e0a066' : '#d27a3c', 8) });
  slab(K, [LIP, -260, -0.5], [6.5, 900, 0], sand, { step: 3, tile: 3.5 });
  // ---- the two lines: ties tinted in team colour so each line reads at a glance
  const tieBlue = K.mat([0.16, 0.36, 0.92], 0.8), tiePurple = K.mat([0.50, 0.20, 0.72], 0.8);   // painted sleepers: each line reads by colour
  const T = track(K, { x: OX, y0: -150, y1: 300, heroY: 0, seed: 3, width: 1.35, tieMat: tieBlue });
  track(K, { x: OX, y0: 300, y1: 820, seed: 4, stones: false, heroY: null, cast: false, width: 1.35, tieMat: tieBlue });
  const RT = track(K, { x: RX, y0: -150, y1: 300, seed: 7, gapM: 0.0005, bend: true, width: 1.35, tieMat: tiePurple, heat: { y: BK, spread: 30 } });
  track(K, { x: RX, y0: 300, y1: 820, seed: 8, stones: false, cast: false, gapM: 0.0005, width: 1.35, tieMat: tiePurple });
  // ---- the wall (right), the cliff under the lip, the far wall, the canyon floor
  canyonWall(K, { at: [4.6, 900, 0], rotZ: -90, L: 1160, H: 30, zb: -1, step: 2.6, fine: [820, 920, 1.2], rows: 1.3, amp: 1.0, crag: 10, top: 40, seed: 5, bands: NEAR_BANDS, texL: 38, recess: 0.5 });
  const cliff = canyonWall(K, { at: [LIP, 900, 0], rotZ: -90, L: 1160, H: -0.15, zb: -175, step: 4, rows: 3, amp: 1.2, crag: 0.25, top: 2.2, topRows: 3, seed: 7, pal: 'red', ledge: 1.5, big: 3, texL: 60, lowSafe: -999 });
  canyonWall(K, { at: [-95, -420, 0], rotZ: 90, L: 1400, H: -3, zb: -175, step: 4.5, rows: 2.6, amp: 2.2, crag: 5, top: 260, seed: 9, pal: 'red', ledge: 2.5, big: 5, texL: 70, lowSafe: -999, plateau: '#8a3a30' });
  slab(K, [-96, -420, -176], [LIP, 980, -175], K.mat([0.18, 0.2, 0.45], 1.0), { step: 40, tile: 40 });
  for (const [x, y, rr, h, s] of [[-420, 640, 70, 42, 1], [-760, 1150, 120, 70, 2], [-330, 1380, 90, 55, 3], [-980, 420, 140, 60, 4], [-1250, 980, 160, 80, 5], [-80, 1650, 120, 50, 6], [320, 1700, 140, 70, 7], [-600, -500, 110, 50, 8]])
    mesa(K, { at: [x, y, -20], r: rr, h, seed: s, pal: s % 2 ? 'red' : 'dusk' });
  // ---- poles on the wall side, dressing off both beds
  const rows = [[], [], [], []];
  for (let y = -137.5; y < 420; y += 25) { const tops = pole(K, [3.9, y, 0], { seed: Math.floor(y + 500), h: 7.4 }); tops.forEach((t, i) => rows[i].push(t)); }
  wires(K, rows, { sag: 0.35 });
  const clear = (x, y) => y > -4 && y < 12;
  for (let i = 0; i < 70; i++) { const y = -60 + 260 * r(), x = 3.9 + 0.4 * r(); if (!clear(x, y)) shrub(K, [x, y, 0], 0.6 + 0.7 * r(), { seed: i + 3, c: r() > 0.5 ? [0.30, 0.42, 0.20] : [0.42, 0.46, 0.22] }); }
  for (let i = 0; i < 30; i++) { const y = -60 + 260 * r(), x = LIP + 0.3 + 0.3 * r(); if (!clear(x, y)) shrub(K, [x, y, 0], 0.4 + 0.5 * r(), { seed: i + 80, c: [0.36, 0.44, 0.22] }); }
  for (const [x, y, s] of [[4.0, 14, 1.1], [3.95, 33, 1.3], [4.1, -22, 1.2], [4.0, 58, 1.0]]) cactus(K, [x, y, 0], s, { seed: Math.round(y) + 40 });
  for (let i = 0; i < 60; i++) { const y = -40 + 200 * r(), x = r() > 0.5 ? 3.5 + 0.4 * r() : LIP + 0.2 + 0.6 * r(); rock(K, [x, y, -0.05], 0.06 + 0.22 * r() * r(), { seed: i + 5, c: [[0.62, 0.30, 0.20], [0.78, 0.55, 0.40], [0.5, 0.42, 0.4]][i % 3] }); }
  // ---- story prop: the hero joint on the blue line
  const J = K.group([OX + RAIL_X, 0, 0]); J.name = 'joint';
  const heat = T.mats.heat.userData.rkHeat;
  J.userData.seenParts = T.hero.filter(h => h.side > 0).map(h => h.mesh);
  K.anim('joint', J, (f, v) => { const G = 0.04 * Math.max(0.005, v('gap', 1)), d = (G - 0.03) / 2; for (const h of T.hero) h.move(h.y1 < 0.01 ? -d : d);
    const k = v('heat', 0); heat.heat.value = k; heat.spread.value = 0.35 + 1.25 * Math.min(1, k * 1.2); });
  // ---- story prop: the purple line buckles
  const rh = RT.mats.heat.userData.rkHeat;
  K.anim('rtrack', RT.group, (f, v) => { const k = v('buckle', 0); RT.bend.amp.value = 1.4 * k; RT.bend.c.value = BK; RT.bend.L.value = 22;
    const h = v('heat', 0); rh.heat.value = h; rh.spread.value = 20 + 40 * h; rh.y.value = BK; });
  // ---- story prop: the board (thermometer + calendar), a blue and a purple pennant
  const bd = K.group([3.6, 1.6, 0], -90); bd.name = 'board';
  const green = K.mat([1, 1, 1], 0.75, { map: SURF.weathered([0.22, 0.52, 0.36], 12, 7) }), post = K.mat([0.42, 0.30, 0.20], 0.85, { map: RSURF.tie(21) });
  for (const x of [-0.5, 0.5]) K.box([x - 0.045, -0.045, -0.3], [x + 0.045, 0.045, 1.36], post, { parent: bd, r: 0.012 });
  K.box([-0.56, 0.02, 0.5], [0.56, 0.085, 1.3], green, { parent: bd, r: 0.015 });
  const thermo = K.group([-0.3, -0.005, 0.56], 0, bd);
  K.card([0, 0, 0.34], 0.16, 0.62, tex(128, 512, (g, w, h) => { g.fillStyle = '#f2ede2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2a30'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#2a2a30'; for (let i = 0; i <= 10; i++) { const y = h - 70 - i * (h - 110) / 10; g.fillRect(w * 0.62, y, i % 2 ? 10 : 18, 3); } }), { parent: thermo, env: 0.4 });
  const redM = K.mat([0.85, 0.08, 0.06], 0.3, { emit: [0.5, 0.02, 0.02], emitK: 0.4 });
  K.sphere([0.035, -0.012, 0.08], 0.022, redM, { parent: thermo });
  const column = K.cyl([0.04, -0.016, 0.1], 0.0075, 1, redM, { parent: thermo });
  const page = month => tex(320, 400, (g, w, h) => { g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b0261c'; g.fillRect(0, 0, w, 74);
    g.fillStyle = '#1f1f28'; g.font = '900 64px Georgia'; g.textAlign = 'center'; g.fillText(month, w / 2, 160); });
  const cal = K.group([0.24, -0.012, 1.2], 0, bd);
  K.card([0, 0.004, -0.22], 0.34, 0.42, page('JULY'), { parent: cal, env: 0.4 });
  const may = K.group([0, -0.002, 0], 0, cal); K.card([0, 0, -0.22], 0.34, 0.42, page('MAY'), { parent: may, env: 0.4 }).material.side = 2;
  const pennant = (at, c) => { const pen = K.group(at), stick = K.mat([0.45, 0.32, 0.2], 0.8); K.cyl([0, 0, 1.0], 0.014, 2.0, stick, { parent: pen });
    const fl = new K.THREE.Mesh(new K.THREE.PlaneGeometry(0.5, 0.32, 8, 2), K.mat(c, 0.65, { side: 2 })); const fp = fl.geometry.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, 0.04 * Math.sin((fp.getX(i) + 0.25) * 8)); fl.geometry.computeVertexNormals(); fl.position.copy(B(0.26, 0, 1.82)); fl.rotation.y = Math.PI / 2 - 0.4; K.add(fl, pen); return fl; };
  const fB = pennant([3.3, 3.5, 0], BLUE), fP = pennant([LIP + 0.5, -9, 0], PURPLE);
  K.anim('board', bd, (f, v) => { const t = Math.max(0, Math.min(1, v('temp', 0.2))); const hgt = 0.05 + 0.44 * t; column.scale.y = hgt; column.position.copy(B(0.035, -0.016, 0.1 + hgt / 2));
    const m = v('month', 0), a = Math.max(0, Math.min(1, (m - 0.4) / 0.2)); may.rotation.x = -a * 2.9; may.visible = a < 0.99;
    fB.rotation.x = fP.rotation.x = 0.06 * Math.sin(f * 0.25); });
  // ---- the two trains (a 4-4-0 and one coach each), facing -y toward a camera at y < 0
  const train = (name, x, y0, livery, ccol, letters) => {
    const g = K.group([x, y0, 0]); g.name = name;
    const LO = loco(K, { parent: g, name: name + '_loco', number: name === 'loco' ? '9' : '1', livery });
    const C = coach(K, { parent: g, name: name + '_coach', color: ccol, letters, trim: '#f0d890' }); C.group.position.copy(B(0, 16.2, 0));
    K.prop(name, g); return { g, LO };
  };
  const ours = train('loco', OX, 40, { cab: BLUE, wheel: BLUE, pilot: BLUE, tender: BLUE, boiler: [0.06, 0.08, 0.14] }, BLUE, 'BLUE GAP LINE');
  const theirs = train('rloco', RX, 30, { cab: PURPLE, wheel: PURPLE, pilot: PURPLE, tender: PURPLE, boiler: [0.10, 0.05, 0.14], trim: [0.92, 0.75, 0.30] }, PURPLE, 'PURPLE SMOOTH LINE');
  K.anim('loco', ours.g, (f, v) => { const y = v('y', 40); ours.g.position.copy(B(OX, y, 0)); ours.LO.drive(40 - y); ours.LO.lamp(v('lamp', 0)); });
  // the cliff under the lip as a contact surface: FACE[iy][iz] = x of the rock face (rock is at larger x), sampled by rays
  // along +x every 2 m of y round the buckle and every 0.5 m of depth; a falling train is pushed out of it (it scrapes down the
  // face, never through it)
  const T3 = K.THREE, ray = new T3.Raycaster(), FY = [], FZ = [], FACE = [];
  cliff.updateMatrixWorld(true);
  for (let y = BK - 14; y <= BK + 30; y += 2) FY.push(y);
  for (let z = 0; z >= -60; z -= 0.5) FZ.push(z);
  for (const y of FY) FACE.push(FZ.map(z => { ray.set(B(LIP - 40, y, z), new T3.Vector3(1, 0, 0)); ray.far = 60;
    const h = ray.intersectObject(cliff, false)[0]; return h ? h.point.x : LIP; }));
  const faceAt = (y0, y1, z0, z1) => { let m = Infinity;
    FY.forEach((y, a) => { if (y < y0 || y > y1) return; FZ.forEach((z, b) => { if (z <= z1 && z >= z0) m = Math.min(m, FACE[a][b]); }); });
    return m === Infinity ? LIP : m; };
  // rloco off 0..1: it slides sideways off its bed to the lip and tips over the edge (no sinking into the ground: it only drops
  // once its centre overhangs). fall: seconds since it left the lip (key it with a linear ramp at real time): it keeps
  // 3 m/s sideways, drops at g = 9.8, and the cliff face pushes it out (contact), nose tipping down.
  const HALF = 1.1, HIGH = 4.2, LEN = 20;
  K.anim('rloco', theirs.g, (f, v) => { const y = v('y', 30), o = Math.max(0, Math.min(1, v('off', 0))), t = Math.max(0, v('fall', 0));
    const x0 = RX + (LIP - 0.6 - RX) * o, over = Math.max(0, LIP - x0);
    let x = x0 - 3 * t, z = -1.2 * over - 4.9 * t * t;
    if (t > 0) x = Math.min(x, faceAt(y - 2, y + LEN, z, z + HIGH) - HALF);
    theirs.g.position.copy(B(x, y, z)); theirs.g.rotation.set(-0.5 * t, -0.08 * o, 0.3 * o + 0.6 * t);
    theirs.LO.drive(30 - y); theirs.LO.lamp(v('lamp', 0)); });
  stage.addBounce([3.0, 3.0, 1.4], [1.0, 0.62, 0.42], 1.3, 7);
  atmos(K, K.root, { haze: { color: S.haze, near: 30, dist: 300, max: 0.66 }, deep: { z: -12, depth: 115, color: S.deep, max: 0.97 }, sun: { color: '#fff0d6', k: 0.4, dir: opts.sunDir || SUN_DIR }, squash: { from: 62, span: 17.5, L: 160 } });
  collideFromMeshes(COLLIDE, K.root, { skip: ['loco', 'rloco', 'joint'], big: 8 });
  return { props: K.props };
}
