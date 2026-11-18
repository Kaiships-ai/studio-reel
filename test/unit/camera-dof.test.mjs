// Lens blur per shot (KIT-DEPTH): a medium shot blurs the set behind the subject like a real lens (focal length squared
// over focus distance), a wide stays readable, a close-up keeps its preset, and a shot that names its own blur keeps it.
// Both camera paths: the shot solver (engine/camera.js) and the hand-directed camera (allout/director.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, lensBlur, LENS_BAND } from '../../styles/stick-man/engine/camera.js';
import { createDirector } from '../../styles/stick-man/allout/director.js';

const ANCHOR = { head: [0, 0, 1.6], top: [0, 0, 1.95], sole: [0, 0, 0], center: [0, 0, 1.0], yaw: 0 };
const A = () => ANCHOR;
const dist = c => Math.hypot(...c.pos.map((x, i) => x - c.focus[i]));
const shot = (kind, opt = {}) => ({ f: 0, kind, subjects: ['you'], opt, push: 0, size0: 0.43, i: 0 });

test('lensBlur grows with focal length, falls with distance, and is capped', () => {
  assert.ok(lensBlur(50, 4) > lensBlur(30, 4), 'a longer lens blurs more');
  assert.ok(lensBlur(30, 6) < lensBlur(30, 3), 'a farther focus blurs less');
  assert.equal(lensBlur(80, 0.5), 0.3, 'capped so a phone frame keeps its world');
  assert.ok(lensBlur(17, 6) < 0.1, 'a 17 mm wide at 6 m stays nearly sharp');
});

test('medium, two and follow presets blur by the lens; wide and close-up keep their preset', () => {
  const cam = createCamera({ aspect: 9 / 16 });
  for (const kind of ['ms', 'follow']) {
    const c = cam.solve(shot(kind), 0, A);
    assert.ok(c.dof > 0.1, `${kind} blurs its background (dof ${c.dof})`);
    assert.equal(c.dof, lensBlur(c.lens, dist(c)), `${kind} dof is the lens blur at its focus distance`);
  }
  const two = cam.solve({ ...shot('two'), subjects: ['you', 'cop'] }, 0, n => n === 'you' ? ANCHOR : { ...ANCHOR, head: [1.2, 0, 1.6], top: [1.2, 0, 1.95], sole: [1.2, 0, 0] });
  assert.equal(two.dof, lensBlur(two.lens, dist(two)), 'two-shot dof is the lens blur');
  assert.deepEqual(cam.solve(shot('ms'), 0, A).band, LENS_BAND, 'the subject keeps a wide sharp band round the focus');
  assert.equal(cam.solve(shot('cu'), 0, A).dof, 0.6, 'cu keeps its 0.6');
  assert.equal(cam.solve({ ...shot('wide'), size0: 0.26 }, 0, A).dof, 0, 'wide stays sharp');
});

test('a shot that sets dof itself keeps it', () => {
  const cam = createCamera({ aspect: 9 / 16 });
  assert.equal(cam.solve(shot('ms', { dof: 0.25 }), 0, A).dof, 0.25);
  assert.equal(cam.solve(shot('ms', { dof: 0 }), 0, A).dof, 0);
});

test('director shots without dof get the lens blur, absolute flights included', () => {
  const dir = list => createDirector(list, { frameOf: at => at.f, anchor: A, aspect: 9 / 16, F1: 10 });
  const orbit = dir([{ at: { f: 0 }, cam: { look: 'you', d: 4, lens: 30 } }]).at(0);
  assert.equal(orbit.dof, lensBlur(30, 4));
  const flight = dir([{ at: { f: 0 }, cam: { pos: [0, -5, 1.6], aim: [0, 0, 1.6], lens: 28 } }]).at(0);
  assert.equal(flight.dof, lensBlur(28, 5), 'an absolute { pos, aim } shot focuses on its aim');
  assert.ok(LENS_BAND[1] >= 1.5, 'a head up to 1.5x the aim distance (behind a flight\'s aim point) stays sharp');
  assert.deepEqual(flight.band, LENS_BAND);
});

test('director shots keep their own dof, and dofAuto still wins when the camera is close', () => {
  const at0 = (list, o = {}) => createDirector(list, { frameOf: at => at.f, anchor: A, aspect: 9 / 16, F1: 10, ...o }).at(0);
  assert.equal(at0([{ at: { f: 0 }, cam: { look: 'you', d: 4, lens: 30 }, dof: { gain: 0 } }]).dof, 0, 'gain 0 turns it off');
  assert.equal(at0([{ at: { f: 0 }, cam: { look: 'you', d: 4, lens: 30 }, dof: { gain: 0.9 } }]).dof, 0.9);
  assert.equal(at0([{ at: { f: 0 }, cam: { look: 'you', d: 1.5, lens: 30 } }], { dofAuto: { below: 2.2, gain: 0.35 } }).dof, 0.35);
});
