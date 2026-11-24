#!/usr/bin/env node
// The lead's face, not the back of the head (advisory, ◇5). Reads the dbg rows (shot.mjs --dbg, review/shot-rows.jsonl):
// a run of frames where the lead is on screen and big enough to read (head box at least MIN_H of the frame height) but
// turned away from the lens (faceVis under VIS) for HOLD frames or more is a finding. A dropout of GAP frames or fewer (a
// flicker of face, a frame off screen) does not end a run; a frame where another face is readable (an over-the-shoulder
// shot) does not count, the viewer has a face; a walk away stops counting once the head is under MIN_H. A figure that walks or turns keeps
// its face to the lens with kit/camera/flight.js faceCam. Source: H2 V2's note "faces, not the back of the hood" and the
// runs it measures on Ep1 v15 (LIMIT below).
//   node styles/stick-man/tools/gates/headgate.mjs films/<slug>          (review/shot-rows.jsonl -> review/headgate.md)
//   node styles/stick-man/tools/gates/headgate.mjs --rows <rows.jsonl> [--json 1]
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { ROOT } from '../../../../kit/env.mjs';

export const VIS = 0.25, MIN_H = 0.05, HOLD = 60, GAP = 8;
export const LIMIT = { id: 'H1', what: `the lead on screen and readable with its back to the lens (faceVis under ${VIS}) for ${HOLD / 30} s or more`,
  source: 'Ep1 v15 (these rows): 4 runs, 14 s (884-1002, 1025-1125, 1268-1346, 1514-1637), the first the shot H2 V2 re-cut to show his face; H2 V2 notes: "faces, not the back of the hood", "the previs flight looked down on the cap for 3.6 s"' };

const readable = (a, H) => Boolean(a.inFrame && a.head && (a.head[3] - a.head[1]) >= MIN_H * H);
// the frame's lead: null when no row names a lead or its faceVis is missing (not measured), else { seen, back }
export function frameState(r) {
  const A = Object.values(r.actors || {}), a = A.find(x => x.lead); if (!a || a.faceVis == null) return null;
  const H = r.px?.[1] || 1280, seen = readable(a, H), otherFace = A.some(x => x !== a && readable(x, H) && (x.faceVis ?? 0) >= 0.5);
  return { seen, back: seen && a.faceVis < VIS && !otherFace };
}

export function headgate(rows) {
  const runs = []; let cur = null, measured = 0, seen = 0, face = 0;
  const close = () => { if (cur && cur.to - cur.from + 1 >= HOLD) runs.push({ id: 'H1', ...cur, what: `the back of the lead's head for ${((cur.to - cur.from + 1) / 30).toFixed(1)} s` }); cur = null; };
  for (const r of rows) {
    const s = frameState(r);
    if (s) { measured++; if (s.seen) { seen++; if (!s.back) face++; } }
    if (s?.back) { if (cur && r.f - cur.to - 1 <= GAP) cur.to = r.f; else { close(); cur = { from: r.f, to: r.f }; } }
    else if (cur && r.f - cur.to > GAP) close();
  }
  close();
  return { ok: !runs.length, runs, measured, faceShare: seen ? +(face / seen).toFixed(3) : null };
}

export function report(R, fps = 30) {
  const t = f => (f / fps).toFixed(2);
  const L = ['# Head gate', '', R.measured ? `**${R.ok ? 'PASS' : 'FAIL'}**: ${R.runs.length} run(s); the lead faces the lens on ${Math.round(100 * (R.faceShare ?? 0))} % of the frames it is readable (${R.measured} frames with a lead)` : '**PARTIAL**: no row names a lead',
    '', '| Check | Frames | Time | What |', '| --- | --- | --- | --- |'];
  for (const r of R.runs) L.push(`| ${r.id} | ${r.from}-${r.to} | ${t(r.from)}-${t(r.to + 1)} s | ${r.what} |`);
  L.push('', `- ${LIMIT.id} ${LIMIT.what}. Source: ${LIMIT.source}`);
  return L.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), A = {}; let film = null;
  if (argv[0] && !argv[0].startsWith('--')) film = path.resolve(ROOT, argv.shift());
  for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  const file = A.rows || (film && path.join(film, 'review', 'shot-rows.jsonl'));
  if (!file || !fs.existsSync(file)) { console.error('usage: headgate.mjs films/<slug> | --rows <rows.jsonl> [--json 1]  (no rows found)'); process.exit(2); }
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const R = headgate(rows), md = report(R);
  if (film) fs.writeFileSync(path.join(film, 'review', 'headgate.md'), md);
  console.log(A.json ? JSON.stringify(R, null, 1) : md.trim());
  console.log(`headgate ${R.measured ? (R.ok ? 'PASS' : 'FAIL') : 'PARTIAL'} (${R.measured} frames)`);
  process.exit(R.measured && R.ok ? 0 : 1);
}
