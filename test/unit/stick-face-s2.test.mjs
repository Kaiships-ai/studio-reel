// Face style s2 (styles/stick-man/engine/facestyles/s2.js), the rubber face Kai approved 21/11 on Hot Money ep01 r5 reel 1
// ("v6 ok, ưng 9.5/10"), the default face style; a film with reel.js faceStyle: 'kit' keeps the kit's faces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { EXPR, STYLE_DRAW, FACE_STYLE, faceParams, mixFace } from '../../styles/stick-man/engine/faces.js';
import { faceStateAt, FACE_TIMING, CHEW, TAKE } from '../../styles/stick-man/engine/acting.js';
import { faceFaults } from '../../styles/stick-man/tools/faults.mjs';

const kitNormal = FACE_TIMING.normal, kitChew = { ...CHEW }, kitTake = { ...TAKE };
const S2 = await import('../../styles/stick-man/engine/facestyles/s2.js');

// a 2D context that counts what is drawn (strokes and fills) and keeps the transform calls working
function recorder() {
  const n = { stroke: 0, fill: 0 };
  const g = new Proxy({ canvas: { width: 512, height: 512 }, getTransform: () => ({}) }, {
    get(t, k) { if (k in t) return t[k]; if (k === 'stroke' || k === 'fill') return () => { n[k]++; }; return () => {}; },
    set(t, k, v) { t[k] = v; return true; } });
  return { g, n };
}
const held = name => { const { F } = mixFace(faceStateAt([{ f: -1e9, expr: name }], 100, 7, null)); return { ...F, age: 60, hpx: 300 }; };

test('before use() nothing changes: the kit faces keep their clocks and no s2 design exists', () => {
  assert.equal(FACE_STYLE.name, null);
  assert.ok(!('y_dare' in EXPR), 'importing the module adds no design'); assert.equal(typeof STYLE_DRAW.s2, 'function');
  assert.equal(CHEW.T, 9);
  assert.equal(faceParams('happy').style, undefined, 'a kit design carries no style numbers');
});

test('use(): every s2 design is in EXPR, drawn by s2, and the engine runs on s2\'s clocks', () => {
  S2.use();
  assert.equal(FACE_STYLE.name, 's2');
  const names = Object.keys(S2.DESIGNS);
  assert.equal(names.length, 27);
  for (const n of ['y_tense', 'y_worried', 'y_set', 'y_strain', 'y_squint', 'y_fear', 'y_tired', 'y_dare', 'y_panic', 'y_shock', 'c_stern', 'c_shout']) assert.ok(names.includes(n), n);
  for (const n of names) assert.equal(EXPR[n].style, 's2', n);
  assert.notEqual(FACE_TIMING.normal, kitNormal); assert.equal(CHEW.T, 19); assert.equal(TAKE.sine, true);
  assert.notDeepEqual({ ...TAKE }, kitTake); assert.notDeepEqual({ ...CHEW }, kitChew);
});

test('every s2 design draws: eyes, brows and a mouth on the canvas, from the front', () => {
  for (const n of Object.keys(S2.DESIGNS)) {
    const { g, n: c } = recorder();
    STYLE_DRAW.s2(g, held(n), 0, 0, {});
    assert.ok(c.stroke + c.fill >= 5, `${n}: ${c.stroke} strokes, ${c.fill} fills`);
  }
});

test('turned away: past the turn fade the face is not drawn; a three-quarter head keeps it', () => {
  const at = (yaw, o = {}) => { const { g, n } = recorder(); STYLE_DRAW.s2(g, held('y_alert'), 0, 0, { sl: [yaw, 0, 1, 0], ...o }); return n.stroke + n.fill; };
  assert.ok(at(0) > 0);
  assert.equal(at(1.40), 0, 'the back of a hooded head (yaw 1.40 > 1.34) shows no face');
  assert.equal(at(1.50, { edge: [0.58, 0.12] }), 0, 'under a cap past 1.45 no face');
  assert.ok(at(1.0) > 0, 'a three-quarter head still wears its face');
});

test('a shut blink draws the eyes as lines (no white fill for the eyes), an open face fills them', () => {
  const count = blink => { const { g, n } = recorder(); STYLE_DRAW.s2(g, held('y_alert'), blink, 0, {}); return n; };
  const open = count(0), shut = count(1);
  assert.ok(shut.fill < open.fill, `fills open ${open.fill}, shut ${shut.fill}`);
});

// Hot Money ep01 r5 reel 1 (film 0-2702) rendered with faceStyle s2 (shot.mjs --dbg, 720 x 1280): f, act, camera, motion,
// and the lead's and the cop's face numbers (test/fixtures/hm-r5/s2-reel1.jsonl.gz). The same rows as the approved prototype.
const reel = zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/hm-r5/s2-reel1.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));

test('reel 1 in s2: no one-frame pops on the lead or the cop, and the cop\'s one short hold is the segment\'s last frame', () => {
  const you = faceFaults(reel, 'you'), cop = faceFaults(reel, 'cop');
  assert.ok(you.frames > 2400 && cop.frames > 150, `${you.frames} / ${cop.frames} frames judged`);
  assert.deepEqual(you.pops, []); assert.deepEqual(cop.pops, []);
  assert.ok(you.rises.every(r => r.rise >= 6), JSON.stringify(you.rises.filter(r => r.rise < 6)));
  assert.deepEqual(cop.holds.filter(h => h.hold < 6).map(h => h.kf), [1139]);
});

test('reel 1 in s2: the lead\'s eyes are shut (blink past half) under 4 % of his frames, never more than 3 frames running', () => {
  const B = reel.filter(r => r.actors.you?.inFrame && r.actors.you.face).map(r => r.actors.you.face.blink);
  let run = 0, max = 0; for (const b of B) { run = b > 0.5 ? run + 1 : 0; max = Math.max(max, run); }
  const share = B.filter(b => b > 0.5).length / B.length;
  assert.ok(share < 0.04, `${(100 * share).toFixed(2)} %`); assert.ok(max <= 3, `${max} f`);
});
