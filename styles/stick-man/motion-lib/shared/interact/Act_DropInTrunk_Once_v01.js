// Act_DropInTrunk_Once: from CARRY, heave the bag over a car's trunk lip (0.68 m) and let it drop in. The bag comes round to
// the front and turns crosswise as the left fist takes the handle too, a dip (the wind-up: knees give, the bag low), the
// heave up and forward over the lip with the hips back against the load (as far back as the balance solve put them:
// 0.21 W at the top, so the clip carries its own balance and the solve adds little), the release over the trunk (the bag falls on
// its own, tossed forward at `toss`, onto the trunk floor: engine/propobj.js), the follow-through, STAND. The lip: clip space x 0.45 m, 0.68 m high, 0.08 m
// thick; the trunk floor 0.50 m. The bag stays short of the lip while it is lower than its top (the rear panel is solid:
// motion-lib/base.js markColliders), rises clear of it, then goes forward over it.
// Fitted to the set's trunk: the clip key's `fit: { lip }` (m, 0.60..0.90; index.js placeClip) raises the heave and the
// release by the lip's height over 0.68 m, the trunk floor with it (a lip 0.85 m: the fists 0.17 m higher over it).
import { stand, carry, K, merge, CARRY_KG } from '../../base.js';

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
function make({ lip = 0.68 } = {}) {
  if (!(lip >= 0.6 && lip <= 0.9)) throw new Error(`Act_DropInTrunk_Once: fit.lip ${lip} m is outside 0.60..0.90`);
  // the heave's fists raised with the lip (W); the back straighter by as much (a higher lip is reached standing taller,
  // and the head stays back from the bag at the top: bent as for 0.68 m, the bag's corner met it)
  const dy = (lip - 0.68) / 0.6, up = (y, z) => hands(y + dy, z), BK = 60 * (lip - 0.68), bend = b => ({ spine: { bend: b - BK } });
  return { name: 'Act_DropInTrunk_Once', clip: 'Act_DropInTrunk_Once', group: 'Act', loop: false, frames: 80, base: 'CARRY', end: 'STAND', style: 'kaiships', fit: make, fitted: { lip }, fitChecks: [{ lip: 0.85 }], clip: 'Act_DropInTrunk_Once', group: 'Act', loop: false, frames: 80, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'trunk', at: [0.45, 0, lip], floor: lip - 0.18 }] }, toss: { bag: [1.2, 0, 0] },
  keys: [
    K(0, merge(C1, { x_yawR: 0, armR: { ik: [0.40, 1.30, 0.50], ikw: 0 }, armL: { ik: [0.30, 1.30, 0.50], ikw: 0 } })),
    K(6, merge(C1, { x_yawR: 45, shrugR: -0.04, spine: { side: -9 }, armR: { ik: [0.66, 1.30, 0.33], ikw: 1, pole: PR }, armL: { ik: [0.30, 1.30, 0.50], ikw: 0, raise: 40, swing: 35, elbow: 30 } })),          // the bag swung out ahead of the leg
    K(12, merge(S0, BAG, hands(1.34, 0.50, 0.26), { spine: { side: -3, bend: 2 }, hip: { z: -0.08 } })),           // round to the front, the left fist joins
    K(20, merge(S0, BAG, hands(1.15, 0.48), { bob: -0.16, hip: { z: -0.12 }, spine: { bend: 8 }, neck: { nod: 8 } })),   // the dip
    K(26, merge(S0, BAG, FK, up(1.74, 0.52), { bob: 0.0, hip: { z: -0.10 }, ...bend(16), neck: { nod: -8 } })),   // up: clear of the lip
    K(30, merge(S0, BAG, FK, up(1.78, 0.78), { bob: 0.02, hip: { z: -0.21 }, ...bend(28), neck: { nod: -10 } })),   // and forward over it
    K(32, merge(S0, BAG, FK, up(1.78, 0.79), { bob: 0.02, hip: { z: -0.21 }, ...bend(29), neck: { nod: -6 } })),
    K(33, merge(S0, BAG, FK, up(1.775, 0.86), { x_hpR_bag: 0.7, bob: 0.02, hip: { z: -0.19 }, ...bend(29), neck: { nod: -2 } })),     // the fingers open: the load
    K(36, merge(S0, NONE, FK, up(1.68, 0.98), { x_hpR_bag: 0.05, bob: 0.01, hip: { z: -0.10 }, ...bend(27), neck: { nod: 4 } })),    // leaves the fingers over 3 frames, the fists following it out along its path (a throw: no blend pulls it back)
    K(46, merge(S0, NONE, FK, FWD(), { bob: -0.04, hip: { z: -0.06 }, spine: { bend: 18 }, neck: { nod: 20 } })),    // follow-through: watching it land
    K(54, merge(S0, NONE, FK, FWD(0), { hip: { z: -0.02 }, spine: { bend: 10 }, neck: { nod: 12 } })),
    K(66, merge(S0, NONE, FWD(0), { hip: { z: 0 }, spine: { bend: 4 }, neck: { nod: 6 } })),
    K(80, merge(S0, NONE, FWD(0), { hip: { z: 0 } }))] };
}
export default make();
