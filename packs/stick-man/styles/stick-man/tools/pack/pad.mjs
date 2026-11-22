// Give the voice air: vo/vo.wav = a take with silence before the first word and after the last (the payoff needs a beat).
//   node styles/stick-man/tools/pack/pad.mjs films/<name> [--take 2] [--start 0.5] [--end 1.5]
// Uses the newest take (vo/takes/take-NN.wav) unless --take names one. Then run align.py again.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const film = argv[0]?.replace(/\/$/, '');
const takes = film ? path.join(ROOT, film, 'vo', 'takes') : '';
if (!film || !fs.existsSync(takes)) { console.error('usage: pad.mjs films/<name> [--take N] [--start s] [--end s]   (record a take first: voice.py --take)'); process.exit(2); }
const list = fs.readdirSync(takes).filter(f => /^take-\d+\.wav$/.test(f)).sort();
const take = opt('take') ? `take-${String(opt('take')).padStart(2, '0')}.wav` : list[list.length - 1];
if (!take || !list.includes(take)) { console.error(`no ${take || 'take'} in ${film}/vo/takes (${list.join(', ') || 'empty'})`); process.exit(1); }
const s = Number(opt('start', 0.5)), e = Number(opt('end', 1.5));
const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(takes, take), '-af', `adelay=${Math.round(s * 1000)}:all=1,apad=pad_dur=${e}`, '-ac', '1', '-ar', '48000', path.join(ROOT, film, 'vo', 'vo.wav')]);
if (r.status) process.exit(1);
console.log(`${film}/vo/vo.wav = ${take} with ${s} s before and ${e} s after. Next: align.py ${film}`);
