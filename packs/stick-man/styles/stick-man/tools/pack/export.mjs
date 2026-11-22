// Finish a stick-man film: the three checks, the sound (cues from the picture + audio/cues-extra.json, mixed with the
// voice and the room tone), the video with that mix, and a cover image.
//   node styles/stick-man/tools/pack/export.mjs films/<name> [--size 720|1080] [--cover <frame>] [--force]
// Writes films/<name>/out/<name>.mp4 and films/<name>/out/<name>-cover.jpg. --size 720 (default) for a draft you
// review; 1080 for the file you post. A failed check stops the export (the fault names its frame); --force exports anyway.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'), T = 'styles/stick-man/tools';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const film = argv[0]?.replace(/\/$/, '');
if (!film || !fs.existsSync(path.join(ROOT, film, 'reel.js'))) { console.error('usage: export.mjs films/<name> [--size 720|1080] [--cover <frame>] [--force]'); process.exit(2); }
const name = path.basename(film), size = opt('size', '720'), out = path.join(film, 'out');
const step = (what, tool, args) => { console.log(`\n== ${what}`); const r = run(tool, args); if (r.status) { console.error(`✗ ${what} failed (see above)`); process.exit(1); } };
if (!fs.existsSync(path.join(ROOT, film, 'vo', 'vo.wav'))) { console.error(`${film}/vo/vo.wav is missing: record the voice first (make-reel-stick-man step 3)`); process.exit(1); }

console.log('\n== checks (joints, feet, captions)');
const c = run('node', [`${T}/pack/check.mjs`, film]);
if (c.status && !argv.includes('--force')) { console.error('✗ a check failed: fix the frames it names, or export anyway with --force'); process.exit(1); }
step('sound cues', 'node', [`${T}/pack/render.mjs`, '--film', film, '--cues', `${film}/audio/cues.json`]);
step('mix (voice, sound effects, room tone)', 'python', [`${T}/run/mix.py`, film]);
step(`video ${size === '1080' ? '1080x1920' : '720x1280'}`, 'node', [`${T}/pack/render.mjs`, '--film', film, '--size', size, '--mp4', `${out}/${name}.mp4`, '--audio', `${film}/audio/mix.wav`]);
const words = JSON.parse(fs.readFileSync(path.join(ROOT, film, 'vo', 'words.json'), 'utf8'));
const cover = opt('cover', String(Math.round((words[0]?.t1 ?? 1) * 30) + 6));
step('cover', 'node', [`${T}/pack/render.mjs`, '--film', film, '--size', size, '--frames', cover, '--out', `${out}/${name}-cover.jpg`]);
console.log(`\n✓ ${out}/${name}.mp4\n✓ ${out}/${name}-cover.jpg (frame ${cover}; --cover <frame> picks another)`);
