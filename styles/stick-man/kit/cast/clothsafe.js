// Where the wardrobe's cloth is not clean: every clip of the library was played whole in the coat, the apron, the dress and the skirt on the
// bodies that have it (25/11: 192 clip x body x outfit pairs, measured with the limits of test/unit/wardrobe-measure.mjs); eleven clips were
// reported unsafe below. A twelfth, React_SitDisbelief_Once, came with the Mixamo batch 1 clips (#202, 26/11), whose other clips that
// do not sit were NOT in that sweep; of the four new seated ones it is the one that is not clean (adult, the four garments). The list names only the hard cases (legs through the cloth, a hem that jerks in a run, a stoop, a lie-down). It is
// not "every other clip is clean": plain walking in a dress is over the walk limit of 6 cm a frame a frame (7.3 cm on 9 frames), and
// the carry-bag walk is at 6.2-6.4 cm on one frame; both are a known, accepted exceedance and are not in the list.
// tools/gates/clothgate.mjs reports a film that puts a hanging garment on a figure that plays one; nothing else reads this, so a
// figure without one is never affected. A sit is measured at each body's own girth up to 1.0; the gate does not check a sit on a
// body broader than girth 1.0, though on one the sit is not clean either.
import { expand } from './wardrobe.js';

// the garments that hang as cloth below the waist (a scarf's ends are cloth too, and clean)
export const HANGS = ['coat', 'skirt', 'dress', 'apron'];
export const hangs = list => expand([].concat(list || [])).filter(it => HANGS.includes(String(it).split(':')[0]));
// a clip key's name as the library files it: no body, no version
export const clipId = name => String(name).replace(/^(Adult|Heavy|Thin|Child|Elder)_/, '').replace(/_v\d+$/, '');

const RUN = 'cloth in a run is not clean (legs through it, the hem jerks)', JUMP = 'cloth in a jump is not clean', LEAP = 'cloth in a leap through a window is not clean', LIE = 'cloth on a figure that lies down or gets up is not clean', STOOP = 'cloth on a figure that stoops to the floor and lifts is not clean', PUSH = 'cloth on a figure that leans in and pushes is not clean', BACK = 'cloth on a seated figure that throws itself back is not clean (the cloth goes into the arms)';
export const UNSAFE = {
  Move_Run_Fwd_Loop: { why: RUN }, Move_Sprint_Fwd_Loop: { why: RUN }, Act_Jump_Once: { why: JUMP }, Trans_JumpWindow_Once: { why: LEAP },
  Trans_LieDown_Once: { why: LIE }, Idle_Sleep_Loop: { why: LIE }, Trans_GetUp_Once: { why: LIE },
  Act_PickUp_Once: { why: STOOP }, Act_DropInTrunk_Once: { why: STOOP }, Act_PushBagOutWindow_Once: { why: STOOP }, Move_PushHeavy_Loop: { why: PUSH },
  React_SitDisbelief_Once: { why: BACK },
};
export const UNSAFE_BEATS = [{ do: 'walk_to', style: 'run', why: RUN }, { do: 'leap', why: LEAP }, { do: 'jump_joy', why: JUMP }];
