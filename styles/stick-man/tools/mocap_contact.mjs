// A captured hand that runs into the set (a wall, a sill: the clip's marks), baked to rest on it, for a clip from motion
// capture. The rig's contact solve (cast.js S.obstacles, body.js worldBox) stops a hand on the nearest face frame by
// frame, statelessly: a hand that leaves a ledge for a spot far below it drops there in one frame. So run the clip through
// the real rig with its set, take where the solve put the hand while it touched, and bake that as the hand's target (an
// arm ik target, the figure frame, W units); over `ramp` frames before the touch the target slides from the captured hand
// onto that spot, and after it from the last spot back to the captured hand, so the hand lands, rests and lets go at a
// hand's speed:
//   node styles/stick-man/tools/mocap_contact.mjs <clip> <L|R> <ramp> <out.js> [set|body] [join]
// join: two touches at most that many frames apart are one (default two ramps, '-'): the hand stays on ik between them
// margin (cm): the resting hand set that much further out from where the solve stopped it (a gun kept clear of the head)
// body: the same for a hand that runs into its own body (this figure's trunk is deeper than the captured one: a hand
// lowering a bag past the bent chest, Act_PutDown): the captured hand is the one with physics off, the resting one the
// solve's with it on, so the clip holds what the physics would do and the grip stays on its target.
// The clip applies the table (base.js reachKeys, its own elbow: no pole). The arm does not move the set, so one pass is exact.
import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const [clip, side, ramp, out, mode = 'set', join0, margin = '0'] = process.argv.slice(2), join = join0 === '-' ? undefined : join0;
const { rigStick } = await import('./motionlib.mjs'), I = await import('../motion-lib/index.js'), M = await import('../engine/motion.js'), B = await import('../motion-lib/base.js');
const THREE = await import('three');
const W = 0.6, R = +ramp;
const { S, toPose, PHYS } = await rigStick('adult'), C = I.getClip(clip, 'adult'), boxes = B.markColliders(C.needs?.marks);
// body: the clip as it is keyed (with the table it already applies: each run adds the frames the solve still moves, the
// physics settling the hand that the last table moved); set: the captured arm, its ik taken off
const old = mode === 'body' && existsSync(out) ? (await import(path.resolve(out))).default.rows : [];
const keys = mode === 'body' ? C.keys : C.keys.map(k => { const o = { ...k, ['arm' + side]: { ...k['arm' + side] } }; delete o['arm' + side].ik; delete o['arm' + side].ikw; delete o['arm' + side].pole; return o; });
const fr = M.playActor(M.compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), 0, keys[keys.length - 1].f);
const toL = b => S.root.worldToLocal(new THREE.Vector3(b[0], b[2], -b[1])).multiplyScalar(1 / W);
const { elbowSide: side0 } = await import('../engine/body.js'), elbowSide = off => side0(off, side);
const at = keys.map(k => { const m = fr[k.f];
  PHYS.on = mode !== 'body'; S.obstacles = []; S.pose2(toPose(m, S.root.scale.x)); const w0 = S.rigWorld()[side], free = toL(w0.hand), pole = elbowSide(toL(w0.elbow).sub(toL(w0.shoulder).lerp(free, 0.5)));
  PHYS.on = true; S.obstacles = boxes; S.pose2(toPose(m, S.root.scale.x)); const w = S.rigWorld(), hit = (w[side].targetGapCm || 0) > 0.5 || (w[side].penCm0 || 0) > 0.5;
  // (body: the trunk is what the arm meets, and the solve can only step the hand out of it; the arm that clears it keeps
  // the captured hand and takes its elbow out to the side: the target is the captured hand, the pole outward)
  const sv = toL(w[side].hand), out = sv.clone().sub(free), sm = out.length() > 1e-6 ? sv.clone().addScaledVector(out.normalize(), +margin / 100 / W) : sv;
  return { f: k.f, free, pole: mode === 'body' && hit ? new THREE.Vector3(side === 'L' ? -1 : 1, -0.4, 0.2) : pole, solved: mode === 'body' ? free : sm, hit }; });
const ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w)), rows = [];
// each touch (a run of frames the solve moved the hand): its spots, eased onto from the captured hand and off again
// (never the clip's first or last key: they are its standard poses)
at[0].hit = at[at.length - 1].hit = false;
const runs = []; for (let i = 0; i < at.length; i++) if (at[i].hit) { const j0 = i; while (i + 1 < at.length && at[i + 1].hit) i++; runs.push([j0, i]); }
// two touches close together (less than two ramps apart) are one: the frames between them hold the captured hand on ik
// too, so a clip fitted to a higher set (Act_HandOver_Once fit { top }) can lift one table end to end
for (let i = runs.length - 1; i > 0; i--) if (runs[i][0] - runs[i - 1][1] <= (join != null ? +join : 2 * R + 2)) { runs[i - 1] = [runs[i - 1][0], runs[i][1]]; runs.splice(i, 1); }
for (const [a, b] of runs) for (let i = a; i <= b; i++) if (!at[i].hit) at[i].solved = at[i].free;
const T = new Map(), kept = new Map(old.map(r => [r[0], r]));
for (const [a, b] of runs) {
  for (let i = a; i <= b; i++) T.set(at[i].f, at[i].solved);
  // (out to R + 1 frames each side, where the target is the captured hand itself: the ik takes the arm over where the FK
  // keys have it, so the hand going onto ik never steps the elbow)
  for (let d = 1; d <= R + 1; d++) { const w = ease(1 - d / (R + 1));
    if (a - d > 0 && !T.has(at[a - d].f)) T.set(at[a - d].f, at[a - d].free.clone().lerp(at[a].solved, w));
    if (b + d < at.length - 1 && !T.has(at[b + d].f)) T.set(at[b + d].f, at[b + d].free.clone().lerp(at[b].solved, w)); }
}
// (each row also names the captured elbow's side: its offset from the middle of its own shoulder-hand line, so the solve
// keeps the arm's own elbow plane and taking the hand onto ik never flips the elbow. The elbow's direction from the
// shoulder, as this was first written, lies along an arm hanging below its shoulder: the solve's pole then fell onto the
// shoulder-target line and the elbow swung round it, Trans_JumpWindow_Once frame 55, 54 deg in a frame)
const byF = new Map(at.map(a => [a.f, a]));
for (const [f, t] of T) { const pl = byF.get(f).pole; kept.set(f, [f, +t.x.toFixed(4), +t.y.toFixed(4), +t.z.toFixed(4), 1, +pl.x.toFixed(3), +pl.y.toFixed(3), +pl.z.toFixed(3)]); }
rows.push(...[...kept.values()].sort((p, q) => p[0] - q[0]));
writeFileSync(out, `// ${clip}: the ${side} hand resting on the ${mode === 'body' ? 'body' : 'set'} where it touches (tools/mocap_contact.mjs ${clip} ${side} ${ramp}${mode === 'body' ? ' body' : join != null ? ' set' : ''}${join != null ? ' ' + join : ''}${+margin ? ` ${join ?? '-'} ${margin}` : ''}): [f, ik x, y, z (figure W), ikw, elbow pole x, y, z]\nexport default { hand: '${side}', pole: null, rows: ${JSON.stringify(rows)} };\n`);
console.log(clip, side, 'touches', JSON.stringify(runs.map(([a, b]) => [at[a].f, at[b].f])), rows.length, 'frames');
