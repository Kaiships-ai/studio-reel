import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filmIndex, findFilm, resolve, variantsFromWords, applyPick, formatSpec, readback, recommend } from '../../styles/stick-man/tools/camtry-core.mjs';

// a copy of Hot Money ep01 r5's act tables (r5/gen/*.js heads), its CHASE anchors and its CHASE test folder
const LIB = fileURLToPath(new URL('../fixtures/camtry/library', import.meta.url));
const index = filmIndex(path.join(LIB, 'hm-ep01-r5'));
const where = q => { const r = resolve(q, index); return { seg: r.seg?.id, take: r.take?.frames, window: r.window, anchors: r.anchors?.map(a => [a.f0, a.f1]), r }; };

test('the newest film is found, not its segment test folder; a named film wins', () => {
  assert.equal(path.basename(findFilm(LIB, 'đoạn đua xe')), 'hm-ep01-r5');
  assert.equal(path.basename(findFilm(LIB, 'phim hm-ep01-r5, mở đầu')), 'hm-ep01-r5');
});

test('"đoạn đua xe" is the chase, take 1, its first 100 frames, under the take-1 anchor, booted from the test folder', () => {
  const w = where('đoạn đua xe, máy quay dính tường nhà, nâng lên chút');
  assert.equal(w.seg, 'CHASE');
  assert.deepEqual(w.r.seg.frames, [1347, 1709]);
  assert.deepEqual(w.take, [1347, 1513]);
  assert.deepEqual(w.window, [1347, 1446]);
  assert.deepEqual(w.anchors, [[1347, 1514]]);
  assert.equal(path.basename(w.r.seg.boot), 'hm-ep01-r5-chase');
  assert.match(readback(w.r), /^Em hiểu là: phim hm-ep01-r5, đoạn CHASE \(1347-1709\), take 1 \(1347-1513\).*khung 1347-1446, máy quay neo 1347-1513/);
});

test('"ngân hàng thứ hai" is the second bank: its take between the cuts', () => {
  const w = where('cảnh ngân hàng thứ hai, máy gần quá');
  assert.equal(w.seg, 'BANKS');
  assert.deepEqual(w.take, [1934, 2024]);
  assert.deepEqual(w.window, [1934, 2024]);
  assert.match(w.r.stage[2], /BANK 2/);
  assert.equal(where('ngân hàng thứ 3').take[0], 2025);
});

test('"mở đầu" is the opening segment', () => {
  const w = where('mở đầu, máy thấp quá');
  assert.equal(w.seg, 'OPEN');
  assert.deepEqual(w.take, [0, 203]);
  assert.deepEqual(w.window, [0, 99]);
  assert.deepEqual(resolve('mở đầu', index, { max: 300 }).window, [0, 203], 'a longer --max covers the whole take');
});

test('a note that names no part of the film says so instead of guessing', () => {
  const r = resolve('máy quay đẹp hơn', index);
  assert.equal(r.seg, null);
  assert.match(readback(r), /chưa rõ đoạn nào/);
});

test('camera words become variants: the film camera first, then the moves asked', () => {
  const up = variantsFromWords('nâng lên');
  assert.equal(up[0].label, 'V0  giữ nguyên');
  assert.ok(up.slice(1).every(v => v.up > 0 && !v.away), 'nâng lên: up only');
  assert.ok(up[2].up > up[1].up, 'two steps');
  assert.ok(variantsFromWords('nâng lên chút')[1].up < up[1].up, '"chút" is a smaller step');
  for (const q of ['ra xa', 'lùi lại', 'máy gần quá']) assert.ok(variantsFromWords(q).slice(1).every(v => v.away > 0 && !v.up), q);
  assert.ok(variantsFromWords('gần lại').slice(1).every(v => v.closer > 0 && !v.away), 'gần lại');
  assert.ok(variantsFromWords('hạ thấp').slice(1).every(v => v.up < 0), 'hạ thấp');
  assert.ok(variantsFromWords('máy hạ, chút').slice(1).every(v => v.up < 0), 'hạ alone');
  assert.ok(variantsFromWords('thấp quá').slice(1).every(v => v.up > 0), 'thấp quá: up');
  const wall = variantsFromWords('máy quay dính tường nhà, nâng lên chút');
  assert.equal(wall.length, 4);
  assert.ok(wall.some(v => v.up > 0 && v.away > 0 && v.from === 'wall'), 'a wall in the note: up and off the wall together');
  assert.equal(variantsFromWords('nâng 2 m')[1].up, 2);
});

test('the recommendation is the smallest asked change that clears the walls; the film camera only when it is better', () => {
  const V = variantsFromWords('máy quay dính tường nhà, nâng lên chút');
  const N = (...rows) => Object.fromEntries(V.map((v, i) => [v.id, { wallTouchFrames: Array(rows[i][0]).fill(0), wallFillFrames: Array(rows[i][1]).fill(0) }]));
  assert.equal(recommend(V, N([0, 0], [0, 0], [0, 0], [0, 0])), 'V1', 'nothing touches: the smallest asked change, never "keep" against the note');
  assert.equal(recommend(V, N([12, 3], [5, 0], [0, 0], [0, 2])), 'V2', 'the one that clears the wall');
  assert.equal(recommend(V, N([0, 0], [4, 0], [2, 0], [3, 1])), 'V0', 'every change touches more than the film camera');
});

test('a picked lift goes into the whole anchor window it touches; the rest stays', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(LIB, 'hm-ep01-r5/r5/xfer/CHASE.json'), 'utf8'));
  const v = variantsFromWords('nâng lên')[1], res = applyPick(spec, v, [1347, 1446]);
  assert.ok(res.ok);
  assert.deepEqual(res.changed, [{ f0: 1347, f1: 1514, dz0: 0, dz: v.up }]);
  assert.equal(res.spec.anchors[0].dz, v.up);
  assert.equal(res.spec.anchors[2].dz, -0.25, 'the lid anchor keeps its own dz');
  assert.deepEqual(res.spec.anchors.slice(1).map(a => a.dz), spec.anchors.slice(1).map(a => a.dz));
  const again = applyPick(res.spec, v, [1347, 1446]);
  assert.equal(again.spec.anchors[0].dz, 2 * v.up, 'a second pick adds on top');
  const spanning = applyPick(spec, { up: 0.5, aim: 'lift' }, [1500, 1520]);
  assert.deepEqual(spanning.changed.map(c => c.f0), [1347, 1514], 'a range across a cut lifts both windows');
  const back = JSON.parse(formatSpec(res.spec));
  assert.deepEqual(back, res.spec, 'the written file reads back the same');
  assert.equal(formatSpec(res.spec).split('\n').filter(l => l.includes('"f0"')).length, spec.anchors.length, 'one anchor per line');
});

test('a variant the anchors cannot hold is refused with the reason, nothing changes', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(LIB, 'hm-ep01-r5/r5/xfer/CHASE.json'), 'utf8'));
  for (const v of [{ up: 0.5, away: 0.5, from: 'wall', aim: 'lift' }, { closer: 1, aim: 'lift' }, { aim: 'hero' }, { up: 1, aim: 'film' }]) {
    const r = applyPick(spec, v, [1347, 1446]);
    assert.equal(r.ok, false); assert.ok(r.unsupported.length); assert.deepEqual(r.changed, []);
  }
});

test('pick writes the anchors and reruns the generator that reads them', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'camtry-')), film = path.join(tmp, 'films', 'x');
  fs.mkdirSync(path.join(film, 'r5', 'gen'), { recursive: true }); fs.mkdirSync(path.join(film, 'r5', 'xfer')); fs.mkdirSync(path.join(film, 'r5', 'tools'));
  fs.copyFileSync(path.join(LIB, 'hm-ep01-r5/r5/xfer/CHASE.json'), path.join(film, 'r5/xfer/CHASE.json'));
  fs.writeFileSync(path.join(film, 'r5/gen/CHASE.js'), '// generated by r5/tools/xfer.mjs CHASE from w.json with r5/xfer/CHASE.json; do not edit\nexport const FRAMES = [1347,1710];\n');
  fs.writeFileSync(path.join(film, 'r5/tools/xfer.mjs'), "import fs from 'node:fs'; fs.writeFileSync(new URL('../gen/ran.txt', import.meta.url), process.argv[2]);\n");
  const out = path.join(tmp, 'out'); fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, 'camtry.json'), JSON.stringify({ film, seg: 'CHASE', window: [1347, 1446], xfer: path.join(film, 'r5/xfer/CHASE.json'),
    variants: [{ id: 'V1', label: 'V1  nâng +0,5 m', up: 0.5, away: 0, closer: 0, aim: 'lift' }] }));
  const { run } = await import('../../kit/env.mjs');
  const r = run('node', [fileURLToPath(new URL('../../styles/stick-man/tools/camtry.mjs', import.meta.url)), 'pick', out, 'V1'], { capture: true });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(film, 'r5/xfer/CHASE.json'), 'utf8')).anchors[0].dz, 0.5);
  assert.equal(fs.readFileSync(path.join(film, 'r5/gen/ran.txt'), 'utf8'), 'CHASE', 'the act was regenerated');
  fs.rmSync(tmp, { recursive: true, force: true });
});
