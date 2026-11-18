# Stick-man sound library and mixer

`styles/stick-man/tools/mix.py` mixes a stick-man film from its voice, its cue list and the kit's recorded sound library
(`styles/stick-man/sound/`: 62 CC0 recordings from Freesound, OGG, `library.json` and `CREDITS`). It masters to
−14 LUFS with true peak at or under −1.6 dBTP on the wav, and with `--mux` to −1 dBTP or lower on the AAC in the mp4.

## Sub-features

- `sound.names`: `sound_lib.NAMES` maps every cue name to one design built on library recordings. `stab`, `note`, `send`,
  `ping`, `beep` and `blip` stay synthesised (`sound_lib.SYNTH`). An unknown name is guessed, action words (whoosh, grab,
  draw, cock, drop, step) before object words (bag, gun, car). Every guess prints a warning and shows in `levels.txt` line 3.
- `sound.beds`: `audio/ambience.json` places recorded beds per place (`sound_lib.BEDS`); a kind the kit lacks is listed as
  missing, never synthesised.
- `sound.music`: the first that applies is used: `--music <track>` (levelled to the voice + `mus_lu`, then climb, contour
  and duck), `music.json` `track` (segments of one track placed at film times, equal-power crossfades), `--music-stem <wav>`
  (a finished stem placed as it is), or none. `levels.txt` line 2 names the source.
- `sound.mux`: `--mux <video> <out.mp4>` encodes AAC 256k, measures the mp4's true peak with ebur128 and, while it is over
  −1.0 dBTP, lowers the limiter ceiling by the overshoot plus 0.3 dB and encodes again (3 encodes at most).

## How to get to it (user POV)

- A film with `vo/vo.wav`, `vo/words.json` and `audio/cues.json`: `.pixi/envs/default/bin/python styles/stick-man/tools/mix.py
  films/<slug>` (from a worktree; `pixi run python` in the main checkout). It writes `audio/mix.wav`, `audio/stems/` and
  `audio/levels.txt`.
- How one cue name plays: `python styles/stick-man/tools/sound_lib.py <name>...` prints `how` (names, synth, guess), the
  design it uses and the library files it reads.

## Driving it

- `node --test test/unit/sound-lib.test.mjs`: the library is on disk, CC0 and credited; every Hot Money cue name resolves
  with no guess; an unknown `bag_whoosh_2` is a whoosh; a 3 s test film mixes to −14 LUFS and reports its guessed name.
- Parity with Hot Money round 4 (the fixture is `films/hm-ep01-r4`, copied from that round's folder):
  `mix.py films/hm-ep01-r4 --music-stem films/hm-ep01-r4/audio/stems/music.wav --out /tmp/parity`. Expect the mix at
  −14.0 LUFS, true peak −1.6 dBTP, `recorded cues 222/225`, `guessed names ... none`.

## Gotchas

- A full-length mix takes about 15 s of CPU. On a shared Mac run it through the render lock.
- `levels.txt` prints `-inf` for a silent stem (no music source, no ambience). The music check then fails: that is the
  report, not a crash.
- The contour and climb envelopes in `music.json` are applied after the track is levelled. Where a track is loud under a
  +2 or +3 dB contour, the music stem lands above −26 LUFS and the check fails. Lower `mus_lu` for that film.
