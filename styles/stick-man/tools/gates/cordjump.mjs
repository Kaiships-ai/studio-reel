// The hoodie's body-jump rule (kit/cast/cloth.js bodyJump) over every motion-lib clip: each clip is played headless through
// the real rig wearing the real hoodie (kit/cast/hoodie.js, physics on), body by body (a body's own clips on that body, a
// shared clip on all five), and every frame whose throat travel or chest turn the rule would call a jump is listed. A clip
// is continuous motion, so a listed frame is a misfire: the cords would be re-seated in the middle of a move.
//   node styles/stick-man/tools/gates/cordjump.mjs [--only <clip>] [--json]
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL, placeClip } from '#motion-lib/index.js';
import { BODIES } from '#motion-lib/bodies.js';
import { compileTrack, playActor } from '#engine/motion.js';
import { bodyJump } from '#kit/cast/cloth.js';
import { rigStick } from './motionlib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// hoodie.js loads its mesh from the page's root ('/styles/...'): headless, that path is read from the repository
export function serveRoot() {
  if (globalThis.__cordjumpRoot) return; globalThis.__cordjumpRoot = true;
  const R0 = globalThis.Request, F0 = globalThis.fetch, local = 'http://local';
  globalThis.Request = class extends R0 { constructor(u, o) { super(typeof u === 'string' && u.startsWith('/') ? local + u : u, o); } };
  globalThis.fetch = async (u, o) => { const s = String(u?.url ?? u); return s.startsWith(local + '/') ? new Response(fs.readFileSync(path.join(ROOT, s.slice(local.length)))) : F0(u, o); };
  globalThis.ProgressEvent ||= class { constructor(type, o) { Object.assign(this, o, { type }); } };
}

// one clip on one body: per frame the rule's inputs (the throat's travel, last frame's, the chest's turn) and the verdict
export async function scanClip(C, body = C.body || 'adult') {
  serveRoot();
  const { S, toPose } = await rigStick(body, C.needs?.cap), { hoodie } = await import('#kit/cast/hoodie.js');
  hoodie(S);
  const key = C.advance ? { f: 0, clip: C.clip, body, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 0, clip: C.clip, body, ...(C.loop ? { times: 2 } : {}) };
  const keys = placeClip(key, { pos: [0, 0], yaw: 90 }).keys, track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, keys[keys.length - 1].f + 6);
  const o = { clip: C.name, body, frames: fr.length, maxD: 0, maxDd: 0, maxDdAt: null, maxTurn: 0, jumps: [] };
  fr.forEach((m, f) => {
    S.pose2(toPose(m, S.root.scale.x)); S.face({ t: f });
    const J = S.hoodie.jumpIn; if (!J) return;
    const dd = J.dPrev ? J.d.distanceTo(J.dPrev) : 0, turn = J.turn * 180 / Math.PI;
    o.maxD = Math.max(o.maxD, J.d.length()); o.maxTurn = Math.max(o.maxTurn, turn);
    if (dd > o.maxDd) { o.maxDd = dd; o.maxDdAt = f; }
    if (bodyJump(J.d, J.dPrev, J.turn)) o.jumps.push(f);
  });
  return o;
}
// every clip in the library: a body's clips on that body, a shared clip on every body
export async function scanAll({ only } = {}) {
  const rows = [];
  for (const C of ALL) { if (only && C.name !== only && C.clip !== only) continue;
    for (const body of C.body ? [C.body] : Object.keys(BODIES)) rows.push(await scanClip(C, body)); }
  return rows;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), only = a.includes('--only') ? a[a.indexOf('--only') + 1] : null;
  const rows = await scanAll({ only });
  if (a.includes('--json')) console.log(JSON.stringify(rows));
  else {
    console.log('| clip | body | frames | max travel m/f | max change m/f (at) | max turn deg/f | jumps |'); console.log('|---|---|---|---|---|---|---|');
    for (const r of rows) console.log(`| ${r.clip} | ${r.body} | ${r.frames} | ${r.maxD.toFixed(3)} | ${r.maxDd.toFixed(3)} (${r.maxDdAt}) | ${r.maxTurn.toFixed(1)} | ${r.jumps.join(' ') || '-'} |`);
    const bad = rows.filter(r => r.jumps.length);
    console.log(`\n${rows.length} clip-body runs, ${bad.length} with a jump`);
    process.exitCode = bad.length ? 1 : 0;
  }
}
