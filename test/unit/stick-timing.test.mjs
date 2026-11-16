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
