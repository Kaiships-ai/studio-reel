// No face design reaches a film before Kai approves its face sheet (styles/stick-man/tools/series/facesheet.mjs, facebeat.mjs
// (3)). Hot Money ep01 r5 s1, 19/11 22:49: a fix round swapped the hero's faces, Kai saw them first in the film ("xấu thậm
// tệ") and they were rolled back. The round-2 code was not kept, so the case is rebuilt on the r5 v3 LOAD-A rows
// (test/fixtures/hm-r5/faces-load-a.jsonl.gz: f, each actor's expr, exprDesign, head box, inFrame; engine of this PR).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { faceDesigns, unapproved, approvalLine, sheetHash, shotArgs } from '../../styles/stick-man/tools/series/facesheet.mjs';

const TOOLS = fileURLToPath(new URL('../../styles/stick-man/tools/', import.meta.url));
const node = (tool, ...args) => spawnSync(process.execPath, [path.join(TOOLS, tool), ...args], { encoding: 'utf8', timeout: 60000 });

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
  assert.match(approvalLine(faceDesigns(swap, H), sheet, 'films/x'), /not on the sheet Kai approved .*y_pant.*fix: node styles\/stick-man\/tools\/series\/facesheet\.mjs films\/x/);
  assert.match(approvalLine(faceDesigns(rows, H), { ...sheet, by: 'self' }, 'films/x'), /not by kai/);
  assert.match(approvalLine(faceDesigns(rows, H), null, 'films/x'), /no face sheet approved by Kai/);
});

// a film made of the LOAD-A rows and one shot whose story names the faces it shows (strain, nervous), so only the sheet decides
function film() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facesheet-film-'));
  fs.mkdirSync(path.join(dir, 'review'));
  fs.writeFileSync(path.join(dir, 'review/shot-rows.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'storyboard.json'), JSON.stringify({ shots: [{ id: 'S1', f0: 0, purpose: 'he strains to lift the heavy bag, nervous' }] }));
  return dir;
}
const sheetOf = designs => ({ rows: 'review/shot-rows.jsonl', hash: sheetHash(designs), designs });

test('facebeat: LOAD-A with no approved face sheet fails (exit 1) and names the fix; the same film passes once Kai approves its sheet', t => {
  const dir = film(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const none = node('gates/facebeat.mjs', dir, '--h', String(H));
  assert.equal(none.status, 1, none.stdout + none.stderr);
  assert.match(none.stdout, /FAIL: no face sheet approved by Kai .*y_strain/);
  const designs = faceDesigns(rows, H);
  fs.writeFileSync(path.join(dir, 'review/face-sheet.json'), JSON.stringify(sheetOf(designs)));
  const ok = node('series/facesheet.mjs', dir, '--approve', 'Kai 19/11 23:05: "ok mặt này được"', '--sheet', sheetHash(designs));
  assert.equal(ok.status, 0, ok.stderr);
  const pass = node('gates/facebeat.mjs', dir, '--h', String(H));
  assert.equal(pass.status, 0, pass.stdout + pass.stderr);
  assert.match(pass.stdout, /PASS/);
});

test('facesheet --approve: needs the hash of the sheet Kai saw; a sheet made again after he looked is refused', t => {
  const dir = film(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const seen = faceDesigns(rows, H), approved = path.join(dir, 'review/faces-approved.json');
  fs.writeFileSync(path.join(dir, 'review/face-sheet.json'), JSON.stringify(sheetOf(seen)));
  const bare = node('series/facesheet.mjs', dir, '--approve', 'ok');
  assert.equal(bare.status, 2); assert.match(bare.stderr, /needs --sheet/); assert.ok(!fs.existsSync(approved));
  const remade = seen.map((d, i) => i ? d : { ...d, design: 'r2new' });
  fs.writeFileSync(path.join(dir, 'review/face-sheet.json'), JSON.stringify(sheetOf(remade)));
  const stale = node('series/facesheet.mjs', dir, '--approve', 'ok', '--sheet', sheetHash(seen));
  assert.equal(stale.status, 2); assert.match(stale.stderr, new RegExp(`Kai saw sheet ${sheetHash(seen)}, .* is now sheet ${sheetHash(remade)}`));
  assert.ok(!fs.existsSync(approved), 'nothing approved');
  const ok = node('series/facesheet.mjs', dir, '--approve', 'ok', '--sheet', sheetHash(remade));
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(fs.readFileSync(approved, 'utf8')).sheet, sheetHash(remade));
});

// Hot Money r5 s2 faces, 21/11: the sheet's stills were refused by the bible check (a set the catalog lacks, which the film's
// own renders passed with a logged --no-bible-check) and could not ask for the face style the rows were rendered with
// (?facestyle=s2r), and before failing the tool had already rewritten review/face-sheet.json
test('facesheet: the stills render with the page flags and the logged bible bypass of the rows\' render', () => {
  const a = shotArgs('films/x', [12, 40], '/tmp/f_%d.jpg', 720, 1280, { query: 'gunglare=v6&facestyle=s2r', 'no-bible-check': 'set not in the catalog yet' });
  const at = k => a[a.indexOf(k) + 1];
  assert.equal(at('--query'), 'gunglare=v6&facestyle=s2r');
  assert.equal(at('--no-bible-check'), 'set not in the catalog yet');
  assert.equal(at('--frames'), '12,40');
  const plain = shotArgs('films/x', [12], '/tmp/f_%d.jpg', 720, 1280, {});
  assert.ok(!plain.includes('--query') && !plain.includes('--no-bible-check'), 'nothing added when not asked');
});

test('facesheet: a render that fails leaves review/face-sheet.json as it was', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facesheet-fail-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'review'));
  fs.writeFileSync(path.join(dir, 'review/shot-rows.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'reel.js'), 'export default {\n');
  const before = '{"hash":"kai-saw-this"}\n';
  fs.writeFileSync(path.join(dir, 'review/face-sheet.json'), before);
  const r = node('series/facesheet.mjs', path.relative(fileURLToPath(new URL('../../', import.meta.url)), dir), '--h', String(H));
  assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /shot\.mjs failed/);
  assert.equal(fs.readFileSync(path.join(dir, 'review/face-sheet.json'), 'utf8'), before);
});

