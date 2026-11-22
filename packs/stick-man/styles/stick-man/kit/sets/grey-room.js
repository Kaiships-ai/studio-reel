// grey-room: a plain grey studio for trying things out (a pose, a clip, a face, a camera) before you build a real place.
// A floor with a 0.5 m grid, a curved grey wall behind, soft even light. Blender metres: x right, y into the scene, z up;
// the camera stands on the y < 0 side. Marks: left / center / right, and a seat (a grey block 0.45 m high) at `seat`.
import { createKit } from '/styles/stick-man/kit/sets/kit.js';

export const SUN_DIR = [0.35, 0.45, -0.82];
export const SUN_CENTER = [0, 0.5, 0.8], SUN_HALF = 6;
export const MARKS = { left: [-1.0, -0.3, 0], center: [0, -0.3, 0], right: [1.0, -0.3, 0], seat: [2.2, 1.0, 0], far_left: [-7, -0.3, 0], far_right: [7, -0.3, 0] };
export const PLACES = { seat_top: [2.2, 1.0, 0.45] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-9, -12], [9, 1.5]]];
export const COLLIDE = [{ name: 'seat', lo: [1.9, 0.8, 0], hi: [2.5, 1.2, 0.45] }];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.62, 0.62, 0.64], mid: [0.56, 0.56, 0.58], bottom: [0.34, 0.34, 0.35] }, envK: 0.6 });
  const floor = K.mat([0.58, 0.58, 0.6], 0.95), line = K.mat([0.48, 0.48, 0.5], 0.95), wall = K.mat([0.7, 0.7, 0.72], 0.95);
  K.box([-20, -20, -0.1], [20, 3, 0], floor, { r: 0 });
  for (let x = -8; x <= 8; x += 0.5) K.box([x - 0.006, -6, 0], [x + 0.006, 3, 0.002], line, { r: 0 });
  for (let y = -6; y <= 3; y += 0.5) K.box([-8, y - 0.006, 0], [8, y + 0.006, 0.002], line, { r: 0 });
  // the cyclorama: a quarter-round cove from the floor up into the back wall, so there is no corner line behind the cast
  const R = 1.5, N = 12;
  for (let i = 0; i < N; i++) { const a0 = i / N * Math.PI / 2, a1 = (i + 1) / N * Math.PI / 2;
    const y0 = 3 + R * Math.sin(a0), z0 = R - R * Math.cos(a0), y1 = 3 + R * Math.sin(a1), z1 = R - R * Math.cos(a1);
    K.box([-20, Math.min(y0, y1), Math.min(z0, z1)], [20, Math.max(y0, y1) + 0.02, Math.max(z0, z1) + 0.02], wall, { r: 0 }); }
  K.box([-20, 4.5, R], [20, 4.7, 14], wall, { r: 0 });
  K.box([1.9, 0.8, 0], [2.5, 1.2, 0.45], K.mat([0.66, 0.66, 0.68], 0.9), { r: 0.02 });
  K.area([0, -4, 4], [0, 0.5, 0.8], 6, 3, '#ffffff', 2.5);
  return { props: K.props };
}
