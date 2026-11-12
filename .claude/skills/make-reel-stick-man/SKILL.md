---
name: make-reel-stick-man
description: Make a vertical (1080x1920, 30 fps) stick-man 3D film by the standard animation pipeline - Development, Pre-production, Asset, Shot, Post - with Kai approving each step on one page per stage, real renders for every option, independent agents checking each pass, and characters that obey Disney's 12 principles and body physics at the 'kaiships' dose. Use when Kai asks for a stick-man reel or stick-man story film. Trigger: /make-reel-stick-man
argument-hint: "<slug> <story idea or script>"
---

# /make-reel-stick-man

The standard process for a stick-man film (dev only).

- Run from the library root with `.pixi/envs/default/bin/node` and `.pixi/envs/default/bin/python` (written `node` / `python` below), never `pixi run`.
- Work in a fresh worktree. `films/` is git-ignored; kit and engine changes go in PRs, and Kai merges.
- Worked example: `styles/stick-man/examples/pilot-a/` (copy it to `films/pilot-a/` to replay it; its README says how).
- Needs: `GOOGLE_API_KEY` in `.env` (voice), faster-whisper (align), `claude` on PATH (board judges).
- Kai reads Vietnamese: replies and page text are Vietnamese; "Em đề xuất" marks your recommended option.

Read [PROCESS.md](PROCESS.md) before step 1.

## The loop (every step of every stage)

1. Do one numbered step, e.g. [3.1].
2. Make the proof Kai can see: a still, a sheet, a video, or a number.
3. When there is a choice, show 2-3 options. Each option is a real render next to the current state. Mark one **Em đề xuất**.
4. Before Kai sees it, a fresh independent agent challenges it:
   - layout and camera: the camera-pass prompt;
   - poses: the blocking and 12-principles prompt;
   - every pass: the sạn hunt.

   Fix what holds up. Never score your own work.
5. Put it on the stage page: status rows plus decision buttons. Kai picks there and may approve several steps at once.
6. Read his picks from the page's db, lock them, and strip the rejected options and stale sections from the page.
   A step is not done until the page shows it: republish in the same turn, unasked, with only the latest state on it
   (old drafts, superseded options and old review tables go; history lives in git and the files).
7. Reply short in Vietnamese and end with the table `việc · đầu ra · bằng chứng · trạng thái`.

## Stages, steps and gates

| Stage | Step | Output | Proof Kai sees |
|---|---|---|---|
| **0 Development** | [0.1] brief + treatment | `node styles/stick-man/tools/new_film.mjs <slug>` makes the folder, `vo/script.json`, `storyboard.json`, `reel.js`, `LEDGER.md`; you write `BRIEF.md` and `TREATMENT.md` (3 structures + choice, logline, arc). A reference is a quality bar, never a shot list. | the page |
| | [0.2] beat board | the whole story in ~12 panels (one beat each); pick a pilot segment that is a complete mini story (conflict + payoff) | sketch panels |
| | **◇1** brief, treatment, story | | |
| **1 Pre-production** | [1.1] script | `vo/script.json`: 1 narrator, 2.9-3.3 words/s; hook in line 1; every line names something drawable | text + word count |
| | [1.2] visual development | 2-3 looks rendered as style frames from a film-local draft set; Kai picks one look for the whole film | style frames |
| | [1.3] design | characters (model sheet, faces, profile), set layout, props; each reads by silhouette and team colour | sheets |
| | [1.4] storyboard | **sketch panels** (never a text shot list), 1 per beat, with camera arrows; caption-free read test by a fresh agent | panels + retell |
| | [1.5] voice | `python styles/stick-man/tools/voice.py films/<slug> --samples Achird`, then `--take`; align with `tools/align.py` (re-take on ❌) | audio + `voice-qa.md` |
| | [1.6] animatic | panel images held for their line's time: an ffmpeg concat list (`file 'p01.png'` / `duration 1.0` per panel) over `vo/vo.wav` → `review/animatic.mp4` | video |
| | [1.7] colour script | one style frame per line from the chosen look (rendered or painted); heat, time and mood carried by props and light | strip |
| | **◇2** animatic + design lock (length, story, shots, look) | | |
| **2 Asset** | [2.1] rig + dose | the body is `engine/body.js` (bones, joint ranges, contact, balance; `PHYS` switches) and the dose `engine/motion.js` `STYLE_PRESETS`; prove a change on short test clips rendered with physics on and off, plus `shot.mjs --report` numbers | clips + numbers |
| | [2.2] faces, set, props | only what the animatic needs: faces `engine/faces.js`, sets and props `styles/stick-man/allout/` (pattern: `allout/sets/canyon-edge.js`), Blender pieces `styles/stick-man/docs/GLB.md` | sheets, stills |
| | [2.3] run-through | every approved asset together in the real set at the chosen dose (not a film shot) | video + body numbers |
| | **◇3** asset lock | | |
| **3 Shot** | [3.1] camera pass | skill `animation-camera-pass`: intent per scene (Kai confirms), intensity graph, axis map, 3 rendered options per flagged shot, previs, lock check (PROCESS.md) | option cards, previs video |
| | [3.2] overlays | the storyboard's drawn layer (loupe, sound words, arrows) via `overlays` (REEL_DATA.md) | stills |
| | [3.3] blocking | key poses by hand, `ease: 'snap'`, every shot (REEL_DATA.md motion v2) | video beside the animatic |
| | Kai approves the blocking (on the page, may batch with [3.2]) | | |
| | [3.4] polish | holds, eases, anticipation, moving holds, asymmetry; sạn hunt; camera pass again if a shot misses its purpose | blocking vs polish video + numbers |
| | [3.5] board | `node styles/stick-man/tools/board.mjs films/<slug> --judge 3` (3 independent judges per line) | board + votes |
| | **◇4** Shot lock (board ≥ 85 %) | | |
| **4 Post** | [4.1] sound | `node styles/stick-man/tools/shot.mjs --film films/<slug> --cues films/<slug>/audio/cues.json`, `audio/music.json`, `python styles/stick-man/tools/sound.py films/<slug>` | levels + video |
| | [4.2] render | `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames 0-<last> --mp4 films/<slug>/renders/<slug>_vN.mp4 --audio films/<slug>/audio/mix.wav` | video + sheet |
| | [4.3] gates | the two commands in GATES.md, always with `--profile` (Kai picks pilot or full) | gate table |
| | **◇5** deliver | `sheet.mjs`, `LEDGER.md`, final mp4 on the page | final video |

A later stage's problem is fixed in the stage that caused it. Never jump ahead into the engine or the gates.

## Rules (each was paid for)

| Rule | Why |
|---|---|
| Motion obeys two rulebooks: the 12 principles and body physics (no penetration, bones keep length, joints in range, balance, gravity g = 9.8, no pops). Props and sets obey physics too. | bodies that ignore physics read as lifeless |
| Style is the dose each principle is bent (`style: 'kaiships'`); physics is the floor under it | Kai's chosen dose |
| The lead's acting is keyed by hand (motion v2 `anim`); auto-acting from words only for background characters | auto-acting reads as puppets |
| Faces sell the character: no ring-eye creep, no blink inside a take (shock, scream), a new face lands on a cut, takes land in 3 frames | the face sells the character |
| Every camera states its PURPOSE (what the viewer must get in its 1-2 s) and a clear size: a real wide or a real close-up, with a clean background behind faces | timid mid shots miss their purpose |
| Every script line is something the point-of-view character can know right now: seen or heard now, known by the body (skills, how the world works), said by another character, or asked as a question. The narrator never states what the character can't know (an amnesiac "you just stole… you can't remember doing it"). A fresh agent runs a logic sạn hunt on every script and hook before Kai sees it | Kai is confused in the first line, and the film fails there |
| An overlay may only claim what the picture shows, the same way at the same time (expansion arrows point into the gap while the rail ends close) | a fake overlay is the first sạn a viewer sees |
| Keep the direction conventions (REEL_DATA.md) and one camera axis per place (PROCESS.md section 3) | reversed axes read as mistakes |
| Never loosen a threshold. After 2 fix rounds on one gate, stop and show Kai the FAIL with a still. | gates protect the viewer |
| Numbers measured from a reference short (reference gate profile) are information, not pass/fail, unless Kai picks `--profile full` | chasing quotas makes a film choppy |
| Never copy frames, audio or wording of a reference; `ref-private/` is never committed or posted | rights |
| Renders are medium (540x960) until Post; full 1080x1920 for the Post render only | time and machine |
| A look change starts from a whole-look prototype (style frames, a Blender turntable) Kai picks by eye, never from tuning numbers one by one | number tweaks don't change the look |
| A hand, a strike or a tool lands on a real target and holds 2-4 frames; a showcase of motion means travel through space (leaps, falls), not poses in place | hands acting on air read as fake |
| Blender is the asset workshop (export `.glb`); a new set, prop, fx or verb goes in the kit with its rule, never for one film's taste | the next film reuses it |

## Files

| File | What |
|---|---|
| [PROCESS.md](PROCESS.md) | stage pages, agent prompts, camera pass, blocking/polish recipe, sạn hunt, board, sound, gate profiles, deliver |
| [REEL_DATA.md](REEL_DATA.md) | `storyboard.json`, `reel.js` keys: motion v2 `anim`, `direct` cameras, `overlays`, `style`, beats, music |
| [GATES.md](GATES.md) | the gates by profile (safety / quality / reference) and how to fix a FAIL |
| [LEDGER.md](LEDGER.md) | the per-stage ledger template |
| `templates/stage-page.html` | the stage page |
| `styles/stick-man/docs/` | kit reference: verbs, poses, faces, sets, Blender sets |
