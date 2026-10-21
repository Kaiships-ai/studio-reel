# Kai Hand-Draw — Style Prompt

> A vertical, narrated reel painted in watercolour and ink on warm paper, starring Clawd (and Kai): a motion-design
> showreel where every spoken key word lands as a visible event, captions locked to the voice. Built for Instagram
> Reels (1080×1920, 30 fps, 28–45 s) and the @kaiships.ai listicle format.
> References (grammar only): Saturday-morning cartoon idents (squash, anticipation, a gag a second), Kurzgesagt
> (one metaphor world carried through), mobile-game shop and reward screens (stamps, coins, ticks). Never copy their
> characters, layouts, logos or music.

Workflow, commands and deliverables: [`WORKFLOW.md`](WORKFLOW.md). The full API: [`REEL_GUIDE.md`](REEL_GUIDE.md),
[`ANIMATION_GUIDE.md`](ANIMATION_GUIDE.md). Script voice: [`VOICE.md`](VOICE.md).

## 1. Essence, and what it is not

- **Hand-painted, alive:** every shape is a p5.brush watercolour wash with a wobbly ink line that boils 12 times a
  second on warm paper with grain. Nothing is flat vector.
- **One concept world per reel** (a shop, an airport scanner, an arcade, a lab) with a continuity prop that carries
  across chapters as a progress bar.
- **1 chapter = 1 long take.** The camera drifts inside a chapter; cuts happen only between chapters, as painted wipes.
- **The voice is the clock.** Each key word has an event on that frame (±1 frame). Captions ride on an ink plate.
- **Clawd is the hero**, big and expressive; **Kai** is the human host when the reel needs a person.

Not a slideshow with a voiceover (static cards), not flat motion graphics (swiss-motion), not a 3D skit, not the
lemo-opuscar `watercolor` style (that one is a landscape walk with no characters, captions or reel format).

## 2. Materials & rendering

- p5 + p5.brush on WEBGL, composited to a 2D canvas: `paint(pts, { wash, fill, ink, tex, bleed })` for every shape,
  `inkLine` for strokes, `letter()` for type (drawn on top of the frame, in screen space), paper texture under
  everything, multiply grain over everything, captions last.
- Boil: random streams re-seed per element with `boilSeed(key)` and change 12×/s. Static things must draw the same on
  both frames of a boil step. Frames are pure functions of `t` (no `Math.random()`, no state between frames).
- `wash` is cheap, watercolour `fill` costs more: aim under 1 s per frame. Glow with `glow()`, never a flat
  additive ring. Backgrounds cover the frame at every camera position, shakes included (no paper edge).

## 3. Colour logic

- Neutral ground: warm cream paper (`PAL.paper`). Ink is a deep aubergine (`PAL.ink`), never pure black; highlights
  are cream, never pure white.
- Clawd is always clay orange (`PAL.clay`). The accent of a chapter is one hue from `PAL` (teal, violet, ochre, sky,
  rose, sap); each chapter gets its own tint and the last chapter returns to the hook's warm ground.
- Ochre is reserved for the spoken highlight and rewards; red for "wrong" and stamps. One dark chapter at most
  (night blue), for the "inside" moment.

## 4. Type & subtitles

- Display: Permanent Marker (headers, `MARKER(s)`); hand: Shantell Sans 800 (`HAND(s)`, captions); code: JetBrains
  Mono 700 (`MONO(s)`); rounded: Fredoka. All self-hosted in `engine/fonts/` (OFL / Apache).
- On-screen labels are at least 46 px tall (cap height) at their final camera zoom; key numbers at least 90 px. A
  label leaves the frame before a zoom; it never shrinks into tiny text.
- **Captions are part of the style** (engine/reel.js): up to 3 words / 18 characters on a painted ink plate with a
  violet wash, centred at y 1395 (band 1320–1470); words turn ochre as spoken, the live word is 7 % bigger, numbers
  show as digits (clay), brand names stay on one card, back-to-back chunks swap inside a held plate, and captions
  hide while a wipe covers the frame. Don't paint other captions.

## 5. Motion quality

- 30 fps; drawings boil on twos (12/s), the camera and motion are smooth every frame.
- Squash and stretch, anticipation, overshoot and follow-through on every meaningful move (`kf`, `spring`, `ring`,
  `backOut`, `jump`, `take`). Faces change through `emotions()`, never by snapping.
- Something always moves: idle bob, sway, twinkle; a hit gets `burst()` or a squash. No still frame, no frozen
  stretch (freezedetect n = 0.003, 0.7 s fails).
- Frame 0 is already mid-action; a new event about every 0.3 s through the hook.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| slow push-in | attention, "this one matters" | an item's name; the key number |
| pull-back reveal / scale break | surprise, the bigger picture | the hook's turn; "and it does all of this" |
| lateral track | a list, a conveyor, time passing | items arriving; a tour of a set |
| crane up/down | moving to the next level of the world | from the desk to the monitor; into a machine |
| continuous zoom into an object | going inside | into a screen, a lens, a binary |
| hit shake (on the word) | impact | a stamp, a slam, a plug going in |

- **≤ 20 px per frame** on screen (measured by `look.mjs --camscan`); motivated by something in the frame.
- Framing: anything that matters inside x 60–960, y 250–1300 (Instagram covers the bottom ~380 px and the right
  ~120 px). Nothing over a face; smoke and glow behind characters or ≤ 30 % over them.
- **Cast size:** Clawd's body ≥ 280 px wide (u ≥ 28) in the main action; Kai ≥ 550 px tall in a full shot. The cast
  fills y 450–1250; the bottom of the safe zone is never left empty.
- Transitions only between chapters: `brush`, `splat`, `iris` (vary them). No cuts or whip pans inside a chapter.

## 7. Sound palette

- Voice: edge-tts `en-US-BrianMultilingualNeural` at +20 % (a line ≤ +25 %), lines ≤ 28 words, 5.0–6.4 syllables per
  second of speech, no run over ~5 s without a breath, the CTA said in one breath (gaps ≤ 0.05 s).
- Music: an original bed synthesized in numpy (`tools/make_audio.py`), 120 bpm by default, `bright` (major) or
  `tense` (minor resolving to major), ducked ~9 dB under speech.
- SFX: cartoon foley on every visible hit, timed by word (`pop`, `slam`, `whoosh`, `ding`, `coin`, `stamp`…),
  about 1–2 per second, gains 0.2–0.6; every chapter wipe gets its whoosh.
- Mix: −14 LUFS integrated, true peak ≤ −1 dBTP (core/render/mux.sh measures and normalises).

## 8. Native moves

- **The stamp slam.** A big stamp or seal lands on the key word with a shake, a burst and a `slam`. *Fits content
  like:* an approval; a verdict; a "shipped" moment (Clawd v3 astronaut with `stamp`).
- **The shop counter.** Items slide onto a counter or rack one per word, each with a price tag or tick. *Fits
  content like:* a listicle of tools; a pack of skills; a comparison.
- **The x-ray / inside zoom.** A continuous push into a screen or machine that dissolves into what's inside.
  *Fits content like:* how a tool works; reverse engineering; under the hood of an app.
- **The ink splat cut.** An ink blot blooms from the hit point and opens on the next chapter. *Fits content like:*
  a mistake; a reveal; a change of world.
- **The progress prop.** One object fills, lights or levels up at the end of each chapter. *Fits content like:* a
  checklist; a journey; "3 steps".

## 9. Pitfalls of the medium

- `letter()` draws on top of everything: text-on-text overlaps. Give plates their own space; slide them out, never
  shrink them; call `flushLetters()` before a wipe.
- Builders draw the cast too small and leave the bottom 40 % empty: check the cast size rule on a sheet.
- The same prop drawn differently by each chapter: write shared props once in `src/ch/c0_props.js`.
- A boil that jitters: a missing `boilSeed(key)` before an element whose randomness count changes.
- A hook that settles before it starts, or a pull-back that reveals nothing new (scored 6/10 in review).
- Thin chapter openings (an empty laptop for a second): bring the action in with the wipe.

## 10. Engine

`engine/` (read by every film, never copied or edited for one film): `core.js` (canvas, `PAL`, easing, `kf`,
`spring`, camera `camBegin/camEnd/toScreen`, `paint`, `inkLine`, `letter`, `glow`, `iris`, render hooks),
`clawd.js` + `clawd-v3.js` (Clawd, `feel()`, `emotions()`, `move()`), `kaip.js` + `kai-v3.js` (`kai(pose, x, y, h)`,
`kaiV3`), `cast.js` (`researcher`), `timeline.js` (`shots`, `LOOPS`, `brushWipe`), `reel.js` (`chapter`, `vo`,
`voLine`, `cutAfter`, wipes, captions, `SAFE`), `kit.js` (`bgWash`, `stepHeader`, `chip`, `statCard`, `phone`,
`laptop`, `burst`), `sheets.js` (model-sheet loops). Tools: `tools/make.mjs` (vo, audio, render, verify),
`tools/look.mjs` (sheets, strips, crops, stills, clips, camera scan).

```js
// a chapter that is not in the demo: Kai hands Clawd a glowing key on "unlock"
(() => {
  const S = cutAfter('l02'), E = cutAfter('l03'), K = vo('unlock');
  chapter('key', S, E, [[S, t => {
    boilSeed('bg'); bgWash(t, '#EEF3E6', { blobs: [PAL.sap, PAL.ochre] });
    camBegin(540, 900 - 40 * seg(t, S, E), 1 + .06 * seg(t, S, E));
    kai('present', 330, 1240, 600, { talk: false });
    clawd(760, 1240, 30, emotions(t, [[S, 'thinking'], [K, 'excited']]));
    glow(560, 900, 90 * backOut(clamp((t - K) / .3)), PAL.ochre); burst(560, 900, t - K, PAL.ochre);
    camEnd();
  }]], { wipe: [PAL.sap, PAL.ochre], trans: 'splat', at: [560, 900] });
})();
```

## 11. Variation space

Each film chooses its concept world, cast (Clawd alone, Kai + Clawd, the Researcher), chapter count, palette within
§3, camera path within §6, the continuity prop, the music mood and the ending.

- **Structures:** a numbered listicle (hook → 3–5 items → CTA); a before/after (the pain, the tool, the result); a
  myth-buster (claim → test → verdict stamp).
- **Openings:** the payoff already happening (a stamp mid-slam); a problem at full speed (a bag sliding into a
  scanner); a scale break (a tiny Clawd next to a giant screen).
- **Endings:** the continuity prop completes (the bar fills, the rack is full); the hook's image returns, solved;
  Kai and Clawd point at the keyword card.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your storyboard exists.
