// the two stills (wide, lineup): the same people, set and clips as ../reel.js, standing in two rows facing the camera
// (the loop's circuits are for the loop; a still wants every face to the lens). Walkers are the loop's walk, frozen in place by a fixed "circuit".
import R, { P, circuit, hold, endAt } from '../reel.js';
const DEG = Math.PI / 180;
const stand = (x, y) => () => ({ p: [x, y], th: -90 * DEG });
const ANA = hold(circuit(P.ana, 'Move_Walk_Fwd_Loop', 31, 8, stand(-0.6, 1.1), 0, { x_hpR_tin: 1 }), 'tin', 'R');
const BO = hold(circuit(P.bo, 'Move_Walk_Fwd_Loop', 31, 8, stand(0.7, 1.1), 0, { x_hpL_tin: 1 }), 'tin', 'L');
const MAI = hold(circuit(P.mai, 'Move_Walk_Fwd_Loop', 20, 12, stand(-1.3, 1.0), 0, { x_hpL_balloon: 1 }), 'balloon', 'L');
const ONG = hold(endAt(P.ong, [['Act_Give_Once']], [2.2, 2.6], -40, { x_hpR_tin: 1 }), 'tin', 'R');
const cam = (pos, aim, lens) => ({ at: { f: 0 }, intent: 'still', why: 'still', cut: 'cut', cam: { pos, aim, lens }, to: { pos, aim, lens }, move: { from: { f: 0 }, dur: 1, ease: 'linear' } });
export const STILL = { wide: [[0.55, -2.8, 1.25], [0.55, 3.0, 1.35], 14], lineup: [[0.55, -1.9, 1.3], [0.55, 3.0, 1.3], 11] };
export const base = { ...R,
  cast: { ...R.cast, ong: P.ong.cast({ at: [2.2, 2.6, 0], yaw: -40 }), ana: P.ana.cast({ at: [-0.6, 1.1, 0], yaw: 0 }), bo: P.bo.cast({ at: [0.7, 1.1, 0], yaw: 0 }), mai: P.mai.cast({ at: [-1.3, 1.0, 0], yaw: 0 }) },
  anim: { ...R.anim, ong: ONG, ana: ANA, bo: BO, mai: MAI } };
export default { ...base, title: 'kit-showcase wide', direct: [cam(...STILL.wide)] };
