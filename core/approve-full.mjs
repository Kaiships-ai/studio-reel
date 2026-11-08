// approve-full.mjs: record that the user asked for the full-quality render of one film.
//   node core/approve-full.mjs <film> --by "<who asked, when>"
// Writes <film>/APPROVED-FULL. Only after the user says so in their own words: every render is medium until then.
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPROVAL } from './preset.mjs';

const argv = process.argv.slice(2), i = argv.indexOf('--by'), by = i >= 0 ? argv.splice(i, 2)[1] : '';
const film = argv[0] && resolve(argv[0]);
if (!film || !existsSync(film) || !by?.trim()) {
  console.error('usage: node core/approve-full.mjs <film> --by "<who asked, when>" (only after the user asked for the full render)');
  process.exit(2);
}
writeFileSync(join(film, APPROVAL), `${new Date().toISOString()} ${by.trim()}\n`);
console.log(`✓ ${join(film, APPROVAL)}: the next render of this film may be full (REEL_PRESET=full)`);
