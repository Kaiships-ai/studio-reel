// Start a stick-man film in films/<name>/, or copy the sample reel to try the pipeline first.
//   node styles/stick-man/tools/pack/new.mjs my-film [--set room|street|grey-room] [--voice Puck]
//   node styles/stick-man/tools/pack/new.mjs --sample            (films/stick-sample: the 15 s sample, voice included)
// Writes vo/script.json (the lines to record), storyboard.json (what each line shows and how the auto camera frames
// it), reel.js (the set, cast and acting), audio/ambience.json (the room tone). Never touches a folder that exists.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const sample = argv.includes('--sample'), name = sample ? 'stick-sample' : argv[0];
if (!name || name.startsWith('--') || !/^[a-z0-9][a-z0-9-]*$/.test(name)) { console.error('usage: new.mjs <name> (lowercase letters, digits, dashes) [--set room|street|grey-room] | --sample'); process.exit(2); }
const film = path.join(ROOT, 'films', name);
if (fs.existsSync(film)) { console.error(`films/${name} exists already: pick another name (a film is never overwritten)`); process.exit(1); }
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(film, f)), { recursive: true }); fs.writeFileSync(path.join(film, f), s); };

if (sample) {
  fs.cpSync(path.join(ROOT, 'styles/stick-man/examples/sample'), film, { recursive: true });
  console.log(`films/${name}: the sample reel. Next: node styles/stick-man/tools/pack/export.mjs films/${name}`);
  process.exit(0);
}
const SETS = { room: 'a warm living room (sofa, table, window)', street: 'a sunny small-town street (shops, bench, lamp posts)', 'grey-room': 'a plain grey studio for tests' };
const set = opt('set', 'room');
if (!SETS[set]) { console.error(`--set ${set}: one of ${Object.keys(SETS).join(', ')} (or write your own: styles/stick-man/kit/sets/)`); process.exit(2); }
write('vo/script.json', JSON.stringify({ model: 'gemini-3.8-flash-tts', cast: { nar: opt('voice', 'Puck') },
  note: 'One narrator. Every style starts with "fast". About 3 words a second: 15 s = 40-45 words.', say: {},
  lines: [{ id: 'l01', who: 'nar', style: 'fast, curious', text: '<the hook: the first line, 4-8 words>' }] }, null, 1) + '\n');
write('storyboard.json', JSON.stringify({ film: name, lines: [{ id: 'l01', role: 'hook', shot: 'ms', of: ['a'], see: '<what a viewer with the sound off sees on this line>' }] }, null, 1) + '\n');
write('reel.js', `// ${name}: the reel (make-reel-stick-man REFERENCE.md). Frames follow vo/words.json after the voice is aligned.
// Direction: yaw 0 faces the camera side, yaw -90 faces left (-x), yaw 90 faces right (+x).
import '/styles/stick-man/kit/cast/characters.js';           // MAYA, LEO, SAM, ROB (or your own specs)

export default {
  title: '${name}', fps: 30, frames: [0, 0], style: 'kaiships',   // frames: [0, last]: align.py prints the last frame
  set: '${set}', setModule: '/styles/stick-man/kit/sets/${set}.js',
  lines: ['l01'], captions: { mode: 'chunk' },
  cast: { a: { spec: 'MAYA', at: 'left', yaw: 20, lead: true, focus: 'camera' } },
  anim: { a: [{ f: 0, clip: 'Idle_Stand_Loop', times: 2 }] },
  beats: [],                  // { f, who, expr, look } faces and looks; { f, who, do: 'sound', name } sounds
  overlays: [],
};
`);
write('audio/ambience.json', JSON.stringify({ amb: [[[0, 600], set === 'street' ? 'street_day' : 'office', -4, SETS[set]]] }) + '\n');
write('audio/cues-extra.json', '[]\n');
console.log(`films/${name}: started on the ${set} set (${SETS[set]}). Next: write vo/script.json (make-reel-stick-man step 2).`);
