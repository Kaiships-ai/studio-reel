// Third-party skills ship verbatim ([vendored] in kit.manifest): the English-only check skips them, nothing else does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseManifest, check } from '../../release/build.mjs';

const m = parseManifest(readFileSync(new URL('../../kit.manifest', import.meta.url), 'utf8'));
const errorsFor = (files, f) => check('tmv', Object.keys(files), k => Buffer.from(files[k]), m).errors.filter(e => e.includes(f));

test('a vendored skill may hold CJK examples; one of our skills may not', () => {
  const files = { '.claude/skills/premise-workshop/SKILL.md': 'length in characters (10万字)', '.claude/skills/episode/SKILL.md': 'length (10万字)' };
  assert.deepEqual(errorsFor(files, '.claude/skills/premise-workshop/SKILL.md'), []);
  assert.equal(errorsFor(files, '.claude/skills/episode/SKILL.md').length, 1);
});

test('a vendored skill still fails [forbid] and [identity]', () => {
  const files = { '.claude/skills/research/SKILL.md': 'see /Users/someone and studio-reel' };
  assert.equal(errorsFor(files, '.claude/skills/research/SKILL.md').length, 2);
});

test('shipping any story skill without crediting its author fails', () => {
  const files = { 'THIRD_PARTY_NOTICES.md': 'LemoLab', '.claude/skills/research/SKILL.md': '' };
  assert.equal(errorsFor(files, 'Daniel Dewhurst').length, 1);
});

test("narrating with Apple's say voice fails the tmv zip; listing its voices does not", () => {
  const files = { 'a.sh': 'say -v "$VOICE" -o out.aiff', 'b.md': 'say -v Samantha hi', 'c.md': "say -v 'Samantha' hi", 'd.md': 'say -vSamantha',
    '.claude/skills/line-editing/SKILL.md': "`say -v '?'` lists them" };
  for (const f of ['a.sh', 'b.md', 'c.md', 'd.md']) assert.equal(errorsFor(files, f).length, 1, f);
  assert.deepEqual(errorsFor(files, 'line-editing/SKILL.md'), []);
});
