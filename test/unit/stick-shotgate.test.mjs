// The measured shot gate (styles/stick-man/tools/shotfaults.mjs) on synthetic __dbg rows, one case per fault Kai named on
// Hot Money ep01 r2 v002 (16/11): the faults are found in a film directed one camera shot per frame (motion.cut on every
// frame), and a cut, a walk, a fall or an entrance through the frame edge is not a fault.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shotFaults, bySecond, cuts, G_FRAME } from '../../styles/stick-man/tools/shotfaults.mjs';

const W = 404, H = 720;
const row = (f, o = {}) => ({ f, act: 'a', mix: null, set: 's', motion: { cut: true, feet: {} }, camera: { pos: [0, -5, 1.5], target: [0, 0, 1], fov: 60, lens: 24 },
  actors: { you: { inFrame: true, head: [180, 200, 220, 240], headW: [0, 0, 1.7], pos: [0, 0, 0], feet: { L: [-0.1, 0, 0], R: [0.1, 0, 0] }, ...o.you } },
  track: o.props || {}, ...o.extra });
const bag = (c, o = {}) => ({ shown: true, held: false, on: 'in', box: [150, 300, 250, 400], size: 0.6, c, ...o });
const kinds = fs => fs.map(x => x.kind);

test('a film directed one camera shot per frame is still judged frame to frame; a camera jump or an act change is a cut', () => {
  const rows = Array.from({ length: 6 }, (_, i) => row(i));
  assert.deepEqual(cuts(rows), [true, false, false, false, false, false], 'motion.cut on every frame is not a cut');
  rows[3].camera = { ...rows[3].camera, pos: [4, -5, 1.5] }; rows[5].act = 'b';
  assert.deepEqual(cuts(rows), [true, false, false, true, false, true]);
});

test('a bag that appears or vanishes in one frame inside the shot is a fault; at a cut, through the frame edge or from behind a cover it is not', () => {
  const pop = [row(0), row(1), row(2, { props: { 'you:Rduffel': bag([0, 0, 0.5], { held: true }) } }), row(3, { props: { 'you:Rduffel': bag([0, 0, 0.5], { held: true }) } }), row(4)];
  assert.deepEqual(kinds(shotFaults(pop, { W, H })), ['prop appears', 'prop vanishes']);
  const edge = [row(0, { props: { b: bag([3, 0, 0.5], { on: 'off', box: [420, 300, 520, 400] }) } }), row(1, { props: { b: bag([2.9, 0, 0.5], { box: [395, 300, 495, 400] }) } })];
  const cover = [row(0, { props: { b: bag([0, 0, 0.5], { on: 'occluded' }) } }), row(1, { props: { b: bag([0, 0, 0.5]) } })];
  const atCut = [row(0), row(1, { props: { b: bag([0, 0, 0.5]) } })]; atCut[1].edit = true;
  for (const rs of [edge, cover, atCut]) assert.deepEqual(shotFaults(rs, { W, H }), []);
});

test('a bag that jumps, or changes size in one frame, is a fault; one carried at a walk is not', () => {
  const walk = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0.05 * i, 0, 0.6], { held: true }) } }));
  assert.deepEqual(shotFaults(walk, { W, H }), []);
  walk[5].track.b = bag([1.2, 0, 0.6], { held: true });
  walk[7].track.b = bag([0.35, 0, 0.6], { held: true, size: 0.4 });
  assert.deepEqual(kinds(shotFaults(walk, { W, H })), ['prop jumps', 'prop resizes'], 'the jump back is part of the same event');
});

test('a carried bag that changes size across a cut, and a dropped bag gone when the next shot looks at its spot, break continuity', () => {
  const a = row(0, { props: { 'you:Bhugbag': bag([0, 0, 0.8], { held: true, size: 0.65 }) } }), b = row(1, { props: { 'you:Rbag': bag([0.3, 0, 0.8], { held: true, size: 0.93 }) } });
  b.edit = true;
  assert.deepEqual(kinds(shotFaults([a, b], { W, H })), ['prop changes at cut']);
  const c = row(0, { props: { b: bag([0, 0, 0.7]) } }), d = row(1, { props: {} }); d.edit = true;
  assert.deepEqual(kinds(shotFaults([c, d], { W, H })), ['prop gone after cut']);
  d.camera = { pos: [0, 5, 1.5], target: [0, 10, 1], fov: 60, lens: 24 };
  assert.deepEqual(shotFaults([c, d], { W, H }), [], 'the next shot looks away from the spot');
});

test('a bag let go that falls under gravity is fine; one that rises or sinks at a steady speed floats', () => {
  const fall = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0, 0, 1.2 - 0.5 * G_FRAME * i * i], { held: i < 1 }) } }));
  assert.deepEqual(shotFaults(fall, { W, H }), []);
  const drift = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0, 0, 0.9 + 0.02 * i], { held: i < 1 }) } }));
  assert.deepEqual(kinds(shotFaults(drift, { W, H })), ['prop floats']);
  const carried = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0, 0, 0.9 + 0.02 * i]) } }));
  assert.deepEqual(shotFaults(carried, { W, H }), [], 'never let go: the film moves it, no hand released it');
});

test('a body that travels with both feet moving along skates; a walk with a still stance foot does not', () => {
  const step = i => (Math.floor(i / 4) % 2 ? { L: [0.05 * i, 0, 0], R: [0.05 * 4 * Math.floor(i / 4), 0, 0] } : { L: [0.05 * 4 * Math.floor(i / 4), 0, 0], R: [0.05 * i, 0, 0] });
  const walk = Array.from({ length: 12 }, (_, i) => row(i, { you: { pos: [0.025 * i, 0, 0], feet: step(i) } }));
  assert.deepEqual(shotFaults(walk, { W, H }), []);
  const drag = Array.from({ length: 12 }, (_, i) => row(i, { you: { pos: [0.1 * i, 0, 0], feet: { L: [0.1 * i - 0.1, 0, 0], R: [0.1 * i + 0.1, 0, 0] } } }));
  assert.deepEqual(kinds(shotFaults(drag, { W, H })), ['figure skates']);
});

test('a figure that pops in inside the frame, or passes through the set, is a fault; one who walks in through the edge is not', () => {
  const out = { inFrame: false };
  const pop = [row(0, { you: out }), row(1)];
  assert.deepEqual(kinds(shotFaults(pop, { W, H })), ['figure appears']);
  const enter = [row(0, { you: out }), row(1, { you: { head: [0, 200, 30, 240] } })];
  assert.deepEqual(shotFaults(enter, { W, H }), []);
  const through = [row(0), row(1, { extra: { cross: [{ what: 'you.pelvis', through: 'truck_bed', d: 0.12, at: [0, 0, 0.8] }] } })];
  assert.deepEqual(kinds(shotFaults(through, { W, H })), ['body passes through']);
});

test('faults group by second; a second blocks only when the camera sees a fault in it', () => {
  const s = bySecond([{ F: 31, vis: 'occluded' }, { F: 45, vis: 'in' }, { F: 61, vis: 'off' }]);
  assert.deepEqual(s.map(x => [x.s, x.block]), [[1, true], [2, false]]);
});
