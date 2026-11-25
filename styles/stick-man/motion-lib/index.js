// The motion library: (clip name, body) -> clip, and the expansion of a motion v2 anim key into the clip's keys.
//   anim key  { f, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to?: [x, y], times?: n, stop?, pos?, yaw?, swap?, fit?, expr?, look?, ease? }
//   clip      { name, clip, body?, group, loop, frames, base, end?, style, needs: { props, hands, marks? }, keys,
//               loops that travel: advance, intro, introFrames, introTravel, outro, outroTravel }
// A clip is written in clip space (base.js): the actor at the origin facing +x. Expansion moves it to the actor (the
// key's pos, else where the keys before it left the actor) and turns it to the key's heading (toward `to`, else the key's
// yaw, else the current one). A travelling loop with `to` starts with its first step from the standard pose, repeats
// to cover the distance (its strides stretched to land exactly, `times` fixes the count) and ends with a closing step;
// `stop: true` does the same without `to`. A shared clip played on another body scales its metres with that body's size.
// The README in this folder has the rules; docs/MOTION-LIB.md the catalogue.
import * as THREE from 'three';
import { BODIES } from './bodies.js';
import { BASES } from './base.js';
import { BUILD } from '#kit/cast/handprops.js';
import Adult_Move_Run_Fwd_Loop_v01 from './body/adult/Adult_Move_Run_Fwd_Loop_v01.js';
import Adult_Move_Walk_Fwd_Loop_v01 from './body/adult/Adult_Move_Walk_Fwd_Loop_v01.js';
import Adult_Move_Sprint_Fwd_Loop_v01 from './body/adult/Adult_Move_Sprint_Fwd_Loop_v01.js';
import Adult_Act_Jump_Once_v01 from './body/adult/Adult_Act_Jump_Once_v01.js';
import Adult_Idle_Stand_Loop_v01 from './body/adult/Adult_Idle_Stand_Loop_v01.js';
import Adult_Idle_LookAround_Loop_v01 from './body/adult/Adult_Idle_LookAround_Loop_v01.js';
import Adult_Gest_Talk_Loop_v01 from './body/adult/Adult_Gest_Talk_Loop_v01.js';
import Adult_Gest_Wave_Loop_v01 from './body/adult/Adult_Gest_Wave_Loop_v01.js';
import Adult_Trans_SitDown_Once_v01 from './body/adult/Adult_Trans_SitDown_Once_v01.js';
import Adult_Idle_Sit_Loop_v01 from './body/adult/Adult_Idle_Sit_Loop_v01.js';
import Adult_Trans_StandUp_Once_v01 from './body/adult/Adult_Trans_StandUp_Once_v01.js';
import Adult_Gest_PointSeated_Loop_v01 from './body/adult/Adult_Gest_PointSeated_Loop_v01.js';
import Adult_Act_PickUp_Once_v01 from './body/adult/Adult_Act_PickUp_Once_v01.js';
import Adult_Move_TurnLeft_Once_v01 from './body/adult/Adult_Move_TurnLeft_Once_v01.js';
import Adult_Trans_LieDown_Once_v01 from './body/adult/Adult_Trans_LieDown_Once_v01.js';
import Adult_Idle_Sleep_Loop_v01 from './body/adult/Adult_Idle_Sleep_Loop_v01.js';
import Adult_Trans_GetUp_Once_v01 from './body/adult/Adult_Trans_GetUp_Once_v01.js';
import Adult_Trans_JumpWindow_Once_v01 from './body/adult/Adult_Trans_JumpWindow_Once_v01.js';
import Adult_Act_Phone_Once_v01 from './body/adult/Adult_Act_Phone_Once_v01.js';
import Adult_Move_CarryBag_Walk_Loop_v01 from './body/adult/Adult_Move_CarryBag_Walk_Loop_v01.js';
import Adult_Move_PushHeavy_Loop_v01 from './body/adult/Adult_Move_PushHeavy_Loop_v01.js';
import Adult_Idle_CarryBag_Loop_v01 from './body/adult/Adult_Idle_CarryBag_Loop_v01.js';
import Adult_Act_PutDown_Once_v01 from './body/adult/Adult_Act_PutDown_Once_v01.js';
import Adult_React_Startle_Once_v01 from './body/adult/Adult_React_Startle_Once_v01.js';
import Adult_Gest_LookBack_Once_v01 from './body/adult/Adult_Gest_LookBack_Once_v01.js';
import Adult_Act_PistolShoot_Once_v01 from './body/adult/Adult_Act_PistolShoot_Once_v01.js';
import Adult_Act_TorchReady_Loop_v01 from './body/adult/Adult_Act_TorchReady_Loop_v01.js';
import Adult_Act_Drive_Loop_v01 from './body/adult/Adult_Act_Drive_Loop_v01.js';
import Adult_Act_HandOver_Once_v01 from './body/adult/Adult_Act_HandOver_Once_v01.js';
import Adult_Act_Consume_Once_v01 from './body/adult/Adult_Act_Consume_Once_v01.js';
import Adult_Gest_PhoneCall_Loop_v01 from './body/adult/Adult_Gest_PhoneCall_Loop_v01.js';
import Adult_Gest_LookBackCarry_Once_v01 from './body/adult/Adult_Gest_LookBackCarry_Once_v01.js';
import Heavy_Act_TorchReady_Loop_v01 from './body/heavy/Heavy_Act_TorchReady_Loop_v01.js';
import Thin_Act_TorchReady_Loop_v01 from './body/thin/Thin_Act_TorchReady_Loop_v01.js';
import Heavy_Move_WalkFlashlight_Loop_v01 from './body/heavy/Heavy_Move_WalkFlashlight_Loop_v01.js';
import Thin_Move_WalkFlashlight_Loop_v01 from './body/thin/Thin_Move_WalkFlashlight_Loop_v01.js';
import Child_Idle_Breath_Loop_v01 from './body/child/Child_Idle_Breath_Loop_v01.js';
import Child_Move_Run_Fwd_Loop_v01 from './body/child/Child_Move_Run_Fwd_Loop_v01.js';
import Child_Move_Walk_Fwd_Loop_v01 from './body/child/Child_Move_Walk_Fwd_Loop_v01.js';
import Elder_Idle_Breath_Loop_v01 from './body/elder/Elder_Idle_Breath_Loop_v01.js';
import Elder_Move_Run_Fwd_Loop_v01 from './body/elder/Elder_Move_Run_Fwd_Loop_v01.js';
import Elder_Move_Walk_Fwd_Loop_v01 from './body/elder/Elder_Move_Walk_Fwd_Loop_v01.js';
import Heavy_Idle_Breath_Loop_v01 from './body/heavy/Heavy_Idle_Breath_Loop_v01.js';
import Heavy_Move_Run_Fwd_Loop_v01 from './body/heavy/Heavy_Move_Run_Fwd_Loop_v01.js';
import Heavy_Move_Walk_Fwd_Loop_v01 from './body/heavy/Heavy_Move_Walk_Fwd_Loop_v01.js';
import Thin_Idle_Breath_Loop_v01 from './body/thin/Thin_Idle_Breath_Loop_v01.js';
import Thin_Move_Run_Fwd_Loop_v01 from './body/thin/Thin_Move_Run_Fwd_Loop_v01.js';
import Thin_Move_Walk_Fwd_Loop_v01 from './body/thin/Thin_Move_Walk_Fwd_Loop_v01.js';
import Gest_LookUp_Once_v01 from './shared/extra/Gest_LookUp_Once_v01.js';
import Move_WalkFlashlight_Loop_v01 from './shared/extra/Move_WalkFlashlight_Loop_v01.js';
import Act_DropInTrunk_Once_v01 from './shared/interact/Act_DropInTrunk_Once_v01.js';
import Act_PushBagOutWindow_Once_v01 from './shared/interact/Act_PushBagOutWindow_Once_v01.js';

import Adult_Idle_Sad_Loop_v01 from './body/adult/Adult_Idle_Sad_Loop_v01.js';
import Thin_Idle_Sad_Loop_v01 from './body/thin/Thin_Idle_Sad_Loop_v01.js';
import Heavy_Idle_Sad_Loop_v01 from './body/heavy/Heavy_Idle_Sad_Loop_v01.js';
import Elder_Idle_Sad_Loop_v01 from './body/elder/Elder_Idle_Sad_Loop_v01.js';
import Adult_React_Cry_Loop_v01 from './body/adult/Adult_React_Cry_Loop_v01.js';
import Thin_React_Cry_Loop_v01 from './body/thin/Thin_React_Cry_Loop_v01.js';
import Elder_React_Cry_Loop_v01 from './body/elder/Elder_React_Cry_Loop_v01.js';
import Adult_React_Surprise_Once_v01 from './body/adult/Adult_React_Surprise_Once_v01.js';
import Thin_React_Surprise_Once_v01 from './body/thin/Thin_React_Surprise_Once_v01.js';
import Adult_React_Terrified_Once_v01 from './body/adult/Adult_React_Terrified_Once_v01.js';
import Thin_React_Terrified_Once_v01 from './body/thin/Thin_React_Terrified_Once_v01.js';
import Heavy_React_Terrified_Once_v01 from './body/heavy/Heavy_React_Terrified_Once_v01.js';
import Child_React_Terrified_Once_v01 from './body/child/Child_React_Terrified_Once_v01.js';
import Adult_React_SitDisbelief_Once_v01 from './body/adult/Adult_React_SitDisbelief_Once_v01.js';
import Thin_React_SitDisbelief_Once_v01 from './body/thin/Thin_React_SitDisbelief_Once_v01.js';
import Elder_React_SitDisbelief_Once_v01 from './body/elder/Elder_React_SitDisbelief_Once_v01.js';
import Adult_Gest_Clap_Loop_v01 from './body/adult/Adult_Gest_Clap_Loop_v01.js';
import Child_Gest_Clap_Loop_v01 from './body/child/Child_Gest_Clap_Loop_v01.js';
import Adult_Gest_SitClap_Loop_v01 from './body/adult/Adult_Gest_SitClap_Loop_v01.js';
import Elder_Gest_SitClap_Loop_v01 from './body/elder/Elder_Gest_SitClap_Loop_v01.js';
import Adult_Move_SadWalk_Fwd_Loop_v01 from './body/adult/Adult_Move_SadWalk_Fwd_Loop_v01.js';
import Thin_Move_SadWalk_Fwd_Loop_v01 from './body/thin/Thin_Move_SadWalk_Fwd_Loop_v01.js';
import Heavy_Move_SadWalk_Fwd_Loop_v01 from './body/heavy/Heavy_Move_SadWalk_Fwd_Loop_v01.js';
import Elder_Move_SadWalk_Fwd_Loop_v01 from './body/elder/Elder_Move_SadWalk_Fwd_Loop_v01.js';
import Elder_Move_OldWalk_Fwd_Loop_v01 from './body/elder/Elder_Move_OldWalk_Fwd_Loop_v01.js';
import Elder_Idle_Stooped_Loop_v01 from './body/elder/Elder_Idle_Stooped_Loop_v01.js';
import Adult_Idle_SitFloor_Loop_v01 from './body/adult/Adult_Idle_SitFloor_Loop_v01.js';
import Thin_Idle_SitFloor_Loop_v01 from './body/thin/Thin_Idle_SitFloor_Loop_v01.js';
import Heavy_Idle_SitFloor_Loop_v01 from './body/heavy/Heavy_Idle_SitFloor_Loop_v01.js';
import Elder_Idle_SitFloor_Loop_v01 from './body/elder/Elder_Idle_SitFloor_Loop_v01.js';
import Adult_Gest_SitTalk_Loop_v01 from './body/adult/Adult_Gest_SitTalk_Loop_v01.js';
import Elder_Gest_SitTalk_Loop_v01 from './body/elder/Elder_Gest_SitTalk_Loop_v01.js';
import Adult_Act_Type_Loop_v01 from './body/adult/Adult_Act_Type_Loop_v01.js';
import Thin_Act_Type_Loop_v01 from './body/thin/Thin_Act_Type_Loop_v01.js';
import Adult_Gest_PhoneTalk_Loop_v01 from './body/adult/Adult_Gest_PhoneTalk_Loop_v01.js';
import Thin_Gest_PhoneTalk_Loop_v01 from './body/thin/Thin_Gest_PhoneTalk_Loop_v01.js';
import Adult_Gest_NodYes_Once_v01 from './body/adult/Adult_Gest_NodYes_Once_v01.js';
import Thin_Gest_NodYes_Once_v01 from './body/thin/Thin_Gest_NodYes_Once_v01.js';
import Heavy_Gest_NodYes_Once_v01 from './body/heavy/Heavy_Gest_NodYes_Once_v01.js';
import Elder_Gest_NodYes_Once_v01 from './body/elder/Elder_Gest_NodYes_Once_v01.js';
import Adult_Gest_ShakeNo_Once_v01 from './body/adult/Adult_Gest_ShakeNo_Once_v01.js';
import Heavy_Gest_ShakeNo_Once_v01 from './body/heavy/Heavy_Gest_ShakeNo_Once_v01.js';
import Thin_Gest_ShakeNo_Once_v01 from './body/thin/Thin_Gest_ShakeNo_Once_v01.js';
import Adult_React_Defeated_Once_v01 from './body/adult/Adult_React_Defeated_Once_v01.js';
import Heavy_React_Defeated_Once_v01 from './body/heavy/Heavy_React_Defeated_Once_v01.js';
import Thin_React_Defeated_Once_v01 from './body/thin/Thin_React_Defeated_Once_v01.js';
import Adult_Gest_Yawn_Once_v01 from './body/adult/Adult_Gest_Yawn_Once_v01.js';
import Heavy_Gest_Yawn_Once_v01 from './body/heavy/Heavy_Gest_Yawn_Once_v01.js';
import Elder_Gest_Yawn_Once_v01 from './body/elder/Elder_Gest_Yawn_Once_v01.js';
import Thin_Gest_Yawn_Once_v01 from './body/thin/Thin_Gest_Yawn_Once_v01.js';
import Adult_Move_RunTired_Once_v01 from './body/adult/Adult_Move_RunTired_Once_v01.js';
import Heavy_Move_RunTired_Once_v01 from './body/heavy/Heavy_Move_RunTired_Once_v01.js';
import Elder_Move_RunTired_Once_v01 from './body/elder/Elder_Move_RunTired_Once_v01.js';
import Adult_Idle_Kneel_Loop_v01 from './body/adult/Adult_Idle_Kneel_Loop_v01.js';
import Elder_Idle_Kneel_Loop_v01 from './body/elder/Elder_Idle_Kneel_Loop_v01.js';
import Thin_Idle_Kneel_Loop_v01 from './body/thin/Thin_Idle_Kneel_Loop_v01.js';
import Adult_Gest_Point_Once_v01 from './body/adult/Adult_Gest_Point_Once_v01.js';
import Thin_Gest_Point_Once_v01 from './body/thin/Thin_Gest_Point_Once_v01.js';
import Heavy_Gest_Point_Once_v01 from './body/heavy/Heavy_Gest_Point_Once_v01.js';
export const ALL = [
  Adult_Move_Run_Fwd_Loop_v01,
  Adult_Move_Walk_Fwd_Loop_v01,
  Adult_Move_Sprint_Fwd_Loop_v01,
  Adult_Act_Jump_Once_v01,
  Adult_Idle_Stand_Loop_v01,
  Adult_Idle_LookAround_Loop_v01,
  Adult_Gest_Talk_Loop_v01,
  Adult_Gest_Wave_Loop_v01,
  Adult_Trans_SitDown_Once_v01,
  Adult_Idle_Sit_Loop_v01,
  Adult_Trans_StandUp_Once_v01,
  Adult_Gest_PointSeated_Loop_v01,
  Adult_Act_PickUp_Once_v01,
  Adult_Move_TurnLeft_Once_v01,
  Adult_Trans_LieDown_Once_v01,
  Adult_Idle_Sleep_Loop_v01,
  Adult_Trans_GetUp_Once_v01,
  Adult_Trans_JumpWindow_Once_v01,
  Adult_Act_Phone_Once_v01,
  Adult_Move_CarryBag_Walk_Loop_v01,
  Adult_Move_PushHeavy_Loop_v01,
  Adult_Idle_CarryBag_Loop_v01,
  Adult_Act_PutDown_Once_v01,
  Adult_React_Startle_Once_v01,
  Adult_Gest_LookBack_Once_v01,
  Adult_Act_PistolShoot_Once_v01,
  Adult_Act_TorchReady_Loop_v01,
  Adult_Act_Drive_Loop_v01,
  Adult_Act_HandOver_Once_v01,
  Adult_Act_Consume_Once_v01,
  Adult_Gest_PhoneCall_Loop_v01,
  Adult_Gest_LookBackCarry_Once_v01,
  Heavy_Act_TorchReady_Loop_v01,
  Thin_Act_TorchReady_Loop_v01,
  Heavy_Move_WalkFlashlight_Loop_v01,
  Thin_Move_WalkFlashlight_Loop_v01,
  Child_Idle_Breath_Loop_v01,
  Child_Move_Run_Fwd_Loop_v01,
  Child_Move_Walk_Fwd_Loop_v01,
  Elder_Idle_Breath_Loop_v01,
  Elder_Move_Run_Fwd_Loop_v01,
  Elder_Move_Walk_Fwd_Loop_v01,
  Heavy_Idle_Breath_Loop_v01,
  Heavy_Move_Run_Fwd_Loop_v01,
  Heavy_Move_Walk_Fwd_Loop_v01,
  Thin_Idle_Breath_Loop_v01,
  Thin_Move_Run_Fwd_Loop_v01,
  Thin_Move_Walk_Fwd_Loop_v01,
  Gest_LookUp_Once_v01,
  Move_WalkFlashlight_Loop_v01,
  Act_DropInTrunk_Once_v01,
  Act_PushBagOutWindow_Once_v01,
  Adult_Idle_Sad_Loop_v01,
  Thin_Idle_Sad_Loop_v01,
  Heavy_Idle_Sad_Loop_v01,
  Elder_Idle_Sad_Loop_v01,
  Adult_React_Cry_Loop_v01,
  Thin_React_Cry_Loop_v01,
  Elder_React_Cry_Loop_v01,
  Adult_React_Surprise_Once_v01,
  Thin_React_Surprise_Once_v01,
  Adult_React_Terrified_Once_v01,
  Thin_React_Terrified_Once_v01,
  Heavy_React_Terrified_Once_v01,
  Child_React_Terrified_Once_v01,
  Adult_React_SitDisbelief_Once_v01,
  Thin_React_SitDisbelief_Once_v01,
  Elder_React_SitDisbelief_Once_v01,
  Adult_Gest_Clap_Loop_v01,
  Child_Gest_Clap_Loop_v01,
  Adult_Gest_SitClap_Loop_v01,
  Elder_Gest_SitClap_Loop_v01,
  Adult_Move_SadWalk_Fwd_Loop_v01,
  Thin_Move_SadWalk_Fwd_Loop_v01,
  Heavy_Move_SadWalk_Fwd_Loop_v01,
  Elder_Move_SadWalk_Fwd_Loop_v01,
  Elder_Move_OldWalk_Fwd_Loop_v01,
  Elder_Idle_Stooped_Loop_v01,
  Adult_Idle_SitFloor_Loop_v01,
  Thin_Idle_SitFloor_Loop_v01,
  Heavy_Idle_SitFloor_Loop_v01,
  Elder_Idle_SitFloor_Loop_v01,
  Adult_Gest_SitTalk_Loop_v01,
  Elder_Gest_SitTalk_Loop_v01,
  Adult_Act_Type_Loop_v01,
  Thin_Act_Type_Loop_v01,
  Adult_Gest_PhoneTalk_Loop_v01,
  Thin_Gest_PhoneTalk_Loop_v01,
  Adult_Gest_NodYes_Once_v01,
  Thin_Gest_NodYes_Once_v01,
  Heavy_Gest_NodYes_Once_v01,
  Elder_Gest_NodYes_Once_v01,
  Adult_Gest_ShakeNo_Once_v01,
  Heavy_Gest_ShakeNo_Once_v01,
  Thin_Gest_ShakeNo_Once_v01,
  Adult_React_Defeated_Once_v01,
  Heavy_React_Defeated_Once_v01,
  Thin_React_Defeated_Once_v01,
  Adult_Gest_Yawn_Once_v01,
  Heavy_Gest_Yawn_Once_v01,
  Elder_Gest_Yawn_Once_v01,
  Thin_Gest_Yawn_Once_v01,
  Adult_Move_RunTired_Once_v01,
  Heavy_Move_RunTired_Once_v01,
  Elder_Move_RunTired_Once_v01,
  Adult_Idle_Kneel_Loop_v01,
  Elder_Idle_Kneel_Loop_v01,
  Thin_Idle_Kneel_Loop_v01,
  Adult_Gest_Point_Once_v01,
  Thin_Gest_Point_Once_v01,
  Heavy_Gest_Point_Once_v01,
];
// A clip starts at its own origin: a capture's first frame stands a few cm (an in-place loop) to 1 m off it, and two
// clips chained (each placed where the last one left the actor) jumped the root by that offset. Every clip is moved so
// its first key's root is at x 0 (an in-place one) and y 0 (the travelling ones too: their x starts the first step), its
// set marks with it.
function zeroed(C) {
  const k0 = C.advance ? C.intro[0] : C.keys[0], o = [C.advance ? 0 : k0.pos?.[0] || 0, k0.pos?.[1] || 0];
  if (Math.hypot(...o) < 1e-9) return C;
  const mv = p => (p ? [p[0] - o[0], p[1] - o[1], ...p.slice(2)] : p);
  for (const k of [...C.keys, ...(C.intro || []), ...(C.outro || [])]) {
    if (k.pos) k.pos = mv(k.pos);
    for (const leg of ['legL', 'legR']) if (k[leg]?.footW) k[leg] = { ...k[leg], footW: mv(k[leg].footW) };
  }
  if (C.needs?.marks) C.needs = { ...C.needs, marks: C.needs.marks.map(m => ({ ...m, ...(m.at ? { at: mv(m.at) } : {}), ...(m.to ? { to: mv(m.to) } : {}) })) };
  return C;
}
export const CLIPS = {};
for (const c of ALL) (CLIPS[c.clip] ||= {})[zeroed(c).body || '*'] = c;
export const CLIP_NAMES = Object.keys(CLIPS);
// a clip fitted to its set (the clip key's `fit`, e.g. { lip: 0.85 } for a trunk, { sill, top, width } for a window; and
// to the bag it holds, fit.bag, propFit below): a
// clip record with `fit(opts)` makes the fitted version (checked by tools/gates/motionlib.mjs on every fit in its `fitChecks`)
const FITTED = new Map();
export function fitClip(C, fit) {
  if (!fit) return C;
  if (!C.fit) throw new Error(`motion-lib: clip "${C.clip}" takes no fit (${JSON.stringify(fit)})`);
  const id = `${C.name}|${JSON.stringify(fit)}`;
  if (!FITTED.has(id)) FITTED.set(id, zeroed(C.fit(fit)));
  return FITTED.get(id);
}
// The size of a prop a clip fits itself to (a record's `fitProps`: ['bag']): the clip key's own `fit.bag` ({ w, l, h, grip },
// metres), else the prop the key swaps in, read off the built prop: its userData.size [w, h, l] and grip (motion-lib/props.js),
// else its meshes' box (grip measured from the box's bottom). A prop built empty (its mesh comes later, with the film's set)
// has no box: null, and propFit fails the clip rather than play the kit bag's keys with it.
const SIZES = new Map();
export function propSize(kind) {
  if (SIZES.has(kind)) return SIZES.get(kind);
  if (!BUILD[kind]) return null;
  const g = BUILD[kind](), U = g.userData || {}, gy = U.grip?.[1];
  let d = null;
  if (U.size) d = { w: U.size[0], h: U.size[1], l: U.size[2], ...(gy != null ? { grip: gy } : {}) };
  else { const b = new THREE.Box3().setFromObject(g); if (!b.isEmpty()) { const v = b.getSize(new THREE.Vector3()); d = { w: v.x, h: v.y, l: v.z, ...(gy != null ? { grip: gy - b.min.y } : {}) }; } }
  if (d) SIZES.set(kind, d);
  return d;
}
const r3 = v => Math.round(v * 1000) / 1000;
export function propFit(C, k) {
  if (!C.fitProps) return k.fit || null;
  const fit = { ...(k.fit || {}) };
  for (const kind of C.fitProps) { const to = k.swap?.[kind];
    if (fit[kind] || !to) continue;
    const d = propSize(to);
    if (!d) throw new Error(`motion-lib: clip "${C.clip}" fits itself to its ${kind}, but the swapped prop "${to}" has no size: its builder gives no userData.size and no meshes yet. Give its builder userData.size [w, h, l] in metres, as motion-lib/props.js bagData does, or give the clip key fit.${kind}`);
    fit[kind] = Object.fromEntries(Object.entries(d).map(([n, v]) => [n, r3(v)])); }
  return Object.keys(fit).length ? fit : null;
}
export function getClip(name, body = 'adult', fit = null) {
  const e = CLIPS[name] || CLIPS[name.replace(/^(Adult|Heavy|Thin|Child|Elder)_/, '').replace(/_v\d+$/, '')];
  if (!e) throw new Error(`motion-lib: no clip "${name}" (${CLIP_NAMES.join(', ')})`);
  const c = e[body] || e['*'];
  if (!c) throw new Error(`motion-lib: clip "${name}" has no ${body} version (bodies: ${Object.keys(e).join(', ')})`);
  if (!BODIES[body]) throw new Error(`motion-lib: unknown body "${body}" (${Object.keys(BODIES).join(', ')})`);
  return fitClip(c, fit);
}

const PASS = new Set(['expr', 'look', 'ease', 'antic', 'cycle']);         // fields of the clip key that go onto its first key
const clone = v => (Array.isArray(v) ? v.slice() : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v);
// one clip key -> its keys in the world: { keys, pos, yaw } (pos, yaw: where the actor ends)
export function placeClip(k, cur = { pos: [0, 0], yaw: 0 }) {
  const body = k.body || 'adult', C = getClip(k.clip, body, propFit(getClip(k.clip, body), k)), sc = C.body ? 1 : (BODIES[body].spec.scale ?? 1);
  // (k.pos[2]: the height of a surface the clip plays on, a bed or a stage: every key is lifted onto it and held up by
  // it, motion.js `support`)
  const O = k.pos ? [k.pos[0], k.pos[1]] : cur.pos.slice(0, 2), Hs = k.pos?.[2] ?? cur.support ?? 0;
  let H = k.yaw ?? cur.yaw, D = 0;
  if (k.to) { const dx = k.to[0] - O[0], dy = k.to[1] - O[1]; D = Math.hypot(dx, dy); if (D > 1e-6) H = 90 + Math.atan2(dy, dx) * 180 / Math.PI; }
  const th = (H - 90) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
  const ends = !!C.advance && (k.to != null || k.stop), lead = ends ? C.introTravel + C.outroTravel : 0;
  let n = Math.max(1, k.times ?? 1), fit = 1;
  if (C.advance && k.to != null) { n = k.times ?? Math.max(1, Math.round((D - lead) / C.advance)); fit = D / (lead + n * C.advance); }
  // rounded to 1 µm: a planted foot is the same number on every key (a float wobble reads as motion to the spline's tangents)
  const r6 = v => Math.round(v * 1e6) / 1e6, X = (x, y) => { x *= fit * sc; y *= sc; return [r6(O[0] + x * c - y * s), r6(O[1] + x * s + y * c)]; };
  const out = [];
  const put = (ck, dx, df) => {
    const o = clone(ck); o.f = k.f + df + ck.f;
    if (o.pos) { const [a, b] = X(o.pos[0] + dx, o.pos[1]); o.pos = [a, b, (o.pos[2] || 0) * sc + Hs]; }
    o.support = Hs;
    o.yaw = (ck.yaw ?? 90) + (H - 90);
    for (const leg of ['legL', 'legR']) if (o[leg]?.footW) { const w = o[leg].footW, [a, b] = X(w[0] + dx, w[1]); o[leg].footW = [a, b, (w[2] || 0) * sc]; }
    for (const [from, to] of Object.entries(k.swap || {})) for (const n2 of Object.keys(o)) { const m = /^x_hp([LRBH])_(\w+)$/.exec(n2); if (m && m[2] === from) { o[`x_hp${m[1]}_${to}`] = o[n2]; delete o[n2]; } }
    out.push(o);
  };
  // a loop in place plays `times` cycles. A captured one (C.captured: [a, b], the capture between the blends from and back
  // to its standard pose) blends in once, plays the capture `times` over (its last frame is its first: the seam) and blends
  // out once: a phone call stays at the ear, a sleeper stays curled. A made one repeats whole (its last key is its first).
  const cyc = C.loop && !C.advance && Array.isArray(C.captured) && typeof C.captured[0] === 'number' ? C.captured : null;
  if (cyc && n > 1) { const [a, b] = cyc, L = b - a;
    for (const ck of C.keys) if (ck.f <= b) put(ck, 0, 0);
    for (let i = 1; i < n; i++) for (const ck of C.keys) if (ck.f > a && ck.f <= b) put(ck, 0, i * L);
    for (const ck of C.keys) if (ck.f > b) put(ck, 0, (n - 1) * L); }
  else if (!C.advance) for (let i = 0; i < (C.loop ? n : 1); i++) for (const ck of C.keys) { if (i > 0 && ck.f === 0) continue; put(ck, 0, i * C.frames); }
  else {
    const shift = ends ? C.introTravel : 0, f0 = ends ? C.introFrames : 0;
    if (ends) for (const ck of C.intro) put(ck, shift, 0);
    for (let i = 0; i < n; i++) for (const ck of C.keys) if (!(i > 0 && ck.f === 0)) put(ck, shift + i * C.advance, f0 + i * C.frames);
    if (ends) for (const ck of C.outro) put(ck, shift + (n - 1) * C.advance, f0 + n * C.frames);
  }
  for (const [n2, v] of Object.entries(k)) if (PASS.has(n2)) out[0][n2] = v;
  // a clip written against another standard pose than the one it opens on names it (rest): the dose pushes from that
  if (C.rest) out[0].rest = BASES[C.rest](body, 0);
  const last = out[out.length - 1];
  // the props this clip key holds, each one object for the key's whole span (engine/propobj.js): its id (side + kind, after
  // the swap), its weight channel and the clip's `toss` (m/s, clip space: forward, left, up) turned with the heading
  const props = [...new Set(out.flatMap(o => Object.keys(o).filter(n => /^x_hp[LRB]_\w+$/.test(n))))].map(key => {
    const kind = key.slice(6), from = Object.entries(k.swap || {}).find(([, to]) => to === kind)?.[0] ?? kind, t = C.toss?.[from];
    return { id: key[4] + kind, key, f0: out[0].f, f1: last.f, ...(t ? { toss: [(t[0] * c - t[1] * s) * sc, (t[0] * s + t[1] * c) * sc, (t[2] || 0) * sc] } : {}) };
  });
  out.props = props;
  // and on the keys themselves (every key of the clip key carries its spans, frames counted from that key): a film that
  // copies, maps, spreads, re-sorts, trims or drops keys keeps them while one key is left (play.js .map()ped the array
  // and lost out.props, so a prop let go vanished; ep01 round 3 carried them in an Array subclass). engine/motion.js
  // compileTrack reads them from there, one span each
  if (props.length) for (const o of out) o.clipProps = props.map(({ f0, f1, ...p }) => ({ ...p, df0: f0 - o.f, df1: f1 - o.f }));
  return { keys: out, pos: last.pos ? last.pos.slice(0, 2) : O, yaw: last.yaw ?? H, support: Hs, clip: C, n, fit, props };
}
// a track's keys with every clip key expanded (keys sorted by f; plain keys pass through)
export function expandClips(keys, base = {}) {
  if (!keys.some(k => k.clip)) return keys;
  const out = []; let cur = { pos: (base.pos || [0, 0]).slice(0, 2), yaw: base.yaw ?? 0 };
  out.props = [];
  for (const k of [...keys].sort((a, b) => a.f - b.f)) {
    if (!k.clip) { out.push(k); if (Array.isArray(k.pos)) cur = { ...cur, pos: k.pos.slice(0, 2) }; if (typeof k.yaw === 'number') cur = { ...cur, yaw: k.yaw }; continue; }
    const r = placeClip(k, cur); out.push(...r.keys); out.props.push(...r.props); cur = { pos: r.pos, yaw: r.yaw, support: r.support };
  }
  return out;
}
