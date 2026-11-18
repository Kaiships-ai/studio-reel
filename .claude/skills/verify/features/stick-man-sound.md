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
- `sound.fit`: `styles/stick-man/tools/sound_fit.py <film> <track> --out <music.json>` reads the track's tempo and bar
  grid and writes a `music.json` copy whose `track.segments` give each arc section the part of the track nearest its `lu`,
  starting on a downbeat that lands on the section start. A segment may name its own `file` (`--track2 <track> --track2-at
  a-b` plays a second track under the sections that start in that span) and a `gain`. No music plays in a planned silence
  or a `silence`, `drop` or `none` section, and the last section ends on the track's own ending by the film's end. Without
  `--mus-lu` it mixes the film in process to set `mus_lu` so the music stem sits at −26 LUFS. `mix.py --music-plan
  <json>` plays the result in place of `audio/music.json`.
- `sound.guard`: a word under +7.5 dB against the rest gets everything above 180 Hz dipped. A locked hero hit keeps its
  first 70 ms out of that dip only where the words it lands on name it (whole words of the cue name: "smash" on
  `glass_smash`, never "hot" on `gunshot`; the, a, an, of, to and and are ignored) or a cue sets `"keep": true`. Under any other word ("hit the car" under the gunshot) the word wins: Hot Money r4 goes from 4/255 words under
  +6 dB to 0/255, and the gunshots at 43.47 s and 43.8 s give up about 3 dB of transient.
- `sound.mux`: `--mux <video> <out.mp4>` encodes AAC 256k, measures the mp4's true peak with ebur128 and, while it is over
  −1.0 dBTP, lowers the limiter ceiling by the overshoot plus 0.3 dB and encodes again (3 encodes at most). It exits
  non-zero, saying why, when the final mp4 is over −1.0 dBTP or outside −14 ±0.5 LUFS, and before any encode when the video
  and the mix differ by more than 0.1 s. `levels.txt` prints the ceiling of the last encode.

## How to get to it (user POV)

- A film with `vo/vo.wav`, `vo/words.json` and `audio/cues.json`: `.pixi/envs/default/bin/python styles/stick-man/tools/mix.py
  films/<slug>` (from a worktree; `pixi run python` in the main checkout). It writes `audio/mix.wav`, `audio/stems/` and
  `audio/levels.txt`.
- How one cue name plays: `python styles/stick-man/tools/sound_lib.py <name>...` prints `how` (names, synth, guess), the
  design it uses and the library files it reads.

## Driving it

- `node --test test/unit/sound-lib.test.mjs`: the library is on disk, CC0 and credited; every Hot Money cue name resolves
  with no guess; `Gunshot`, `gunshot_2` and `gunshot-close` play gunshots, `password` and `reveal` play the quiet
  default; an unknown `bag_swish` is a whoosh; a 3 s test film mixes to −14 LUFS and reports its guessed name.
- `node --test test/unit/sound-fit.test.mjs`: a 100 BPM click track fit to a made-up arc cuts within one frame of a bar
  line at every section start, plays the loud part under the loud section, and stays silent in the planned silences;
  `--check` passes the placed stem and fails it 0.2 s late or cut short.
- A candidate for a real film: `sound_fit.py films/hm-ep01-r4 <track.mp3> --bpm <page tempo> --out
  films/hm-ep01-r4/audio/music-A.json` prints the tempo, beats a bar and, per section, the planned beat and the cut. Then
  `mix.py films/hm-ep01-r4 --music-plan films/hm-ep01-r4/audio/music-A.json --out films/hm-ep01-r4/audio/cand-A --mux <video>
  <out.mp4>`. Check where the cuts landed in the mixed stem with `sound_fit.py films/hm-ep01-r4
  films/hm-ep01-r4/audio/cand-A/stems/music.wav --check films/hm-ep01-r4/audio/music-A.json`. It prints the gap per
  section and fails when a cut is more than one frame (1/30 s, `--tol` to set, 0.5 s at most) off its beat or cannot be
  measured.
- Parity with Hot Money round 4 (the fixture is `films/hm-ep01-r4`, copied from that round's folder):
  `mix.py films/hm-ep01-r4 --music-stem films/hm-ep01-r4/audio/stems/music.wav --out /tmp/parity`. Expect the mix at
  −14.0 LUFS, true peak −1.6 dBTP, `recorded cues 222/225`, `guessed names ... none`.

## Gotchas

- A full-length mix takes about 15 s of CPU. On a shared Mac run it through the render lock.
- `levels.txt` prints `-inf` for a silent stem (no music source, no ambience). The music check then fails: that is the
  report, not a crash.
- The contour and climb envelopes in `music.json` are applied after the track is levelled. Where a track is loud under a
  +2 or +3 dB contour, the music stem lands above −26 LUFS and the check fails. Lower `mus_lu` for that film.
- The tempo octave and the meter of a track are guesses without a hint. Pass the tempo from the track's page with `--bpm`
  and an odd meter with `--meter` (Black Vortex is 7/8). With no clear accent the fit assumes 4 beats a bar.
- The fit's level pass mixes the whole film up to three times (about 15 s each). Run it through the render lock too.
