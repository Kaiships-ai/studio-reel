// Kai's taste (~/.claude/skills/kai-taste, personal, dev only): the roots and the praise list that every stick-man review
// brief carries, so a reviewer judges a cut the way Kai does. Headless reviewers have no tools, so they get the text inline.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';

export const TASTE_SKILL = '~/.claude/skills/kai-taste/SKILL.md';

export function tasteRoots(home = os.homedir()) {
  const p = path.join(home, '.claude/skills/kai-taste/SKILL.md');
  if (!fs.existsSync(p)) { console.error(`warning: ${TASTE_SKILL} not found; reviewers run without Kai's taste`); return ''; }
  const s = fs.readFileSync(p, 'utf8');
  const a = s.search(/^## The \w+ roots/m), b = s.indexOf('## Growth rule');
  return a < 0 ? '' : s.slice(a, b < a ? undefined : b).trim();
}

export function withTaste(system, home) {
  const roots = tasteRoots(home);
  return roots ? `${system}\n\nJudge with Kai's taste. Name the root a finding breaks; never mark down what Kai praised.\n\n${roots}` : system;
}
