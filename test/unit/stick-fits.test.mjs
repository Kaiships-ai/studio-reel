// tier: heavy
// The fits table (styles/stick-man/kit/compat.json, its reader kit/cast/compat.js, its tool tools/gates/fits.mjs): which person, clip,
// face, hat and prop go together, measured, and a gate nobody can talk round.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';

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

// ------------------------------------------------------------------ the tool
const FITS = path.join(ROOT, 'styles/stick-man/tools/gates/fits.mjs'), F = await import('../../styles/stick-man/tools/gates/fits.mjs');
const fits = (args, o = {}) => { const r = run('node', [FITS, ...args], { capture: true, ...o }); return { code: r.status, out: r.stdout + r.stderr }; };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fits-'));
const film = (files, dir = tmp()) => { for (const [f, s] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), typeof s === 'string' ? s : `export default ${JSON.stringify(s)};\n`); } return dir; };
const KEY = C.personKey({ outfit: ['job:office'] }), row = (clip, verdict = 'pass', o = {}) => ({ pair: C.pair('clip', KEY, clip), kind: 'clip', verdict, number: verdict === 'pass' ? -20 : 2.6, unit: 'mm of a trim in an arm', bad: 0, commit: 'f539f1f2', ...(verdict === 'pass' ? {} : { why: 'w' }), ...o });
const table = (rows, o = {}) => { const f = path.join(tmp(), 'compat.json'); fs.writeFileSync(f, JSON.stringify({ version: 1, limits: TABLE.limits, rows, ...o })); return f; };
const reel = (anim, o = {}) => ({ name: 'street', cast: { amy: { spec: 'KAI', costume: ['job:office'], ...o } }, anim: { amy: anim } }), key = (clip, o = {}) => ({ f: 0, clip, ...o });
const gate = (r, rows, o) => fits([film({ 'reel.js': r }), '--table', table(rows, o)]);

test('a film passes only when every pair it lists has a usable row; exit 1 for a blocked pair, an untested pair, a pair with no row, by a key or by a `clips` list', () => {
  const ok = row('Idle_Stand_Loop'), bad = row('Gest_Clap_Loop', 'blocked'), K = [key('Idle_Stand_Loop')];
  const p = gate(reel(K), [ok]); assert.equal(p.code, 0, p.out); assert.match(p.out, /1 pair.*1 pass/);
  for (const [r, rows, why] of [[reel([...K, key('Gest_Clap_Loop')]), [ok, bad], /blocked.*Gest_Clap_Loop.*2\.6 mm/], [reel(K, { clips: ['Gest_Clap_Loop'] }), [ok, bad], /blocked.*Gest_Clap_Loop/], [reel([...K, key('Gest_Wave_Loop')]), [ok], /untested.*Gest_Wave_Loop/], [reel(K), [{ ...ok, verdict: 'untested', number: null, unit: null, why: 'x' }], /untested.*Idle_Stand_Loop/], [reel(K, { clips: [{ clip: 'Gest_Wave_Loop' }] }), [ok], /untested.*Gest_Wave/]]) { const x = gate(r, rows); assert.equal(x.code, 1, x.out); assert.match(x.out, why); }
});
test('zero pairs is not a pass: no cast, a cast with no keys, a figure whose keys were baked with no clip name', () => {
  const ok = row('Idle_Stand_Loop'), baked = Array.from({ length: 40 }, (_, f) => ({ f, pos: [0, 0], bob: 0 }));
  for (const r of [{ name: 'x', cast: {}, anim: {} }, reel([]), reel(baked)]) { const x = gate(r, [ok]); assert.equal(x.code, 1, x.out); assert.match(x.out, /no pair|names no clip/); }
  const mixed = gate(reel([key('Idle_Stand_Loop'), ...baked.map(k => ({ ...k, f: k.f + 300 }))]), [ok]); assert.equal(mixed.code, 1, 'one named clip does not cover forty baked frames'); assert.match(mixed.out, /no clip name/);
  assert.equal(gate(reel([...baked], { clips: ['Idle_Stand_Loop'] }), [ok]).code, 0, 'a `clips` list says what was baked');
});
test('a clip of another body is an adult copy: an elder with a key that does not say elder is red', () => {
  const dir = film({ 'reel.js': `import { SPECS } from '/styles/stick-man/engine/play.js'; import { bodySpec } from '/styles/stick-man/motion-lib/bodies.js'; SPECS.OLD = bodySpec({ name: 'o', shirt: [1, 1, 1], costume: ['sweater:sky'] }, 'elder');\nexport default { name: 'a', cast: { o: { spec: 'OLD' } }, anim: { o: [{ f: 0, clip: 'Idle_Breath_Loop', body: 'elder' }, { f: 90, clip: 'Idle_Stand_Loop' }] } };\n` });
  const k = C.personKey({ body: 'elder', outfit: ['sweater'] }), t = table(['Idle_Breath_Loop', 'Idle_Stand_Loop'].map(c => ({ ...row(c), pair: C.pair('clip', k, c) }))), x = fits([dir, '--table', t]);
  assert.equal(x.code, 1, x.out); assert.match(x.out, /adult clip.*elder/);
});
test("people are read from the film's own data: each reel in its own page (a part's own costume), a spec's girth and costume, a cast entry's costume instead; a layer the film draws itself is not the kit's", () => {
  const lib = `import { SPECS, HOOKS } from '/styles/stick-man/engine/play.js'; import '/styles/stick-man/kit/cast/wardrobe.js';\nconst part = /parts\\/([^/]+)/.exec(new URLSearchParams(globalThis.location?.search || '').get('film') || '')?.[1]; SPECS.BIG = { name: 'b', shirt: [1, 1, 1], girth: 1.2, costume: part === 'b' ? ['apron:slate:low'] : ['coat:navy'] };\nconst base = HOOKS.costume; HOOKS.costume = (S, list, c) => { const rest = list.filter(x => !/^skirt:[0-9a-f]{6}$/.test(x)); if (rest.length) base(S, rest, c); };\n`;
  const r = cast => `import '../../lib.js';\nexport default { name: 'x', cast: ${JSON.stringify(cast)}, anim: {} };\n`;
  const dir = film({ 'lib.js': lib, 'parts/a/reel.js': r({ x: { spec: 'BIG' }, y: { spec: 'BIG', costume: ['sweater:sky', 'skirt:2f8f74'] }, z: { spec: 'BIG', costume: ['sweater:sky', 'skirt:navy'] } }), 'parts/b/reel.js': r({ x: { spec: 'BIG' } }) });
  const { people, errors } = F.readFilm(dir); assert.deepEqual(errors, []); assert.deepEqual(people.map(p => [p.reel, p.who, p.key]), [['parts/a/reel.js', 'x', 'adult/g1.2/coat'], ['parts/a/reel.js', 'y', 'adult/g1.2/film:skirt:2f8f74+sweater'], ['parts/a/reel.js', 'z', 'adult/g1.2/skirt+sweater'], ['parts/b/reel.js', 'x', 'adult/g1.2/apron:low']]);
});
test('a film that cannot load is an error, not an empty cast: a broken reel, an unknown spec, a folder with no reel', () => {
  const ok = { 'a/reel.js': reel([key('Idle_Stand_Loop')]) }, t = table([row('Idle_Stand_Loop')]);
  assert.equal(fits([film(ok), '--table', t]).code, 0);
  for (const [bad, why] of [[{ ...ok, 'b/reel.js': 'throw new Error("boom")' }, /boom/], [{ ...ok, 'b/reel.js': 'export default 3' }, /no cast/], [{ ...ok, 'b/reel.js': { name: 'x', cast: { z: { spec: 'NOBODY' } } } }, /NOBODY/]]) { const x = fits([film(bad), '--table', t]); assert.equal(x.code, 1, x.out); assert.match(x.out, why); }
  assert.notEqual(fits([tmp(), '--table', t]).code, 0); assert.notEqual(fits([]).code, 0);
});
test('tampering: un-block a bad pair, remove a row, dress the figure in another outfit, loosen the limits: the gate fails each', () => {
  const r = reel([key('Idle_Stand_Loop')], { clips: ['Gest_Wave_Loop'] }), rows = [row('Idle_Stand_Loop'), row('Gest_Wave_Loop'), row('Gest_Clap_Loop', 'blocked')]; assert.equal(gate(r, rows).code, 0);
  const red = (rr, rs, o, why) => { const x = gate(rr, rs, o); assert.equal(x.code, 1, x.out); assert.match(x.out, why); };
  red(r, [rows[0], rows[1], { ...rows[2], verdict: 'pass' }], {}, /Gest_Clap_Loop.*pass.*2\.6/); red(r, [rows[0], { ...rows[1], bad: 4 }], {}, /Gest_Wave_Loop.*pass.*4 bad frames/); red(r, [rows[0]], {}, /untested.*Gest_Wave_Loop/);
  red(reel([key('Idle_Stand_Loop')], { costume: ['job:office', 'scarf:navy'] }), rows, {}, /untested.*scarf/); red(r, rows, { limits: '0'.repeat(16) }, /limits/); red(r, [...rows, row('Gest_Talk_Loop', 'fail')], {}, /fail/); red(r, [...rows, rows[0]], {}, /twice/);
  const K2 = C.personKey({ outfit: ['coat'] }); red(r, [...rows, { ...row('Move_Run_Fwd_Loop'), pair: C.pair('clip', K2, 'Move_Run_Fwd_Loop') }], {}, /Move_Run_Fwd_Loop.*clothsafe/);
  red(r, [...rows, { ...row('Idle_Sit_Loop', 'accepted'), number: 7, unit: 'cm' }], {}, /Idle_Sit_Loop.*accepted/); red(r, [...rows, { ...row('Move_Walk_Fwd_Loop', 'accepted'), number: 7.4, unit: 'cm' }], {}, /Move_Walk_Fwd_Loop.*accepted/);
});

// ------------------------------------------------------------------ a measurement's verdict
const m = (o = {}) => ({ frames: 100, faults: [], armMm: -20, ...o }), who = { body: 'adult', outfit: ['coat:navy'] };
test('verdicts: one bad frame of cloth blocks, one frame of a trim in an arm blocks, an error is untested, the walk is accepted up to the frozen number and for nothing else', () => {
  const v = (p, clip, x) => F.verdictOf(p, clip, m(x));
  assert.equal(v(who, 'Idle_Stand_Loop').verdict, 'pass'); assert.deepEqual([v(who, 'Idle_Stand_Loop').number, v(who, 'Idle_Stand_Loop').bad], [-20, 0]);
  let r = v(who, 'Idle_Stand_Loop', { faults: ['f37: cloth 4.3 mm into armL'] }); assert.deepEqual([r.verdict, r.number, r.bad], ['blocked', 4.3, 1]); assert.match(r.unit, /^mm/);
  r = v(who, 'Gest_Clap_Loop', { armMm: 1.1 }); assert.deepEqual([r.verdict, r.number], ['blocked', 1.1]); assert.equal(v(who, 'Gest_Clap_Loop', { armMm: 1 }).verdict, 'pass');
  r = v(who, 'Gest_Wave_Loop', { error: 'boom' }); assert.equal(r.verdict, 'untested'); assert.match(r.why, /boom/); assert.equal(v(who, 'Gest_Wave_Loop', { frames: 0 }).verdict, 'untested');
  const jerk = (n, cm) => ({ faults: Array.from({ length: n }, (_, i) => `f${i}: jerks ${cm} cm a frame a frame`) }), W = 'Move_Walk_Fwd_Loop';
  r = v(who, W, jerk(9, 7.3)); assert.deepEqual([r.verdict, r.number, r.unit], ['accepted', 7.3, 'cm a frame a frame']); for (const x of [jerk(10, 7.3), jerk(1, 7.4), { faults: [...jerk(1, 6.1).faults, 'f3: legL through the cloth'] }, { ...jerk(1, 6.1), armMm: 1.2 }]) assert.equal(v(who, W, x).verdict, 'blocked');
  assert.equal(v(who, 'Move_CarryBag_Walk_Loop', jerk(1, 6.4)).verdict, 'accepted'); assert.equal(v(who, 'Move_CarryBag_Walk_Loop', jerk(2, 6.4)).verdict, 'blocked'); assert.equal(v({ ...who, body: 'elder' }, W, jerk(1, 6.1)).verdict, 'blocked'); assert.equal(v(who, 'Idle_Sit_Loop', jerk(1, 6.1)).verdict, 'blocked');
  r = v(who, 'Move_Run_Fwd_Loop'); assert.equal(r.verdict, 'blocked', 'clothsafe says no, whatever this measure says'); assert.match(r.why, /run/); assert.equal(v({ body: 'adult', outfit: ['sweater'] }, 'Move_Run_Fwd_Loop').verdict, 'pass');
  r = v({ body: 'elder', outfit: [] }, 'Gest_Yawn_Once', { copy: 'shape is 0.02' }); assert.equal(r.verdict, 'blocked'); assert.match(r.why, /adult/);
  assert.equal(v({ body: 'adult', outfit: ['hoodie:grey'] }, 'Idle_Stand_Loop').verdict, 'untested', 'a layer this measure does not see');
});
test('adding rows never removes or weakens one', () => {
  const a = row('Idle_Stand_Loop'), b = row('Gest_Clap_Loop', 'blocked'), c = row('Gest_Wave_Loop', 'untested', { number: null, unit: null }), old = [a, b, c];
  assert.deepEqual(F.merge(old, []).length, 3); const M = F.merge(old, [{ ...a, verdict: 'blocked', number: 3 }, { ...b, verdict: 'pass', number: -1 }, { ...c, verdict: 'pass', number: -9, unit: 'mm' }, row('Gest_Talk_Loop')]);
  assert.deepEqual(M.map(r => [r.pair.split('|')[2], r.verdict]).sort(), [['Gest_Clap_Loop', 'blocked'], ['Gest_Talk_Loop', 'pass'], ['Gest_Wave_Loop', 'pass'], ['Idle_Stand_Loop', 'blocked']]);
  assert.deepEqual(F.merge([a], [{ ...a, verdict: 'untested', number: null }]), [a], 'a run that failed takes nothing away');
});
test('arm trims are judged on every frame as played: the seated clap in scrubs, red between the tenth frames', async () => {
  const p = { body: 'adult', outfit: ['scrubs:teal', 'stethoscope', 'nametag', 'pens'] }, x = await F.measure(p, 'Gest_SitClap_Loop'), r = F.verdictOf(p, 'Gest_SitClap_Loop', x);
  assert.equal(r.verdict, 'blocked', JSON.stringify(x).slice(0, 300)); assert.ok(r.number > 1 && r.number < 4, String(r.number)); assert.ok(Math.max(...x.arm.filter((_, f) => f % 10 === 0)) <= 1, 'every tenth frame alone is clean: that is how it passed');
});
test("the controls: the doctor who throws himself back is blocked, the doctor who stands passes, an adult's clip on another body is blocked", async () => {
  for (const c of await F.controls(LIMITS.controls)) assert.equal(c.got, c.must, `${c.name}: ${c.why}`);
});
test('one command writes a person: --person, only the clips asked for, its rows whole and kept in a file', () => {
  const t = table([row('Gest_Clap_Loop', 'blocked')]), x = fits(['--person', JSON.stringify({ body: 'adult', outfit: ['job:office'] }), '--clips', 'Idle_Stand_Loop', '--table', t, '--no-controls']); assert.equal(x.code, 0, x.out);
  const rows = JSON.parse(fs.readFileSync(t, 'utf8')).rows; assert.deepEqual(rows.map(r => [r.pair.split('|')[2], r.verdict]), [['Gest_Clap_Loop', 'blocked'], ['Idle_Stand_Loop', 'pass']]);
  const y = fits([film({ 'reel.js': reel([key('Idle_Stand_Loop')]) }), '--table', table([]), '--measure', '--no-controls']); assert.equal(y.code, 0, y.out); assert.match(y.out, /1 pair.*1 pass/);
  assert.notEqual(fits(['--person', '{"body":"giant"}', '--table', t, '--no-controls']).code, 0); assert.notEqual(fits(['--person', '{"body":"adult"}', '--clips', 'No_Such_Clip', '--table', t, '--no-controls']).code, 0);
  const z = fits(['--person', '{"body":"adult"}', '--clips', 'Idle_Stand_Loop', '--no-controls']); assert.notEqual(z.code, 0, "the committed table is never written without the controls"); assert.match(z.out, /controls/);
});
test('a film that skips film.js still asks its hand props (x_hp keys) and its marks (a mark: beat, a feeling with marks) under a hat', () => {
  const K = [key('Idle_Stand_Loop'), { f: 10, x_hpR_phone: 1 }], hat = { costume: ['job:office', 'cap:police'] }, hk = C.personKey({ outfit: ['job:office', 'cap:police'] }), ok = { ...row('Idle_Stand_Loop'), pair: C.pair('clip', hk, 'Idle_Stand_Loop') };
  const r = { ...reel(K, hat), beats: [{ who: 'amy', f: 20, mark: 'anger' }] }, hand = { ...ok, pair: C.pair('hand', 'phone', 'adult', 'hand'), kind: 'hand', number: 0 }, mark = { ...ok, pair: C.pair('mark', 'bold:anger', 'cap:police'), kind: 'mark', number: 0 };
  let x = gate(r, [ok]); assert.equal(x.code, 1, x.out); assert.match(x.out, /hand\|phone\|adult\|hand/); assert.match(x.out, /mark\|bold:anger\|cap:police/);
  x = gate(r, [ok, hand, mark]); assert.equal(x.code, 0, x.out);
  assert.equal(gate(reel(K, { costume: ['job:office'] }), [row('Idle_Stand_Loop'), hand]).code, 0, 'no hat: no mark pair');
});
test('contract: every mark a feeling plays is a mark fits_kinds measures under every hat', async () => {
  const { EXPRESSIONS, marksOf } = await import('../../styles/stick-man/engine/expressions.js'), K = await import('../../styles/stick-man/tools/gates/fits_kinds.mjs'), names = new Set((await K.marks(['cap:police'])).map(r => r.pair.split('|')[1]));
  for (const [n, e] of Object.entries(EXPRESSIONS)) for (const m of marksOf(e)) assert.ok(names.has(`bold:${[].concat(m)[0]}`), `${n}: ${m}`);
});
test('tampering with the REAL committed table: un-blocking a row, removing a row, a garment it never measured each fail the gate; untouched it passes', () => {
  const real = TABLE.rows, K = [key('Idle_Stand_Loop'), key('Gest_Wave_Loop')], who = { costume: ['sweater:sky'] }, k = C.personKey({ outfit: ['sweater'], });
  const ok = gate(reel(K, who), real); assert.equal(ok.code, 0, ok.out);
  const blockedOf = real.find(r => r.verdict === 'blocked' && r.pair.startsWith(`clip|${k}|`)); assert.ok(blockedOf, `a blocked row of ${k}`);
  const un = gate(reel([...K, key(blockedOf.pair.split('|')[2])], who), real.map(r => (r === blockedOf ? { ...r, verdict: 'pass', number: 0, bad: 0 } : r))); assert.equal(un.code, 1, un.out); assert.match(un.out, /pass, but/);
  const gone = gate(reel(K, who), real.filter(r => r.pair !== `clip|${k}|Gest_Wave_Loop`)); assert.equal(gone.code, 1); assert.match(gone.out, /no row: not measured/);
  const odd = gate(reel(K, { costume: ['sweater:sky', 'cardigan:plum', 'scarf:rose', 'tie'] }), real); assert.equal(odd.code, 1); assert.match(odd.out, /untested/);
});
test('a hairless person is a fits problem; bald, hair or a hat is not', () => {
  const T = { lookup: () => ({ verdict: 'pass' }) }, who = (w, noHair) => ({ reel: 'reel.js', who: w, key: 'adult/g1/plain', person: { body: 'adult', outfit: [] }, clips: [{ clip: 'Idle_Stand_Loop', body: 'adult', at: 'f0' }], baked: 0, noHair });
  const R = F.checkFilm({ errors: [], people: [who('bare', true), who('ok', false)] }, T);
  assert.equal(R.problems.length, 1); assert.match(R.problems[0], /bare .*no hair.*bald: true/);
});
