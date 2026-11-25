// The fits table's rows that are not clips (fits.mjs --kinds): what film.js asks besides a clip, each with what it rests on.
//   face|<age>|<body>    the s2 face of that age on that body: pass on its own body when eyegate passes and the age is on Kai's approved
//                        face sheet; teen and toddler are blocked until Kai sees them on their bodies; any other body is untested (no row)
//   outfit|<garment>|<body>   pass when the body plays at least one clip in it cleanly (the clip rows), blocked when it plays none
//   mark|bold:<mark>|<hat>    untested: nobody has measured a bold mark against a brim
//   hand|<prop>|<body>|<at>, light|<prop>|<light>   untested: no measure yet
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../../../../kit/env.mjs';
import { pair, USABLE } from '../../kit/cast/compat.js';

const KIT = path.join(ROOT, 'styles/stick-man/kit'), APPROVED = path.join(ROOT, 'styles/stick-man/tools/series/kitfaces/review/faces-approved.json');
// each face age and the bodies it is drawn for
export const OWN = { adult: ['adult', 'heavy', 'thin'], elder: ['elder'], child: ['child'], teen: ['teen'], toddler: ['toddler'] };
export const WAITS = { teen: 'the teen face is not on the approved sheet and nobody has seen it on the teen body: waits for Kai', toddler: 'the toddler face was approved on the sheet, not yet on the toddler body (#206): waits for Kai' };

export async function faces() {
  const { eyegate } = await import('./eyegate.mjs'), E = await eyegate(), s2 = E.rows.filter(r => r.kind === 's2' && r.pupilW != null);
  const low = Math.min(...s2.map(r => r.pupilW)), approved = JSON.parse(fs.readFileSync(APPROVED, 'utf8')).by === 'kai', rows = [];
  for (const [age, bodies] of Object.entries(OWN)) for (const body of bodies) {
    const p = pair('face', age, body);
    if (WAITS[age]) rows.push({ pair: p, kind: 'face', verdict: 'blocked', number: null, unit: null, bad: 0, why: WAITS[age] });
    else if (!E.ok || !approved) rows.push({ pair: p, kind: 'face', verdict: 'blocked', number: +(100 * low).toFixed(1), unit: '% pupil of the eye (eyegate, lowest)', bad: 0, why: E.ok ? 'the face sheet is not approved by Kai' : 'eyegate fails' });
    else rows.push({ pair: p, kind: 'face', verdict: 'pass', number: +(100 * low).toFixed(1), unit: '% pupil of the eye (eyegate, lowest)', bad: 0 });
  }
  return rows;
}

// garment x body from the clip rows: { 'coat|adult': { ok, all } }
export function outfits(clipRows) {
  const seen = new Map();
  for (const r of clipRows) {
    if (r.kind !== 'clip') continue; const [, key] = r.pair.split('|'), [body, , worn] = key.split('/');
    for (const g of worn === 'plain' ? [] : worn.split('+')) { const k = `${g}|${body}`, n = seen.get(k) || { ok: 0, all: 0 }; n.all++; if (USABLE.includes(r.verdict)) n.ok++; seen.set(k, n); }
  }
  return [...seen].map(([k, n]) => { const [g, body] = k.split('|'); return n.ok
    ? { pair: pair('outfit', g, body), kind: 'outfit', verdict: 'pass', number: n.ok, unit: `clips played cleanly in it, of ${n.all} measured`, bad: n.all - n.ok }
    : { pair: pair('outfit', g, body), kind: 'outfit', verdict: 'blocked', number: 0, unit: `clips played cleanly in it, of ${n.all} measured`, bad: n.all, why: 'no clip measured in it is clean on this body' }; });
}

export async function kinds() {
  const T = JSON.parse(fs.readFileSync(path.join(KIT, 'compat.json'), 'utf8'));
  return [...await faces(), ...outfits(T.rows)];
}
