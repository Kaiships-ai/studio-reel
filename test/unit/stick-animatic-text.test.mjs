// animatic.mjs draws a shot's `text` entries: the same `box` shapes as the engine overlay, and any characters in the words.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boxOf, ffColor, textFilter } from '../../styles/stick-man/tools/animatic-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = { font: '/f.ttf', file: '/t.txt', size: 30, W: 540, x: 'w*0.5-tw/2', y: 'h*0.4-th/2', enable: 'between(n,0,9)' };

test('box: true is the engine ink at 82 %', () => {
  assert.deepEqual(boxOf(true, 30, 540), { color: '0x262124@0.82', pad: 11 });
});
test('box: { color, alpha, pad } becomes a drawtext box; pad scales from 1080 wide', () => {
  assert.deepEqual(boxOf({ color: '#c62828', alpha: 0.92, pad: 40 }, 30, 540), { color: '0xc62828@0.92', pad: 20 });
  assert.equal(boxOf({ color: '#fff' }, 30, 540).color, '0xffffff@0.82');
});
test('box: an ffmpeg colour string still works; false or none draws no box', () => {
  assert.equal(boxOf('black@0.62', 30, 540).color, 'black@0.62');
  assert.equal(boxOf(undefined, 30, 540), null);
  assert.ok(!textFilter({ ...base, box: false }).includes('box=1'));
});
test('an object box never reaches ffmpeg as "[object Object]"', () => {
  assert.ok(!textFilter({ ...base, box: { color: '#c62828' } }).includes('object'));
  assert.match(textFilter({ ...base, box: { color: '#c62828' } }), /boxcolor=0xc62828@0\.82/);
});
test('words are drawn literally: no % expansion', () => {
  assert.match(textFilter({ ...base, box: true }), /expansion=none/);
  assert.equal(ffColor('#abc'), '0xaabbcc');
});

// end to end: the real animatic render with a boxed object and a % in the words
const ff = spawnSync(path.join(ROOT, '.pixi/envs/default/bin/ffmpeg'), ['-version']).status === 0 || spawnSync('ffmpeg', ['-version']).status === 0;
test('animatic renders a shot whose text has %, a colon, a quote and an object box', { skip: !ff && 'no ffmpeg' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'animatic-text-'));
  fs.writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({ fps: 30, shots: [{ id: 'SH010', size: 'MS', move: 'static', dur: 6,
    text: [{ text: "SUSPICION 35%: it's 100%\\ done", at: [0.5, 0.4], box: { color: '#c62828', alpha: 0.92, pad: 20 } }, { text: '50% %{n}', box: true }] }] }));
  const r = spawnSync('node', [path.join(ROOT, 'styles/stick-man/tools/animatic.mjs'), dir, '--v', '1', '--size', '216x384'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, 'review/animatic_v001.mp4')));
  fs.rmSync(dir, { recursive: true, force: true });
});
