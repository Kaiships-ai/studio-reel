// Creepy-eyes gate (Kai 22/11, Hot Money ep01 A v9: the hero's and the tellers' wide eyes "look creepy"): every open-eyed face
// design of the face style s2 (and the kit's ring-eyed faces) is measured as it is drawn (engine/eyegeom.js) and held to
// LIMITS: a calm face's pupil fills >= 55 % of the eye's width and the upper lid leaves <= 10 % of the eye's height of white
// above it; a fear or shock face (white >= 0.6) keeps a pupil >= 42 % wide and <= 30 % white above it. A small pupil
// floating in white is the stare.
//   node styles/stick-man/tools/gates/eyegate.mjs [--json 1]     -> a table, exit 1 when a design fails
import { pathToFileURL } from 'node:url';
import { judge, LIMITS } from '../../engine/eyegeom.js';
import { EXPR } from '../../engine/faces.js';

const ST = 0.022;   // faces.js eye(): the ring's ink width
// the kit's ring eyes (faces.js eye(), white > 0): a pupil in a white disc; its share of the disc's width is what reads
export function kitRing(name, D) {
  const white = D.white || 0, inner = Math.max(0.001, (Math.min(D.rx, D.ry) - ST) * white), p0 = D.pupil ?? 0.02;
  const pr = p0 + (Math.min(D.rx, D.ry) - ST - p0) * (1 - white), pupilW = pr / inner;
  const ok = pupilW >= LIMITS.shock.pupilW;
  return { name, kind: 'kit ring', pupilW, whiteAbove: null, ok, bad: ok ? [] : [`pupil ${(pupilW * 100).toFixed(0)}% of the ring (< ${LIMITS.shock.pupilW * 100}%)`] };
}
export async function eyegate() {
  const S2 = await import('../../engine/facestyles/s2.js'), rows = [];
  for (const [name, D] of Object.entries(S2.DESIGNS)) if (D.rx && D.ry) rows.push({ name, kind: 's2', ...judge(D) });
  for (const [name, D] of Object.entries(EXPR)) if (!name.endsWith('_o') && !name.endsWith('_O') && (D.white || 0) > 0.01 && D.eye === 'oval') rows.push(kitRing(name, D));
  return { ok: rows.every(r => r.ok), rows };
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const R = await eyegate(), json = process.argv.includes('--json');
  if (json) console.log(JSON.stringify(R, null, 1));
  else for (const r of R.rows) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.kind.padEnd(8)} ${r.name.padEnd(14)} pupil ${(r.pupilW * 100).toFixed(0).padStart(3)}%${r.whiteAbove == null ? '' : `  white above ${(r.whiteAbove * 100).toFixed(0).padStart(2)}%`}${r.bad.length ? '  ' + r.bad.join('; ') : ''}`);
  console.log(R.ok ? 'eyegate PASS' : 'eyegate FAIL'); process.exit(R.ok ? 0 : 1);
}
