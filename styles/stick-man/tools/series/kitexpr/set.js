// The expression sheet's stage: the motion library's grey floor, or nothing at all with ?sil=1 (the silhouette pass: the
// figure alone on a flat key colour, filled black by the sheet tool).
import { createKit } from '/styles/stick-man/kit/sets/kit.js';

export const SUN_DIR = [0.35, 0.45, -0.85], SUN_CENTER = [0, 0, 0.6], SUN_HALF = 5;
export const PLACES = {}, MARKS = {}, CAMERA_SIDE = [0, -1], CAMERA_ROOM = [[[-20, -20], [20, 20]]], COLLIDE = [];

export async function build(stage, opts = {}) {
  const K = createKit(stage, { env: { top: [0.5, 0.5, 0.52], mid: [0.45, 0.45, 0.47], bottom: [0.3, 0.3, 0.3], panels: [] }, envK: 0.4 });
  if (!opts.sil) K.box([-8, -8, -0.05], [12, 8, 0], K.mat([0.46, 0.46, 0.47], 0.95), { r: 0 });
  return { props: K.props };
}
