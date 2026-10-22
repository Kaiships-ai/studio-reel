# KICKOFF · morphy-clone-02: Agent Morphy reel #2 ("switch to Haiku") with our cast (2026-10-14)

Brief (kaiship-v1 for Kai, verbatim core): "reel #2 of our Agent Morphy clone series. Reuse everything from projects/test-morphy-clone …
Blocky Kai talk GLB + kai-talk.js, Clawd2, Kai voice = edge-tts Brian, Claude voice = ElevenLabs River, per-line pace matched to Morphy
(measured on demucs stems, not whisper word ends), 'Claude' spoken as 'Clawd' cut from the whole sentence, music bed rebuilt from
Morphy's stem with our synth (never his audio), neutral closed mouth, captions never over heads, audit + vs-morphy frames. … Source =
Morphy reel DePWQ17gwit, 280,856 views, 40 s … Script word for word; speakers by pitch; line starts on his measured onsets; match shot
grammar. Lean: at most 1 Sonnet builder, 2 numeric rounds, 540x960 reviews, one final 1080x1920 when audit passes."

Pipeline copied from `test-morphy-clone` (that project untouched): `src/` (stage/cast/kai-talk/motion), `vo/make_vo.py`, `audio/score.py`,
`review/audit.*`, `render/`. New for reel #2: `src/set.js` (giant keyboard + giant monitor world), `src/reel.js`, `scripts/lines.py`.

## Source (confirmed)
`ref/src/morphy.mp4` = the Crowsnest MP4 (720×1280, 30 fps, 40.5 s). whisper small.en on it reads the same dialogue as the reference
transcript `ref/t-a559dd3c-…json` ("Claude, switch to Haiku 5.5. Done. Polish the design. …Usage limit reached."); small.en drops the
two short Claude lines "Perfect." (12.4 s) and "Done." (30.4 s), which the reference transcript and Morphy's own captions both have.

## Script (word for word, 20 lines / 29 parts, speakers by f0 → `ref/speakers.txt`)
Human ≈ 94–129 Hz (204–231 Hz on the panic lines) · Claude-as-Haiku ≈ 196–240 Hz · Claude-as-Opus ≈ 138–166 Hz. "menus" in the transcript
is whisper's "menu's" (Morphy's caption: "The menu's on the logo."). Part starts = Praat onsets on his demucs vocal stem (`scripts/lines.py`).

## Decisions
- Voices: Kai = edge BrianMultilingual (TTS "Clawd" in the whole sentence, cut). Claude = ElevenLabs River for both models; the Haiku lines are
  PSOLA-shifted (Praat "Change gender", formants and duration kept) to a 220 Hz median, because Morphy's Haiku sits ≈ 233 Hz and his Opus
  ≈ 155 Hz (River native 158). Kai's panic/excited lines get an edge pitch lift (+45 / +25 / +20 Hz).
- Pace: lines with long pauses between words ("Oh, … nice.", "Okay. … That's … actually nice.", "Yes. Yes. Okay. …", "No… Stop.") are
  synthesised per part; everything else is cut from the whole sentence. "And the onboarding…" is hard-cut where Morphy is interrupted.
- Look: Morphy's world = both on a giant keyboard, giant monitor behind. Ours: same, with our own site on the monitor ("kaiships · Ship it
  while you sleep.") and Claude Code on its left; the model chip in the title bar flips opus → haiku → opus.
- Surpass (acting/story): Haiku = Clawd shrinks 20 % with a spin and bounces eagerly; each "Done/Fixed/Perfect" = arm up + sparks + the site
  changes (menu lands on the logo → logo huge → crooked); Opus = full size again, calm, scans the layout ("I see that." eyes left-right),
  fixes, polishes, builds pricing; "Usage limit reached" = red banner, the screen dims, Clawd's flame dies and his eyes shut, the music
  tape-stops (Morphy's bed dies at 34.8 s), Kai slumps chin-into-hand in the held wide.
- Clawd2 additions: `o.flame` (0..1) for the power-down (besides reel #1's `o.blink` + talking mouth). Kai stands only in the panic shot
  ('afraid' clip hands-up → 'cast_a_spell' palm thrust on "Stop."; `review/clips.png`).
- Music: his music stem → `ref/morphy-music.json`; our synth bed on his chords/times (Am7 – Fmaj7 – Am7 – Cmaj7 – Em – G – Am7 – Fmaj7 – Am),
  17 dB under the dialog, not ducked, his level arc, tape-stop at 34.75 s. SFX: sparks, 2 swaps, power-down chirp, all ≥ 7.5 dB under the VO.
- Builders: 0 of the 1 allowed (all done by the orchestrator).

## Rounds (numeric)
R1 (review-r1.mp4 540×960 + vs-morphy-r1.jpg): audit 27/27, YAVG 68.9 vs Morphy 68.8. Look notes: the "Opus fixes it" shot (CS) showed
Clawd's back filling the frame, the fix not readable → CS camera pulled back/up so the site change fills the top two thirds (`review/r2-cs.png`).
Earlier blocking passes (pre-audit, sheets r0/r1/r2): close-ups framed too tight (Kai's afro filled 80 % of the width; Morphy ≈ 45 %) →
all shot distances ×1.4–1.6; Clawd scale 0.036 → 0.05 (Opus) / 0.04 (Haiku) to match his size against seated Kai; Kai's face fill off while
standing (the light sat at seated head height and hot-spotted his hair); blink times snapped to the frame grid (2 blinks counted → 14).
R2: final 1080×1920 (`--sub 2 --shutter 0.35`) after the page audit passed → see `review/audit.txt`.
→ final 1080×1920 30 fps 40.5 s rendered after the page audit passed: audit 27/27 · part starts max |Δ| 0.14 s · pace worst 8 % (Kai) / 8 %
(Claude) · f0 Haiku 221 vs 233 Hz, Opus 158 vs 155, Kai 125 vs 110 · music A minor, roots 89 %, −16.1 vs −17.3 dB under dialog, arc r 0.93 ·
−14.1 LUFS · 18 cuts = Morphy's · lip sync 99 % / 93 % · YAVG 69.0 vs 68.8 · captions clear of heads 1214/1214 · 0 freezes.

## Result (2026-10-14)
| what | output | evidence | status |
|---|---|---|---|
| video | `renders/morphy-clone-02.mp4` 1080×1920, 30 fps, 40.5 s (Morphy 40.5 s) | ffprobe | ✅ |
| match frames | `review/vs-morphy.jpg` (Morphy row over ours at 1.5 / 6.0 / 8.2 / 11.2 / 20.0 / 39.5 s) | `review/vs_morphy.sh` | ✅ |
| audit | `review/audit.txt` 27/27 | `review/audit.mjs` + `review/audit.py` | ✅ |
| caption idea | "Haiku polished it. Opus fixed it. The usage limit finished it." | — | ✅ |

Open (⚠): Morphy's sigh at 37.8–39.3 s (unvoiced, no words) is not in ours, so that stretch has no voice. Kai's f0 is 125 Hz; Morphy's
human is 110 Hz (Kai's voice pick). Not listened to by a human yet. `frames/` holds 3.5 GB of render PNGs, safe to delete. Nothing posted.

## Follow-ups 2026-10-14 b (Kai on reel #2, verbatim from kaiship-v1)
K1: "The voice is shit. Always check the voice for any reel, never skip it. Animation isn't good yet either. The cuts are silly: why not
just cut to whoever is speaking? Clawd's motion is goofy-bad. Switch to the default Clawd; the astronaut Clawd probably doesn't fit."
→ V2 voice: every pitch-shift and time-stretch removed (`vo/parts.json`: stretch 1.0, pitch 0 on all 29 parts). Haiku = ElevenLabs Laura (native;
3 lighter voices tested by ECAPA vs Morphy's Haiku lines: Laura 0.21 / Jessica 0.04 / Alice 0.01; `review/voices/haiku/`), read with "!"
(Morphy's captions) at stability 0.3 → f0 228 vs his 233 Hz. Opus = River native, Kai = edge Brian native (the edge pitch lifts dropped too).
Pace by TTS rate/speed only; ElevenLabs lines too short at speed 0.7 are re-taken natively (seed 1–10, closest length kept): all parts ±7 %.
Hard gate `review/voice_qa.py` → `review/voice-qa.md` 7/7 (native only · whisper = script on every line · 0 clicks · flatness · pace · loudness
spread 1.5 dB · Claude/Haiku/Opus heard) + `review/voice-ab.wav` (Morphy → ours, 6 lines). The audit now fails if the voice gate fails.
→ V2 cuts: hard cut on each speaker change at the line's first frame (15), same speaker = hold; the opening two-shot holds through the 1-word
"Done."; 3 big reactions only (Clawd switching to Opus, Opus fixing the site, Kai's collapse two-shot). No dutch angle.
→ V2 Clawd: the default brand Clawd (`engine/clawd3d.js`: orange box, 2 slot eyes, stub arms, 4 legs; no dome/backpack/band), scale 0.045,
locked. Motion: talk bob (squash follows his voice, no mouth), blinks, smoothstep squash pulses on the stressed words, eye shapes (slots stay
slots), one held arm raise when he works, eyes shut + sag at the usage limit. No hops, spins, resize, float or wobble:
`review/clawd-speed.png` (speed graph), `review/onion-perfect.png` (onion of the "Perfect." beat), audit: position range 0, ≤ 2 reversals / 0.5 s.
→ final 1080×1920 re-rendered: audit 28/28 (review/audit.txt), YAVG 69.2 vs 68.8, vs-morphy.jpg updated. Nothing posted.

## Follow-up 2026-10-14 c (Kai, directly): "sao giọng của cả Kai và clawd mỗi lúc 1 khác vậy?? nó không đồng nhất … giọng phải đồng nhất chứ"
→ Cause (measured, `scripts/voice_consistency.py` → review/voice-consistency-v2.json): v2 set every line separately: Kai's edge rate went
−45…+60 %, Claude was two voices (Laura = Haiku, River = Opus) and each ElevenLabs line was its own take (seed 1–10, speed 0.7–1.2).
Claude's f0 ran 149–336 Hz across lines (14.1 st) and one line scored 0.10 against his own voice.
→ V3: ONE voice and ONE setting per character for the whole reel. Kai = edge Brian at −5 % on every line (fitted once on his sentences;
+16 only on the interrupted "…and the onboarding—"); Claude = River for all 8 lines, Haiku and Opus alike, in ONE ElevenLabs generation
(speed 0.70, stability 0.6, seed 7), cut per line. TTS-only respellings: "No no no no not like that! Stop!" and "Oh! Nice." (edge ran
"Oh, nice" into one word). Result: Claude f0 spread 14.1 → 4.8 st, ECAPA min 0.10 → 0.41; Kai 3.4 st, min 0.51. voice-qa 9/9, audit 25/25.
Trade-off: with one setting, single words ("Okay.", "Yes.", "Oh!") are shorter than Morphy's drawn-out ones (Kai median −52 %);
sentences match (Kai +2 %, Claude −14 % at ElevenLabs' slowest speed). Final re-rendered 1080×1920.

## Follow-up 2026-10-15 (Kai, directly): "not like Agent Morphy, not engaging … content funny, background + Claude's action must relate,
## Claude moves little but on the line the motion must be exactly right" → then: "single/repeated words need emotion; 'Okay, that's actually
## nice' is broken; 'Yes, yes' must be continuous; whisper a few places, like 'Claude, I try Codex'; make the best output possible."
(Kai's voice memo `ref/kai-memo/kai-memo.m4a` = a speed example only, not used as audio: yes ≈ 0.5 s each, 0.1–0.24 s apart, rising "okay".)
→ V4 voice: edge-tts can't act → the whole dialogue is ONE ElevenLabs eleven_v3 text-to-dialogue performance with audio tags
([excited], [panicking], [whispers], [sighs] …, `vo/make_vo.py` ACT). Lines cut whole (no more separately-synthesised parts) and placed on
Morphy's line onsets (latest +0.33 s). Voices by ECAPA vs Morphy (`scripts/v4_kai_pick.py`, `v4_claude_pick.py`): Kai = Will 0.73 (edge Brian
was 0.20), Haiku = Matilda 0.43, Opus = River 0.50 → Haiku and Opus are two registers again, like Morphy's. Takes: 3 whole-dialogue takes
(seeds 7/11/23) before the ElevenLabs free quota ran out (223 of 10 000 credits left): Kai + Haiku = seed 11, Opus + Haiku "Done!" = seed 23.
Consistency judged against Morphy's own acted voices on the same measure (`scripts/voice_consistency.py`, SRC=morphy):
Kai 6.3 st / ECAPA min 0.36 (Morphy 6.9 / 0.34) · Haiku 7.9 / 0.11 (6.7 / 0.11) · Opus 5.6 / 0.24 (5.3 / 0.03). voice-qa 10/10.
New line l21 (Kai's whisper suggestion, not in Morphy's script): after the usage limit Kai sighs and whispers "Claude… I'm trying Codex."
→ cut to Clawd's dead face, one eye snaps open (+ blip SFX). Reel 40.5 → 41.6 s.
→ V4 acting: Haiku stretches up proud on every "Done!/Fixed!/Perfect!", both arms up on the last "Perfect!" in front of the wrecked site,
happy-oblivious eyes while Kai panics; Opus: small calm nods, side-eye squint + lean back at Kai's whispered tattle "Haiku broke it.";
Clawd raises his arm to start the onboarding, the limit freezes him, the arm drops and he tips forward. Kai leans in to whisper the tattle,
bigger nods on "Yes, yes!". Captions = Morphy's emotional punctuation ("Done!", "No no no no— not like that! Stop!", "Okay… that's actually nice.").
Ops: the project had been moved to projects/backlog/ → two relative symlinks were broken (node_modules, assets/kai/kai-final.glb), repointed to
projects/sandbox/freestyle-kai and projects/sandbox/test-3d-studio.
