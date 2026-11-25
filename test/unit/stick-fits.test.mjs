// The fits table (styles/stick-man/kit/compat.json, its reader kit/cast/compat.js, its tool tools/gates/fits.mjs): which person, clip,
// face, hat and prop go together, measured, and a gate nobody can talk round.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../../kit/env.mjs';

const KIT = path.join(ROOT, 'styles/stick-man/kit'), LIMITS = JSON.parse(fs.readFileSync(path.join(KIT, 'compat-limits.json'), 'utf8'));

test("the frozen limits are the kit's own numbers", async () => {
  const M = await import('./wardrobe-measure.mjs'), { SHAPE_C, SHAPE_CM } = await import('../../styles/stick-man/tools/gates/bodylife.mjs');
  const { from, frames, ...clip } = LIMITS.clip; for (const [k, v] of Object.entries(clip)) assert.deepEqual(v, M[k], k);
  assert.deepEqual([LIMITS.copy.SHAPE_C, LIMITS.copy.SHAPE_CM], [SHAPE_C, SHAPE_CM]); assert.deepEqual([LIMITS.outfit.TOUCH_MM, LIMITS.outfit.TRIM_MM], [M.TOUCH_MM, M.TRIM_MM]);
  assert.match(fs.readFileSync(path.join(ROOT, 'test/unit/stick-wardrobe.test.mjs'), 'utf8'), /t\.ring\.mm < 14/); assert.equal(LIMITS.outfit.ring_mm, 14); assert.equal(LIMITS.mark.cover, 0);
});

const C = await import('../../styles/stick-man/kit/cast/compat.js');
const TABLE = JSON.parse(fs.readFileSync(path.join(KIT, 'compat.json'), 'utf8')), sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

test('a person key is kit parts only: body, girth and garment shapes; never a name, never a colour, never an order', () => {
  const k = C.personKey({ body: 'elder', outfit: ['shirt:office:9e8a61', 'cardigan:plum'] }); assert.equal(k, 'elder/g1/cardigan+shirt:office');
  assert.equal(C.personKey({ body: 'elder', girth: 1, outfit: ['cardigan:navy', 'shirt:office'] }), k); assert.equal(C.personKey({ body: 'elder', name: 'GRAN', spec: 'W_GRAN', outfit: ['cardigan', 'shirt:office:sky'] }), k);
  assert.equal(C.personKey({ outfit: ['job:chef'] }), 'adult/g1/apron:low+hat:toque+jacket:chef'); assert.equal(C.personKey({ body: 'heavy' }), 'heavy/g1.9/plain'); assert.equal(C.personKey({ girth: 1.12, outfit: 'shirt:work' }), 'adult/g1.12/shirt:work');
  for (const [a, b] of [['apron:slate:low', 'apron:slate'], ['coat:lab:828c94', 'coat:navy'], ['shirt:office:sky', 'shirt:work:sky'], ['shirt:navy', 'shirt:police'], ['tie:stripe', 'tie:navy'], ['hat:hard', 'hat:toque']]) assert.notEqual(C.personKey({ outfit: [a] }), C.personKey({ outfit: [b] }), `${a} and ${b}`);
  assert.equal(C.personKey({ body: 'adult', scale: 0.7, headScale: 1.24, legScale: 0.84 }), 'adult/g1,s0.7,h1.24,l0.84/plain'); assert.equal(C.personKey({ body: 'child', scale: 0.62, headScale: 1.3, legScale: 0.8 }), 'child/g1/plain');
  assert.equal(C.personKey({ outfit: ['mystery:a:b'] }), 'adult/g1/mystery:a:b', 'a layer nobody knows keeps every word: it can only be untested'); assert.throws(() => C.personKey({ body: 'giant' }), /body/);
});
test('every wardrobe layer is in the key table, and a shape word of one is never dropped as a colour', async () => {
  await import('./wardrobe-measure.mjs'); const { LAYERS, PALETTES, UNIFORM } = await import('../../styles/stick-man/kit/cast/wardrobe.js');
  for (const l of LAYERS) { const [k, a] = l.split(':'); assert.ok(C.SHAPES[k], l); if (a) assert.ok(C.SHAPES[k].includes(a), l); }
  const src = fs.readFileSync(path.join(KIT, 'cast/garments.js'), 'utf8'); for (const m of src.matchAll(/X\.variant === '(\w+)'|oneOf\('[^)]*?\[([^\]]+)\]/g)) for (const w of (m[1] || m[2]).match(/\w+/g)) assert.ok(Object.values(C.SHAPES).some(l => l.includes(w)), `${w} changes a garment's shape`);
  for (const c of Object.keys(PALETTES)) for (const l of Object.values(C.SHAPES)) assert.ok(!l.includes(c), c); assert.ok(UNIFORM);
});
test('pair strings: five kinds and the clip, a clip by its library id; an unknown kind or a missing part throws', () => {
  const who = C.personKey({ outfit: ['job:doctor'] }); assert.equal(C.pair('clip', who, 'Adult_Idle_Stand_Loop_v01'), `clip|${who}|Idle_Stand_Loop`);
  assert.equal(C.pair('face', 'elder', 'elder'), 'face|elder|elder'); assert.equal(C.pair('mark', 'sweat', 'cap:police'), 'mark|sweat|cap:police'); assert.equal(C.pair('hand', 'mug', 'adult', 'seat'), 'hand|mug|adult|seat'); assert.equal(C.pair('outfit', 'hoodie', 'teen'), 'outfit|hoodie|teen'); assert.equal(C.pair('light', 'street/bench', 'night'), 'light|street/bench|night');
  assert.throws(() => C.pair('colour', 'a', 'b'), /kind/); assert.throws(() => C.pair('clip', who), /parts/); assert.throws(() => C.pair('hand', 'mug', 'adult', 'foot'), /hand/);
});
test('a pair with no row, or with a verdict nobody knows, is untested; only pass and accepted are usable; a waiver names the pair, why and by whom', () => {
  const rows = [{ pair: 'face|a|b', kind: 'face', verdict: 'pass', number: 0, unit: 'x', commit: 'c' }, { pair: 'face|a|c', kind: 'face', verdict: 'blocked', number: 2.6, unit: 'mm', commit: 'c', why: 'w' }, { pair: 'face|a|d', kind: 'face', verdict: 'fail', number: 1, unit: 'mm', commit: 'c' }, { pair: 'face|a|e', kind: 'face', verdict: 'accepted', number: 7.3, unit: 'cm', commit: 'c' }], T = C.table({ rows });
  assert.equal(T.lookup('face|a|z').verdict, 'untested'); assert.equal(T.lookup('face|a|d').verdict, 'untested'); assert.equal(T.lookup('face|a|c').number, 2.6);
  assert.deepEqual(['b', 'c', 'd', 'e', 'z'].map(x => T.usable(`face|a|${x}`).ok), [true, false, false, true, false]); assert.deepEqual(C.USABLE, ['pass', 'accepted']);
  const w = { pair: 'face|a|c', why: 'one shot, from behind', by: 'Kai' }; assert.equal(T.usable('face|a|c', [w]).ok, true); assert.equal(T.usable('face|a|c', [w]).row.verdict, 'blocked'); for (const bad of [{ ...w, why: '' }, { ...w, by: undefined }, { ...w, pair: 'face|a|z' }]) assert.equal(T.usable('face|a|c', [bad]).ok, false);
  assert.throws(() => C.table({ rows: [rows[0], rows[0]] }), /twice/);
});
test('the committed table: its limits are the frozen file, no pair twice, no `fail`, every row whole', () => {
  assert.equal(TABLE.limits, sha(fs.readFileSync(path.join(KIT, 'compat-limits.json')))); assert.equal(new Set(TABLE.rows.map(r => r.pair)).size, TABLE.rows.length);
  for (const r of TABLE.rows) { assert.ok(['pass', 'accepted', 'blocked', 'untested'].includes(r.verdict), r.pair); assert.equal(r.pair.split('|')[0], r.kind); assert.equal(C.pair(...r.pair.split('|')), r.pair); assert.ok(r.verdict === 'untested' ? r.why : typeof r.number === 'number' && r.unit, r.pair); assert.match(r.commit, /^[0-9a-f]{8,}$/, r.pair); }
});
