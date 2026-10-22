// ch/kit.js · reel63 shared helpers for chapter files (read-only for chapter builders; changes go through the orchestrator).
// Voice timing, easing, and one call that poses a Clawd for time t. Every motion number comes from ../motion.js.
import * as THREE from 'three';
import { V, seg, ss, sio, lerp, clamp, hsh } from '../stage.js';
import { SQ, SNAP, PUSH, DOF, step, ring, TR, hop, arc, blinks, F, HOLD_MIN, FPS } from '../motion.js';
import { loadClawdDefault } from '../cast.js';
import { CL_S } from '../set.js';
export { THREE, V, seg, ss, sio, lerp, clamp, hsh, SQ, SNAP, PUSH, DOF, step, ring, TR, hop, arc, blinks, F, HOLD_MIN, FPS, CL_S };

// ---------------------------------------------------------------- voice (src/vo.js globals)
export const LN = Object.fromEntries(VO_LINES.map(l => [l.id, l]));
const norm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
// W(line, word, n) = start time of the n-th occurrence of word in line (measured by whisper). Key every hit to a word.
export const W = (lid, w, n = 1) => { let c = 0; for (const x of VO_WORDS) if (x.line === lid && norm(x.w) === norm(w) && ++c === n) { if (x.est) console.warn('LOG est word keyed', lid, w); return x.s; } console.warn('LOG no word', lid, w); return LN[lid].s; };
export const WE = (lid, w, n = 1) => { let c = 0; for (const x of VO_WORDS) if (x.line === lid && norm(x.w) === norm(w) && ++c === n) return x.e; return LN[lid].e; };   // word end
export const s_ = (id) => LN[id].s, e_ = (id) => LN[id].e;
export const ez = (t, t0, d) => ss(seg(t, t0, t0 + d));                                      // 0 → 1 ease over d s
export const win = (t, a, b, din = 0.15, dout = 0.2) => ez(t, a - din, din) * (1 - ez(t, b, dout));   // 0 → 1 → 0 window
export const pulse = (t, t0, a, d = 0.22) => a * (t < t0 ? 0 : t < t0 + d * 0.3 ? ss((t - t0) / (d * 0.3)) : 1 - ss(clamp((t - t0 - d * 0.3) / (d * 0.7))));
export const pop = (t, t0, k = 3.4, d = 7) => t < t0 ? 0 : step(t, t0, k, d);              // 0 → 1 spring-in with overshoot (scale-ups)

// ---------------------------------------------------------------- Clawd
// clawd(role, color?) → a Clawd in the casting role ('' = Kai's default red jacket + >>> headband). Scale CL_S. Add it to your group.
export function clawd(scene, role = '') {
  const c = loadClawdDefault(scene, CL_S, role || window.__CREW_ROLE || '');   // v2 dry run: ?crew=plain dresses the pit crew (not the driver)
  // v1 tinted body/limb '#e8893a' to read orange under warm light. On the 'flat' style the body already has a #DF7440 texture, so
  // the tint MULTIPLIED it (linear 0.74·0.81, 0.18·0.25, …) into a deep red #CA3B0A (Kai 2026-10-18: "Claude hơi đỏ"). ?tint=fix keeps the texture's own colour.
  const fix = new URLSearchParams(location.search).get('tint') !== 'v1';   // Kai picked the fix (row 3, 2026-10-18)
  for (const k of ['body', 'limb']) if (c.materials[k]) c.materials[k].color.set(fix && c.materials[k].map ? '#ffffff' : '#e8893a');   // warm-light albedo so the toy reads Claude orange
  return c;
}
// eye shapes: [sx, sy, lift, tilt]
export const EYE = { neutral: [1, 1, 0, 0], happy: [1.05, 0.78, 0.45, 0], wide: [1.12, 1.25, 0.1, 0], squint: [1.05, 0.5, 0.2, 0], worried: [1, 0.92, 0, 0.22] };
// pose(c, t, o): o = { pos: Vector3 (feet), yaw, hops: [[t0, t1, h]...], sq: extra squash (+ = taller), bow, roll,
//   armL, armR: 0..1 raise, point: 0..1 (left arm forward), expr: key of EYE, look: [-1..1, -1..1], blinkTimes: [...], action: 'idle'|'walk'|'hop'|'scurry' }
// Returns { face: Vector3 (world, between the eyes), top: Vector3 (world, top of head), sq, y }.
export function pose(c, t, o = {}) {
  let y = 0, hsq = 0;
  for (const [a, b, h] of (o.hops || [])) if (t > a - 0.2 && t < b + 0.5) { const r = hop(t, a, b, h); y += r.y; hsq += r.sy; }
  hsq = Math.max(hsq, SQ.land - 1);
  const sq = 1 + 0.008 * Math.sin(t * 2 * Math.PI / 3.2 + (o.seed || 0)) + hsq + (o.sq || 0);
  c.group.position.copy(o.pos || V(0, 0, 0)); c.group.rotation.set(0, o.yaw || 0, 0);
  c.update(t, { action: o.action || 'idle', blink: false, look: o.look || [0, 0] });
  const P = c.parts;
  P.torso.rotation.set(o.bow || 0, 0, o.roll || 0);
  P.bounce.position.y = y / CL_S + (o.lift || 0) / CL_S;
  P.bounce.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  if (!o.action || o.action === 'idle') {
    P.arms.forEach(a => { a.rotation.set(0, 0, 0); a.position.y = 3.0; });
    const [L, R] = P.arms, upL = Math.max(o.armL || 0, o.point || 0), upR = o.armR || 0;
    L.position.y = 3.0 + 2.6 * upL; L.rotation.z = -0.9 * upL; L.rotation.y = -0.6 * (o.point || 0);
    R.position.y = 3.0 + 2.6 * upR; R.rotation.z = 0.9 * upR;
  }
  const bl = blinks(t, o.blinkTimes || []), ex = EYE[o.expr || 'neutral'];
  P.eyes.forEach((e, i) => { const sxn = i ? 1 : -1;
    e.scale.set(ex[0], Math.max(0.07, ex[1] * (1 - 0.93 * bl)), 1); e.position.y = 4.0 + ex[2] + 0.9 * bl * ex[1];
    e.position.x = sxn * 3.5 + (o.look ? o.look[0] : 0) * 0.5; e.rotation.z = -sxn * ex[3]; });
  c.group.updateMatrixWorld(true);
  return { face: P.torso.localToWorld(V(0, 5, 4.6)), top: P.torso.localToWorld(V(0, 8.3, 0)), sq, y, blink: bl };
}
// yawTo(from, to): the yaw that turns a Clawd standing at `from` to face the point `to` (Clawd's front = +z). Use the camera
// position so faces read: yaw = yawTo(pos, cam.pos) (or partly: lerp(story yaw, yawTo(...), 0.6)).
export const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
// blink times every ~2.6–3.4 s inside [a, b]
export const BL = (a, b, every = 3, seed = 1) => { const o = []; for (let t = a + 0.5, i = 0; t < b; i++) { o.push(Math.round(t * 30) / 30); t += every * (0.7 + 0.6 * hsh(i, seed)); } return o; };

// ---------------------------------------------------------------- 3D text / plates (only the script's words and numbers)
export function plate(txt, { w = 0.9, h = 0.28, fg = '#2b2622', bg = '#fffdf8', px = 150, mono = false } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${px}px ${mono ? 'Menlo, "SF Mono", monospace' : 'Inter, "Helvetica Neue", Arial, sans-serif'}`;
  g.fillText(txt, c.width / 2, c.height / 2 + px * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: bg, roughness: 0.7 })).concat([
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: bg, roughness: 0.7 })]));
  m.castShadow = true; return m;
}

// ---------------------------------------------------------------- v2 ADHD camera (LISTICLE.md v1: a camera beat every 1–1.5 s)
// camPath(t, K): K = [{ t, d, pos, tgt, fov, roll, dolly, orbit }, ...] sorted by t. Key i is a MOVE that starts at K[i].t (key it to a
// word with W()) and lands on K[i]'s framing after K[i].d s (whip / crash zoom 0.15–0.3 s, push-through 0.3–0.5 s, drift 1+ s) with an
// ease-in-out (zero speed at both ends: never a 1-frame snap). While holding a key the camera keeps alive: `dolly` m/s along the view
// (+ = in) and `orbit` rad/s around tgt. K[0] is the opening framing (its d is ignored). Returns { pos, tgt, fov, roll }.
const _cv = new THREE.Vector3();
function held(k, dt) {
  const pos = k.pos.clone(), tgt = k.tgt.clone();
  if (k.orbit) { const a = k.orbit * dt, o = pos.clone().sub(tgt), c = Math.cos(a), s = Math.sin(a); pos.set(tgt.x + o.x * c + o.z * s, pos.y, tgt.z - o.x * s + o.z * c); }
  if (k.dolly) { _cv.copy(tgt).sub(pos).normalize(); pos.addScaledVector(_cv, k.dolly * dt); }
  return { pos, tgt, fov: k.fov ?? 34, roll: k.roll || 0 };
}
export function camPath(t, K) {
  let i = 0; while (i + 1 < K.length && t >= K[i + 1].t) i++;
  if (i === 0) return held(K[0], t - K[0].t);
  const k = K[i], u = sio(clamp((t - k.t) / Math.max(k.d ?? 0.3, 1e-3)));
  const a = held(K[i - 1], k.t - K[i - 1].t - (i > 1 ? (K[i - 1].d ?? 0.3) : 0)), b = held(k, Math.max(0, t - k.t - (k.d ?? 0.3)));
  return { pos: a.pos.lerp(b.pos, u), tgt: a.tgt.lerp(b.tgt, u), fov: lerp(a.fov, b.fov, u), roll: lerp(a.roll, b.roll, u) };
}
// shake(t, times, amp): damped camera jolt on impacts (add to tgt; amp in metres, ~0.02–0.06). Pure function of t.
export function shake(t, times, amp = 0.04) {
  const o = V(0, 0, 0);
  for (const t0 of times) if (t > t0 && t < t0 + 0.6) { const r = ring(t, t0, { f: 7, d: 9, a: amp }); o.x += r * (hsh(t0, 1) - 0.5) * 2; o.y += r * (hsh(t0, 2) - 0.3); }
  return o;
}
