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
export const ELDERS = { man: [3.0, 4.6], woman: [3.55, 4.6], hand: [3.215, 4.68, 1.52],
  bag0: [3.85, 4.62, 0.72] };                                      // her handbag, hanging from her free hand until midnight
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

// the cameras, one per beat (each a cut): [frame, why, pos, aim, lens]; set.js keeps snow off the lens with them
const mid = f => { const g = girl(f), d = dadAt(f); return [(g[0] + d[0]) / 2, (g[1] + d[1]) / 2]; };
const hEmpty = () => handAt(GONE - 1), g330 = () => girl(GONE);
export const CAMS = () => { const h230 = handAt(230), h329 = handAt(329), he = hEmpty(), g = g330(), m200 = mid(200);
  return [
    [0, 'already busy: the dad and his girl walk hand in hand toward us into a full, lit square; the title sits over the square above them', [-1.12, 0.13, 2.6], [-2.32, -2.62, 2.2], 26],
    [86, 'he waves his free arm with the crowd, her hand in his', [0.06, 2.83, 2.6], [-1.38, -0.47, 2.2], 30],
    [196, 'he looks down at her and smiles, hand in hand', [0.99, 4.46, 1.0], [m200[0], m200[1], 1.05], 30],
    [226, 'contact: her hand in his', [h230[0] + U[0] * 1.4 + RIGHT[0] * 0.05, h230[1] + U[1] * 1.4 + RIGHT[1] * 0.05, 0.6], [h230[0], h230[1], 0.8], 26],
    [246, 'the old couple, whole: hand in hand, both faces, looking up together', [1.95, 6.4, 1.05], [3.27, 4.64, 0.95], 26],
    [294, 'ONE: from low behind them, close, the big clock at twelve over their heads, the board reads 23:59:59', [0.75, 3.0, 0.5], [0.68, 8.92, 4.0], 22],
    [306, 'the clock looks back: from under the board, down onto their faces turned up to it, hand in hand', [0.5, 8.4, 3.3], [1.0, 5.45, 0.85], 36],
    [318, 'midnight: hand in hand, her balloon over her; the next frame she is gone, the balloon rises free and he looks at it', [2.4, 8.0, 1.15], [1.4, 6.0, 1.25], 27],
    [330, 'she is gone: her balloon rises out of where her hand was, string slack; he looks up at it; nobody behind him', [1.11, 8.36, 1.8], [1.22, 6.09, 1.4], 30],
    [350, 'her balloon higher and smaller against the bunting, his head tilted up following it', [2.9, 8.2, 0.9], [1.6, 6.4, 2.3], 22],
    [440, 'low, from in front of him: his face with tears and, clear beside it, his arm up after her balloon (the shoulder-to-hand line reads; a5-3 twice failed from the side)', [2.74, 7.69, 1.0], [1.66, 6.2, 1.2], 26],
  ]; };
export const camAt = f => { let c = null; for (const k of CAMS()) if (k[0] <= f) c = k; return c; };

// her red balloon (the kit hand prop, kit/cast/handprops.js balloon: an 0.80 m string, the ball 0.15 m, centre 0.965 m over the
// fist, all at the child's scale 0.62, motion-lib/bodies.js) in her free (outer) hand from the start; at midnight the set's copy of
// it takes over where her hand was and rises free
export const CHILD_SCALE = 0.62, BALL_UP = 0.965 * CHILD_SCALE;
export const balloonHand = f => { const g = girl(Math.min(f, GONE - 1)); return [g[0] - RIGHT[0] * 0.24 + U[0] * 0.05, g[1] - RIGHT[1] * 0.24 + U[1] * 0.05, 0.50]; };   // in her reach: low at her side
export function balloonAt(f) {
  const h = balloonHand(GONE - 1), c0 = [h[0], h[1], h[2] + BALL_UP];
  if (f < GONE) return { c: c0, end: h, free: false };
  const t = (f - GONE) / 30, sway = 0.05 * Math.sin(t * 3) * Math.min(1, t * 2);
  const c = [c0[0] + U[0] * 0.5 * t + sway, c0[1] + U[1] * 0.5 * t, c0[2] + 1.5 * t + 0.1 * t * t];   // let go: it rises at once (1.5 m/s), drifting toward the clock
  return { c, end: [c[0], c[1], c[2] - BALL_UP], free: true };   // the string hangs straight under it
}
