// tier: heavy
// The wardrobe (kit/cast/wardrobe.js) and kit faces v4 (#204: faceAge, tidyFeet, head_yaw, headMarks) on the same figure: both
// hook engine/cast.js makeStick, so a merge that keeps one side's lines drops the other's. Headless, on the real rig.
// PLAIN_0704DE3E: what main 0704de3e draws for figures with no costume, hashed by this harness run on a copy of it:
//   d=$(mktemp -d); git archive 0704de3e | tar -x -C $d; ln -s $PWD/node_modules $d/node_modules
//   STICK_ROOT=$d node test/unit/stick-wardrobe-age.test.mjs --print
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';

const HERE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'), ROOT = process.env.STICK_ROOT || HERE, PRINT = process.argv.includes('--print');
const imp = p => import(pathToFileURL(path.join(ROOT, 'styles/stick-man', p)).href);
const PLAIN_0704DE3E = {
  plain: '49da22f913e8ee03', ages: 'b8f4fd52533b5494', tidy: '1f59ed2008be6ae8', bold: '9e267108b62d82ba',
};
const num = v => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v, sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// a canvas that logs what is drawn on it (as in stick-head-marks.test.mjs), so a face drawn twice compares call for call
let made = [];
function canvas() {
  const c = { width: 300, height: 150, style: {}, log: [], addEventListener() {} };
  const g = new Proxy({ canvas: c }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'getTransform') return () => ({});
      if (k === 'measureText') return () => ({ width: 10 });
      return (...a) => { c.log.push(`${String(k)}(${a.map(v => v?.log ? `canvas:${sha(v.log.join('\n'))}` : JSON.stringify(v, (_, q) => num(q))).join(',')})`); if (/^create/.test(String(k))) return { addColorStop() {}, data: new Uint8ClampedArray(4) }; };
    },
    set(t, k, v) { c.log.push(`${String(k)}=${JSON.stringify(v, (_, q) => num(q))}`); return true; } });
  c.getContext = () => g; made.push(c); return c;
}
globalThis.document = { createElement: canvas, createElementNS: canvas };

const { useFaceStyle } = await imp('engine/facestyles/index.js'); await useFaceStyle(undefined);
const { makeStick } = await imp('engine/cast.js'), { bodySpec } = await imp('motion-lib/bodies.js'), { useHeadMarks, BOLD_MARKS } = await imp('engine/headmarks.js');
const { HOOKS } = await imp('engine/play.js');
if (fs.existsSync(path.join(ROOT, 'styles/stick-man/kit/cast/wardrobe.js'))) await imp('kit/cast/wardrobe.js');   // (main has none: the plain figure is the same with it loaded)
const CAM = [0, -3, 1.4], P0 = { pos: [0, 0, 0], yaw: 0, expr: 'neutral' };
// a figure of one spec; opts are its own switches (faceAge, tidyFeet), wear its costume; o.face = what its face canvas draws
const build = (body, opts = {}, wear = null) => {
  made = []; const spec = { ...bodySpec({ name: 'T', shirt: [0.6, 0.6, 0.6], hair: [] }, body), ...opts }, S = makeStick(spec), fc = made.filter(c => c.width === 512);
  if (wear) HOOKS.costume(S, wear, { group: new THREE.Group() });
  const face = (expr, cam = CAM) => { for (const c of fc) c.log.length = 0; S.face({ expr, t: 8, age: 40, cam, blink: 0 }); return sha(fc.map(c => c.log.join('\n')).join('\n--\n')); };
  return { S, spec, face };
};
const marksIn = S => { const l = []; S.parts.marks.traverse(m => { if (m.isMesh && m.visible) l.push(m); }); return l; };
const BEATS = [{}, { head_yaw: 25, head_pitch: 10, head_tilt: -6, lean: 4, pitch: 6 }, { handL: [-0.6, 2.0, 0.3], footR: [0.3, 0.06, 0.1], footPitchR: -20 }];
const KEYS = [{ spine: { bend: 24 }, neck: { nod: 8, turn: -20 }, armL: { raise: 30, swing: 20, elbow: 40 }, legR: { foot: [0.2, 0.05, 0.1], pitch: -15 } }, { spine: { bend: 60, twist: -5 }, sq: 0.04 }];
// every mesh's place, shape and look through poses by keys, then by beats; then the face canvas in six faces
function draws(body, opts, marks = []) {
  const { S, face } = build(body, opts), rows = [];
  const look = () => { S.root.updateMatrixWorld(true); S.root.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position?.array || [], n = Math.max(1, Math.floor(p.length / 90));
    rows.push([m.visible, m.matrixWorld.toArray(), m.material.color?.getHex?.() ?? '', m.material.opacity ?? '', Array.from(p).filter((_, i) => i % n === 0)].flat(2).map(num).join(',')); }); };
  for (const p of BEATS) { S.pose({ ...P0, ...p }); look(); }
  for (const k of KEYS) { S.pose2({ ...P0, ...k }); look(); }
  for (const p of BEATS) { S.pose({ ...P0, ...p }); look(); }
  for (const e of ['neutral', 'happy', 'angry', 'shock', 'sad', 'proud']) rows.push(face(e), face(e, [2, -2.2, 1.4]));
  for (const k of marks) for (const a of [2, 30]) { S.face({ expr: 'neutral', t: 20 + a, age: 60, cam: CAM, marks: [[k, a]] }); rows.push(marksIn(S).map(m => [m.position.toArray(), m.scale.x].flat().map(num).join(',')).join(';')); }
  return rows;
}
function measure() {
  const over = (bodies, opts, marks) => sha(bodies.flatMap(b => opts.flatMap(o => draws(b, o, marks))).join('\n')), B3 = ['adult', 'child', 'elder'];
  const out = { plain: over(B3, [{}], ['sweat', 'exclaim']), ages: over(['adult', 'elder'], ['elder', 'teen', 'child', 'toddler'].map(faceAge => ({ faceAge }))), tidy: over(B3, [{ tidyFeet: true }, { tidyFeet: true, faceAge: 'elder' }]) };
  useHeadMarks('bold'); try { out.bold = over(['adult'], [{}, { faceAge: 'teen' }], BOLD_MARKS); } finally { useHeadMarks(); }
  return out;
}

if (PRINT) console.log(JSON.stringify(measure(), null, 1));
else {
  test('a figure with no costume renders as main 0704de3e does, plain, aged, with tidyFeet and with bold marks (wardrobe.js loaded)', () => assert.deepEqual(measure(), PLAIN_0704DE3E));

  // what a torso's own pieces are to its drawn surface: each point's distance to the nearest drawn triangle (sampled)
  const v3 = (A, i) => new THREE.Vector3().fromBufferAttribute(A, i), _t = new THREE.Triangle(), _q = new THREE.Vector3();
  const shell = S => { const g = S.parts.torso.geometry, P = g.attributes.position, I = g.index.array, T = []; for (let t = 0; t < I.length; t += 3) { const q = [v3(P, I[t]), v3(P, I[t + 1]), v3(P, I[t + 2])]; if (_t.set(...q).getArea() > 1e-8) T.push(q); } return T; };
  const off = (T, p) => { let m = Infinity; for (const t of T) { if (t[0].distanceTo(p) > 0.25) continue; _t.set(...t).closestPointToPoint(p, _q); m = Math.min(m, _q.distanceTo(p)); } return m; };
  const dists = S => { const T = shell(S); return S.wardrobe.group.children.filter(m => m.isMesh).map(m => { const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 12)); return Array.from({ length: Math.ceil(A.count / st) }, (_, i) => off(T, v3(A, i * st))); }); };
  const PAIRS = [['elder', 'elder', 'job:doctor'], ['child', 'child', 'job:student'], ['adult', 'teen', 'job:police'], ['heavy', 'toddler', 'job:chef']];
  for (const [body, faceAge, job] of PAIRS) test(`${body} body, faceAge ${faceAge}, ${job}: the age face is drawn, the costume is on the shell and bends with it`, () => {
    const a = build(body, { faceAge, tidyFeet: true }, [job]), bare = build(body, { faceAge }), none = build(body, {}, [job]), S = a.S;
    assert.equal(S.spec.faceAge, faceAge, 'S.spec is the spec the figure was built from'); assert.ok(S.wardrobe);
    S.pose2({ ...P0 }); bare.S.pose2({ ...P0 }); none.S.pose2({ ...P0 });
    for (const e of ['neutral', 'happy', 'angry', 'sad']) { const f = a.face(e); assert.equal(f, bare.face(e), `${e}: not the age face of the same spec undressed`); assert.notEqual(f, none.face(e), `${e}: no age drawn under the costume`); }
    // the pieces: many, on the torso's own group, within reach of the shell, and no further off it bent 60 deg (4.5 mm: TRIM_MM of stick-wardrobe.test.mjs)
    assert.equal(S.wardrobe.group.parent, S.parts.torso.parent); const d0 = dists(S); assert.ok(d0.length >= 4, `${d0.length} pieces`);
    S.pose2({ ...P0, spine: { bend: 60, twist: -5 }, sq: 0.04 }); assert.ok(S.spineB?.th > 0.5, 'S.spineB carries the bend'); const d1 = dists(S);
    d0.forEach((l, k) => l.forEach((d, i) => { if (d <= 0.04) assert.ok(Math.abs(d1[k][i] - d) <= 0.0045, `piece ${k} point ${i}: ${(1000 * d1[k][i]).toFixed(1)} mm off the bent shell, ${(1000 * d).toFixed(1)} at rest`); }));
    assert.ok(d0.flat().filter(d => d <= 0.04).length >= 20, 'too few points measured');
    // the sleeves lie on the drawn arm lines (parts.limbs)
    assert.ok(S.wardrobe.sleeves.length && S.parts.limbs.armL.isMesh && S.parts.limbs.legR.isMesh, 'no sleeves on the arm lines');
  });

  test('S.pose2 bent, then S.pose: the spine bend is cleared (cast.js) and tidyFeet hides the two heels under a costume as without one', () => {
    const hidden = S => { let n = 0; for (const o of S.root.children) if (o.isMesh && !o.visible) n++; return n; }, pts = S => S.wardrobe.group.children.filter(m => m.isMesh).flatMap(m => Array.from(m.geometry.attributes.position.array));
    const a = build('adult', { faceAge: 'elder', tidyFeet: true }, ['job:police']).S, b = build('adult', { faceAge: 'elder' }, ['job:police']).S;
    a.pose(P0); assert.equal(a.spineB, null); const rest = pts(a); for (const S of [a, b]) S.pose2({ ...P0, spine: { bend: 50 } }); assert.ok(a.spineB); assert.notDeepEqual(pts(a), rest, 'the trims bent'); assert.equal(hidden(a), hidden(b), 'S.pose2: the heels are shown');
    for (const S of [a, b]) S.pose(P0); assert.equal(a.spineB, null); assert.equal(hidden(a), hidden(b) + 2, 'S.pose: the two heel balls hidden');
  });

  // the part of a mark's card (its middle 90 %) a hat hides from the lens, front and 24 deg round
  const CAMS = [[0, -4, 1.5], [1.6, -3.6, 1.5]], ray = new THREE.Raycaster();
  const hiddenShare = (S, kind) => { let hid = 0, n = 0; for (let t = 0; t < 90; t += 12) for (const cam of CAMS) { S.face({ expr: 'neutral', t, age: 60, cam, marks: [[kind, 30]] }); S.root.updateMatrixWorld(true); const C = new THREE.Vector3(cam[0], cam[2], -cam[1]);
    const hat = []; for (const h of S.wardrobe?.hats || []) h.traverse(o => { if (o.isMesh) hat.push(o); });
    for (const m of marksIn(S)) for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { if (Math.hypot(i, j) > 3.6) continue; const p = new THREE.Vector3(i / 8, j / 8, 0).applyMatrix4(m.matrixWorld), d = p.distanceTo(C); ray.set(C, p.sub(C).normalize()); ray.far = d - 1e-3; n++; if (ray.intersectObjects(hat, false).length) hid++; } } assert.ok(n, `${kind}: no card drawn`); return hid / n; };
  test('head marks and a wardrobe cap: the same cards at the same places on the head as bare-headed, the cap and the marks both drawn', () => {
    const kinds = { undefined: ['sweat', 'anger', 'sparkle', 'question', 'exclaim', 'steam', 'stars', 'zzz'], bold: BOLD_MARKS };
    try { for (const set of [undefined, 'bold']) { useHeadMarks(set); for (const cap of ['cap:police', 'cap:pilot', 'cap:scrub', 'hat:hard', 'hat:toque']) {
      const a = build('adult', { faceAge: 'teen' }, [cap]).S, b = build('adult', { faceAge: 'teen' }).S; a.pose2(P0); b.pose2(P0); assert.equal(a.wardrobe.hats.length, 1); assert.equal(a.wardrobe.hats[0].parent, a.parts.marks.parent, 'the cap and the marks are on the same head');
      for (const k of kinds[set]) { for (const S of [a, b]) S.face({ expr: 'neutral', t: 30, age: 60, cam: CAM, marks: [[k, 30]] }); const rows = S => marksIn(S).map(m => [m.position.toArray(), m.scale.x, m.renderOrder, m.material.depthTest].flat().map(x => num(x)));
        assert.ok(rows(b).length, k); assert.deepEqual(rows(a), rows(b), `${cap} ${k}`); assert.equal(a.wardrobe.hats[0].visible, true); } } } } finally { useHeadMarks(); }
  });
  const cover = () => { const out = {}; try { for (const set of ['classic', 'bold']) { useHeadMarks(set); for (const hat of ['cap:police', 'cap:pilot', 'cap:scrub', 'hat:hard', 'hat:toque']) { const { S } = build('adult', {}, [hat]); S.pose2(P0);
    for (const k of set === 'bold' ? BOLD_MARKS : ['sweat', 'anger', 'sparkle', 'question', 'exclaim', 'steam', 'stars', 'zzz']) out[`${set} ${hat} ${k}`] = hiddenShare(S, k); } } } finally { useHeadMarks(); } return out; };
  // an open design call (hats and head marks, FOLLOWUPS): every pair's share is measured and printed, no limit is set
  test('head marks and a wardrobe hat: the share of each mark under the hat', { todo: 'hats and head marks: an open design call (FOLLOWUPS)' }, t => { for (const [n, x] of Object.entries(cover())) t.diagnostic(`${n}: ${Math.round(100 * x)} % of the mark is under the hat`); });
}
