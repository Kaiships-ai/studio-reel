// the mid lineup still: the stills staging (../stills/reel.js), a camera at the six of them
import { base, STILL } from '../stills/reel.js';
const cam = (pos, aim, lens) => ({ at: { f: 0 }, intent: 'still', why: 'mid lineup', cut: 'cut', cam: { pos, aim, lens }, to: { pos, aim, lens }, move: { from: { f: 0 }, dur: 1, ease: 'linear' } });
export default { ...base, title: 'kit-showcase lineup', direct: [cam(...STILL.lineup)] };
