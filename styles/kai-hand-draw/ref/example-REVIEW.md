> **Reference only.** This is the real storyboard/review of one finished reel (54.8 s, 7 chapters, hook 8/10), kept to show the bar and the process. It used Kai as the shopkeeper (`kai()`, now in `engine/kaip.js`) and a few helpers of its own (`dancer()`, `mood()`, `canonRack`): write yours in your film's `c0_props.js`. It ran the older loop (CLAUDE.md step 9, `REMAP`); today's is `WORKFLOW.md` step 11. Do not copy its story.

# REVIEW · reel45-vibe-v2 · rounds 1–3 + self-check · 2026-10-07

**Summary:** hook 8/10 · MP4 54.8 s, −14.0 LUFS, −2.2 dBTP, no freeze · all ❌ fixed · open after 3 rounds: ⚠ #37 #39 #47 #48 #49 #51 #52 (minor, 0.1–0.8 s each) · 👂 creator: #17 #35 #50 #53 #54

Loop per CLAUDE.md step 9: scan → mark → fix → update this file → self-check → the creator.
All times are **video time** (MP4). Chapter code runs in story time: convert with `REMAP` (src/remap.js); identical up to 27.4 s. (REMAP was a one-off for this reel; your reel runs in video time.)
Round 1 scan: 5 verifiers on `renders/reel45-vibe-v2.mp4` (54.8 s). Evidence paths are under `out/qa/`.
Status: ✅ good · ❌ must fix · ⚠ minor (fix) · 👂 creator to judge · 🔧 fix in progress

## Creator notes
| # | time | area | status | note | fix item | fixed in · evidence |
|---|------|------|--------|------|----------|---------------------|
| K1 | 0–23 | voice | ✅ | Creator: pace good, no breaks, ~95% human (benchmark) | — | — |
| K2 | 27.5–48 | voice | ✅ | Creator: voice after 23 s not OK (l07 41-word run, no breath 8.5 s) | split l07/l08 once at middle comma, words identical | `vo/make_vo_new.py`, `src/vo_new.js`; verifier: 5.4–6.2 syl/s, breaths 0.25–0.28 s, joins 0.26 s = normal joins |
| K3 | 48.3–53.0 | Creator · voice CTA | ✅ | Creator (critical): CTA broke at "comment, BUILD, below" — must be fast, continuous, human | remove commas around keyword in TTS text; regenerate voice; re-time audio; re-render 48–54.8 | make_vo_new.py l09 no commas; gaps comment→directly ≤ 0.02 s, one breath at 'yourselves,' 0.25 s; whisper hears 'build'; BUILD slam 51.0 = spoken 51.005; MP4 54.8 s, −14.0 LUFS, −2.2 dBTP · out/check/cta_final.jpg |
| K4 | c5 27.4–37.5, c6 37.5–48.3 | Creator · visuals | 🔧 | Creator: each chapter = one continuous scene (long take), many actions, camera only moves; no hard cuts (c5 at 31.2, 34.69) and no whip pans (c6 at 39.2, 42.7, 45.1). c2 lens zoom and c3 shop→shaft cut are OK | rebuild c5 + c6 as one camera path each | round 5: c5 ✅ (≤12 px/f); c6 cranes slowed, max 17.6 px/frame (travel ~260 px) · out/check/c6_r5.jpg — pending MP4 verify |

## Round 1 findings
| # | time | area | status | note | fix item | fixed in · evidence |
|---|------|------|--------|------|----------|---------------------|
| 1 | 0–3 | hook | ✅ | needs ≥ 8 | items 2–7 | self-check: 8/10 (holds) · out/qa/final1/ |
| 2 | 1.40–1.60 | hook | ✅ | SHOP sign + bugs inside caption band | keep above y 1300 during whip-out | c1_hook.js: SHOP sign + bugs above y 1300 · out/check/fix_c1.jpg |
| 3 | 1.20–1.50 | hook | ✅ | "CLAUDE CODE" sign cut by right edge while spoken | frame sign inside x 60–1020 | c1: CLAUDE CODE sign inside frame 1.2–1.5 · out/check/fix_c1.jpg |
| 4 | 1.90 | hook | ✅ | "CODEX" ~30 px, ink strokes over it | ≥ 46 px, ink off text | c1: CODEX ~50 px at 1.9, ink off sign · out/check/fix_c1.jpg |
| 5 | 2.90–3.17 | hook | ✅ | flattest stretch (rack still, the shopkeeper winks) | start slot chase / crane on "then" 2.80 | c1: slot chase + crane from 2.80, hits 2.80/2.98/3.16 · out/check/fix_c1.jpg |
| 6 | 0.00 | hook | ✅ | frame 0 medium-wide, empty sky/ground | push in, Clawd + bugs fill frame | c1: frame 0 pushed in · out/check/fix_c1.jpg |
| 7 | 0.9–2.9 | captions | ✅ | "Claude" / "Code" split on 2 cards | keep "Claude Code" in one chunk | `src/timeline.js` CAP_CHUNKS · `out/check/cap_fix.jpg` |
| 8 | 3.55–3.70 | hook | ✅ | "5 PLUGINS" reads "P5UGINS" | land 5 left of PLUGINS | round 3: 5 lands 110 px left, PLUGINS 55 px right, reads '5 PLUGINS' 3.60–3.75 · out/check/fix_c1_r3.jpg |
| 9 | 4.50–5.25 | visuals | ✅ | dust wash over the shopkeeper's hair/face (off-model) | dust behind the shopkeeper or ≤ 30 % | round 3: crate rays up-left ≤30%, right puff removed (c1); c2 crate light height 700→330 off rack · out/check/fix_c12_r3.jpg (navy blob 4.65–4.73 = 4.85 splat transition start, by design) |
| 10 | 12.07–12.17 | visuals | ✅ | stray rack digits on navy during iris-out | rack inside lens mask | c2_playwright.js: rack digits hidden until 12.22 · out/check/fix_c2.jpg |
| 11 | 5.75–7.00 | visuals | ✅ | ITEM-GET rays over the shopkeeper's glasses, reach y 1320 | rays behind the shopkeeper, clamp y < 1300 | c2: rays behind the shopkeeper, 40% shorter, stop above y 1300 · out/check/fix_c2.jpg |
| 12 | 8.0–11.9 | visuals | ✅ | thin: action only in lens, lower 40 % plain navy | bigger lens / Clawd's eye + rim below | round 3: Clawd peeks over lens rim, face y 1080–1305, haze removed, telescope body fills y 1500+; chips moved to y 230 · out/check/fix_c12_r3_s/t9_00.png |
| 13 | 11.25 | visuals | ✅ | 3rd "BUG!" ~30 px | ≥ 46 px | c2: each BUG! ≥ 48 px from pop-in · out/check/fix_c2.jpg |
| 14 | 15.00–15.07 | visuals | ✅ | Clawd falls out of chest bottom into caption band | clip Clawd at chest mouth | c3_supabase.js: dive ends in chest mouth, Clawd hidden from 80% · out/check/fix_c3.jpg |
| 15 | 14.2–15.2 | visuals/facts | ✅ | SUPABASE PLUGIN plate late, readable 0.3 s, cut to "UPABASE" | in on the word, hold ≥ 0.8 s, exit before push | c3: plate in at 14.22, readable 14.30–15.08, gone 15.16, push starts 15.12 · out/check/fix_c3.jpg |
| 16 | 14.50–15.10 | visuals | ✅ | dust wash over the shopkeeper | behind the shopkeeper or ≤ 30 % | c3: chest glow smaller/fainter, shifted off Creator · out/check/fix_c3.jpg |
| 17 | 18.5–19.5 | facts | 👂 | "EXIT" door sign not in Fact rule | the shopkeeper decides: keep as game dressing or text-free door | c3 |
| 18 | 21.43–21.55 | visuals | ✅ | STRIX plate + chips shrink to ~10 px in the whip | exit before whip or screen-space, hold ~0.8 s | c4_strix.js: full size 20.75–21.6, slides off top · out/check/fix_c4.jpg |
| 19 | 22.4–24.9 | visuals | ✅ | cracks read as stick figures; PATCHED low contrast | crack shape + rose glow; stamps on cream above plasters | c4_strix.js: filled jagged cracks + glow, PATCHED on cream plate · out/check/fix_c4.jpg |
| 20 | 27.75 | visuals | ✅ | duplicate purple "4" under slot 4 | remove | c5_skillui.js: extra 4 removed · out/check/fix_c5.jpg |
| 21 | 30.25–31.1 | visuals | ✅ | SKILLUI plate cut left; the shopkeeper under IG right rail | camera inside x 60–900 | c5: zoom ≤ 1.08, SKILLUI x 420, the shopkeeper x 740 · out/check/fix_c5.jpg |
| 22 | 31.2–34.7 | visuals | ✅ | rack off-screen 3.5 s, the shopkeeper gone | pin small rack at top | c5: rack pinned small at top (0.55 scale, digits ~25 px — verifier: check) · out/check/fix_c5.jpg |
| 23 | 34.69 | visuals | ✅ | hard cut: scroll jumps hand → laptop | whip / match move | c5: scroll continues from hand and shrinks into laptop · out/check/fix_c5.jpg |
| 24 | 41.25–42.6 | visuals | ✅ | "latest version" + "up-to-date docs" overlap and cover rack | chips below rack y 900–1000 | c6_context7.js: chips stacked left y 575/690 below rack · out/check/fix_c6.jpg |
| 25 | 42.7–43.3 | visuals | ✅ | thin: book + 3 icons, no character | keep Clawd in tools shot | c6: cheering Clawd beside the book in tools shot · out/check/fix_c6.jpg |
| 26 | 42.7–45.1 | visuals | ✅ | rack off-screen 2.4 s | pin small rack at top | round 3: rack pinned at top (0.55, y 160–270) 42.8–45.0 · out/check/fix_c56_r3.jpg |
| 27 | 39.2, 42.7, 45.1 | visuals | ✅ | hard cuts inside chapter | whip / match move | c6: whip pans at 39.2/42.7/45.1 · out/check/fix_c6.jpg |
| 28 | 38.25–39.0 | visuals | ✅ | grey smoke over the shopkeeper's hair; black slab mid-frame | tint dust, soften counter split | c6: the shopkeeper drawn over glow; split gap dim brown · out/check/fix_c6.jpg |
| 29 | 54.767 | tech | ✅ | last frame = "(not painted yet)" placeholder (flashes on loop) | c7 T_END ≥ 54.0 | c7_cta.js: chapter runs to story 54.2, last frame painted + moving · out/check/fix_c7.jpg |
| 30 | 48.4–49.0 | visuals | ✅ | thin: rack on navy, no characters | Clawd jumps in at 48.4 | c7: Clawd walks in at story 47.10, in shot 48.4–49.0 · out/check/fix_c7.jpg |
| 31 | 49.5–54.8 | visuals | ✅ | spyglass at mouth reads as cigarette; brush floats; scroll covers "UI" of BUILD; the shopkeeper hidden 52.75–53.1 | spyglass on belt, brush in hand, scroll below bubble | c7: spyglass on belt, brush in paw, scroll below bubble, the shopkeeper visible 52.75–53.1; BUILD still 51.0 · out/check/fix_c7.jpg |
| 32 | 50.0 | visuals | ✅ | "EQUIPPED" ~20 px | ≥ 46 px | c7: EQUIPPED ~70 px, full size at 50.0 · out/check/fix_c7_eq.jpg |
| 33 | 31.0–31.32 | captions | ✅ | "go through and" 0.31 s early (story-time chunk mapped through REMAP) | build caption chunks from VO_NEW_* in video time | `src/timeline.js` · `out/check/cap_fix.jpg` (31.20 shows "like", 31.35 "go through and") |
| 34 | — | voice src | ✅ | make_vo_new.py lacked the SkillUI/Context7 merge (re-run would break REMAP) | add merge step | `vo/make_vo_new.py:71` |
| 35 | 31.28–37.36 | voice | 👂 | l07b no breath 6.0 s; split halves end with flat pitch (could sound like a full stop) | the shopkeeper ear check; optional +0.2 s at "file, so" | — |
| 36 | 1.20–1.50 | hook | ✅ | (round 2 new) burst strokes cross "CL"/"O" of CLAUDE CODE sign while spoken | rays outside sign edges or behind sign | round 3: bursts behind sign, start beyond its edges · out/check/fix_c1_r3.jpg |
| 37 | 2.30–2.45 | hook | ✅ | (round 2 new) CLAUDE CODE sign cut by right edge in push-in; the shopkeeper hidden | keep sign inside x 60–1020 or fade before edge | round 4 verified on MP4 · out/qa/r4/sheets/rows.jpg |
| 38 | 48.43–49.0 | visuals | ✅ | (round 2 new) walk-in Clawd's face in caption band y 1290–1460 | higher floor / upper frame | round 3: Clawd's face ~y 1190, crane start 860 · out/check/fix_c7_r3.jpg |
| 39 | 33.0, 47.17 | visuals | ✅ | (round 2 new) "components" chip to x 1015, "outdated" chip to x 980 = right-rail zone | nudge left inside x 900 | round 4 verified: components ~x 860, outdated ~x 680 · out/qa/r4/ |
| 40 | 54.767 | visuals | ✅ | (round 2 new) 1-frame pose pop on the last frame (the shopkeeper shifts) | smooth end pose | round 3: beat pulse fades out story 53.15–53.3 · out/check/fix_c7_r3.jpg |
| 41 | 15.90–16.37, 19.50–19.57 | visuals | ✅ | (r2 new) cream paper strip at frame edge during shake | navy bg larger than frame + shake | round 3: shaft bg −600..W+1200 · out/check/fix_c3_r3.jpg |
| 42 | 13.40–13.73, 20.93–21.07, 4.40–4.47 | visuals | ✅ | (r2 new) impact ticks / ink specks in caption band | keep bursts above y 1300 | round 3: c4 ticks world y 1140 · c3 upward fan · c1 bursts upper half only · fix_c4_r3 / fix_c3_r3 / fix_c12_r3 |
| 43 | 15.23–15.37 | visuals | ✅ | (r2 new) chest fills caption band; empty navy frame; Clawd fades in see-through | clean push-in → shaft | round 3: shop cuts to shaft at ~15.18 before band, no dark fade, Clawd solid · out/check/fix_c3_r3.jpg |
| 44 | 21.73–24.6 | visuals | ✅ | (r2 new) camera pushes rack off top edge | clamp camera so rack stays in frame | round 3: rack shrinks + pins top during push (0.55, y 200) · out/check/fix_c4_r3.jpg |
| 45 | 26.53, 20.75–21.6 | visuals | ✅ | (r2 new) "find + fix" chip shrinks to ~12 px in zoom-out; AI hackers/open-source chips 43 px | exit before zoom; chips ≥ 46 px | round 3: hacker chips 60→66, find+fix slides off left by 26.51 at full size · out/check/fix_c4_r3.jpg |
| 46 | 25.73–25.87 | visuals | ✅ | (r2 new) crack marks remain on stone castle | clear cracks when castle turns to stone | round 3: cracks cleared by the stone wipe · out/check/fix_c4_r3.jpg |
| 47 | 1.47–1.57, 2.03 | visuals | ✅ | (self-check) dark smoke smudge on the shopkeeper's hair/hand | dust behind the shopkeeper | round 5: burst life .3→.26, cheek clean at 1.47 · out/check/face_x_r5.jpg |
| 48 | 1.80–2.07 | visuals | ✅ | (self-check) bug-splat ink on CLAUDE CODE sign, speck makes "CLAUBE" at 1.93 | splat off sign | round 4 verified on MP4 · out/qa/r4/sheets/rows.jpg |
| 49 | 19.80–20.10 | visuals | ✅ | (self-check) "databases" chip shrinks to ~20 px in pull-out | exit before pull-out | round 4 verified on MP4 · out/qa/r4/sheets/rows.jpg |
| 50 | 2.7–4.7, 6.0–7.3, 20.97–21.70 | visuals | 👂 | (self-check) open-source pill to x 1040, PLAYWRIGHT CLI plate to x 1015, the shopkeeper's face past x 900 — all above IG right-rail icon height | Creator: nudge left or accept | c2, c4 |
| 51 | 35.10–35.87 | visuals | ✅ | (self-check) cream paper strip at left edge (counter ends x≈26) | extend counter/bg past edge | round 4 verified on MP4 · out/qa/r4/sheets/rows.jpg |
| 52 | 34.2–34.6 | visuals | ✅ | (self-check) "DESIGN.md" label 40–45 px (< 46) | enlarge | round 4 verified on MP4 · out/qa/r4/sheets/rows.jpg |
| 53 | 38.25–39.0 | visuals | 👂 | (self-check) right half of the shopkeeper's face past x 900 (same as #50) | Creator: nudge or accept | c6 · out/qa/final2/full_1158.png |
| 54 | cover | cover | 👂 | cover reads "5 PLUGINS" + rack clearly, but doesn't name Claude Code / vibe coding | Creator: accept, or add the hook words on the cover | renders/cover.png |
| 55 | 43.20, 44.5 | visuals | ✅ | (r4) hammer badge x 870–1074, board right end x 970 = right rail | move inside x 900 | round 5: badges x 200/480/730, rack RS .75 right end ≤ x 884 (⚠ c6 rack now smaller than canon) · out/check/c6_r5.jpg |
| 56 | 43.83–45.17 | visuals | ✅ | (r4) crane puts the shopkeeper's whole face at y 1720–1900 (IG bottom UI) and through the caption band; wrench touches caption | keep the shopkeeper's face y < 1300 or off-frame cleanly during crane | round 5: the shopkeeper chin ≤ y 1280 at crane top · out/check/c6_r5_full.jpg |
| 57 | 2.27–2.47, c5, c6 | visuals | ✅ | (r4) the shopkeeper's head to x 960–1015, right eye/glasses in the right rail (supersedes 👂 #50/#53: faces are hard rule) | the shopkeeper's face inside x ≤ 900 | round 5: c1 camera cx 470/480 (face ≤ x 785); c5 the shopkeeper (720,1330,900) glasses ≤ x 875; c6 SHOPX 705 (≤ x 870) · out/check/face_x_r5.jpg, c6_r5_full.jpg |
| 58 | 45.25–47.0 | visuals | ⚠ open | (r5) dusty book + bin overlap part of the shopkeeper's body and face edge | move props off the shopkeeper | c6 |

## Passed in round 1 (✅)
- Facts: all on-screen text allowed, numbers only slots 1–5 / "5 PLUGINS", no real logos. Whisper transcript = `vo/script.txt` word for word, "BUILD" heard as keyword.
- Captions: 82 chunks match the spoken words in order; SkillUI / Context7 / BUILD spelled right.
- Audio: −14.0 LUFS, −2.2 dBTP, no clipping, voice ~17 dB over music, music to the end.
- Tech: video = audio = 54.800 s, freezedetect clean, cuts clean.
- Motion: no still stretch anywhere; rack carries items forward when on screen; COMMENT BUILD lands on the spoken word (51.00).
- Cover candidate: 38.75 s (CONTEXT7 plate, 4/5 rack, Clawd + the shopkeeper) — compare with a hook frame.
