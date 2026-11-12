// Canyon track: the engineer's line. A straight track along +y (centre x = 0, y -150..300, running on to the vanishing
// point) on a sandy ledge at the foot of a towering layered sandstone wall (face at x ~ 3.6..4.6, 30 m with crags to ~40,
// orange base, a vivid red band, magenta-maroon top), telegraph poles with wires on the wall side every 25 m, a gravel
// shoulder on the left to x = -3.3, then the drop into the canyon: the far wall ~95 m across in blue-violet haze, its foot
// lost in deep blue, mesas on the horizon. From y -32 to 158 a rock cut closes the left side (the hook: the loco comes at
// the joint through it); hide it for open shots with the key cut.show 0, or setOpts { cut: false }. Blender metres.
// Story props (K.anim; keys via `set` beats):
//   joint  the hero joint on the right rail at y = 0: gap 0..1 (1 = 4 cm, 0 = touching), heat 0..1 (glow magenta -> pink ->
//          yellow-white spreading ~1.5 m along both rails), coin 0..1 (falls in, stands wedged), paper 0..1 (a sheet slides in
//          and stands), saw 0..1 (a half-cut notch grows at y = -0.3)
//   board  post board at [2.3, 1.0]: temp 0..1 (red column), month 0 = MAY .. 1 = JULY (page flips at 0.5), show 0/1; blue pennant
//   loco   4-4-0 facing -y: y (front y, m; wheels turn with distance), lamp 0..1 (lens + point and spot light on the rails)
//   saw    a hand saw resting in the notch (grip at the handle; key show 0/1), cut (show 0/1: the rock cut)
import { createKit, label, tex, rng, B, SURF } from '../kit.js';
import { track, loco, canyonWall, mesa, sky, atmos, slab, shrub, cactus, rock, pole, wires, collideFromMeshes, RSURF, RAIL_X, RAIL_TOP } from '../rail-kit.js';

export const SUN_DIR = [0.38, 0.62, -0.69];                   // afternoon sun from the left and the camera side: the wall face is lit
export const SUN_CENTER = [0.5, 2.5, 0.5], SUN_HALF = 11;
const LOCO_Y = 70;
export const PLACES = { joint: [RAIL_X, 0, RAIL_TOP], board: [2.3, 1.0, 1.3], funnel: [0, LOCO_Y + 2.05, 3.47], notch: [RAIL_X, -0.3, RAIL_TOP], lip: [-3.3, 6, 0] };
export const MARKS = { saw: [1.05, -0.35, 0], track: [0, 4, 0], boss: [0.4, 2.2, 0], eng: [-0.7, 1.6, 0], wall: [2.6, 6, 0] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-90, -160], [3.4, 320]]];
export const COLLIDE = [];
// the act's light, grade and look for this place (a reel can spread these: `light: CANYON_LOOK.light`)
export const CANYON_LOOK = {
  light: { sun: [1.0, 0.85, 0.64], power: 3.8, sky: [0.56, 0.52, 0.92], ground: [0.85, 0.42, 0.30], hemi: 0.32, fill: [0.78, 0.62, 0.98], fillPower: 0.45, lit: [1.04, 1.0, 0.95], shade: [0.80, 0.58, 0.92], lamp: 1 },
  grade: { exp: 1.04, lift: 0.02, sat: 1.12, haze: 0.3, shadow: { c: [0.40, 0.18, 0.44], k: 0.35 }, shoulder: 0.25 },
  look: { ao: 0.7, aoRadius: 0.6, shadowRadius: 2.0, sat: 1.2, con: 1.05, vig: 0.08, bloom: 0.45, hot: 0.3, ink: 2.1 },
};
const NEAR_BANDS = [   // the near wall's strata, bottom to top (reference: orange base, one vivid red band, magenta-maroon crags on top)
  [-1, 0.6, '#4a1416', 0.1], [0.6, 4.4, '#d2621e', 0.15], [4.4, 5.1, '#e8a050', 0.3], [5.1, 8.8, '#cf4a1c', 0.4], [8.8, 12.4, '#c2201c', 0.7],
  [12.4, 13.3, '#5a1420', 0.5], [13.3, 16.8, '#d6601e', 1.2], [16.8, 17.8, '#8a1c24', 1.0], [17.8, 21.5, '#7c1e36', 1.8], [21.5, 22.4, '#9a2c40', 1.6],
  [22.4, 80, '#681630', 2.2]].map(([z0, z1, c, off]) => ({ z0, z1, c, off, wav: 0.7 }));

export async function build(stage, opts = {}) {
  const K = createKit(stage, { env: { top: [0.42, 0.56, 0.98], mid: [0.84, 0.70, 0.84], bottom: [0.80, 0.42, 0.28],
    panels: [{ dir: [-0.38, -0.62, 0.69], size: 2.6, color: [1, 0.92, 0.78], power: 6 }, { dir: [1, 0.2, 0.25], w: 6, h: 3, color: [0.95, 0.5, 0.3], power: 1.6 }] }, envK: 0.55 });
  stage.scene.background = null;
  const r = rng(31);
  sky(K, { sunDir: SUN_DIR, zenith: '#2552b8', mid: '#4a7fd2', horizon: '#c4c6e6', low: '#aaa6cc', clouds: 16, seed: 14, cloudK: 0.7 });
  // ---- ground: the sandy ledge between the cliff lip and the wall
  const sand = K.mat([1, 1, 1], 0.95, { map: RSURF.sand('#d27a3c', 8) });
  slab(K, [-3.3, -260, -0.5], [6.5, 900, 0], sand, { step: 3, tile: 3.5 });
  // ---- the track (hero joint at y = 0) and its run on to the vanishing point
  const T = track(K, { y0: -150, y1: 300, heroY: 0, seed: 3 });
  track(K, { y0: 300, y1: 820, seed: 4, stones: false, heroY: null, cast: false });
  // ---- the wall on the right (face looks -x), the cliff below the lip, the far wall, the canyon floor
  canyonWall(K, { at: [4.6, 900, 0], rotZ: -90, L: 1160, H: 30, zb: -1, step: 2.6, fine: [820, 920, 1.2], rows: 1.3, amp: 1.0, crag: 10, top: 40, seed: 5,
    bands: NEAR_BANDS, texL: 38, recess: 0.5 });
  canyonWall(K, { at: [-3.3, 900, 0], rotZ: -90, L: 1160, H: -0.15, zb: -175, step: 4, rows: 3, amp: 1.2, crag: 0.25, top: 2.2, topRows: 3, seed: 7, pal: 'red', ledge: 1.5, big: 3, texL: 60, lowSafe: -999 });
  canyonWall(K, { at: [-95, -420, 0], rotZ: 90, L: 1400, H: -3, zb: -175, step: 4.5, rows: 2.6, amp: 2.2, crag: 5, top: 260, seed: 9, pal: 'red', ledge: 2.5, big: 5, texL: 70, lowSafe: -999, plateau: '#8a3a30' });
  slab(K, [-96, -420, -176], [-3, 980, -175], K.mat([0.18, 0.2, 0.45], 1.0), { step: 40, tile: 40 });
  // mesas on the horizon (the haze turns them lilac)
  for (const [x, y, rr, h, s] of [[-420, 640, 70, 42, 1], [-760, 1150, 120, 70, 2], [-330, 1380, 90, 55, 3], [-980, 420, 140, 60, 4], [-1250, 980, 160, 80, 5], [-80, 1650, 120, 50, 6], [320, 1700, 140, 70, 7], [-600, -500, 110, 50, 8]])
    mesa(K, { at: [x, y, -20], r: rr, h, seed: s, pal: s % 2 ? 'red' : 'dusk' });
  // ---- the rock cut ahead (the hook: the loco comes out of it)
  const cut = K.group([0, 0, 0]); cut.name = 'cut';
  canyonWall(K, { at: [-3.5, -32, 0], rotZ: 90, L: 190, H: 26, zb: -1, step: 2.2, rows: 1.3, amp: 0.8, crag: 6, top: 30, seed: 12, slope: true, caps: true, bands: NEAR_BANDS.filter(b => b.z0 < 40).map(b => ({ ...b, off: b.off * 0.7 })), texL: 38, parent: cut, recess: 0.45 });
  if (opts.cut === false) cut.visible = false;
  K.anim('cut', cut, (f, v) => { cut.visible = opts.cut !== false && v('show', 1) > 0.5; });
  // ---- telegraph poles on the wall side, wires between them
  const rows = [[], [], [], []];
  for (let y = -137.5; y < 420; y += 25) { const tops = pole(K, [3.1, y, 0], { seed: Math.floor(y + 500), h: 7.4 }); tops.forEach((t, i) => rows[i].push(t)); }
  wires(K, rows, { sag: 0.35 });
  // ---- dressing: shrubs and cacti at the wall foot and on the lip, rocks on the sand, a few on the far ledge
  const clear = (x, y) => (y > -4 && y < 9 && x > 1.5) || (y > -3 && y < 6 && x < -1.2);
  for (let i = 0; i < 70; i++) { const y = -60 + 260 * r(), x = 3.4 + 0.5 * r(); if (!clear(x, y)) shrub(K, [x, y, 0], 0.6 + 0.7 * r(), { seed: i + 3, c: r() > 0.5 ? [0.30, 0.42, 0.20] : [0.42, 0.46, 0.22] }); }
  for (let i = 0; i < 40; i++) { const y = -60 + 260 * r(), x = -2.6 - 0.6 * r(); if (!clear(x, y)) shrub(K, [x, y, 0], 0.4 + 0.5 * r(), { seed: i + 80, c: [0.36, 0.44, 0.22] }); }
  for (const [x, y, s] of [[3.7, 14, 1.1], [3.5, 33, 1.3], [-2.7, 21, 0.9], [3.6, -22, 1.2], [3.8, 58, 1.0], [-2.9, -14, 0.8]]) cactus(K, [x, y, 0], s, { seed: Math.round(y) + 40 });
  for (let i = 0; i < 90; i++) { const y = -40 + 200 * r(), x = r() > 0.5 ? 2.25 + 1.3 * r() : -2.2 - 0.9 * r(); if (!clear(x, y)) rock(K, [x, y, -0.05], 0.06 + 0.22 * r() * r(), { seed: i + 5, c: [[0.62, 0.30, 0.20], [0.78, 0.55, 0.40], [0.5, 0.42, 0.4]][i % 3] }); }
  // ---- story prop: the hero joint (gap, heat, coin, paper, saw notch)
  const J = K.group([RAIL_X, 0, 0]); J.name = 'joint';
  const coinM = K.mat([0.86, 0.70, 0.36], 0.25, { metal: 0.9, env: 1.5 });
  const coin = K.group([0, 0, 0], 0, J); { const c = K.cyl([0, 0, 0], 0.022, 0.003, coinM, { parent: coin, axis: 'y', seg: 32 }); K.torus([0, 0, 0], 0.0205, 0.0016, coinM, { parent: coin, rx: 0 }); c.userData.noCollide = true; }
  const paperT = tex(256, 340, (g, w, h) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,90,120,0.25)'; for (let y = 40; y < h - 20; y += 18) g.fillRect(18, y, w - 36, 2); g.fillStyle = 'rgba(200,60,60,0.35)'; g.fillRect(34, 0, 2, h); });
  const paperM = K.mat([1, 1, 1], 0.8, { map: paperT, side: 2 });
  const paper = K.group([0, 0, 0], 0, J); { const p = new K.THREE.Mesh(new K.THREE.PlaneGeometry(0.13, 0.17, 6, 8), paperM); const pp = p.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.004 * Math.sin(pp.getX(i) * 26) + 0.003 * (pp.getY(i) + 0.085) * 8); p.geometry.computeVertexNormals(); K.add(p, paper, { cast: true }); }
  const kerf = K.mat([0.05, 0.04, 0.05], 0.6), fresh = K.mat([0.92, 0.9, 0.88], 0.2, { metal: 1.0, env: 1.6 });
  const notch = K.group([0, -0.3, RAIL_TOP], 0, J);
  const nk = K.box([-0.038, -0.004, -1], [0.038, 0.004, 0.002], kerf, { parent: notch, r: 0 });
  const nf = [-1, 1].map(s => K.box([-0.034, s * 0.004 - 0.0015, -0.0015], [0.034, s * 0.004 + 0.0015, 0.0008], fresh, { parent: notch, r: 0 }));
  const heat = T.mats.heat.userData.rkHeat, heroR = T.hero.filter(h => h.side > 0), heroL = T.hero.filter(h => h.side < 0);
  J.userData.seenParts = T.hero.filter(h => h.side > 0).map(h => h.mesh);   // the joint on screen = its two right-rail ends (play.js onScreen)
  K.anim('joint', J, (f, v) => {
    const G = 0.04 * Math.max(0.005, v('gap', 1)), d = (G - 0.03) / 2;
    for (const h of T.hero) h.move(h.y1 < 0.01 ? -d : d);
    const k = v('heat', 0); heat.heat.value = k; heat.spread.value = 0.35 + 1.25 * Math.min(1, k * 1.2);
    const c = v('coin', 0); coin.visible = c > 0.001;
    if (coin.visible) { const fall = Math.min(1, c / 0.7), z = RAIL_TOP + 0.42 * (1 - fall * fall) - 0.012 * fall, bounce = c > 0.7 ? Math.sin(Math.min(1, (c - 0.7) / 0.25) * Math.PI) * 0.025 * (1 - (c - 0.7) / 0.3) : 0;
      coin.position.copy(B(0, 0, z + bounce)); coin.rotation.set(0, (1 - fall) * 7.0, (1 - Math.min(1, c / 0.9)) * 0.6); }
    const p = v('paper', 0); paper.visible = p > 0.001;
    if (paper.visible) { const e = 1 - Math.pow(1 - Math.min(1, p), 2); paper.position.copy(B(0, 0, RAIL_TOP + 0.05 + 0.3 * (1 - e))); paper.rotation.set(0, 0, (1 - e) * 0.25); }
    const s = v('saw', 0); notch.visible = s > 0.001; nk.scale.y = 1; nk.position.y = 0; nk.scale.set(1, Math.max(0.001, s * 0.06), 1); nk.position.y = -(s * 0.06) / 2; nf.forEach(m => { m.visible = s > 0.02; });
  });
  // ---- story prop: the board (thermometer + calendar) and the blue pennant
  const bd = K.group([2.3, 1.0, 0], -90); bd.name = 'board';
  const green = K.mat([1, 1, 1], 0.75, { map: SURF.weathered([0.22, 0.52, 0.36], 12, 7) }), post = K.mat([0.42, 0.30, 0.20], 0.85, { map: RSURF.tie(21) });
  for (const x of [-0.5, 0.5]) K.box([x - 0.045, -0.045, -0.3], [x + 0.045, 0.045, 1.36], post, { parent: bd, r: 0.012 });
  K.box([-0.56, 0.02, 0.5], [0.56, 0.085, 1.3], green, { parent: bd, r: 0.015 });
  K.box([-0.58, -0.01, 1.27], [0.58, 0.095, 1.34], post, { parent: bd, r: 0.01 });
  const thermo = K.group([-0.3, -0.005, 0.56], 0, bd);
  K.card([0, 0, 0.34], 0.16, 0.62, tex(128, 512, (g, w, h) => { g.fillStyle = '#f2ede2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2a30'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#2a2a30'; g.font = '700 18px Georgia'; g.textAlign = 'right'; for (let i = 0; i <= 10; i++) { const y = h - 70 - i * (h - 110) / 10; g.fillRect(w * 0.62, y, i % 2 ? 10 : 18, 3); if (!(i % 2)) g.fillText(String(i * 12), w * 0.5, y + 6); } }), { parent: thermo, env: 0.4 });
  const tube = K.mat([0.9, 0.95, 1.0], 0.1, { env: 1.4 }); K.cyl([0.035, -0.012, 0.36], 0.01, 0.52, tube, { parent: thermo });
  const redM = K.mat([0.85, 0.08, 0.06], 0.3, { emit: [0.5, 0.02, 0.02], emitK: 0.4 });
  K.sphere([0.035, -0.012, 0.08], 0.022, redM, { parent: thermo });
  const column = K.cyl([0.04, -0.016, 0.1], 0.0075, 1, redM, { parent: thermo });
  const page = (month, seed) => tex(320, 400, (g, w, h) => { g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b0261c'; g.fillRect(0, 0, w, 74);
    g.fillStyle = '#fff3d8'; g.font = '900 30px Georgia'; g.textAlign = 'center'; g.fillText('ALMANAC', w / 2, 34); g.font = '700 22px Georgia'; g.fillText('1871', w / 2, 62);
    g.fillStyle = '#1f1f28'; g.font = '900 64px Georgia'; g.fillText(month, w / 2, 140); g.font = '600 15px Georgia';
    const q = rng(seed); for (let i = 0; i < 35; i++) { const cx = 30 + (i % 7) * 43, cy = 180 + Math.floor(i / 7) * 42; g.strokeStyle = 'rgba(30,30,40,0.35)'; g.strokeRect(cx - 19, cy - 16, 38, 34); if (i < 31) { g.fillStyle = i % 7 === 0 ? '#b0261c' : '#1f1f28'; g.fillText(String(i + 1), cx, cy + 6); } }
    g.fillStyle = `rgba(120,90,40,${0.08 + 0.05 * q()})`; g.fillRect(0, 0, w, h); });
  const cal = K.group([0.24, -0.012, 1.2], 0, bd);
  K.card([0, 0.004, -0.22], 0.34, 0.42, page('JULY', 3), { parent: cal, env: 0.4 });
  const may = K.group([0, -0.002, 0], 0, cal); K.card([0, 0, -0.22], 0.34, 0.42, page('MAY', 2), { parent: may, env: 0.4 }).material.side = 2;
  K.cube([0, -0.006, -0.008], [0.36, 0.012, 0.02], post, { parent: cal, r: 0.004 });
  const pen = K.group([0.8, 0, 0], 0, bd), stick = K.mat([0.45, 0.32, 0.2], 0.8);
  K.cyl([0, 0, 0.85], 0.012, 1.7, stick, { parent: pen });
  const flag = new K.THREE.Mesh(new K.THREE.PlaneGeometry(0.34, 0.24, 8, 2), K.mat([0.08, 0.22, 0.85], 0.65, { side: 2 })); const fp = flag.geometry.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, 0.03 * Math.sin((fp.getX(i) + 0.17) * 9)); flag.geometry.computeVertexNormals(); flag.position.copy(B(0.18, 0, 1.56)); flag.rotation.y = Math.PI / 2 - 0.4; K.add(flag, pen);
  K.anim('board', bd, (f, v) => { const t = Math.max(0, Math.min(1, v('temp', 0.2))); const hgt = 0.05 + 0.44 * t; column.scale.y = hgt; column.position.copy(B(0.035, -0.016, 0.1 + hgt / 2));
    const m = v('month', 0), a = Math.max(0, Math.min(1, (m - 0.4) / 0.2)); may.rotation.x = -a * 2.9; may.visible = a < 0.99;
    flag.rotation.x = 0.06 * Math.sin(f * 0.25); bd.visible = v('show', 1) > 0.5; });
  // ---- story prop: the locomotive (comes toward a camera at y < 0 along the track)
  const LO = loco(K, { name: 'loco', number: '9' }); const lg = LO.group; lg.position.copy(B(0, LOCO_Y, 0));
  K.prop('loco', lg); K.anim('loco', lg, (f, v) => { const y = v('y', LOCO_Y); lg.position.copy(B(0, y, 0)); LO.drive(LOCO_Y - y); LO.lamp(v('lamp', 0)); });
  // ---- story prop: the hand saw resting in the notch, the handle toward the engineer (+x)
  const saw = K.group([RAIL_X + 0.08, -0.3, RAIL_TOP + 0.07]); saw.name = 'saw';
  { const steel = K.mat([0.80, 0.80, 0.82], 0.2, { metal: 0.95, env: 1.6 }), wood = K.mat([0.62, 0.34, 0.16], 0.45, { physical: true, clearcoat: 0.5 }), teeth = K.mat([0.32, 0.32, 0.34], 0.4, { metal: 0.8 });
    const sh = new K.THREE.Shape(); sh.moveTo(-0.34, -0.07); sh.lineTo(0.2, -0.07); sh.lineTo(0.2, 0.06); sh.lineTo(-0.34, -0.035); sh.closePath();
    const bl = new K.THREE.Mesh(new K.THREE.ExtrudeGeometry(sh, { depth: 0.0018, bevelEnabled: false }), steel); bl.position.z = -0.0009; K.add(bl, saw);
    K.box([-0.34, -0.002, -0.078], [0.2, 0.002, -0.068], teeth, { parent: saw, r: 0 });
    const hd = K.group([0.27, 0, 0], 0, saw); K.box([-0.08, -0.014, -0.075], [0.07, 0.014, -0.045], wood, { parent: hd, r: 0.01 }); K.box([-0.08, -0.014, 0.045], [0.07, 0.014, 0.075], wood, { parent: hd, r: 0.01 });
    K.box([0.04, -0.014, -0.075], [0.09, 0.014, 0.075], wood, { parent: hd, r: 0.012 }); K.box([-0.09, -0.016, -0.08], [-0.05, 0.016, 0.08], wood, { parent: hd, r: 0.012 });
    for (const z of [-0.03, 0.03]) K.cyl([-0.07, 0, z], 0.008, 0.036, K.mat([0.8, 0.65, 0.3], 0.3, { metal: 0.9 }), { parent: hd, axis: 'y' }); }
  K.prop('saw', saw, { grip: [0.3, 0, 0] }); K.anim('saw', saw, (f, v) => { saw.visible = v('show', 1) > 0.5; });   // key show 0 hides it (a figure sawing holds its own)
  // ---- the warm bounce off the sunlit wall onto whoever stands on the ledge
  stage.addBounce([3.0, 3.0, 1.4], [1.0, 0.62, 0.42], 1.3, 7);
  atmos(K, K.root, { haze: { color: '#9e9ad0', near: 30, dist: 300, max: 0.66 }, deep: { z: -12, depth: 115, color: '#2b358c', max: 0.97 }, sun: { color: '#fff0d6', k: 0.4, dir: SUN_DIR }, squash: { from: 62, span: 17.5, L: 160 } });
  collideFromMeshes(COLLIDE, K.root, { skip: ['loco', 'saw', 'joint'], big: 8 });
  return { props: K.props };
}
