// Where the wardrobe's cloth is not clean: every clip of the library was played whole in the coat, the apron, the dress and the skirt on the
// bodies that have it (25/11: 192 clip x body x outfit pairs, measured with the limits of test/unit/wardrobe-measure.mjs); eleven clips were
// reported unsafe below. A twelfth, React_SitDisbelief_Once, came with the Mixamo batch 1 clips (#202, 26/11), whose other clips that
// do not sit were NOT in that sweep; of the four new seated ones it is the one that is not clean (adult, the four garments). The list names only the hard cases (legs through the cloth, a hem that jerks in a run, a stoop, a lie-down). It is
// not "every other clip is clean": plain walking in a dress is over the walk limit of 6 cm a frame a frame (7.3 cm on 9 frames), and
// the carry-bag walk is at 6.2-6.4 cm on one frame; both are a known, accepted exceedance and are not in the list.
// tools/gates/clothgate.mjs reports a film that puts a hanging garment on a figure that plays one; nothing else reads this, so a
// figure without one is never affected. A sit is measured at each body's own girth up to 1.0; the gate does not check a sit on a
// body broader than girth 1.0, though on one the sit is not clean either.
import { expand } from './jobs.js';

// the garments that hang as cloth below the waist (a scarf's ends are cloth too, and clean)
export const HANGS = ['coat', 'skirt', 'dress', 'apron'];
export const hangs = list => expand([].concat(list || [])).filter(it => HANGS.includes(String(it).split(':')[0]));
// a clip key's name as the library files it: no body, no version
export const clipId = name => String(name).replace(/^(Adult|Heavy|Thin|Child|Elder|Teen|Toddler)_/, '').replace(/_v\d+$/, '');

const RUN = 'cloth in a run is not clean (legs through it, the hem jerks)', JUMP = 'cloth in a jump is not clean', LEAP = 'cloth in a leap through a window is not clean', LIE = 'cloth on a figure that lies down or gets up is not clean', STOOP = 'cloth on a figure that stoops to the floor and lifts is not clean', PUSH = 'cloth on a figure that leans in and pushes is not clean', BACK = 'cloth on a seated figure that throws itself back is not clean (the cloth goes into the arms)';
export const UNSAFE = {
  Move_Run_Fwd_Loop: { why: RUN }, Move_Sprint_Fwd_Loop: { why: RUN }, Act_Jump_Once: { why: JUMP }, Trans_JumpWindow_Once: { why: LEAP },
  Trans_LieDown_Once: { why: LIE }, Idle_Sleep_Loop: { why: LIE }, Trans_GetUp_Once: { why: LIE },
  Act_PickUp_Once: { why: STOOP }, Act_DropInTrunk_Once: { why: STOOP }, Act_PushBagOutWindow_Once: { why: STOOP }, Move_PushHeavy_Loop: { why: PUSH },
  React_SitDisbelief_Once: { why: BACK },
};
export const UNSAFE_BEATS = [{ do: 'walk_to', style: 'run', why: RUN }, { do: 'leap', why: LEAP }, { do: 'jump_joy', why: JUMP }];

// Pairs of one body, what it wears and one clip that are known not to be clean, whatever a later measure says: each blocks in
// tools/gates/fits.mjs with the number that showed it. A row matches a person of that body (and girth, when given) that wears at
// least those garments (shape words kept, colours dropped). Measured 26/11 on the merged kit (dc66975e, kit/compat.json): every
// blocked row that the clip list above does not explain, which covers the eight of fits-main (25/11: React_Terrified_Once in the
// long skirt, the lab coat and the work coat; Gest_Clap_Loop and Gest_SitClap_Loop in a coat or a shirt with pens). A pair failing
// two fixes is added here. Two are not cloth: the teen in a hoodie (the hood hides the face turned 90 deg: cover 0.026 against
// the adult's 0.042, and the reviewer saw it hide) and the child's breath (pinned: V5 uses Idle_Fidget_Loop once it is seen).
const MEASURED = '26/11, dc66975e';
export const UNSAFE_PAIRS = [
  { body: 'teen', wears: ['hoodie'], clip: '*', number: 0.026, unit: 'share of the face the hood covers at 90 deg', bad: 0, why: 'a teen in a hoodie: the hood hides the face (reviewer, 26/11); waits for Kai' },
  { body: 'child', wears: [], clip: 'Idle_Fidget_Loop', number: 33, unit: 'deg the head turns', bad: 0, why: "the reviewer (26/11, render of #206) saw the head turn read as a snap and the left arm drawn over the hip on frames 60-160; its two limits were written after the breath was measured, so the motion is the proof: waits for Kai" },
  { body: 'child', wears: [], clip: 'Idle_Breath_Loop', number: 0, unit: 'pinned', bad: 0, why: "the child's breath is pinned: use Idle_Fidget_Loop once its review has seen it move" },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Act_PutDown_Once", number: 17, unit: "frames: area # % of its own", bad: 17 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Gest_Clap_Loop", number: 10, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Gest_PointSeated_Loop", number: 2.4, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Gest_SitClap_Loop", number: 12, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Move_Walk_Fwd_Loop", number: 7.3, unit: "cm a frame a frame", bad: 6 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "React_Defeated_Once", number: 4, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Trans_SitDown_Once", number: 2, unit: "frames: area # % of its own", bad: 2 },
  { body: "adult", girth: 0.9, wears: ["coat:lab","pens","shirt:office","tie"], clip: "Trans_StandUp_Once", number: 11, unit: "mm of cloth in a hand", bad: 5 },
  { body: "adult", girth: 0.9, wears: ["skirt","sweater"], clip: "Gest_PointSeated_Loop", number: 79, unit: "deg, a column bends", bad: 3 },
  { body: "adult", girth: 0.9, wears: ["skirt","sweater"], clip: "Move_Walk_Fwd_Loop", number: 7.6, unit: "cm a frame a frame", bad: 11 },
  { body: "adult", girth: 0.9, wears: ["skirt","sweater"], clip: "React_Terrified_Once", number: 19, unit: "% stretched (p99)", bad: 27 },
  { body: "adult", girth: 0.9, wears: ["skirt","sweater"], clip: "Trans_SitDown_Once", number: 23, unit: "% stretched (p99)", bad: 9 },
  { body: "adult", girth: 0.9, wears: ["skirt","sweater"], clip: "Trans_StandUp_Once", number: 23, unit: "% stretched (p99)", bad: 3 },
  { body: "adult", girth: 1.12, wears: ["cardigan","shirt:work"], clip: "Gest_Clap_Loop", number: 1.8, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1.2, wears: ["coat:lab","nametag","shirt:office"], clip: "Gest_SitTalk_Loop", number: 77, unit: "deg, the hem turns", bad: 94 },
  { body: "adult", girth: 1.2, wears: ["coat:lab","nametag","shirt:office"], clip: "Move_CarryBag_Walk_Loop", number: 6.5, unit: "cm a frame a frame", bad: 1 },
  { body: "adult", girth: 1.2, wears: ["coat:lab","nametag","shirt:office"], clip: "React_Terrified_Once", number: 12.9, unit: "mm of cloth in an arm", bad: 5 },
  { body: "adult", girth: 1.35, wears: ["shirt:work"], clip: "Act_DropInTrunk_Once", number: 5.6, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1.35, wears: ["shirt:work"], clip: "Act_PushBagOutWindow_Once", number: 5.4, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["apron:low","scrubs"], clip: "Gest_SitClap_Loop", number: 1.1, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat","shirt:work"], clip: "Gest_Clap_Loop", number: 6.7, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat","shirt:work"], clip: "Gest_SitClap_Loop", number: 2.5, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat","shirt:work"], clip: "React_Defeated_Once", number: 1.1, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat","shirt:work"], clip: "React_Terrified_Once", number: 4.3, unit: "mm of cloth in an arm", bad: 1 },
  { body: "adult", girth: 1, wears: ["coat:lab","nametag","pens","shirt:office","tie"], clip: "Gest_Clap_Loop", number: 6.7, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat:lab","nametag","pens","shirt:office","tie"], clip: "Gest_SitClap_Loop", number: 9.6, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat:lab","nametag","pens","shirt:office","tie"], clip: "React_Defeated_Once", number: 1.1, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["coat:lab","nametag","pens","shirt:office","tie"], clip: "React_Terrified_Once", number: 4.3, unit: "mm of cloth in an arm", bad: 1 },
  { body: "adult", girth: 1, wears: ["nametag","pens","scrubs","stethoscope"], clip: "Act_DropInTrunk_Once", number: 9.7, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["nametag","pens","scrubs","stethoscope"], clip: "Act_PushBagOutWindow_Once", number: 9.7, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["nametag","pens","scrubs","stethoscope"], clip: "Gest_SitClap_Loop", number: 1.1, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["nametag","pens","shirt:office","tie"], clip: "Act_DropInTrunk_Once", number: 11.3, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["nametag","pens","shirt:office","tie"], clip: "Act_PushBagOutWindow_Once", number: 11.3, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["nametag","pens","shirt:office","tie"], clip: "Gest_SitClap_Loop", number: 1.9, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["pens","shirt:office","tie"], clip: "Act_DropInTrunk_Once", number: 11.3, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["pens","shirt:office","tie"], clip: "Act_PushBagOutWindow_Once", number: 11.3, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["pens","shirt:office","tie"], clip: "Gest_SitClap_Loop", number: 1.9, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["sweater"], clip: "Trans_GetUp_Once", number: 3.2, unit: "mm of a trim in an arm", bad: 0 },
  { body: "adult", girth: 1, wears: ["sweater"], clip: "Trans_LieDown_Once", number: 7.7, unit: "mm of a trim in an arm", bad: 0 },
  { body: "child", girth: 1, wears: ["scarf","sweater"], clip: "Move_Run_Fwd_Loop", number: 3, unit: "frames: armL through the cloth", bad: 3 },
].map(p => Object.freeze({ why: `measured ${MEASURED}: ${p.number} ${p.unit}${p.bad ? ` on ${p.bad} frames` : ''}`, ...p }));
// a garment named with its shape words ('shirt:office') is worn by an item of that layer with those words, in any colour
const wears = (worn, w) => { const [k, ...need] = w.split(':'); return worn.some(it => { const [x, ...has] = String(it).split(':'); return x === k && need.every(n => has.includes(n)); }); };
// the unsafe pair a person and a clip make, or null
export function unsafePair({ body = 'adult', girth, outfit = [] } = {}, clip) {
  const id = clipId(clip), worn = expand([].concat(outfit || [])), g = girth ?? 1;
  return UNSAFE_PAIRS.find(p => (p.clip === '*' || p.clip === id) && p.body === body && (p.girth == null || +p.girth.toFixed(3) === +(+g).toFixed(3)) && p.wears.every(w => wears(worn, w))) || null;
}
