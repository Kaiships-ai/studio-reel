// A captured hand brought onto a part of this rig's head (the mouth, an ear), baked per frame, for a clip from motion
// capture: the capture's hand comes near its own mouth, but this figure's head is bigger (the face 0.28 m ahead of its
// centre), so the hand stops short of it. Run the clip through the real rig (cast.js headless, the 'kaiships' dose), find
// where the part is each frame, and write an arm ik target there (the figure frame, W units). On it while the captured
// hand is within `near` metres of the part; the weight eases in over the `ramp` frames before that and out over the ramp
// after, so the hand travels the extra way at a hand's speed (a hand to the mouth takes ~0.4 s), not in a snap:
//   node styles/stick-man/tools/mocap_reach.mjs <clip> <L|R> <mouth|ear> <near> <ramp> <out.js>
// The clip applies the table (base.js reachKeys). The head does not move with the arm, so one pass is exact.
import { writeFileSync } from 'node:fs';
const [clip, side, part, near, ramp, out] = process.argv.slice(2);
const { rigStick } = await import('./motionlib.mjs'), I = await import('../motion-lib/index.js'), M = await import('../engine/motion.js');
const THREE = await import('three');
const W = 0.6, sg = side === 'L' ? -1 : 1;
// the part on the head (head-local metres, +z = the face): the mouth 0.09 below the centre on the face, the hand's centre
// held 0.06 m out in front of it (the food or the phone between); an ear on the side
const AT = { mouth: [0, -0.10, 0.34], ear: [sg * 0.36, -0.02, 0.02] }[part];
const { S, toPose } = await rigStick('adult'), C = I.getClip(clip, 'adult');
const keys = C.keys.map(k => { const o = { ...k, ['arm' + side]: { ...k['arm' + side] } }; delete o['arm' + side].ik; delete o['arm' + side].ikw; return o; });
const fr = M.playActor(M.compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), 0, keys[keys.length - 1].f);
const rows = [], at = [], ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
for (const k of keys) {
  S.pose2(toPose(fr[k.f], S.root.scale.x)); S.rigWorld(); S.root.updateMatrixWorld(true);
  const p = S.parts.head.localToWorld(new THREE.Vector3(...AT)), w = S.rigWorld(), m = [p.x, -p.z, p.y], d = Math.hypot(...w[side].hand.map((v, i) => v - m[i]));
  const l = S.root.worldToLocal(p.clone()).multiplyScalar(1 / W); at.push({ f: k.f, l, on: d < +near });
}
const on = at.filter(a => a.on), c0 = on[0]?.f, c1 = on[on.length - 1]?.f;
for (const a of at) { const wt = c0 == null ? 0 : a.f < c0 ? ease((a.f - (c0 - +ramp)) / +ramp) : a.f > c1 ? ease((c1 + +ramp - a.f) / +ramp) : 1;
  if (wt >= 0.01) rows.push([a.f, +a.l.x.toFixed(4), +a.l.y.toFixed(4), +a.l.z.toFixed(4), +wt.toFixed(3)]); }
writeFileSync(out, `// ${clip}: the ${side} hand onto the ${part} (tools/mocap_reach.mjs ${clip} ${side} ${part} ${near} ${ramp}): [f, ik x, y, z (figure W), ikw]\nexport default { hand: '${side}', rows: ${JSON.stringify(rows)} };\n`);
console.log(clip, side, part, rows.length, 'frames', rows.length ? `${rows[0][0]}-${rows[rows.length - 1][0]}` : '');
