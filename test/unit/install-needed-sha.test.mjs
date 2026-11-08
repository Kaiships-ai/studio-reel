import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { tierNeeded, zipEntries } from '../../release/install-needed.mjs';
import { zip } from '../../release/build.mjs';

test('two files with the same crc32 and size are still different', () => {
  const [a, b] = ['plumless', 'buckeroo'].map(s => Buffer.from(s));
  assert.equal(zlib.crc32(a), zlib.crc32(b));
  const at = d => zipEntries(zip([{ name: 'k/f.bin', data: d }], '2026-01-01T00:00:00Z'));
  assert.notEqual(at(a).get('f.bin'), at(b).get('f.bin'));
  assert.equal(tierNeeded([], at(a), at(b)).run, true);
});
