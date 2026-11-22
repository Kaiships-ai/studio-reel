// A run log only grows (styles/stick-man/tools/run/logline.mjs). Hot Money ep01 r5, 19/11 23:08: a fix-round builder wrote
// review/r5/progress.md over with 4 lines; the 25 lines before it (16:08-20:05) are test/fixtures/hm-r5/progress-before.md,
// what it left is progress-after-overwrite.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { appendLine, logBroken, checkLogs } from '../../styles/stick-man/tools/run/logline.mjs';

const fx = n => fs.readFileSync(new URL(`../fixtures/hm-r5/${n}`, import.meta.url), 'utf8').trim().split('\n');

test('logline: the r5 overwrite is caught at the next append and by the check, naming the lines lost; appends pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logline-')), log = path.join(dir, 'review/r5/progress.md');
  for (const l of fx('progress-before.md')) assert.ok(appendLine(log, l).ok);
  assert.equal(logBroken(log), null);
  assert.deepEqual(checkLogs(dir), []);
  const before = fs.readFileSync(log, 'utf8');
  fs.writeFileSync(log, fx('progress-after-overwrite.md').join('\n') + '\n');           // what the builder did
  const r = appendLine(log, 'P1 s2 bag+bill done');
  assert.equal(r.ok, false); assert.match(r.why, /has 4 lines, 25 were appended .*gone \(written over\)/);
  assert.equal(fs.readFileSync(log, 'utf8'), fx('progress-after-overwrite.md').join('\n') + '\n', 'nothing appended to a broken log');
  assert.equal(checkLogs(dir).length, 1);
  fs.writeFileSync(log, before);                                                          // the orchestrator restores it
  assert.ok(appendLine(log, 'P1 s2 bag+bill done').ok);
  assert.match(fs.readFileSync(log, 'utf8').trim().split('\n').at(-1), /^- \d\d\/\d\d \d\d:\d\d P1 s2 bag\+bill done$/);
  fs.writeFileSync(log, fs.readFileSync(log, 'utf8').replace('16:14 LOAD-B', '16:14 LOAD-X'));   // an old line edited
  assert.match(logBroken(log), /first 26 lines changed/);
});
