# Reel guide

Read this before you write a script, a storyboard or a chapter. `ANIMATION_GUIDE.md` covers the painting API
(`paint`, `inkLine`, `letter`, `camBegin`, `clawd`, `emotions`, `kf`, `seg`, easings, `hash`, `jit`) and the
animation principles. Everything there applies, except for the differences below.

## What is different from ANIMATION_GUIDE.md

- **The canvas is vertical: W = 1080, H = 1920**, 30 fps, y pointing down. `camBegin(cx, cy, zoom, rot)` with no
  camera move centres on (540, 960).
- **Text is allowed and expected.** A reel is watched with the sound off as often as on. Headers, key words, labels
  and numbers go on screen with `letter()`, `chip()`, `stepHeader()` and `statCard()`. The "No text" rule does not
  apply. Its spirit does: show the idea, don't only write it. A sign that repeats the voiceover is still a failure.
- **Captions are drawn for you**, in the published look: up to 3 words / 18 characters on a painted ink plate centred
  at y 1395 (band 1320–1470), words turning ochre as they are spoken, the live word 7 % bigger, numbers as digits,
  brand names on one card (`PROJECT.caption.brands`), hidden while a wipe covers the frame. Don't paint your own
  captions and don't put anything important in that band.
- **Transitions are drawn for you** at every chapter cut: a brush wipe covers the frame for 0.25 s on each side of
  the cut. Your chapter still paints the full frame right up to its edges, but nothing important should happen in
  its first or last 0.25 s. Pick the colours with `chapter(..., { wipe: [c1, c2] })` and the kind with
  `trans: 'brush' | 'splat' | 'iris'` (`splat` = an ink blot blooms from `at: [x, y]`; `iris` closes to a dot at
  `at` and opens again). Vary them across the reel.
- **There is a voiceover, so the voiceover is the clock.** Every event is tied to a spoken word.
- **The beat:** `bpm` is 120 by default, so a beat is 0.5 s and `pulse(t)`, `beatN` and `move()` follow it. The
  generated music uses the same grid. If you change it, change it in both `src/config.js` and `audio/cues.json`.

## The reel API (`engine/reel.js`)

```js
vo('post')                 // when "post" is first spoken, in seconds
vo('three', 2)             // the 2nd time "three" is spoken
vo('move', 1, 'l02')       // the 1st "move" inside line l02
voLine('l02')              // { s, e, text } of a line
cutAfter('l02')            // the cut point after a line: the middle of the pause before the next line
chapter(name, start, end, [[t0, shotFn], ...], { wipe: [c1, c2], trans: 'brush', at: [540, 800], shotWipes: [[c1, c2], ...], cut: false })
SAFE                       // { x0: 60, x1: 960, y0: 250, y1: 1300 }
CAPTION                    // caption look: y, size, colours, words per chunk, brands, digits. Override per film with
                           // PROJECT.caption = { brands: ['Claude Code', 'Hopper'] } in <film>/src/config.js
```

A chapter file is an IIFE that ends with one `chapter()` call. A shot function `fn(t, lt, dur)` paints the whole
frame, background first. `t` is video time.

```js
// <film>/src/ch/c2_example.js
(() => {
  const START = cutAfter('l01'), END = cutAfter('l03'), T_HIT = vo('faster', 1, 'l02');
  function shot(t) {
    boilSeed('bg'); bgWash(t, '#E9F3EE', { blobs: [PAL.sky, PAL.teal] });
    camBegin(540 + Math.sin(t) * 8, 960, 1 + .03 * seg(t, START, END));          // the camera never sits still
    clawd(300, 1270, 27, emotions(t, [[START - 1, 'thinking'], [T_HIT, 'excited']]));
    burst(620, 800, t - T_HIT, PAL.clay);                                         // the hit, on the word
    camEnd();
    stepHeader(t, START + .06, 1, 'GO FASTER', PAL.teal);
  }
  chapter('example', START, END, [[START, shot]], { wipe: [PAL.teal, PAL.sky] });
})();
```

## The kit (`engine/kit.js`)

Read the file: it is short. `bgWash`, `badge`, `stepHeader`, `chip`, `statCard`, `fileIcon`, `codeBars`, `laptop`,
`phone` + `phoneAt`, `burst`, `twinkle`, `tick`, and the font helpers `MARKER(s)`, `HAND(s)`, `MONO(s)` (pass
them as `letter(..., { font: HAND(60) })`) and `textW(txt, font)`.

`letter()` takes frame (or camera) coordinates and ignores `push()/translate()/scale()`. For text on a moved or
rotated prop, compute the point yourself (`phoneAt` does it for a phone screen).

## Script

- One idea per reel. Hook, 2–4 beats, one closing line that says what to do next.
- About 2.5 words per second. 30 s ≈ 70 words. Short sentences. Write how people talk.
- One line in `vo/script.json` per sentence or beat, so each can be a caption group and a cut point.
- The first line is the hook: it names the payoff or opens a question in the first two seconds.
- Spoken and written facts must come from the user or a source you can cite. No invented numbers.

```json
{ "voice": "en-US-BrianMultilingualNeural", "rate": "+20%", "pause": 0.25,
  "lines": [ { "id": "l01", "text": "Wait! Before you post that reel, check three things." },
             { "id": "l02", "text": "One: the hook.", "pause": 0.15 },
             { "id": "l03", "text": "It's called R.E.A.", "say": "It's called Ree-ah." , "rate": "+25%" },
             { "id": "l04", "text": "Comment HOOK and I'll send you the list.", "asr": "Comment hook and I'll send you the list." } ] }
```

`pause` is the silence after a line. `say` is what the voice reads when it must differ from the caption; `rate` sets
one line's speed (≤ +25 %); `asr` is what Whisper should hear for a name it spells its own way. Other voices:
`.venv/bin/python -m edge_tts --list-voices`.

## Storyboard

Write `<film>/STORYBOARD.md` after the voiceover exists, with `vo/word_times.txt` open. It is the film's treatment
(lemo-opuscar's `TREATMENT.md`): it starts with **three candidate concepts**, a few lines each (three different worlds
or metaphors), and the one you chose and why. The first concept that comes to mind is usually the cliché.

```
Concepts: A … · B … · C … → chose B, because …
Logline: one sentence.
World: palette, setting, how the colour changes from chapter to chapter.
Motif: the thing that comes back at the end.
Cast: who is on screen (Clawd, the presenter, the Researcher), their size (Clawd body ≥ 280 px wide, the presenter ≥ 550 px tall in a
  full shot), and the shared prop helpers written once for all chapters (src/ch/c0_props.js).
Clawd's arc: the emotion keys across the whole reel.

HOOK 0.00–3.0x  (its own section: see Hook rules)
  0.00  what is ALREADY moving on frame 0
  0.16  "Wait"    event
  1.18  "post"    event
  ...             a new event about every 0.3 s, the surprise marked
Chapters:
  c2 name  start–end  [wipe colours]  what's seen · the EVENT · Clawd's reaction · camera
     word@time  what happens on it
     ...
  c3 ...
SFX: one line per hit, the sound and the word it lands on.
Sources: where every on-screen or spoken fact comes from (the user's prompt counts).
```

Check it: is there an event on every key word? Does each thing on screen have time to be read before the next?
Does the ending rhyme with the opening?

## Hook rules (0–3 s)

The first three seconds decide whether anyone watches the rest. The hook is planned, built and checked separately.

- Frame 0 is already mid-action: something is moving fast. Never a settling or empty frame. No static holds:
  something changes in every frame from 0 to 3 s.
- A new visible event about every 0.3 s, locked to the spoken words. The camera is never still (push, orbit, crane,
  shake on hits), but stays one continuous move: ≤ ~20 px per frame, no hard cuts inside the hook chapter.
- At least one surprise the viewer doesn't expect by 1.5 s: a reveal, a transformation, a break in scale.
- Big silhouettes and one focal action at a time.
- Check it as a strip (`--strip=0:1`) and as a sheet every 0.25 s. Grade the hook on its own before moving on.

## Rules

- **One file per chapter** in `<film>/src/ch/`, listed in `<film>/index.html` in order. Private helpers live inside the IIFE.
- **Pure functions of `t` only.** Frames render in parallel and out of order. No `Math.random()`, no state between
  frames. Use `hash(i)` and `jit(a)`, and `boilSeed(key)` before each separate element.
- **Safe zone:** anything that matters sits in x 60–960, y 250–1300. Instagram covers the bottom ~380 px and the
  right ~120 px. A header from `stepHeader` sits at y ~270–390, so illustrate below it. Keep faces, cards and
  numbers out of the caption band. Check with `--safe`.
- **Clawd is the hero.** Make it big: u ≈ 24–40 (the body is 10u wide). Change faces with `emotions()`, never by
  snapping. Give it squash and stretch, anticipation, overshoot and follow-through.
- **Motion bar:** every key word in the storyboard gets a visible event on that exact time (±1 frame). The camera
  always drifts, pushes or shakes on hits. Stagger things, ease everything, and give idle things secondary motion
  (bob, sway, twinkle). Hits get `burst()` or a squash.
- **Readability:** one focal action at a time, big silhouettes, strong contrast between character and background.
  Text must be readable on a phone: at least 44 px for small labels, at least 90 px for key numbers.
- **On-screen numbers and claims are exactly those in the storyboard's sources.** Nothing invented.
- **Performance:** aim for under 1 s per frame (the renderer prints ms/frame). Hundreds of painted shapes are
  fine, thousands are not. `wash` is cheap, watercolour `fill` costs more.

## Sound (`audio/cues.json`)

- `cuts`: the same cut points as the chapters, as `{"after": "l02"}`. Each gets a wipe whoosh automatically.
- `cues`: one sound per visible hit, timed by `word` (plus `n`, `line`, `offset`) or by `t`. Match the sound to
  the motion: `pop`/`blip` for things appearing, `slam`/`boom` for big hits, `whip`/`whoosh` for fast moves (they
  land ON the cue time), `ding`/`coin`/`shimmer` for rewards, `buzz`/`nope` for mistakes, `title` for headers.
  `.venv/bin/python styles/kai-hand-draw/tools/make_audio.py <film> --list` prints every name.
- About one to two cues per second. Keep gains 0.2–0.6 so the voice stays on top. The mix ducks under speech.
- `mood`: `bright` (major) or `tense` (minor until the last chapter).

## Checking your work

```
node styles/kai-hand-draw/tools/look.mjs <film> --sheet=9.6,10.2,11.8,12.4 --cols=4 --w=270 --out=<film>/out/check/c2.jpg    # chosen times
node styles/kai-hand-draw/tools/look.mjs <film> --strip=0:1 --cols=8 --w=200 --out=<film>/out/check/hook.jpg                 # every frame of a stretch
node styles/kai-hand-draw/tools/look.mjs <film> --stills=11.76 --safe --out=<film>/out/check/stills                          # full size, with the safe-zone overlay
node styles/kai-hand-draw/tools/look.mjs <film> --clip=9.3:14 --out=<film>/out/check/c2.mp4                                  # a stretch as video, with audio
```

Open the images with the Read tool and look hard:

- the first and last frames of every shot, and every hit time ±0.1 s
- motion reads across consecutive frames (strips)
- the caption is readable and nothing sits under it
- the header is not overlapped, and nothing important is under Instagram's UI (`--safe`)
- Clawd is on model, big, and separate from the background

Iterate until each shot is charming, readable, lively and on model. After the final render, `node styles/kai-hand-draw/tools/make.mjs <film> verify`
pulls frames from the MP4 itself: look at those too.
