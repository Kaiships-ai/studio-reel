# Review of PR #210 (head 09149a95): MUST-FIX

What I reviewed: the PR on GitHub, its diff, and the tree at 09149a95. I used a throwaway worktree, which is now removed. The watch renders ran on the Mac Pro in a tree at ~/review-210, which is now deleted. Its fans are back on auto.

## MUST-FIX

1. `styles/stick-man/motion-lib/index.js:159` (`Elder_Gest_LookUpShade_Once_v01`, registered). The clip does the opposite of its name.
   - **What I saw** (270x480 render on the Pro, elder in a sweater, `sheet_Gest_LookUpShade_Once.jpg`, `strip_shade.jpg`):
     - From about f100 to f215 the old man bends forward. His head drops and he looks at the floor.
     - One hand comes up to his chin or neck. It never goes above the eyes.
     - He never looks up.
   - **Measured** (rig, physics on):
     - Torso lean goes up to 63 deg. His standing stoop is 21.6 to 36.5 deg. So he bends down; he does not tip back.
     - The nearest the right hand gets to the head centre is 0.375 m, at f181. No hand reaches the face.
   - **What goes wrong:** a film calls `Gest_LookUpShade_Once` for "the old man looks up at the sky" and gets a man staring at his feet.
   - **ELDER-PICKS.md:15** calls this clip "PASS". The gates did pass it, but the act is wrong.
   - **Fix:** take the clip out of `ALL`. Also remove its body file, its 7 rows in `compat.json`, its 2 catalog entries, and its MOTION-LIB row. Move it to BLOCKED in ELDER-PICKS.md. The approved scope allows no second try.

2. `Elder_Trans_SitDown_Once` and `Elder_Idle_Sit_Loop` need different seats. They are not a usable pair.
   - Sit down needs a seat top at 0.528 m and ends with the hips at 0.57 m.
   - The seated idle needs a seat top at 0.386 m and holds the hips at 0.43 m.
   - The adult pair differs by 2 cm (0.358 / 0.377).
   - Neither elder clip takes a `fit`, so a film cannot adjust either one.
   - **What goes wrong:** a film does "sits down, then waits", which is the bible's ngồi xuống then ngồi chờ on one chair. At the hand-over the hips drop 14 cm, or the figure floats or sinks into the chair.
   - No gate checks that a Trans clip ends on the seat its follow-on loop needs.
   - **Fix:** unregister one of the two clips. Or record in MOTION-LIB, the bible catalog and ELDER-PICKS that they need different seats and must not be chained. Which one is Kai's call.

## Checks 1 to 6

1. **Captures:** exactly 6 in `ref/mixamo/`:
   - sit_down_elder
   - sitting_side_look
   - reaching_out
   - standing_clap
   - sitting_clap_b
   - looking_shade

   The download settings are in `ref/mixamo/README.md` and the picks are in `ELDER-PICKS.md` (all 6 rows). OK.
2. **Limits:** `git diff origin/main..09149a95` shows no change to `*limits*.json`, `bodylife.mjs`, `motionlib.mjs` or `fits.mjs`.
   - Local `main` is stale, which is why that diff looked big; `origin/main` is right.
   - I rebuilt both claps in memory with the PR's settings. The body gate gives exactly the PR's numbers: Gest_Clap_Loop handL arc **2.88**, Gest_SitClap_Loop handR **2.03** (limit <= 0.85).
   - Neither clap is registered. `getClip('Gest_Clap_Loop','elder')` and `getClip('Gest_SitClap_Loop','elder')` throw "has no elder version". So `person({...clips:[clap]})` throws in `film.js`.
   - The skirt outfit with both seated clips throws in `must()` (blocked).
   - An elder in a sweater with the 4 clips and `age:'elder'` goes through.
   - OK.
3. **Fits rows:** I re-measured 4 of the 28 new rows at 09149a95 into a temporary table (`fits.mjs --person … --clips …`). All controls were OK.
   - sweater | Act_Give_Once: pass, -49.6 (table -49.6)
   - sweater | Gest_LookUpShade_Once: pass, -48 (table -48)
   - cardigan+shirt:office+skirt | Idle_Sit_Loop: blocked, 22 mm, bad 34 (table the same)
   - cardigan+shirt:office+skirt | Trans_SitDown_Once: blocked, 16.8 mm, bad 139 (table the same)

   The 2 skirt rows stay blocked.
   - **Nit:** the rows are stamped `"commit":"68041324"`. The clips did not exist at that commit. `commitOf()` would have written `68041324+`, so the stamp looks edited by hand. The numbers still reproduce exactly.
4. **No adult twin (Act_Give_Once, Gest_LookUpShade_Once):**
   - The body gate's shape, arc and time checks compare nothing for these two.
   - What still applies:
     - the motionlib joint, seam, feet and physics gates (the test passes)
     - STILL: the clip never freezes
     - the fits cloth rows
   - `bodylife.mjs:54` says a no-twin clip in place is held to "keeps its body's posture (the elder's stoop: test/unit/stick-motionlib.test.mjs)". That test, at `:641`, loops only over `['Idle_Stooped_Loop']`, so the new standing clips are not covered.
   - I measured them myself: both stay stooped (min lean 24.0 and 21.6 deg). They would pass, but no test enforces it.
   - Nothing checks that a clip does the act its name says. The look-up clip passed every machine check while it looks down, which is MUST-FIX 1.
   - So this is a hole in the claim. The PR does say "NOT compared" honestly, but it still marks the result as PASS.
5. **Pack:**
   - `node release/build.mjs --dry-run` exits 0: starter 3286 files, pro 3304, tmv 2611, every check passed.
   - kit.manifest `[stick]` leaves out the 4 body files.
   - `[stick_forbid]` has `mixamo`. The body files import `ref/mixamo/…` in code, not only in comments, so a leak would fail the build.
   - OK.
6. **Tests:**
   - The tests the PR changed only bump numbers (72 to 76 clips, 54 to 56 bible clips).
   - The `SIT_CLIPS` dedupe in `wardrobe-measure.mjs` is a real behaviour fix: seated clip names are now shared by two bodies. No test asserts it.
   - No test is specific to the new elder clips (stoop list, look-up direction, claps staying unregistered). Nit.
   - Run: `node --test stick-motionlib stick-fits build-stickpack verify-coverage stick-bible`: **120 tests, 120 pass, 0 fail** (101 s).

## Watch

The 4 clips at 270x480 on the elder in a sweater (sweater passes the fits table for all 4), proof stage, 3/4 camera.

| Clip | Old man? | Pop | Foot slide | Hands |
|---|---|---|---|---|
| Trans_SitDown_Once | Yes. Very slow (254 f) and stooped; he reaches back to the seat with his hands before lowering. | None; largest one-frame jump 1.31x its neighbours | 0 | Right for the act |
| Idle_Sit_Loop | Yes. Slumped, head drops, slow side glances. | None; f359 spike 2.0x but tiny (0.95 mean luma diff); the strip shows none | 0 | Nit: hands hang at the seat's front edge, 1 to 8 cm below the seat top (z 0.31 to 0.36, seat top 0.386, front x 0.258), half-hidden in the box in renders. A film's `arm in the set` gate may flag it. |
| Act_Give_Once | Yes, mildly. Stooped 24 to 32 deg, slow. | None (1.29x max) | 0 | Pass: right arm straight out, 0.58 m forward of the hip at 0.84 m height. Reads as offering, a bit stiff and low. |
| Gest_LookUpShade_Once | Bent and frail, yes. | None (1.54x max) | 0 | FAIL: head goes down, never up; the hand reaches the chin, never shades the eyes (MUST-FIX 1) |

Files, all in /private/tmp/claude-501/-Users-kienbeovl-orca-workspaces-studio-reel-whatif1-v5/97439790-851d-485f-9f7b-5fbf549c6c60/scratchpad/review-210/:
- Sheets (12 frames each, 6x2): sheet_Trans_SitDown_Once.jpg, sheet_Idle_Sit_Loop.jpg, sheet_Act_Give_Once.jpg, sheet_Gest_LookUpShade_Once.jpg
- Videos: Trans_SitDown_Once.mp4, Idle_Sit_Loop.mp4, Act_Give_Once.mp4, Gest_LookUpShade_Once.mp4
- Close-up strips: strip_shade.jpg, strip_sitend.jpg, strip_sit359.jpg

How the renders were set up: a copy of `motion-lib/proof/reel.js` in a throwaway film on the Pro, with `costume:['sweater']`, `faceAge:'elder'` and the wardrobe hook imported. One job under `~/pro-fans.sh run`, 47 s in total. I checked with pgrep that nothing else was rendering first.
