// core/preset.mjs: which preset a film renders with.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preset, presetOf, PRESETS } from '../../core/preset.mjs';

test('test is small, low fps and short; no name is no preset; an unknown name is refused', () => {
  assert.deepEqual(preset('test'), { name: 'test', ...PRESETS.test });
  assert.ok(PRESETS.test.w * PRESETS.test.h <= 270 * 480 && PRESETS.test.fps <= 12 && PRESETS.test.maxDur <= 15);
  assert.equal(PRESETS.test.w / 1080, PRESETS.test.h / 1920);   // the page's 9:16, scaled down
  assert.equal(preset(undefined), null);
  assert.throws(() => preset('tiny'), /unknown preset "tiny": use test/);
});

test('presetOf reads REEL_PRESET first, then job.json', () => {
  const film = mkdtempSync(join(tmpdir(), 'preset-')), saved = process.env.REEL_PRESET;
  try {
    delete process.env.REEL_PRESET;
    assert.equal(presetOf(film), null);
    writeFileSync(join(film, 'job.json'), JSON.stringify({ slug: 'x', steps: [] }));
    assert.equal(presetOf(film), null);
    writeFileSync(join(film, 'job.json'), JSON.stringify({ slug: 'x', preset: 'test', steps: [] }));
    assert.equal(presetOf(film).name, 'test');
    process.env.REEL_PRESET = 'tiny';
    assert.throws(() => presetOf(film), /unknown preset/);
  } finally { if (saved === undefined) delete process.env.REEL_PRESET; else process.env.REEL_PRESET = saved; }
});
