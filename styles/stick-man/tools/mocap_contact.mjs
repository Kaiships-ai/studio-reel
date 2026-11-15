// A captured hand that runs into the set (a wall, a sill: the clip's marks), baked to rest on it, for a clip from motion
// capture. The rig's contact solve (cast.js S.obstacles, body.js worldBox) stops a hand on the nearest face frame by
// frame, statelessly: a hand that leaves a ledge for a spot far below it drops there in one frame. So run the clip through
// the real rig with its set, take where the solve put the hand while it touched, and bake that as the hand's target (an
// arm ik target, the figure frame, W units); over `ramp` frames before the touch the target slides from the captured hand
// onto that spot, and after it from the last spot back to the captured hand, so the hand lands, rests and lets go at a
// hand's speed:
//   node styles/stick-man/tools/mocap_contact.mjs <clip> <L|R> <ramp> <out.js>
// The clip applies the table (base.js reachKeys, its own elbow: no pole). The arm does not move the set, so one pass is exact.
import { writeFileSync } from 'node:fs';
const [clip, side, ramp, out] = process.argv.slice(2);
const { rigStick } = await import('./motionlib.mjs'), I = await import('../motion-lib/index.js'), M = await import('../engine/motion.js'), B = await import('../motion-lib/base.js');
const THREE = await import('three');
const W = 0.6, R = +ramp;
const { S, toPose } = await rigStick('adult'), C = I.getClip(clip, 'adult'), boxes = B.markColliders(C.needs?.marks);
const keys = C.keys.map(k => { const o = { ...k, ['arm' + side]: { ...k['arm' + side] } }; delete o['arm' + side].ik; delete o['arm' + side].ikw; delete o['arm' + side].pole; return o; });
const fr = M.playActor(M.compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), 0, keys[keys.length - 1].f);
const toL = b => S.root.worldToLocal(new THREE.Vector3(b[0], b[2], -b[1])).multiplyScalar(1 / W);
const at = keys.map(k => { const m = fr[k.f];
  S.obstacles = []; S.pose2(toPose(m, S.root.scale.x)); const w0 = S.rigWorld()[side], free = toL(w0.hand), pole = toL(w0.elbow).sub(toL(w0.shoulder));
  S.obstacles = boxes; S.pose2(toPose(m, S.root.scale.x)); const w = S.rigWorld(), hit = (w[side].targetGapCm || 0) > 0.5 || (w[side].penCm0 || 0) > 0.5;
  return { f: k.f, free, pole, solved: toL(w[side].hand), hit }; });
const ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w)), rows = [];
// each touch (a run of frames the solve moved the hand): its spots, eased onto from the captured hand and off again
const runs = []; for (let i = 0; i < at.length; i++) if (at[i].hit) { const j0 = i; while (i + 1 < at.length && at[i + 1].hit) i++; runs.push([j0, i]); }
const T = new Map();
for (const [a, b] of runs) {
  for (let i = a; i <= b; i++) T.set(at[i].f, at[i].solved);
  for (let d = 1; d <= R; d++) { const w = ease(1 - d / (R + 1));
    if (a - d >= 0 && !T.has(at[a - d].f)) T.set(at[a - d].f, at[a - d].free.clone().lerp(at[a].solved, w));
    if (b + d < at.length && !T.has(at[b + d].f)) T.set(at[b + d].f, at[b + d].free.clone().lerp(at[b].solved, w)); }
}
// (each row also names the captured elbow's side, from the shoulder: the solve keeps the arm's own elbow plane, so taking
// the hand onto ik never flips the elbow)
const byF = new Map(at.map(a => [a.f, a]));
for (const [f, t] of [...T].sort((p, q) => p[0] - q[0])) { const pl = byF.get(f).pole; rows.push([f, +t.x.toFixed(4), +t.y.toFixed(4), +t.z.toFixed(4), 1, +pl.x.toFixed(3), +pl.y.toFixed(3), +pl.z.toFixed(3)]); }
writeFileSync(out, `// ${clip}: the ${side} hand resting on the set where it touches (tools/mocap_contact.mjs ${clip} ${side} ${ramp}): [f, ik x, y, z (figure W), ikw, elbow pole x, y, z]\nexport default { hand: '${side}', pole: null, rows: ${JSON.stringify(rows)} };\n`);
console.log(clip, side, 'touches', JSON.stringify(runs.map(([a, b]) => [at[a].f, at[b].f])), rows.length, 'frames');
