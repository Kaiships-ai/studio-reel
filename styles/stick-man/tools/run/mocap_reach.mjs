// A captured hand brought onto a part of this rig's head (the mouth, an ear), baked per frame, for a clip from motion
// capture: the capture's hand comes near its own mouth, but this figure's head is bigger (the face 0.28 m ahead of its
// centre), so the hand stops short of it. Run the clip through the real rig (cast.js headless, the 'kaiships' dose), find
// where the part is each frame, and write an arm ik target there (the figure frame, W units). On it while the captured
// hand is within `near` metres of the part; over the `ramp` frames before that the target slides from the captured hand
// onto it (and back off over the ramp after), so the hand travels the extra way at a hand's speed (a hand to the mouth
// takes ~0.4 s), not in a snap:
//   node styles/stick-man/tools/run/mocap_reach.mjs <clip> <L|R> <mouth|ear|earclose|eye> <near|+x> <ramp> <out.js> [body: adult]
// (near `captured`: on it through the whole capture: a hand that never leaves the ear, only further from this rig's bigger
// head than from its own)
// The clip applies the table (base.js reachKeys). The head does not move with the arm, so one pass is exact.
import { writeFileSync } from 'node:fs';
const [clip, side, part, near, ramp, out, body = 'adult'] = process.argv.slice(2);
const { rigStick } = await import('#tools/gates/motionlib.mjs'), I = await import('#motion-lib/index.js'), M = await import('#engine/motion.js');
const THREE = await import('three');
const W = 0.6, sg = side === 'L' ? -1 : 1;
// the part on the head (head-local metres, +z = the face): the mouth 0.09 below the centre on the face, the hand's centre
// held 0.06 m out in front of it (the food or the phone between); an ear on the side, the hand 0.11 m off it (the phone between),
// or close: 0.055 m, the phone against the head (at 0.11 m it floats 7 cm off, seen from the front)
// or an eye: the hand's centre 0.05 m out from the face over the eye on its side (engine/faces.js: the eyes 0.24 apart at the
// head's middle), a crier's hand pressed to it
const AT = { mouth: [0, -0.10, 0.34], ear: [sg * 0.41, -0.02, 0.02], earclose: [sg * 0.355, -0.02, 0.02], eye: [sg * 0.12, 0, 0.33] }[part];
const { S, toPose } = await rigStick(body), C = I.getClip(clip, body);
const keys = C.keys.map(k => { const o = { ...k, ['arm' + side]: { ...k['arm' + side] } }; delete o['arm' + side].ik; delete o['arm' + side].ikw; return o; });
const fr = M.playActor(M.compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), 0, keys[keys.length - 1].f);
// the side the captured elbow sticks out to (mocap_contact.mjs elbowSide): each row names it, so the hand going onto its
// target keeps the capture's own elbow; a fixed pole (down and out) turned the elbow round from the FK arm's side as the
// hand rose, 4 deg a frame past what the reach itself turns (Gest_PhoneCall_Loop frame 9)
const { elbowSide: side0 } = await import('#engine/body.js'), elbowSide = off => side0(off, side);
const rows = [], at = [], ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
for (const k of keys) {
  S.pose2(toPose(fr[k.f], S.root.scale.x)); S.rigWorld(); S.root.updateMatrixWorld(true);
  const p = S.parts.head.localToWorld(new THREE.Vector3(...AT)), w = S.rigWorld(), m = [p.x, -p.z, p.y], d = Math.hypot(...w[side].hand.map((v, i) => v - m[i]));
  // the captured hand and the shoulder in the same frame (three world -> root-local W), for the way there
  const toL = b => S.root.worldToLocal(new THREE.Vector3(b[0], b[2], -b[1])).multiplyScalar(1 / W);
  const l = S.root.worldToLocal(p.clone()).multiplyScalar(1 / W), h = toL(w[side].hand), s = toL(w[side].shoulder);
  const arm = 0.98 * (toL(w[side].shoulder).distanceTo(toL(w[side].elbow)) + toL(w[side].elbow).distanceTo(toL(w[side].hand)));
  at.push({ f: k.f, l, h, s, d, arm, e: elbowSide(toL(w[side].elbow).sub(s.clone().lerp(h, 0.5))), on: near === 'captured' ? k.f >= C.captured[0] && k.f <= C.captured[1] : d < +near });
}
// (near '+x': on while the captured hand is within x metres of its own closest approach to the part, so one recipe finds the
// same moment on every body, whose reach and head differ)
if (/^\+/.test(near)) { const dmin = Math.min(...at.filter(a => a.f >= C.captured[0] && a.f <= C.captured[1]).map(a => a.d)); for (const a of at) a.on = a.f >= C.captured[0] && a.f <= C.captured[1] && a.d < dmin + +near.slice(1); }
const on = at.filter(a => a.on), c0 = on[0]?.f, c1 = on[on.length - 1]?.f;
// the way there: the target slides from the captured hand to the part (the hand fully on the target, ikw 1), kept at
// least REACH from the shoulder, so a hand passing close by the shoulder is never asked to fold past the elbow's range
// `near` in metres (the older tables: the mouth, the ear) bakes as it always has: a straight way there over the whole ramp, at full
// weight, so those tables come out of the same command unchanged; what follows (the way round the head, REACH faded in, the arm's
// own length, the weight) is for `captured` and `+x`
const plain = /^[\d.]+$/.test(near);
const BULGE = 0.2;     // W: the way there passes this far outside the straight line, round the head's side (through it, the thin body's phone went 2.6 cm in)
const REACH = 0.56;   // W: ~0.34 m, the arm folded about 125 deg
// (a hand that comes and goes, near not 'captured', slides on and off inside the capture's own frames, never over the library's
// blend from and to the standard pose, which must stay as it is)
const cap = near === 'captured' ? [-Infinity, Infinity] : C.captured, rIn = plain ? +ramp : Math.max(1, Math.min(+ramp, c0 - cap[0])), rOut = plain ? +ramp : Math.max(1, Math.min(+ramp, cap[1] - c1));
for (const a of at) { const wt = c0 == null ? 0 : a.f < c0 ? ease((a.f - (c0 - rIn)) / rIn) : a.f > c1 ? ease((c1 + rOut - a.f) / rOut) : 1;
  if (wt < 0.01) continue;
  const t = a.h.clone().lerp(a.l, wt); if (!plain) t.x += sg * BULGE * Math.sin(Math.PI * wt);   // (any slide on or off the head: a cry's hand leaving the eye went into the thin head, 9 cm off)
  // (REACH faded in with the slide: at full strength to the last row, the target stood off the captured hand it hands back to,
  // and the hand dropped 15 cm in the frame after, the cry's)
  const v = t.clone().sub(a.s), rmin = plain || near === 'captured' ? REACH : REACH * wt + Math.min(REACH, a.h.distanceTo(a.s)) * (1 - wt); if (v.length() < rmin) t.copy(a.s).addScaledVector(v.normalize(), rmin);
  // and no further than the arm reaches (its two bones, 98 %): a target past it left the thin body's hand 9 cm off the eye it
  // was gripping, as the slide crossed its head
  const u = t.clone().sub(a.s); if (!plain && u.length() > a.arm) t.copy(a.s).addScaledVector(u.normalize(), a.arm);
  // (its weight ramps too, six times as fast as the slide: so it lets the target go onto its own arm wherever the target is, and
  // while it holds it, weight 0.5 or more, the target is within a twelfth of the way from the hand: at weight 1 to the last row
  // the cry's hand dropped 15 cm in the frame after, at the slide's own weight the thin hand was 9 cm off a target it held)
  rows.push([a.f, +t.x.toFixed(4), +t.y.toFixed(4), +t.z.toFixed(4), plain || near === 'captured' ? 1 : +Math.min(1, 6 * wt).toFixed(3), +a.e.x.toFixed(3), +a.e.y.toFixed(3), +a.e.z.toFixed(3)]); }
writeFileSync(out, `// ${clip}: the ${side} hand onto the ${part} (tools/run/mocap_reach.mjs ${clip} ${side} ${part} ${near} ${ramp}${body === 'adult' ? '' : ` <out> ${body}`}): [f, ik x, y, z (figure W), ikw, elbow pole x, y, z]\nexport default { hand: '${side}', pole: null, rows: ${JSON.stringify(rows)} };\n`);
console.log(clip, side, part, rows.length, 'frames', rows.length ? `${rows[0][0]}-${rows[rows.length - 1][0]}` : '');
