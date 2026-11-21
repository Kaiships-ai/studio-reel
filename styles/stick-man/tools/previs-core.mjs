// Pure previs math, shared by previs.mjs (Node) and previs.html (the browser page). No three.js, no files.
//
// A world is everything one previs video shows, on one clock in seconds:
//   { fps, dur, clock: { name, t0 }, bg, fog: [near, far],
//     blocks:  [{ s: [w, h, d], p: [x, y, z], c, o?, label?: { text, fg, bg }, floor?: { tiles: [rx, ry], c2 }, show?: [t0, t1] }],
//     figures: [{ id, look: { body, pants, skin, cap, h }, tag?, path: [[t, x, z]], face?: [[t, deg]], head?: [[t, yaw, pitch]],
//                 arms?: [[t, left, right]], show?: [t0, t1] }],          (degrees; face 0 looks down +z, toward the lobby/camera)
//     props:   [{ s, c, keys: [[t, x, y, z]], label?, show?: [t0, t1] }],
//     camera:  [[t, px, py, pz, lx, ly, lz, fov]],                       (two keys at one t = a hard cut)
//     stages:  [{ t, title, sub, kind: 'start' | 'cut' | 'flight' }],    (the label bar)
//     lines:   [[t, id]], rhythm?: { plan, refs } }
// Keys hold before the first and after the last key and ease (smoothstep) between neighbours, like a hand-keyed blockout.

import { clamp } from '../engine/mathx.js';
export { clamp };
export const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

// keys: [[t, ...values]] sorted by t. Returns the values at t. Two keys at the same t make a step (a cut): from that t on,
// the later key wins.
export function track(keys, t) {
  if (!keys.length) return [];
  if (t < keys[0][0]) return keys[0].slice(1);
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  if (i === keys.length - 1) return keys[i].slice(1);
  const a = keys[i], b = keys[i + 1], k = smooth(a[0], b[0], t);
  return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
}
export const track1 = (keys, t) => track(keys, t)[0];
export const shown = (o, t) => !o.show || (t >= o.show[0] && t < o.show[1]);

// Shot size -> how many metres of the subject the frame height holds; angle -> camera height over a level camera.
export const FRAME_H = { ECU: 0.22, CU: 0.4, MCU: 0.65, MS: 1.05, OTS: 1.1, MLS: 1.5, FS: 2.2, LS: 3.2, WS: 4.6, EWS: 9, INS: 0.35 };
export const ANGLE_DY = { eye: 0, low: -1.1, high: 1.4, overhead: 4 };
export const vfov = lens => 2 * Math.atan(18 / (lens || 27)) * 180 / Math.PI;   // 35 mm lens on the long (vertical) side of 9:16

// One framing: the camera for `shot` on a subject standing at [x, z], seen from azimuth `az` degrees
// (0 = in front, on +z) at `dist` times the framing distance. Returns [px, py, pz, lx, ly, lz, fov].
export function framing(shot, [x, z], { az = 0, dist = 1, dy = 0, fovK = 1, lookDy = 0 } = {}) {
  const fh = (FRAME_H[shot.size] ?? FRAME_H.MS) * 1.5, fov = vfov(shot.lens) * fovK;   // 1.5: room for the bars and headroom
  const d = (fh / 2) / Math.tan(fov * Math.PI / 360) * dist + 0.2;
  const ly = (shot.size === 'INS' ? 1.0 : clamp(2.05 - fh / 2, 0.9, 1.75)) + lookDy;
  const py = clamp(ly + 0.1 + (ANGLE_DY[shot.angle] ?? 0) + dy, 0.35, 12);
  const a = az * Math.PI / 180;
  return [x + Math.sin(a) * d, py, z + Math.cos(a) * d, x, ly, z, fov];
}

// The storyboard move as a change between the shot's first and last framing.
export function moveEnds(move = 'static', dir = 'L>R') {
  const s = dir === 'R>L' ? -1 : 1, m = String(move);
  const o = [{}, {}];
  if (/push/.test(m)) { o[0].dist = 1.3; o[1].dist = 0.9; }
  if (/pull/.test(m)) { o[0].dist = 0.9; o[1].dist = 1.3; }
  if (/zoom/.test(m)) { o[0].fovK = 1.35; o[1].fovK = 1; }
  if (/arc/.test(m)) { o[0].az = -28 * s; o[1].az = 28 * s; }
  if (/crane up/.test(m) || (/crane/.test(m) && !/down/.test(m))) { o[0].dy = -0.6; o[1].dy = 1.6; }
  if (/crane down/.test(m)) { o[0].dy = 2.2; o[1].dy = 0; }
  if (/tilt/.test(m)) { o[0].lookDy = -0.5; o[1].lookDy = 0.4; }
  if (/drift/.test(m)) { o[0].az = -6 * s; o[1].az = 6 * s; }
  if (/lead/.test(m)) { o[0].az = o[1].az = 25 * s; }
  return o;
}
export const WALKS = /follow|lead|truck/;

// Hard cut or flight at each boundary between consecutive shots. join: 'none' cuts every boundary (as boarded),
// 'scene' flies inside a scene and cuts between scenes, 'all' flies everywhere. A shot's own `join: "cut" | "flight"` wins.
export function boundaries(shots, join = 'scene') {
  return shots.slice(1).map((b, i) => {
    const a = shots[i];
    if (b.join === 'cut' || b.join === 'flight') return b.join;
    if (join === 'all') return 'flight';
    if (join === 'scene') return a.scene === b.scene ? 'flight' : 'cut';
    return 'cut';
  });
}

// Camera keys for shots already placed in time ({ t0, t1, ...shot }) with their subject's position at both ends
// (`from`, `to`: [x, z]). At a flight the camera leaves shot A before B starts and settles after it: half a second each
// side, longer when the camera travels further (12 m/s, so a flight to another set reads as a flight, not a cut), never
// more than 45 % of either shot.
export function cameraKeys(shots, kinds, { fly = 0.5, dir = 'L>R', speed = 12 } = {}) {
  const ends = shots.map(s => {
    const [e0, e1] = moveEnds(s.move, s.dir ?? dir);
    if (s.ots) { e0.az = (e0.az ?? 0) + 15; e1.az = (e1.az ?? 0) + 15; }   // on the partner, past your shoulder
    return [framing(s, s.from, e0), framing(s, s.to, e1)];
  });
  const half = kinds.map((k, i) => k !== 'flight' ? 0 : Math.min(Math.max(fly, Math.hypot(...[0, 1, 2].map(j => ends[i][1][j] - ends[i + 1][0][j])) / speed / 2),
    (shots[i].t1 - shots[i].t0) * 0.45, (shots[i + 1].t1 - shots[i + 1].t0) * 0.45));
  return shots.flatMap((s, i) => {
    const a = s.t0 + (i ? half[i - 1] : 0), b = s.t1 - (half[i] ?? 0);
    return [[a, ...ends[i][0]], [Math.max(a, b), ...ends[i][1]]];
  });
}

// Takes from cut times: [{ t0, t1 }] and the numbers refbench and cutgate measure on a render.
export function rhythm(cuts, dur) {
  const ends = [0, ...cuts, dur], takes = ends.slice(1).map((e, i) => +(e - ends[i]).toFixed(2));
  const sorted = [...takes].sort((x, y) => x - y), mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  let worst = 0; for (const c of cuts) worst = Math.max(worst, cuts.filter(d => d >= c && d < c + 15).length);
  return { cuts: cuts.length, takes, cutsPerMin: +(cuts.length / (dur / 60)).toFixed(1), medianTake: +median.toFixed(1),
    longestTake: +Math.max(...takes).toFixed(1), worst15: worst };
}

// Vietnamese words for the label bar.
export const SIZE_VI = { ECU: 'ĐẶC TẢ', CU: 'CẬN', MCU: 'CẬN TRUNG', MS: 'TRUNG CẢNH', OTS: 'QUA VAI', MLS: 'TRUNG TOÀN', FS: 'TOÀN THÂN',
  LS: 'VIỄN', WS: 'TOÀN CẢNH', EWS: 'ĐẠI CẢNH', INS: 'CHI TIẾT' };
const MOVE_VI = [[/arc then crane up/, 'vòng cung rồi cẩu lên'], [/crane down/, 'cẩu xuống'], [/crane/, 'cẩu lên'], [/push/, 'đẩy vào'],
  [/pull/, 'kéo ra'], [/truck/, 'trượt ngang theo bạn'], [/follow/, 'bám theo'], [/lead/, 'đi trước mặt'], [/arc/, 'vòng cung'],
  [/zoom/, 'zoom vào'], [/tilt/, 'lia dọc'], [/drift/, 'trôi nhẹ'], [/handheld/, 'cầm tay'], [/whip/, 'lia nhanh'], [/static|^$/, 'đứng yên']];
export const moveVi = m => (MOVE_VI.find(([re]) => re.test(String(m ?? ''))) ?? [0, String(m)])[1];

// What the label bar says at t: the stage title and line, and the two grey lines on the right.
export function labelAt(world, t) {
  const st = world.stages.filter(s => t >= s.t).at(-1) ?? world.stages[0];
  const line = (world.lines ?? []).filter(([lt]) => t >= lt).at(-1)?.[1];
  const c = world.clock ?? { name: 'film', t0: 0 };
  return { title: st.title, sub: '– ' + st.sub, kind: st.kind, sinceStage: t - st.t,
    right1: 'tốc độ thời gian 100%', right2: `${t.toFixed(1)} s  ·  ${c.name} ${(c.t0 + t).toFixed(1)} s${line ? '  ·  ' + line : ''}` };
}

// Storyboard frames -> seconds on the recorded voice: each line's first shot starts where the line starts in vo/words.json.
// anchors: [[frame, seconds]] increasing; returns f -> seconds, piecewise linear, extrapolated at the ends.
export function warp(anchors) {
  const A = anchors.filter((a, i) => i === 0 || (a[0] > anchors[i - 1][0] && a[1] > anchors[i - 1][1]));
  return f => {
    let i = 0; while (i + 2 < A.length && A[i + 1][0] <= f) i++;
    const [f0, s0] = A[i], [f1, s1] = A[i + 1] ?? [f0 + 30, s0 + 1];
    return s0 + (f - f0) * (s1 - s0) / (f1 - f0);
  };
}
