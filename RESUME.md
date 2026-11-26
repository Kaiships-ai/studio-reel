# RESUME: ep-whatif1-v5-director, PART A (written 26/11 by session 2, handed off)
Worktree ~/orca/workspaces/studio-reel/whatif1-v5, branch KineBeo/whatif1-v5, head 3ed4ec90 (pushed; main 65aba526 merged in).
Film folder films/wif5 (git-ignored: commit sources with `git add -f`). Studio = orca_session_id:d0be28c2-e934-4b72-850f-9bcb0ad301c3.

## Read first (in order, nothing else up front)
1. films/wif5/PART-A-PLAN.md  - the plan (steps 0-5): stills fix vs handgrip -> blind read 5 -> motion 0-504 -> sound -> 720p cut -> blind watch -> chefkiss -> Kai
2. ~/.orca/shared/studio-wow/SPEC-V5.md - the agreement (limits, order, FAULTS rules)
3. films/wif5/TREATMENT.md (row "a Countdown") and films/wif5/parts/a/BUILD.md (rebuild + Pro render recipe)
4. films/wif5/FAULTS.md sections "Part a" (blind reads 1-3) - open faults below
Do NOT read old transcripts, V4, or the review-208-*.md files.

## Goal now
Part a only (frames 0-504) to a 720p cut with VO + sound; blind read; Kai sees part a BEFORE b-j start.

## Kit facts (all in main since 26/11 13:xx)
- handgrip gate (#208): `node styles/stick-man/tools/gates/handgrip.mjs films/<slug>`; drawn edge of hand to drawn surface of prop, GAP_CM 1.5 (frozen, never raise).
  Every hand with grip:true must be within 1.5 cm of a shown prop; a held prop < 2 cm (stand-in) = fault; old rows (no grips[]) exit 2 -> re-render stills with --dbg.
  Advisory (not in GATES.json). Known false fail: a hand gripping set geometry that is not a tracked prop (rail, table) reads "no prop".
- Hand props (#209, kit/cast/handprops.js): baby, tin, lantern, photo (two-hand frame), balloon, photoPrint (one-hand 10x15 print).
  PASS: balloon adult (Act_HandOver_Once, Idle_Stand_Loop), elder (Idle_Stooped_Loop, Idle_Breath_Loop), child (Move_Walk_Fwd_Loop);
  tin adult/elder; baby adult (standing carry; walk carry is 17 cm off -> shot gate catches); photoPrint elder on Act_Give_Once (0.00, 234 frames).
  BLOCKED (kit/film.js must() refuses): baby-elder 3.03 (Idle_Breath_Loop passes), lantern-adult 2.43 (Idle_CarryBag_Loop / Gest_LookBackCarry_Once pass),
  lantern-elder 9.16 (Idle_Breath_Loop passes), photo frame adult 10.52 / elder 4.95 (no pose -> j uses photoPrint on Give).
  A row approves a pair for every clip: check handgrip per shot anyway.
- Elder clips (#210): Trans_SitDown_Once, Idle_Sit_Loop (elder), Act_Give_Once (one right arm reaches 0.58 m, low, a bit stiff).
  BLOCKED: standing clap, seated clap (body gate), look-up (looks DOWN; unregistered). No elder look-up clip exists -> stage looks with head/face, not a clip.
  Seat check: person().clip with {seat:'name'} refuses one seat for clips > 2 cm apart (elder sit-down 0.528 vs idle 0.386: never chain on one seat). Name every seat.
  cardigan+shirt:office+skirt is blocked for elder seated clips.
- No invisible stand-ins ever again; hand props through person(), not loose set props with held:false.
- Parts c/d (later): mark wif5_teacup steam and wif5_lantern2 shell/glow non-solid in the film (they now count in propBox/collide).

## Part a state and open faults (blind read 3; round 3 stills done 08:30, never blind-read)
- a3-1 balloon string never in the girl's hand -> kit balloon in her hand (child Move_Walk_Fwd_Loop passes; standing child pose not measured -> measure or walk).
- a3-2 331 vanish reads "balloon left behind": balloon must rise from her opened hand, no women anywhere in frame.
- a3-3 450: dad's arm hangs, head cut left, lower 45 % flat snow -> reach up, head in frame, fill the bottom.
- a3-4 300: "1" on the board under a 12 o'clock clock -> show midnight clearly; family larger, faces seen.
- Joined hands (dad-daughter, old couple) are hand-in-hand: handgrip does not cover it -> contact stills at 230/250 + reader.
- Waivers in place: 5 set-light ones (light|street/<prop>|square-night).

## Machines
- Renders ONLY on the Mac Pro (`ssh pro`), 720p review tier, one job at a time under ~/pro-fans.sh run. Pro idle at handoff.
- Pro tree ~/v5-wif5 is a git archive of OLD main 68041324: rebuild it from 65aba526 (step 0) before any render.

## Rules (first brief drafts/worker-v5.md + Studio)
720p, no downloads, no stand-ins, Kai decides faces/costumes/downloads/final cut, chefkiss before anything for Kai, English to Studio,
30-min status line, max 3 sub-agents (thin returns <= 20 lines), sub-agent worktrees only under ~/orca/workspaces/studio-reel/ (never Agent isolation),
"pushed" = git ls-remote shows the head. Budget: weekly limit ~74 % at 12:00 -> no extra review rounds; a reader finding that a viewer cannot see = "ẩn".
On "pause": commit, push, RESUME.md, stop.

## Handoff state (session 2)
No sub-agents running; kit worktrees kit-handgrip-fix / kit-handprops / kit-mixamo-elder removed (branches merged).
RESUME-kit-handprops.md at the worktree root is obsolete (untracked; #209 merged).

## Session 3 state (26/11, latest)
- Committed: walk shots 0-226 travel with the girl (reel.js direct), 450 changed shot (front, low, lens 26; arm reads), FAULTS a5-* logged.
- Stills re-rendered on Pro: track check + 450 at renders/track_check.jpg, renders/c450.jpg. fits PASS.
- Motion clip a_0-504_720.mp4 is from BEFORE these camera changes: re-render after the hair lands (Studio: hold the 720p clip until detailed hair is approved).
- PR #211 no-hair check (kit-hair-check worktree): open, CI pending, needs an independent reviewer before merge.
- kit-hair-detail builder (worktree ~/orca/workspaces/studio-reel/kit-hair-detail, Pro ~/kit-hair-detail): running; look sheet -> Studio -> Kai.
- Next: hair approved -> swap hair in reel.js -> clip render (render-pro.sh clip) -> gates (shotgate needs Pro pixi ffmpeg) -> post.py cut with audio/a-mix.wav -> blind watch off/on -> chefkiss -> VN page -> worker_done.
- TODO after hair round 3 reaches Studio: stick-wardrobe 3x alone vs 3x under full suite, compare cloth depth at f54 (legR 7 mm seen once under load); differ = kit issue with numbers.

## Session 4 state (26/11 14:55)
- #211 merged (e737a589). #212 hair: round 3 builder (Opus medium) running in kit-hair-detail: crop flat black cap, curly ring outlines,
  elder grey shell + back knot, every style's V-wedge nape. CI cause: review/hair-sheet/ = new top-level folder not in kit.manifest ->
  move proof under a [dev] path (no bypass, no --no-verify).
- Then: look sheet -> chefkiss -> Studio -> Kai. Nothing into part a until Kai approves hair. Then wardrobe determinism check, then RESUME "Next".
