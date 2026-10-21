# Kai Hand-Draw Reel — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Three Checks* (16.7 s, 1080×1920, 30 fps) · `demo/three-checks.mp4` after a build · source in [`demo/`](demo/) ·
engine: [`engine/`](engine/) (p5 + p5.brush watercolour, Clawd, Kai, reel layer), tools: [`tools/`](tools/).

## Story & structure

A thumb is about to hit POST; Clawd stops it, runs three quick checks (hook, captions, safe zone), then lets the post
go. A numbered listicle: hook → three items → payoff. The full beat sheet is [`demo/STORYBOARD.md`](demo/STORYBOARD.md).
Native moves spent: the progress prop (badges 1-2-3 that get ticked at the end), the stamp slam (POST → POSTED).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.00–3.17 | phone, thumb, Clawd leaping in | pull-back while the phone drops | frame 0 mid-action; WAIT! pops on the word |
| 2 | 3.17–6.47 | check 1, the hook | slow push | dead grey frame → bouncing ball on "move" |
| 3 | 6.47–10.33 | check 2, captions | drift | speaker crossed out on "off", caption pills on "follow" |
| 4 | 10.33–14.08 | check 3, safe zone | drift | dashed frame draws itself; text slides in on "away" |
| 5 | 14.08–16.73 | payoff | push on the slam | ticks on "All three good", POSTED slam, hearts |

## Score structure

120 bpm, `bright` mood, one wipe whoosh per chapter cut, about 2.5 SFX cues per second (`demo/audio/cues.json`).

## Palette & props

Warm cream paper; chapter tints teal → violet → ochre → back to the hook's warm cream. Props: one phone (shared),
badges 1-2-3, header chips. No Kai in this demo: see the starter (`starter/`) for Kai + Clawd on one set.

## Build notes

```sh
node styles/kai-hand-draw/tools/make.mjs styles/kai-hand-draw/demo          # vo → audio → render → verify
```

About 95 s to render 502 frames with 4 workers on an Apple-silicon Mac. The voice is `+12%` and a little slow
(check_vo.py warns on pace): new films use `+20%`. Line l01 carries `"asr"` because Whisper hears "reel" as "real".
