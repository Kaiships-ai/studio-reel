// One action, performed by whichever body plays it: the clip record from an action's recipe (acts/<clip>.js). The body's own
// way comes from bodies.js `life` through base.js ownClip / ownGait; a recipe only says what the action needs (the span of the
// capture, what the hands must meet). body/<body>/ has one file a body, the library's naming.
export const act = ({ clip, loop, base = 'STAND', end = base, needs = {} }, make) => body => {
  const M = make(body), pre = body[0].toUpperCase() + body.slice(1);
  const R = { name: `${pre}_${clip}`, clip, body, group: clip.split('_')[0], loop, frames: M.frames, base, style: 'kaiships' };
  if (M.advance) return { ...R, needs: { props: [], hands: null }, ...M };
  return { ...R, end, needs: { props: [], hands: null, marks: M.marks, ...needs }, keys: M.keys, captured: M.captured, rest: M.rest };
};
export const STOOP = { elder: 1 };            // a standing elder stays stooped (bodies.js posture) over a capture of an upright actor
export const SEATED_STOOP = { elder: 0.5 };
export const ARM_OUT = { heavy: 0.5 };        // the heavy arms held out round the belly
export const own = body => ({ stoop: STOOP[body] ?? 0, armOut: ARM_OUT[body] ?? 0 });
export const seated = body => ({ base: 'SIT', end: 'SIT', seated: true, seat: true, bones: true, stoop: SEATED_STOOP[body] ?? 0, armOut: ARM_OUT[body] ?? 0 });
