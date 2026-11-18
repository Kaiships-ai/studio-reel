// Far backdrop (KIT-DEPTH): rows of town blocks set 20-60 m out past a set's own walls, so the gap over a wall or down a
// street shows a detailed far layer (window grids with a few lit panes, water tanks, a billboard, poles and wires) that the
// lens blur and the air pass soften, instead of one flat colour. Pieces: assets/backdrop/ (tools/backdrop_blend.py).
//   act.backdrop: { rows: [{ piece: 'backdrop_skyline_a', at: [x, y, 0], rot: 90 }, ...], tint }   (engine/play.js calls this)
//   await backdrop(stage, rows, { tint });   // or from a set's own build()
// tint multiplies the pieces' colours (a row may carry its own). The toon ramp ignores light intensity, so a night set
// graded up 2-3x needs dark albedos: Hot Money's night lot reads right at about 0.17. Lit windows and signs keep their glow.
// A piece's facade faces -y at rot 0 (Blender degrees about z); it never collides, casts no ink line, is not dressing.
// It ignores the act's linear haze (full at 34-60 m, which flattens a far row to one colour); the stage's air pass, coloured
// by the sky, fades it instead and keeps its windows and roofline readable under the blur.
import { glbKit } from '../../lib/sets/glb.js';

export const BACKDROP_PIECES = ['backdrop_skyline_a', 'backdrop_skyline_b', 'backdrop_roofline'];

export async function backdrop(stage, rows, { tint = [1, 1, 1] } = {}) {
  const g = glbKit(stage, 'backdrop', []);
  await g.load([...new Set(rows.map(r => r.piece))]);
  // a tint always keys the pieces' own toon materials (glb.js toonFrom), so fog = false never reaches a set's pieces
  const out = rows.map(r => g.place(r.piece, r.at, r.rot ?? 0, { scale: r.scale ?? 1, ink: false, solid: false, dressing: false, tint: r.tint ?? tint }));
  for (const o of out) o.traverse(m => { if (m.isMesh) { m.material.fog = false; m.castShadow = false; } });
  return out;
}
