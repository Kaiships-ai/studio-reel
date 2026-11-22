// Three sample characters for your first reels. Import this file from a reel.js and use them by name in `cast`:
//   import '/styles/stick-man/kit/cast/characters.js';
//   cast: { maya: { spec: 'MAYA', at: 'left', lead: true }, leo: { spec: 'LEO', at: 'right' } }
// Make your own the same way: copy one, change the colours and the hair, give it a new name. A spec takes
// name, shirt (rgb 0..1), hair: [builders from engine/cast.js or kit/cast/extras.js], clothes: [{ vest, strap, tie, bowtie }],
// glasses, girth (body width, 1 = standard). Body types (heavy, thin, child, elder) come from motion-lib/bodies.js bodySpec.
import { SPECS } from '/styles/stick-man/engine/play.js';
import { curls, hairCap, flatCap } from '/styles/stick-man/engine/cast.js';
import { beanie, bun } from '/styles/stick-man/kit/cast/extras.js';
import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js';

// MAYA: curious, quick, the one who asks the question. Coral top, dark bun.
export const MAYA = { name: 'Maya', shirt: [0.95, 0.47, 0.40], hair: [bun([0.14, 0.08, 0.05])], girth: 0.9 };
// LEO: easy-going, a bit too sure of himself. White shirt, red tie, brown curls.
export const LEO = { name: 'Leo', shirt: [0.97, 0.96, 0.93], hair: [curls([0.40, 0.24, 0.12])], clothes: [{ tie: [0.82, 0.18, 0.16] }] };
// SAM: the calm older neighbour who knows how things work. Heavy body, mustard top, flat cap.
export const SAM = bodySpec({ name: 'Sam', shirt: [0.88, 0.66, 0.22], hair: [flatCap([0.30, 0.32, 0.36], [0.80, 0.80, 0.78])], glasses: true }, 'heavy');
// a fourth for crowds and walk-ons
export const ROB = { name: 'Rob', shirt: [0.55, 0.40, 0.70], hair: [beanie([0.20, 0.45, 0.85]), hairCap([0.22, 0.15, 0.10])] };

Object.assign(SPECS, { MAYA, LEO, SAM, ROB });
