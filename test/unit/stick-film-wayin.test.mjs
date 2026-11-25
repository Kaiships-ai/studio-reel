// The one way in (styles/stick-man/kit/film.js): person() and place() give a film only the pairs the fits table (kit/cast/compat.js)
// calls usable. The reader is the real one; only its data (kit/compat.json) is swapped, for rows that cannot drift under the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const row = (pair, verdict, number = null, unit = null, why) => ({ pair, kind: pair.split('|')[0], verdict, number, unit, why, commit: 'test' });
const GRAN = 'adult/g1/cardigan+shirt:office', NAN = 'elder/g1/plain', COP = 'adult/g1.2/cap:police+shirt:police', DAD = 'adult/g1/shirt:work';
const rows = [
  row('face|elder|elder', 'pass', 0, 'mm'), row('face|elder|adult', 'pass', 0, 'mm'), row('face|adult|adult', 'pass', 0, 'mm'), row('face|child|child', 'pass', 0, 'mm'), row('face|teen|adult', 'blocked', null, null, 'waits for Kai'),
  row('outfit|cardigan|adult', 'pass', 1, 'mm'), row('outfit|shirt:office|adult', 'pass', 1, 'mm'), row('outfit|shirt:police|adult', 'pass', 1, 'mm'), row('outfit|cap:police|adult', 'pass', 1, 'mm'),
  row('outfit|shirt:work|adult', 'pass', 1, 'mm'), row('outfit|coat:lab|adult', 'blocked', 6.1, 'mm', 'the arm runs through it'),
  row(`clip|${GRAN}|Idle_Stand_Loop`, 'pass', 1, 'mm'), row(`clip|${GRAN}|Move_Walk_Fwd_Loop`, 'accepted', 7.3, 'cm/f/f'), row(`clip|${GRAN}|Gest_Clap_Loop`, 'blocked', 2.5, 'mm', 'the sleeve'), row(`clip|${GRAN}|Gest_SitTalk_Loop`, 'pass', 1, 'mm'),
  row(`clip|${NAN}|Move_Walk_Fwd_Loop`, 'accepted', 6.9, 'cm/f/f'), row(`clip|${COP}|Idle_Stand_Loop`, 'pass', 1, 'mm'), row(`clip|${DAD}|Idle_Stand_Loop`, 'pass', 1, 'mm'), row(`clip|${DAD}|Gest_PhoneTalk_Loop`, 'pass', 1, 'mm'), row(`clip|${DAD}|Gest_SitTalk_Loop`, 'pass', 1, 'mm'),
  row('mark|bold:star|cap:police', 'pass', 0, 'share'), row('mark|bold:gloom|cap:police', 'blocked', 0.4, 'share', 'under the cap'),
  row('hand|cup|adult|hand', 'pass', 0, 'mm'), row('hand|cup|adult|seat', 'blocked', 30, 'mm', 'in the lap'), row('hand|phone|adult|hand', 'pass', 0, 'mm'), row('hand|hammer|adult|hand', 'blocked', 12, 'mm', 'in the head'),
  row('light|street/bench|night', 'pass', 0.4, 'albedo'), row('light|street/cart|night', 'blocked', 0.95, 'albedo', 'blown'),
];
register('data:text/javascript,' + encodeURIComponent(`
const U = 'data:application/json,' + encodeURIComponent(${JSON.stringify(JSON.stringify({ version: 1, limits: 'x', rows }))});
export async function resolve(s, c, next) { return /compat\\.json$/.test(s) ? { url: U, shortCircuit: true, format: 'json', importAttributes: { type: 'json' } } : next(s, c); }`));
const ctx = new Proxy({}, { get: (_, k) => k === 'measureText' ? () => ({ width: 10 }) : /Gradient$/.test(k) ? () => ({ addColorStop() {} }) : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}, set: () => true });
globalThis.document ??= { createElement: () => ({ width: 1, height: 1, getContext: () => ctx }) };

// a node test has no server and no pictures: the file's bytes, its textures left out (as in stick-props-kit.test.mjs)
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
GLTFLoader.prototype.loadAsync = function (url) {
  const b = fs.readFileSync(ROOT + url), n = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + n)); delete j.textures; delete j.images;
  for (const m of j.materials || []) { for (const o of [m, m.pbrMetallicRoughness || {}]) for (const k of Object.keys(o)) if (/Texture$/.test(k)) delete o[k]; }
  let t = JSON.stringify(j); t += ' '.repeat((4 - Buffer.byteLength(t) % 4) % 4); const h = Buffer.from(b.subarray(0, 20)), out = Buffer.concat([h, Buffer.from(t), b.subarray(20 + n)]);
  out.writeUInt32LE(Buffer.byteLength(t), 12); out.writeUInt32LE(out.length, 8); return new Promise((ok, no) => this.parse(new Uint8Array(out).buffer, '', ok, no));
};

const F = await import('../../styles/stick-man/kit/film.js');
const { SPECS, HOOKS } = await import('../../styles/stick-man/engine/play.js');
const { makeStick } = await import('../../styles/stick-man/engine/cast.js');
const { getClip, expandClips, CLIPS } = await import('../../styles/stick-man/motion-lib/index.js');

const gran = (o = {}) => ({ name: 'gran', age: 'elder', outfit: ['shirt:office:sky', 'cardigan:plum'], shirt: [0.5, 0.6, 0.8], clips: ['Idle_Stand_Loop', 'Move_Walk_Fwd_Loop'], ...o });
const cop = (o = {}) => ({ name: 'cop', girth: 1.2, outfit: ['shirt:police', 'cap:police'], clips: ['Idle_Stand_Loop'], ...o });
const dad = (o = {}) => ({ name: 'dad', outfit: ['shirt:work'], clips: ['Idle_Stand_Loop'], ...o });
const W = (pair, o = {}) => ({ pair, why: 'one shot, from behind', by: 'Kai', ...o });

test('a person whose pairs all fit is registered, on its body, and dressed by the wardrobe', () => {
  const p = F.person(gran());
  assert.equal(SPECS.gran, p.spec); assert.equal(p.spec.motionBody, 'adult'); assert.equal(p.spec.faceAge, 'elder'); assert.deepEqual(p.spec.costume, ['shirt:office:sky', 'cardigan:plum']);
  const c = p.cast({ at: [1, 2, 0], yaw: 90 }); assert.equal(c.spec, 'gran'); assert.deepEqual(c.at, [1, 2, 0]); assert.deepEqual(c.clips, ['Idle_Stand_Loop', 'Move_Walk_Fwd_Loop']); assert.ok(!('costume' in c));
  const n = F.person({ name: 'nan', body: 'elder', age: 'elder', clips: ['Move_Walk_Fwd_Loop'] }); assert.equal(n.spec.motionBody, 'elder'); assert.equal(n.spec.scale, 0.96); assert.equal(n.clip('Move_Walk_Fwd_Loop', { f: 0 }).body, 'elder');
  const S = makeStick(p.spec); HOOKS.costume(S, p.spec.costume, { group: new THREE.Group() }); assert.deepEqual(S.wardrobe.items, ['shirt:office:sky', 'cardigan:plum']);
});
test("a girth is the person's own (heavy would put its 1.9 back) and part of the key the table is asked for", () => {
  assert.equal(F.person(cop()).spec.girth, 1.2); assert.equal(F.person(gran({ name: 'g1' })).spec.girth, undefined);
  assert.throws(() => F.person(cop({ name: 'cop2', girth: 1.3 })), /clip\|adult\/g1\.3\/cap:police\+shirt:police\|Idle_Stand_Loop: untested/);
  assert.ok(F.person({ name: 'big', body: 'heavy', girth: 1.5, clips: [], waivers: [W('face|adult|heavy')] }).spec.girth === 1.5);
});
test('a blocked or untested pair throws with the pair, its verdict and its number, all of them at once, and leaves no figure behind', () => {
  assert.throws(() => F.person(gran({ name: 'a1', clips: ['Gest_Clap_Loop', 'React_Terrified_Once'] })), e => {
    assert.match(e.message, /person a1/); assert.match(e.message, /clip\|adult\/g1\/cardigan\+shirt:office\|Gest_Clap_Loop: blocked, 2\.5 mm/); assert.match(e.message, /\|React_Terrified_Once: untested/); return true; });
  assert.equal(SPECS.a1, undefined);
  assert.throws(() => F.person(dad({ name: 'a2', age: 'teen' })), /face\|teen\|adult: blocked.*waits for Kai/);
  assert.throws(() => F.person(dad({ name: 'a3', outfit: ['shirt:work', 'coat:lab:navy'], clips: [] })), /outfit\|coat:lab\|adult: blocked, 6\.1 mm/);
  assert.throws(() => F.person(dad({ name: 'a4', outfit: ['job:nurse'], clips: [] })), /outfit\|scrubs\|adult: untested/);
  assert.throws(() => F.person(dad({ name: 'a5', prop: 'hammer' })), /hand\|hammer\|adult\|hand: blocked, 12 mm/);
  assert.throws(() => F.person(cop({ name: 'a6', face: 'sad' })), /mark\|bold:gloom\|cap:police: blocked, 0\.4 share/);
  for (const n of ['a2', 'a3', 'a4', 'a5', 'a6']) assert.equal(SPECS[n], undefined, n);
});
test('a hand prop is asked about the seat too when a clip sits, and the mark only when a hat is worn', () => {
  assert.ok(F.person(dad({ name: 'b1', prop: 'cup' }))); assert.throws(() => F.person(dad({ name: 'b2', prop: 'cup', clips: ['Gest_SitTalk_Loop'] })), /hand\|cup\|adult\|seat: blocked, 30 mm/);
  assert.ok(F.person(dad({ name: 'b3', face: ['sad', 'proud'] }))); assert.ok(F.person(cop({ name: 'b4', face: 'proud' }))); assert.throws(() => F.person(dad({ name: 'b5', prop: 'spoon' })), /no hand prop "spoon"/);
});
test("a clip the library does not have for this body keeps getClip's own error", () => {
  const own = (n, b) => { try { getClip(n, b); } catch (e) { return e.message; } };
  const gone = Object.keys(CLIPS).find(n => !CLIPS[n].child && !CLIPS[n]['*']);
  for (const clip of ['No_Such_Clip', ...(gone ? [gone] : [])]) { const m = own(clip, 'child'); assert.ok(m, `${clip} on child is missing`); assert.throws(() => F.person({ name: 'c_' + clip, body: 'child', age: 'child', clips: [clip] }), e => e.message === m); assert.equal(SPECS['c_' + clip], undefined); }
});
test('a waiver names exactly one pair, with why and by; it is kept where a gate reads it back', () => {
  const w = W(`clip|${GRAN}|Gest_Clap_Loop`), p = F.person(gran({ name: 'd1', clips: ['Gest_Clap_Loop'], waivers: [w] }));
  assert.deepEqual(p.cast().waivers, [w]); assert.deepEqual(p.spec.waivers, [w]); assert.ok(F.waivers().some(x => x.pair === w.pair && x.by === 'Kai' && x.where === 'person d1'));
  assert.throws(() => F.person(gran({ name: 'd2', clips: ['Gest_Clap_Loop'], waivers: [W(`clip|${GRAN}|Gest_Clap`)] })), /Gest_Clap_Loop: blocked/);
  for (const bad of [W(w.pair, { why: '' }), W(w.pair, { by: undefined }), { why: 'x', by: 'Kai' }, 'all']) assert.throws(() => F.person(gran({ name: 'd3', waivers: [bad] })), /waiver .*pair, why, by/);
  assert.throws(() => F.person(gran({ name: 'd4', waivers: w })), /list/);
});
test('clip() gives the anim key on this body and asks again: an unlisted clip, a swapped prop, another body', () => {
  const p = F.person(gran({ name: 'e1' })), k = p.clip('Move_Walk_Fwd_Loop', { f: 10, pos: [0, 0], to: [2, 0] });
  assert.deepEqual({ clip: k.clip, body: k.body, f: k.f }, { clip: 'Move_Walk_Fwd_Loop', body: 'adult', f: 10 }); assert.ok(expandClips([k]).length > 4);
  assert.throws(() => p.clip('Gest_Clap_Loop', { f: 0 }), /person e1: .*Gest_Clap_Loop: blocked, 2\.5 mm/); assert.ok(p.clip('Adult_Gest_SitTalk_Loop_v01', { f: 0 }));
  assert.throws(() => p.clip('Idle_Stand_Loop', { f: 0, body: 'thin' }), /body/); assert.throws(() => p.clip('Idle_Stand_Loop', { f: 0, clip: 'Gest_Clap_Loop' }), /clip/); assert.throws(() => p.clip('Idle_Stand_Loop', {}), /f /);
  const d = F.person(dad({ name: 'e2', clips: ['Gest_PhoneTalk_Loop'] })); assert.ok(d.clip('Gest_PhoneTalk_Loop', { f: 0 }));
  assert.ok(d.clip('Gest_PhoneTalk_Loop', { f: 0, swap: { phone: 'cup' } })); assert.throws(() => d.clip('Gest_PhoneTalk_Loop', { f: 0, swap: { phone: 'hammer' } }), /hand\|hammer\|adult\|hand: blocked/);
  assert.throws(() => d.clip('Idle_Stand_Loop', { f: 0, props: { R: 'hammer' } }), /hand\|hammer\|adult\|hand/); assert.throws(() => d.clip('Idle_Stand_Loop', { f: 0, x_hpR_hammer: 1 }), /hand\|hammer\|adult\|hand/);
  assert.throws(() => d.clip('Gest_SitTalk_Loop', { f: 0, props: { R: 'cup' } }), /hand\|cup\|adult\|seat: blocked/);
});
test('expression() gives the beats of a feeling and asks for its marks against the hat', () => {
  const c = F.person(cop({ name: 'f1' })), b = c.expression('proud', { f: 100 }); assert.ok(b.every(x => x.who === 'f1')); assert.ok(b.some(x => x.mark?.[0] === 'star'));
  assert.throws(() => c.expression('sad', { f: 100 }), /mark\|bold:gloom\|cap:police: blocked/); assert.ok(c.expression('sad', { f: 100 }, { mark: null })); assert.throws(() => c.expression('proud', { f: 1 }, { mark: 'gloom' }), /bold:gloom/);
  assert.ok(F.person(dad({ name: 'f2' })).expression('sad', { f: 100 }, { who: 'x' }).every(x => x.who === 'x'));
});
test('nothing past person() changes who the table was asked about', () => {
  const p = F.person(gran({ name: 'h1' })); for (const o of [{ costume: [] }, { spec: 'KAI' }, { clips: [] }, { waivers: [] }]) assert.throws(() => p.cast(o), /cast/);
  assert.throws(() => { p.spec.costume = []; }); assert.throws(() => { p.spec.costume.push('x'); }); assert.throws(() => F.person(gran({ name: 'h2', scale: 0.7 })), /scale/); assert.throws(() => F.person(gran({ name: 'h3', faceAge: 'teen' })), /faceAge/);
  assert.throws(() => F.person(gran({ name: 'KAI' })), /KAI/); assert.throws(() => F.person(gran({ name: '' })), /name/);
  assert.ok(F.person(gran({ name: 'h1' })), 'the same person again (a reel file loaded twice)'); assert.throws(() => F.person(gran({ name: 'h1', outfit: ['shirt:office'] })), /h1/);
});
test('a hoodie is not one of the wardrobe layers film.js loads: it throws, never a bare figure', () => { assert.throws(() => F.person(dad({ name: 'i1', outfit: ['hoodie:grey'], clips: [], waivers: [W('outfit|hoodie|adult')] })), /hoodie/); });
test('path() and frames() read a clip without handing it out', () => {
  const p = F.person(gran({ name: 'j1' })), at = p.path([p.clip('Move_Walk_Fwd_Loop', { f: 0, pos: [0, 0], to: [2, 0] })]); assert.ok(Math.abs(at.at(1e4)[0] - 2) < 0.05); assert.equal(p.frames('Idle_Stand_Loop'), getClip('Idle_Stand_Loop').frames);
});

const kit = () => ({ root: new THREE.Group(), mat: c => new THREE.MeshStandardMaterial({ color: c }) });
const stage = () => ({ scene: new THREE.Scene(), prop() {}, glow() {} });
test("place(): the place's own props, in the set's material and group, their boxes in COLLIDE", async () => {
  const name = 'street/bench', mat = new THREE.MeshStandardMaterial(); mat.userData.mine = true;
  const P = F.place('street', { light: 'night', props: [name, 'street/cart'], waivers: [W('light|street/cart|night')] }), S = stage(), K = kit(); S.scene.add(K.root);
  const set = await P.open(S, { kit: K, material: () => () => mat }); assert.equal(set.kit, K); assert.equal(set.COLLIDE, P.COLLIDE);
  const g = set.put(name, [2, 1, 0], 90); assert.equal(g.parent, K.root); let n = 0; g.traverse(m => { if (m.isMesh && m.material === mat) n++; }); assert.ok(n > 0);
  assert.ok(P.COLLIDE.length > 0); assert.deepEqual(P.waivers.map(w => w.pair), ['light|street/cart|night']); assert.deepEqual(P.COLLIDE.waivers, P.waivers); assert.ok(F.waivers().some(w => w.where === 'place street'));
  assert.throws(() => set.put('street/lamp', [0, 0, 0]), /props/); assert.throws(() => set.put(name, [0, 0, 0], 0, { material: () => mat }), /material/); assert.throws(() => set.put(name, [0, 0, 0], 0, { parent: K.root }), /parent/);
});
test('place() throws on an unknown place, an unknown prop, another place\'s prop, no light, and a blocked or untested pair', () => {
  assert.throws(() => F.place('moon', { light: 'night' }), /no place "moon".*street/); assert.throws(() => F.place('street', { light: 'night', props: ['street/benhc'] }), /no prop 'street\/benhc'; closest/);
  assert.throws(() => F.place('street', { light: 'night', props: ['hospital/iv-stand'] }), /not in street/); assert.throws(() => F.place('street', { props: ['street/bench'] }), /light/);
  assert.throws(() => F.place('street', { light: 'night', props: ['street/cart'] }), /place street: light\|street\/cart\|night: blocked, 0\.95 albedo/); assert.throws(() => F.place('street', { light: 'noon', props: ['street/bench'] }), /light\|street\/bench\|noon: untested/);
  assert.throws(() => F.place('street', { light: 'night', prop: [] }), /prop/);
});
test('two places share one set: one COLLIDE, one kit', async () => {
  const A = F.place('street', { light: 'night', props: [] }), B = F.place('misc', { light: 'night', props: [], collide: A.COLLIDE }); assert.equal(A.COLLIDE, B.COLLIDE);
});
test('film.js hands out no raw figure, clip, body or look', () => {
  for (const k of ['SPECS', 'HOOKS', 'makeStick', 'bodySpec', 'BODIES', 'placeClip', 'expandClips', 'getClip', 'CLIPS', 'ALL', 'createStage', 'setQuality', 'propKit', 'glbKit', 'BUILT', 'builtGroup', 'BUILD', 'makeHandProp', 'pieceGroup', 'boot', 'lookup', 'usable', 'table', 'wardrobe', 'expressionBeats', 'sunHat', 'guardCap', 'flatCap']) assert.ok(!(k in F), k);
  for (const k of ['person', 'place', 'waivers', 'flyCam', 'faceCam', 'createKit', 'room', 'SURF', 'tex', 'lightBar', 'hold', 'polishAt', 'STYLE_PRESETS', 'hairCap', 'bun', 'curls', 'solid', 'lathe', 'outfit']) assert.ok(k in F, k);
});
