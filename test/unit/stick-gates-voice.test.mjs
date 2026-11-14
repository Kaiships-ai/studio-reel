// Stick-man gate and voice tools, lessons from Hot Money ep. 1: a review stays fresh until what it judged changes (not
// the file's mtime), a shot added after the story lock with an in-between score is not a K1 FAIL, whisper's digits
// match the script's words, and planned pauses go into the take once.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, env, run } from '../../kit/env.mjs';
import { isFresh, judgedHash } from '../../styles/stick-man/tools/fresh.mjs';
import { storyLockDiff } from '../../styles/stick-man/tools/storylock.mjs';

const TOOLS = path.join(ROOT, 'styles/stick-man/tools');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'stick-'));
const put = (dir, rel, data, t) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 1)); if (t) fs.utimesSync(p, t, t); };
const SB = { fps: 30, scenes: [{ id: 'A', feel: 'dread', purpose: 'set up' }],
  shots: [{ id: 'SH010', scene: 'A', size: 'WS', angle: 'eye', lens: 35, move: 'push', f0: 0, story: 3, purpose: 'P1 · the alley', panels: ['p/1.png'] },
    { id: 'SH020', scene: 'A', size: 'CU', angle: 'low', lens: 85, move: 'static', dur: 40, story: 5, purpose: 'P2 · the bag' }] };
const hasPython = () => { try { return !!env().tools?.python && fs.existsSync(env().tools.python); } catch { return false; } };

test('storyboard freshness: options for other picks, notes and purposes keep a review fresh; a visible change makes it stale', () => {
  const d = tmp(), book = {};
  put(d, 'storyboard.json', SB, 1000); put(d, 'review/retell.md', 'by: agent:r1\n', 2000);
  assert.equal(isFresh(d, 'review/retell.md', 'storyboard.json', book).fresh, true);
  assert.ok(book['review/retell.md']['storyboard.json'].hash, 'the judged hash is recorded');
  const meta = structuredClone(SB);
  meta.shots[1].options = { safe: { size: 'MCU' }, bold: { size: 'ECU', lens: 135 } }; meta.shots[0].notes = 'later'; meta.scenes[0].purpose = 'other';
  put(d, 'storyboard.json', meta, 3000);
  assert.equal(isFresh(d, 'review/retell.md', 'storyboard.json', book).fresh, true, 'metadata-only edit');
  meta.shots[1].pick = 'bold'; put(d, 'storyboard.json', meta, 4000);
  const r = isFresh(d, 'review/retell.md', 'storyboard.json', book);
  assert.equal(r.fresh, false, 'picking an option changes the picture'); assert.match(r.why, /stale/);
  delete meta.shots[1].pick; meta.shots[0].size = 'FS'; put(d, 'storyboard.json', meta, 5000);
  assert.equal(isFresh(d, 'review/retell.md', 'storyboard.json', book).fresh, false, 'a size change');
  put(d, 'review/retell.md', 'by: agent:r2\n', 6000);
  assert.equal(isFresh(d, 'review/retell.md', 'storyboard.json', book).fresh, true, 'a new review records the new state');
});

test('freshness hashes everything but metadata: on, overlays, cam2d, the picked panels, screen_dir go stale', () => {
  const base = structuredClone(SB); base.shots[1].options = { emo: { panels: ['p/2a.png'] }, bold: { lens: 135 } }; base.shots[1].pick = 'emo';
  const edits = {
    on: s => { s.shots[0].on = ['l02']; }, overlay: s => { s.shots[0].overlays = [{ img: 'x.png' }]; }, cam2d: s => { s.shots[0].cam2d = { from: [0, 0, 1], to: [0, 0, 1.2] }; },
    'picked panels': s => { s.shots[1].options.emo.panels = ['p/2b.png']; }, screen_dir: s => { s.shots[0].screen_dir = 'L>R'; },
    'scene field': s => { s.scenes[0].set = 'alley'; }, 'top-level key': s => { s.last = 300; },
  };
  for (const [what, edit] of Object.entries(edits)) {
    const d = tmp(), book = {}; put(d, 'storyboard.json', base, 1000); put(d, 'review/r.md', 'x', 2000);
    assert.equal(isFresh(d, 'review/r.md', 'storyboard.json', book).fresh, true);
    const m = structuredClone(base); edit(m); put(d, 'storyboard.json', m, 3000);
    assert.equal(isFresh(d, 'review/r.md', 'storyboard.json', book).fresh, false, what);
  }
  const d = tmp(), book = {}; put(d, 'storyboard.json', base, 1000); put(d, 'review/r.md', 'x', 2000); isFresh(d, 'review/r.md', 'storyboard.json', book);
  const m = structuredClone(base); m.shots[1].options.bold.size = 'ECU'; m.shots[1].options.safe = { size: 'MS' }; m.shots[0].why = 'because'; m.shots[0].comments = ['ok'];
  put(d, 'storyboard.json', m, 3000);
  assert.equal(isFresh(d, 'review/r.md', 'storyboard.json', book).fresh, true, 'options of non-picked keys and metadata');
});

test('freshness: key order and formatting do not count; script lines do; non-JSON falls back to mtime', () => {
  const d = tmp(), book = {};
  put(d, 'a/storyboard.json', SB); const h = judgedHash(path.join(d, 'a/storyboard.json'), 'storyboard.json');
  put(d, 'a/storyboard.json', JSON.stringify(SB)); assert.equal(judgedHash(path.join(d, 'a/storyboard.json'), 'storyboard.json'), h);
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'Ten million dollars.', beat: 'b1' }] }, 1000); put(d, 'review/fact.md', 'x', 2000);
  assert.equal(isFresh(d, 'review/fact.md', 'vo/script.json', book).fresh, true);
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'Ten million dollars.', beat: 'b1', notes: 'check the source' }] }, 3000);
  assert.equal(isFresh(d, 'review/fact.md', 'vo/script.json', book).fresh, true, 'notes do not count');
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'Nine million dollars.' }] }, 4000);
  assert.equal(isFresh(d, 'review/fact.md', 'vo/script.json', book).fresh, false);
  put(d, 'review/hook-thumbs.jpg', 'jpg', 5000); put(d, 'review/hook-test.md', 'x', 4500);
  assert.equal(isFresh(d, 'review/hook-test.md', 'review/hook-thumbs.jpg', book).fresh, false);
});

test('stagegate end to end: a metadata edit to storyboard.json leaves the judged row fresh (review/.fresh.json)', () => {
  const d = tmp();
  put(d, 'storyboard.json', SB, 1000);
  for (const f of ['retell.md', 'swipe.md']) put(d, `review/${f}`, 'by: agent:fresh-1\nof: storyboard v1\n\n# Guesses\n', 2000);
  const gate = () => { run('node', [path.join(TOOLS, 'stagegate.mjs'), d, '2a'], { capture: true }); return fs.readFileSync(path.join(d, 'review/gate-2a.md'), 'utf8'); };
  assert.match(gate(), /\| judged \| review\/retell\.md \| PASS \|/);
  const meta = structuredClone(SB); meta.shots[0].options = { emo: { lens: 135 } }; put(d, 'storyboard.json', meta, 3000);
  assert.match(gate(), /\| judged \| review\/retell\.md \| PASS \|/);
  meta.shots[0].lens = 50; put(d, 'storyboard.json', meta, 4000);
  assert.match(gate(), /\| judged \| review\/retell\.md \| FAIL \| .*stale/);
  const before = fs.statSync(path.join(d, 'review/.fresh.json')).mtimeMs; fs.utimesSync(path.join(d, 'review/.fresh.json'), 10, 10);
  gate(); assert.equal(fs.statSync(path.join(d, 'review/.fresh.json')).mtimeMs, 10000, 'not rewritten when nothing changed'); assert.ok(before);
  put(d, 'review/.fresh.json', '{ not json');
  const p = run('node', [path.join(TOOLS, 'stagegate.mjs'), d, '2a'], { capture: true });
  assert.match(p.stderr, /unreadable/); assert.equal(p.signal, null);
  assert.match(fs.readFileSync(path.join(d, 'review/gate-2a.md'), 'utf8'), /\| judged \| review\/retell\.md \| FAIL \|/, 'no record: mtime decides');
  JSON.parse(fs.readFileSync(path.join(d, 'review/.fresh.json'), 'utf8'));
});

test('GATES.json: the 2a reviews that hear the voice go stale with a new take', async () => {
  const g = JSON.parse(fs.readFileSync(path.join(TOOLS, 'GATES.json'), 'utf8')).gates['2a'].evidence, by = f => g.find(e => e.file === f).newerThan;
  for (const f of ['review/watch-1x.md', 'review/swipe.md']) assert.ok(by(f).includes('vo/vo.wav') && by(f).includes('vo/words.json'), f);
  assert.ok(by('review/retell.md').includes('vo/words.json'));
});

test('K1: a shot added after the lock with a score between its neighbours is INFO; any change to a locked score or feel FAILs', () => {
  const lock = { scenes: [['A', 'dread'], ['B', 'relief']], shots: [['SH010', 3], ['SH020', 6], ['SH030', 4]] };
  const now = (shots, scenes = lock.scenes) => ({ scenes, shots });
  const r0 = storyLockDiff(lock, now([['SH010', 3], ['SH015', 5], ['SH020', 6], ['SH030', 4]]));
  assert.deepEqual([r0.changed, r0.added], [[], ['SH015']]);
  assert.match(r0.info[0], /no scene ids/, 'an old lock without scene ids keeps working, scene check skipped');
  assert.deepEqual(storyLockDiff(lock, now([['SH010', 3], ['SH015', 3], ['SH016', 6], ['SH020', 6]].concat([['SH030', 4]]))).added, ['SH015', 'SH016'], 'inclusive');
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH015', 7], ['SH020', 6], ['SH030', 4]])).changed[0], /SH015 added .*outside/);
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH015', 5], ['SH020', 7], ['SH030', 4]])).changed.join(), /SH020 story 6 → 7/);
  assert.match(storyLockDiff(lock, now(lock.shots, [['A', 'fear'], ['B', 'relief']])).changed[0], /scene A feel/);
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH030', 4]])).changed[0], /SH020 removed/);
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH030', 4], ['SH020', 6]])).changed[0], /reordered/);
  assert.deepEqual(storyLockDiff(lock, now([['SH005', 3], ...lock.shots])).added, ['SH005'], 'at the start: equal to the one neighbour');
  assert.deepEqual(storyLockDiff({ hash: 'x' }, now(lock.shots)).changed, ['unknown'], 'an old hash-only lock still FAILs on any change');
  const three = now([['SH010', 3], ['SH011', 4], ['SH012', 5], ['SH013', 5], ['SH020', 6], ['SH030', 4]]);
  const r3 = storyLockDiff(lock, three);
  assert.match(r3.changed.join(), /too many shots added in one gap \(3 between SH010…SH020, max 2\)/); assert.deepEqual(r3.added, []);
  const two = storyLockDiff(lock, now([['SH010', 3], ['SH011', 4], ['SH020', 6], ['SH025', 5], ['SH026', 4], ['SH030', 4]]));
  assert.deepEqual([two.changed, two.added], [[], ['SH011', 'SH025', 'SH026']], 'two per gap is fine');
});

test('K1 with scene ids: a locked shot moved to another scene FAILs, the same scene passes', () => {
  const lock = { scenes: [['A', 'dread'], ['B', 'relief']], shots: [['SH010', 3, 'A'], ['SH020', 6, 'A'], ['SH030', 4, 'B']] };
  const ok = storyLockDiff(lock, { scenes: lock.scenes, shots: [['SH010', 3, 'A'], ['SH015', 4, 'A'], ['SH020', 6, 'A'], ['SH030', 4, 'B']] });
  assert.deepEqual([ok.changed, ok.added, ok.info], [[], ['SH015'], []]);
  const moved = storyLockDiff(lock, { scenes: lock.scenes, shots: [['SH010', 3, 'A'], ['SH020', 6, 'B'], ['SH030', 4, 'B']] });
  assert.match(moved.changed.join(), /SH020 moved from scene A to B/);
});

test('align: whisper digit tokens become the words a script writes', { skip: !hasPython() && 'no pixi python' }, () => {
  const cases = { '238': 'two hundred thirty-eight', '$9,000': 'nine thousand', '100,000': 'one hundred thousand', '1,': 'one',
    '10,000': 'ten thousand', '34': 'thirty-four', '2,500,000': 'two million five hundred thousand', '50%': 'fifty percent', '7.': 'seven', 'ten': null, '3.5': null };
  const p = run('python', ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(TOOLS)}); from numwords import words; print(json.dumps({k: words(k) for k in json.loads(sys.argv[1])}))`, JSON.stringify(Object.keys(cases))], { capture: true });
  assert.equal(p.status, 0, p.stderr);
  assert.deepEqual(JSON.parse(p.stdout), cases);
});

test('pause.py: pause_after inserts silence after the line, shifts later words, and a second run changes nothing', { skip: !hasPython() && 'no pixi python' }, () => {
  const d = tmp(), rate = 1000;
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'One two' }, { id: 'l02', text: 'Three', pause_after: 0.5 }, { id: 'l03', text: 'Four' }] });
  put(d, 'vo/words.json', [{ line: 'l01', i: 0, word: 'One', t0: 0.1, t1: 0.3 }, { line: 'l01', i: 1, word: 'two', t0: 0.35, t1: 0.5 },
    { line: 'l02', i: 0, word: 'Three', t0: 0.7, t1: 0.9 }, { line: 'l03', i: 0, word: 'Four', t0: 1.3, t1: 1.6 }]);
  const mk = `import wave, sys; w = wave.open(sys.argv[1], 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(${rate}); w.writeframes(b'\\x01\\x00' * 2000); w.close()`;
  assert.equal(run('python', ['-c', mk, path.join(d, 'vo/vo.wav')], { capture: true }).status, 0);
  const pause = () => { const p = run('python', [path.join(TOOLS, 'pause.py'), d], { capture: true }); assert.equal(p.status, 0, p.stderr); };
  const frames = `import wave, sys; w = wave.open(sys.argv[1]); d = w.readframes(w.getnframes()); print(w.getnframes(), d[2200:2202].hex(), d[1998:2000].hex())`;
  pause();
  const [n, mid, before] = run('python', ['-c', frames, path.join(d, 'vo/vo.wav')], { capture: true }).stdout.trim().split(' ');
  assert.equal(Number(n), 2500, '+0.5 s');
  assert.equal(before, '0100', 'audio before the gap midpoint (1.1 s) is the take');
  assert.equal(mid, '0000', 'silence right after the midpoint');
  const w1 = JSON.parse(fs.readFileSync(path.join(d, 'vo/words.json'), 'utf8'));
  assert.deepEqual(w1.map(w => w.t0), [0.1, 0.35, 0.7, 1.8]);
  const snap = () => ['vo/vo.wav', 'vo/words.json'].map(f => fs.readFileSync(path.join(d, f)).toString('base64'));
  const s1 = snap(); pause(); assert.deepEqual(snap(), s1, 'idempotent');
  // re-aligned on the paused take: the words are moved back before they are kept, so nothing doubles
  fs.writeFileSync(path.join(d, 'vo/words.json'), JSON.stringify(w1)); pause();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(d, 'vo/words.json'), 'utf8')).map(w => w.t0), [0.1, 0.35, 0.7, 1.8]);
  // a changed pause_after is applied once, from the no-pause take (not on top of the old pause)
  const sc = JSON.parse(fs.readFileSync(path.join(d, 'vo/script.json'), 'utf8')); sc.lines[1].pause_after = 1.2; put(d, 'vo/script.json', sc);
  pause();
  assert.equal(Number(run('python', ['-c', frames, path.join(d, 'vo/vo.wav')], { capture: true }).stdout.split(' ')[0]), 3200, '2000 + 1200 frames');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(d, 'vo/words.json'), 'utf8')).map(w => w.t0), [0.1, 0.35, 0.7, 2.5]);
  assert.equal(fs.readdirSync(path.join(d, 'vo')).filter(f => /\.(tmp|new)$/.test(f)).length, 0, 'no temp files left');
  // the no-pause take deleted while pauses.json exists: an error, never a copy of the paused take
  fs.rmSync(path.join(d, 'vo/vo-nopause.wav'));
  const p = run('python', [path.join(TOOLS, 'pause.py'), d], { capture: true });
  assert.notEqual(p.status, 0); assert.match(p.stderr, /vo-nopause\.wav is missing/);
  assert.ok(!fs.existsSync(path.join(d, 'vo/vo-nopause.wav')));
});

test('pause.py: a 32-bit float wav is a clear error', { skip: !hasPython() && 'no pixi python' }, () => {
  const d = tmp();
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'One', pause_after: 0.2 }] });
  put(d, 'vo/words.json', [{ line: 'l01', i: 0, word: 'One', t0: 0.1, t1: 0.3 }]);
  // WAVE_FORMAT_IEEE_FLOAT (3), mono, 1 kHz, 32-bit, 100 samples of 0.0
  const mk = `import struct, sys; n = 100; d = b'\\0' * 4 * n
open(sys.argv[1], 'wb').write(b'RIFF' + struct.pack('<I', 36 + len(d)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 3, 1, 1000, 4000, 4, 32) + b'data' + struct.pack('<I', len(d)) + d)`;
  assert.equal(run('python', ['-c', mk, path.join(d, 'vo/vo.wav')], { capture: true }).status, 0);
  const p = run('python', [path.join(TOOLS, 'pause.py'), d], { capture: true });
  assert.notEqual(p.status, 0); assert.match(p.stderr, /32-bit float wav must be converted/);
});
