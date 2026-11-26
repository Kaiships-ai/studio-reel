// the close lineup still: the same set, people and clips as ../reel.js, a camera at the six of them
import R, { CAM } from '../reel.js';
const cam = (pos, aim, lens) => ({ at: { f: 0 }, intent: 'still', why: 'mid lineup', cut: 'cut', cam: { pos, aim, lens }, to: { pos, aim, lens }, move: { from: { f: 0 }, dur: 1, ease: 'linear' } });
export default { ...R, title: 'kit-showcase lineup', frames: R.frames,
  direct: [cam(...CAM.lineup)] };
