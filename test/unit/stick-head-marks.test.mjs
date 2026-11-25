// The head marks and the face ages are opt-in (reel.js headMarks: 'bold'; a cast spec's faceAge), and so are a pose's head_yaw and a spec's tidyFeet (cast.js): a film that asks for
// none of them re-renders exactly as it did before kit faces v4. Proven by hash, not by eye: real figures (cast.js makeStick on
// the adult, child and elder bodies, no faceAge) draw every mark over a range of frames and ages (the card drawings, every
// card's place and size with its pop-in) and every s2 face, posed by beats and by a keyed clip, poses films already use as
// compilePose hands them on, and the catalogue faces once expressions.js is loaded; the numbers below are the same harness run on commit a27faf07:
//   d=$(mktemp -d); git archive a27faf07 | tar -x -C $d; ln -s $PWD/node_modules $d/node_modules
//   STICK_ROOT=$d node test/unit/stick-head-marks.test.mjs --print
// (--print on this tree prints what it draws now: the two must be the same). Not covered here: play.js buildAct itself
// (a browser page); its pieces are: checkMark, markOwner with the null until() of a beat with no markFace, the add keys
// compilePose hands it (head_yaw among them)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = process.env.STICK_ROOT || HERE, PRINT = process.argv.includes('--print');
const imp = p => import(pathToFileURL(path.join(ROOT, 'styles/stick-man', p)).href);
const EXPECT_A27FAF07 = {
  adult: { rig: '3382bba741aae3b7', marks: '45fc6cb36607c9c0', cards: 'bd92e24691f44c77', v21: '4e7a7055c45b1543', faces: '6446fe3607ef7892', rig2: 'a027b6313e90732e', facesExpr: '9e13d0fb2dd0e84f' },
  child: { rig: 'e03ee29de0094a51', marks: 'b8881f05de1f9609', cards: 'bd92e24691f44c77', v21: '0ce3592e52a0551c', faces: '6897b3fc968e9011', rig2: 'a0caa7ed401c1597', facesExpr: '974c7f780e0b83f0' },
  elder: { rig: 'f0f99a7bdd327a3f', marks: 'd48ab7dca48be1b9', cards: 'bd92e24691f44c77', v21: '52d5c02539261c01', faces: '655a7ddb78f19dfb', rig2: '0d0223ed7ad6a546', facesExpr: '72d4245ac57a685e' },
  beat: '84781339291755aa', poses: 'f60502e9a3860626',
};

const num = v => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
// a canvas that logs every 2D call and property set (numbers rounded); images drawn are logged as their own canvas's log
function canvas() {
  const c = { width: 300, height: 150, style: {}, log: [], addEventListener() {} };
  const g = new Proxy({ canvas: c }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'getTransform') return () => ({});
      if (k === 'measureText') return () => ({ width: 10 });
      return (...a) => { c.log.push(`${String(k)}(${a.map(v => v?.log ? `canvas:${sha(v.log.join('\n'))}` : JSON.stringify(v, (_, q) => num(q))).join(',')})`);
        if (/^create/.test(String(k))) return { addColorStop() {}, data: new Uint8ClampedArray(4) }; };
    },
    set(t, k, v) { c.log.push(`${String(k)}=${JSON.stringify(v, (_, q) => num(q))}`); return true; } });
  c.getContext = () => g;
  return c;
}

// what a tree draws with neither switch: { body: { marks, faces } } hashes and the mark cards' own
async function measure() {
  const made = [], prev = globalThis.document;
  globalThis.document = { createElement: () => { const c = canvas(); made.push(c); return c; } };
  try {
    const { useFaceStyle } = await imp('engine/facestyles/index.js'); await useFaceStyle(undefined);
    // (play.js boot's next step, with a reel.js that names no set; a27faf07 has no such file)
    if (fs.existsSync(path.join(ROOT, 'styles/stick-man/engine/headmarks.js'))) (await imp('engine/headmarks.js')).useHeadMarks(undefined);
    const { markOwner } = await imp('engine/acting.js');
    const { makeStick, MARK_NAMES, EXPR } = await imp('engine/cast.js');
    const { bodySpec } = await imp('motion-lib/bodies.js');
    const { DESIGNS } = await imp('engine/facestyles/s2.js');
    const faceAt = (S, n, c, blink) => { const fc = made.filter(x => x.width === 512); for (const x of fc) x.log.length = 0;
      S.face({ expr: n, blink, t: 8, age: 40, cam: c }); return `${n} ${c} ${blink} ${sha(fc.map(x => x.log.join('\n')).join('\n--\n'))}`; };
    const OLD = ['sweat', 'anger', 'sparkle', 'question', 'exclaim', 'steam', 'stars', 'zzz'];
    assert.deepEqual([...MARK_NAMES].sort(), [...OLD].sort(), 'the marks a film has without the switch');
    const V21 = Object.keys(DESIGNS).filter(n => /^[yc]_/.test(n) && n !== 'y_calm').sort();
    assert.equal(V21.length, 27);
    // the catalogue's faces, the talking twins and the faces that bring their own marks, e_ faces of other modules aside
    const ALL = Object.keys(DESIGNS).filter(n => !/^e_/.test(n)).sort();
    const out = {}, figs = {};
    for (const body of ['adult', 'child', 'elder']) {
      const S = makeStick(bodySpec({ name: 'T', shirt: [0.6, 0.6, 0.6], hair: [] }, body)), cam = [0, -3, 1.4];
      const cards = () => { const l = []; S.parts.marks.traverse(m => { if (m !== S.parts.marks) l.push(m); }); return l; };
      const rowsOf = () => cards().map(m => m.visible ? [m.position.toArray(), m.scale.x, m.quaternion.toArray(), m.material.alphaTest, m.renderOrder].flat().map(num).join(',') : '-').join(';');
      const rows = [];
      // every mark asked for by a beat, its whole life: the pop-in frames and 80 more, at three frame phases
      for (const k of OLD) for (const t0 of [0, 37, 200]) for (let a = 0; a < 90; a++) { S.face({ expr: 'neutral', t: t0 + a, age: 60, cam, marks: [[k, a]] }); rows.push(`${k} ${t0} ${a} ${rowsOf()}`); }
      // the marks built into faces (proud, angry, confused, sleep and the kit's own)
      const own = Object.keys(EXPR).filter(n => EXPR[n].marks?.length && !/^e_/.test(n)).sort();
      assert.ok(['proud', 'angry', 'confused', 'sleep'].every(n => own.includes(n)), own.join());
      for (const n of own) for (let a = 0; a < 50; a++) { S.face({ expr: n, t: 11 + a, age: a, cam, marks: [] }); rows.push(`${n} ${a} ${rowsOf()}`); }
      // the card drawings themselves (the mark textures' canvases)
      const tex = [...new Set(cards().map(m => m.material.map.image))].map(c => c.log.join('\n')).sort();
      assert.equal(tex.length, 8, 'eight card drawings');
      // every face on this figure's own face canvas, straight on and turned
      const faceLog = [];
      for (const n of ALL) for (const c of [cam, [2, -2.2, 1.4], [0, -3, 2.6]]) for (const blink of [0, 0.5]) {
        faceLog.push(faceAt(S, n, c, blink));
      }
      assert.ok(new Set(faceLog.map(l => l.split(' ').pop())).size > 40, 'the faces really drew');
      // the figure itself (head, torso, limbs, feet, foot shadow): every mesh's place, shape and look in a few poses, posed by
      // beats (S.pose) and by keys (S.pose2)
      const rig = [], rig2 = [], P2 = { pos: [0, 0, 0], yaw: 0, expr: 'neutral' };
      const look = (to = rig) => { S.root.updateMatrixWorld(true); S.root.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position?.array || [], n = Math.max(1, Math.floor(p.length / 90));
        to.push([m.visible, m.matrixWorld.toArray(), m.material.color?.getHex?.() ?? '', m.material.opacity ?? '', Array.from(p).filter((_, i) => i % n === 0)].flat(2).map(num).join(',')); }); };
      for (const p of [{}, { head_pitch: 14, head_tilt: -9, lean: 5, pitch: 8, bob: -0.1, shrug: 0.1 }, { handL: [-0.6, 2.0, 0.3], handR: [0.2, 1.7, 0.4], elbowL: [-1, 0, 0], elbowR: [1, -0.4, 0.2], footR: [0.3, 0.06, 0.1], footPitchR: -20, shTwist: 12, hipTwist: -6 }]) { S.pose({ ...P2, ...p }); look(); }
      S.pose2({ ...P2, neck: { nod: 8, tilt: 4, turn: -20 }, spine: { bend: 6 }, armL: { raise: 30, swing: 20, elbow: 40 } }); look();
      // a keyed clip (S.pose2) over 30 frames, legs, feet and heels keyed too, with no tidyFeet
      for (let f = 0; f < 30; f++) { S.pose2({ ...P2, spine: { bend: f * 0.5, twist: -f * 0.3 }, neck: { nod: f * 0.4, turn: f }, armR: { raise: 2 * f, swing: f, elbow: f },
        legL: { foot: [-0.22, 0.022 + 0.004 * f, 0.01 * f], pitch: -f }, legR: { foot: [0.22, 0.022, -0.004 * f], pitch: f / 2 } }); look(rig2); }
      figs[body] = { cam };
      out[body] = { rig: sha(rig.join('\n')), rig2: sha(rig2.join('\n')), marks: sha(rows.join('\n')), cards: sha(tex.join('\n--\n')), v21: sha(faceLog.filter(l => V21.includes(l.split(' ')[0])).join('\n')), faces: sha(faceLog.join('\n')) };
    }
    // how long a beat shows its mark (acting.js markOwner: the pose keys it sets, frame by frame)
    out.beat = sha(JSON.stringify(OLD.flatMap(k => [k, [k, 20]].map(mark => { const o = markOwner({ mark, at: 10 }); return [o.chan, o.start, Array.from({ length: 70 }, (_, f) => o.fn(f))]; }))));
    // a beat with no markFace (every beat a film wrote before kit faces v4): play.js hands markOwner a null until()
    out.beatNull = sha(JSON.stringify(OLD.flatMap(k => [k, [k, 20]].map(mark => { const o = markOwner({ mark, at: 10 }, null); return [o.chan, o.start, Array.from({ length: 70 }, (_, f) => o.fn(f))]; }))));
    // poses a film already uses, as compilePose hands them to play.js (the add channel, where head_yaw now passes, and the
    // hands), at frames 0-69, either hand
    const { compilePose } = await imp('engine/poses.js');
    out.poses = sha(JSON.stringify(['lean_in', 'shrug', 'hands_on_hips', 'think', 'phone'].flatMap(name => [{ at: 5 }, { at: 5, hand: 'L', amp: 0.8 }].map(p => {
      const st = { name: 'T', hold: {}, pos: [0, 0], yaw: 0 }, r = compilePose(name, p, st, {});
      return [name, r.end, r.cues, r.owners.map(o => [o.chan, o.start, o.fade, o.smooth, o.fast, Array.from({ length: 70 }, (_, f) => o.fn(f))])];
    })), (_, q) => num(q)));
    // the catalogue faces again once expressions.js (and with it s2expr.js, the e_ faces) is loaded, as a film that uses an
    // expression loads it (a27faf07 has no such file: there the faces draw as before)
    if (fs.existsSync(path.join(ROOT, 'styles/stick-man/engine/expressions.js'))) await imp('engine/expressions.js');
    for (const [body, { cam }] of Object.entries(figs)) {
      const S = makeStick(bodySpec({ name: 'T', shirt: [0.6, 0.6, 0.6], hair: [] }, body)), l = []; for (const n of ALL) for (const c of [cam, [2, -2.2, 1.4], [0, -3, 2.6]]) for (const blink of [0, 0.5]) l.push(faceAt(S, n, c, blink));
      out[body].facesExpr = sha(l.join('\n'));
    }
    return out;
  } finally { globalThis.document = prev; }
}

const now = await measure();
if (PRINT) console.log(JSON.stringify(now, null, 1));
else {
  const E = EXPECT_A27FAF07, BODIES = ['adult', 'child', 'elder'];
  test('no headMarks switch: every head mark (drawing, place, pop-in, timing) is the one of a27faf07, on an adult, a child and an elder', () => {
    for (const b of BODIES) { assert.equal(now[b].cards, E[b].cards, `${b}: mark drawings`); assert.equal(now[b].marks, E[b].marks, `${b}: mark places and timing`); }
    assert.equal(now.beat, E.beat, 'how long a beat shows its mark');
  });
  test('no head_yaw pose, no tidyFeet: the figure (head, torso, limbs, feet, foot shadow) stands as in a27faf07 on every body', () => {
    for (const b of BODIES) assert.equal(now[b].rig, E[b].rig, b);
  });
  test('no faceAge: every V2.1 and catalogue face draws as in a27faf07 on an adult, a child and an elder body (makeStick)', () => {
    for (const b of BODIES) { assert.equal(now[b].v21, E[b].v21, `${b}: the 27 V2.1 faces`); assert.equal(now[b].faces, E[b].faces, `${b}: every s2 face`); }
  });
  test('a keyed clip (S.pose2, legs and heels keyed) with no tidyFeet moves every mesh as in a27faf07 on every body', () => {
    for (const b of BODIES) assert.equal(now[b].rig2, E[b].rig2, b);
  });
  test('poses films already use (lean_in, shrug, hands_on_hips, think, phone; either hand) compile as in a27faf07: no head_yaw, the same add and hand keys', () => {
    assert.equal(now.poses, E.poses);
  });
  test('a beat with no markFace (play.js: markOwner with a null until) shows its mark as in a27faf07', () => assert.equal(now.beatNull, E.beat));
  test('loading expressions.js (and the e_ faces) leaves every catalogue face as a27faf07 draws it, on every body', () => {
    for (const b of BODIES) assert.equal(now[b].facesExpr, E[b].facesExpr, b);
  });
  test('the film switch: headMarks bold draws the bold set and only there star, ellipsis, gloom and shake; a wrong name or an old-set film asking for one fails', async () => {
    const { useHeadMarks, checkMark, BOLD_MARKS, MARK_SIZE } = await imp('engine/headmarks.js');
    const { MARK_SET, MARK_NAMES, faceRig } = await imp('engine/faces.js');
    const prev = globalThis.document; globalThis.document = { createElement: () => canvas() };
    const size = (set, kind, age) => { useHeadMarks(set); const R = faceRig(1), V = []; R.draw('neutral', 0, 30, [[kind, age]], null); R.group.traverse(m => { if (m.isMesh && m.visible) V.push(m.scale.x); }); return V; };
    try {
      assert.equal(MARK_SET.now, MARK_SET.classic);
      for (const m of ['star', 'ellipsis', 'gloom', 'shake']) { assert.throws(() => checkMark([m, 30]), /headMarks: 'bold'/); assert.throws(() => checkMark(m), /bold head-mark set only/); assert.deepEqual(size(undefined, m, 20), []); }
      for (const m of MARK_NAMES) { checkMark(m); assert.ok(BOLD_MARKS.includes(m), m); assert.ok(size(undefined, m, 20).length, m); assert.notDeepEqual(size('bold', m, 20), size('classic', m, 20), `${m}: the bold mark is another mark`); }
      useHeadMarks('bold');
      for (const m of BOLD_MARKS) { checkMark([m, 30]); assert.ok(size('bold', m, 20).length && MARK_SIZE[m], m); }
      for (const bad of ['Bold', 'big', null, 'toString']) assert.throws(() => useHeadMarks(bad), /not a head-mark set \('classic', 'bold'/);
      useHeadMarks(); assert.equal(MARK_SET.now, MARK_SET.classic, 'left out = classic');
    } finally { useHeadMarks(); globalThis.document = prev; }
    // the runtime hands the film's own option on, before any figure is built, and checks every mark a beat asks for
    const play = fs.readFileSync(path.join(ROOT, 'styles/stick-man/engine/play.js'), 'utf8');
    assert.match(play, /useHeadMarks\(R1\.headMarks\)/); assert.match(play, /checkMark\(b\.mark\)/);
    assert.ok(play.indexOf('useHeadMarks(R1.headMarks)') < play.indexOf('await buildAct(d, X)'));
  });
}

if (!PRINT) {
// spec.tidyFeet hides the heel balls only while S.pose leaves them at the root: a figure that then plays a keyed clip
// (S.pose2 places the heels) shows them, as a figure without tidyFeet does
test('tidyFeet: a figure posed by beats (S.pose) and then by keys (S.pose2) shows its heels again, mesh for mesh as without tidyFeet', async () => {
  const prev = globalThis.document; globalThis.document = { createElement: () => canvas() };
  try {
    const { makeStick } = await imp('engine/cast.js'), { bodySpec } = await imp('motion-lib/bodies.js');
    const P2 = { pos: [0, 0, 0], yaw: 0, expr: 'neutral' };
    const shown = tidyFeet => { const S = makeStick({ ...bodySpec({ name: 'T', shirt: [0.6, 0.6, 0.6], hair: [] }, 'adult'), tidyFeet });
      const v = () => { const l = []; S.root.traverse(m => { if (m.isMesh) l.push(m.visible); }); return l; };
      S.pose(P2); const a = v(); S.pose2({ ...P2, legR: { foot: [0.2, 0.05, 0.1], pitch: -15 } }); const b = v(); S.pose(P2); return [a, b, v()]; };
    const [tA, tB, tC] = shown(true), [pA, pB, pC] = shown(false);
    assert.equal(pA.filter(x => !x).length + 2, tA.filter(x => !x).length, 'S.pose: the two heel balls hidden');
    assert.deepEqual(tB, pB, 'S.pose2: every mesh shown as without tidyFeet');
    assert.deepEqual(tC, tA, 'back on S.pose: hidden again');
    assert.deepEqual(pC, pA);
  } finally { globalThis.document = prev; }
});
}
