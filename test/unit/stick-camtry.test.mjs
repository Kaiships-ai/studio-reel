import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filmIndex, findFilm, resolve, movesOf, variantsFromWords, applyPick, formatSpec, readback, recommend } from '../../styles/stick-man/tools/camtry-core.mjs';

// a copy of Hot Money ep01 r5's act tables (r5/gen/*.js heads), its CHASE anchors and its CHASE test folder
const LIB = fileURLToPath(new URL('../fixtures/camtry/library', import.meta.url));
const index = filmIndex(path.join(LIB, 'hm-ep01-r5'));
const where = q => { const r = resolve(q, index); return { seg: r.seg?.id, take: r.take?.frames, window: r.window, change: r.change, anchors: r.anchors?.map(a => [a.f0, a.f1]), r }; };

test('the newest film is found, not its segment test folder; a named film wins', () => {
  assert.equal(path.basename(findFilm(LIB, 'đoạn đua xe')), 'hm-ep01-r5');
  assert.equal(path.basename(findFilm(LIB, 'phim hm-ep01-r5, mở đầu')), 'hm-ep01-r5');
});

test('"đoạn đua xe" is the whole chase: every take rendered and changed, all its anchors, booted from the test folder', () => {
  const w = where('đoạn đua xe, máy quay dính tường nhà, nâng lên chút');
  assert.equal(w.seg, 'CHASE');
  assert.deepEqual(w.window, [1347, 1709]);
  assert.deepEqual(w.change, [1347, 1709]);
  assert.equal(w.take, undefined, 'no single take');
  assert.equal(w.r.takes.length, 3);
  assert.deepEqual(w.anchors, [[1347, 1514], [1514, 1638], [1638, 1653], [1709, 1710]]);
  assert.equal(path.basename(w.r.seg.boot), 'hm-ep01-r5-chase');
  assert.match(readback(w.r, movesOf('nâng lên chút')), /^Em hiểu là: phim hm-ep01-r5, đoạn CHASE, xem cả đoạn khung 1347-1709 \(3 take\), phương án đổi cả đoạn, máy quay neo 1347-1513, .*; máy nâng/);
});

test('a narrower phrase changes one take; the clip is still the whole segment', () => {
  for (const [q, take] of [['đoạn đầu cuộc đua, nâng lên', [1347, 1513]], ['đua xe take 2', [1514, 1637]], ['đoạn cuối cuộc đua', [1638, 1709]]]) {
    const w = where(q);
    assert.equal(w.seg, 'CHASE', q);
    assert.deepEqual(w.window, [1347, 1709], `${q}: renders the whole chase`);
    assert.deepEqual(w.take, take, q);
    assert.deepEqual(w.change, take, `${q}: the change is the take (its anchors end with it)`);
  }
  assert.deepEqual(where('đoạn đầu cuộc đua').anchors, [[1347, 1514]]);
  assert.match(readback(where('đoạn đầu cuộc đua').r), /xem cả đoạn khung 1347-1709 \(3 take\), phương án đổi khung 1347-1513 \(take 1 "1 LAO RA/);
});

test('"ngân hàng thứ hai" changes the second bank, inside the whole BANKS segment', () => {
  const w = where('cảnh ngân hàng thứ hai, máy gần quá');
  assert.equal(w.seg, 'BANKS');
  assert.deepEqual(w.take, [1934, 2024]);
  assert.deepEqual(w.change, [1934, 2024]);
  assert.deepEqual(w.window, [1710, 2203]);
  assert.match(w.r.stage[2], /BANK 2/);
  assert.equal(where('ngân hàng thứ 3').take[0], 2025);
});

test('"mở đầu" is the whole opening segment', () => {
  const w = where('mở đầu, máy thấp quá');
  assert.equal(w.seg, 'OPEN');
  assert.deepEqual(w.window, [0, 203]);
  assert.deepEqual(w.change, [0, 203]);
});

test('notes match with or without marks, in English, and only on whole words', () => {
  assert.equal(where('doan dua xe, nang len chut').seg, 'CHASE');
  assert.deepEqual(where('doan dau cuoc dua').take, [1347, 1513]);
  assert.equal(where('the chase, camera too close to the wall').seg, 'CHASE');
  assert.equal(where('Download the opening').seg, 'OPEN', '"download" is not "load"');
  assert.equal(where('day camera raise').seg, undefined, '"day" alone is not the day take');
  assert.equal(where('kết quả tốt').seg, undefined, '"kết quả" is not the ending');
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

test('camera words without marks and in English; a vague note says so and gets 3-4 variants an anchor can hold', () => {
  assert.deepEqual(variantsFromWords('nang len chut').map(v => v.up), [0, 0.5, 1]);
  assert.deepEqual(movesOf('raise a bit').moves, ['up']);
  assert.deepEqual(movesOf('lift the camera').moves, ['up']);
  assert.deepEqual(movesOf('lower it').moves, ['down']);
  assert.deepEqual(movesOf('closer').moves, ['closer']);
  assert.deepEqual(movesOf('move away').moves, ['away']);
  assert.ok(variantsFromWords('the chase, camera too close to the wall, raise a bit').some(v => v.up > 0 && v.away > 0 && v.from === 'wall'));
  const vague = variantsFromWords('máy quay đẹp hơn');
  assert.ok(movesOf('máy quay đẹp hơn').vague);
  assert.ok(vague.length >= 3 && vague.length <= 4);
  assert.ok(vague.slice(1).every(v => v.up && !v.away && !v.closer && v.aim === 'lift'), 'only moves pick can write');
  assert.match(readback(where('đoạn đua xe, máy quay đẹp hơn').r, movesOf('máy quay đẹp hơn')), /chưa rõ hướng máy/);
  assert.equal(variantsFromWords('nhìn vào xe').length, 3);
});


test('the recommendation is the smallest asked change pick can write that clears the walls', () => {
  const V = variantsFromWords('máy quay dính tường nhà, nâng lên chút');
  const N = (...rows) => Object.fromEntries(V.map((v, i) => [v.id, { wallTouchFrames: Array(rows[i][0]).fill(0), wallFillFrames: Array(rows[i][1]).fill(0) }]));
  assert.deepEqual(recommend(V, N([0, 0], [0, 0], [0, 0], [0, 0])), { id: 'V1', manual: false }, 'nothing touches: the smallest asked change');
  assert.deepEqual(recommend(V, N([12, 3], [5, 0], [0, 0], [0, 2])), { id: 'V2', manual: false }, 'the one that clears the wall');
  assert.deepEqual(recommend(V, N([0, 0], [4, 0], [2, 0], [3, 1])), { id: 'V0', manual: false }, 'every change touches more than the film camera');
  assert.deepEqual(recommend(V, N([9, 0], [5, 0], [4, 0], [0, 0])), { id: 'V2', manual: false }, 'V3 (off the wall) clears best but pick cannot write it');
  const away = variantsFromWords('ra xa');
  const M = Object.fromEntries(away.map((v, i) => [v.id, { wallTouchFrames: Array([5, 1, 0][i]).fill(0), wallFillFrames: [] }]));
  assert.deepEqual(recommend(away, M), { id: 'V2', manual: true }, 'no writable change: the best one, marked by hand');
});

test('a picked lift goes into the whole anchor window it touches; the rest stays', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(LIB, 'hm-ep01-r5/r5/xfer/CHASE.json'), 'utf8'));
  const v = variantsFromWords('nâng lên')[1], res = applyPick(spec, v, [1347, 1446]);
  assert.ok(res.ok);
  assert.deepEqual(res.changed, [{ f0: 1347, f1: 1514, dz0: 0, dz: v.up }]);
  assert.equal(res.spec.anchors[0].dz, v.up);
  assert.equal(res.spec.anchors[2].dz, -0.25, 'the lid anchor keeps its own dz');
  assert.deepEqual(res.spec.anchors.slice(1).map(a => a.dz), spec.anchors.slice(1).map(a => a.dz));
  const base = { '1347-1514': 0 };
  const again = applyPick(applyPick(spec, v, [1347, 1446], base).spec, v, [1347, 1446], base);
  assert.equal(again.spec.anchors[0].dz, v.up, 'the same pick twice does not stack');
  assert.deepEqual(again.changed, []);
  assert.equal(applyPick(res.spec, { up: 0, aim: 'film' }, [1347, 1446], base).spec.anchors[0].dz, 0, 'V0 puts the anchor back');
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

function pickFixture(tool = "import fs from 'node:fs'; fs.writeFileSync(new URL('../gen/ran.txt', import.meta.url), process.argv[2]);\n") {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'camtry-')), film = path.join(tmp, 'films', 'x');
  fs.mkdirSync(path.join(film, 'r5', 'gen'), { recursive: true }); fs.mkdirSync(path.join(film, 'r5', 'xfer')); fs.mkdirSync(path.join(film, 'r5', 'tools'));
  fs.writeFileSync(path.join(film, 'reel.js'), '');
  fs.copyFileSync(path.join(LIB, 'hm-ep01-r5/r5/xfer/CHASE.json'), path.join(film, 'r5/xfer/CHASE.json'));
  fs.writeFileSync(path.join(film, 'r5/gen/CHASE.js'), '// generated by r5/tools/xfer.mjs CHASE from w.json with r5/xfer/CHASE.json; do not edit\nexport const FRAMES = [1347,1710];\n');
  fs.writeFileSync(path.join(film, 'r5/tools/xfer.mjs'), tool);
  const out = path.join(tmp, 'out'); fs.mkdirSync(out);
  const J = { film, seg: 'CHASE', window: [1347, 1709], change: [1347, 1513], xfer: path.join(film, 'r5/xfer/CHASE.json'), anchors: [{ f0: 1347, f1: 1514 }],
    variants: [{ id: 'V0', label: 'V0  giữ nguyên', up: 0, away: 0, closer: 0, aim: 'film' }, { id: 'V1', label: 'V1  nâng +0,5 m', up: 0.5, away: 0, closer: 0, aim: 'lift' }] };
  fs.writeFileSync(path.join(out, 'camtry.json'), JSON.stringify(J));
  const dz = () => JSON.parse(fs.readFileSync(J.xfer, 'utf8')).anchors[0].dz ?? 0;
  return { tmp, film, out, J, dz, done: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}
const pickCli = async (...args) => { const { run } = await import('../../kit/env.mjs');
  return run('node', [fileURLToPath(new URL('../../styles/stick-man/tools/camtry.mjs', import.meta.url)), 'pick', ...args], { capture: true }); };

test('pick writes the anchors, keeps a backup, reruns the generator; the same pick twice does not stack; V0 puts it back', async () => {
  const x = pickFixture();
  let r = await pickCli(x.out, 'V1');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(x.dz(), 0.5);
  assert.equal(fs.readFileSync(path.join(x.film, 'r5/gen/ran.txt'), 'utf8'), 'CHASE', 'the act was regenerated');
  assert.equal(JSON.parse(fs.readFileSync(`${x.J.xfer}.bak`, 'utf8')).anchors[0].dz, undefined, 'the backup is the file before the pick');
  r = await pickCli(x.out, 'V1');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(x.dz(), 0.5, 'picking twice does not stack');
  r = await pickCli(x.out, 'V0');
  assert.equal(x.dz(), 0, 'V0 restores the previs-run dz');
  x.done();
});

test('pick --dry (bare or with a value) writes nothing', async () => {
  const x = pickFixture(), before = fs.readFileSync(x.J.xfer, 'utf8');
  for (const args of [['--dry'], ['--dry', '1'], ['--dry', 'true']]) {
    const r = await pickCli(x.out, 'V1', ...args);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /dz 0 -> 0.5/);
  }
  assert.equal(fs.readFileSync(x.J.xfer, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(x.film, 'r5/gen/ran.txt')), false);
  x.done();
});

test('pick refuses an anchors file outside the film', async () => {
  const x = pickFixture(), other = path.join(x.tmp, 'elsewhere.json');
  fs.copyFileSync(x.J.xfer, other);
  fs.writeFileSync(path.join(x.out, 'camtry.json'), JSON.stringify({ ...x.J, xfer: other }));
  const before = fs.readFileSync(other, 'utf8'), r = await pickCli(x.out, 'V1');
  assert.equal(r.status, 2);
  assert.equal(fs.readFileSync(other, 'utf8'), before);
  x.done();
});

test('a failing generator puts the anchors and the act back', async () => {
  const x = pickFixture("import fs from 'node:fs'; fs.writeFileSync(new URL('../gen/CHASE.js', import.meta.url), 'broken'); process.exit(3);\n");
  const xfer = fs.readFileSync(x.J.xfer, 'utf8'), gen = fs.readFileSync(path.join(x.film, 'r5/gen/CHASE.js'), 'utf8');
  const r = await pickCli(x.out, 'V1');
  assert.equal(r.status, 3);
  assert.equal(fs.readFileSync(x.J.xfer, 'utf8'), xfer);
  assert.equal(fs.readFileSync(path.join(x.film, 'r5/gen/CHASE.js'), 'utf8'), gen);
  x.done();
});

test('--frames is checked: A-B, in order, inside the segment', async () => {
  const { run } = await import('../../kit/env.mjs'), cli = fileURLToPath(new URL('../../styles/stick-man/tools/camtry.mjs', import.meta.url));
  const film = path.join(LIB, 'hm-ep01-r5'), out = fs.mkdtempSync(path.join(os.tmpdir(), 'camtry-'));
  for (const bad of ['abc', '1500-1400', '1000-1500', '1400-1800']) {
    const r = run('node', [cli, 'đoạn đua xe, nâng lên', '--film', film, '--frames', bad, '--out', out, '--dry'], { capture: true });
    assert.equal(r.status, 2, bad);
  }
  const ok = run('node', [cli, 'đoạn đua xe, nâng lên', '--film', film, '--frames', '1400-1500', '--out', out, '--dry'], { capture: true });
  assert.equal(ok.status, 0, ok.stderr);
  const J = JSON.parse(fs.readFileSync(path.join(out, 'camtry.json'), 'utf8'));
  assert.deepEqual([J.window, J.change], [[1400, 1500], [1400, 1500]]);
  fs.rmSync(out, { recursive: true, force: true });
});
