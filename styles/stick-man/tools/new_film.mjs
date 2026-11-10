// Start a stick-man film: films/<slug>/ with vo/, audio/, renders/, review/, an empty vo/script.json, an empty reel.js
// and the run ledger. Refuses to touch a folder that already exists.
//   node styles/stick-man/tools/new_film.mjs stick02-<slug>
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.error('usage: new_film.mjs <slug>   (lowercase, digits, dashes: stick02-railroads)'); process.exit(2); }
const film = path.join(ROOT, 'films', slug);
if (fs.existsSync(film)) { console.error(`films/${slug} exists: pick a new slug (never overwrite a film)`); process.exit(1); }
for (const d of ['vo', 'audio', 'renders', 'review']) fs.mkdirSync(path.join(film, d), { recursive: true });

const script = {
  model: 'gemini-3.8-flash-tts',
  cast: { nar: 'Achird' },
  note: `${slug}: one narrator. Styles are plain delivery words ("fast", "fast, smug"). ~3.7 words/s: 30 s = ~110 words.`,
  say: {},
  lines: [],
};
fs.writeFileSync(path.join(film, 'vo', 'script.json'), JSON.stringify(script, null, 1) + '\n');

const reel = `// ${slug}, act 1. Data only: beats name a word, the runtime does the timing.
// Schema: .claude/skills/make-reel-stick-man/REEL_DATA.md · verbs: VERBS.md · sets, props, cast: SETS.md.
// More acts (another set, a cutaway): add reel2.js with { title, frames, lines, acts: [...] }.
export default {
  title: '${slug}',
  fps: 30,
  frames: [0, 0],          // [first, last]; last = the "last frame" line of vo/voice-qa.md (or the last act's start - 1)
  set: 'bank-lobby',       // bank-lobby | street | cutaway (SETS.md)
  lines: [],               // the vo/script.json line ids this act covers, in order
  cast: {},                // name: { spec, at, yaw, expr, focus, posture, watch, head_tilt }
  beats: [],               // { line, on, offset?, nth?, who, do?, expr?, look?, ... } or { f, who, ... }
  shots: [],               // { f: 0 | line/on, shot: 'two'|'ms'|'cu'|'insert'|'wide'|'follow', of: [names], ... }
};
`;
fs.writeFileSync(path.join(film, 'reel.js'), reel);

const tpl = path.join(ROOT, '.claude/skills/make-reel-stick-man/LEDGER.md');
if (fs.existsSync(tpl)) fs.writeFileSync(path.join(film, 'LEDGER.md'), fs.readFileSync(tpl, 'utf8').replace(/<slug>/g, slug));

console.log(`films/${slug}/  vo/script.json (empty lines), reel.js (empty act), LEDGER.md, audio/ renders/ review/`);
console.log(`next: write vo/script.json lines, show the script to Kai`);
