// The costume sheet's cells (styles/stick-man/wardrobe.html draws them, test/unit/stick-wardrobe.test.mjs plays the same poses):
// { body, label, wear, pose, view, az (deg round from the front), close, hat (m above the head's centre the frame keeps) }
import { getClip } from '#motion-lib/index.js';
import { BODIES } from '#motion-lib/bodies.js';

export const LOOKS = [
  ['doctor', ['job:doctor']], ['nurse', ['job:nurse'], 0.46], ['police', ['job:police'], 0.48], ['pilot', ['job:pilot'], 0.48], ['worker', ['job:worker'], 0.46], ['office', ['job:office']],
  ['manager', ['job:manager']], ['chef', ['job:chef'], 0.66], ['student', ['job:student']], ['student blazer', ['job:student-blazer']], ['florist', ['job:florist']],
  ['sweater + scarf', ['sweater:navy', 'scarf:mustard']], ['dress', ['dress:coral']], ['sweater + skirt', ['sweater:sky', 'skirt:plum']], ['cardigan', ['shirt:office:sky', 'tie:crimson', 'cardigan:forest']],
];
const wear = n => LOOKS.find(l => l[0] === n);
// the clip a pose plays, the frame it shows, and the solids in the way (Blender metres, the figure starting at the origin facing +x)
const POSES = { stand: ['Idle_Breath_Loop', 24, 'Idle_Stand_Loop'], walk: ['Move_Walk_Fwd_Loop', 50], sitdown: ['Trans_SitDown_Once', 50], seated: ['Trans_SitDown_Once', 110], pick: ['Act_PickUp_Once', 54] };
export function PLACE_OF({ body, pose, f = null }) {
  const [name0, f0, alt] = POSES[pose], name = (() => { try { getClip(name0, body); return name0; } catch { return alt || name0; } })(), C = getClip(name, body);
  const key = C.advance ? { f: 0, clip: name, body, to: [C.introTravel + C.outroTravel + 3 * C.advance, 0] } : { f: 0, clip: name, body, ...(C.loop ? { times: 2 } : {}) };
  const sc = C.body ? 1 : (BODIES[body].spec.scale ?? 1), m = (C.needs?.marks || []).find(x => x.kind === 'seat'), seat = m ? { name: 'seat', lo: [m.at[0] * sc, m.at[1] * sc - 0.36, 0], hi: [m.to[0] * sc, m.at[1] * sc + 0.36, m.to[2] * sc] } : null;
  return { key, f: f ?? f0, name, clip: C, seat, solids: seat ? [seat] : [] };
}
const cell = (body, n, pose, view, o = {}) => ({ body, label: n, wear: wear(n)[1], hat: wear(n)[2], pose, view, az: { front: 0, '3/4': 38, side: 90, back: 180, '3/4 back': 142 }[view] ?? 0, ...o });
export const CELLS = [
  ...LOOKS.flatMap(([n]) => ['front', '3/4'].map(v => cell('adult', n, 'stand', v))),                                   // 0..29
  ...LOOKS.map(([n]) => cell('adult', n, 'stand', 'front', { close: true, view: 'close', az: 14 })),                    // 30..44
  ...['heavy', 'thin', 'elder', 'child'].flatMap(b => ['doctor', 'police', 'chef', 'dress'].map(n => cell(b, n, 'stand', '3/4'))),   // 45..60
  ...['doctor', 'dress', 'chef', 'sweater + skirt', 'sweater + scarf'].flatMap(n => ['side', '3/4'].map(v => cell('adult', n, 'walk', v))),   // 61..70
  cell('elder', 'dress', 'walk', '3/4'), cell('child', 'dress', 'walk', 'side'), cell('heavy', 'doctor', 'walk', 'side'),                     // 71..73
  ...['doctor', 'dress', 'chef', 'sweater + skirt'].flatMap(n => [cell('adult', n, 'sitdown', '3/4'), cell('adult', n, 'seated', '3/4'), cell('adult', n, 'seated', 'side')]),   // 74..85
  ...['dress', 'chef'].flatMap(n => [56, 62].map(f => cell('adult', n, 'sitdown', '3/4', { f }))),   // 86..89: the deepest of the sit
];
