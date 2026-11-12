// Start a stick-man film: films/<slug>/ with vo/, audio/, renders/, review/, an empty vo/script.json, storyboard.json, reel.js
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
  note: `${slug}: one narrator. Every style starts with "fast" ("fast", "fast, smug"). Achird ~2.9-3.3 words/s (20 s = ~60 words).`,
  say: {},
  lines: [],
};
fs.writeFileSync(path.join(film, 'vo', 'script.json'), JSON.stringify(script, null, 1) + '\n');

const reel = `// ${slug}: reel data for the standard process (.claude/skills/make-reel-stick-man: SKILL.md, PROCESS.md, REEL_DATA.md).
// Worked example: styles/stick-man/examples/pilot-a/reel.js. Fill it stage by stage: cameras (direct) at the camera pass,
// overlays, then the lead's key poses (anim: hold, then polish). Direction: yaw 0 faces -y, yaw -90 faces -x, swing + = forward.
export const CUTS = [0];                 // the animatic's cut frames (PROCESS.md section 3), last entry = the end frame
const STAND = { bob: 0, sq: 0, spine: { bend: 0, side: 0, twist: 0 }, neck: { nod: 0, tilt: 0, turn: 0 }, pelvis: { pitch: 0, roll: 0, yaw: 0 },
  armL: { raise: 12, swing: 0, elbow: 15, roll: 0 }, armR: { raise: 12, swing: 0, elbow: 15, roll: 0 },
  legL: { foot: [-0.22, 0.022, 0], pitch: 0, knee: [-0.15, 0, 1] }, legR: { foot: [0.22, 0.022, 0], pitch: 0, knee: [0.15, 0, 1] } };
const BREATH = { 'spine.bend': [1.5, 40], 'neck.tilt': [1.5, 53, 1] };
const hold = (f, extra) => ({ f, pose: STAND, cycle: BREATH, ...extra, ease: 'snap' });
const BLOCKING = new URLSearchParams(globalThis.location?.search || '').get('blocking') === '1';
function polish(keys) {
  if (BLOCKING) return keys;
  return keys.map((k, i) => {
    const nx = keys[i + 1], cut = CUTS.includes(k.f), sameShot = nx && !CUTS.includes(nx.f);
    const T = nx?.t ?? (k.stroke ? 4 : 7), { stroke, antic, t, ...rest } = k;
    return { ...rest, ease: cut ? 'snap' : 'slow', ...(antic ? { antic } : {}), ...(sameShot && nx.f - k.f > T + 2 ? { hold: nx.f - k.f - T } : {}) };
  });
}
export default {
  title: '${slug}', fps: 30, glasses: false, style: 'kaiships', directDrift: 0.07,
  frames: [0, 0],          // [first, last]; last = the "last frame" line of vo/voice-qa.md
  set: 'bank-lobby',       // or an allout set: set: '<name>', setModule: '/styles/stick-man/allout/sets/<name>.js' (SETS.md)
  lines: [],               // the vo/script.json line ids, in order
  cast: {},                // name: { spec, at, yaw, expr, focus, lead }
  anim: {},                // the lead's acting: { name: polish([ hold(f, { ...pose, pos, yaw, expr, look }), ... ]) }
  beats: [],               // prop keys { f, who, do: 'set', key, to, dur, ease }, sounds { f, who, do: 'sound', name, strength }
  overlays: [],            // loupe / text / arrows (REEL_DATA.md), only what the picture backs
  // direct: [ { at: { f: CUTS[0] }, intent: 'est', why: 'P1 · PURPOSE: ...', cut: 'cut', cam: { pos, aim, lens } }, ... ],
};
`;
fs.writeFileSync(path.join(film, 'reel.js'), reel);

// the storyboard stage (REEL_DATA.md): one entry per script line, filled after align and before reel data
fs.writeFileSync(path.join(film, 'storyboard.json'), JSON.stringify({ film: slug, lines: [] }, null, 1) + '\n');

const tpl = path.join(ROOT, '.claude/skills/make-reel-stick-man/LEDGER.md');
if (fs.existsSync(tpl)) fs.writeFileSync(path.join(film, 'LEDGER.md'), fs.readFileSync(tpl, 'utf8').replace(/<slug>/g, slug));

console.log(`films/${slug}/  vo/script.json (empty lines), storyboard.json, reel.js (standard skeleton), LEDGER.md, audio/ renders/ review/`);
console.log(`next: stage 0 (BRIEF.md, TREATMENT.md, beat board) on the Development page, then the script`);
