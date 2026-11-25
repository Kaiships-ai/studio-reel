// Kneeling on both knees, breathing, the weight going from knee to knee, a slow look down and up.
import { floorClip } from '../base.js';
import { act } from './act.js';
import './floor.js';

// the capture is near a statue: the breath and the weight a living body has, big enough to be seen on a figure half the frame high
// (bodylife.mjs STILL_CM): whole beats of the captured loop, so it closes on itself, nought at its ends, where it meets KNEEL
const BREATHS = 2, BREATH = 3.5, SHIFT = 0.055, LEAN = 4, LOOK = 9, TURN = 4;
export default act({ clip: 'Idle_Kneel_Loop', loop: true, base: 'KNEEL' }, body => {
  const M = floorClip('KNEEL', body), [a, b] = M.captured, TAU = 2 * Math.PI;
  return { ...M, keys: M.keys.map(k => {
    if (k.f <= a || k.f >= b) return k;
    const t = (k.f - a) / (b - a), shift = Math.sin(TAU * t), breath = Math.sin(TAU * BREATHS * t), look = 0.5 - 0.5 * Math.cos(TAU * t);
    return { ...k, hip: { ...k.hip, x: (k.hip?.x ?? 0) + SHIFT * shift },
      spine: { ...k.spine, bend: k.spine.bend + BREATH * breath, side: k.spine.side + LEAN * shift },
      neck: { ...k.neck, nod: k.neck.nod - 0.4 * BREATH * breath + LOOK * look, turn: k.neck.turn + TURN * Math.sin(2 * TAU * t), tilt: k.neck.tilt - 0.5 * LEAN * shift } };
  }) };
});
