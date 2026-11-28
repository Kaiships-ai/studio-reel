// tier: heavy
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

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

test('every sound links its Freesound short page, and no committed sound file carries an email address', () => {
  for (const [slot, e] of Object.entries(library)) assert.equal(e.page, `https://freesound.org/s/${e.id}/`, slot);
  const files = fs.readdirSync(SOUND, { recursive: true }).map(f => path.join(SOUND, f)).filter(f => fs.statSync(f).isFile());
  assert.ok(files.length > 60, `${files.length} sound files`);
  for (const f of files) {
    const audio = /\.(ogg|wav|flac|mp3)$/.test(f);
    if (audio && !E.tools?.ffprobe) continue;
    const text = audio   // compressed audio bytes can spell an address by chance: read its tags, where a name would be
      ? run('ffprobe', ['-v', 'error', '-show_entries', 'format_tags:stream_tags', '-of', 'json', f], { capture: true }).stdout
      : fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(text, EMAIL, path.relative(ROOT, f));
  }
});

function resolve(names) {
  const r = run('python', ['-I', `${TOOLS}/run/sound_lib.py`, ...names], { capture: true });
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
  const got = resolve(['bag_swish', 'duffel_swish', 'gun_draw_slow', 'trunk_open']);
  assert.deepEqual([got.bag_swish.how, got.bag_swish.as, got.bag_swish.files], ['guess', 'whoosh', ['lib/whoosh.ogg']]);
  assert.equal(got.duffel_swish.as, 'whoosh');
  assert.equal(got.gun_draw_slow.as, 'gun_draw', 'a draw, not a gunshot');
  assert.notEqual(got.trunk_open.as, 'step_wet', "'trunk' does not hold the word 'run'");
});

test('a name is matched in any case, spelling or number, and by whole words, never by the start of a word', { skip }, () => {
  const QUIET = 'rustle';     // sound_lib.UNKNOWN: what a name with no known word plays
  const want = {
    Gunshot: 'gunshot', GUNSHOT: 'gunshot', gunshot_2: 'gunshot', gunshots: 'gunshot', 'gunshot-close': 'gunshot_close',
    'gun shot': 'gun_shot', gun_shot_far: 'gunshot_close', gunfire: 'gunshot_close',
    reveal: QUIET, review_sting: 'sting', password: QUIET, bypass: QUIET, carpet: QUIET, card_swipe: 'whoosh', cartoon: QUIET,
    tired: QUIET, doorbell: 'ding', explosion: 'boom', cash_register: 'register', phone_ring: 'ding', crowd_cheer: 'crowd',
  };
  const got = resolve(Object.keys(want));
  assert.deepEqual(Object.fromEntries(Object.keys(want).map(n => [n, got[n].as])), want);
  for (const n of Object.keys(want)) assert.equal(got[n].how, 'guess', `${n} is not a NAMES entry as written, so the mixer reports it`);
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
    fs.writeFileSync(path.join(film, 'audio/cues.json'), JSON.stringify([{ t: 0.7, name: 'bag_swish', strength: 0.5 }, { t: 1.7, name: 'thud', strength: 0.5 }]));
    const r = run('python', ['-I', `${TOOLS}/run/mix.py`, film], { capture: true });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /WARNING cue name 'bag_swish' is not in sound_lib\.NAMES; guessed as 'whoosh'/);
    const levels = fs.readFileSync(path.join(film, 'audio/levels.txt'), 'utf8');
    assert.match(levels, /recorded cues 2\/2;.*guessed names \(not in sound_lib\.NAMES\): \{'bag_swish': 'whoosh'\}/);
    assert.match(levels, /^mix\s+-14\.\d LUFS/m);
    for (const f of ['mix.wav', 'stems/sfx.wav', 'stems/music.wav', 'stems/amb.wav', 'stems/vo_m.wav']) assert.ok(fs.existsSync(path.join(film, 'audio', f)), f);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('a hero hit keeps its transient over the word naming it, and gives way to any other word unless the cue says keep', { skip: skip || (!E.tools?.ffmpeg && 'needs ffmpeg') }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-guard-test-'));
  try {
    const mix = (word, cue) => {
      const film = path.join(tmp, `${word.replace(/ /g, '_')}-${cue.keep ? 'keep' : 'plain'}`); fs.mkdirSync(path.join(film, 'vo'), { recursive: true }); fs.mkdirSync(path.join(film, 'audio'));
      const voice = `import numpy as np, soundfile as sf; from scipy.signal import butter, sosfilt; t = np.arange(3 * 48000) / 48000
v = sosfilt(butter(4, [300 / 24000, 3000 / 24000], 'band', output='sos'), np.random.default_rng(1).standard_normal(len(t)))
sf.write(r'${path.join(film, 'vo/vo.wav')}', 0.1 * v / np.abs(v).max() * ((t % 1) < 0.6), 48000)`;
      assert.equal(run('python', ['-I', '-c', voice], { capture: true }).status, 0);
      const said = word.split(' '), at = [1, ...said.slice(1).map(() => 1.06)];     // a second word starts inside the hit's first 70 ms
      const words = [{ t0: 0, t1: 0.6, word: 'w0' }, ...said.map((w, i) => ({ t0: at[i], t1: at[i + 1] ?? 1.6, word: w })), { t0: 2, t1: 2.6, word: 'w2' }];
      fs.writeFileSync(path.join(film, 'vo/words.json'), JSON.stringify(words.map(w => ({ ...w, line: 'L01' }))));
      fs.writeFileSync(path.join(film, 'audio/cues.json'), JSON.stringify([{ t: 1.05, name: 'gunshot', strength: 1, lock: true, ...cue }]));
      const r = run('python', ['-I', `${TOOLS}/run/mix.py`, film], { capture: true });
      assert.equal(r.status, 0, r.stderr);
      return Number(fs.readFileSync(path.join(film, 'audio/levels.txt'), 'utf8').match(/gunshot@1\.05 ([-+]\d+\.\d)/)[1]);
    };
    const named = mix('gunshot', {}), kept = mix('hit', { keep: true }), plain = mix('hit', {});
    assert.ok(plain < named - 0.8, `over 'hit' the guard dips the hit (${plain} dB) more than over 'gunshot' (${named} dB)`);
    assert.equal(kept, named, 'a cue with keep: true holds its transient like a hit over its own name');
    const hot = mix('hot', {}), article = mix('the gunshot', {});
    assert.ok(hot < named - 0.8, `'hot' is not the name 'gunshot': the guard dips the hit (${hot} dB vs ${named} dB)`);
    assert.ok(Math.abs(article - named) < 0.3, `an article before the name keeps the hit (${article} dB vs ${named} dB)`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('--mux fails, and says why, when the mp4 misses its loudness or true peak or the video and the mix differ in length', { skip: skip || (!E.tools?.ffmpeg && 'needs ffmpeg') }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-mux-test-'));
  try {
    const film = path.join(tmp, 'film'); fs.mkdirSync(path.join(film, 'vo'), { recursive: true }); fs.mkdirSync(path.join(film, 'audio'));
    const voice = `import numpy as np, soundfile as sf; t = np.arange(3 * 48000) / 48000
sf.write(r'${path.join(film, 'vo/vo.wav')}', 0.3 * np.sin(2 * np.pi * 220 * t) * ((t % 1) < 0.6), 48000)`;
    assert.equal(run('python', ['-I', '-c', voice], { capture: true }).status, 0);
    fs.writeFileSync(path.join(film, 'vo/words.json'), JSON.stringify([0, 1, 2].map(i => ({ t0: i, t1: i + 0.6, word: `w${i}`, line: 'L01' }))));
    fs.writeFileSync(path.join(film, 'audio/cues.json'), JSON.stringify([{ t: 1.7, name: 'thud', strength: 0.5 }]));
    const video = d => {
      const f = path.join(tmp, `v${d}.mp4`);
      assert.equal(run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=black:s=64x64:r=30:d=${d}`, '-pix_fmt', 'yuv420p', '-c:v', 'libx264', f], { capture: true }).status, 0);
      return f;
    };
    const short = run('python', ['-I', `${TOOLS}/run/mix.py`, film, '--mux', video(2), path.join(tmp, 'short.mp4')], { capture: true });
    assert.notEqual(short.status, 0, 'a 2 s video under a 3 s mix is cut short, not muxed');
    assert.match(short.stderr, /video 2\.000 s .* mix 3\.000 s/);

    // an encoder that always lands at the given loudness and true peak, in place of AAC
    const encode = (I, tp) => run('python', ['-I', '-c', `import sys; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, TOOLS, 'run'))}); import mix
mix.mux = lambda video, wav, out: (${I}, ${tp})
sys.argv = ['mix.py', ${JSON.stringify(film)}, '--mux', ${JSON.stringify(video(3))}, ${JSON.stringify(path.join(tmp, 'out.mp4'))}]; mix.main()`], { capture: true });
    const hot = encode(-14.0, -0.4);
    assert.notEqual(hot.status, 0, 'an mp4 still over -1.0 dBTP after the last encode fails');
    assert.match(hot.stderr, /true peak -0\.4 dBTP/);
    const used = [...hot.stdout.matchAll(/at limiter ceiling (-\d+\.\d+)/g)].map(m => m[1]);
    assert.equal(used.length, 3, hot.stdout);
    const levels = fs.readFileSync(path.join(film, 'audio/levels.txt'), 'utf8');
    assert.match(levels, new RegExp(`limiter ceiling ${used.at(-1)} dBTP`), 'levels.txt prints the ceiling of the last encode');
    const quiet = encode(-15.2, -2.0);
    assert.notEqual(quiet.status, 0, 'an mp4 at -15.2 LUFS is outside -14 +-0.5');
    assert.match(quiet.stderr, /-15\.2 LUFS/);
    assert.equal(encode(-14.1, -1.3).status, 0, 'an mp4 within both targets passes');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
