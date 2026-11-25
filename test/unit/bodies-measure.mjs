// What a viewer sees of a body, as numbers: how far a standing idle moves (against the kit's still limit), whether it is another
// clip over again, and how much of the face a hood hides from the side. Headless: the solved rig and the real meshes, no render.
//   node test/unit/bodies-measure.mjs            the idles' table and the hood's cover, as JSON
// The limits below were committed, with their controls (stick-bodies-reads.test.mjs), before anything here was measured (26/11).
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { rigStick, rigClip, onBody, clipLife } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { shapeAgainst, SHAPE_REL, SHAPE_CM, STILL_F, STILL_IN, STILL_CM, PX_PER_M, READ_PX } from '../../styles/stick-man/tools/gates/bodylife.mjs';
import { serveRoot } from '../../styles/stick-man/tools/gates/cordjump.mjs';
import { ALL, getClip } from '../../styles/stick-man/motion-lib/index.js';
import { BODIES, bodySpec } from '../../styles/stick-man/motion-lib/bodies.js';
import { stand } from '../../styles/stick-man/motion-lib/base.js';
import { flatten } from '../../styles/stick-man/engine/motion.js';

// ------------------------------------------------------------------ limits
// STILL_CM (2.0, the kit's) lets a hold through that a viewer called still at 2.48 (bodylife.mjs); 2.8 is the mark it once had. A clip
// made to move is held to that one: 12 px of travel in half a second, in every 2 s
export const MOVES_CM = 2.8;
// a face more than half hidden is not seen. Two bodies' hoods hide the same when they differ by less than READ_PX on a 120 px face
export const COVER_MAX = 0.5, COVER_SAME = READ_PX / 120;

// ------------------------------------------------------------------ an idle
const PARTS = ['head', 'handL', 'handR', 'pelvis'], d3 = (a, b) => Math.hypot(...a.map((x, i) => x - b[i])), r3 = v => +v.toFixed(3);
// the clip played twice: the stillest 2 s (its largest half-second travel of any part, cm), and each part's peak-to-peak and top speed
export async function idle(C, body = C.body || 'adult') {
  const rows = (await rigClip(C, body)).paths, px = m => Math.round(m * PX_PER_M), v = [], per = {};
  for (let f = 0; f + STILL_IN < rows.length; f++) v.push(100 * Math.max(...PARTS.map(p => d3(rows[f + STILL_IN][p], rows[f][p]))));
  const W = STILL_F - STILL_IN, least = Math.min(...Array.from({ length: v.length - W + 1 }, (_, a) => Math.max(...v.slice(a, a + W))));
  for (const p of PARTS) {
    const pp = Math.hypot(...[0, 1, 2].map(i => { const x = rows.map(r => r[p][i]); return Math.max(...x) - Math.min(...x); })), top = Math.max(...rows.slice(1).map((r, i) => d3(r[p], rows[i][p]))) * 30;
    per[p] = { pp_m: r3(pp), pp_px: px(pp), v_ms: r3(top), v_px_s: px(top) };
  }
  const yaw = rows.map(r => ((r.yaw - rows[0].yaw + 540) % 360) - 180);
  return { clip: C.name, body, frames: C.frames, least_cm: +least.toFixed(2), still: least < STILL_CM, turn_deg: +(Math.max(...yaw) - Math.min(...yaw)).toFixed(1), away_deg: +Math.max(...yaw.map(Math.abs)).toFixed(1), down_deg: +Math.max(...rows.map(r => r.down)).toFixed(1), ...per };
}
// the loops a body stands in: what a new one may not be, on this figure, retimed (the clock shapeAgainst takes out), resized, or
// played over (as many laps as the new clip is long)
export const standing = body => ALL.filter(C => C.loop && !C.advance && C.group === 'Idle' && C.base === 'STAND' && !(C.needs?.props || []).length && !(C.body === body && C.clip === 'Idle_Fidget_Loop'));
const onFigure = async (C, body) => ((C.body || 'adult') === 'adult' ? onBody(C, body) : clipLife(C));
export const pathsOf = async C => (await clipLife(C)).paths;
export async function copyOf(paths, body) {
  const out = [], len = P => Object.values(P)[0].length;
  for (const A of standing(body)) {
    const on = (await onFigure(A, body)).paths, laps = Math.max(1, Math.round(len(paths) / len(on)));
    for (const n of new Set([1, laps])) {
      const r = shapeAgainst({ paths: Object.fromEntries(Object.entries(on).map(([k, P]) => [k, Array.from({ length: n }, () => P).flat()])) }, { paths });
      if (!(r.shape >= SHAPE_REL && r.cm >= SHAPE_CM)) out.push({ of: A.name, laps: n, shape: r3(r.shape), cm: +r.cm.toFixed(1) });
    }
  }
  return out;
}

// ------------------------------------------------------------------ a hood over the face
// the drawn face (engine/faces.js: brows to chin, eye to eye; W units on the 1 W canvas), turned round the head as cast.js S.face
// turns it (0.8 of the lens's azimuth) and laid on the face shell. Of what the bare head shows the lens, the share that a mesh of the
// hoodie stands in front of
const BOX = { x: 0.21, y: [-0.24, 0.20], n: 24 }, R = 0.462, TURN = 0.8;
export function coverFrom(head, meshes, az, { W, HA, HEAD_H, SHELL = 1.015, skip = () => false } = {}) {
  head.updateWorldMatrix(true, true);
  const a = az * Math.PI / 180, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), sx = new THREE.Vector3(0, 1, 0).cross(d).normalize();
  const to = d.clone().transformDirection(head.matrixWorld), ray = new THREE.Raycaster(); let seen = 0, hidden = 0;
  for (let i = 0; i < BOX.n; i++) for (let j = 0; j < BOX.n; j++) {
    const x0 = -BOX.x + 2 * BOX.x * (i + 0.5) / BOX.n, y = BOX.y[0] + (BOX.y[1] - BOX.y[0]) * (j + 0.5) / BOX.n;
    const th = Math.asin(x0 / R) - TURN * a; if (Math.cos(th) < 0.08) continue;
    const u = R * Math.sin(th), q = Math.hypot(u * W, y * W / HEAD_H) / (HA * SHELL); if (q >= 1) continue;
    const p = new THREE.Vector3().addScaledVector(sx, u * W).addScaledVector(d, HA * SHELL * Math.sqrt(1 - q * q)); p.y = y * W;
    seen++;
    const o = head.localToWorld(p.clone()); ray.set(o, to); ray.near = 1e-4; ray.far = 10;
    if (ray.intersectObjects(meshes, false).some(h => !skip(h, head))) hidden++;
  }
  return { seen, share: seen ? hidden / seen : 0 };
}
// the kit's grey hoodie, hood up, on a body standing
export async function hoodCover(body, azs = [0, 45, 90]) {
  serveRoot();
  const { toPose } = await rigStick(body), { makeStick, GUARD, W_M, HEAD_H } = await import('../../styles/stick-man/engine/cast.js'), { hoodie } = await import('../../styles/stick-man/kit/cast/hoodie.js');
  const S = makeStick(bodySpec({ ...GUARD, hair: [] }, body)); hoodie(S);
  const pose = toPose(flatten(stand(body, 0, { yaw: 0 })), BODIES[body].spec.scale ?? 1); for (let t = 0; t < 12; t++) { S.pose2(pose); S.face({ t }); }
  S.root.updateWorldMatrix(true, true);
  const meshes = []; S.root.traverse(o => { if (o.isMesh && !o.userData.over && (o.name === 'hood_cowl' || inHoodie(o))) meshes.push(o); });
  for (const m of meshes) { m.material.side = THREE.DoubleSide; m.geometry.computeBoundingSphere(); }
  // the cowl's face opening is cut by its shader (hoodie.js OPEN)
  const open = (h, head) => { if (h.object.name !== 'hood_cowl') return false; const l = head.worldToLocal(h.point.clone()); const c = new THREE.Vector3(l.x, l.y / HEAD_H, l.z).normalize();
    return (Math.atan2(c.x, c.z) / 1.22) ** 2 + ((Math.asin(c.y) + 0.45) / 1.12) ** 2 < 1; };
  const g = { W: W_M, HA: 0.5 * W_M, HEAD_H, skip: open }, head = S.parts.head.parent;
  return { body, meshes: meshes.length, ...Object.fromEntries(azs.map(a => [a, r3(Math.max(coverFrom(head, meshes, a, g).share, coverFrom(head, meshes, -a, g).share))])) };
}
// the costume's cloth, its ink shells left out (they are drawn from behind only)
const inHoodie = o => { for (let p = o.parent; p && !p.isMesh; p = p.parent) if (p.name === 'hoodie') return true; return false; };

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const rows = []; for (const C of standing('')) rows.push(await idle(C)); for (const C of ALL.filter(C => C.clip === 'Idle_Fidget_Loop')) rows.push(await idle(C));
  console.log(JSON.stringify({ idles: rows, hood: [await hoodCover('adult'), await hoodCover('teen')] }, null, 1));
}
