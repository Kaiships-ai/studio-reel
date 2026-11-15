// Act_PushBagOutWindow_Once: from CARRY, heave the bag up over a window's sill and push it out through the opening; it
// leaves the hands past the sill and falls outside onto the ground. Hot Money ep01 SH150 (YOU pushes the duffel out of the
// motel's back window). Made from Act_DropInTrunk_Once's hand-keyed heave (its `heave`: the bag round to the front
// crosswise, both fists on the handle, the dip, the heave, the release with the fists following it out), the sill where
// the trunk's lip was. The window: a wall `depth` thick standing across the way the body faces, clip space x X.. X + depth,
// the sill `sill` high, the opening `width` wide and `top` high (base.js markColliders: wall-low under the sill, wall-top,
// wall-left and wall-right round the opening; the held bag is stopped by them, engine/body.js boxPush). While the bag is
// lower than the sill it stays short of the wall; it rises clear, goes forward over the sill, and is let go with a toss
// forward that carries its back past the wall's outer face before it drops to the sill's height, so it falls outside
// (engine/propobj.js), never back onto the sill. The wall stands 0.10 m further off than the trunk's lip would.
// Fitted to the set (`fit: { sill, top, width, depth }`, m; sill 0.60..0.90, the default Hot Money ep01's window: 0.8, 1.9,
// 1.0, 0.138) and to the bag (`fit.bag`, read off a film's own bag when the key swaps one in, as Act_DropInTrunk_Once
// does). The toss forward grows with the wall's depth over the trunk lip's 0.08 m, so a deeper wall is cleared too.
import { heave, EP01_BAG } from './Act_DropInTrunk_Once_v01.js';
import { BAG as KIT } from '../../props.js';

const EP01_WINDOW = { sill: 0.8, top: 1.9, width: 1.0, depth: 0.138 };
function make({ sill = EP01_WINDOW.sill, top = EP01_WINDOW.top, width = EP01_WINDOW.width, depth = EP01_WINDOW.depth, bag } = {}) {
  const H = heave('Act_PushBagOutWindow_Once', { lip: sill, bag }), B = { ...KIT, ...(bag || {}) };
  // the opening takes the bag held crosswise (its long side across, 4 cm a side to spare) and the fists over the sill
  if (!(width >= B.l + 0.08)) throw new Error(`Act_PushBagOutWindow_Once: fit.width ${width} m is narrower than the bag's ${B.l} m and 0.08 to spare`);
  if (!(top >= sill + 0.9)) throw new Error(`Act_PushBagOutWindow_Once: fit.top ${top} m is less than 0.9 m over the sill (${sill} m)`);
  if (!(depth >= 0.05 && depth <= 0.2)) throw new Error(`Act_PushBagOutWindow_Once: fit.depth ${depth} m is outside 0.05..0.20`);
  const toss = [H.toss[0] + TOSS_PER_M * Math.max(0, depth - 0.08), H.toss[1], H.toss[2]];
  return { name: 'Act_PushBagOutWindow_Once', clip: 'Act_PushBagOutWindow_Once', group: 'Act', loop: false, frames: 80, base: 'CARRY', end: 'STAND', style: 'kaiships',
    fit: make, fitted: { sill, top, width, depth, ...(bag ? { bag } : {}) }, fitProps: ['bag'], fitChecks: [{ ...EP01_WINDOW, bag: EP01_BAG }],
    needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'window', at: [H.X + WALL_BACK, 0, sill], top, width, depth }] }, toss: { bag: toss }, keys: H.keys };
}
// (m/s more forward a metre of wall depth over the lip's 0.08: the bag's back clears the outer face; 10 tossed it hard
// enough that the release blend dragged it 1.9 cm a frame past what its hand and gravity allow)
const TOSS_PER_M = 5;
// the wall stands 0.10 m further off than a trunk's lip: after the release the arms come forward (FK, swing 50) and at the
// lip's distance the left forearm met the sill's ledge (29 deg/f at frame 62 with the kit bag)
const WALL_BACK = 0.10;
export default make();
