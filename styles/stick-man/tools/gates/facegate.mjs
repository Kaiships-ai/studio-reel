// Face gate (Kai 22/11, Hot Money ep01 A v10a: the hero's face crammed onto the edge of his hood, a teller's eye drawn as a
// wide black band, while eyegate PASSED). eyegate measures each face DESIGN flat, as drawn once; this gate measures every
// rendered frame: the face texture the engine laid on the head that frame, after it was wrapped round the turning head.
//   engine/faces.js measures, on each frame's face texture, how much wider than drawn the most-stretched mark came out
//   (stats.stretch: the strips' scale over every column of the drawing with ink or white in it, shown at half alpha or
//   more), and the render's rows carry it as actors[n].faceStretch. On a ball a mark only narrows as it turns away from the
//   lens; the widest it can legally come out is ~1.2x (a mouth corner at the drawing's side, wrapped to the front). Wider
//   than LIMIT on a readable face (head >= MIN_FACE of the frame's height, the face >= half seen) for HOLD frames is a
//   stretched face.
//   node styles/stick-man/tools/gates/facegate.mjs films/<slug>                          rows from review/shot-rows.jsonl
//   node styles/stick-man/tools/gates/facegate.mjs --rows <rows.jsonl> [--rows-size 720x1280] [--json 1]   -> exit 1 on a fault
//     (--rows-size: the --w x --h the rows were made at, 1080x1920 by default; rows made before this gate have no
//      faceStretch: exit 2, make them again with shot.mjs --dbg)
// Run at ◇5 (GATES.json, beside valuegate).
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { MIN_FACE } from '#tools/gates/facebeat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const LIMIT = 1.3, HOLD = 3, MIN_VIS = 0.5;

// rows -> { ok, faults: [{ who, from, to, peak }], checked, unmeasured }
export function facegate(rows, H = 1920) {
  const by = {}; let checked = 0, unmeasured = 0;
  for (const row of [...rows].sort((a, b) => a.f - b.f)) for (const [who, a] of Object.entries(row.actors || {})) {
    if (a.inFrame === false || !a.head || (a.faceVis ?? 1) < MIN_VIS || (a.head[3] - a.head[1]) / H < MIN_FACE) continue;
    if (a.faceStretch == null) { unmeasured++; continue; }
    checked++; (by[who] ||= []).push({ f: row.f, s: a.faceStretch });
  }
  const faults = [];
  for (const [who, L] of Object.entries(by)) {
    let a = -1;
    for (let i = 0; i <= L.length; i++) {
      const bad = i < L.length && L[i].s > LIMIT, joined = bad && a >= 0 && L[i].f - L[i - 1].f === 1;
      if (a >= 0 && !joined) { if (i - a >= HOLD) faults.push({ who, from: L[a].f, to: L[i - 1].f, peak: Math.max(...L.slice(a, i).map(x => x.s)) }); a = -1; }
      if (bad && a < 0) a = i;
    }
  }
  return { ok: !faults.length && !unmeasured, faults, checked, unmeasured };
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), A = {};
  let rowsFile;
  if (argv[0] && !argv[0].startsWith('--')) { rowsFile = path.join(path.resolve(ROOT, argv[0]), 'review', 'shot-rows.jsonl'); argv.shift(); }
  for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  rowsFile = A.rows || rowsFile;
  if (!rowsFile || !fs.existsSync(rowsFile)) { console.error('usage: facegate.mjs films/<slug> | --rows <rows.jsonl> [--rows-size 720x1280] [--json 1]'); process.exit(2); }
  const rows = fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const H = +(A['rows-size'] || '1080x1920').split('x')[1];
  const R = facegate(rows, H);
  if (A.json) console.log(JSON.stringify(R, null, 1));
  else {
    for (const f of R.faults) console.log(`FAIL ${f.who} f${f.from}-${f.to}: a face mark came out ${f.peak.toFixed(2)}x as wide as drawn (limit ${LIMIT}x): the face is stretched round the head`);
    if (R.unmeasured) console.log(`${R.unmeasured} readable faces have no faceStretch: the rows were made before this gate; make them again (shot.mjs --dbg)`);
    console.log(`facegate ${R.ok ? 'PASS' : 'FAIL'} (${R.checked} readable faces measured)`);
  }
  process.exit(R.unmeasured && !R.faults.length ? 2 : R.ok ? 0 : 1);
}
