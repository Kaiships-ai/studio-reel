// The lead's acting keys in a reel.js (make-reel-stick-man REEL_DATA.md "Motion v2 keys"): blocking with hold(), then
// polish. Films made by tools/new_film.mjs and examples/pilot-a import these, so a change to the recipe lands in one place.
export const STAND = { bob: 0, sq: 0, spine: { bend: 0, side: 0, twist: 0 }, neck: { nod: 0, tilt: 0, turn: 0 }, pelvis: { pitch: 0, roll: 0, yaw: 0 },
  armL: { raise: 12, swing: 0, elbow: 15, roll: 0 }, armR: { raise: 12, swing: 0, elbow: 15, roll: 0 },
  legL: { foot: [-0.22, 0.022, 0], pitch: 0, knee: [-0.15, 0, 1] }, legR: { foot: [0.22, 0.022, 0], pitch: 0, knee: [0.15, 0, 1] } };
// a moving hold: every held pose breathes (chest and head drift) unless the key sets its own cycle
export const BREATH = { 'spine.bend': [1.5, 40], 'neck.tilt': [1.5, 53, 1] };
export const hold = (f, extra) => ({ f, pose: STAND, cycle: BREATH, ...extra, ease: 'snap' });
// ?blocking=1 plays the approved blocking for comparison
export const BLOCKING = new URLSearchParams(globalThis.location?.search || '').get('blocking') === '1';
const T_MOVE = { default: 7, stroke: 4 };
// 3.4 POLISH: the blocking keys stay the poses; a key on a cut stays a snap (no in-between across a cut), every other key
// holds its pose until T frames before the next one and moves on the kaiships dose (slow in/out, arcs, follow-through
// from engine/motion.js); antic on the keys that need a wind-up.
export const polishAt = cuts => function polish(keys) {
  if (BLOCKING) return keys;
  return keys.map((k, i) => {
    const nx = keys[i + 1], cut = cuts.includes(k.f), sameShot = nx && !cuts.includes(nx.f);
    const T = nx?.t ?? (k.stroke ? T_MOVE.stroke : T_MOVE.default);
    const { stroke, antic, t, ...rest } = k;
    return { ...rest, ease: cut ? 'snap' : (k.flow ? 'flow' : 'slow'), ...(antic ? { antic } : {}), ...(sameShot && nx.f - k.f > T + 2 ? { hold: nx.f - k.f - T } : {}) };
  });
};
