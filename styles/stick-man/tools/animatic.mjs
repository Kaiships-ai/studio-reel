// Animatic from the shot list: every shot of films/<slug>/storyboard.json cut at its frames, its panels held in order, its
// camera move faked in 2D (push, pull, pan, tilt, truck, crane, follow, handheld), a grey card with the shot's words where a
// panel is still missing, and a burn-in on every frame (shot id, size/lens/move, frame in shot, version, film timecode) so
// every note can name a shot and a frame. Audio: vo/vo.wav when it exists (temp or final voice).
//   node styles/stick-man/tools/animatic.mjs films/<slug> --v 3              -> review/animatic_v003.mp4 (540x960)
//   options: --safe 1 (shade the platform UI bands, outline the text-safe box)  --size 540x960  --audio vo/vo.wav  --burn 0 (clean, for Kai's
//   phone-size viewing)  --opt SH040:emo,SH060:bold (render other camera-intent options)  --font <ttf>  --out <mp4>
// It also prints the CUTS array for reel.js (the shot starts and the end frame), so stage 3 never re-detects cuts.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadFilm, UI_BANDS, TEXT_SAFE } from './shotlist.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const argv = process.argv.slice(2), A = {};
const film = argv[0];
for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!film || film.startsWith('--')) { console.error('usage: animatic.mjs films/<slug> --v <n> [--safe 1] [--size 540x960] [--audio vo/vo.wav] [--burn 0] [--font <ttf>] [--out <mp4>]'); process.exit(2); }
const DIR = path.resolve(ROOT, film);
let L; try { L = loadFilm(DIR, { opt: A.opt }); } catch (e) { console.error(e.message); process.exit(2); }
if (L.errors.length) { for (const e of L.errors) console.error(`${e.where}: ${e.msg}`); process.exit(1); }
const { fps, shots, last, F } = L;
const [W, H] = String(A.size || '540x960').split('x').map(Number);
const ver = String(A.v || '1').padStart(3, '0');
const out = path.resolve(DIR, A.out || `review/animatic_v${ver}.mp4`);
const pixiFF = path.join(ROOT, '.pixi/envs/default/bin/ffmpeg');
const runs = bin => spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0;
const FF = fs.existsSync(pixiFF) && runs(pixiFF) ? pixiFF : 'ffmpeg';
if (!runs(FF)) { console.error('ffmpeg not found (pixi env or PATH)'); process.exit(2); }
const FONTS = [A.font, '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf',
  '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/lato/Lato-Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf'].filter(Boolean);
const font = FONTS.find(f => fs.existsSync(f));
if (!font) console.warn('no font found (--font <ttf>): the burn-in and grey cards will have no text');
const burn = A.burn !== '0' && !!font;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'animatic-'));
const ff = args => { const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`ffmpeg failed: ${r.stderr || r.error}`); process.exit(1); } };
const txt = (name, s) => { const p = path.join(tmp, name); fs.writeFileSync(p, s); return p.replace(/\\/g, '/').replace(/:/g, '\\:'); };
const wrap = (s, n) => String(s).split(/\s+/).reduce((acc, w) => { const l = acc.at(-1); if ((l + ' ' + w).trim().length > n) acc.push(w); else acc[acc.length - 1] = (l + ' ' + w).trim(); return acc; }, ['']).join('\n');
const fsz = k => Math.round(H * k);

// 2D camera for a move over the whole shot: centre x/y (0-1 of the image) and zoom at shot start and end
function cam2d(s) {
  if (s.cam2d) return { z: s.cam2d.z ?? [1, 1], x: s.cam2d.x ?? [0.5, 0.5], y: s.cam2d.y ?? [0.5, 0.5], shake: s.cam2d.shake ?? 0 };
  const right = (s.dir ?? s.screen_dir ?? 'L>R') !== 'R>L';
  switch (s.move) {
    case 'push': case 'zoom': return { z: [1, 1.18], x: [0.5, 0.5], y: [0.5, 0.5], shake: 0 };
    case 'pull': return { z: [1.18, 1], x: [0.5, 0.5], y: [0.5, 0.5], shake: 0 };
    case 'pan': case 'truck': case 'follow': return { z: [1.15, 1.15], x: right ? [0.43, 0.57] : [0.57, 0.43], y: [0.5, 0.5], shake: 0 };
    case 'tilt': return { z: [1.15, 1.15], x: [0.5, 0.5], y: s.dir === 'up' ? [0.57, 0.43] : [0.43, 0.57], shake: 0 };
    case 'crane': return { z: [1.15, 1.08], x: [0.5, 0.5], y: s.dir === 'down' ? [0.43, 0.57] : [0.57, 0.43], shake: 0 };
    case 'handheld': return { z: [1.08, 1.08], x: [0.5, 0.5], y: [0.5, 0.5], shake: 1 };
    case 'whip': return { z: [1.12, 1.12], x: right ? [0.45, 0.55] : [0.55, 0.45], y: [0.5, 0.5], shake: 0 };
    default: return { z: [1, 1], x: [0.5, 0.5], y: [0.5, 0.5], shake: 0 };
  }
}

const list = [];
shots.forEach((s, si) => {
  const panels = (s.panels || []).map(p => typeof p === 'string' ? { img: p } : p);
  const segs = panels.length ? panels : [{ img: null }];
  const starts = segs.map((p, k) => Number.isFinite(p.f) ? p.f : Math.round(k * s.n / segs.length));
  const c = cam2d(s), lerp = (r, t) => r[0] + (r[1] - r[0]) * t;
  segs.forEach((p, k) => {
    const a = starts[k], b = k + 1 < segs.length ? starts[k + 1] : s.n, n = b - a;
    if (n <= 0) return;
    const clip = path.join(tmp, `c${String(si).padStart(3, '0')}_${k}.mp4`);
    const t0 = a / s.n, t1 = b / s.n;
    const z0 = lerp(c.z, t0), z1 = lerp(c.z, t1), x0 = lerp(c.x, t0), x1 = lerp(c.x, t1), y0 = lerp(c.y, t0), y1 = lerp(c.y, t1);
    const P = `(on/${Math.max(1, n - 1)})`;
    const shake = c.shake ? `+${(0.006).toFixed(3)}*sin(on*1.7)+${(0.004).toFixed(3)}*sin(on*3.1)` : '';
    const zp = `zoompan=z='${z0}+(${z1 - z0})*${P}':x='(${x0}+(${x1 - x0})*${P}${shake})*iw-iw/zoom/2':y='(${y0}+(${y1 - y0})*${P}${shake})*ih-ih/zoom/2':d=${n}:s=${W}x${H}:fps=${fps}`;
    const vf = [];
    let input;
    const img = p.img && fs.existsSync(F(p.img)) ? F(p.img) : null;
    if (img) {
      input = ['-loop', '1', '-framerate', String(fps), '-t', String(n / fps + 1), '-i', img];
      vf.push(`scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase`, `crop=${W * 2}:${H * 2}`, zp);
    } else {
      input = ['-f', 'lavfi', '-i', `color=c=0x6b6b6b:s=${W}x${H}:r=${fps}:d=${n / fps}`];
      if (font) {
        vf.push(`drawtext=fontfile='${font}':textfile='${txt(`card${si}_${k}.txt`, `${s.id}  ${s.size ?? ''} ${s.lens ? s.lens + 'mm' : ''} ${s.move ?? ''}\n\n${wrap(s.see || s.purpose || '', 26)}`)}':fontcolor=white:fontsize=${fsz(0.026)}:line_spacing=${fsz(0.01)}:x=(w-tw)/2:y=(h-th)/2`);
        vf.push(`drawtext=fontfile='${font}':text='NO PANEL YET':fontcolor=0xffcc66:fontsize=${fsz(0.02)}:x=(w-tw)/2:y=h*0.3`);
      }
    }
    // on-screen words from the shot list (`text`: { text, at: [x, y], size, color, box, f0, dur }), drawn where the shot says,
    // so the safe-zone overlay and prepro.mjs judge the same placement
    if (font) (s.text || []).forEach((t, ti) => {
      const [ax, ay] = t.at || [0.5, 0.4], t0 = (t.f0 ?? 0) - a, t1 = (t.dur != null ? (t.f0 ?? 0) + t.dur : s.n) - a;
      if (t1 <= 0 || t0 >= n) return;
      const sz = fsz(t.size ?? 0.034), col = t.color || 'white', box = t.box || 'black@0.62';
      vf.push(`drawtext=fontfile='${font}':textfile='${txt(`t${si}_${k}_${ti}.txt`, t.text)}':fontcolor=${col}:fontsize=${sz}:box=1:boxcolor=${box}:boxborderw=${Math.round(sz * 0.35)}:x=w*${ax}-tw/2:y=h*${ay}-th/2:enable='between(n,${Math.max(0, t0)},${Math.min(n, t1) - 1})'`);
    });
    if (burn) {
      const head = `${s.id}${s.picked ? ' [' + s.picked + ']' : ''}  ${s.size ?? ''}${s.lens ? ' ' + s.lens + 'mm' : ''}${s.angle && s.angle !== 'eye' ? ' ' + s.angle : ''}${s.move && s.move !== 'static' ? ' ' + s.move : ''}`;
      vf.push(`drawbox=x=0:y=0:w=iw:h=${fsz(0.05)}:color=black@0.55:t=fill`);
      vf.push(`drawtext=fontfile='${font}':textfile='${txt(`h${si}_${k}.txt`, head)}':fontcolor=white:fontsize=${fsz(0.022)}:x=${fsz(0.012)}:y=${fsz(0.014)}`);
      vf.push(`drawtext=fontfile='${font}':text='%{eif\\:n+${a + 1}\\:d}/${s.n}':fontcolor=0xffcc66:fontsize=${fsz(0.022)}:x=w-tw-${fsz(0.012)}:y=${fsz(0.014)}`);
    }
    vf.push('format=yuv420p');
    ff([...input, '-vf', vf.join(','), '-frames:v', String(n), '-r', String(fps), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-an', clip]);
    list.push(clip);
  });
});

// join, then the film-level layer: version + timecode + frame, the UI bands, the voice
const cat = path.join(tmp, 'list.txt');
fs.writeFileSync(cat, list.map(c => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
const joined = path.join(tmp, 'joined.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', cat, '-c', 'copy', joined]);
const vf = [];
if (A.safe === '1') {   // the platform UI bands shaded, the text-safe box outlined in yellow
  const b = UI_BANDS, t = TEXT_SAFE;
  vf.push(`drawbox=x=0:y=0:w=iw:h=ih*${b.top}:color=black@0.45:t=fill`, `drawbox=x=0:y=ih*${1 - b.bottom}:w=iw:h=ih*${b.bottom}:color=black@0.45:t=fill`,
    `drawbox=x=iw*${1 - b.right}:y=ih*${b.top}:w=iw*${b.right}:h=ih*${1 - b.top - b.bottom}:color=black@0.45:t=fill`,
    `drawbox=x=0:y=ih*${b.top}:w=iw*${b.left}:h=ih*${1 - b.top - b.bottom}:color=black@0.45:t=fill`,
    `drawbox=x=iw*${t.x0}:y=ih*${t.y0}:w=iw*${t.x1 - t.x0}:h=ih*${t.y1 - t.y0}:color=yellow@0.9:t=2`);
}
if (burn) {
  vf.push(`drawbox=x=0:y=ih-${fsz(0.045)}:w=iw:h=${fsz(0.045)}:color=black@0.55:t=fill`);
  vf.push(`drawtext=fontfile='${font}':textfile='${txt('foot.txt', `v${ver}  %{eif:n:d}f  %{pts:hms}`)}':fontcolor=white:fontsize=${fsz(0.02)}:x=${fsz(0.012)}:y=h-${fsz(0.034)}`);
}
const audio = A.audio ? path.resolve(DIR, A.audio) : F('vo/vo.wav');
const hasAudio = fs.existsSync(audio);
fs.mkdirSync(path.dirname(out), { recursive: true });
ff(['-i', joined, ...(hasAudio ? ['-i', audio] : []), ...(vf.length ? ['-vf', vf.join(',')] : []), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '160k', '-af', 'apad', '-shortest'] : []), '-frames:v', String(last), out]);
fs.rmSync(tmp, { recursive: true, force: true });
const CUTS = [...shots.map(s => s.a), last];
console.log(`${path.relative(ROOT, out)}: ${shots.length} shots, ${last} f (${(last / fps).toFixed(2)} s)${hasAudio ? '' : ', no audio (vo/vo.wav missing)'}${A.safe === '1' ? ', UI bands shaded' : ''}`);
console.log(`reel.js: export const CUTS = [${CUTS.join(', ')}];`);
