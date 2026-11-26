// Hand grip gate (whatif1 v5, 26/11: a tin with the hands as dots on its label, a baby bundle floating beside the arms, a
// photo in front of the chest with no hand on it, and every gate passed them). Each frame's rows carry held[]: every prop
// a hand holds that frame (a set prop in mode 'hand', a cast.js hand prop fully in the hand), with gapCm, the air
// from the hand's drawn edge (its world radius with its ink outline, scale and gloves included) to the nearest point of the prop's meshes
// (engine/grip.js, anchor 'edge': both sides to their drawn edge, ink outlines included), never the grip socket the engine snaps onto the hand; each hand of a prop held in
// both is measured on its own. Any frame
// on screen over GAP_CM (handgrip.limits.json, frozen before anything was measured) fails.
//   node styles/stick-man/tools/gates/handgrip.mjs films/<slug> [--frames 120-300]      rows from review/shot-rows.jsonl
//   node styles/stick-man/tools/gates/handgrip.mjs --rows <rows.jsonl> [--frames a-b] [--json 1]   -> exit 1 on a fault
//     (rows made before this gate carry gapPx only: exit 2, make them again with shot.mjs --dbg)
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { STANDIN_CM } from '#engine/grip.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../../..');
export { STANDIN_CM };
export const { GAP_CM } = JSON.parse(fs.readFileSync(path.join(HERE, 'handgrip.limits.json'), 'utf8'));

// rows -> { ok, nothing, faults: [{ f, actor, prop, side, cm, anchor }], checked, unmeasured }. Per frame:
// - held[]: each held prop on screen, its air (anchor 'edge'); one under STANDIN_CM in every drawn dimension (the rows'
//   track size) is a 'stand-in' fault and measures nothing; a prop with nothing drawn ('empty') is a fault;
// - every gripping hand (actors.<a>.limbs.<side>.grip) of an actor in frame is measured: its grips[] entry (play.js, the
//   nearest shown prop by engine/grip.js nearestGap) over GAP_CM fails, on no prop ('none') fails; with no grips[] entry,
//   a held prop on that hand measures it; a gripping hand nothing measures is an 'unmeasured grip' fault.
// No rows in range, a row with no held array, a gapCm missing or an anchor other than 'edge' is unmeasured (never a
// pass). nothing: no held prop and no gripping hand in range (a pass that says so).
export function handgrip(rows, { frames } = {}) {
  const faults = []; let checked = 0, unmeasured = 0, seen = 0, any = 0;
  const fault = (r, h, side, cm, anchor) => faults.push({ f: r.f, actor: h.actor, prop: h.prop ?? null, side, cm, anchor });
  for (const r of [...rows].sort((a, b) => a.f - b.f)) {
    if (frames && (r.f < frames[0] || r.f > frames[1])) continue;
    seen++;
    if (!Array.isArray(r.held)) { unmeasured++; continue; }
    const cover = new Set(), size = id => r.track?.[id]?.size;
    for (const h of r.held) {
      any++;
      if (!h.onScreen) { cover.add(`${h.actor}.${h.side}`); continue; }
      const sz = [`${h.actor}:${h.side}${h.prop}`, `${h.actor}:B${h.prop}`, h.prop].map(size).find(x => x != null);
      if (sz != null && sz * 100 < STANDIN_CM) { checked++; fault(r, h, h.side, +(sz * 100).toFixed(2), 'stand-in'); continue; }
      if (h.anchor === 'empty') { checked++; fault(r, h, h.side, null, 'empty'); continue; }
      if (h.gapCm == null || h.anchor !== 'edge') { unmeasured++; continue; }   // any other anchor is an older measure
      checked++; cover.add(`${h.actor}.${h.side}`);
      if (h.gapCm > GAP_CM) fault(r, h, h.side, h.gapCm, h.anchor);
    }
    const G = new Map((Array.isArray(r.grips) ? r.grips : []).map(g => [`${g.actor}.${g.side}`, g]));
    for (const [actor, A] of Object.entries(r.actors || {})) {
      if (A.inFrame === false) continue;
      for (const side of ['L', 'R']) {
        if (!A.limbs?.[side]?.grip) continue;
        any++; const g = G.get(`${actor}.${side}`);
        if (g) {
          if (!g.onScreen) continue;
          if (g.anchor === 'none') { checked++; fault(r, { actor }, side, null, 'none'); continue; }
          if (g.gapCm == null || g.anchor !== 'edge') { unmeasured++; continue; }
          checked++; if (g.gapCm > GAP_CM) fault(r, { actor, prop: g.prop }, side, g.gapCm, 'edge');
          continue;
        }
        if (cover.has(`${actor}.${side}`)) continue;
        checked++; fault(r, { actor }, side, null, 'unmeasured grip');
      }
    }
  }
  if (!seen) unmeasured++;
  return { ok: !faults.length && !unmeasured, nothing: !!seen && !any, faults, checked, unmeasured };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), A = {};
  let rowsFile;
  if (argv[0] && !argv[0].startsWith('--')) { rowsFile = path.join(path.resolve(ROOT, argv[0]), 'review', 'shot-rows.jsonl'); argv.shift(); }
  for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  rowsFile = A.rows || rowsFile;
  if (!rowsFile || !fs.existsSync(rowsFile)) { console.error('usage: handgrip.mjs films/<slug> | --rows <rows.jsonl> [--frames a-b] [--json 1]'); process.exit(2); }
  const rows = fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  let frames;
  if (A.frames != null) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(A.frames);
    if (!m || (m[2] != null && +m[2] < +m[1])) { console.error(`bad --frames ${A.frames}: give a frame (120) or a range a-b with a <= b (120-300)`); process.exit(2); }
    frames = [+m[1], +(m[2] ?? m[1])];
  }
  const R = handgrip(rows, { frames });
  if (A.json) console.log(JSON.stringify(R, null, 1));
  else {
    const say = { empty: () => 'held, but it has nothing drawn to measure to', 'stand-in': x => `held, but it is a stand-in ${x.cm} cm across (under ${STANDIN_CM} cm): the visible prop is not in this hand`,
      none: () => 'grips, but no shown prop is near it', 'unmeasured grip': () => 'grips, but nothing measures this hand (no grips[] row, no held prop)',
      edge: x => `${x.cm.toFixed(2)} cm of air between the hand and the prop (limit ${GAP_CM} cm)` };
    for (const x of R.faults) console.log(`FAIL ${x.actor} ${x.prop ?? '-'} ${x.side} f${x.f} ${say[x.anchor](x)}`);
    if (R.unmeasured) console.log(`${R.unmeasured} unmeasured (no rows in range, rows with no held array, or held props with no gapCm: rows made before this gate; make them again with shot.mjs --dbg)`);
    console.log(R.ok && R.nothing ? 'handgrip PASS: nothing held (no held prop, no gripping hand)' : `handgrip ${R.ok ? 'PASS' : 'FAIL'} (${R.checked} held props and gripping hands on screen measured, limit ${GAP_CM} cm)`);
  }
  process.exit(R.unmeasured && !R.faults.length ? 2 : R.ok ? 0 : 1);
}
