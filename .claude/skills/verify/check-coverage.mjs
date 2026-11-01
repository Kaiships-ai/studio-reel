// check-coverage.mjs: a change to what a reel does must update the feature map. Reads changed paths on stdin, one a line:
//   git diff --name-only origin/main...HEAD | node .claude/skills/verify/check-coverage.mjs
// Exit 1 when a path below changed and no file in features/ other than README.md did.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const COVERED = /^(kit\/|core\/(job|preset)\.mjs$|core\/render\/|core\/tts\/|core\/audio\/|styles\/kai-hand-draw\/(engine|tools|starter)\/|character-designer\.html$)/;
const FEATURE = /^\.claude\/skills\/verify\/features\/(?!README\.md$).+\.md$/;

export function uncovered(paths) {
  return paths.some(p => FEATURE.test(p)) ? [] : paths.filter(p => COVERED.test(p));
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const bad = uncovered(readFileSync(0, 'utf8').split('\n').filter(Boolean));
  if (bad.length) { console.error(`✗ these change what a reel does, and no file in .claude/skills/verify/features/ changed:\n  ${bad.join('\n  ')}`); process.exit(1); }
  console.log('✓ feature map covers this change');
}
