# Ledger · sf-ep01-allout (round 1, 11/11, one agent)

Tokens are estimated from context growth (sub-agent, no usage line).

| Stage | Minutes (wall) | Tokens (est.) | Output |
|---|---|---|---|
| reference forensic (whisper, motion, scene cuts, 13 contact sheets VS1Z + LC8h) | ~10 | ~70k | scratchpad director/ (private) |
| engine read + plan | ~5 | ~45k | hooks: setModule, direct, ao |
| kit + director + 9 sets + 2 hand props | ~20 | ~150k | styles/stick-man/allout/ (1164 lines) |
| reel data (9 acts, 41 directed shots, 14 lines) | ~5 | ~35k | reel.js, reel2.js |
| still checks (5 rounds, ~70 stills at 540x960) + fixes | ~15 | ~110k | review/stills, sheet |
| total | ~55 | ~410k | no video rendered |

## Round 2 (11/11, after Kai watched v1: "better, keep the direction")

| Stage | Minutes (wall) | Tokens (est.) | Output |
|---|---|---|---|
| read judge + coordinator notes, verify reference cut count (forensic events: VS1Z 1 cut / 17 dissolves) | ~3 | ~10k | |
| director: travel (move) + real whip transitions; MARKS-first place/walk_to fix | ~5 | ~15k | allout/director.js, engine/play.js, verbs*.js |
| sets: stomach teaching model in the clinic, photo board, trolley, pig bowl, brighter lights | ~10 | ~45k | allout/sets/* |
| hand props: culture bottle (pour), rubber stamp (hammer), 14-day blister + show_pills pose | ~3 | ~10k | allout/handprops.js |
| reel data rewrite: 8 acts, characters in ~23/24 sheet frames, 1 hard cut | ~10 | ~45k | reel.js, reel2.js (v1 kept in v1-data/) |
| stills checks (3 rounds) + fixes, YAVG 124 (v1 93, ref 112) | ~10 | ~40k | review/stills-v2, sheet v2 |
| sound pass: 41 cues (+ transition whooshes), music.json, sound.py: mix -14.0 LUFS, peak -1.6 dBTP, all PASS | ~3 | ~8k | audio/mix.wav |
| total round 2 | ~45 | ~175k | no video rendered |

## Round 3 (11/11, controlled experiment: raise camera, storytelling, acting, props & effects; keep captions, characters, faces, set looks, light)

Opus 5.5 at xhigh, one agent. Tokens estimated from context growth. Round 2 data kept in `v2-data/` (reel.js, reel2.js, audio/).

| Stage | Minutes (wall) | Tokens (est.) | Output |
|---|---|---|---|
| read ledger, judge v1/v2, round-2 data, allout code | ~5 | ~35k | |
| reference study: 13 private contact sheets (VS1Z + LC8h), transcripts, FORENSIC camera/acting/fx/story | ~7 | ~45k | beat-by-beat gag notes (in head, none in the repo) |
| engine read (poses, verbs, verbs_fx, play, cast, physfx) | ~6 | ~60k | where acting/fx/camera hook in |
| code: acting.js poses + tumble, cast x_tumble, director rush travel, handprops (bugs, hanky), sets (lab door + beaker level, hall pile/paper/slide wipe), fx (ao_tube, ao_flies) | ~15 | ~40k | styles/stick-man/allout/* |
| bug hunt: effects invisible -> found the director hook froze every body/prop/effect at the shot's first frame (play.js), fixed | ~10 | ~30k | engine/play.js (1 line + note) |
| reel data rewrite: 14 lines, 9 acts, 49 directed shots, ~190 beats | ~15 | ~45k | reel.js, reel2.js |
| still checks: 9 rounds, ~110 stills at 540x960 + fixes | ~20 | ~75k | review/stills-v3, sheet v3 |
| cut check: all 1950 frames at 108x192 (stills, no video) through ffmpeg scene > 0.25, calibrated on the v2 render (same 6 events) | ~4 | ~8k | 1 event (45.1 s "Wait.", the intended cut); v2 had 6 |
| sound re-cue: 51 cues from the new picture, same mix: -14.0 LUFS, peak -1.6 dBTP, all PASS | ~2 | ~5k | audio/mix.wav |
| ledger, commit, push | ~3 | ~10k | |
| total round 3 | ~90 (incl. ~8 min lost to an API error) | ~350k | no video rendered |

### What worked (for the skill)

1. Check the engine before blaming the data: in round 2 every director shot aimed at an actor re-posed the scene at the shot's first frame, so bodies, props and effects stood still for the whole shot (only faces moved). That alone explains much of "static poses" (acting 5.5). Test: fire an effect, render the frame, if it is missing dump `g.visible` per apply call.
2. One gag per line, written as "verb + object + body": chug / slam / burp, steam out of the ears, faceplant, shove under the tower, scrub the slide, retch, fan the nose, feed the tube, pill bombs, high five, faint. Each gag gets one pose verb, one keyed prop and one effect, timed to the punch word.
3. The doubter as a thread, not a beat: Bram lectures (l02), laughs and wipes the bug away (l04-l05), gets the finger wagged at him (l11), loses his lamp (l13) and faints (l14), while the wife who smelt it all laughs at him: setup -> payoff across the film.
4. A motif prop pays off twice: the green burp (hook payoff, the FX wipe into the kitchen, the Nobel callback).
5. Flat disc faces read only at 3/4; profile staging kills them. Turn both actors 30-35 deg toward the lens in two-shots.
6. Camera: say what starts each move; use "rush" travels (hold, then a crisp 8-10 frame travel) inside a place and dissolves between places; check the travel path does not cross a head (one did: a brown frame).
7. Count abrupt changes on stills, not on a render: render every frame tiny (108x192, 84 s), run ffmpeg `select=gt(scene,0.25)` on the image sequence, calibrate on the last render. A shot change inside an act dissolve still counts: start the new shot before the dissolve.
8. Effects need room: smoke with an ink hull renders black when the camera is inside a puff; keep the lens out of the cloud.

## STUDY (11/11): private master study, LC8h f0-640 copied shot for shot (films/study-lc8h, gitignored; side-by-sides in the scratchpad only)

| Stage | Minutes (wall) | Tokens (est.) | Output |
|---|---|---|---|
| segment pick + shot list from 4 private 4-frame sheets (f0-640) and the old shot/move data | ~5 | ~15k | 15 shots, 3 dissolves, 1 place change |
| build: western street set (film-local), study reel data (frame-timed, no narration), kit pieces: ao_bullet, ao_aura, revolver, aim/fire/grab poses, x_spin, sole anchor | ~10 | ~30k | commit 21522c7 (kit code only) |
| match passes: 6 rounds of paired stills (ref left, ours right) + fixes (street width, lens, holster, bullet angle, glint size, face-to-camera fall) | ~12 | ~45k | 12-moment side-by-side sheet |
| measure (12 matched frames, PIL/numpy) + gap list | ~4 | ~10k | luminance, contrast, shadow colour numbers |
| total | ~31 | ~100k | no video rendered |

### STUDY part 2 (11/11): the finish kit, built general and re-shot on the study (no video rendered)

| Stage | Minutes (wall) | Tokens (est.) | Output |
|---|---|---|---|
| motion check on the coordinator's comparison video (whip smear, chase, fall) | ~3 | ~8k | the reference smears its whip, the fall pitches, the hat flies |
| engine/kit code: grade (shadow lift, shoulder, soft, grain, motion blur), haze, sunDir + camKey, lens presets, chase solver, dofAuto, soft fx (puff, aura, debris), costume layers + lose_hat, actingAmp, faceplant kick + skid, planks / weathered / extras / skyDome, LOOKS preset, face-extras proposal | ~30 | ~70k | commit 34aa149 |
| re-shoot + tune passes (6) and measure | ~15 | ~40k | sheet v2, numbers |
| bug hunt: a dark rectangle in the post when a texture is the scene background (fixed with a camera-riding sky dome) | ~10 | ~25k | K.skyDome |
| face-extras proposal sheet, ep 1 regression stills (10 frames, diff vs round 3: unchanged except the faceplant) | ~5 | ~10k | proposal sheet |
| total part 2 | ~63 | ~150k | no video rendered |

Before -> after on the 12 matched frames (reference in brackets): luma 0.70 -> 0.58 (0.56), contrast (Y std) 0.26 -> 0.19 (0.20),
saturation 0.41 -> 0.36 (0.39), deep-shade colour near black -> mauve-lifted (reference ~[0.27, 0.20, 0.27]).
