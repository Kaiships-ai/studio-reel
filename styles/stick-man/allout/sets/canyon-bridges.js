// Canyon bridges: the crossing, seen from the air and from the decks. A canyon 120 m wide at the rim runs along y (walls
// at x = -60 / +60, pink-magenta-orange strata, more than 230 m deep, the bottom lost in deep blue haze), desert and mesas
// beyond the rims. Two lines cross it along x, 40 m apart: OUR line (y = +20) on a tall timber lattice trestle (square
// cross-braced towers every 9 m, stringers, ties, rails), THE RIVAL line (y = -20) on a steel truss arch with a plank deck
// 9 m wide, railings, lamp posts every 10 m and bunting over the span, running on to the vanishing point both ways.
// Both are half-built from the west (built 0.55 / 0.6); derricks with hanging hooks stand at the fronts.
// setOpts.mode: 'day' (default) | 'gold' (the late warm light of the derail: peach sky, pink-purple canyon).
// Story props (K.anim; keys via `set` beats):
//   trestle, arch   built 0..1 (the part east of -60 + 120 * built is hidden; 1 = finished, both land approaches shown,
//                   the crane / derrick taken away)
//   beam            a steel I-beam cantilevered off the trestle front over the drop; MARKS beam1..beam5 = seats (z = the
//                   beam top, as briefed: a sitter there hangs his legs; the engine's sit pose wants z - 0.56 for the hips)
//   rival_track     the rails on the arch deck: buckle 0..1 (a sideways snake, 1.5 m at 1 over 25 m round x = 0), heat 0..1
//   rival_train     green-and-brass 4-4-0 + one coach on the deck facing +x: x (front x, m), lamp 0..1 (default on in
//                   'gold'), fall 0..1 (derails at the kink, tips off the south side, falls turning into the haze; gone at 1)
//   chair           striped umbrella + deck chair + table with a glass on the rival deck near the west end
import { createKit, SURF, tex, rng, B, col } from '../kit.js';
import { track, loco, coach, canyonWall, mesa, sky, atmos, slab, shrub, merged, showFirst, beamMatrix, unitBox, collideFromMeshes, RSURF, RAIL_TOP } from '../rail-kit.js';

export const SUN_DIR = [0.38, 0.62, -0.69];
export const SUN_CENTER = [-10, 0, 0.5], SUN_HALF = 40;
const W = 60, DECK = 0.5, RZ = 0.6, RY = -20, TY = 20, TZ = 0.11, T0 = 0.55, A0 = 0.6;
const front = b => -W + 2 * W * b, snap9 = x => -W + 9 * Math.floor((x + W) / 9 + 1e-6), TF = snap9(front(T0));   // the trestle ends on a tower cap
export const PLACES = { drop: [TF + 7, TY - 1.5, -1], kink: [0, RY, RZ + RAIL_TOP], crane: [10, RY + 3.8, DECK + 16], hook: [TF + 5.5, TY + 1, 3], rival_front: [front(A0), RY, DECK] };
export const MARKS = { beam1: [TF + 1.6, TY, 0.51], beam2: [TF + 2.8, TY, 0.51], beam3: [TF + 4.0, TY, 0.51], beam4: [TF + 5.2, TY, 0.51], beam5: [TF + 6.6, TY, 0.51],
  deck: [7, RY + 2.4, DECK], deck_far: [40, RY - 2.6, DECK], trestle_deck: [TF - 6, TY, TZ + 0.04], chair: [-46.05, RY - 2.8, DECK] };   // chair: floor point under the seat (sit pose)
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-400, -400], [400, 400]]];
export const CAMERA_ZMAX = 400;
export const COLLIDE = [];
export const BRIDGES_LOOK = {
  light: { sun: [1.0, 0.88, 0.70], power: 3.6, sky: [0.56, 0.56, 0.95], ground: [0.85, 0.45, 0.35], hemi: 0.35, fill: [0.72, 0.62, 1.0], fillPower: 0.45, lit: [1.04, 1.0, 0.96], shade: [0.80, 0.60, 0.95], lamp: 1 },
  grade: { exp: 1.03, lift: 0.02, sat: 1.15, haze: 0.15, shadow: { c: [0.36, 0.18, 0.50], k: 0.35 }, shoulder: 0.25 },
  look: { ao: 0.6, aoRadius: 0.6, shadowRadius: 2.0, sat: 1.2, con: 1.05, vig: 0.08, bloom: 0.5, hot: 0.3, ink: 2.1 },
};
export const BRIDGES_GOLD = {
  light: { sun: [1.0, 0.78, 0.55], power: 3.4, sky: [0.85, 0.62, 0.80], ground: [0.85, 0.5, 0.45], hemi: 0.4, fill: [0.9, 0.62, 0.85], fillPower: 0.45, lit: [1.06, 0.98, 0.9], shade: [0.85, 0.58, 0.88], lamp: 1, sunDir: [0.45, -0.75, -0.48] },
  grade: { exp: 1.0, lift: 0.02, sat: 1.12, haze: 0.15, shadow: { c: [0.45, 0.2, 0.5], k: 0.4 }, shoulder: 0.3 },
  look: BRIDGES_LOOK.look,
};
const PINK = ['#e0507a', '#c03a6a', '#e86a52', '#f09a58', '#f6c070', '#b02e5a', '#8a2c6a', '#e47a8a', '#f2b090', '#d24a48', '#ff8a5a', '#9c2a58'];
function pinkBands(seed, zb = -240, top = 2) { const r = rng(seed), out = []; let z = zb;
  while (z < top + 10) { const t = (0.8 + 3.2 * r() * r()) * (1 + Math.max(0, -z - 50) / 30); out.push({ z0: z, z1: z + t, c: PINK[Math.floor(r() * PINK.length)], off: r() < 0.2 ? 2 + 3 * r() : 1.2 * r(), wav: 0.4 + 0.6 * r() }); z += t; }
  return out; }

export async function build(stage, opts = {}) {
  const GOLD = opts.mode === 'gold';
  const K = createKit(stage, { env: GOLD ? { top: [0.6, 0.6, 0.9], mid: [0.95, 0.72, 0.72], bottom: [0.7, 0.35, 0.45], panels: [{ dir: [-0.45, 0.75, 0.48], size: 2.6, color: [1, 0.85, 0.65], power: 6 }] }
    : { top: [0.42, 0.56, 0.98], mid: [0.84, 0.70, 0.84], bottom: [0.75, 0.40, 0.35], panels: [{ dir: [-0.38, -0.62, 0.69], size: 2.6, color: [1, 0.92, 0.78], power: 6 }] }, envK: 0.6 });
  stage.scene.background = null;
  const r = rng(41);
  sky(K, GOLD ? { sunDir: [0.45, -0.75, -0.48], zenith: '#7088c8', mid: '#c8b0cc', horizon: '#f4cfa4', low: '#eab79c', clouds: 12, seed: 5, cloudK: 0.8 }
    : { sunDir: SUN_DIR, zenith: '#2552b8', mid: '#4a7fd2', horizon: '#c4c6e6', low: '#aaa6cc', clouds: 18, seed: 22, cloudK: 0.8 });
  // ---- the canyon: two striped walls, the desert rims, the floor nobody has seen
  const sand = K.mat([1, 1, 1], 0.95, { map: RSURF.sand('#d4793c', 12) });
  slab(K, [-800, -800, -0.6], [-W, 1100, 0], sand, { step: 12, tile: 5 }); slab(K, [W, -800, -0.6], [800, 1100, 0], sand, { step: 12, tile: 5 });
  canyonWall(K, { at: [-W, -800, 0], rotZ: 90, L: 1900, H: -0.25, zb: -240, step: 5, rows: 2.2, amp: 2.0, crag: 0.3, top: 8, topRows: 3, seed: 3, bands: pinkBands(3), texL: 50, recess: 0.45 });
  canyonWall(K, { at: [W, 1100, 0], rotZ: -90, L: 1900, H: -0.25, zb: -240, step: 5, rows: 2.2, amp: 2.0, crag: 0.3, top: 8, topRows: 3, seed: 4, bands: pinkBands(4), texL: 50, recess: 0.45 });
  slab(K, [-W - 10, -800, -246], [W + 10, 1100, -245], K.mat([0.12, 0.14, 0.42], 1.0), { step: 40, tile: 40 });
  // the canyon's far ends (it bends away): closed so no sky shows through the gap
  canyonWall(K, { at: [W + 12, -760, 0], rotZ: 180, L: 2 * W + 24, H: -0.25, zb: -240, step: 5, rows: 2.2, amp: 2.0, crag: 0.3, top: 8, topRows: 3, seed: 5, bands: pinkBands(5), texL: 50, recess: 0.45 });
  canyonWall(K, { at: [-W - 12, 1060, 0], rotZ: 0, L: 2 * W + 24, H: -0.25, zb: -240, step: 5, rows: 2.2, amp: 2.0, crag: 0.3, top: 8, topRows: 3, seed: 6, bands: pinkBands(6), texL: 50, recess: 0.45 });
  for (const [x, y, rr, h, s] of [[-420, 380, 60, 38, 1], [-700, -200, 110, 60, 2], [520, 300, 80, 45, 3], [900, -500, 150, 70, 4], [-300, 900, 90, 50, 5], [350, 1000, 120, 55, 6], [-1100, 600, 160, 80, 7], [1200, 400, 170, 75, 8], [0, 1400, 140, 60, 9], [100, -1300, 150, 65, 10]])
    mesa(K, { at: [x, y, -25], r: rr, h, seed: s, pal: s % 2 ? 'red' : 'dusk' });
  for (let i = 0; i < 60; i++) { const x = (r() > 0.5 ? 1 : -1) * (W + 4 + 160 * r()), y = -200 + 400 * r(); if (Math.abs(y - RY) > 7 && Math.abs(y - TY) > 4) shrub(K, [x, y, 0], 0.6 + 0.8 * r(), { seed: i + 7 }); }
  // ---- built: every bridge part is baked in x order; `built` shows the items up to the front
  const BL = { trestle: [], arch: [] };
  const bakeX = (geo, mat, list, reg, o = {}) => { list.sort((a, b) => a.x - b.x); const m = merged(K, geo, mat, list, o); if (m) BL[reg].push([m, list.map(it => it.x)]); return m; };
  const showUpTo = (reg, fx) => { for (const [m, xs] of BL[reg]) { let n = 0; while (n < xs.length && xs[n] <= fx + 0.01) n++; showFirst(m, n); } };
  const beam = (a, b, w, h = w) => ({ m: beamMatrix(a, b, w, h), x: Math.max(a[0], b[0]) });
  const box = (lo, hi) => ({ p: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], s: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], x: hi[0] });

  // ---- THE RIVAL: steel truss arch, plank deck, railings, lamps, bunting, the long straight track
  const steel = K.mat([0.26, 0.12, 0.10], 0.45, { metal: 0.35, env: 0.9 }), iron = K.mat([0.07, 0.07, 0.09], 0.45, { metal: 0.5 });
  const planks = K.mat([1, 1, 1], 0.8, { map: SURF.wood([0.50, 0.26, 0.20], 18, 9) });
  const deck = [], gird = [], rail = [], posts = [];
  for (let x = -400; x < 400; x += 4) { deck.push(box([x, RY - 4.5, DECK - 0.22], [x + 4, RY + 4.5, DECK]));
    for (const s of [-1, 1]) { gird.push(box([x, RY + s * 4.3 - 0.2, Math.abs(x + 2) < W ? DECK - 1.7 : DECK - 0.6], [x + 4, RY + s * 4.3 + 0.2, DECK - 0.22]));
      rail.push(box([x, RY + s * 4.42 - 0.03, DECK + 1.02], [x + 4, RY + s * 4.42 + 0.03, DECK + 1.1]), box([x, RY + s * 4.42 - 0.02, DECK + 0.52], [x + 4, RY + s * 4.42 + 0.02, DECK + 0.56]));
      for (const dx of [0, 2]) posts.push(box([x + dx - 0.03, RY + s * 4.42 - 0.03, DECK], [x + dx + 0.03, RY + s * 4.42 + 0.03, DECK + 1.1])); } }
  bakeX(unitBox(0), planks, deck, 'arch', { cast: true }); bakeX(unitBox(0.02), steel, gird, 'arch'); bakeX(unitBox(0), iron, rail, 'arch'); bakeX(unitBox(0), iron, posts, 'arch');
  // the arch: two truss ribs (chords + diagonals), spandrel posts, sway bracing
  const zb = x => -5.0 - 45 * (x / 58) ** 2, members = [];
  for (const s of [-1, 1]) { const y = RY + s * 3.2;
    for (let x = -58; x < 58; x += 2) { const x2 = x + 2, zt = q => zb(q) + 2.4;
      members.push(beam([x, y, zb(x)], [x2, y, zb(x2)], 0.7, 0.55), beam([x, y, zt(x)], [x2, y, zt(x2)], 0.6, 0.45), beam([x, y, (x / 2) % 2 ? zb(x) : zt(x)], [x2, y, (x / 2) % 2 ? zt(x2) : zb(x2)], 0.22, 0.22));
      if (x % 4 === 0) members.push(beam([x, y, zt(x)], [x, y, DECK - 1.7], 0.3, 0.3)); } }
  for (let x = -54; x <= 54; x += 6) { members.push(beam([x, RY - 3.2, zb(x) + 1.2], [x, RY + 3.2, zb(x) + 1.2], 0.25, 0.25), beam([x, RY - 3.2, zb(x)], [x + 6, RY + 3.2, zb(x + 6) + 2.4], 0.16, 0.16), beam([x, RY + 3.2, zb(x)], [x + 6, RY - 3.2, zb(x + 6) + 2.4], 0.16, 0.16)); }
  for (const s of [-1, 1]) for (const x of [-58, 58]) members.push(beam([x, RY + s * 3.2, zb(x) - 3], [x * 1.04, RY + s * 3.2, zb(x) + 3], 1.6, 1.6));
  bakeX(unitBox(0.03), steel, members, 'arch', { cast: true });
  // lamp posts every 10 m both sides (warm lanterns), bunting between them over the span
  const lampPole = [], lampHead = [], lampGlass = [], flags = [], cords = [];
  for (let x = -395; x < 400; x += 10) for (const s of [-1, 1]) { const y = RY + s * 4.42;
    lampPole.push({ p: [x, y, DECK + 1.75], s: [0.1, 0.1, 3.5], x }); lampHead.push({ p: [x, y, DECK + 3.62], s: [0.3, 0.3, 0.08], x }, { p: [x, y, DECK + 3.95], s: [0.26, 0.26, 0.1], x });
    lampGlass.push({ p: [x, y, DECK + 3.79], s: [0.24, 0.24, 0.3], x }); }
  const FL = ['#233a6e', '#e07a2a', '#2f7a4a', '#f0e2c0', '#c8322a'];
  for (let x = -W; x < W; x += 10) for (const s of [-1, 1]) { const y = RY + s * 4.42, n = 14;
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, t0 = k / n, t1 = (k + 1) / n, zc = q => DECK + 3.2 - 1.1 * 4 * q * (1 - q);
      cords.push({ m: beamMatrix([x + 10 * t0, y, zc(t0)], [x + 10 * t1, y, zc(t1)], 0.015, 0.015), x: x + 10 * t1 });
      flags.push({ p: [x + 10 * t, y, zc(t) - 0.17], s: [0.32, 0.02, 0.34], c: FL[(k + (x / 10)) % FL.length | 0], x: x + 10 * t }); } }
  bakeX(new K.THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2).rotateX(-Math.PI / 2), iron, lampPole, 'arch'); bakeX(unitBox(0.01), iron, lampHead, 'arch');
  const glassM = K.mat([1, 0.92, 0.7], 0.2, { emit: [1, 0.78, 0.4], emitK: GOLD ? 1.8 : 0.8 }); bakeX(unitBox(0.01), glassM, lampGlass, 'arch', { cast: false });
  bakeX(unitBox(0), iron, cords, 'arch', { cast: false });
  { const tri = new K.THREE.BufferGeometry(); tri.setAttribute('position', new K.THREE.Float32BufferAttribute([-0.5, 0.5, 0, 0.5, 0.5, 0, 0, -0.5, 0], 3)); tri.setAttribute('normal', new K.THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); tri.setAttribute('uv', new K.THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2)); tri.setIndex([0, 2, 1]);
    const fm = K.mat([1, 1, 1], 0.7, { side: 2 }); bakeX(tri, fm, flags, 'arch', { colors: true, cast: false }); }
  // the rival's track: laid end to end, no gaps; bends (buckle) and glows (heat)
  const RT = track(K, { y0: -400, y1: 400, at: [0, RY, RZ], rot: -90, bend: true, stones: false, ballast: false, gapM: 0.002, seed: 7, heroY: null, heat: { y: 0, spread: 40 },
    tieMat: K.mat([0.16, 0.14, 0.18], 0.75, { map: RSURF.tie(14) }) });
  RT.group.name = 'rival_track_rails';
  // the rival's crane: a yellow lattice mast with a dark boom, guy lines and a hook block
  const yellow = K.mat([0.95, 0.70, 0.10], 0.5, { metal: 0.2 }), navy = K.mat([0.08, 0.10, 0.2], 0.5, { metal: 0.3 });
  const crane = K.group([10, RY + 3.8, DECK]); crane.name = 'rival_crane';
  { const L = []; const a = 0.5, H = 16; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L.push({ m: beamMatrix([sx * a, sy * a, 0], [sx * a, sy * a, H], 0.08, 0.08) });
    for (let z = 0; z < H; z += 1.2) for (const [p, q] of [[[-a, -a], [a, -a]], [[a, -a], [a, a]], [[a, a], [-a, a]], [[-a, a], [-a, -a]]]) {
      L.push({ m: beamMatrix([p[0], p[1], z], [q[0], q[1], z + 1.2], 0.04, 0.04) }, { m: beamMatrix([p[0], p[1], z], [q[0], q[1], z], 0.04, 0.04) }); }
    merged(K, unitBox(0), yellow, L, { parent: crane });
    K.box([-0.8, -0.8, 0], [0.8, 0.8, 0.3], navy, { parent: crane, r: 0.03 }); K.box([-0.6, -0.6, H], [0.6, 0.6, H + 0.3], navy, { parent: crane, r: 0.03 });
    const boom = [[0, 0, 1], [9, -6.5, 12.5]];
    merged(K, unitBox(0), navy, [{ m: beamMatrix(boom[0], boom[1], 0.28, 0.28) }, { m: beamMatrix([0, 0, H], boom[1], 0.04, 0.04) }, { m: beamMatrix([0, 0, H], [-8, 3, -0.2], 0.035, 0.035) }, { m: beamMatrix([0, 0, H], [-6, -9, -0.2], 0.035, 0.035) },
      { m: beamMatrix(boom[1], [9, -6.5, 4.4], 0.03, 0.03) }], { parent: crane });
    K.cube([9, -6.5, 4.2], [0.35, 0.25, 0.45], navy, { parent: crane, r: 0.04 }); K.torus([9, -6.5, 3.8], 0.16, 0.04, yellow, { parent: crane, arc: Math.PI * 1.4, rx: 0 }); }
  // ---- OUR LINE: the timber lattice trestle, stringers, its track (land part on ballast)
  const timber = K.mat([0.42, 0.34, 0.27], 0.85, { map: RSURF.tie(31) }), timberDark = K.mat([0.30, 0.24, 0.19], 0.85, { map: RSURF.tie(32) });
  const tw = []; for (let tx = -54; tx <= 54; tx += 9) { for (let z = 0; z > -205; z -= 4) { const z2 = z - 4, a1 = 1.3 + 0.012 * -z, a2 = 1.3 + 0.012 * -z2;
      const C1 = [[-a1, -a1], [a1, -a1], [a1, a1], [-a1, a1]], C2 = [[-a2, -a2], [a2, -a2], [a2, a2], [-a2, a2]];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, P = c => [tx + c[0], TY + c[1]];
        tw.push(beam([...P(C1[i]), z], [...P(C2[i]), z2], 0.24), beam([...P(C1[i]), z], [...P(C1[j]), z], 0.14), beam([...P(C1[i]), z], [...P(C2[j]), z2], 0.11), beam([...P(C1[j]), z], [...P(C2[i]), z2], 0.11)); }
    } }
  for (const it of tw) it.x = Math.round(it.x / 9) * 9;
  // stringers and cross-caps along the span, braces between tower tops
  for (let x = -W; x < W; x += 9) { for (const s of [-1, 1]) tw.push({ ...box([x, TY + s * 0.8 - 0.15, -0.45], [x + 9, TY + s * 0.8 + 0.15, 0.0]), x: x + 9 });
    tw.push({ ...box([x + 8.7, TY - 1.6, -0.75], [x + 9.3, TY + 1.6, -0.45]), x: x + 9 }, beam([x, TY - 1.3, -4.45], [x + 9, TY - 1.3, -0.45], 0.12), beam([x, TY + 1.3, -0.45], [x + 9, TY + 1.3, -4.45], 0.12)); }
  bakeX(unitBox(0.015), timber, tw, 'trestle', { cast: true });
  const OT = track(K, { y0: -W, y1: W + 400, at: [0, TY, TZ], rot: -90, stones: false, ballast: false, seed: 9, heroY: null, tieMat: K.mat([0.62, 0.52, 0.42], 0.88, { map: RSURF.tie(19) }) });
  OT.group.name = 'trestle_track';
  track(K, { y0: -400, y1: -W, at: [0, TY, TZ], rot: -90, seed: 10, heroY: null, dense: [[-W - 30, -W]], sparse: 0.05 });
  // our derrick: timber mast and boom, rope and hook over the drop
  const derrick = K.group([TF - 2.5, TY + 1.8, TZ + 0.04]); derrick.name = 'derrick';
  merged(K, new K.THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2), timberDark, [{ m: beamMatrix([0, 0, 0], [0, 0, 12], 0.28, 0.28) }, { m: beamMatrix([0, 0, 0.8], [8, -0.8, 9.5], 0.22, 0.22) }], { parent: derrick });
  merged(K, unitBox(0), K.mat([0.55, 0.45, 0.3], 0.9), [{ m: beamMatrix([0, 0, 12], [8, -0.8, 9.5], 0.03) }, { m: beamMatrix([8, -0.8, 9.5], [8, -0.8, 2.6], 0.03) }, { m: beamMatrix([0, 0, 12], [-6, 2, -0.1], 0.03) }, { m: beamMatrix([0, 0, 12], [-5, -3, -0.1], 0.03) }], { parent: derrick });
  K.cube([8, -0.8, 2.45], [0.3, 0.22, 0.4], iron, { parent: derrick, r: 0.04 }); K.torus([8, -0.8, 2.05], 0.15, 0.04, iron, { parent: derrick, arc: Math.PI * 1.4, rx: 0 });
  // ---- story prop: the I-beam cantilevered off the trestle front over the drop (the lunch beam)
  const bm = K.group([TF, TY, TZ + 0.04]); bm.name = 'beam';
  { const red = K.mat([0.55, 0.20, 0.12], 0.6, { metal: 0.3 }); const L0 = -1.2, L1 = 7.6;
    K.box([L0, -0.17, 0.0], [L1, 0.17, 0.035], red, { parent: bm, r: 0.008 }); K.box([L0, -0.17, 0.325], [L1, 0.17, 0.36], red, { parent: bm, r: 0.008 }); K.box([L0, -0.012, 0.03], [L1, 0.012, 0.33], red, { parent: bm, r: 0.004 });
    const riv = []; for (let x = L0 + 0.2; x < L1; x += 0.3) for (const sy of [-0.12, 0.12]) riv.push({ p: [x, sy, 0.362], s: [0.03, 0.03, 0.012] });
    merged(K, new K.THREE.SphereGeometry(0.5, 8, 4), red, riv, { parent: bm, cast: false }); }
  K.prop('beam', bm);
  // ---- story props: the bridges' build fronts
  const TR = K.group([0, 0, 0]); TR.name = 'trestle'; const AR = K.group([0, 0, 0]); AR.name = 'arch';
  K.anim('trestle', TR, (f, v) => { const b = v('built', T0), fx = b >= 0.999 ? 1e9 : snap9(front(b)); showUpTo('trestle', fx); OT.clip(fx); derrick.visible = b < 0.999; });
  K.anim('arch', AR, (f, v) => { const b = v('built', A0), fx = b >= 0.999 ? 1e9 : front(b); showUpTo('arch', fx); RT.clip(fx); crane.visible = b < 0.999; });
  showUpTo('trestle', TF); OT.clip(TF); showUpTo('arch', front(A0)); RT.clip(front(A0));
  // ---- story prop: the rival's rails (buckle, heat)
  const snake = y => { const s = y / 25; if (Math.abs(s) > 0.5) return 0; const w = 1 - 4 * s * s; return Math.sin(Math.PI * 2 * 1.5 * s) * w * w; };
  const heat = RT.mats.heat.userData.rkHeat;
  K.anim('rival_track', RT.group, (f, v) => { const k = v('buckle', 0); RT.bend.amp.value = 1.5 * k; RT.bend.c.value = 0; RT.bend.L.value = 25;
    const h = v('heat', 0); heat.heat.value = h; heat.spread.value = 30 + 70 * h; heat.y.value = 0; });
  // ---- story prop: the rival train (green and brass loco + one coach), front toward +x
  const TG = K.group([front(A0) - 45, RY, RZ]); TG.name = 'rival_train';
  const LO = loco(K, { parent: TG, name: 'rival_loco', number: '1', livery: { boiler: [0.05, 0.30, 0.16], smokebox: [0.06, 0.08, 0.07], cab: [0.06, 0.34, 0.19], wheel: [0.80, 0.58, 0.16], trim: [0.92, 0.70, 0.26], roof: [0.05, 0.12, 0.08], pilot: [0.86, 0.62, 0.2], tender: [0.05, 0.30, 0.16] } });
  LO.group.rotation.y = Math.PI / 2; LO.group.position.copy(B(15.2, 0, 0));
  const CO = coach(K, { parent: TG, name: 'rival_coach', color: [0.07, 0.30, 0.17], letters: 'GOLDEN SPAN EXPRESS', trim: '#e2b24a', seed: 5 });
  CO.group.rotation.y = Math.PI / 2; CO.group.position.copy(B(-0.2, 0, 0));
  const X0 = front(A0) - 30;
  K.prop('rival_train', TG); K.anim('rival_train', TG, (f, v) => {
    const xf = v('x', X0), p = Math.max(0, Math.min(1, v('fall', 0))), k = 1.5 * v('buckle_follow', 1) * (RT.bend.amp.value / 1.5);
    const off = -k * snake(xf - 8), slope = -k * (snake(xf - 7.5) - snake(xf - 8.5));
    LO.drive(xf - X0); LO.lamp(v('lamp', GOLD ? 1 : 0)); TG.visible = p < 0.999;
    const a = Math.min(1, p / 0.3), b = Math.max(0, (p - 0.3) / 0.7);
    TG.position.copy(B(xf - 15.2 + 10 * a + 18 * b, RY + off - 6.5 * a * a - 14 * b, RZ - 2.2 * a * a - 250 * b * b));
    TG.rotation.set(0, 0, 0); TG.rotation.order = 'YXZ'; TG.rotation.y = Math.atan(slope) - 0.25 * a - 0.5 * b; TG.rotation.x = 0.9 * a * a + 1.6 * b; TG.rotation.z = -0.9 * b; });
  // ---- story prop: the magnate's deck chair under a striped umbrella, a small table with a glass
  const CH = K.group([-46, RY - 2.9, DECK], 25); CH.name = 'chair';
  { const pole = K.mat([0.92, 0.9, 0.85], 0.5), wood = K.mat([0.62, 0.40, 0.22], 0.55, { physical: true, clearcoat: 0.4 });
    K.cyl([0.9, 0.35, 1.2], 0.03, 2.4, pole, { parent: CH });
    const stripes = tex(512, 64, (g, w, h) => { const C = ['#d8301c', '#f2901c', '#1c1a22']; for (let i = 0; i < 12; i++) { g.fillStyle = C[i % 3]; g.fillRect(i * w / 12, 0, w / 12 + 1, h); } });
    const um = new K.THREE.Mesh(new K.THREE.CylinderGeometry(0.06, 1.45, 0.55, 12, 1, true), K.mat([1, 1, 1], 0.7, { map: stripes, side: 2 })); um.position.copy(B(0.9, 0.35, 2.45)); K.add(um, CH);
    const val = new K.THREE.Mesh(new K.THREE.CylinderGeometry(1.45, 1.45, 0.16, 12, 1, true), K.mat([1, 1, 1], 0.7, { map: stripes, side: 2 })); val.position.copy(B(0.9, 0.35, 2.1)); K.add(val, CH);
    // deck chair: a wooden frame with a striped sling, reclined
    for (const sx of [-0.3, 0.3]) { K.box([sx - 0.025, -0.45, 0], [sx + 0.025, -0.4, 0.42], wood, { parent: CH, r: 0.01 }); K.box([sx - 0.025, 0.42, 0], [sx + 0.025, 0.47, 0.2], wood, { parent: CH, r: 0.01 });
      const rail = K.box([sx - 0.02, -0.5, 0.36], [sx + 0.02, 0.5, 0.41], wood, { parent: CH, r: 0.01 }); rail.rotation.x = -0.15;
      const back = K.box([sx - 0.02, 0.3, 0.3], [sx + 0.02, 0.36, 1.15], wood, { parent: CH, r: 0.01 }); back.rotation.x = 0.45; }
    const sling = tex(64, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#1c1a22' : '#f2c21c'; g.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
    const seat = new K.THREE.Mesh(new K.THREE.PlaneGeometry(0.56, 1.0, 1, 8), K.mat([1, 1, 1], 0.8, { map: sling, side: 2 })); const sp = seat.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) { const t = (sp.getY(i) + 0.5); sp.setZ(i, -0.1 * Math.sin(t * Math.PI)); } seat.geometry.computeVertexNormals();
    seat.position.copy(B(0, 0.1, 0.62)); seat.rotation.x = -0.72; K.add(seat, CH);
    // table and glass
    const tb = K.group([-0.75, -0.25, 0], 0, CH); K.cyl([0, 0, 0.33], 0.025, 0.66, K.mat([0.2, 0.5, 0.75], 0.4), { parent: tb }); K.cyl([0, 0, 0.67], 0.3, 0.025, K.mat([0.25, 0.55, 0.8], 0.35), { parent: tb }); K.cyl([0, 0, 0.012], 0.18, 0.025, K.mat([0.2, 0.5, 0.75], 0.4), { parent: tb });
    K.lathe([0.08, 0, 0.685], [[0, 0], [0.035, 0], [0.04, 0.11], [0.042, 0.13], [0, 0.13]], K.glass([0.95, 0.95, 1], { opacity: 0.35 }), { parent: tb });
    K.cyl([0.08, 0, 0.73], 0.034, 0.07, K.mat([0.95, 0.55, 0.12], 0.2, { opacity: 0.85 }), { parent: tb }); }
  K.prop('chair', CH);
  atmos(K, K.root, GOLD ? { haze: { color: '#e6b8ac', near: 60, dist: 650, max: 0.5 }, deep: { z: -4, depth: 110, color: '#4a2a8c', max: 0.95 }, sun: { color: '#fff0c8', k: 0.12, dir: [0.45, -0.75, -0.48] } }
    : { haze: { color: '#a8acdc', near: 60, dist: 700, max: 0.45 }, deep: { z: -4, depth: 95, color: '#2034c4', max: 0.97 }, sun: { color: '#fff0d6', k: 0.08, dir: SUN_DIR } });
  collideFromMeshes(COLLIDE, K.root, { skip: ['rival_train', 'beam', 'chair'], big: 8 });
  return { props: K.props };
}
