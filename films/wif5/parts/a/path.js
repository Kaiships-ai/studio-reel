// wif5 part a: where things stand, shared by reel.js and set.js (Blender metres: x right, y into the square, z up).
// The dad and his daughter walk hand in hand from the near left toward the clock tower; they stop being two at 330.
export const U = [0.4, 0.9165];                                    // their walk: up the square toward the tower
export const START = [-2.6, -2.5];
export const GIRL_SPEED = 0.029;                                   // m/frame, the child's Move_Walk_Fwd_Loop (0.87 m/s)
export const SIDE = 0.62;                                          // the dad walks this far on her right
export const HAND_Z = 0.66;                                        // the joined hands' height
export const HAND_OFF = 0.29;                                      // from her centre toward his
export const RIGHT = [U[1], -U[0]];
export const TOWER = { x0: -2.0, x1: 2.0, y0: 9.0, y1: 11.6, h: 13.4 };
export const CLOCK = [0, 8.92, 7.4], CLOCK_R = 2.05;             // the face: big, low on the tower, a few metres above the crowd
export const BOARD = [0, 8.9, 4.55];                               // the lit countdown board under it
export const ELDERS = { man: [3.0, 4.6], woman: [3.55, 4.6], hand: [3.215, 4.68, 1.52] };
export const at = (p, d) => [p[0] + U[0] * d, p[1] + U[1] * d];

// the girl's walk as the motion library plays it (her keys are dense: one a frame), and where things are at frame f
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
export const YAW = 156.4, WALK = 11.0;                             // facing along U (yaw 0 faces the camera side, -y; 90 faces +x)
export const girlKeys = () => expandClips([{ f: 0, clip: 'Move_Walk_Fwd_Loop', body: 'child', pos: START, yaw: YAW, to: at(START, WALK) }]);
let G = null;
export function girl(f) {
  G ||= girlKeys(); let i = G.findIndex(k => k.f >= f); if (i < 0) i = G.length - 1; if (i === 0 || G[i].f === f) return G[i].pos.slice(0, 2);
  const a = G[i - 1], b = G[i], u = (f - a.f) / (b.f - a.f); return [0, 1].map(j => a.pos[j] + (b.pos[j] - a.pos[j]) * u);
}
export const dadAt = f => { const g = girl(f); return [g[0] + RIGHT[0] * SIDE, g[1] + RIGHT[1] * SIDE]; };
export const handAt = f => { const g = girl(f); return [g[0] + RIGHT[0] * HAND_OFF + U[0] * 0.06, g[1] + RIGHT[1] * HAND_OFF + U[1] * 0.06, HAND_Z]; };
export const GONE = 330;                                           // midnight: the women are not there any more
