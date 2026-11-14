// The motion library: (clip name, body) -> clip, and the expansion of a motion v2 anim key into the clip's keys.
//   anim key  { f, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to?: [x, y], times?: n, stop?, pos?, yaw?, swap?, expr?, look?, ease? }
//   clip      { name, clip, body?, group, loop, frames, base, end?, style, needs: { props, hands, marks? }, keys,
//               loops that travel: advance, intro, introFrames, introTravel, outro, outroTravel }
// A clip is written in clip space (base.js): the actor at the origin facing +x. Expansion moves it to the actor (the
// key's pos, else where the keys before it left the actor) and turns it to the key's heading (toward `to`, else the key's
// yaw, else the current one). A travelling loop with `to` starts with its first step from the standard pose, repeats
// to cover the distance (its strides stretched to land exactly, `times` fixes the count) and ends with a closing step;
// `stop: true` does the same without `to`. A shared clip played on another body scales its metres with that body's size.
// The README in this folder has the rules; docs/MOTION-LIB.md the catalogue.
import { BODIES } from './bodies.js';
import Adult_Idle_Breath_Loop_v01 from './body/adult/Adult_Idle_Breath_Loop_v01.js';
import Adult_Idle_Frozen_Loop_v01 from './body/adult/Adult_Idle_Frozen_Loop_v01.js';
import Adult_Idle_Tired_Loop_v01 from './body/adult/Adult_Idle_Tired_Loop_v01.js';
import Adult_Move_CarryHeavy_Run_Loop_v01 from './body/adult/Adult_Move_CarryHeavy_Run_Loop_v01.js';
import Adult_Move_CarryHeavy_Walk_Loop_v01 from './body/adult/Adult_Move_CarryHeavy_Walk_Loop_v01.js';
import Adult_Move_Run_Fwd_Loop_v01 from './body/adult/Adult_Move_Run_Fwd_Loop_v01.js';
import Adult_Move_Walk_Fwd_Loop_v01 from './body/adult/Adult_Move_Walk_Fwd_Loop_v01.js';
import Adult_Move_Sprint_Fwd_Loop_v01 from './body/adult/Adult_Move_Sprint_Fwd_Loop_v01.js';
import Adult_Act_Jump_Once_v01 from './body/adult/Adult_Act_Jump_Once_v01.js';
import Adult_Idle_Stand_Loop_v01 from './body/adult/Adult_Idle_Stand_Loop_v01.js';
import Adult_Idle_LookAround_Loop_v01 from './body/adult/Adult_Idle_LookAround_Loop_v01.js';
import Adult_Gest_Talk_Loop_v01 from './body/adult/Adult_Gest_Talk_Loop_v01.js';
import Adult_Gest_Point_Loop_v01 from './body/adult/Adult_Gest_Point_Loop_v01.js';
import Adult_Gest_Wave_Loop_v01 from './body/adult/Adult_Gest_Wave_Loop_v01.js';
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
import Act_Phone_Once_v01 from './shared/extra/Act_Phone_Once_v01.js';
import Gest_LookUp_Once_v01 from './shared/extra/Gest_LookUp_Once_v01.js';
import Gest_RaiseGun_Once_v01 from './shared/extra/Gest_RaiseGun_Once_v01.js';
import Move_WalkFlashlight_Loop_v01 from './shared/extra/Move_WalkFlashlight_Loop_v01.js';
import Act_DropInTrunk_Once_v01 from './shared/interact/Act_DropInTrunk_Once_v01.js';
import Act_EatBite_Loop_v01 from './shared/interact/Act_EatBite_Loop_v01.js';
import Act_LiftHeavy_Once_v01 from './shared/interact/Act_LiftHeavy_Once_v01.js';
import Act_PushThroughWindow_Once_v01 from './shared/interact/Act_PushThroughWindow_Once_v01.js';
import Act_SlideCash_Once_v01 from './shared/interact/Act_SlideCash_Once_v01.js';
import Act_WearCap_Once_v01 from './shared/interact/Act_WearCap_Once_v01.js';
import React_FreezeInLight_Once_v01 from './shared/react/React_FreezeInLight_Once_v01.js';
import Trans_ClimbWindow_Once_v01 from './shared/transition/Trans_ClimbWindow_Once_v01.js';
import Trans_SitStand_Once_v01 from './shared/transition/Trans_SitStand_Once_v01.js';

export const ALL = [
  Adult_Idle_Breath_Loop_v01,
  Adult_Idle_Frozen_Loop_v01,
  Adult_Idle_Tired_Loop_v01,
  Adult_Move_CarryHeavy_Run_Loop_v01,
  Adult_Move_CarryHeavy_Walk_Loop_v01,
  Adult_Move_Run_Fwd_Loop_v01,
  Adult_Move_Walk_Fwd_Loop_v01,
  Adult_Move_Sprint_Fwd_Loop_v01,
  Adult_Act_Jump_Once_v01,
  Adult_Idle_Stand_Loop_v01,
  Adult_Idle_LookAround_Loop_v01,
  Adult_Gest_Talk_Loop_v01,
  Adult_Gest_Point_Loop_v01,
  Adult_Gest_Wave_Loop_v01,
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
  Act_Phone_Once_v01,
  Gest_LookUp_Once_v01,
  Gest_RaiseGun_Once_v01,
  Move_WalkFlashlight_Loop_v01,
  Act_DropInTrunk_Once_v01,
  Act_EatBite_Loop_v01,
  Act_LiftHeavy_Once_v01,
  Act_PushThroughWindow_Once_v01,
  Act_SlideCash_Once_v01,
  Act_WearCap_Once_v01,
  React_FreezeInLight_Once_v01,
  Trans_ClimbWindow_Once_v01,
  Trans_SitStand_Once_v01,
];
export const CLIPS = {};
for (const c of ALL) (CLIPS[c.clip] ||= {})[c.body || '*'] = c;
export const CLIP_NAMES = Object.keys(CLIPS);
export function getClip(name, body = 'adult') {
  const e = CLIPS[name] || CLIPS[name.replace(/^(Adult|Heavy|Thin|Child|Elder)_/, '').replace(/_v\d+$/, '')];
  if (!e) throw new Error(`motion-lib: no clip "${name}" (${CLIP_NAMES.join(', ')})`);
  const c = e[body] || e['*'];
  if (!c) throw new Error(`motion-lib: clip "${name}" has no ${body} version (bodies: ${Object.keys(e).join(', ')})`);
  if (!BODIES[body]) throw new Error(`motion-lib: unknown body "${body}" (${Object.keys(BODIES).join(', ')})`);
  return c;
}

const PASS = new Set(['expr', 'look', 'ease', 'antic', 'cycle']);         // fields of the clip key that go onto its first key
const clone = v => (Array.isArray(v) ? v.slice() : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v);
// one clip key -> its keys in the world: { keys, pos, yaw } (pos, yaw: where the actor ends)
export function placeClip(k, cur = { pos: [0, 0], yaw: 0 }) {
  const body = k.body || 'adult', C = getClip(k.clip, body), sc = C.body ? 1 : (BODIES[body].spec.scale ?? 1);
  const O = k.pos ? [k.pos[0], k.pos[1]] : cur.pos.slice(0, 2);
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
    if (o.pos) { const [a, b] = X(o.pos[0] + dx, o.pos[1]); o.pos = [a, b, (o.pos[2] || 0) * sc]; }
    o.yaw = (ck.yaw ?? 90) + (H - 90);
    for (const leg of ['legL', 'legR']) if (o[leg]?.footW) { const w = o[leg].footW, [a, b] = X(w[0] + dx, w[1]); o[leg].footW = [a, b, (w[2] || 0) * sc]; }
    for (const [from, to] of Object.entries(k.swap || {})) for (const n2 of Object.keys(o)) { const m = /^x_hp([LRBH])_(\w+)$/.exec(n2); if (m && m[2] === from) { o[`x_hp${m[1]}_${to}`] = o[n2]; delete o[n2]; } }
    out.push(o);
  };
  if (!C.advance) for (const ck of C.keys) put(ck, 0, 0);
  else {
    const shift = ends ? C.introTravel : 0, f0 = ends ? C.introFrames : 0;
    if (ends) for (const ck of C.intro) put(ck, shift, 0);
    for (let i = 0; i < n; i++) for (const ck of C.keys) if (!(i > 0 && ck.f === 0)) put(ck, shift + i * C.advance, f0 + i * C.frames);
    if (ends) for (const ck of C.outro) put(ck, shift + (n - 1) * C.advance, f0 + n * C.frames);
  }
  for (const [n2, v] of Object.entries(k)) if (PASS.has(n2)) out[0][n2] = v;
  const last = out[out.length - 1];
  return { keys: out, pos: last.pos ? last.pos.slice(0, 2) : O, yaw: last.yaw ?? H, clip: C, n, fit };
}
// a track's keys with every clip key expanded (keys sorted by f; plain keys pass through)
export function expandClips(keys, base = {}) {
  if (!keys.some(k => k.clip)) return keys;
  const out = []; let cur = { pos: (base.pos || [0, 0]).slice(0, 2), yaw: base.yaw ?? 0 };
  for (const k of [...keys].sort((a, b) => a.f - b.f)) {
    if (!k.clip) { out.push(k); if (Array.isArray(k.pos)) cur = { ...cur, pos: k.pos.slice(0, 2) }; if (typeof k.yaw === 'number') cur = { ...cur, yaw: k.yaw }; continue; }
    const r = placeClip(k, cur); out.push(...r.keys); cur = { pos: r.pos, yaw: r.yaw };
  }
  return out;
}
