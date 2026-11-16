import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TOOL = path.join(ROOT, 'styles/stick-man/tools/timing.mjs');
const film = briefs => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'timing-'));
  fs.writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({ shots: [{ id: 'SH010', kind: 'action' }, { id: 'SH020', kind: 'card' }] }));
  if (briefs) { fs.mkdirSync(path.join(dir, 'review')); fs.writeFileSync(path.join(dir, 'review/acting.json'), JSON.stringify(briefs)); }
  return dir;
};
const run = dir => spawnSync(process.execPath, [TOOL, dir], { encoding: 'utf8' });

test('an action shot with no acting brief anywhere fails A5', () => {
  const dir = film(), r = run(dir);
  assert.equal(r.status, 1);
  assert.match(fs.readFileSync(path.join(dir, 'review/timing.md'), 'utf8'), /A5.*SH010/);
});

test('a brief in review/acting.json counts, so storyboard.json can stay as locked', () => {
  const dir = film({ SH010: { think: 'grab it', do: 'lifts the bag', change: 'confident -> dread' } });
  const r = run(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'review/timing.md'), 'utf8'), /PASS/);
});

test('a brief missing one part in review/acting.json still fails', () => {
  const r = run(film({ SH010: { think: 'grab it', do: 'lifts the bag' } }));
  assert.equal(r.status, 1);
});

test('an unreadable review/acting.json fails A5 with a message, not a crash', () => {
  const dir = film(); fs.mkdirSync(path.join(dir, 'review'), { recursive: true }); fs.writeFileSync(path.join(dir, 'review/acting.json'), '{bad');
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(fs.readFileSync(path.join(dir, 'review/timing.md'), 'utf8'), /acting\.json.*unreadable/);
});

test('a part on the shot and the rest in review/acting.json make one brief; a non-text value does not count', () => {
  const dir = film({ SH010: { think: 'grab it', do: 'lifts the bag', change: 'confident -> dread' } });
  const sb = { shots: [{ id: 'SH010', kind: 'action', acting: { think: 'just grab it' } }] };
  fs.writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify(sb));
  assert.equal(run(dir).status, 0);
  assert.equal(run(film({ SH010: { think: true, do: 'x', change: 'y' } })).status, 1);
});
