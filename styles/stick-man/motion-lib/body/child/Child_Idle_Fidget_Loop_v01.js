// Child_Idle_Fidget_Loop: a child (big head, short legs, 25 kg) standing and unable to wait: it turns at the waist to look about,
// the loose arms swinging after the chest, and shifts its weight on an uneven beat. A waiting child with no action of its own.
import { stand, K, merge } from '../../base.js';
import { BODIES } from '../../bodies.js';
import { follow } from '../../ref/perform.js';

const { breath: Bd, perform: P, life } = BODIES.child, [TURN, BEAT] = P.fidget, [SIDE, FORE, UNEVEN] = P.weight;
// nine breaths and five turns: the shortest length both divide
const N = 270, at = fn => Array.from({ length: N + 1 }, (_, i) => fn(i)), wave = (i, laps, ph = 0) => Math.sin(2 * Math.PI * (laps * i / N + ph));
const turns = N / BEAT, breaths = N / Bd.per, third = breaths / 3;
// no two of the five turns alike: they grow and shrink over the loop, and each leans to one side
const drive = at(i => 1.2 * TURN * life.trunk * (wave(i, turns) * (0.75 + 0.25 * wave(i, 1, 0.1)) + 0.35 * wave(i, 2, 0.3)));
const chest = follow(drive, P.trunk, true), arms = follow(chest.map(v => -v), P.arms, true), head = follow(chest, P.head, true);
const shift = at(i => SIDE * Bd.shift * (wave(i, third, 0.08) + 0.4 * wave(i, Math.round(UNEVEN * third), 0.3)) / 1.4);
const S0 = stand('child');
const pose = i => { const a = arms[i] * life.arm, b = Bd.amp * wave(i, breaths), k = shift[i] / Bd.shift;
  return merge(S0, { hip: { x: shift[i] }, pelvis: { roll: 2 * k },
    spine: { twist: chest[i], side: -2 * k, bend: S0.spine.bend + b + FORE * wave(i, 5, 0.2) },
    // the look leads the turn and comes back over it
    neck: { turn: 0.5 * head[i] + TURN * wave(i, 2, 0.55), tilt: 1.5 * k + 0.1 * head[i], nod: S0.neck.nod - 0.4 * b },
    armL: { swing: S0.armL.swing + a, raise: S0.armL.raise + 0.3 * Math.abs(a), elbow: S0.armL.elbow + 0.3 * Math.max(0, a) },
    armR: { swing: S0.armR.swing - a, raise: S0.armR.raise + 0.3 * Math.abs(a), elbow: S0.armR.elbow + 0.3 * Math.max(0, -a) } }); };

export default { name: 'Child_Idle_Fidget_Loop', clip: 'Idle_Fidget_Loop', body: 'child', group: 'Idle', loop: true, frames: N, base: 'STAND', style: 'kaiships', perform: true,
  needs: { props: [], hands: null }, keys: Array.from({ length: N / 3 + 1 }, (_, j) => K(3 * j, pose(3 * j % N), { ease: 'flow' })) };
