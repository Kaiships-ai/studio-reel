// Face gate (Kai 22/11, Hot Money ep01 A v10a: the hero's face crammed onto the edge of his hood, a teller's eye drawn as a
// wide black band, while eyegate PASSED). eyegate measures each face DESIGN flat, as drawn once; this gate measures every
// rendered frame: the face texture the engine laid on the head that frame, after it was wrapped round the turning head.
//   engine/faces.js measures, on each frame's face texture, how much wider than drawn the most-stretched mark came out
//   (stats.stretch: the strips' scale over every column of the drawing with ink or white in it, shown at half alpha or
//   more), and the render's rows carry it as actors[n].faceStretch. On a ball a mark only narrows as it turns away from the
//   lens; the widest it can legally come out is ~1.2x (a mouth corner at the drawing's side, wrapped to the front). Wider
//   than LIMIT on a readable face (head >= MIN_FACE of the frame's height, the face >= half seen) for HOLD frames is a
//   stretched face. faces.js also reports faceLag (how much less than its turn target, faceTurn x the head's yaw, the drawn face turned) and cast.js faceRoll
//   (how far the face's up is from the head's up, along the lens): a bare head's face more than LAG behind, or any face
//   more than ROLL off its head's tilt, for HOLD frames, slides on the head. (faceRoll reads the frame the shell was laid with:
//   0 while cast.js layFace lays it with the head's up, as it must; a face laid level with the world reads the head's tilt.)
//   node styles/stick-man/tools/gates/facegate.mjs films/<slug>                          rows from review/shot-rows.jsonl
//   node styles/stick-man/tools/gates/facegate.mjs --rows <rows.jsonl> [--rows-size 720x1280] [--json 1]   -> exit 1 on a fault
//     (--rows-size: the --w x --h the rows were made at, 1080x1920 by default; rows made before this gate have no
//      faceStretch / faceLag / faceRoll: exit 2, make them again with shot.mjs --dbg)
// Run at ◇5 (GATES.json, beside valuegate).
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { MIN_FACE } from '#tools/gates/facebeat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const LIMIT = 1.3, HOLD = 3, MIN_VIS = 0.5;
// slide (Kai 23/11, Ep1 v12 1:12: the blond teller on the phone, her face stayed put while her head turned and tilted, under
// her hair): LAG rad, how much less than its head a face on a bare head (no hood or cap rim to keep its marks inside) may
// turn; ROLL deg, how far a face's up may turn from its head's up as the lens sees them (the face stayed level while the
// head tilted 13 deg)
export const LAG = 0.12, ROLL = 6;
const CHECKS = [
  { kind: 'stretched', val: a => a.faceStretch, bad: a => a.faceStretch > LIMIT, why: p => `a face mark came out ${p.toFixed(2)}x as wide as drawn (limit ${LIMIT}x): the face is stretched round the head` },
  { kind: 'slides (turn)', val: a => a.faceLag, bad: a => !a.facePlate && a.faceLag > LAG, why: p => `the face turned ${p.toFixed(2)} rad less than its turn target (faceTurn x the head's yaw; limit ${LAG} on a head with no hood or cap): it slides across the head` },
  { kind: 'slides (tilt)', val: a => a.faceRoll, bad: a => a.faceRoll > ROLL, why: p => `the face stayed ${p.toFixed(0)} deg off the head's tilt (limit ${ROLL}): it slides round the head` },
];
const MEASURED = ['faceStretch', 'faceLag', 'faceRoll'];

// rows -> { ok, faults: [{ who, kind, from, to, peak, why }], checked, unmeasured }
export function facegate(rows, H = 1920) {
  const by = {}; let checked = 0, unmeasured = 0;
  for (const row of [...rows].sort((a, b) => a.f - b.f)) for (const [who, a] of Object.entries(row.actors || {})) {
    if (a.inFrame === false || !a.head || (a.faceVis ?? 1) < MIN_VIS || (a.head[3] - a.head[1]) / H < MIN_FACE) continue;
    if (MEASURED.some(k => a[k] == null)) { unmeasured++; continue; }
    checked++; (by[who] ||= []).push({ f: row.f, a });
  }
  const faults = [];
  for (const [who, L] of Object.entries(by)) for (const C of CHECKS) {
    let s = -1;
    for (let i = 0; i <= L.length; i++) {
      const bad = i < L.length && C.bad(L[i].a), joined = bad && s >= 0 && L[i].f - L[i - 1].f === 1;
      if (s >= 0 && !joined) { if (i - s >= HOLD) { const peak = Math.max(...L.slice(s, i).map(x => C.val(x.a))); faults.push({ who, kind: C.kind, from: L[s].f, to: L[i - 1].f, peak, why: C.why(peak) }); } s = -1; }
      if (bad && s < 0) s = i;
    }
  }
  faults.sort((x, y) => x.from - y.from);
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
    for (const f of R.faults) console.log(`FAIL ${f.who} f${f.from}-${f.to} ${f.kind}: ${f.why}`);
    if (R.unmeasured) console.log(`${R.unmeasured} readable faces have no faceStretch / faceLag / faceRoll: the rows were made before this gate; make them again (shot.mjs --dbg)`);
    console.log(`facegate ${R.ok ? 'PASS' : 'FAIL'} (${R.checked} readable faces measured)`);
  }
  process.exit(R.unmeasured && !R.faults.length ? 2 : R.ok ? 0 : 1);
}
