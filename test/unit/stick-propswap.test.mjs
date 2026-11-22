// The motion library's gate plays a clip as a film's key does: with the prop the film swaps in and where the film stands
// it, beside its set pieces (Hot Money ep01 SH245: the kit gate said Gest_PhoneCall_Loop grip 0 cm PASS, the film's render
// had the hand 40 cm off its target and the handset 15.7 cm in the head).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAll, rigClip, keyed, GRIP_CM, PROP_CM } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { getClip } from '../../styles/stick-man/motion-lib/index.js';
import { propSwap } from '../../styles/stick-man/motion-lib/props.js';

// the film's desk handset as built (films/hm-ep01/set/cast.js handset: 0.29 x 0.07 x 0.05 m at 1.4x, long side along x,
// the fist at its middle) and turned the kit phone's way (long side up)
const ACROSS = { mode: 'up', grip: [0, 0, 0], size: [0.406, 0.098, 0.07] }, UP = { mode: 'up', grip: [0, 0, 0], size: [0.098, 0.406, 0.07] };
// where SH245 stands the teller: 0.30 m behind the bank counter's edge, turned -50 deg (its counter and glass, Blender m)
const SH245 = { pos: [163.6, 0.75], yaw: -50, collide: [{ name: 'counter', lo: [161.9, -0.45, 0], hi: [165.3, 0.45, 1.12] }, { name: 'counter-glass', lo: [162, 0.05, 1.12], hi: [165.2, 0.09, 2.2] }] };
const C = getClip('Gest_PhoneCall_Loop');
const rig = (chk, o = {}) => rigClip(keyed(C, chk), undefined, { obstacles: chk.collide || [], ...o });

test('swap: a film prop held across the face fails the gate (the hand off its target, the prop in the head); turned up it passes', async () => {
  const kit = await rig({}), across = await rig({ swap: { phone: ACROSS } }), across0 = await rig({ swap: { phone: ACROSS } }, { phys: false }), up = await rig({ swap: { phone: UP } });
  assert.equal(kit.grip, 0);
  assert.ok(across.grip > GRIP_CM, `across: the hand ${across.grip} cm off its target`);
  assert.ok(across0.prop > PROP_CM, `across, physics off: the handset ${across0.prop} cm in the body`);
  assert.ok(up.grip <= GRIP_CM && up.prop <= PROP_CM, `up: grip ${up.grip} cm, prop ${up.prop} cm`);
});

test('swap: the gate names a swapped prop that lies along another axis than the kit prop it stands in for', async () => {
  const [row] = (await checkAll({ only: 'Gest_PhoneCall_Loop', check: { swap: { phone: ACROSS } } })).filter(r => /swap/.test(r.name) && /406,0.098/.test(r.name));
  assert.ok(row.fails.some(f => /^contract: .* longest along its x .* kit phone .* along its y/.test(f)), row.fails.join('\n'));
  assert.ok(row.fails.some(f => /^rig: a gripping hand is/.test(f)), row.fails.join('\n'));
});

test('swap: every propChecks row passes, and the kit check of a clip runs it (PhoneCall with the desk handset turned up)', async () => {
  const rows = await checkAll({ only: 'Gest_PhoneCall_Loop' });
  assert.deepEqual(rows.map(r => r.name), ['Adult_Gest_PhoneCall_Loop', `Adult_Gest_PhoneCall_Loop fit ${JSON.stringify({ swap: { phone: UP } })}`]);
  assert.deepEqual(rows.flatMap(r => r.fails), []);
});

test('key: the clip where the film stands it, beside its set pieces: the reach to the ear stops on SH245\'s counter', async () => {
  const open = await rig({ pos: SH245.pos, yaw: SH245.yaw }), counter = await rig(SH245);
  assert.equal(open.grip, 0);
  assert.ok(counter.grip > GRIP_CM, `beside the counter the hand is ${counter.grip} cm off its target`);
  assert.ok(counter.over.some(f => f >= 190) && counter.over.some(f => f <= 10), `frames over: ${[...new Set(counter.over)]}`);
});

test('swap: a prop name nothing registered fails before the rig plays it', () => {
  assert.throws(() => propSwap({ phone: 'handset' }), /no prop "handset" to swap for phone/);
  assert.match(propSwap({ phone: UP }).phone, /^prop_up_98x406x70_0x0x0$/);
});
