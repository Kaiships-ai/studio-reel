// core/preset.mjs: which preset a film renders with.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preset, presetOf, PRESETS, APPROVAL } from '../../core/preset.mjs';

test('test is small, low fps and short; no name is no preset; an unknown name is refused', () => {
  assert.deepEqual(preset('test'), { name: 'test', ...PRESETS.test });
  assert.ok(PRESETS.test.w * PRESETS.test.h <= 270 * 480 && PRESETS.test.fps <= 12 && PRESETS.test.maxDur <= 15);
  assert.equal(PRESETS.test.w / 1080, PRESETS.test.h / 1920);   // the page's 9:16, scaled down
  assert.equal(preset(undefined), null);
  assert.throws(() => preset('tiny'), /unknown preset "tiny": use test, medium, full/);
  assert.equal(preset('full'), null);   // full = the page's own size
});

test('presetOf reads REEL_PRESET first, then job.json', () => {
  const film = mkdtempSync(join(tmpdir(), 'preset-')), saved = process.env.REEL_PRESET;
  try {
    delete process.env.REEL_PRESET;
    assert.equal(presetOf(film).name, 'medium');
    writeFileSync(join(film, 'job.json'), JSON.stringify({ slug: 'x', steps: [] }));
    assert.equal(presetOf(film).name, 'medium');
    writeFileSync(join(film, 'job.json'), JSON.stringify({ slug: 'x', preset: 'test', steps: [] }));
    assert.equal(presetOf(film).name, 'test');
    process.env.REEL_PRESET = 'tiny';
    assert.throws(() => presetOf(film), /unknown preset/);
  } finally { if (saved === undefined) delete process.env.REEL_PRESET; else process.env.REEL_PRESET = saved; }
});

test('every film renders medium 720x1280 unless it names another preset', () => {
  assert.deepEqual([PRESETS.medium.w, PRESETS.medium.h], [720, 1280]);
  assert.equal(PRESETS.medium.maxDur, undefined);   // the whole film, at its own fps
  assert.equal(PRESETS.medium.fps, undefined);
});

test('full renders only with the film APPROVED-FULL file', () => {
  const film = mkdtempSync(join(tmpdir(), 'preset-')), saved = process.env.REEL_PRESET;
  try {
    process.env.REEL_PRESET = 'full';
    assert.throws(() => presetOf(film), /needs the user's go/);
    writeFileSync(join(film, APPROVAL), 'Kai, 2026-11-08');
    assert.equal(presetOf(film), null);
  } finally { if (saved === undefined) delete process.env.REEL_PRESET; else process.env.REEL_PRESET = saved; }
});
