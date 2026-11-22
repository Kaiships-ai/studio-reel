// Start a stick-man film: films/<slug>/ with vo/, audio/, renders/, review/, an empty vo/script.json, storyboard.json, reel.js,
// status.json and the run ledger. Refuses to touch a folder that already exists.
//   node styles/stick-man/tools/run/new_film.mjs stick02-<slug>
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.error('usage: new_film.mjs <slug>   (lowercase, digits, dashes: stick02-railroads)'); process.exit(2); }
const film = path.join(ROOT, 'films', slug);
if (fs.existsSync(film)) { console.error(`films/${slug} exists: pick a new slug (never overwrite a film)`); process.exit(1); }
for (const d of ['vo', 'audio', 'renders', 'review']) fs.mkdirSync(path.join(film, d), { recursive: true });

const script = {
  model: 'gemini-3.8-flash-tts',
  cast: { nar: 'Achird' },
  note: `${slug}: one narrator. Every style starts with "fast" ("fast", "fast, smug"). Achird ~2.9-3.3 words/s (20 s = ~60 words).`,
  say: {},
  lines: [],
};
fs.writeFileSync(path.join(film, 'vo', 'script.json'), JSON.stringify(script, null, 1) + '\n');

const reel = `// ${slug}: reel data for the standard process (.claude/skills/make-reel-stick-man: SKILL.md, PROCESS.md, REEL_DATA.md).
// Fill it stage by stage: cameras (direct) at the camera pass,
// overlays, then the lead's key poses (anim: hold, then polish). Direction: yaw 0 faces -y, yaw -90 faces -x, swing + = forward.
import { hold, polishAt } from '/styles/stick-man/kit/acting/keys.js';
export const CUTS = [0];                 // the animatic's cut frames (PROCESS.md section 3), last entry = the end frame
const polish = polishAt(CUTS);         // hold() and polish: styles/stick-man/kit/acting/keys.js
export default {
  title: '${slug}', fps: 30, glasses: false, style: 'kaiships', directDrift: 0.07,
  frames: [0, 0],          // [first, last]; last = the "last frame" line of vo/voice-qa.md
  set: 'canyon-edge', setModule: '/styles/stick-man/kit/sets/canyon-edge.js',   // a set in kit/sets (SETS.md)
  lines: [],               // the vo/script.json line ids, in order
  cast: {},                // name: { spec, at, yaw, expr, focus, lead }
  anim: {},                // the lead's acting: { name: polish([ hold(f, { ...pose, pos, yaw, expr, look }), ... ]) }
  beats: [],               // prop keys { f, who, do: 'set', key, to, dur, ease }, sounds { f, who, do: 'sound', name, strength }
  overlays: [],            // loupe / text / arrows (REEL_DATA.md), only what the picture backs
  // direct: [ { at: { f: CUTS[0] }, intent: 'est', why: 'P1 · PURPOSE: ...', cut: 'cut', cam: { pos, aim, lens } }, ... ],
};
`;
fs.writeFileSync(path.join(film, 'reel.js'), reel);

// the storyboard stage (REEL_DATA.md): `scenes` ([1.0]) and `shots` ([1.4a], the shot list) first, `lines` one entry per
// script line; prepro.mjs checks them and animatic.mjs cuts them
fs.writeFileSync(path.join(film, 'storyboard.json'), JSON.stringify({ film: slug, fps: 30, scenes: [], shots: [], lines: [] }, null, 1) + '\n');

// the decision log (DEVELOP.md section 5): every approved decision, checked at every gate by prepro.mjs D1/D2
fs.writeFileSync(path.join(film, 'DECISIONS.json'), JSON.stringify({ film: slug, decisions: [] }, null, 1) + '\n');

// where the film stands, for status.mjs and a worker started by Studio (WORKER.md)
const status = fs.readFileSync(path.join(ROOT, '.claude/skills/make-reel-stick-man/templates/status.json'), 'utf8')
  .replace(/<slug>/g, slug).replace('<date>', new Date().toISOString().slice(0, 10));
fs.writeFileSync(path.join(film, 'status.json'), status);

const tpl = path.join(ROOT, '.claude/skills/make-reel-stick-man/LEDGER.md');
if (fs.existsSync(tpl)) fs.writeFileSync(path.join(film, 'LEDGER.md'), fs.readFileSync(tpl, 'utf8').replace(/<slug>/g, slug));

console.log(`films/${slug}/  vo/script.json (empty lines), storyboard.json, reel.js (standard skeleton), status.json, LEDGER.md, audio/ renders/ review/`);
console.log(`next: stage 0 (BRIEF.md, TREATMENT.md, beat board) on the Development page, then stage 1 (PREPRO.md): scene brief, script, shot list`);
