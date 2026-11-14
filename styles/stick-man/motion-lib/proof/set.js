// The motion library's proof stage: a grey floor with 0.5 m marks, and whatever the clip's needs.marks ask for (a bag
// on the floor until the hands take it, a dropped bag falling on gravity, a car trunk, a window wall, a counter, a seat).
// Clip space is world space here: the actor starts at the origin facing +x. opts: { marks, sc } (sc = the body's size
// for a shared clip). Reached through proof/reel.js only.
import { createKit } from '/styles/stick-man/allout/kit.js';
import { bagMesh } from '/styles/stick-man/motion-lib/props.js';
import { BUILD } from '/styles/stick-man/lib/cast/handprops.js';

export const SUN_DIR = [0.35, 0.45, -0.85], SUN_CENTER = [1.0, 0, 0.6], SUN_HALF = 5;
export const PLACES = {}, MARKS = {}, CAMERA_SIDE = [0, -1], CAMERA_ROOM = [[[-20, -20], [20, 20]]], COLLIDE = [];
const G = 9.8, FPS = 30;

export async function build(stage, opts = {}) {
  const K = createKit(stage, { env: { top: [0.5, 0.5, 0.52], mid: [0.45, 0.45, 0.47], bottom: [0.3, 0.3, 0.3], panels: [] }, envK: 0.4 });
  const floor = K.mat([0.46, 0.46, 0.47], 0.95), block = K.mat([0.62, 0.62, 0.63], 0.9), lines = K.mat([0.36, 0.36, 0.37], 0.9), car = K.mat([0.55, 0.20, 0.18], 0.6);
  K.box([-8, -8, -0.05], [12, 8, 0], floor, { r: 0 });
  for (let x = -2; x < 8; x += 0.5) K.box([x - 0.006, -2.5, 0], [x + 0.006, 2.5, 0.002], lines, { r: 0 });
  const s = opts.sc ?? 1, S = p => p.map(v => v * s);
  for (const m of opts.marks || []) {
    const [x, y, z] = S(m.at || [0, 0, 0]);
    if (m.kind === 'bag' && !m.drop) { const g = K.group([x, y, 0], m.cross ? 0 : 90); g.add(bagMesh()); K.anim('bag_floor', g, f => { g.visible = f < (opts.f0 ?? 0) + m.until; }); }
    if (m.kind === 'bag' && m.drop) {   // m.cross: lying crosswise
      // released at the hands' last spot (m.at: the bag's bottom), then only gravity: falls to m.fall and rests
      const g = K.group([0, 0, 0], m.cross ? 0 : 90); g.add(bagMesh()); const v = m.v || [0.6, 0];
      K.anim('bag_drop', g, f => { const t = (f - (opts.f0 ?? 0) - m.from) / FPS; g.visible = t >= 0; if (t < 0) return;
        const tl = Math.sqrt(Math.max(0, 2 * (z - m.fall * s) / G)), u = Math.min(t, tl);
        g.position.set(x + v[0] * u, z - G * u * u / 2 > m.fall * s ? z - G * u * u / 2 : m.fall * s, -(y + v[1] * u)); });
    }
    if (m.kind === 'trunk') {   // a car's back: the lip (rear panel) at x, the trunk floor, its sides, the roof line behind
      const fl = m.floor * s;
      K.box([x, -0.65, 0.18], [x + 0.08, 0.65, z], car, { r: 0.02 });
      K.box([x, -0.65, 0.18], [x + 1.0, 0.65, fl], car, { r: 0.02 });
      for (const sy of [-1, 1]) K.box([x, sy * 0.65 - 0.04, fl], [x + 1.0, sy * 0.65 + 0.04, z], car, { r: 0.02 });
      K.box([x + 0.95, -0.65, fl], [x + 1.05, 0.65, z + 0.45], car, { r: 0.02 });
      COLLIDE.push({ name: 'trunk-lip', lo: [x, -0.65, 0.18], hi: [x + 0.08, 0.65, z] });
    }
    if (m.kind === 'window') {  // a wall with an opening: sill at z, top at m.top, m.width wide
      const d = (m.depth || 0.15) * s, w = (m.width || 0.8) * s / 2, top = m.top * s, H = Math.max(top + 0.5, 2.4);
      K.box([x, -2, 0], [x + d, 2, z], block, { r: 0.01 }); K.box([x, -2, top], [x + d, 2, H], block, { r: 0.01 });
      K.box([x, -2, z], [x + d, -w, top], block, { r: 0.01 }); K.box([x, w, z], [x + d, 2, top], block, { r: 0.01 });
      COLLIDE.push({ name: 'wall-low', lo: [x, -2, 0], hi: [x + d, 2, z] }, { name: 'wall-top', lo: [x, -2, top], hi: [x + d, 2, H] });
    }
    if (m.kind === 'counter') { K.box([x, -0.9, 0], [x + 0.55, 0.9, z], block, { r: 0.02 }); COLLIDE.push({ name: 'counter', lo: [x, -0.9, 0], hi: [x + 0.55, 0.9, z] }); }
    if (m.kind === 'cash') { const g = K.group([x, y, z]); const c = BUILD.cash(); g.add(c); K.anim('cash_left', g, f => { g.visible = f >= (opts.f0 ?? 0) + m.from; }); }
    if (m.kind === 'seat') { const b = S(m.to); K.box([x, -0.3, 0], [b[0], 0.3, b[2]], block, { r: 0.03 }); }
  }
  return { props: K.props };
}
