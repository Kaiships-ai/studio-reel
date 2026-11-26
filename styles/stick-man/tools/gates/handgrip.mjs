// Hand grip gate (whatif1 v5, 26/11: a tin with the hands as dots on its label, a baby bundle floating beside the arms, a
// photo in front of the chest with no hand on it, and every gate passed them). Each frame's rows carry held[]: every prop
// a hand holds that frame (a set prop in mode 'hand', a cast.js hand prop fully in the hand), with gapCm, the air
// between the hand dot and the prop's anchor (engine/grip.js): its grip socket (anchor 'grip') or, with none, the
// nearest point of its box (anchor 'bounds'); each hand of a prop held in both is measured to its box. Any frame
// on screen over GAP_CM (handgrip.limits.json, frozen before anything was measured) fails.
//   node styles/stick-man/tools/gates/handgrip.mjs films/<slug> [--frames 120-300]      rows from review/shot-rows.jsonl
//   node styles/stick-man/tools/gates/handgrip.mjs --rows <rows.jsonl> [--frames a-b] [--json 1]   -> exit 1 on a fault
//     (rows made before this gate carry gapPx only: exit 2, make them again with shot.mjs --dbg)
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../../..');
export const { GAP_CM } = JSON.parse(fs.readFileSync(path.join(HERE, 'handgrip.limits.json'), 'utf8'));

// rows -> { ok, faults: [{ f, actor, prop, side, cm, anchor }], checked, unmeasured }
export function handgrip(rows, { frames } = {}) {
  const faults = []; let checked = 0, unmeasured = 0;
  for (const r of [...rows].sort((a, b) => a.f - b.f)) {
    if (frames && (r.f < frames[0] || r.f > frames[1])) continue;
    for (const h of r.held || []) {
      if (!h.onScreen) continue;
      if (h.gapCm == null) { unmeasured++; continue; }
      checked++;
      if (h.gapCm > GAP_CM) faults.push({ f: r.f, actor: h.actor, prop: h.prop, side: h.side, cm: h.gapCm, anchor: h.anchor });
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
  if (!rowsFile || !fs.existsSync(rowsFile)) { console.error('usage: handgrip.mjs films/<slug> | --rows <rows.jsonl> [--frames a-b] [--json 1]'); process.exit(2); }
  const rows = fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const frames = A.frames ? A.frames.split('-').map(Number) : undefined;
  if (frames && frames.length === 1) frames.push(frames[0]);
  const R = handgrip(rows, { frames });
  if (A.json) console.log(JSON.stringify(R, null, 1));
  else {
    for (const x of R.faults) console.log(`FAIL ${x.actor} ${x.prop} ${x.side} f${x.f} ${x.cm.toFixed(2)} cm off the hand (to its ${x.anchor === 'grip' ? 'grip socket' : 'box'}; limit ${GAP_CM} cm)`);
    if (R.unmeasured) console.log(`${R.unmeasured} held props have no gapCm: the rows were made before this gate; make them again (shot.mjs --dbg)`);
    console.log(`handgrip ${R.ok ? 'PASS' : 'FAIL'} (${R.checked} held props on screen measured, limit ${GAP_CM} cm)`);
  }
  process.exit(R.unmeasured && !R.faults.length ? 2 : R.ok ? 0 : 1);
}
