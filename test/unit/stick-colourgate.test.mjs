import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { run, env } from '../../kit/env.mjs';
import { gate, parseScript, W, H } from '../../styles/stick-man/tools/gates/colourgate.mjs';

// A synthetic shot at 144x256: two colour halves laid out in 8 px stripes (vertical or horizontal, so a change of
// layout reads as a hard cut), a dark band (the black level) and a white box (the hero), all inside the uncropped rows.
const GOOD = { a: [160, 110, 80], b: [80, 110, 160], dark: 18, hero: 210, gain: 1, stripes: 'v' };
function frame(o) {
  const p = { ...GOOD, ...o }, buf = Buffer.alloc(W * H * 3), g = v => Math.min(255, Math.round(v * p.gain));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, k = p.stripes === 'v' ? x : y;
    let c = (k >> 3) % 2 ? p.a : p.b;
    if (y >= 40 && y < 52) c = [p.dark, p.dark, p.dark];
    else if (p.hero && y >= 100 && y < 140 && x >= 40 && x < 104) c = [p.hero, p.hero, p.hero].map(v => v / p.gain);
    buf[i] = g(c[0]); buf[i + 1] = g(c[1]); buf[i + 2] = g(c[2]);
  }
  return buf;
}

// CI's Linux runner has no ffmpeg in the folder; the clip tests need it to write and read the synthetic shots.
const skip = !env().tools?.ffmpeg && 'needs ffmpeg';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'colourgate-'));
let n = 0;
// shots: [{ s: seconds, at: t => frame options }]
function clip(shots) {
  const raw = path.join(dir, `c${n}.rgb`), mp4 = path.join(dir, `c${n++}.mp4`);
  fs.writeFileSync(raw, Buffer.concat(shots.flatMap(({ s, at = () => ({}) }) => Array.from({ length: s * 10 }, (_, i) => frame(at(i / 10))))));
  const r = run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', '10', '-i', raw,
    '-c:v', 'libx264', '-crf', '10', '-pix_fmt', 'yuv420p', mp4], { capture: true });
  assert.equal(r.status, 0, r.stderr);
  return mp4;
}
const script = (to, scene = {}, extra = {}) => ({ palette: { signature: 'warm', offColor: 'cool' }, approved: { by: 'kai', at: '2026-11-21' },
  scenes: [{ id: 'A', from: 0, to, intent: 'test scene', ...scene }], ...extra });
const failing = res => [...new Set(res.findings.filter(f => !f.waived).map(f => f.check))].sort();

test('a shot inside every default range passes, and only a Kai-approved script turns no finding into PASS', { skip }, () => {
  const mp4 = clip([{ s: 3 }]);
  assert.equal(gate(mp4, script(3)).verdict, 'PASS');
  const { approved, ...draft } = script(3);
  assert.equal(gate(mp4, draft).verdict, 'DRAFT');
  assert.equal(gate(mp4, { ...draft, approved: { by: 'agent', at: '2026-11-21' } }).verdict, 'DRAFT');
});

test('an approved look the script declares passes; the same look undeclared fails flood and palette', { skip }, () => {
  const magenta = { a: [200, 70, 170], b: [180, 60, 160] };
  const mp4 = clip([{ s: 4, at: () => magenta }]);
  assert.deepEqual(failing(gate(mp4, script(4, { hues: ['pink'], flood: ['pink'] }))), []);
  assert.deepEqual(failing(gate(mp4, script(4))), ['G7', 'G8']);
});

test('G1: a luma jump at a cut inside one scene fails; across a scene change the wider limit holds', { skip }, () => {
  const mp4 = clip([{ s: 2 }, { s: 2, at: () => ({ gain: 1.45, stripes: 'h' }) }]);
  const res = gate(mp4, script(4));
  assert.deepEqual(failing(res), ['G1']);
  assert.ok(Math.abs(res.findings[0].t - 2) < 0.2, 'the finding sits on the cut');
  const two = { ...script(4), scenes: [{ id: 'A', from: 0, to: 2, intent: 'room' }, { id: 'B', from: 2, to: 4, intent: 'lit room' }] };
  assert.deepEqual(failing(gate(mp4, two)), []);
  const lit = script(4, { events: [{ from: 1.8, to: 2.2, why: 'lights on' }] });
  assert.deepEqual(failing(gate(mp4, lit)), [], 'a cut inside a declared light event is exempt');
});

test('G2: a light that dims inside a shot fails, unless the script tags it as a light event', { skip }, () => {
  const mp4 = clip([{ s: 3, at: t => ({ gain: t < 1.5 ? 1.3 : t < 1.7 ? 1.1 : 0.85 }) }]);
  assert.deepEqual(failing(gate(mp4, script(3))), ['G2']);
  assert.deepEqual(failing(gate(mp4, script(3, { events: [{ from: 1.3, to: 1.9, why: 'muzzle flash' }] }))), []);
});

test('G3: a cast outside the scene R/B range fails', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ a: [170, 110, 70], b: [150, 100, 60] }) }]);
  assert.deepEqual(failing(gate(mp4, script(2))), ['G3']);
  assert.deepEqual(failing(gate(mp4, script(2, { rb: [1.2, 3] }))), []);
});

test('G4: a washed-out shot fails the saturation floor', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ a: [130, 120, 112], b: [112, 120, 130] }) }]);
  assert.deepEqual(failing(gate(mp4, script(2))), ['G4']);
});

test('G5: a dimmed hero white fails; a scene without the hero skips it', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ hero: 165 }) }]);
  assert.deepEqual(failing(gate(mp4, script(2))), ['G5']);
  assert.deepEqual(failing(gate(mp4, script(2, { hero: false }))), []);
});

test('G6: hazy blacks fail the black level', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ dark: 40 }) }]);
  assert.deepEqual(failing(gate(mp4, script(2))), ['G6']);
});

test('G7: one hue family flooding the frame longer than 3 s fails', { skip }, () => {
  const mp4 = clip([{ s: 4, at: () => ({ a: [200, 70, 170], b: [180, 60, 160] }) }]);
  assert.deepEqual(failing(gate(mp4, script(4, { hues: ['pink'] }))), ['G7']);
});

test('G8: colour outside the palette and the scene hues fails', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ a: [80, 160, 90], b: [70, 150, 80] }) }]);
  assert.deepEqual(failing(gate(mp4, script(2))), ['G8']);
  assert.deepEqual(failing(gate(mp4, script(2, { hues: ['green'] }))), []);
});

test('G9: no film-wide floor; a scene outside its own luma range fails, and an approved Kai waiver clears it', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ gain: 0.45, dark: 30, hero: 0 }) }]);
  assert.deepEqual(failing(gate(mp4, script(2, { hero: false }))), [], 'a dark night film passes when its script sets no range');
  assert.deepEqual(failing(gate(mp4, script(2, { hero: false, luma: [20, 140] }))), [], 'inside the scene range');
  const s = script(2, { hero: false, luma: [90, 140] });
  const res = gate(mp4, s);
  assert.deepEqual(failing(res), ['G9']);
  assert.match(res.findings[0].limit, /A 90-140/);
  const waived = gate(mp4, s, { decisions: [{ waives: 'colourgate.G9', by: 'kai', at: '2026-11-21', status: 'approved', decision: 'night film' }] });
  assert.equal(waived.verdict, 'PASS');
  const notKai = gate(mp4, s, { decisions: [{ waives: 'colourgate.G9', by: 'agent', at: '2026-11-21', status: 'approved' }] });
  assert.equal(notKai.verdict, 'FAIL');
});

test('G9: a film-wide brightness floor runs only when the script sets defaults.film', { skip }, () => {
  const mp4 = clip([{ s: 2, at: () => ({ gain: 0.45, dark: 30, hero: 0 }) }]);
  const res = gate(mp4, script(2, { hero: false }, { defaults: { film: { luma: 100, dark: 70, darkShare: 0.15 } } }));
  assert.deepEqual(failing(res), ['G9']);
  assert.ok(res.findings.some(f => /defaults\.film/.test(f.limit)));
});

test('a scene luma range must be [min, max]', () => {
  assert.throws(() => parseScript({ scenes: [{ id: 'A', from: 0, to: 3, intent: 'x', luma: [140, 90] }] }, 3), /luma/);
});

test('the script must cover the film back to back, name real hue families and say why a light event is there', () => {
  assert.throws(() => parseScript({ scenes: [{ id: 'A', from: 0, to: 1, intent: 'x' }, { id: 'B', from: 2, to: 3, intent: 'y' }] }, 3), /back to back/);
  assert.throws(() => parseScript({ scenes: [{ id: 'A', from: 0, to: 3, intent: 'x', hues: ['magenta'] }] }, 3), /not a hue family/);
  assert.throws(() => parseScript({ scenes: [{ id: 'A', from: 0, to: 3, intent: 'x', events: [{ from: 1, to: 2 }] }] }, 3), /says why/);
  assert.throws(() => parseScript({ scenes: [{ id: 'A', from: 0, to: 2, intent: 'x' }] }, 3), /render is 3/);
});

test('the colour-script template a film copies is a valid script', () => {
  const tpl = JSON.parse(fs.readFileSync(new URL('../../.claude/skills/make-reel-stick-man/templates/colour-script.json', import.meta.url), 'utf8'));
  const s = parseScript(tpl, 12);
  assert.equal(s.scenes.length, 2);
  assert.equal(s.approved, null, 'the template is not approved until Kai signs it');
});
