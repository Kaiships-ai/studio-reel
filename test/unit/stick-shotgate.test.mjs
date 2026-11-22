import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { shotFaults, bySecond, cuts, blocks, project, G_FRAME, PLANTED_Z, REF_H, CHANGE_PX } from '../../styles/stick-man/tools/gates/shotfaults.mjs';

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

test('a bag that pops in and stays, or goes and stays gone, blocks; one gone for a frame or there for two is watched; at a cut, through the frame edge or from behind a cover nothing counts', () => {
  const shown = on => on.map((x, i) => row(i, x ? { props: { 'you:Rduffel': bag([0, 0, 0.5], { held: true }) } } : {}));
  assert.deepEqual(kinds(shown([0, 0, 0, 0, 1, 1, 1, 1, 1])), ['prop appears']);
  assert.deepEqual(kinds(shown([1, 1, 1, 1, 0, 0, 0, 0, 0])), ['prop vanishes']);
  assert.deepEqual(kinds(shown([1, 1, 1, 1, 0, 1, 1, 1, 1])), [], 'gone for one frame');
  assert.deepEqual(kinds(shown([0, 0, 0, 0, 1, 1, 0, 0, 0])), [], 'there for two frames');
  const then = (before, after) => Array.from({ length: 9 }, (_, i) => row(i, { props: { b: i < 4 ? before : after } }));
  const edge = then(bag([3, 0, 0.5], { on: 'off', box: [420, 300, 520, 400] }), bag([2.9, 0, 0.5], { box: [395, 300, 495, 400] }));
  const cover = then(bag([0, 0, 0.5], { on: 'occluded' }), bag([0, 0, 0.5]));
  const atCut = shown([0, 0, 0, 0, 1, 1, 1, 1, 1]); atCut[4].edit = true;
  for (const rs of [edge, cover, atCut]) assert.deepEqual(kinds(rs), []);
});

test('a bag that jumps to a new place, or to a new size, and stays blocks; out and back in one frame, carried at a walk or speeding up it does not', () => {
  const walk = (at = i => 0.05 * i, size = () => 0.6) => Array.from({ length: 14 }, (_, i) => row(i, { props: { b: bag([at(i), 0, 0.6], { held: true, size: size(i) }) } }));
  assert.deepEqual(kinds(walk()), []);
  assert.deepEqual(kinds(walk(i => 0.01 * i * i)), [], 'an even speed-up is no jump');
  assert.deepEqual(kinds(walk(i => 0.05 * i + (i >= 5 ? 0.8 : 0))), ['prop jumps']);
  assert.deepEqual(kinds(walk(i => 0.05 * i + (i === 5 ? 0.8 : 0))), [], 'one frame out and back');
  assert.deepEqual(kinds(walk(undefined, i => (i >= 7 ? 1.4 : 0.6))), ['prop resizes']);
  assert.deepEqual(kinds(walk(undefined, i => (i === 7 ? 1.4 : 0.6))), [], 'one frame bigger');
  const turning = walk(i => 0.05 * i + (i >= 5 ? 0.8 : 0)); turning.forEach((r, i) => { r.track.b.dims = [0.6, i >= 5 ? 0.3 : 0.05, 0.4]; });
  assert.deepEqual(kinds(turning), [], 'a page turning moves the box centre, not the board');
});

test('a jump too small to see on a phone is watched, not blocked', () => {
  const far = Array.from({ length: 10 }, (_, i) => row(i, { props: { b: bag([0, 40, 0.6], { box: [200, 300, 204, 304] }) } }));
  far[5].track.b = bag([0.05, 40, 0.6], { box: [200, 300, 204, 304] });
  const f = shotFaults(far, { W, H }).filter(x => x.kind === 'prop jumps');
  assert.equal(f.length, 1); assert.ok(f[0].px < 2 && !blocks(f[0]), `5 cm at 40 m is ${f[0].px.toFixed(2)} px`);
});

test('a moving prop may change place behind a cut; one left at rest and gone when the next shot looks at its spot breaks continuity', () => {
  const shot = (n, o) => Array.from({ length: n }, (_, i) => row(i, o(i)));
  const swap = [...shot(3, () => ({ props: { 'you:Bhugbag': bag([0, 0, 0.8], { held: true, size: 0.4 }) } })), ...shot(5, () => ({ props: { 'you:Rbag': bag([0.3, 0, 0.8], { held: true, size: 1.2 }) } }))];
  swap[3].edit = true;
  assert.deepEqual(kinds(swap), ['prop changes at cut']);
  const rest = [...shot(3, () => ({ props: { b: bag([0, 0, 0.7], { size: 0.8 }) } })), ...shot(5, () => ({}))]; rest[3].edit = true;
  assert.deepEqual(kinds(rest), ['prop gone after cut']);
  const moving = [...shot(3, i => ({ props: { b: bag([0.3 * i, 0, 0.7]) } })), ...shot(5, () => ({}))]; moving[3].edit = true;
  assert.deepEqual(kinds(moving), [], 'a train running through the frame may be moved at the cut');
  for (const r of rest.slice(3)) r.camera = { pos: [0, 5, 1.5], target: [0, 10, 1], fov: 60, lens: 24 };
  assert.deepEqual(kinds(rest), [], 'the next shot looks away from the spot');
});

test('across a cut in one scene a held bag that lands far from where its carry takes it, or drops while the next shot looks at its place, blocks; one carried on blocks nothing', () => {
  const carry = (at, o = () => ({})) => Array.from({ length: 10 }, (_, i) => row(i, { props: { 'you:Rbag': bag(at(i), { held: true, ...o(i) }) } }));
  const close = r => { r.camera = { pos: [0, -2.5, 1.2], target: [0, 0, 0.8], fov: 50, lens: 35 }; };
  const on = carry(i => [0.05 * i, 0, 0.8]); on.slice(5).forEach(close); on[5].edit = true;
  assert.deepEqual(kinds(on), []);
  const jump = carry(i => [0.05 * i + (i >= 5 ? 0.6 : 0), 0, 0.8]); jump.slice(5).forEach(close); jump[5].edit = true;
  assert.deepEqual(kinds(jump), ['prop jumps at cut']);
  const gone = carry(i => [0.05 * i, 0, 0.8], i => (i >= 5 ? { shown: false } : {})); gone.slice(5).forEach(close); gone[5].edit = true;
  assert.deepEqual(kinds(gone), ['prop vanishes at cut']);
  const newScene = carry(i => [0.05 * i + (i >= 5 ? 0.6 : 0), 0, 0.8]); newScene.slice(5).forEach(r => { close(r); r.set = 's2'; }); newScene[5].edit = true;
  assert.deepEqual(kinds(newScene), [], 'a new set may put the bag anywhere');
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
  const enter = (head = [180, 200, 220, 240]) => Array.from({ length: 8 }, (_, i) => row(i, { you: i < 4 ? out : { head } }));
  assert.deepEqual(kinds(enter()), ['figure appears']);
  assert.deepEqual(kinds(enter([0, 200, 30, 240])), [], 'in through the frame edge');
  const limbs = z => ({ torsoLean: 0, torsoRoll: 0, skel: { pelvis: [0, 0, z], neck: [0, 0, z + 0.5], head: [0, 0, 1.7] },
    ...Object.fromEntries(['L', 'R'].map((s, k) => [s, { kneeFlex: 0, elbowFlex: 0, footPitch: 0, hip: [k - 0.5, 0, z], knee: [k - 0.5, 0, 0.5], ankle: [k - 0.5, 0, 0.02], toe: [k - 0.5, -0.1, 0.02], shoulder: [k - 0.5, 0, z + 0.5], elbow: [k - 0.5, 0, z + 0.2], hand: [k - 0.5, 0, z] }])) });
  const sink = d => Array.from({ length: 10 }, (_, i) => row(i, { you: { limbs: limbs(i >= 3 && i < 7 ? 0.9 - d : 0.9) },
    extra: i === 3 ? { cross: [{ what: 'you.pelvis', through: 'seat', d, at: [0, 0, 0.9] }] } : {} }));
  assert.deepEqual(kinds(sink(0.3)), ['body passes through'], '30 cm into the seat for 4 frames');
  assert.deepEqual(kinds(sink(0.005)), [], 'half a centimetre is resting on it');
});

test('faults group by second; a second blocks only when a fault the camera sees stays and is large enough', () => {
  const x = o => ({ kind: 'prop jumps', vis: 'in', px: 90, frames: 3, seen: 1, ...o });
  const s = bySecond([x({ F: 31, vis: 'occluded' }), x({ F: 45 }), x({ F: 61, px: 30 }), x({ F: 95, frames: 2 }), x({ F: 125, kind: 'body passes through', px: 8 })]);
  assert.deepEqual(s.map(x => [x.s, x.block]), [[1, true], [2, false], [3, false], [4, true]]);
});

// Mutation test: faults put into the clean rows of an approved film (rows kept in test/fixtures/shotgate, from
// shot.mjs --dbg at 404x720) where the thing is in the frame.
const clean = () => zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/shotgate/clean-film.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
const base = clean(), cut = cuts(base), baseBlocks = blocking(base), baseKeys = new Set(baseBlocks.map(x => `${x.F} ${x.kind}`));
const mid = (i, before = 3, after = 6) => i >= before && i + after < base.length && !cut.slice(i - before + 1, i + after + 1).some(Boolean);
const quiet = i => !baseBlocks.some(x => Math.abs(x.F - i) < 8);
const spread = (list, n) => Array.from({ length: Math.min(n, list.length) }, (_, k) => list[Math.floor((k + 0.5) * list.length / Math.min(n, list.length))]);
const right = cam => { const f = cam.target.map((x, k) => x - cam.pos[k]), r = [f[1], -f[0], 0], l = Math.hypot(...r); return r.map(x => x / l); };
const shift = (P, v) => P.map((x, k) => x + v[k]);
const BIG = 1.5 * CHANGE_PX;
const screenStep = (cam, P, Q) => { const a = project(cam, P, W, H), b = project(cam, Q, W, H); return a && b ? Math.hypot((b[0] - a[0]) * W / H, b[1] - a[1]) * REF_H / 2 : 0; };
const bigStep = (cam, P) => right(cam).map(x => x * BIG / screenStep(cam, P, shift(P, right(cam))));
const toShotEnd = (rs, i, f) => { for (let j = i; j < rs.length && (j === i || !cut[j]); j++) f(rs[j], j); };
const boxSide = t => (t?.box ? Math.max(t.box[2] - t.box[0], t.box[3] - t.box[1]) * REF_H / H : 0);
const centred = t => t?.box && (t.box[0] + t.box[2]) / 2 > 0 && (t.box[0] + t.box[2]) / 2 < W && (t.box[1] + t.box[3]) / 2 > 0 && (t.box[1] + t.box[3]) / 2 < H;
const propSites = side => [...new Set(base.flatMap(r => Object.keys(r.track)))].flatMap(id => base.map((r, i) => [id, i])
  .filter(([, i]) => mid(i) && quiet(i) && [i - 1, i, i + 1].every(j => base[j].track[id]?.on === 'in' && !base[j].track[id].held && centred(base[j].track[id]) && boxSide(base[j].track[id]) >= side)));
const onScreen = (r, P) => { const q = project(r.camera, P, W, H); return q && Math.abs(q[0]) < 0.9 && Math.abs(q[1]) < 0.9; };
const sitesWhere = see => Object.keys(base[0].actors).flatMap(n => base.map((r, i) => [n, i]).filter(([, i]) => mid(i, 3, 8) && quiet(i)
  && base.slice(i - 2, i + 6).every(r => r.actors[n].inFrame && r.actors[n].figH >= 0.3 && see(r, r.actors[n].limbs))));
const turn = (P, O, axis, deg) => { const v = P.map((x, k) => x - O[k]), c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180), d = v.reduce((t, x, k) => t + x * axis[k], 0);
  const x = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]]; return O.map((o, k) => o + v[k] * c + x[k] * s + axis[k] * d * (1 - c)); };
const ahead = cam => { const f = cam.target.map((x, k) => x - cam.pos[k]), l = Math.hypot(...f); return f.map(x => x / l); };
const swing = (r, l) => { l.elbow = turn(l.elbow, l.shoulder, ahead(r.camera), 90); l.hand = turn(l.hand, l.shoulder, ahead(r.camera), 90); };
const bodySites = sitesWhere((r, l) => onScreen(r, l.skel.pelvis)), armSites = sitesWhere((r, l) => onScreen(r, l.R.elbow) && onScreen(r, l.R.hand));
const swingSites = armSites.filter(([n, i]) => { const r = base[i], l = r.actors[n].limbs.R; return screenStep(r.camera, l.hand, turn(l.hand, l.shoulder, ahead(r.camera), 90)) >= BIG; });
const footSites = Object.keys(base[0].actors).flatMap(n => ['L', 'R'].flatMap(s => base.map((r, i) => [n, i, s]).filter(([, i]) => mid(i, 3, 8) && quiet(i)
  && base.slice(i - 1, i + 6).every(r => r.actors[n].inFrame && r.actors[n].figH >= 0.3 && r.actors[n].limbs[s].ankle[2] < PLANTED_Z && onScreen(r, r.actors[n].limbs[s].ankle)))));
const moveActor = (a, v) => { a.headW = shift(a.headW, v); a.pos = shift(a.pos, v);
  for (const s of ['L', 'R']) { for (const k of ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'hand', 'target']) if (a.limbs[s][k]) a.limbs[s][k] = shift(a.limbs[s][k], v); a.feet[s] = shift(a.feet[s], v); }
  for (const k of ['pelvis', 'neck', 'head']) a.limbs.skel[k] = shift(a.limbs.skel[k], v); };
const STAYS = {
  'prop jumps to a new place and stays': { kind: 'prop jumps', sites: propSites(20), apply: (rs, [id, i]) => { const v = bigStep(rs[i].camera, rs[i].track[id].c);
    toShotEnd(rs, i, r => { if (r.track[id]?.shown) r.track[id].c = shift(r.track[id].c, v); }); } },
  'prop grows and stays': { kind: 'prop resizes', sites: propSites(20), apply: (rs, [id, i]) => { const dm = Math.hypot(...bigStep(rs[i].camera, rs[i].track[id].c));
    toShotEnd(rs, i, r => { if (r.track[id]?.shown) r.track[id].size += dm; }); } },
  'prop vanishes and stays gone': { kind: 'prop vanishes', sites: propSites(BIG), apply: (rs, [id, i]) => { toShotEnd(rs, i, r => { r.track[id] = { shown: false }; }); } },
  'arm snaps 90 deg to a new pose and stays': { kind: 'joint pops', sites: swingSites, apply: (rs, [n, i]) => { toShotEnd(rs, i, r => swing(r, r.actors[n].limbs.R)); } },
  'body 8 cm through a surface for 4 frames': { kind: 'body passes through', sites: bodySites, apply: (rs, [n, i]) => {
    const at = rs[i - 1].actors[n].limbs.skel.pelvis; for (let j = i; j < i + 4; j++) moveActor(rs[j].actors[n], [0, 0, -0.08]);
    const P = rs[i].actors[n].limbs, p = P.L.hip.map((x, k) => (x + P.R.hip[k]) / 2);
    rs[i].cross = [...rs[i].cross, { what: `${n}.pelvis`, through: 'mutation', d: Math.hypot(...p.map((x, k) => x - at[k])), at }]; } },
  'planted foot slides 3 cm a frame for 6 frames': { kind: 'foot slides', sites: footSites, apply: (rs, [n, i, s]) => {
    const v = right(rs[i].camera); for (let j = i; j < i + 6; j++) { const l = rs[j].actors[n].limbs[s], d = v.map(x => x * 0.03 * (j - i + 1));
      l.ankle = shift(l.ankle, d); l.toe = shift(l.toe, d); rs[j].actors[n].feet[s] = shift(rs[j].actors[n].feet[s], d); } } },
};
const SPIKES = {
  'prop jumps for one frame and back': { sites: propSites(20), apply: (rs, [id, i]) => { rs[i].track[id].c = shift(rs[i].track[id].c, bigStep(rs[i].camera, rs[i].track[id].c)); } },
  'prop vanishes for one frame': { sites: propSites(BIG), apply: (rs, [id, i]) => { rs[i].track[id] = { shown: false }; } },
  'elbow pops 60 deg for one frame': { sites: armSites, apply: (rs, [n, i]) => {
    const l = rs[i].actors[n].limbs.R; l.hand = turn(l.hand, l.elbow, ahead(rs[i].camera), 60); l.elbowFlex += l.elbowFlex > 90 ? -60 : 60; } },
};
const mutate = (M, newBlock) => { let hit = 0, total = 0; const list = [];
  for (const [name, m] of Object.entries(M)) for (const site of spread(m.sites, 5)) {
    const rs = clean(); m.apply(rs, site); total++;
    const i = site[1], b = blocking(rs).some(x => newBlock(x, m) && x.F >= i - 1 && x.F <= i + 6 && !baseKeys.has(`${x.F} ${x.kind}`));
    if (b) hit++; list.push(`${b ? 'blocks' : 'passes'}: ${name} @ ${site.join(' ')}`);
  }
  return { hit, total, list }; };

test("Kai's marks at playback speed (17/11): of 12 strips he saw only the saw of the approved film in the rail at 0:00; the gate blocks that second and nothing else in either film", () => {
  const rows = name => zlib.gunzipSync(fs.readFileSync(new URL(`../fixtures/shotgate/${name}.jsonl.gz`, import.meta.url))).toString().trim().split('\n').map(l => JSON.parse(l));
  const blockedSeconds = (rs, w, h) => bySecond(shotFaults(rs, { W: w, H: h })).filter(s => s.block).map(s => s.s);
  assert.deepEqual(blockedSeconds(base, W, H), [0], 'approved film: the saw 11 px into the rail for 3 frames; not the calendar page at 0:09 or the train at 0:19');
  assert.deepEqual(blockedSeconds(rows('hm-bible-s5'), 540, 960), [], 'bible: one-frame pops, a phone 47 px into a hand, a knee snap of 63 px, a pelvis through a light cone');
});

test('the gate blocks at least 90% of the faults that stay put into the clean rows of a film Kai approved', t => {
  const { hit, total, list } = mutate(STAYS, (x, m) => x.kind === m.kind);
  t.diagnostic(`blocked ${hit}/${total}; ${list.filter(x => x.startsWith('passes')).join('; ')}`);
  assert.ok(total >= 25, `${total} faults put in`);
  assert.ok(hit / total >= 0.9, `blocked ${hit}/${total}: ${list.join('; ')}`);
});

test('a one-frame spike put into the same rows is watched, not blocked, at least 90% of the time', t => {
  const { hit, total, list } = mutate(SPIKES, () => true);
  t.diagnostic(`blocked ${hit}/${total}; ${list.filter(x => x.startsWith('blocks')).join('; ')}`);
  assert.ok(total >= 12, `${total} spikes put in`);
  assert.ok(hit / total <= 0.1, `blocked ${hit}/${total}: ${list.join('; ')}`);
});

test('a train that only runs faster from one frame on adds no blocking fault', () => {
  const rs = clean(), i0 = base.findIndex((r, i) => i > 90 && mid(i, 3, 20) && r.track.loco?.on === 'in');
  const v = base[i0].track.loco.c.map((x, k) => x - base[i0 - 1].track.loco.c[k]);
  for (let j = i0; j < rs.length && (j === i0 || !cut[j]); j++) rs[j].track.loco.c = shift(rs[j].track.loco.c, v.map(x => x * 0.25 * (j - i0 + 1)));
  assert.ok(project(base[i0].camera, base[i0].track.loco.c, W, H), 'the train is in front of the camera');
  assert.deepEqual(blocking(rs).filter(x => !baseKeys.has(`${x.F} ${x.kind}`)), []);
});
