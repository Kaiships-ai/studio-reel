// tools/gates/clothgate.mjs: a hanging garment on a figure that plays a motion the kit's cloth is not clean in is reported with the
// film, the figure and the clip; a film with no wardrobe item passes untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

await rigStick('adult');   // (the headless canvas)
const { clothGate, bakedRuns, message, filmCloth } = await import('../../styles/stick-man/tools/gates/clothgate.mjs');
const { UNSAFE, hangs } = await import('../../styles/stick-man/kit/cast/clothsafe.js'), { CLIPS, placeClip } = await import('../../styles/stick-man/motion-lib/index.js');
const TOOL = path.join(ROOT, 'styles/stick-man/tools/gates/clothgate.mjs');
const key = (clip, o = {}) => ({ f: 10, clip, body: 'adult', ...o }), act = (cast, anim, beats) => [{ name: 'street', cast, anim, beats }];
const film = (body, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clothgate-'))) => { fs.writeFileSync(path.join(dir, 'reel.js'), `export default ${JSON.stringify(body)};\n`); return dir; };

test('every clip marked unsafe is in the library', () => { for (const c of Object.keys(UNSAFE)) assert.ok(CLIPS[c], c); });
test('what hangs: a coat, a skirt, a dress, an apron, alone or in a job; not a scarf, a sweater, a cap or a hoodie', () => {
  assert.deepEqual(hangs(['job:doctor']), ['coat:doctor']); assert.deepEqual(hangs(['job:chef']), ['apron:slate:low']); assert.deepEqual(hangs('dress:coral'), ['dress:coral']); assert.deepEqual(hangs(['sweater:sky', 'skirt:plum']), ['skirt:plum']);
  for (const l of [['job:police'], ['job:worker'], ['sweater:navy', 'scarf:mustard'], ['hoodie:grey'], ['belt', 'hat:flat'], undefined]) assert.deepEqual(hangs(l), [], String(l));
});
test('each unsafe clip on a dressed figure is one finding; the same clip on an undressed or a police figure is none, and a walk or a sit in a dress is none', () => {
  for (const clip of Object.keys(UNSAFE)) { const r = clothGate(act({ amy: { spec: 'KAI', costume: ['dress:coral'] }, bo: { spec: 'KAI' }, cy: { spec: 'KAI', costume: ['job:police'] } }, { amy: [key(clip)], bo: [key(clip)], cy: [key(clip)] })); assert.deepEqual(r.findings.map(x => [x.who, x.clip]), [['amy', clip]]); }
  for (const clip of ['Move_Walk_Fwd_Loop', 'Trans_SitDown_Once', 'Idle_Sit_Loop', 'Gest_PointSeated_Loop', 'Trans_StandUp_Once', 'Idle_Stand_Loop']) assert.deepEqual(clothGate(act({ amy: { spec: 'KAI', costume: ['dress:coral'] } }, { amy: [key(clip)] })).findings, [], clip);
  assert.equal(clothGate(act({ amy: { spec: 'KAI', costume: ['job:doctor'] } }, { amy: [key('Adult_Move_Run_Fwd_Loop_v01')] })).findings[0].clip, 'Move_Run_Fwd_Loop');
});
test("a spec's own costume counts, a cast entry's replaces it; a run by a beat is reported", () => {
  const specs = { DOC: { costume: ['job:doctor'] } }, run_ = { amy: [key('Move_Run_Fwd_Loop')] };
  assert.equal(clothGate(act({ amy: { spec: 'DOC' } }, run_), specs).findings.length, 1); assert.equal(clothGate(act({ amy: { spec: 'DOC', costume: ['job:police'] } }, run_), specs).findings.length, 0);
  const b = clothGate(act({ amy: { spec: 'DOC' } }, {}, [{ f: 5, who: 'amy', do: 'walk_to', style: 'run' }, { f: 9, who: 'amy', do: 'walk_to', style: 'stroll' }, { f: 5, who: 'bo', do: 'leap' }]), specs); assert.deepEqual(b.findings.map(x => x.clip), ['beat walk_to (run)']);
});
test('a film that baked its clips (keys with no clip name) is read by how fast the figure goes: a run is reported, a walk, a seated ride and a cut are not', () => {
  const baked = (clip, body = 'adult') => placeClip({ f: 0, clip, body, to: [12, 0] }, { pos: [0, 0], yaw: 90 }).keys;
  assert.ok(bakedRuns(baked('Move_Run_Fwd_Loop')).length >= 1); assert.deepEqual(bakedRuns(baked('Move_Walk_Fwd_Loop')), []); assert.deepEqual(bakedRuns(baked('Move_Walk_Fwd_Loop', 'thin')), []);
  assert.deepEqual(bakedRuns(Array.from({ length: 20 }, (_, f) => ({ f, pos: [f * 0.5, 0, 0], bob: -0.55 }))), [], 'seated in a car'); assert.deepEqual(bakedRuns([{ f: 0, pos: [0, 0] }, { f: 10, pos: [9, 0], ease: 'snap' }, { f: 40, pos: [9, 0] }]), [], 'a cut');
  const r = clothGate(act({ amy: { spec: 'KAI', costume: ['job:chef'] } }, { amy: baked('Move_Run_Fwd_Loop') })); assert.match(r.findings[0].clip, /no clip name that travel/);
});
test('the tool on a film: names the film, the figure and the clip, exit 1; a film with no wardrobe item passes, exit 0', () => {
  const body = costume => ({ name: 'street', cast: { amy: { spec: 'KAI', at: [0, 0], ...(costume ? { costume } : {}) } }, anim: { amy: [key('Move_Run_Fwd_Loop', { to: [8, 0] })] } });
  const bad = film(body(['sweater:sky', 'skirt:plum'])), p = run('node', [TOOL, bad], { capture: true }); assert.equal(p.status, 1, p.stdout + p.stderr);
  assert.match(p.stdout, new RegExp(`${path.basename(bad)}: amy \\(skirt:plum\\) plays Move_Run_Fwd_Loop at f10 in street: cloth in a run is not clean`)); assert.match(fs.readFileSync(path.join(bad, 'review/clothgate.md'), 'utf8'), /\*\*FAIL\*\*: 1 figure/);
  const ok = run('node', [TOOL, film(body(null))], { capture: true }); assert.equal(ok.status, 0, ok.stdout + ok.stderr); assert.match(ok.stdout, /clothgate PASS \(0 dressed, 0 finding/);
  assert.match(message('f', { who: 'a', wears: 'w', clip: 'c', f: 1, act: 'x', why: 'y' }), /^f: a \(w\) plays c at f1 in x: y$/);
});
test('reel2.js acts are read too', async () => { const d = film({ name: 'a', cast: {} }); fs.writeFileSync(path.join(d, 'reel2.js'), `export default ${JSON.stringify({ acts: act({ amy: { spec: 'KAI', costume: ['dress:coral'] } }, { amy: [key('Act_Jump_Once')] }) })};\n`); assert.deepEqual((await filmCloth(d)).findings.map(x => x.clip), ['Act_Jump_Once']); });

// kit/compat.json: a figure in wardrobe garments is looked up too
test('a figure in a kit garment whose (person, clip) is blocked or has no row is a table finding; a usable one is none; a hoodie, a plain figure and a clip already reported are never looked up', async () => {
  const { pair, personKey, table } = await import('../../styles/stick-man/kit/cast/compat.js'), key1 = personKey({ outfit: ['coat:lab'] }), row = (clip, verdict) => ({ pair: pair('clip', key1, clip), kind: 'clip', verdict, number: 9.9, unit: 'mm', why: 'a cuff' });
  const T = table({ rows: [row('Idle_Stand_Loop', 'pass'), row('React_Terrified_Once', 'blocked'), row('Move_Run_Fwd_Loop', 'blocked')] }), look = (costume, clip) => clothGate(act({ amy: { spec: 'KAI', costume } }, { amy: [key(clip)] }), {}, T);
  assert.deepEqual(look(['coat:lab'], 'Idle_Stand_Loop').table, []);
  assert.match(look(['coat:lab'], 'React_Terrified_Once').table[0].why, /^blocked in kit\/compat\.json: 9\.9 mm \(a cuff\)$/); assert.match(look(['coat:lab'], 'Idle_Sit_Loop').table[0].why, /^untested in kit\/compat\.json/);
  const run_ = look(['coat:lab'], 'Move_Run_Fwd_Loop'); assert.equal(run_.findings.length, 1); assert.deepEqual(run_.table, [], 'reported once');
  for (const c of [undefined, ['hoodie:grey'], ['belt', 'holster:L', 'hat:flat']]) assert.deepEqual(look(c, 'React_Terrified_Once').table, [], String(c));
  assert.match(look(['sweater:sky'], 'Idle_Stand_Loop').table[0].why, /^untested/, 'a garment that does not hang is looked up too');
});
test('the tool prints a table finding and exits 1', () => {
  const p = run('node', [TOOL, film({ name: 'street', cast: { amy: { spec: 'KAI', at: [0, 0], costume: ['sweater:sky', 'scarf:mustard', 'cap:pilot'] } }, anim: { amy: [key('Idle_Stand_Loop')] } })], { capture: true });
  assert.equal(p.status, 1, p.stdout + p.stderr); assert.match(p.stdout, /plays Idle_Stand_Loop at f10 in street: untested in kit\/compat\.json/);
});
