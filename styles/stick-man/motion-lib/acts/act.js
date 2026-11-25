// One action, performed by whichever body plays it: the clip record from an action's recipe (acts/<clip>.js). The body's own
// way comes from bodies.js `life` and `perform` through base.js ownClip / ownGait / floorClip; a recipe only says what the
// action needs (the span of the capture, what the hands must meet). body/<body>/ has one file a body, the library's naming.
// `perform`: the record says its body performs it, so the gate holds it to a hold that never freezes (bodylife.mjs)
export const act = ({ clip, loop, base = 'STAND', end = base, needs = {} }, make) => body => {
  const M = make(body), pre = body[0].toUpperCase() + body.slice(1);
  const R = { name: `${pre}_${clip}`, clip, body, group: clip.split('_')[0], loop, frames: M.frames, base, style: 'kaiships', perform: true };
  if (M.advance) return { ...R, needs: { props: [], hands: null }, ...M };
  return { ...R, end, needs: { props: [], hands: null, marks: M.marks, ...needs }, keys: M.keys, captured: M.captured, rest: M.rest };
};
// seated on a SIT seat (the body's stoop and arms come from bodies.js perform, as standing)
export const seated = () => ({ base: 'SIT', end: 'SIT', seated: true, seat: true, bones: true });
