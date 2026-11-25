// The fits table's rows that are not clips (fits.mjs --kinds), each measured with the frozen limits of kit/compat-limits.json.
//   face|<age>|<body>         the face of that age on its own body: pass when the age is on Kai's approved sheet (limits.face.approved)
//                             and eyegate passes; an age that waits for Kai (limits.face.waits) is blocked; another body: no row (untested)
//   outfit|<garment>|<body>   the garment alone on the body, by trims() of test/unit/wardrobe-measure.mjs: no piece floats, a ring's gap
//                             under limits.outfit.ring_mm, a piece moves at most limits.outfit.TRIM_MM on the shell as it bends
//   mark|bold:<mark>|<hat>    the share of the bold mark's card a wardrobe hat hides, front and 24 deg round (stick-wardrobe-age.test.mjs);
//                             over limits.mark.cover (0) is blocked
//   hand|<prop>|<body>|<at>, light|<prop>|<light>   no measure yet: no row (untested)
import * as THREE from 'three';
import { pair, SHAPES } from '../../kit/cast/compat.js';

const { LIMITS } = await import('./fits.mjs');
export const OWN = { adult: ['adult', 'heavy', 'thin'], elder: ['elder'], child: ['child'], teen: ['teen'], toddler: ['toddler'] };
export const HATS = ['cap:police', 'cap:pilot', 'cap:scrub', 'hat:hard', 'hat:toque'];
const row = (p, kind, verdict, number, unit, bad, why) => ({ pair: p, kind, verdict, number, unit, bad, ...(why ? { why } : {}) });

export async function faces() {
  const { eyegate } = await import('./eyegate.mjs'), E = await eyegate(), low = +(100 * Math.min(...E.rows.filter(r => r.kind === 's2' && r.pupilW != null).map(r => r.pupilW))).toFixed(1), F = LIMITS.face, U = '% pupil of the eye (eyegate, lowest)', rows = [];
  for (const [age, bodies] of Object.entries(OWN)) for (const body of bodies) {
    const p = pair('face', age, body);
    if (!F.approved.includes(age)) rows.push(row(p, 'face', 'blocked', null, null, 0, F.waits.includes(age) ? `the ${age} face on the ${body} body waits for Kai (${F.from})` : `not on Kai's face sheet (${F.from})`));
    else rows.push(E.ok ? row(p, 'face', 'pass', low, U, 0) : row(p, 'face', 'blocked', low, U, 0, 'eyegate fails'));
  }
  return rows;
}

// the garments a body wears as a kit part: every SHAPES layer and its shape words (no colour)
export const garments = () => Object.entries(SHAPES).flatMap(([k, w]) => (k === 'hoodie' || k === 'belt' || k === 'holster' ? [] : [k, ...w.map(x => `${k}:${x}`)])).filter(g => !/^(cap|hat|hat:(cowboy|flat|bowler|top))$/.test(g));
export async function outfits(bodies = ['adult', 'heavy', 'thin', 'elder', 'child'], list = garments()) {
  const M = await import('../../../../test/unit/wardrobe-measure.mjs'), { rigStick } = await import('./motionlib.mjs'), O = LIMITS.outfit, rows = [];
  for (const body of bodies) for (const g of list) {
    const p = pair('outfit', g, body); let t;
    try { const { S } = await rigStick(body); M.wears(S, [g]); if (!S.wardrobe.group.children.length && !S.wardrobe.drapes?.length && !S.wardrobe.hats?.length) { rows.push(row(p, 'outfit', 'untested', null, null, null, 'nothing drawn')); continue; } t = M.trims(S, g); }
    catch (e) { rows.push(row(p, 'outfit', 'untested', null, null, null, String(e.message).slice(0, 160))); continue; }
    const worst = Math.max(t.shift.mm, t.gapMax), why = [...t.floats.slice(0, 2), t.ring.mm >= O.ring_mm ? t.ring.what : '', t.shift.mm > O.TRIM_MM ? t.shift.what : ''].filter(Boolean).join(' | ');
    rows.push(why ? row(p, 'outfit', 'blocked', +worst.toFixed(1), 'mm, a trim off or moving on the shell', t.floats.length, why) : row(p, 'outfit', 'pass', +t.shift.mm.toFixed(1), 'mm a trim moves on the shell as it bends', 0));
  }
  return rows;
}

// the share of a bold mark's card (its middle 90 %) a hat hides from the lens, front and 24 deg round
export async function marks(hats = HATS) {
  const { rigStick } = await import('./motionlib.mjs'), M = await import('../../../../test/unit/wardrobe-measure.mjs'), { useHeadMarks, BOLD_MARKS } = await import('../../engine/headmarks.js');
  const CAMS = [[0, -4, 1.5], [1.6, -3.6, 1.5]], ray = new THREE.Raycaster(), rows = [], P0 = { pos: [0, 0, 0], yaw: 0, expr: 'neutral' };
  const cards = S => { const l = []; S.parts.marks.traverse(m => { if (m.isMesh && m.visible) l.push(m); }); return l; };
  const hidden = (S, kind) => { let hid = 0, n = 0; const hat = []; for (const h of S.wardrobe?.hats || []) h.traverse(o => { if (o.isMesh) hat.push(o); });
    for (let t = 0; t < 90; t += 12) for (const cam of CAMS) { S.face({ expr: 'neutral', t, age: 60, cam, marks: [[kind, 30]] }); S.root.updateMatrixWorld(true); const C = new THREE.Vector3(cam[0], cam[2], -cam[1]);
      for (const m of cards(S)) for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { if (Math.hypot(i, j) > 3.6) continue; const q = new THREE.Vector3(i / 8, j / 8, 0).applyMatrix4(m.matrixWorld), d = q.distanceTo(C); ray.set(C, q.sub(C).normalize()); ray.far = d - 1e-3; n++; if (ray.intersectObjects(hat, false).length) hid++; } }
    return n ? hid / n : null; };
  useHeadMarks('bold');
  try { for (const h of hats) { const { S } = await rigStick('adult'); M.wears(S, [h]); S.pose2(P0);
    for (const k of BOLD_MARKS) { const x = hidden(S, k), p = pair('mark', `bold:${k}`, h);
      rows.push(x == null ? row(p, 'mark', 'untested', null, null, null, 'no card drawn') : x > LIMITS.mark.cover ? row(p, 'mark', 'blocked', +(100 * x).toFixed(1), '% of the mark under the hat', 0, `the ${h} hides ${(100 * x).toFixed(1)} % of the ${k} mark`) : row(p, 'mark', 'pass', 0, '% of the mark under the hat', 0)); } } }
  finally { useHeadMarks(); }
  return rows;
}

export async function kinds() { return [...await faces(), ...await marks(), ...await outfits()]; }
