// Every stick-man review carries Kai's taste (~/.claude/skills/kai-taste): 17/11 each builder had a reviewer and the cut
// was still "cực kỳ nhiều sạn", because reviewers judged numbers, not what Kai sees.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { tasteRoots, withTaste } from '../../styles/stick-man/tools/taste.mjs';

const home = skill => { const h = fs.mkdtempSync(path.join(os.tmpdir(), 'taste-'));
  if (skill) { fs.mkdirSync(path.join(h, '.claude/skills/kai-taste'), { recursive: true }); fs.writeFileSync(path.join(h, '.claude/skills/kai-taste/SKILL.md'), skill); }
  return h; };

test('a headless judge gets the roots and the praise list, not the growth rule', () => {
  const h = home('# Kai taste\n## The five roots\n### R1. One solid world\n## What Kai praised\n- 2D cards stay\n## Growth rule\n1. attach it\n');
  const sys = withTaste('You judge animation style.', h);
  assert.match(sys, /^You judge animation style\./);
  assert.match(sys, /R1\. One solid world/);
  assert.match(sys, /2D cards stay/);
  assert.doesNotMatch(sys, /attach it/);
});

test('without the skill the judge runs unchanged', () => {
  assert.equal(tasteRoots(home()), '');
  assert.equal(withTaste('You judge.', home()), 'You judge.');
});

test('every review brief in the stick-man skill and playbook starts from kai-taste', () => {
  for (const f of ['.claude/skills/make-reel-stick-man/SKILL.md', '.claude/skills/make-reel-stick-man/PROCESS.md',
    '.claude/skills/make-reel-stick-man/PREPRO.md', '.claude/skills/make-reel-stick-man/SCRIPT.md', '.agents/playbooks/stick-man-film.md'])
    assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /~\/\.claude\/skills\/kai-taste\/SKILL\.md/, f);
  assert.match(fs.readFileSync(path.join(ROOT, 'styles/stick-man/tools/judge.mjs'), 'utf8'), /withTaste\(/);
});
