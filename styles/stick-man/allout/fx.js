// Allout effects: one MAKE kind that drives a set prop's own animation from keyed values, so every moving story prop
// (bugs, pills, a stamp, a calendar, a breath cloud) is a pure function of the frame. The prop gets
// `userData.anim(f, v)` from its set; v(key, default) reads keys set by beats ({ who, do: 'set', key, to, dur }).
//   make: { bugs: { kind: 'ao_anim', prop: 'bugs' } }   beats: { ...at('l11', 'bug'), who: 'bugs', do: 'set', key: 'grow', to: 1, dur: 20 }
import { MAKE } from '../engine/verbs_fx.js';

MAKE.ao_anim = (stage, o, ctx) => {
  const p = ctx.props[o.prop];
  if (!p) throw new Error(`ao_anim: no prop "${o.prop}" in this set`);
  return { obj: p, apply: (v, f) => p.userData.anim?.(f, v) };
};

// ao_follow: the prop rides an anchor every frame ({ head: 'kip', up, fwd, side } or a place), then runs its own anim.
//   make: { medal: { kind: 'ao_follow', prop: 'medal', at: { head: 'kip', up: -0.62, fwd: 0.32 } } }
MAKE.ao_follow = (stage, o, ctx) => {
  const p = ctx.props[o.prop];
  if (!p) throw new Error(`ao_follow: no prop "${o.prop}" in this set`);
  return { obj: p, apply: (v, f, env) => { const q = env.at(o.at); p.position.set(q[0], q[2], -q[1]); p.userData.anim?.(f, v); } };
};
