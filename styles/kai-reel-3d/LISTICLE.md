# kai-reel-3d · listicle mode · v1 (2026-10-17, after reel63 + Kai's review)

One narrator, 4–7 chapters, one new world per reel, Clawd from the casting book acting in every chapter. The mindset is the
hand-drawn listicle's (`styles/kai-hand-draw/WORKFLOW.md`, reel11 CODING 92k views, reel45): only the drawing is 3D.
Reference for the look Kai wants: @nocodealex "12 Claudes judge your idea" (DeEH5Z9OkGk, 28.5 s, 15.2k comments): one court
world, a taped paper title per chapter, many Claudes in roles (judge, accountant juror), props flying (stamps, ballots), the
camera always moving, word captions on paper scraps.
**Measured (10 fps frame grab, 54×96 grey, mean abs diff between frames):** the reference moves at median **12.0** / p75 22.8;
reel63 v1 moved at 7.1 / 10.8 and Kai said "chưa wow, phải ADHD hơn: focus span của người xem cực kém" (9/10 overall, 2026-10-17).
Target for every listicle reel: **median ≥ 12** (step 8 measures it).
**Proven bar: reel63 v2 (2026-10-18, Kai 100/10)** = motion 18.2 (every chapter 15–22), SFX stem −21 LUFS, hits −6.5 dB vs the voice, mean
luma 119. Start every listicle from its kit (`listicle/`, step 1) so round 1 already looks like that.
A list of tools and the steps of one skill are the same job: each item or step = one chapter.
**Education variant (Kai 2026-10-20, reel65):** "education" = a short lesson on ONE tool: hook (the reference hook, adapted) → what it is in one line → how it works as a named N-step process (each step = chapter, one real example inside) → the takeaway (what to do with it) → CTA. Narrator stays Kai (Achird); Clawd teaches on screen. Not a feature list, not a hype explainer, not an install tutorial. Refs: IG Dee4Y0dJ85K, YT o8LjTSvza0E (the 4-step deep dive), YT Shorts BIg1kNKTEzM (named idea + numbered lessons). Before scripting, watch every reference Kai names and copy its shape.

**Kai, 2026-10-17:** never change what works in the skit mode. Everything listicle-only lives in this file or in the reel's
own folder. Never run `make.mjs template` from a listicle reel: it would overwrite the skit template.

## The frame: fixed vs yours

| Fixed (this file decides) | Yours (go all out) |
|---|---|
| Facts: every number and claim has a source URL in `BRIEF.md`; invent visuals, never facts | The concept: ONE world or metaphor for the whole reel, new every reel (court, kitchen, dojo…). Grep `## The concept` in `films/*/*STORYBOARD*.md` and `OpenMontage/projects/published/*/*STORYBOARD*.md` (reels before the port) first and never repeat one |
| Voice: Gemini TTS, ONE call, ONE narrator (Kai = Achird) | The set and its props, written fresh in this reel's `src/set.js`; never copied from another reel |
| Script: hook in line 1, one chapter per item, CTA keyword last | Which role Clawd plays in each chapter (`cast/roles.json`), crowds of Clawds, Blocky Kai or not |
| Hook: an event every ~0.3 s in 0–3 s, motion before 0.3 s, a hit SOUND on frame 0, hook ≥ 8/10 | What happens in each chapter: actions, gags, props that fly, land, break |
| **Camera = ADHD (Kai 2026-10-17, replaces the hand-drawn long-take rule for this mode only):** a camera beat every 1–1.5 s (whip pan, push-through an object, fast orbit, crash zoom, snap to a close-up); shot scale alternates extreme close-up ↔ wide at least every 2 s; props fly TOWARD the lens; an on-screen event every 0.3–0.5 s; fast moves rendered with motion blur. Hidden snaps (a 1-frame jump with no motion) stay banned | Which beats, where the camera flies, how chapters hand over (whip, push-through, match cut) |
| Every hit keyed to a spoken word: `W(line, word)`, never a hard-coded second | Title-plate and caption look (taped paper, scraps…), music and SFX design |
| Chapter title on screen (≥ 46 px glyphs) + word-locked captions | A continuity prop across chapters (a rack filling up, a tally) |
| Checks: page audit, `gate.py`, REVIEW.md loop, one verifier per round | |

## Workflow

```
seed ─→ 1 brief + facts ─→ 2 script ─→ ⛔ Kai ─→ 3 concept + cast + storyboard sketch ─→ ⛔ Kai ─→ run plan
     ─→ 4 voice ─→ 5 set + shared props ─→ 6 chapters ─→ 7 sound ─→ 8 check (≤ 3 rounds) ─→ 9 render + hand over
```
The two ⛔ gates hold while the mode is new (Kai: "reel đầu tiên làm kỹ"). Drop them only when Kai says so.

1. **Start + brief.** `node styles/kai-reel-3d/tools/make.mjs new reelNN-slug` (next free number in kaiship-business `posts.csv`). Fill `BRIEF.md`: topic, keyword, the
   facts with a source per claim, the closest reference reel. Missing facts: research and source them first.
   **v2 kit (reel63, 2026-10-18):** start with `node styles/kai-reel-3d/tools/make.mjs new reelNN-slug --listicle`. On top of the template you get `listicle/`: `src/stage.js`
   (sub-frame motion blur), `src/ch/kit.js` (`camPath`, `shake`, `yawTo`, `plate`, no tint on the flat Clawd), `src/reel.js` (router, wipe, captions with
   yellow number scraps + edge-dim pulse, grade B + neutral light), `src/bg.js` (background life), `src/cast.js` (`'plain'` Clawd), `audio/sfx.py` +
   `audio/score.py` (STFT consonant duck, hit clamp, voice bus −2.5 dB, earshot default), `vo/make_vo.py` + `env.py` (1-narrator Gemini),
   `review/motion.py` · `snaps.py` · `levels.py` · `ref-measure/camspeed.mjs`, `review/BUILDER-SPEC.md` + `VERIFY-SPEC.md`, and reel63's 6 chapters in
   `review/examples-ch/` (reference only). Rewrite for the new reel: `src/set.js` (the world), the CH table + titles + end-card keyword + `NUMW`/`NUMT`
   (the number words) in `src/reel.js`, and `src/bg.js` (2 layers: something that passes every ~2 s + something that works on the beat).
   Remaking an old reel's words? Keep its keyword: duplicate its ChatbotX DM flow at posting (`/ig-dm`), never a 2nd keyword with the same word.
2. **Script** (`vo/script.json`). `"cast": {"kai": "Achird"}` only, every line `"who": "kai"`. Write it with the hand-drawn voice
   standard (`styles/kai-hand-draw/VOICE.md` § Pace and the CTA rule): each line one flowing sentence ≤ ~28 words; line 1
   = the hook ("Don't … until …" energy, curiosity, a number); one line per item, its benefit in plain words; the CTA line said
   in one breath with no pause around the keyword ("just comment COURT and I'll send you…"). 30–45 s. Riding a hype event with a proven reel: keep the list lines verbatim; the hook names the event as the goal ("If you want to build something like Tesla's flying Roadster, …these four plugins") and the opening shot recreates the event in our world as the source's FULL action sequence, readable start to end (reel64: drive → up the vertical ramp → flip at the top → drop on jets → slam down into smoke, from a frame-grab of the source; a mid-air fragment was not enough, Kai 2026-10-19). Before building that shot, grab the official clip at 0.5 s steps and write per shot: camera angle (rear / front tele / 3/4 tele / top-down…), which way the object turns, and on which side it lands; sketch it as a storyboard HTML with a camera map per frame and get Kai's yes (reel64: flip went the wrong way and the camera was invented; Tesla's own reel = 4 locked tele angles, Kai 2026-10-19). `style` only from calm,
   confident, curious, excited, warm. Send Kai the script as a table → **stop until Kai approves**.
3. **Concept + cast + storyboard sketch.** Before the world: **measure the reference reel** Kai names (or the @nocodealex one). Fastest: `yt-dlp --cookies-from-browser chrome -o ref.mp4 <reel>` (worked 2026-10-20, reel65; Chrome is logged in to IG). Without cookies yt-dlp
   is blocked by Instagram's login wall; the Orca browser is logged in, so grab frames from the page's `<video>` with a canvas:
   `orca tab create --url <reel>` → `orca eval --expression "(async()=>{const v=document.querySelector('video');v.muted=true;v.pause();
   const c=document.createElement('canvas');c.width=270;c.height=480;const g=c.getContext('2d');const o=[];for(let i=A;i<B;i++){
   v.currentTime=i*0.1;await new Promise(r=>v.onseeked=r);g.drawImage(v,0,0,270,480);o.push(c.toDataURL('image/jpeg',0.8))}
   return JSON.stringify(o)})()" --json` (30 frames per call; the JSON is at `.result.result`) → frames → `ffmpeg -framerate 10` → the
   motion metric (54×96 grey, mean |Δ| per frame; median + p75). Screenshots don't work: a login pop-up covers the video. Write the
   numbers and 3–5 things the reference does that we don't into `BRIEF.md`. Then pick the world. Cast one role per chapter from `cast/roles.json` (pictures in
   `cast/img/`); a role that does not exist yet goes through the skit mode's step 1b (add it to `engine/roles/`). Rewrite
   `storyboard.html`'s `P` array as one panel per chapter: world corner, Clawd role, the main action, camera path, title text.
   Send Kai 5–8 lines on the world → **stop until Kai approves the direction** (not the shots). Then send the run plan
   (builders, verifier rounds, Gemini takes, what Kai gets and when).
4. **Voice.** `vo/make_vo.py` as in VOICE.md (3 takes, pick the best, `--take N`). Gemini needs exactly 2 speakers: copy reel63's
   `vo/make_vo.py` + `vo/env.py` into the new reel (a silent 2nd speaker `unused: Puck`; env.py tolerates a missing Clawd stem; NUMW for
   digits 1–4, 20, 25, 54, 350, "%"). Never edit `template/`. Pace: style "fast, punchy" gave 33 s vs 42 s for the same words (Kai picked it).
   If a render tool says Playwright's browser is missing (a disk clean-up removes `~/Library/Caches/ms-playwright`): `pixi run studio install` (it reinstalls chromium-headless-shell).
   One line changed later (e.g. the CTA keyword): Gemini call with that line + the line before for context, cut at the silence before it, splice
   into the chosen take, `make_vo.py --wav` (or `--take N`) re-times every word; the CTA must be said in one breath (reject a take that pauses after "Comment").
5. **Set + shared props first.** Write `STORYBOARD.md` (per chapter: time range, Clawd role, actions keyed to words, **a camera beat
   list (one beat per 1–1.5 s: whip / push-through / orbit / crash zoom / ECU snap, each keyed to a word)**, props that fly at the lens,
   SFX words). Motion blur: the template `src/stage.js` ignores `__frame`'s sub-frames (the skit look is crisp), so the listicle reel
   adds sub-frame accumulation in ITS OWN `src/stage.js` (render with `shot.mjs --sub 4 --shutter 0.5`); never in `template/`. Then `src/set.js` with the world and every prop used in more than one chapter, with canon sizes (reel45: 6 builders
   drew a shared rack 6 ways). `src/reel.js` becomes a chapter router: chapter boundaries from `vo.js`, title plate, captions,
   transitions, and it keeps the `window.__dbg` / `window.__cues` contract that `review/audit.mjs` reads.
   **Look defaults (Kai 2026-10-18):** grade B (exposure 1.0, vignette 0.30) + neutral key light (#fff1e0, gain 1/1/1); never tint a flat Clawd
   (its #DF7440 texture × a tint = red). A background-life layer from frame 0, soft (behind focus), no text, out of the title and caption bands.
   A look question from Kai (colour, background, a new layer) = 3 still variants on one sheet (`sheet.mjs --q <param>`, mean luma per variant)
   before any full render; he picks, then it goes into the whole reel.
6. **Chapters.** One `builder` per chapter file `src/ch/cN.js`, in parallel. Each spec pastes the hard rules below and the
   skit WORKFLOW.md § Hard rules verbatim. Motion numbers only from `src/motion.js` (+ MOTION.md); pure function of t, no `Math.random`.
   Alive: something moves, reacts or lands in every frame; Clawd acts in every shot it is in. Each builder measures its own chapter
   with the motion metric (step 3) on a 10 fps sheet render and stays at median ≥ 12 before reporting.
   **v2:** each builder gets `review/BUILDER-SPEC.md` filled in (project, chapter times, the camera-beat row). Builders measure motion on a
   BLURRED render (`--sub 4 --size 540x960`; blur costs 1.5–3 vs an unblurred 10 fps render) on t0 + 0.15 → t1 − 0.15 (the wipe inflates it),
   plus the weakest half second. The orchestrator checks every chapter sheet itself before the verifier and sends fixes back to the same builder.
7. **Sound.** SFX + music per SFX.md: each SFX on its word, music ducked under the voice, −14 LUFS on the rendered MP4.
   **Levels (Kai 2026-10-17: "SFX hơi bị chìm, giọng hơi to"):** reel63 v1 measured voice −14.0 LUFS, SFX stem −32 / −35.5 LUFS,
   each hit 16–22 dB under the voice. Target: each hit 4–8 dB under the voice (SFX.md's bar 3–6 dB), SFX stem ≈ −20 LUFS, the
   voice bus −2…−3 dB before the master. Duck ONLY the 2–8 kHz consonant band (`word_duck`, margin −6 dB); no full-band duck (it buried
   every hit). Measure `ebur128` on `audio/vo_m.wav`, `audio/sfx.wav`, `audio/music.wav` and write the three numbers in QA-REPORT.
   **Proven settings (reel63 v2, in the kit):** `word_duck` gains only the 1–12 kHz STFT bins inside words (margin −9.5 dB pre-bus = −6 dB on
   the final mix) + a 2nd pass on 300–1000 Hz only in the 10 ms windows that still fail gate.py's meter; each hit's first 150 ms clamped ≤ −6.5 dB vs
   median speech; voice + music bus −2.5 dB; 20 ms fade-in on sub-drop/sputter onsets. Measure with `review/levels.py`: voice ≈ −14.6, SFX ≈ −21,
   music ≈ −28 LUFS, hits median −6.5 dB, 0 words within 6 dB at 2–8 kHz. gate.py's 2–3 leftover windows at −64 dBFS in voice gaps = false alarm.
8. **Check.** The skit mode's step 4 tools: sheets, `review/audit.mjs`, `review/gate.py` (rows that only fit a dialogue, such as
   Kai's mouth in silence or speaker cuts, are marked n/a in REVIEW.md with one line why). Then the hand-drawn review loop:
   one `REVIEW.md`, a row per segment ✅/❌, every ✅ cites a measurement, fix only the ❌, max 3 rounds + 1 self-check. Verifiers
   that did not build: hook (0–3 s, ≥ 8/10), visuals per chapter, facts + captions, voice + audio, tech (motion metric median ≥ 12
   vs the reference, no hidden 1-frame snaps, `freezedetect=n=0.003:d=0.7`, video = audio ±1 frame). **A verifier number that uses a
   different yardstick than the rule (reel63: SFX measured full-band while the rule is 2–8 kHz) goes back to the rule before anyone
   fixes it:** reel63 v1 lowered every hit to satisfy a full-band check and buried the SFX.
   **v2:** the verifier gets `review/VERIFY-SPEC.md` filled in. Verifiers have no Write: they put their REVIEW section in the scratchpad and the
   orchestrator appends it to REVIEW.md. reel63 v2 went 13/9 → 20/3 → 17/1 ✅/❌; with the kit + the hard rules below, round 1 should start near round 3.
9. **Render + hand over.** The skit mode's step 5 commands (MP4, cover with the hook text and Clawd's face, LUFS on the MP4).
   QA-REPORT (concept · roles · defects · rounds · Gemini calls · agent runs + time to build the world), CAPTION.md per the skit
   CTA row, then Kai gets the MP4 + a results table. Ship as WORKFLOW.md § Ship.

## Hard rules (paste into every chapter builder spec)
- 1080×1920, 30 fps. Nothing important at y > 1536 or x > 900 (IG UI). No face or key object in the caption band on any frame.
- Every number on screen comes from the facts in `BRIEF.md`. Invent visuals freely, never facts.
- Camera = ADHD (see the frame table): a camera beat every 1–1.5 s keyed to a word, ECU ↔ wide alternation, props at the lens, an event
  every 0.3–0.5 s, motion blur on fast moves. No hidden 1-frame snaps (a jump with no motion in between). Your chapter's motion metric
  median ≥ 12 (measure it).
- Nothing drawn over Clawd's face (props, titles, debris). Title plates and labels leave the frame before a zoom; never tiny text.
- Clawd canon from `cast/` (2 vertical slot eyes, no mouth); load with `loadClawdDefault(scene, scale, '<role>')`, or no role for
  `kai-default`.
- Only edit your own `src/ch/cN.js`. A change to a shared file (`set.js`, `reel.js`, `engine/`) goes through the orchestrator.
- Every Clawd the viewer should read faces the camera: `yaw = yawTo(pos, camPos)` (Clawd front = +z) or 60 % of the way there; both eyes
  visible on the sheet. Hero body ≥ 18 % of frame width; action in y 0.22–0.66. No helmet/visor over eyes (reel63: the f1 role hid them).
- Set colour ≠ cast colour (reel63: red crew + red roles on a red garage wall read as one blob → teal wall).
- Plates/tags never cover a face; numbers on screen stay inside x 0.12–0.8 and in focus while they pop.
- Eyes count only when BOTH read on the sheet: the face point ignores occluders (cockpit rim, hose, gauge, foreground crew). A driver's eyes sit
  at the cockpit rim: close shots go in front of the face and above the rim (or the story lifts him).
- Plates and numbers: project their 4 corners per frame; inside x 0.12–0.8, y 0.18–0.66, never under the title strip (y 0.10–0.17); scale
  them away right after their beat (no cut fragments later). Number glyphs ≥ 90 px when they are the beat.

## Lessons
- reel63 (PIT STOP, 2026-10-17, first listicle reel): router + `src/ch/kit.js` + one builder per chapter worked; copy reel63's `src/reel.js`
  (router: chapter table, taped-paper title, word scraps, checkered wipe, end card, `chapterOffset()` = ONE sideways camera offset per chapter
  for the IG safe zone; a per-frame offset made 5 hidden cuts) and `src/ch/kit.js` (`pose`, `yawTo`, `W`, `plate`) as the start of the next reel.
- Round 1 → 3: 23 ❌ → 14 → 4 (hook 6 → 7 → 7.5/10). Most fixes were framing (faces turned away, plates off-frame, things off their word).
  Write those rules into the first builder spec (hard rules above) instead of finding them in review.
- Music: `audio/score.py` racing groove at 124 BPM (hook pulse, cut on the stop word, groove in on the list, drop for the lamps, hit on the launch).
- SFX: `audio/sfx.py` has a library KIT + an earshot KIT (`SFX_SET=earshot`); the frame-0 hook hit must skip the speech duck (low band only).
- Kai's review of reel63 v1 (9/10, 2026-10-17): (1) camera + motion "chưa wow", wants ADHD pacing like the reference → the camera rule
  above replaced the long take for this mode; (2) SFX buried, voice too loud → the level targets in step 7. reel63 v2 applies both.
- reel63 v2 (2026-10-18, Kai "go all out", no gates): copy reel63's `src/stage.js` (sub-frame motion blur, `__frame(t, sub, shutter, fps)`),
  `src/ch/kit.js` `camPath(t, K)` + `shake()` (keys at words; ease in/out = no snaps), `review/motion.py` (the metric), `review/snaps.py`
  (hidden-snap check on camspeed.mjs) and `review/levels.py` (stems + per-hit + 2–8 kHz) into the next listicle reel. Result: motion median
  7.1 → 15.8 (every chapter ≥ 13.5), SFX stem −35.5 → −21 LUFS, hits −21.7 → −6.5 dB vs the voice, 0 words within 6 dB in 2–8 kHz.
- Measure motion on a `--sub 4` render (blur lowers the metric 1.5–3 vs an unblurred 10 fps render) and on the window t0 + 0.15 → t1 − 0.15
  (the router's checkered wipe inflates it). A chapter's weakest half second is usually the payoff hold: give it a push + events (sparks, hops).
- Sound: duck ONLY the consonant bins by STFT gain (sfx.py `word_duck`), never a broadband gain measured in a band (that is a full-band duck).
  gate.py's order-4 2–8 kHz meter also hears a hit's body below 1 kHz, so a 2nd pass ducks 300–1000 Hz only in the 10 ms windows that still
  fail; 20 ms fade-in on sub-drop/sputter onsets. The 2–3 gate windows left sit at −64 dBFS in voice gaps (verifier: false alarm).
- Close shots on a driver in a cockpit: the eyes sit at the rim (reel63: y 0.41 vs rim 0.42) → camera in front of the face and above the rim, or
  lift the driver in the story (panic jump). Builders report "eyes visible" from the hero face point, which ignores occluders: check the sheet.
- Playwright's browser can vanish after a disk clean-up: `npx playwright install chromium` in the reel folder.
- Colour: never tint a 'flat'-style Clawd's material — its body already has a #DF7440 texture, and `color` MULTIPLIES it (reel63 kit.js '#e8893a' → deep red #CA3B0A; Kai: "Claude hơi đỏ"). Neutral key light (#fff1e0) + neutral gain keep Claude orange. Kai picked brighter (mean luma 90 → 119) from a 3-variant still dry run: show stills before a full re-render.
- reel64 (LAUNCH NIGHT, 2026-10-19, hype remake of reel63 on the flying Roadster): motion has a CEILING too: chapters at 37–55 read as chaos (a car
  fragment, grey slabs at the lens) → target 18–28 per chapter, every beat a readable hold ≥ 0.35 s, whips 0.15–0.25 s between holds; a short payoff
  flight may run higher if it reads. A hook built from the source footage's frame-grab (drive → climb → flip → slam) read better than any fragment edit.
- Router (reel64 kit fix): props a chapter parents to car.g or the scene leaked into every chapter → `src/reel.js` now records each chapter's added
  objects at build time and shows them only while that chapter is active. Copy reel64's `src/reel.js` for the next listicle.
- A hard-edged black block in the sky = a NaN in a shader (reel64: `pow(1.-vY,1.6)` at a cone tip) spread by bloom: clamp before pow.
- reel65 (TEARDOWN CLASS, 2026-10-21, first EDUCATION reel, Kai "make all out", no gates): every chapter builder's round 1 framed the hero Clawd as a
  red block filling the lower half and cut the lesson objects (calculator display, dino, cards, signs) at the frame edge. Paste into every education
  builder spec: **the lesson object is the subject of every shot; the teacher ≤ 35 % frame width with whole head + both eyes; every number/rule
  fully inside x 0.12–0.8 and held sharp ≥ 0.5 s on its word.** Education chapters measured motion 8–13 at that framing (refs = talking heads
  2–4): accept ≥ 8 when every rule reads; never buy motion with tighter shots. Advisor pass (hormozi-consultant Audience 2026) before the script
  gave the hook (calculator proof first), the clean-room share beat and the CLONE gift.
