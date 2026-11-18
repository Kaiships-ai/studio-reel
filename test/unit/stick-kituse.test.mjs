// Kit use at ◇4 and ◇5: a stick-man film that skips the moving hold, the far backdrop, the sound plan, a credited kit
// music track or the Rick bench of its final render fails with a reason; a complete film passes; an approved waiver on
// record lets an old film opt out.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../../kit/env.mjs';

const TOOL = path.join(ROOT, 'styles/stick-man/tools/kituse.mjs');
const put = (dir, rel, data, t) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 1)); if (t) fs.utimesSync(p, t, t); };
const ACT = { name: 'room', frames: [0, 99], style: { life: 0.75 }, backdrop: { rows: [{ piece: 'backdrop_skyline_a', at: [0, 0, -40] }], tint: 0.17 } };
const reel = acts => `export default ${JSON.stringify({ frames: [0, 99], acts })};\n`;
const LEVELS = '# levels for films/t (kit mixer styles/stick-man/tools/mix.py; ffmpeg ebur128)\n' +
  'voice: vo/vo.wav;  music: track audio/black_vortex.mp3, 9 segments (music.json);  ambience: none;  limiter ceiling -1.60 dBTP\n';

function film({ acts = [ACT], plan = true, levels = LEVELS, credits = 'Music: "Black Vortex" Kevin MacLeod (black_vortex.mp3), CC BY 4.0\n', bench = true, decisions } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kituse-'));
  put(d, 'reel.js', reel(acts));
  if (plan) put(d, 'audio/sound-plan.json', { scenes: [] });
  if (levels) put(d, 'audio/levels.txt', levels);
  if (credits) put(d, 'CREDITS', credits);
  put(d, 'renders/t_v1.mp4', '', 1000);
  if (bench) put(d, 'review/refbench.json', { id: 't_v1', source: 't_v1.mp4', film: { luma: 100 } }, 2000);
  if (decisions) put(d, 'DECISIONS.json', { decisions });
  return d;
}
const kit = (d, gate = '5') => { const p = spawnSync(process.execPath, [TOOL, d, '--gate', gate], { encoding: 'utf8' });
  return { code: p.status, out: p.stdout + p.stderr, row: id => p.stdout.split('\n').find(l => l.split(/\s+/)[1] === id) }; };

test('a film that uses every kit feature passes ◇5 and shows its Rick bench gap table', () => {
  const d = film(), r = kit(d);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /review\/kituse\.md: PASS/);
  assert.match(fs.readFileSync(path.join(d, 'review/kituse.md'), 'utf8'), /## Rick bench, final vs Rick[\s\S]*\| mean luma/);
});

const MISSING = {
  life: [{ acts: [{ ...ACT, style: 'kaiships' }] }, /1 of 1 acts set no `life` \(room\)/],
  'life 0': [{ acts: [{ ...ACT, style: { life: 0 } }] }, /set no `life`/, 'life'],
  depth: [{ acts: [{ ...ACT, backdrop: undefined }] }, /no act has `backdrop/],
  'sound-plan': [{ plan: false }, /audio\/sound-plan\.json is missing/],
  music: [{ levels: null }, /audio\/levels\.txt is missing/],
  'music outside the kit mixer': [{ levels: LEVELS.replace('kit mixer styles/stick-man/tools/mix.py', 'round 4') }, /not written by the kit mixer/, 'music'],
  'music as a placed stem': [{ levels: LEVELS.replace(/music: .*?;/, 'music: stem audio/old.wav placed as it is (--music-stem);') }, /music source is "stem/, 'music'],
  'music not credited': [{ credits: 'Voice: Gemini\n' }, /black_vortex\.mp3 is not named in CREDITS/, 'music'],
  refbench: [{ bench: false }, /review\/refbench\.json is missing: node \S*refbench\.mjs .*t_v1\.mp4/],
};
for (const [name, [opts, why, id = name]] of Object.entries(MISSING)) {
  test(`◇5 fails a film missing ${name}, naming it`, () => {
    const r = kit(film(opts));
    assert.equal(r.code, 1, r.out);
    assert.match(r.row(id) || '', /^FAIL/, r.out);
    assert.match(r.out, why);
    assert.match(r.out, new RegExp(`FAIL · missing ${id}$`, 'm'));
  });
}

test('a bench row of an older render or another file does not count', () => {
  const d = film(); put(d, 'renders/t_v2.mp4', '', 3000);
  assert.match(kit(d).out, /measures t_v1\.mp4, not the final t_v2\.mp4/);
  put(d, 'review/refbench.json', { id: 't_v2', source: 't_v2.mp4', film: {} }, 2500);
  assert.match(kit(d).out, /older than t_v2\.mp4/);
});

test('◇4 checks the moving hold and the backdrop only', () => {
  const r = kit(film({ plan: false, levels: null, bench: false, acts: [{ ...ACT, style: 'kaiships' }] }), '4');
  assert.equal(r.code, 1);
  assert.deepEqual(r.out.split('\n').filter(l => /^(PASS|FAIL) /.test(l)).map(l => l.split(/\s+/).slice(0, 2).join(' ')), ['FAIL life', 'PASS depth']);
});

test('an approved waiver with who and when lets a film skip a feature; one without them does not', () => {
  const waiver = { id: 'W1', waives: 'depth', decision: 'closed night room, no sky', by: 'kai', at: '2026-11-18', status: 'approved' };
  const ok = kit(film({ acts: [{ ...ACT, backdrop: undefined }], decisions: [waiver] }));
  assert.equal(ok.code, 0, ok.out);
  assert.match(ok.row('depth'), /PASS depth\s+waived: W1 by kai, 2026-11-18/);
  for (const bad of [{ ...waiver, status: 'proposed' }, { ...waiver, by: '' }, { ...waiver, at: 'soon' }, { ...waiver, waives: 'life' }])
    assert.equal(kit(film({ acts: [{ ...ACT, backdrop: undefined }], decisions: [bad] })).code, 1, JSON.stringify(bad));
});
