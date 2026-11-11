// Look measurements on rendered frames (GATES.md "Look gates"), the same code for our mp4 and for reference stills.
//   node styles/stick-man/tools/look_measure.mjs <image or mp4> [...]      prints one line per frame / file
// ink: thin dark lines found by scanning rows and columns of the luma (Y) image at 1080x1920:
//   a run of 1-14 px with Y < 72 whose neighbours on both sides are at least 45 brighter and above 90.
//   inkPx = median run width (px at 1080 wide), inkCover = run pixels per 1000 scanned pixels.
// The caption band (60-80 % of the height) is left out so the caption stroke never counts as ink.
// caption: rows 60-80 % holding white glyph pixels (all channels > 225) next to black stroke pixels (< 40):
//   capPx = height of the tallest contiguous run of such rows (px at 1920 tall).
import { run } from '../../../kit/env.mjs';
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from 'node:url';

export const W = 1080, H = 1920;
const T_DARK = 72, STEP = 45, BRIGHT = 90, MAXRUN = 14;

// frames of a video (every 1/fps s) or one still, scaled to 1080x1920, as rgb24 buffers
export function decode(file, fps = 2) {
  const isVid = /\.(mp4|mov|webm)$/i.test(file);
  const vf = `${isVid ? `fps=${fps},` : ''}scale=${W}:${H}:flags=bicubic,format=rgb24`;
  const r = run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path.resolve(file), '-vf', vf, '-f', 'rawvideo', '-'], { capture: true, encoding: 'buffer', maxBuffer: 2 ** 31 });
  const buf = Buffer.isBuffer(r.stdout) ? r.stdout : Buffer.from(r.stdout || '', 'binary'), n = Math.floor(buf.length / (W * H * 3));
  return Array.from({ length: n }, (_, i) => buf.subarray(i * W * H * 3, (i + 1) * W * H * 3));
}

export function measure(rgb) {
  const Y = new Uint8Array(W * H);
  for (let i = 0, j = 0; i < Y.length; i++, j += 3) Y[i] = (0.2126 * rgb[j] + 0.7152 * rgb[j + 1] + 0.0722 * rgb[j + 2]) | 0;
  const cap0 = Math.round(0.60 * H), cap1 = Math.round(0.80 * H), runs = []; let inkPx = 0, scanned = 0;
  const scan = (get, len) => {
    let i = 0;
    while (i < len) {
      if (get(i) >= T_DARK) { i++; continue; }
      let j = i, s = 0; while (j < len && get(j) < T_DARK) { s += get(j); j++; }
      const w = j - i;
      if (w <= MAXRUN && i >= 2 && j + 1 < len) {
        const m = s / w, a = Math.max(get(i - 1), get(i - 2)), b = Math.max(get(j), get(j + 1));
        if (a > BRIGHT && b > BRIGHT && a - m > STEP && b - m > STEP) { runs.push(w); inkPx += w; }
      }
      i = j;
    }
  };
  for (let y = 0; y < H; y += 2) { if (y >= cap0 && y < cap1) continue; const o = y * W; scan(x => Y[o + x], W); scanned += W; }
  for (let x = 0; x < W; x += 2) {
    scan(y => Y[(y < cap0 ? y : y + (cap1 - cap0)) * W + x], H - (cap1 - cap0)); scanned += H - (cap1 - cap0);
  }
  runs.sort((a, b) => a - b);
  // caption glyph height: white pixels with a black stroke pixel within 9 px
  let best = 0, cur = 0;
  for (let y = cap0; y < cap1; y++) {
    let hits = 0; const o = y * W;
    for (let x = 9; x < W - 9 && hits < 3; x++) {
      const k = (o + x) * 3; if (rgb[k] < 226 || rgb[k + 1] < 226 || rgb[k + 2] < 226) continue;
      for (const d of [-9, -6, -3, 3, 6, 9]) { const q = (o + x + d) * 3; if (rgb[q] < 40 && rgb[q + 1] < 40 && rgb[q + 2] < 40) { hits++; break; } }
    }
    if (hits >= 3) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  // caption weight: in the caption rows, the median width of a white glyph run (a stem) and of the black stroke run that
  // borders it on the outside (dark run 2-20 px with white on one side and a non-dark, non-white pixel on the other)
  const stems = [], strokes = [], isW = q => rgb[q] > 225 && rgb[q + 1] > 225 && rgb[q + 2] > 225, isK = q => rgb[q] < 50 && rgb[q + 1] < 50 && rgb[q + 2] < 50;
  if (best >= 20) for (let y = cap0; y < cap1; y += 3) {
    const o = y * W; let x = 1;
    while (x < W - 1) {
      const q = (o + x) * 3;
      if (isW(q)) { let j = x; while (j < W && isW((o + j) * 3)) j++; const nk = (from, d) => { for (let e = 1; e <= 4; e++) { const xx = from + d * e; if (xx < 0 || xx >= W) return false; if (isK((o + xx) * 3)) return true; } return false; };
        if (nk(x, -1) && nk(j - 1, 1) && j - x <= 40) stems.push(j - x); x = j; continue; }
      if (isK(q)) { let j = x; while (j < W && isK((o + j) * 3)) j++; const L = j - x, a = isW((o + x - 1) * 3), b = j < W && isW((o + j) * 3);
        if (L >= 2 && L <= 20 && a !== b) strokes.push(L); x = j; continue; }
      x++;
    }
  }
  stems.sort((a, b) => a - b); strokes.sort((a, b) => a - b);
  return { inkPx: runs.length ? runs[runs.length >> 1] : 0, inkCover: 1000 * inkPx / scanned, inkRuns: runs.length, capPx: best,
    capStem: stems.length > 20 ? stems[stems.length >> 1] : 0, capStroke: strokes.length > 20 ? strokes[strokes.length >> 1] : 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const f of process.argv.slice(2)) {
    if (!fs.existsSync(f)) { console.error('missing', f); continue; }
    decode(f).forEach((fr, i) => { const m = measure(fr);
      console.log(`${f.split('/').pop()}#${i}  ink ${m.inkPx} px, cover ${m.inkCover.toFixed(1)} per mille (${m.inkRuns} runs), caption ${m.capPx} px, stem ${m.capStem} px, stroke ${m.capStroke} px`); });
  }
}
