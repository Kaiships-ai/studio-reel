// In-place hair swaps against fresh builds, headless: one figure walks every ordered pair of toon hair styles (an Euler
// circuit of the 110 pairs, cut into parts, each part a process) with S.bakeHair, and after each swap and a pose its
// fingerprint and its worn shell must equal a fresh build of that style in the same pose. Each part also keeps a second
// figure beside the first and hashes the engine's SHARED materials and uniforms before and after, then runs a colour loop
// on the first figure's own materials; `control: true` (one swap) runs the slider loop that wrote the shared outline instead.
//   node test/unit/hair-swap.mjs [--part k/n] [--control]
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { ROOT, MARK, hashFigure, recordingDocument, stickBuilder } from './look-fingerprint.mjs';

const PARTS = 4;
export const POSE = { neck: { nod: 12, turn: 25, tilt: 6 }, spine: { bend: 10, twist: 8 }, armL: { raise: 30 } };

// every ordered pair of distinct styles once, as one walk from styles[0] (Hierholzer on the complete digraph)
export function circuit(styles) {
  const out = new Map(styles.map(s => [s, styles.filter(t => t !== s)])), stack = [styles[0]], walk = [];
  while (stack.length) { const v = stack[stack.length - 1], next = out.get(v); if (next.length) stack.push(next.shift()); else walk.push(stack.pop()); }
  return walk.reverse();
}

const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);
export const shellHash = w => (w ? sha(JSON.stringify([Array.from(w.grid), w.half, w.ha, w.hb, [...w.balls].map(([k, ps]) => [k, ps.map(p => p.toArray())])])) : 'none');
export const sharedHash = SHARED => sha(JSON.stringify(Object.entries(SHARED).map(([k, v]) => [k, v.isMaterial
  ? [v.color.getHexString(), v.side, v.opacity, v.transparent, v.visible, v.version]
  : Object.entries(v.value !== undefined ? { value: v } : v).map(([u, x]) => [u, x.value?.toArray?.() ?? x.value])])));

export async function walkPart({ part = [0, 1], control = false } = {}) {
  globalThis.document = recordingDocument();
  const S_ = p => import(pathToFileURL(join(ROOT, 'styles/stick-man', p)).href);
  const { rigStick } = await S_('tools/gates/motionlib.mjs'), { S: base } = await rigStick('adult');
  const { SHARED } = await S_('engine/cast.js'), { toonHair, HAIR_STYLES } = await S_('kit/cast/hair.js'), stick = await stickBuilder();
  const build = st => { const S = stick({ ...base.spec, hair: [toonHair(st)] }); S.pose2(POSE); return S; };
  const look = S => ({ hash: hashFigure(S).hash, shell: shellHash(S.wornShell) });
  const walk = circuit(HAIR_STYLES), edges = walk.slice(1).map((to, i) => [walk[i], to]);
  const mine = control ? edges.slice(0, 1) : edges.filter((_, i) => Math.floor(i * part[1] / edges.length) === part[0]);
  const fresh = new Map(), want = st => { if (!fresh.has(st)) fresh.set(st, look(build(st))); return fresh.get(st); };
  const bystander = build('afro'), by0 = look(bystander).hash, shared0 = sharedHash(SHARED);
  const S = build(mine[0][0]), pairs = [];
  for (const [from, to] of mine) {
    const t0 = performance.now(); S.bakeHair([toonHair(to)]); S.pose2(POSE); const ms = performance.now() - t0;
    const got = look(S), w = want(to);
    pairs.push({ from, to, ms: Math.round(ms), ok: got.hash === w.hash && got.shell === w.shell, hash: got.hash, want: w.hash, shell: got.shell === w.shell });
  }
  const sharedAfterSwaps = sharedHash(SHARED);
  // a colour slider dragged over the figure: every material the figure owns, never one in SHARED
  const shared = new Set(Object.values(SHARED));
  const hull = bystander.parts.head.children.find(o => o.material === SHARED.hullMat), hullBefore = hull?.material.color.getHexString();
  for (let k = 0; k < 20; k++) S.root.traverse(o => { for (const m of [o.material].flat()) if (m?.color && (control || !shared.has(m))) m.color.setRGB(0.4 + k / 50, 0.08, 0.05); });
  if (control) S.parts.hair.traverse(o => { if (o.material === SHARED.hullMat) o.material.color.set('#aa503f'); });
  return { part, control, pairs, shared: [shared0, sharedAfterSwaps, sharedHash(SHARED)], bystander: [by0, look(bystander).hash], hull: [hullBefore, hull?.material.color.getHexString()] };
}

export async function swapAll({ control = false, parts = PARTS } = {}) {
  const runs = await Promise.all(Array.from({ length: parts }, (_, k) => new Promise((ok, fail) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--part', `${k}/${parts}`, ...(control ? ['--control'] : [])], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (err += d));
    p.on('close', code => (code === 0 ? ok(JSON.parse(out.slice(out.lastIndexOf(MARK) + MARK.length))) : fail(new Error(`hair-swap --part ${k}/${parts} exit ${code}\n${err.slice(-2000)}`))));
  })));
  return { pairs: runs.flatMap(r => r.pairs), runs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--part'), [k, n] = i > 0 ? process.argv[i + 1].split('/').map(Number) : [0, 1];
  const r = await walkPart({ part: [k, n], control: process.argv.includes('--control') });
  process.stdout.write(MARK + JSON.stringify(r));
}
