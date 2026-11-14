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

test('freshness: key order and formatting do not count; script lines do; non-JSON falls back to mtime', () => {
  const d = tmp(), book = {};
  put(d, 'a/storyboard.json', SB); const h = judgedHash(path.join(d, 'a/storyboard.json'), 'storyboard.json');
  put(d, 'a/storyboard.json', JSON.stringify(SB)); assert.equal(judgedHash(path.join(d, 'a/storyboard.json'), 'storyboard.json'), h);
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'Ten million dollars.', beat: 'b1' }] }, 1000); put(d, 'review/fact.md', 'x', 2000);
  assert.equal(isFresh(d, 'review/fact.md', 'vo/script.json', book).fresh, true);
  put(d, 'vo/script.json', { lines: [{ id: 'l01', text: 'Ten million dollars.', beat: 'b2', class: 'number' }] }, 3000);
  assert.equal(isFresh(d, 'review/fact.md', 'vo/script.json', book).fresh, true, 'beat/class are notes');
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
});

test('K1: a shot added after the lock with a score between its neighbours is INFO; any change to a locked score or feel FAILs', () => {
  const lock = { scenes: [['A', 'dread'], ['B', 'relief']], shots: [['SH010', 3], ['SH020', 6], ['SH030', 4]] };
  const now = (shots, scenes = lock.scenes) => ({ scenes, shots });
  assert.deepEqual(storyLockDiff(lock, now([['SH010', 3], ['SH015', 5], ['SH020', 6], ['SH030', 4]])), { changed: [], added: ['SH015'] });
  assert.deepEqual(storyLockDiff(lock, now([['SH010', 3], ['SH015', 3], ['SH016', 6], ['SH020', 6]].concat([['SH030', 4]]))).added, ['SH015', 'SH016'], 'inclusive');
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH015', 7], ['SH020', 6], ['SH030', 4]])).changed[0], /SH015 added .*outside/);
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH015', 5], ['SH020', 7], ['SH030', 4]])).changed.join(), /SH020 story 6 → 7/);
  assert.match(storyLockDiff(lock, now(lock.shots, [['A', 'fear'], ['B', 'relief']])).changed[0], /scene A feel/);
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH030', 4]])).changed[0], /SH020 removed/);
  assert.match(storyLockDiff(lock, now([['SH010', 3], ['SH030', 4], ['SH020', 6]])).changed[0], /reordered/);
  assert.deepEqual(storyLockDiff(lock, now([['SH005', 3], ...lock.shots])).added, ['SH005'], 'at the start: equal to the one neighbour');
  assert.deepEqual(storyLockDiff({ hash: 'x' }, now(lock.shots)).changed, ['unknown'], 'an old hash-only lock still FAILs on any change');
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
});
