// release/pack-guard.mjs: a stick-man pack change never edits styles/stick-man (the studio's live kit; Ep1 renders from
// it). The pack copies from there and overlays its own files from packs/stick-man/ (release/stickpack.mjs), so a change
// that touches packs/ or release/stickpack.mjs together with styles/stick-man/ fails.
//   git diff --name-only origin/main...HEAD | node release/pack-guard.mjs        (checks.yml; test/unit/pack-guard.test.mjs runs it locally)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PACK = p => p.startsWith('packs/') || p === 'release/stickpack.mjs';
export const KIT = p => p.startsWith('styles/stick-man/');
// the paths that break the rule (empty: the change is fine)
export function packGuard(paths) {
  const list = paths.map(p => p.trim()).filter(Boolean);
  return list.some(PACK) ? list.filter(KIT) : [];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bad = packGuard(readFileSync(0, 'utf8').split('\n'));
  if (bad.length) {
    console.error(`✗ pack-guard: this change edits the stick-man pack and also styles/stick-man (the studio's live kit). Put the change in packs/stick-man/ instead:\n  ${bad.join('\n  ')}`);
    process.exit(1);
  }
  console.log('✓ pack-guard: no pack change touches styles/stick-man');
}
