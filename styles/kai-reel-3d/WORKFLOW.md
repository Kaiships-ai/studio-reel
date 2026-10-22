---
name: ksa-reel-3d
description: Make one 3D reel for @kaiships.ai with Clawd from the casting book (97 roles), voiced by Gemini TTS in one take, from an idea to a verified MP4. Two modes. `skit` = Blocky Kai and Clawd sitting together, a short funny dialogue about AI tools (Kai says skit / kịch ngắn / Kai-and-Clawd dialogue, a Morphy-style two-character reel). `listicle` = one narrator, 4–7 chapters (a list of tools or the steps of one skill), a new world per reel invented by Claude, Clawd plays a role in every chapter and moves as much as the hand-drawn reels (Kai says listicle 3D, reel 3D như reel11 / như reel COURT, reel listicle Clawd 3D). The process is fixed; the story, world, set, camera and motion are the builder's creative call. Trigger: /ksa-reel-3d [skit|listicle]
---

# ksa-reel-3d · two modes (2026-10-17)

| Mode | Read | Status |
|---|---|---|
| `skit` | this file, top to bottom (it is the skit mode, unchanged from ksa-reel-skit v1.3) | proven: reel57–62 |
| `listicle` | [LISTICLE.md](LISTICLE.md): it reuses this folder's template, cast, voice, check tools and hard rules, and replaces only the dialogue parts | new, first reel built with full gates |
| `listicle` kit | `bash new-reel.sh reelNN-slug --listicle` copies `listicle/` (reel63 v2: blur stage, camPath kit, router, bg, levels, specs) | proven: reel63 v2, Kai 100/10 (2026-10-18), `OpenMontage/projects/published/reel63-coding-3d/renders/reel63-coding-3d-v2.mp4` once posted |

No mode given: a dialogue idea = `skit`; a list of tools or the steps of one skill = `listicle`. Kai, 2026-10-17: never change what works in the skit mode; listicle-only changes go in LISTICLE.md or in the reel's own folder.
The old City draft (Tripo Kai, Kaiships City, reel54) is archived at `z-archive/skills-unused/ksa-reel-3d-city-v0/`.

# skit mode · ksa-reel-skit v1.3 (2026-10-17)

Born from morphy-clone-02 (v4 approved, then the voice hunt: ElevenLabs → IndexTTS → edge → **Gemini "quá pick"**).
We don't clone other creators any more: the inspiration is a seed, the skit is ours.

| | |
|---|---|
| Reads | this file · [SKIT-WRITING.md](SKIT-WRITING.md) · [VIRAL-PATTERNS.md](VIRAL-PATTERNS.md) · `kaiship-business/02-content-funnel/sources/skit-refs/` · [VOICE.md](VOICE.md) · [MOTION.md](MOTION.md) · [SFX.md](SFX.md) · `template/ref/` |
| Start | `bash new-reel.sh reelNN-slug` → `OpenMontage/projects/reelNN-slug` (template = engine, Blocky Kai, Clawd, render, review tools) |
| Writes | `BRIEF.md`, `vo/script.json`, `STORYBOARD.md`, `src/set.js`, `src/reel.js`, `audio/mix.wav`, `renders/<slug>.mp4`, `renders/cover.png`, `REVIEW.md`, `QA-REPORT.md` |
| Gate | **Two: Kai approves the script** (`vo/script.json` as a table), **then the storyboard sketch** (`storyboard.html`, direction only). Nothing else waits for Kai. Never post or upload. |
| Done when | MP4 + cover + `CAPTION.md` exist, hook ≥ 8/10 (new format), `REVIEW.md` has no ❌, `vo/voice-qa.md` clean → hand Kai the MP4 + results table. Posting, funnel test and 48 h numbers belong to `ksa-ig-magnet` / `ksa-week`, not this skill |
| Folder | Build in `OpenMontage/projects/reelNN-slug` (next free number in `posts.csv`; reel57 = the first skit) → move to `backlog/` when done → `published/` after posting; fix old `projects/<name>` paths on every move |
| CTA | Keyword-led DM flow (ksa-ig-magnet) leading to the website + Discord (Skool stopped 2026-10-18): ONE uppercase word, checked unused in ChatbotX. It lives in the caption and the end-card text; caption goal = Discord join (Kai 2026-10-17, Skool replaced by Discord 2026-10-19): hook line from the skit's own facts · ONE line of why/fix · "💬 Comment <KW>. I'll DM you <gift> + the Discord invite + website link, where I share how I ship with Claude Code." · 3 hashtags; never promise community content that doesn't exist yet; the spoken last line stays the joke unless Kai says otherwise |

## The frame: fixed vs yours

| Fixed (the skill decides) | Yours (go all out) |
|---|---|
| Cast: Blocky Kai (`assets/blocky-kai-talk.glb` + `src/kai-talk.js`) + Kai's Clawd (`engine/clawd3d.js` style `flat` + headband + jacket, 2 slot eyes, no mouth) in one of the roles from `cast/` (casting book) | The story, the twist, every line |
| They sit together in one place, 9:16, hard cut to whoever speaks | The set, its props, palette, light (`src/set.js`) |
| Voice: Gemini TTS, 2 voices for the whole reel, ONE call (VOICE.md) | Shot list, angles, push-ins, rhythm of cuts |
| Every line has a motion beat or a reaction; Clawd acts in every shot | Which motions: hops, celebrations, flinches, faints (MOTION.md) |
| Every hit keyed to a spoken word (`W(line, word)`), never a hard-coded second | SFX design and music (SFX.md) |
| Checks: voice QA, page audit, onion/speed, one verifier per round | Captions look (readable, clear of heads) |

## Workflow

```
seed idea ─→ 1 script ─→ ⛔ Kai approves ─→ 1b storyboard sketch ─→ ⛔ Kai approves ─→ 2 voice (run plan → Kai first) ─→ 3 build ─→ 4 check ─→ 5 hand over
```

0. **Run plan (right after Kai approves the storyboard sketch, before any voice call).** Send Kai a short plan: how many reels at once,
   builders (1 per reel, Opus low) and verifiers (1 per reel per round, max 2 rounds), what Kai gets and when (only the MP4s), Gemini
   calls expected (~3 takes per reel), and the steps the orchestrator does itself (voice pick, cover check, ship). Kai, 2026-10-17.
1. **Script.** `new-reel.sh`, fill `BRIEF.md` (idea, the fact + source, closest reference reel). Write `vo/script.json` per
   SKIT-WRITING.md (20–28 lines, 40–55 s, the viral shape from VIRAL-PATTERNS.md). Score it with the viral scorecard (one evidence line per item);
   below 8/10 rewrite before Kai sees it. One short verifier pass re-scores it before the gate (the "viral score"; the "hook score" in Done-when is separate). Send Kai the gate package (SKIT-WRITING.md § What Kai sees) and **stop until Kai approves**.
   Changes Kai asks for = new table.
2. **Voice** (VOICE.md). `vo/make_vo.py` = one Gemini call → `vo/vo.wav`, voice stems, `src/vo.js` (line + word times), `src/vo_env.js`
   (mouths), `vo/voice-qa.md`. Any ❌ or "extra speech" row = new take (`--take N` re-cuts an old one, no API call);
   ⚠️ "whisper missed it, voice present" = listen to that line, re-take only if it really is wrong.
1b. **Storyboard sketch (Kai, 2026-10-17: "kiểu storyboard này rất hay").** `new-reel.sh` copies `storyboard.template.html` → `storyboard.html`
   (reel62's sketch: rough.js 9:16 panels, one set panel on top). Rewrite its `P` array (≈ 10–12 key beats: line, shot `wide|two|kai|clawd|screen`,
   sky/light, screen state, note, music) and the set text, render a headless screenshot to check it, `open` it, and send Kai 5–8 lines
   on the set. Do it fast (one pass, no polish). **Mindset: Kai approves the direction (set, light arc, screen states, the anchor →
   twist, music arc), not the shots.** The builder keeps full creative freedom inside it: angles, cuts, motion, extra props, better
   ideas than the sketch. Only a change to an approved direction item goes back to Kai.
   **Cast Clawd (Kai, 2026-10-17: Clawd is an actor).** Read `cast/roles.json` (98 roles in 19 groups: id · sign · use · risk; the pictures are
   `cast/img/<id>.jpg`, Kai browses `00-journal/html-visualization/clawd-casting.html`). Pick the role whose `use` fits the story, or
   `kai-default` (red >>> headband + zipped red jacket) when none fits better; put the role id + its card image in `storyboard.html` with one line
   on why. Kai approves it with the storyboard. In the build: `loadClawdDefault(scene, scale, '<id>')` (`src/cast.js`); for `kai-default` pass NO role
   (`loadClawdDefault(scene, scale)`): `'kai-default'` is a book id only and throws "role not built yet"; set props (fire, chair,
   arrow) come with the role unless the reel passes `noSet`. A role that isn't in the book yet: add it to `engine/roles/data.js` + a build in
   `engine/roles/<batch>.js` (kit rules in `engine/roles/kit.js`: eyes always visible, no mouth, nothing dark under the eyes), then
   `bash cast/build.sh <reel>` to refresh the pictures, JSON and HTML. Real people, anime and Ninjago = costume nod only.
3. **Build.** `STORYBOARD.md` first (it starts from the approved `storyboard.html` beats): per line → shot, Kai beat, Clawd beat, screen/prop change, SFX, the WORD that fires it.
   Then `src/set.js` + `src/reel.js`. The template page runs reel61-force-push's `reel.js` (template refreshed 2026-10-17: both-heads caption guard, short-shot fold, per-word SFX duck) on its own old `src/vo.js`; once
   your voice step writes the new `vo.js`, that page throws until you rewrite `reel.js` for your lines. Read it first for the
   patterns (`W(line, word)` = a word's time, `camFor`, `kai()`, `clawd()`, captions, `__cues`). **Keep the `window.__dbg` /
   `window.__cues` contract** (fields read by `review/audit.mjs`). Motion numbers only from `src/motion.js`. Pure function of t,
   no `Math.random` (use `hsh`). Key hits only to words without `est` in `src/vo.js` (est = whisper missed it, time estimated).
   **First-render rules** (each is a verifier round-1 finding on reel60/61; build them in, don't wait for review):

   | Area | Rule |
   |---|---|
   | Hook | Frame 0 = the speaker's face already in the "O" panic shape (a closed Kai mouth reads as a calm smile). One text block in the first second (the hook title IS line 1, no POV plate + caption). Motion before 0.3 s, no still screen. Hook SOUND too (Kai, reel62): a low hit (< 2 kHz) on frame 0 + one recognisable cue in the first word gap that says the problem (alert beep, alarm, glitch) |
   | Captions | Declare `capY(shot)` in `reel.js` and export it in `__dbg`. A caption never covers a head or a screen payoff text ("✓ copy saved", the number, the branch name): move it per shot |
   | Button | The last line's caption reveals word by word on the spoken words (never shows the punchline before it is heard). Its shot holds ≥ 1 s |
   | Shots | Every shot ≥ 12 frames: drop a speaker shot that a screen insert would cut sooner (template `SHOTLIST` fold) |
   | Frame | Faces and eyes inside x ≤ 900, y ≤ 1536 in every shot, incl. the edge of the other character's shot and the end card. Screen text breaks lines to fit the panel |
   | Sound | Hits keyed to a word's END plus its measured tail, never `e_(line)` (whisper line ends run 0.1–0.15 s early). Per-word 2–8 kHz duck in `sfx.py` |
   | Screen | Only the script's numbers; no counters (show the final number static) |
   | Light | Practical/prop lights near a character reach ≤ 0.15 m (the branch glow turned Clawd's legs lime); no alarm glint in Clawd's eyes |
   | Close | Kai's mouth closed after his last line (the freeze too); end card on a solid plate; cover = the "O" face + hook text, both characters if possible. The last shot ACTS (sigh, head shake, look to the payoff), never a still freeze (Kai, reel62: "Kai đơ thế trông chán") |
4. **Check** (shell: `export PATH=/opt/homebrew/bin:$PATH`; Python: `uv run -q --python 3.12 --with numpy --with scipy --with matplotlib --with pillow python …`).
   - Sheets: `node render/sheet.mjs --page reel.html --from 0 --to <T> --n 24 --size 270x480 --out review/sheet.png`.
   - Page audit: `node review/audit.mjs` → `review/audit-page.json` → `review/clawd_speed.py`.
   - Onion on a hero beat: `node render/shot.mjs --start a --end b --fps 30 --size 540x960 --out renders/beat.mp4` (frames stay in
     `frames/`), then `review/onion.py review/onion.png <frame pngs>`.
   - Sound: `node render/dbg.mjs "JSON.stringify(window.__cues())" | grep -v -e LOG -e ERR > audio/cues.json` → SFX + music (SFX.md)
     → `audio/mix.wav` → `review/audio_audit.py`.
   - **Gate before any 1080p render:** `node review/audit.mjs` + the mix, then `uv run -q --python 3.12 --with numpy --with scipy python
     review/gate.py` → `review/gate.txt`. Every FAIL fixed, every WARN looked at (the call goes in REVIEW.md). It checks shot length,
     button hold, caption vs heads, IG safe zone (face/eye edges), Kai's mouth in silence, hook frame 0, SFX vs words (2–8 kHz, ≥ 6 dB under),
     screen numbers and counters. Paste `gate.txt` into REVIEW.md.
   - Review renders at 540×960. **One verifier per round: round 1 checks taste (hook, rhythm, acting, sound-off read) on a gate-clean
     render; a round 2 only when round 1 finds a ❌.** One `REVIEW.md` updated in place.
   - **Every ✅ in `REVIEW.md` cites a measurement** (frames, dB, px, time), never "looks fine": in reel60/61 round 1 the builder's own
     ✅ for captions, SFX-over-speech and the hook were all wrong. The orchestrator opens the sheet and the cover itself before hand-over
     (both covers were swapped: a closed Kai mouth reads as a calm smile, so pick a frame with the "O" panic face + hook text).
5. **Render + hand over.** `node render/shot.mjs --fps 30 --size 1080x1920 --audio audio/mix.wav --out renders/<slug>.mp4`
   (`src/stage.js` has no motion blur: the skit look is crisp, so no `--sub`). Cover: see § Cover / thumbnail below (the series cover,
   not a reel frame).
   Measure LUFS on the rendered MP4 itself (`ffmpeg -i <mp4> -af ebur128=peak=true -f null -`), never on a mono probe: reel62's mix read −14.1 mono and shipped −11.1 stereo.
   QA-REPORT, then Kai gets the MP4 + a results table (what · output · evidence · status).

## Cover / thumbnail (eye layout, Kai approved the look 2026-10-20)
One series look for every reel cover and thumbnail (3D and hand-drawn reels). Gold = `OpenMontage/projects/covers-diorama/gold-tile.png`
("The client said it's great. / DAILY LIFE · EP 1"): Kai at a desk at eye level, night city window, monitor behind him, Clawd beside, dark
title card at the bottom.
- **Engine:** `OpenMontage/projects/covers-diorama` (`cover.html` + `src/cover.js`, `layout=eye` is the default). One cover:
  `node render/sheet.mjs --page cover.html --times 0 --size 1080x1920 --nolabel --q "<query>" --out renders/eye/NN-<code>.png`
  (`export PATH=/opt/homebrew/bin:$PATH`). Whole grid: add a row to `titles-eye.tsv` → `python3 render/all.py titles-eye.tsv`.
- **Row = one cover:** `tag` (`<Series> · EP n`, n counted from `02-content-funnel/posts.csv`) · `title` (sentence case, ≤ 2 short lines, ends with
  a period) · `hl` (how many last words get the series colour) · `col` (series colour: Kai & Clawd `#E9BA4F`, Plugins `#EE8A4E`, Claude Code tips
  `#7FB8F0`, Free tools `#5EC4A8`, AI skills `#C9A0F0`) · `sitt` 0.5 typing or 2.6 chin on hand (chin rows: `mugx=0.0 mugr=0.038 mugh=0.1`, the mug
  hides a strap crease) · `mouth` closed / small / open (+`mopen` .5) / O (warnings) · `sky` night / dusk / rain · `flip=1` mirrors the set (never on a
  chin row). The role (Clawd costume) comes from `ROLES` in `render/all.py`.
- **Variety rule:** pick sitt + mouth from the title's meaning, then no repeat with the tile to the left or above on the grid (all.py rows are
  newest first, 4 per row); sky cycles by row number.
- **Never:** wave, point or thumbs poses: the raised mitt hand looks creepy (Kai 2026-10-20). Never mirror Kai. No eye whites (Kai rejected). No day
  sky (reads as night behind the afro). `URLSearchParams.get` takes the FIRST duplicate key: never append an override to a query that has it.
- **Check:** look at the 3:4 centre crop (y 240–1680, the IG grid view) next to the gold tile before handing over. Last verifier score 8.2/10
  (no dimension under 8); the model's ceiling is ~8.7 without changing Kai's glasses or texture (Kai's call).
- **Hand over:** the PNG paths + the grid; Kai changes covers in the IG app himself (never upload or replace without his yes).

## Hard rules (paste into every builder spec)
- **Voice:** native TTS only — no pitch shift, no time stretch, no per-line speed. Pace and emotion come from the words and `style`.
  Gemini (VOICE.md) replaces the voice *choice* in the archived City draft (`z-archive/skills-unused/ksa-reel-3d-city-v0/SKILL.md` § Motion Lab 9–10); its voice-QA gate and cut-to-the-speaker rule still apply.
- **Kai canon:** Blocky Kai, never mirrored, no hand close-ups. Mouth from `voMouth(t, words, ENV_K)`; closed between Kai's lines.
- **Clawd:** default Clawd, 2 vertical slot eyes, no googly eyes, no astronaut dome; acting in every shot it is in.
- Captions never over a head; nothing important at y > 1536 or x > 900 (IG UI). 1080×1920, 30 fps.
- Picture reads with the sound off. SFX never over a spoken word's consonants; music 15–18 dB under the dialog.
- No generic follow card, no style names or counters on screen.
- Engine fixes go into the reel; refresh the template from a finished reel with `make-template.sh <path>`; never hand-edit `template/`.

## Lessons this skill is built on
- v1.2: 41 reference skits (@agentmorphy, @base.learn) show the ≥ 900k reels share one shape: name + fear opener, one-fact
  answers, a number, hope → fall, a heart turn, a callback button (VIRAL-PATTERNS.md). reel58 repeated a taken premise + button
  pair by accident, so the overlap check is now step 1.
- Per-line TTS (IndexTTS, edge per line) sounded "dị" and flat: **one call for the whole dialogue** is what works.
- Scripts written for a voice actor (stutters, whispers on cue) break cheap TTS: **write for the engine** (SKIT-WRITING.md).
- Kai: "chỉ fix cứng quy trình, sáng tạo vẫn để cho sáng tạo" — never ship a skit that reads like a template fill.

## Close out
QA-REPORT (idea · defects · duration · LUFS · Gemini calls used · agent runs) · CAPTION.md · new motions/SFX worth keeping go to the
banks in MOTION.md / SFX.md · one line in `kaiship-business/AGENT_LEARNING.md` for a recurring defect · `make-template.sh` if the
engine improved.

## Ship (2026-10-16)
Last step: run `/ksa-ship` to self-review, commit, PR and merge the repo changes from this run (Kai standing approval; stop only on its blockers).
