// The blind A|B tool (styles/stick-man/tools/review/abtest.mjs): sides shuffled by seed, a key file, a side-by-side clip and a
// contact sheet at phone size, a verdict mapped back through the key. The reviewer is a stub; no model is called.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { run, env } from '../../kit/env.mjs';
import { abtest, pickSides, verdictOf } from '../../styles/stick-man/tools/review/abtest.mjs';

test('pickSides: the same seed gives the same sides, both sides are used, A and B are old and new', () => {
  assert.deepEqual([pickSides(7).A, pickSides(7).B], [pickSides(7).A, pickSides(7).B]);
  const a = new Set(Array.from({ length: 20 }, (_, i) => pickSides(i).A));
  assert.deepEqual([...a].sort(), ['new', 'old']);
  const s = pickSides(3); assert.notEqual(s.A, s.B);
});
test('verdictOf maps the reviewer winner through the key and refuses a tie', () => {
  const key = { A: 'old', B: 'new' };
  assert.deepEqual(verdictOf({ winner: 'b', reasons: ['clearer'] }, key), { winner: 'B', new_wins: true, reasons: ['clearer'], advisory: true, key });
  assert.equal(verdictOf({ winner: 'A', reasons: 'x' }, key).new_wins, false);
  assert.throws(() => verdictOf({ winner: 'tie' }, key), /not A or B/);
});

const T = env().tools, skip = !(T?.ffmpeg && T?.ffprobe) && 'needs ffmpeg (pixi run studio install)';
const clip = (f, src, dur) => run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `${src}=size=270x480:rate=30:duration=${dur}`, '-pix_fmt', 'yuv420p', f], { capture: true });
test('abtest builds sbs.mp4 (720 x 640) and a sheet, records the key, never shows the reviewer which is new', { skip }, async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'abtest-')), old = path.join(d, 'old.mp4'), neu = path.join(d, 'new.mp4');
  assert.equal(clip(old, 'testsrc', 2).status, 0); assert.equal(clip(neu, 'smptebars', 3).status, 0);
  let seen;
  const review = async (content, system) => { seen = { content, system }; return { winner: 'A', reasons: ['stub'] }; };
  const out = path.join(d, 'out'), v = await abtest({ old, new: neu, out, seed: 5, review });
  const key = JSON.parse(fs.readFileSync(path.join(out, 'key.json'), 'utf8'));
  assert.deepEqual(key, { seed: 5, A: pickSides(5).A, B: pickSides(5).B });
  assert.equal(v.new_wins, key.A === 'new');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'verdict.json'), 'utf8')), v);
  const dims = run('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(out, 'sbs.mp4')], { capture: true });
  assert.equal(dims.stdout.trim(), '720,640');
  assert.ok(fs.statSync(path.join(out, 'sheet.jpg')).size > 1000);
  assert.deepEqual(seen.content.map(c => c.type), ['text', 'image']);
  assert.ok(!JSON.stringify(seen.content[0]).match(/old\.mp4|new\.mp4/), 'file names stay out of the prompt');
  assert.deepEqual(fs.readdirSync(out).sort(), ['key.json', 'sbs.mp4', 'sheet.jpg', 'verdict.json']);
});
