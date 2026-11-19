// No face design reaches a film before Kai approves its face sheet (styles/stick-man/tools/facesheet.mjs, facebeat.mjs
// (3)). Hot Money ep01 r5 s1, 19/11 22:49: a fix round swapped the hero's faces, Kai saw them first in the film ("xấu thậm
// tệ") and they were rolled back. The round-2 code was not kept, so the case is rebuilt on the r5 v3 LOAD-A rows
// (test/fixtures/hm-r5/faces-load-a.jsonl.gz: f, each actor's expr, exprDesign, head box, inFrame; engine of this PR).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { faceDesigns, unapproved, approvalLine } from '../../styles/stick-man/tools/facesheet.mjs';

const rows = zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/hm-r5/faces-load-a.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const H = 960;

test('facesheet: the designs held on a readable head, each with the frame that shows it largest', () => {
  const d = faceDesigns(rows, H);
  assert.ok(d.length >= 2, JSON.stringify(d));
  for (const x of d) { assert.ok(x.design, `${x.expr} carries its design key`); assert.ok(x.held >= 15 && x.best.f >= 204 && x.best.f <= 500); }
});

test('facesheet: an approved sheet passes; a new face, a changed design, a sheet not by Kai or no sheet fails and names the fix', () => {
  const sheet = { by: 'kai', at: '2026-11-19T22:10:00Z', designs: faceDesigns(rows, H).map(({ who, expr, design }) => ({ who, expr, design })) };
  assert.equal(approvalLine(faceDesigns(rows, H), sheet, 'films/x'), null);
  const swap = rows.map(r => ({ ...r, actors: Object.fromEntries(Object.entries(r.actors).map(([n, a]) => [n, a.expr === sheet.designs[0].expr ? { ...a, expr: 'y_pant' } : a])) }));
  const redraw = rows.map(r => ({ ...r, actors: Object.fromEntries(Object.entries(r.actors).map(([n, a]) => [n, a.expr === sheet.designs[0].expr ? { ...a, exprDesign: 'r2new' } : a])) }));
  assert.deepEqual(unapproved(faceDesigns(swap, H), sheet).map(d => d.expr), ['y_pant'], 'round 2: a new face');
  assert.equal(unapproved(faceDesigns(redraw, H), sheet).length, 1, 'round 2: the same name drawn with new numbers');
  assert.match(approvalLine(faceDesigns(swap, H), sheet, 'films/x'), /not on the sheet Kai approved .*y_pant.*fix: node styles\/stick-man\/tools\/facesheet\.mjs films\/x/);
  assert.match(approvalLine(faceDesigns(rows, H), { ...sheet, by: 'self' }, 'films/x'), /not by kai/);
  assert.match(approvalLine(faceDesigns(rows, H), null, 'films/x'), /no face sheet approved by Kai/);
});
