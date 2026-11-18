import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run, env } from '../../kit/env.mjs';

const SOUND = path.join(ROOT, 'styles/stick-man/sound');
const TOOLS = 'styles/stick-man/tools';
const library = JSON.parse(fs.readFileSync(path.join(SOUND, 'library.json'), 'utf8'));
const credits = fs.readFileSync(path.join(SOUND, 'CREDITS'), 'utf8');

// every cue name Hot Money ep01 uses (rounds 3 and 4, audio/cues.json); films/ is not in git
const HOT_MONEY = ['bag_drop', 'bag_grab', 'bag_thump', 'bag_whoosh', 'bite', 'brake_squeal', 'breath', 'bullet_flyby', 'car_by', 'car_door',
  'car_stop', 'cloth_whoosh', 'clunk', 'crash', 'crash_metal', 'creak', 'ding', 'drag', 'drip', 'engine', 'engine_away', 'engine_down',
  'engine_far', 'engine_idle', 'engine_int', 'engine_rev', 'engine_roar', 'flashlight', 'flutter', 'glass', 'glass_door', 'glass_smash',
  'grunt', 'gun_cock', 'gun_draw', 'gunshot', 'gunshot_close', 'gunshot_far', 'hit', 'impact', 'impact_light', 'impact_metal', 'knock',
  'lamp', 'note', 'radio', 'register', 'rustle', 'scrape_metal', 'screech', 'send', 'servo', 'shout', 'sigh', 'siren', 'siren_far',
  'siren_long', 'siren_rise', 'siren_stop', 'skid', 'slam', 'slam_far', 'slap', 'slide', 'slowmo', 'slowmo_in', 'slowmo_out', 'springs',
  'stab', 'stamp', 'steam_hiss', 'step_l', 'step_r', 'step_wet', 'street_bed', 'suspension_thump', 'thud', 'thump', 'tick', 'ting', 'trunk',
  'trunk_slam', 'tyre_screech', 'tyres', 'tyres_wet', 'whoosh', 'zip'];
const SYNTH = new Set(['note', 'send', 'stab']);       // the musical and interface blips stay synthesised
const NOISE = new Set(['steam_hiss']);                 // steam is broadband noise: shaped noise is the real sound

test('every library sound is on disk, CC0 with the licence read on its page, and credited', () => {
  assert.equal(Object.keys(library).length, 62);
  for (const [slot, e] of Object.entries(library)) {
    assert.ok(fs.existsSync(path.join(SOUND, e.file)), `${slot}: ${e.file} missing`);
    assert.equal(e.licence, 'CC0 1.0', slot);
    assert.deepEqual(e.licence_checked, ['publicdomain/zero'], slot);
    assert.ok(credits.split('\n').some(l => l.startsWith(slot + ' ') && l.includes(e.page) && l.includes('CC0')), `${slot} has no CREDITS line`);
  }
});

const E = env();
const ready = Boolean(E.tools?.python) && run('python', ['-I', '-c', 'import numpy, scipy, soundfile'], { capture: true }).status === 0;
const skip = !ready && 'needs the pixi python (numpy, scipy, soundfile)';

function resolve(names) {
  const r = run('python', ['-I', `${TOOLS}/sound_lib.py`, ...names], { capture: true });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('every Hot Money cue name plays a named design: a recorded file on disk, or a declared synth blip', { skip }, () => {
  const got = resolve(HOT_MONEY);
  for (const name of HOT_MONEY) {
    const r = got[name];
    if (SYNTH.has(name)) { assert.equal(r.how, 'synth', name); continue; }
    assert.equal(r.how, 'names', `${name} is guessed`);
    if (NOISE.has(name)) continue;
    assert.ok(r.files.length > 0, `${name} plays no recording`);
    for (const f of r.files) assert.ok(fs.existsSync(path.join(SOUND, f)), `${name}: ${f} missing`);
  }
});

test('an unknown name is guessed by what happens before what it happens to', { skip }, () => {
  const got = resolve(['bag_whoosh_2', 'duffel_swish', 'gun_draw_slow', 'trunk_open']);
  assert.deepEqual([got.bag_whoosh_2.how, got.bag_whoosh_2.as, got.bag_whoosh_2.files], ['guess', 'whoosh', ['lib/whoosh.ogg']]);
  assert.equal(got.duffel_swish.as, 'whoosh');
  assert.equal(got.gun_draw_slow.as, 'gun_draw', 'a draw, not a gunshot');
  assert.notEqual(got.trunk_open.as, 'step_wet', "'trunk' does not hold the word 'run'");
});

test('the mixer plays a guessed name, warns about it and lists it in levels.txt', { skip: skip || (!E.tools?.ffmpeg && 'needs ffmpeg') }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-lib-test-'));
  try {
    const film = path.join(tmp, 'film'); fs.mkdirSync(path.join(film, 'vo'), { recursive: true }); fs.mkdirSync(path.join(film, 'audio'));
    const voice = `import numpy as np, soundfile as sf; t = np.arange(3 * 48000) / 48000
sf.write(r'${path.join(film, 'vo/vo.wav')}', 0.3 * np.sin(2 * np.pi * 220 * t) * ((t % 1) < 0.6), 48000)`;
    assert.equal(run('python', ['-I', '-c', voice], { capture: true }).status, 0);
    const words = [0, 1, 2].map(i => ({ t0: i, t1: i + 0.6, word: `w${i}`, line: 'L01' }));
    fs.writeFileSync(path.join(film, 'vo/words.json'), JSON.stringify(words));
    fs.writeFileSync(path.join(film, 'audio/cues.json'), JSON.stringify([{ t: 0.7, name: 'bag_whoosh_2', strength: 0.5 }, { t: 1.7, name: 'thud', strength: 0.5 }]));
    const r = run('python', ['-I', `${TOOLS}/mix.py`, film], { capture: true });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /WARNING cue name 'bag_whoosh_2' is not in sound_lib\.NAMES; guessed as 'whoosh'/);
    const levels = fs.readFileSync(path.join(film, 'audio/levels.txt'), 'utf8');
    assert.match(levels, /recorded cues 2\/2;.*guessed names \(not in sound_lib\.NAMES\): \{'bag_whoosh_2': 'whoosh'\}/);
    assert.match(levels, /^mix\s+-14\.\d LUFS/m);
    for (const f of ['mix.wav', 'stems/sfx.wav', 'stems/music.wav', 'stems/amb.wav', 'stems/vo_m.wav']) assert.ok(fs.existsSync(path.join(film, 'audio', f)), f);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
