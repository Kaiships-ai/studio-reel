import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { shotFaults, bySecond, cuts, blocks, project, G_FRAME, PLANTED_Z, REF_H } from '../../styles/stick-man/tools/shotfaults.mjs';

const W = 404, H = 720;
const row = (f, o = {}) => ({ f, act: 'a', mix: null, set: 's', motion: { cut: true, feet: {} }, camera: { pos: [0, -5, 1.5], target: [0, 0, 1], fov: 60, lens: 24 },
  actors: { you: { inFrame: true, head: [180, 200, 220, 240], headW: [0, 0, 1.7], pos: [0, 0, 0], figH: 0.4, feet: { L: [-0.1, 0, 0], R: [0.1, 0, 0] }, ...o.you } },
  track: o.props || {}, ...o.extra });
const bag = (c, o = {}) => ({ shown: true, held: false, on: 'in', box: [150, 300, 250, 400], size: 0.6, c, ...o });
const blocking = (rows, w = W, h = H) => shotFaults(rows, { W: w, H: h }).filter(blocks);
const kinds = rows => blocking(rows).map(x => x.kind);

test('a film directed one camera shot per frame is still judged frame to frame; a camera jump or an act change is a cut', () => {
  const rows = Array.from({ length: 6 }, (_, i) => row(i));
  assert.deepEqual(cuts(rows), [true, false, false, false, false, false], 'motion.cut on every frame is not a cut');
  rows[3].camera = { ...rows[3].camera, pos: [4, -5, 1.5] }; rows[5].act = 'b';
  assert.deepEqual(cuts(rows), [true, false, false, true, false, true]);
});

test('a bag that appears or vanishes in one frame inside the shot blocks; at a cut, through the frame edge or from behind a cover it does not', () => {
  const pop = [row(0), row(1), row(2, { props: { 'you:Rduffel': bag([0, 0, 0.5], { held: true }) } }), row(3, { props: { 'you:Rduffel': bag([0, 0, 0.5], { held: true }) } }), row(4)];
  assert.deepEqual(kinds(pop), ['prop appears', 'prop vanishes']);
  const edge = [row(0, { props: { b: bag([3, 0, 0.5], { on: 'off', box: [420, 300, 520, 400] }) } }), row(1, { props: { b: bag([2.9, 0, 0.5], { box: [395, 300, 495, 400] }) } })];
  const cover = [row(0, { props: { b: bag([0, 0, 0.5], { on: 'occluded' }) } }), row(1, { props: { b: bag([0, 0, 0.5]) } })];
  const atCut = [row(0), row(1, { props: { b: bag([0, 0, 0.5]) } })]; atCut[1].edit = true;
  for (const rs of [edge, cover, atCut]) assert.deepEqual(kinds(rs), []);
});

test('a bag that jumps off its path or changes size in one frame blocks; one carried at a walk, or speeding up, does not', () => {
  const walk = Array.from({ length: 12 }, (_, i) => row(i, { props: { b: bag([0.05 * i, 0, 0.6], { held: true }) } }));
  assert.deepEqual(kinds(walk), []);
  const faster = Array.from({ length: 12 }, (_, i) => row(i, { props: { b: bag([0.01 * i * i, 0, 0.6]) } }));
  assert.deepEqual(kinds(faster), [], 'an even speed-up is no jump');
  walk[5].track.b = bag([0.55, 0, 0.6], { held: true });
  walk[9].track.b = bag([0.45, 0, 0.6], { held: true, size: 0.4 });
  assert.deepEqual(kinds(walk), ['prop jumps', 'prop resizes', 'prop resizes'], 'one jump out and back is one event');
});

test('a jump too small to see on a phone is watched, not blocked', () => {
  const far = Array.from({ length: 10 }, (_, i) => row(i, { props: { b: bag([0, 40, 0.6], { box: [200, 300, 204, 304] }) } }));
  far[5].track.b = bag([0.05, 40, 0.6], { box: [200, 300, 204, 304] });
  const f = shotFaults(far, { W, H }).filter(x => x.kind === 'prop jumps');
  assert.equal(f.length, 1); assert.ok(f[0].px < 2 && !blocks(f[0]), `5 cm at 40 m is ${f[0].px.toFixed(2)} px`);
});

test('a moving prop may change place behind a cut; one left at rest and gone when the next shot looks at its spot breaks continuity', () => {
  const a = row(0, { props: { 'you:Bhugbag': bag([0, 0, 0.8], { held: true, size: 0.65 }) } }), b = row(1, { props: { 'you:Rbag': bag([0.3, 0, 0.8], { held: true, size: 0.93 }) } });
  b.edit = true;
  assert.deepEqual(kinds([a, b]), ['prop changes at cut']);
  const rest = [row(0, { props: { b: bag([0, 0, 0.7]) } }), row(1, { props: { b: bag([0, 0, 0.7]) } }), row(2, { props: {} })]; rest[2].edit = true;
  assert.deepEqual(kinds(rest), ['prop gone after cut']);
  const moving = [row(0, { props: { b: bag([0, 0, 0.7]) } }), row(1, { props: { b: bag([0.3, 0, 0.7]) } }), row(2, { props: {} })]; moving[2].edit = true;
  assert.deepEqual(kinds(moving), [], 'a train running through the frame may be moved at the cut');
  rest[2].camera = { pos: [0, 5, 1.5], target: [0, 10, 1], fov: 60, lens: 24 };
  assert.deepEqual(kinds(rest), [], 'the next shot looks away from the spot');
});

test('a bag let go that falls under gravity is fine; one that rises at a steady speed floats', () => {
  const fall = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0, 0, 1.2 - 0.5 * G_FRAME * i * i], { held: i < 1 }) } }));
  assert.deepEqual(kinds(fall), []);
  const drift = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0, 0, 0.9 + 0.02 * i], { held: i < 1 }) } }));
  assert.deepEqual(kinds(drift), ['prop floats']);
  const carried = Array.from({ length: 8 }, (_, i) => row(i, { props: { b: bag([0, 0, 0.9 + 0.02 * i]) } }));
  assert.deepEqual(kinds(carried), [], 'never let go: the film moves it, no hand released it');
});

test('a body that travels with both feet sliding on the floor skates; a walk, or a body riding in a car, does not', () => {
  const step = i => (Math.floor(i / 4) % 2 ? { L: [0.05 * i, 0, 0], R: [0.05 * 4 * Math.floor(i / 4), 0, 0] } : { L: [0.05 * 4 * Math.floor(i / 4), 0, 0], R: [0.05 * i, 0, 0] });
  const walk = Array.from({ length: 12 }, (_, i) => row(i, { you: { pos: [0.025 * i, 0, 0], feet: step(i) } }));
  assert.deepEqual(kinds(walk), []);
  const drag = z => Array.from({ length: 12 }, (_, i) => row(i, { you: { pos: [0.1 * i, 0, 0], feet: { L: [0.1 * i - 0.1, 0, z], R: [0.1 * i + 0.1, 0, z] } } }));
  assert.deepEqual(kinds(drag(0)), ['figure skates']);
  assert.deepEqual(kinds(drag(0.4)), [], 'feet on a car floor move with the car');
});

test('a figure that pops in inside the frame, or goes deep into the set for frames, blocks; one who walks in through the edge, or brushes a surface, does not', () => {
  const out = { inFrame: false };
  assert.deepEqual(kinds([row(0, { you: out }), row(1)]), ['figure appears']);
  assert.deepEqual(kinds([row(0, { you: out }), row(1, { you: { head: [0, 200, 30, 240] } })]), []);
  const limbs = z => ({ torsoLean: 0, torsoRoll: 0, skel: { pelvis: [0, 0, z], neck: [0, 0, z + 0.5], head: [0, 0, 1.7] },
    ...Object.fromEntries(['L', 'R'].map((s, k) => [s, { kneeFlex: 0, elbowFlex: 0, footPitch: 0, hip: [k - 0.5, 0, z], knee: [k - 0.5, 0, 0.5], ankle: [k - 0.5, 0, 0.02], toe: [k - 0.5, -0.1, 0.02], shoulder: [k - 0.5, 0, z + 0.5], elbow: [k - 0.5, 0, z + 0.2], hand: [k - 0.5, 0, z] }])) });
  const sink = d => Array.from({ length: 10 }, (_, i) => row(i, { you: { limbs: limbs(i >= 3 && i < 7 ? 0.9 - d : 0.9) },
    extra: i === 3 ? { cross: [{ what: 'you.pelvis', through: 'seat', d, at: [0, 0, 0.9] }] } : {} }));
  assert.deepEqual(kinds(sink(0.3)), ['body passes through'], '30 cm into the seat for 4 frames');
  assert.deepEqual(kinds(sink(0.005)), [], 'half a centimetre is resting on it');
});

test('faults group by second; a second blocks only when a fault the camera sees is large enough', () => {
  const s = bySecond([{ F: 31, vis: 'occluded', px: 50, frames: 1, seen: 1, sev: 50 }, { F: 45, vis: 'in', px: 50, frames: 1, seen: 1, sev: 50 }, { F: 61, vis: 'in', px: 2, frames: 1, seen: 1, sev: 2 }]);
  assert.deepEqual(s.map(x => [x.s, x.block]), [[1, true], [2, false]]);
});

// Mutation test: faults put into the clean rows of pilot-a (a film Kai approved, styles/stick-man/examples/pilot-a, rows from
// shot.mjs --dbg at 404x720) where the thing is large on screen and the changed part is inside the frame; the gate must block at least 90% of them, and nothing new when
// only a train's speed changes. It also stands in for complaints whose rows were lost (a cord shaking, a bag through a car wall).
const clean = () => zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/shotgate/pilot-a.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const base = clean(), cut = cuts(base), baseBlocks = blocking(base), baseKeys = new Set(baseBlocks.map(x => `${x.F} ${x.kind}`));
const mid = (i, before = 3, after = 6) => i >= before && i + after < base.length && !cut.slice(i - before + 1, i + after + 1).some(Boolean);
const quiet = i => !baseBlocks.some(x => Math.abs(x.F - i) < 8);
const spread = (list, n) => Array.from({ length: Math.min(n, list.length) }, (_, k) => list[Math.floor((k + 0.5) * list.length / Math.min(n, list.length))]);
const right = cam => { const f = cam.target.map((x, k) => x - cam.pos[k]), r = [f[1], -f[0], 0], l = Math.hypot(...r); return r.map(x => x / l); };
const shift = (P, v) => P.map((x, k) => x + v[k]);
const boxSide = t => (t?.box ? Math.max(t.box[2] - t.box[0], t.box[3] - t.box[1]) * REF_H / H : 0);
const centred = t => t?.box && (t.box[0] + t.box[2]) / 2 > 0 && (t.box[0] + t.box[2]) / 2 < W && (t.box[1] + t.box[3]) / 2 > 0 && (t.box[1] + t.box[3]) / 2 < H;
const propSites = [...new Set(base.flatMap(r => Object.keys(r.track)))].flatMap(id => base.map((r, i) => [id, i])
  .filter(([, i]) => mid(i) && quiet(i) && [i - 1, i, i + 1].every(j => base[j].track[id]?.on === 'in' && !base[j].track[id].held && centred(base[j].track[id]) && boxSide(base[j].track[id]) >= 20)));
const onScreen = (r, P) => { const q = project(r.camera, P, W, H); return q && Math.abs(q[0]) < 0.9 && Math.abs(q[1]) < 0.9; };
const sitesWhere = see => Object.keys(base[0].actors).flatMap(n => base.map((r, i) => [n, i]).filter(([, i]) => mid(i, 3, 8) && quiet(i)
  && base.slice(i - 2, i + 6).every(r => r.actors[n].inFrame && r.actors[n].figH >= 0.3 && see(r, r.actors[n].limbs))));
const bodySites = sitesWhere((r, l) => onScreen(r, l.skel.pelvis)), armSites = sitesWhere((r, l) => onScreen(r, l.R.elbow) && onScreen(r, l.R.hand));
const footSites = Object.keys(base[0].actors).flatMap(n => ['L', 'R'].flatMap(s => base.map((r, i) => [n, i, s]).filter(([, i]) => mid(i, 3, 8) && quiet(i)
  && base.slice(i - 1, i + 6).every(r => r.actors[n].inFrame && r.actors[n].figH >= 0.3 && r.actors[n].limbs[s].ankle[2] < PLANTED_Z && onScreen(r, r.actors[n].limbs[s].ankle)))));
const moveActor = (a, v) => { a.headW = shift(a.headW, v); a.pos = shift(a.pos, v);
  for (const s of ['L', 'R']) { for (const k of ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'hand', 'target']) if (a.limbs[s][k]) a.limbs[s][k] = shift(a.limbs[s][k], v); a.feet[s] = shift(a.feet[s], v); }
  for (const k of ['pelvis', 'neck', 'head']) a.limbs.skel[k] = shift(a.limbs.skel[k], v); };
const turn = (P, O, axis, deg) => { const v = P.map((x, k) => x - O[k]), c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180), d = v.reduce((t, x, k) => t + x * axis[k], 0);
  const x = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]]; return O.map((o, k) => o + v[k] * c + x[k] * s + axis[k] * d * (1 - c)); };
const MUT = {
  'prop moves 0.3 m for one frame': { kind: 'prop jumps', sites: propSites, apply: (rs, [id, i]) => { rs[i].track[id].c = shift(rs[i].track[id].c, right(rs[i].camera).map(x => x * 0.3)); } },
  'prop grows 20%': { kind: 'prop resizes', sites: propSites, apply: (rs, [id, i]) => { for (let j = i; j < rs.length && (j === i || !cut[j]); j++) if (rs[j].track[id]?.shown) rs[j].track[id].size *= 1.2; } },
  'prop vanishes for one frame': { kind: 'prop vanishes', sites: propSites, apply: (rs, [id, i]) => { rs[i].track[id] = { shown: false }; } },
  'body 8 cm through a surface for 4 frames': { kind: 'body passes through', sites: bodySites, apply: (rs, [n, i]) => {
    const at = rs[i - 1].actors[n].limbs.skel.pelvis; for (let j = i; j < i + 4; j++) moveActor(rs[j].actors[n], [0, 0, -0.08]);
    const P = rs[i].actors[n].limbs, p = P.L.hip.map((x, k) => (x + P.R.hip[k]) / 2);
    rs[i].cross = [...rs[i].cross, { what: `${n}.pelvis`, through: 'mutation', d: Math.hypot(...p.map((x, k) => x - at[k])), at }]; } },
  'planted foot slides 3 cm a frame for 6 frames': { kind: 'foot slides', sites: footSites, apply: (rs, [n, i, s]) => {
    const v = right(rs[i].camera); for (let j = i; j < i + 6; j++) { const l = rs[j].actors[n].limbs[s], d = v.map(x => x * 0.03 * (j - i + 1));
      l.ankle = shift(l.ankle, d); l.toe = shift(l.toe, d); rs[j].actors[n].feet[s] = shift(rs[j].actors[n].feet[s], d); } } },
  'elbow pops 60 deg for one frame': { kind: 'joint pops', sites: armSites, apply: (rs, [n, i]) => {
    const c = rs[i].camera, f = c.target.map((x, k) => x - c.pos[k]), lf = Math.hypot(...f), l = rs[i].actors[n].limbs.R;
    l.hand = turn(l.hand, l.elbow, f.map(x => x / lf), 60); l.elbowFlex += l.elbowFlex > 90 ? -60 : 60; } },
};

test('the gate blocks at least 90% of faults put into the clean rows of a film Kai approved', t => {
  let caught = 0, total = 0; const missed = [];
  for (const [name, m] of Object.entries(MUT)) for (const site of spread(m.sites, 5)) {
    const rs = clean(); m.apply(rs, site); total++;
    const i = site[1], hit = blocking(rs).some(x => x.kind === m.kind && x.F >= i - 1 && x.F <= i + 6 && !baseKeys.has(`${x.F} ${x.kind}`));
    if (hit) caught++; else missed.push(`${name} @ ${site.join(' ')}`);
  }
  t.diagnostic(`caught ${caught}/${total}${missed.length ? '; missed: ' + missed.join('; ') : ''}`);
  assert.ok(total >= 25, `${total} faults put in`);
  assert.ok(caught / total >= 0.9, `caught ${caught}/${total}; missed: ${missed.join('; ')}`);
});

test('a train that only runs faster from one frame on adds no blocking fault', () => {
  const rs = clean(), i0 = base.findIndex((r, i) => i > 90 && mid(i, 3, 20) && r.track.loco?.on === 'in');
  const v = base[i0].track.loco.c.map((x, k) => x - base[i0 - 1].track.loco.c[k]);
  for (let j = i0; j < rs.length && (j === i0 || !cut[j]); j++) rs[j].track.loco.c = shift(rs[j].track.loco.c, v.map(x => x * 0.25 * (j - i0 + 1)));
  assert.ok(project(base[i0].camera, base[i0].track.loco.c, W, H), 'the train is in front of the camera');
  assert.deepEqual(blocking(rs).filter(x => !baseKeys.has(`${x.F} ${x.kind}`)), []);
});
