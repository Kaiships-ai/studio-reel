// The rules that keep the buyer path cross-platform. A change that breaks one fails `node --test test/unit/*.test.mjs`
// (and so CI), instead of reaching a Windows buyer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ROOT } from '../../kit/env.mjs';

const SCAN = ['kit', 'core/render', 'core/tts', 'core/audio', 'styles/kai-hand-draw/tools', 'styles/kai-hand-draw/engine', '.claude/skills'];
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
for (const d of SCAN) walk(join(ROOT, d));
const rel = p => relative(ROOT, p).split(sep).join('/');
const code = files.filter(f => /\.(mjs|js|py)$/.test(f) && !rel(f).startsWith('.claude/skills/verify/features'));
const text = f => readFileSync(f, 'utf8');

test('no hardcoded .venv paths or python3 commands in the buyer path', () => {
  const bad = files.filter(f => /\.(mjs|js|py|md)$/.test(f)).flatMap(f => text(f).split('\n').map((l, i) => [rel(f), i + 1, l]))
    .filter(([, , l]) => /\.venv[\\/](bin|Scripts)|(^|[\s`'"])python3 /.test(l));
  assert.deepEqual(bad, []);
});

test('only kit/env.mjs starts processes (no shell, one place to get paths right)', () => {
  const allowed = new Set(['kit/env.mjs', 'core/render/slot.mjs']);
  const bad = code.filter(f => f.endsWith('.mjs') || f.endsWith('.js'))
    .filter(f => !allowed.has(rel(f)) && /from ['"](node:)?child_process['"]/.test(text(f))).map(rel);
  assert.deepEqual(bad, []);
});

test('no sh scripts in the buyer path', () => {
  assert.deepEqual(files.filter(f => /\.sh$/.test(f)).map(rel), []);
  const bad = code.filter(f => /\[\s*['"]sh['"]\s*,|spawn(Sync)?\(\s*['"]sh['"]/.test(text(f))).map(rel);
  assert.deepEqual(bad, []);
});
