// Contact sheets from a rendered mp4, sized so the long side stays <= 1000 px.
//   node styles/stick-man/tools/sheet.mjs --in renders/p1.mp4 --n 24 --out review/sheet.jpg          N evenly spaced tiles
//   node styles/stick-man/tools/sheet.mjs --in renders/p1.mp4 --consec 30 --start 150 --out review/f30.jpg
import { run } from '../../../kit/env.mjs';
import fs from 'node:fs'; import path from 'node:path';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const src = path.resolve(A.in), out = path.resolve(A.out);
const probe = run('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets,width,height', '-of', 'csv=p=0', src], { capture: true });
const [vw, vh, total] = probe.stdout.trim().split(',').map(Number);
let sel, n;
if (A.consec) { n = Number(A.consec); const s = Number(A.start || 0); sel = `between(n\\,${s}\\,${s + n - 1})`; }
else { n = Number(A.n || 24); const step = total / n; sel = Array.from({ length: n }, (_, i) => `eq(n\\,${Math.round(i * step + step / 2)})`).join('+'); }
const cols = A.cols ? Number(A.cols) : n === 30 ? 10 : Math.ceil(Math.sqrt(n * vh / vw * 0.75)) + 2, rows = Math.ceil(n / cols);
const tw = Math.floor(Math.min(1000 / cols, 1000 / rows * vw / vh) / 2) * 2, th = Math.floor(tw * vh / vw / 2) * 2;
fs.mkdirSync(path.dirname(out), { recursive: true });
const r = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', `select='${sel}',scale=${tw}:${th},tile=${cols}x${rows}:padding=2:color=white`,
  '-frames:v', '1', '-q:v', '3', out]);
if (r.status) process.exit(r.status);
console.log(`${out}  ${n} tiles ${cols}x${rows} of ${tw}x${th} (source ${total} frames)`);
