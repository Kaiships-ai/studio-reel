// Act_DropInTrunk_Once: from CARRY, heave the bag over a car's trunk lip (0.68 m) and let it drop in. The bag comes round to
// the front and turns crosswise as the left fist takes the handle too, a dip (the wind-up: knees give, the bag low), the
// heave up and forward over the lip with the hips back against the load (as far back as the balance solve put them:
// 0.21 W at the top, so the clip carries its own balance and the solve adds little), the release over the trunk (the bag falls on
// its own, tossed forward at `toss`, onto the trunk floor: engine/propobj.js), the follow-through, STAND. The lip: clip space x 0.45 m, 0.68 m high, 0.08 m
// thick; the trunk floor 0.50 m. The bag stays short of the lip while it is lower than its top (the rear panel is solid:
// motion-lib/base.js markColliders), rises clear of it, then goes forward over it.
// Fitted to the set's trunk: the clip key's `fit: { lip }` (m, 0.60..0.90; index.js placeClip) raises the heave and the
// release by the lip's height over 0.68 m, the trunk floor with it (a lip 0.85 m: the fists 0.17 m higher over it).
// Fitted to the bag too (`fit: { bag: { w, l, h, grip } }`, m; index.js reads it off the film's own bag when the key swaps
// one in, so a film gives no numbers): between the body and the lip there is room for the kit bag's 0.20 m held crosswise
// and no more, so a deeper bag (w over 0.20) is heaved standing further from the lip (the trunk mark moves out 1.25 times
// the extra depth) with the fists half the extra depth further out in front, its back as clear of the knees as the kit
// bag's; a handle higher over the bag's bottom (grip over 0.31) raises the fists by as much in front (the bag's bottom where
// the kit bag's is) and the back is straighter for it. At the top the arms are at their reach already: the fists go no
// further out and 0.7 of the handle's extra height up, and the bag is heaved up as it leaves the fingers (toss up 10 m/s a
// metre of extra depth: 1.6 m/s for 0.36) so it clears the further lip and lands on the trunk floor. Swung out ahead of the
// leg, a longer and wider bag goes out that much wider (its inner corner clear of the thigh). Measured with
// tools/motionlib.mjs fitChecks at Hot Money ep01's duffel (0.36 x 0.62, handle 0.415) on a 0.85 m lip: every gate passes.
import { stand, carry, K, merge, CARRY_KG } from '../../base.js';
import { BAG as KIT } from '../../props.js';

// (Hot Money ep01's one-hand duffel: 0.36 across, 0.62 long, 0.30 tall, its handle's top 0.415 over its bottom)
export const EP01_BAG = { w: 0.36, l: 0.62, h: 0.30, grip: 0.415 };
// elbows out and down (explicit poles): the wanted elbow already clears the body, so the solver never has to swing it
// round to the other side between two frames
const PR = [0.8, -0.6, -0.2], PL = [-0.8, -0.6, -0.2];
const S0 = stand('adult'), C1 = carry('adult');
// (the load is x_kgR times the attach weight x_hpR_bag: the fingers open over 33..36, the weight eases out after it)
const BAG = { x_hpR_bag: 1, x_kgR: CARRY_KG, x_yawR: 90 }, NONE = { x_hpR_bag: 0, x_kgR: CARRY_KG, x_yawR: 90 };
// both fists on the handle: the right one holds the bag, the left 0.10 W to its left (figure frame, W)
const hands = (y, z, x = 0.05) => ({ armR: { ik: [x, y, z], ikw: 1, pole: PR }, armL: { ik: [x - 0.10, y, z], ikw: 1, pole: PL } });
// the FK under the ik is the arms forward (swing 50): after the release the targets come back to where those FK hands
// are, and only then does the ik weight go (no pop when the hands let go)
const FK = { armR: { raise: 12, swing: 50, elbow: 30 }, armL: { raise: 12, swing: 50, elbow: 30 } };
const FWD = (w = 1) => ({ armR: { ik: [0.33, 1.57, 0.88], ikw: w, pole: PR }, armL: { ik: [-0.33, 1.57, 0.88], ikw: w, pole: PL } });
// The heave as keys, for a top edge `lip` m high (a trunk's lip, a window's sill) and a bag (fit.bag): { keys, X (where the
// edge's near face stands, clip space x), toss (m/s, clip space) }. Act_PushBagOutWindow_Once heaves the same way.
export function heave(name, { lip = 0.68, bag } = {}) {
  if (!(lip >= 0.6 && lip <= 0.9)) throw new Error(`${name}: the edge ${lip} m is outside 0.60..0.90`);
  const B = { ...KIT, ...(bag || {}) };
  if (!(B.w >= KIT.w - 1e-9 && B.w <= 0.40 && B.grip >= KIT.grip - 1e-9 && B.grip <= 0.50)) throw new Error(`${name}: fit.bag ${JSON.stringify(bag)}: w ${KIT.w}..0.40, grip ${KIT.grip}..0.50 m`);
  // the bag's fit (W): its handle over the kit's (dg), its extra depth and length (dw, dl, m); the fists out in front (near)
  const dg = (B.grip - KIT.grip) / 0.6, dw = B.w - KIT.w, dl = Math.max(0, B.l - KIT.l), near = dw / 2 / 0.6, X = 0.45 + 1.25 * dw;
  const at = (y, z, x, out = near) => hands(y + dg, z + out, x);
  // the heave's fists raised with the lip (W); the back straighter by as much (a higher lip is reached standing taller,
  // and the head stays back from the bag at the top: bent as for 0.68 m, the bag's corner met it), and by a higher handle
  const dy = (lip - 0.68) / 0.6, BK = 60 * (lip - 0.68) + 40 * (B.grip - KIT.grip), bend = b => ({ spine: { bend: b - BK } });
  const up = (y, z, out = near) => at(y + dy, z, undefined, out), top = (y, z) => hands(y + dy + 0.7 * dg, z);
  return { X, toss: [1.2, 0, 10 * dw], keys: [
    K(0, merge(C1, { x_yawR: 0, armR: { ik: [0.78, 1.02, 0.03], ikw: 0 }, armL: { ik: [0.30, 1.30, 0.50], ikw: 0 } })),
    K(6, merge(C1, { x_yawR: 45, shrugR: -0.04, spine: { side: -9 }, armR: { ik: [0.76 + (dw + dl) / 2, 1.30 + dg, 0.33], ikw: 1, pole: PR }, armL: { ik: [-0.82, 1.40, 0.57], ikw: 0, raise: 40, swing: 35, elbow: 30 } }), { ease: 'flow' }),          // the bag swung out ahead of the leg
    K(12, merge(S0, BAG, at(1.34, 0.50, 0.26, 1.25 * near), { bob: -0.02, spine: { side: -3, bend: 2 }, hip: { z: -0.08 } })),           // round to the front, the left fist joins
    K(20, merge(S0, BAG, at(1.15, 0.48), { bob: -0.16, hip: { z: -0.12 }, spine: { bend: 8 }, neck: { nod: 8 } })),   // the dip
    K(26, merge(S0, BAG, FK, up(1.74 - 0.5 * dg, 0.52, 1.2 * near), { bob: -0.05, hip: { z: -0.10 }, ...bend(16), neck: { nod: -8 } })),   // up: clear of the lip
    K(31, merge(S0, BAG, FK, top(1.78, 0.78), { bob: 0.02, hip: { z: -0.21 }, ...bend(28), neck: { nod: -10 } })),   // and forward over it
    K(32, merge(S0, BAG, FK, top(1.78, 0.79), { bob: 0.02, hip: { z: -0.21 }, ...bend(29), neck: { nod: -6 } })),
    K(33, merge(S0, BAG, FK, top(1.775, 0.86), { x_hpR_bag: 0.7, bob: 0.02, hip: { z: -0.19 }, ...bend(29), neck: { nod: -2 } })),     // the fingers open: the load
    K(36, merge(S0, NONE, FK, top(1.68, 0.98), { x_hpR_bag: 0.05, bob: 0.01, hip: { z: -0.10 }, ...bend(27), neck: { nod: 4 } })),    // leaves the fingers over 3 frames, the fists following it out along its path (a throw: no blend pulls it back)
    K(46, merge(S0, NONE, FK, FWD(), { bob: -0.04, hip: { z: -0.06 }, spine: { bend: 18 }, neck: { nod: 20 } })),    // follow-through: watching it land
    K(54, merge(S0, NONE, FK, FWD(0), { hip: { z: -0.02 }, spine: { bend: 10 }, neck: { nod: 12 } })),
    K(66, merge(S0, NONE, FWD(0), { hip: { z: 0 }, spine: { bend: 4 }, neck: { nod: 6 } })),
    K(80, merge(S0, NONE, FWD(0), { hip: { z: 0 } }))] };
}
function make({ lip = 0.68, bag } = {}) {
  const H = heave('Act_DropInTrunk_Once', { lip, bag });
  return { name: 'Act_DropInTrunk_Once', clip: 'Act_DropInTrunk_Once', group: 'Act', loop: false, frames: 80, base: 'CARRY', end: 'STAND', style: 'kaiships',
    fit: make, fitted: { lip, ...(bag ? { bag } : {}) }, fitProps: ['bag'], fitChecks: [{ lip: 0.85 }, { lip: 0.85, bag: EP01_BAG }],
    needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'trunk', at: [H.X, 0, lip], floor: lip - 0.18 }] }, toss: { bag: H.toss }, keys: H.keys };
}
export default make();
