---
name: make-reel-stick-man
description: Make one short vertical stick-man story reel (1080x1920 MP4 + cover) from an idea, with the stick-man pack in styles/stick-man/ - script, voice (Google Gemini, the user's own key), 3D stick figures acting in a set, automatic camera, captions, sound, three automatic checks, export. Use when the user types /make-reel-stick-man, or asks for a stick-man / stick figure reel, short or story video.
argument-hint: <idea | "script in quotes"> [--set room|street|grey-room] [--length 15|30] [--approve]
---

# /make-reel-stick-man

Make one stick-man reel end to end and hand back the MP4. Input: `$ARGUMENTS`.
Reference for every file you write: [REFERENCE.md](REFERENCE.md). Pack contents: `styles/stick-man/README.md`.

Run every command from the library root with `pixi run` in front (`pixi run node …`, `pixi run python …`). A command
that may take over 3 minutes runs in the background while you do the next step.

## The bar

A viewer with the sound off understands every line from the picture; with the sound on, the voice is clear over
everything. The figures act (faces change on the words that matter, bodies move with intent), the camera shows who
acts, captions are readable, and the three checks pass. 15-30 seconds.

## Steps

### 0. Setup (silent unless something is missing)
`pixi run studio doctor`. If an item fails, run what it says (`pixi run studio install`). The voice needs
`GOOGLE_API_KEY` in `.env` at the library root (START-stick-man.md step 1): ask for it once if it is missing, and never
print, copy or commit the key.

### 1. Idea to brief
From the input, decide yourself: the angle (one surprising fact, a tiny story with a turn, or a how-it-works), 2-3
characters from `kit/cast/characters.js` (MAYA, LEO, SAM, ROB) or new specs, one set (`room`, `street`, `grey-room`,
or a film's own set), the length (15 s default). Ask the user one question only when the idea is too vague to write.
The narration is English (the word aligner reads English). Start the film:
`pixi run node styles/stick-man/tools/pack/new.mjs <name> --set <set>`.

### 2. Script and storyboard
Write `films/<name>/vo/script.json` (REFERENCE.md "Script"): 4-7 lines, about 3 words a second (15 s = 40-45 words).
Line 1 is the hook (4-8 words, a picture you can show). Each line is one picture. The last line is the payoff.
Write `films/<name>/storyboard.json` at the same time: one entry per line with `see` (what is on screen, sound off),
`role` and `shot` (REFERENCE.md "Camera"). Keep any caption chunk under 14 characters where you can: short words
between commas make captions that flash by (the captions check catches them).
Show the user the script in one short message. With `--approve`, wait for their go; otherwise continue.

### 3. Voice
```
pixi run python styles/stick-man/tools/run/voice.py films/<name> --samples Puck Kore Charon   (optional: pick a voice)
pixi run python styles/stick-man/tools/run/voice.py films/<name> --take Puck
pixi run python styles/stick-man/tools/run/align.py films/<name>
```
`align.py` writes `vo/words.json` (every word's time) and `vo/voice-qa.md`. A line marked ❌ was not heard clearly:
record another take (`--take` again), never edit times by hand. Give the reel a beat of air:
`pixi run node styles/stick-man/tools/pack/pad.mjs films/<name> --start 0.5 --end 1.5`, then `align.py` again. It prints
the last frame.

### 4. Build the reel
Write `films/<name>/reel.js` (REFERENCE.md "Reel"): `frames: [0, last + 45]`, the set, the cast on the set's marks,
each character's acting (`anim`: library clips, timed with `tools/pack/clips.mjs --end` so a clip never starts before
the last one ends), and `beats`: a face (`expr`) and a look (`look`) on the words that matter, 2-6 face changes per
character per 10 s, sounds where something happens. Then look at it:
```
pixi run node styles/stick-man/tools/pack/render.mjs --film films/<name> --frames <one frame per line> --out films/<name>/stills/f_%d.jpg
```
Open every still and check it against the storyboard's `see`: is the actor on screen, the face readable, nobody cut by
the frame or hidden behind furniture? Fix the storyboard `shot` / `of`, the marks or the timing and look again.

### 5. Check
`pixi run node styles/stick-man/tools/pack/check.mjs films/<name>`: joints (no snap, no limb through the body), feet
(no sliding), captions (every word shown, each long enough to read). Every fault names a frame: render it, look, fix
the cause (usually a clip that starts before the one before it ends, or a caption chunk that is too short). Repeat
until all three pass.

### 6. Export
`pixi run node styles/stick-man/tools/pack/export.mjs films/<name>` makes the 720p draft
(`films/<name>/out/<name>.mp4` and a cover). Watch it through once at full speed, then show it to the user. The
1080x1920 file to post: `export.mjs films/<name> --size 1080`, when the user says the draft is right.

### 7. Hand over
Tell the user, in their language: where the MP4 and the cover are, the length, the three checks' result, and one line
on what they can ask to change (a line, a face, a set, the voice).

## Rules

| Rule | Why |
|---|---|
| A film's files live in `films/<name>/`; never edit `styles/stick-man/` for one film. A new set or character for one film goes in the film's folder and is loaded by its path | the pack stays the same for the next film |
| Never draw a real person's likeness, a brand or a logo unless the user owns it | the user publishes the reel |
| No music ships with the pack. Use only a track the user has the rights to: `mix.py films/<name> --music <file>` | licences |
| Do not invent tool flags: every tool prints its usage with `--help` | the tools are the source of truth |
| A check that fails is fixed at its cause, not hidden with `--force` | the checks catch what viewers see |
