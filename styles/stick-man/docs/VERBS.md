# Beat keys and verbs (what a beat in `reel.js` accepts)

Source of truth: `styles/stick-man/engine/verbs.js` (`VERBS`), `verbs_fx.js` (`ACT`, `PROPV`, `keyTracks`, `MAKE`), `play.js`
(`buildAct`). An unknown `do` throws `unknown verb`.

In the standard process the **lead** is acted with motion v2 keys (`anim`, REEL_DATA.md), not verbs. Verbs drive
background characters, props (`set` keys) and sound beats. The pose and face names below are also the vocabulary for
the storyboard `act` field and for `expr` on keys.

## Every beat

| Key | Meaning | Example |
|---|---|---|
| `line`, `on` | the spoken word the beat starts on (case and punctuation ignored) | `{ line: 'l01', on: 'robs', ... }` |
| `offset` | frames from the word's start (default -2: the body leads the word) | `offset: -8` |
| `nth` | which occurrence of `on` in the line (default 1) | `nth: 2` |
| `f` | an absolute frame instead of a word (set-up before the first word only) | `{ f: 0, who: 'kai', do: 'hold', ... }` |
| `who` | an actor in `cast`, a prop in the set, an effect in `make`, or `'screen'` | `who: 'teller'` |
| `expr` | face from here on (lands 4 f before its word); the 29 faces are in "Faces" below | `expr: 'manic'` |
| `mark` | a head-attached emotion mark for 36 f, or `[kind, frames]`: sweat anger sparkle question exclaim steam stars zzz | `mark: 'question'` |
| `look` | gaze target: actor, prop, place, or `'camera'` | `look: 'note'` |
| `sound`, `strength`, `soundAt` | add a sound cue (bank name, 0-1, frames late) | `sound: 'tick', strength: 0.5` |

A beat may carry only `expr` / `look` (no `do`).

## Actor verbs (`who` = an actor)

| `do` | Params | Example |
|---|---|---|
| `idle` | `fade`; empties both hands | `{ who: 'kai', do: 'idle' }` |
| `hold` | `prop, hand, to` (place or `{l:[x,y,z]}` figure-local), `off` / `offW`, `fade`, `tilt`, `yaw` | `{ who: 'kai', do: 'hold', prop: 'bag', hand: 'R', to: 'bag_grip', fade: 0 }` |
| `reach` | `hand, to` (`{prop}` / place), `dur` | `{ who: 'kai', do: 'reach', hand: 'L', to: { prop: 'note' }, dur: 0 }` |
| `lift` | `prop, hand, up` (m), `to`, `dur`, `dx`, `dy` | `{ who: 'teller', do: 'lift', prop: 'stack', hand: 'L', up: 0.13 }` |
| `drop_in` | `prop, hand, into` (default bag), `carry` (frames), `strength` | `{ who: 'teller', do: 'drop_in', prop: 'b1', hand: 'L', carry: 19 }` |
| `slide` | `prop, hand, to`, `handOn`, `dur`, `turn` | `{ who: 'kai', do: 'slide', prop: 'note', hand: 'L', to: 'note_end', handOn: true }` |
| `gesture` | `kind`: nod, tilt (`deg`, `hold`), finger_wave, wave, fist_pump (eased: 18 f in, 20 f out), shrug (`hand`); the hand must be empty | `{ who: 'teller', do: 'gesture', kind: 'tilt', deg: -7, hold: 30 }` |
| `talk` | mouth on every word of the beat's `line` | `{ who: 'teller', do: 'talk', look: 'kai' }` |
| `look_at` | `target` / `to` | `{ who: 'kai', do: 'look_at', to: 'bag' }` |
| `turn_to` | `yaw` (deg) or `to` / `target`, `dur` | `{ who: 'teller', do: 'turn_to', yaw: -80 }` |
| `walk_to` | `to`, `style` stroll/walk/brisk/run, `stride`, `step`, `cheat` (deg to camera), `carry` 'L'/'R', `turn`, `gait.stanceFlex` | `{ who: 'kai', do: 'walk_to', to: 'street', style: 'stroll', carry: 'R', cheat: 35 }` |
| `sling` | `prop, hand, dur`: swing a bag up onto the shoulder | `{ who: 'kai', do: 'sling', prop: 'bag', hand: 'R' }` |
| `place` | `to, yaw`: jump to a mark (off screen or between acts), no motion | `{ f: 0, who: 'kai', do: 'place', to: 'door', yaw: 0 }` |
| `startle` | `back` (m), `hold`: knocked back by a blast (eased: 18 f fling, 16 f settle) | `{ who: 'kai', do: 'startle', expr: 'shock', look: 'camera', hold: 20 }` |
| `cough` | `n, per, hand` (eased: hand up 8 f early over 12 f, elbow out, 14 f drop) | `{ who: 'kai', do: 'cough', expr: 'closed', n: 2, per: 6 }` |
| `step_back` | `from, dist, step, lead, hold`: face `from`, back off two steps | `{ who: 'otis', do: 'step_back', from: 'burst', dist: 0.5 }` |
| `point` | `to, hand, hold` (eased: 20 f raise, slow jabs, 28 f release; a beat lasts hold + 28 f) | `{ who: 'otis', do: 'point', to: [1.15, -1.95, 2.0], hand: 'R', hold: 34 }` |
| `wave_small` | `hand, n, per` (eased: 10 f raise, 14 f drop) | `{ who: 'kai', do: 'wave_small', hand: 'L', n: 3, per: 6 }` |
| `slump` | `dur`: shoulders drop, held until the next body verb | `{ who: 'kai', do: 'slump', dur: 14 }` |
| `pluck` | `prop, from, hand, to, dur`: pull a prop out of a bag | `{ who: 'kai', do: 'pluck', prop: 'bill', from: 'bag', hand: 'L', dur: 9 }` |
| `let_fall` | `prop, hand, dur, ground`: open the hand, paper flutters down | `{ who: 'kai', do: 'let_fall', prop: 'bill', hand: 'L', dur: 40 }` |

Walks: start a walk at `f: -14` (frame 0 lands mid-stride; `f: 0` pops the knees, 32.6 deg/f); while walking only
`wave_small` (a `gesture wave` popped 38.7 deg/f).

Joint gate (≤ 25 deg/f): nod, tilt, shrug, wave, finger_wave, slump, idle, talk, look_at, turn_to are safe. fist_pump,
point, cough, startle, wave_small used to pop 26-52 deg/f; they now carry the built-in ease above and pass (worst 24.4 deg/f,
`films/stick-fxkit/review/verbs-after.txt`). Keep two body verbs of one hand ≥ their ease apart; a FAIL line lists the top 5
frames.

## Body acting (`engine/poses.js`; proof sheet `films/stick05-q2-verbs/review/verbs_ms.jpg`)

Every lead acts with the whole body (gate: ≥ 70 % of its frames). A pose rises with anticipation (3 f the other way),
overshoots and settles, keeps moving in the hold, then releases; the arms trail the body by 2 f, the head by 4 f. A pose
only adds to the body channel, so it layers on a stand, a sit or the end of a walk; the next pose (or any body verb)
takes over from it. Common params: `hold` (frames held, default per pose), `dur` (action frames; big lean / pitch take
longer by themselves), `out` (release), `hand: 'L'` (mirror a one-handed pose), `amp` (0-1.5 size). A busy hand (holding a
set prop) keeps its prop; the rest of the pose still plays. Joint gate: every pose below passes in the levels proof
(worst 24.7 deg/f); keep two poses ≥ 16 f apart when a hand crosses from the ear to the belly.

| `do` | One line | Example |
|---|---|---|
| `lean_in` | leans in close, hand beside the mouth (a secret, a whisper) | `{ ...at('l02', 'a', -6), who: 'wren', do: 'lean_in', expr: 'sly', amp: 0.7 }` |
| `lean_away` | rocks back and away, both palms up to ward off | `{ who: 'bram', do: 'lean_away', expr: 'shock' }` |
| `brace` | wide knees-bent stance, forearms up before the face, trembling | `{ who: 'june', do: 'brace', expr: 'scream' }` |
| `crouch` | squats low, hands on knees, looks up | `{ who: 'kai', do: 'crouch', expr: 'suspicious' }` |
| `recoil` | the take: the body jolts back, open hands fly up beside the chest, one foot steps back, the face stays on the lens (fast: 2 f wind-up) | `{ ...at('l03', 'times', -4), who: 'kai', do: 'recoil', expr: 'shock' }` |
| `shrug` | shoulders up, both forearms out wide at hip height, head tipped (the "Not really." shrug) | `{ who: 'kai', do: 'shrug', expr: 'confused' }` |
| `facepalm` | hand over the face, head down, slow head shake | `{ who: 'june', do: 'facepalm', expr: 'sad' }` |
| `arms_crossed` | arms folded, weight on one hip, chin up | `{ who: 'bram', do: 'arms_crossed', expr: 'deadpan' }` |
| `hands_on_hips` | fists on hips, elbows out, wide stance | `{ f: 748, who: 'officer', do: 'hands_on_hips', expr: 'smug' }` |
| `point_lean` | leans in and points at `to` (place or [x,y,z]) with small jabs | `{ who: 'kai', do: 'point_lean', to: [0, -0.15, 1.0], hand: 'L' }` |
| `cower` | crouched, hunched, hands shielding the face, shaking | `{ ...at('l08', 'cannon', -4), who: 'officer', do: 'cower', expr: 'panic' }` |
| `celebrate` | both arms up in a V, bouncing on the knees, fists pumping in turn | `{ who: 'kai', do: 'celebrate', expr: 'excited' }` |
| `tiptoe` | up on the toes, paws up, creeping sway | `{ who: 'kai', do: 'tiptoe', expr: 'sly' }` |
| `sneak` | crouched creep in place, one foot ahead, paws up | `{ who: 'kai', do: 'sneak' }` |
| `carry_heavy` | a crate between both hands, leaning back, straining | `{ who: 'kai', do: 'carry_heavy', expr: 'pain' }` |
| `lift_heavy` | crouch, grip, strain (shaking), rise with the crate to the chest | `{ who: 'kai', do: 'lift_heavy', hold: 50 }` |
| `push` / `pull` | leans into a push, arms out, feet staggered / leans back hauling a rope, tugging | `{ who: 'kai', do: 'push' }` |
| `sit_down` / `stand_up` | lowers onto a knee-high seat (held) / leans forward and rises | `{ who: 'kai', do: 'sit_down' }`, later `{ who: 'kai', do: 'stand_up' }` |
| `cover_ears` | hands clamped on the ears, wincing | `{ ...at('l04', 'hours', -4), who: 'kai', do: 'cover_ears', expr: 'pain' }` |
| `cup_ear` | a hand cupped behind the ear, leaning to listen | `{ who: 'kai', do: 'cup_ear', hand: 'L', expr: 'confused' }` |
| `think` | hand on the chin, the other arm across, head tipped up | `{ who: 'bram', do: 'think', expr: 'confused' }` |
| `shush` | a finger to the lips, leaning in | `{ who: 'wren', do: 'shush', expr: 'sly' }` |
| `present` | the right hand pushes out toward the lens at chest height, the other fist on the hip; `props: { R: 'beaker' }` shows a thing in that hand (any pose takes `props`) | `{ who: 'kai', do: 'present', expr: 'happy' }` |
| `arms_wide` | both arms flung wide (big, huge, all of it) | `{ ...at('l03', 'power', -4), who: 'kai', do: 'arms_wide', expr: 'excited' }` |
| `shade_eyes` | a hand flat at the brow, up on the toes, looking far | `{ who: 'kai', do: 'shade_eyes' }` |
| `clutch` | doubled over, hands on the belly, shaking (pain, sick) | `{ who: 'kai', do: 'clutch', expr: 'pain' }` |
| `laugh` | doubled forward, hands on the belly, shaking with laughter | `{ who: 'kai', do: 'laugh', expr: 'closed' }` |
| `flail` | arms up and waving out of time, bouncing (panic) | `{ who: 'june', do: 'flail', expr: 'scream' }` |
| `wobble` | wide stance, swaying in circles, arms out (dizzy) | `{ ...at('l04', 'damages', -2), who: 'kai', do: 'wobble', expr: 'dizzy' }` |
| `pour` | a mug in the hand tips and pours, then rights | `{ who: 'kai', do: 'pour', hold: 50 }` |
| `hammer` | a hammer raised and brought down every 15 f (a `clunk` cue on each hit) | `{ who: 'kai', do: 'hammer', hold: 60 }` |
| `write` | notepad in one hand, pencil scribbling in the other, head down | `{ who: 'kai', do: 'write' }` |
| `eat` | a drumstick to the mouth every 22 f, the other hand on the belly | `{ who: 'kai', do: 'eat' }` |
| `phone` | a phone held to the ear, head tipped | `{ who: 'kai', do: 'phone' }` |

Hand props (`lib/cast/handprops.js`: cup hammer pencil pad drumstick apple phone megaphone box) belong to the figure and are
parented to the hand each frame (gap 0 by construction); a pose shows them through the pose keys `x_hp<L|R|B>_<kind>`.

**Auto-acting** (`acting.js autoActing`): after the beats compile, every lead's frames that no body verb covers get poses,
one per ~1.3 s, picked from the words said there (TEXT_POSES: whisper → lean_in / shush, hear → cup_ear, loud → cover_ears /
recoil / brace, pain → clutch, rock / party → celebrate, think / why → think, big / ten / power → arms_wide, miles / far →
shade_eyes, police / boss → hands_on_hips, numbers → present), then from the face in force (panic → flail, smug →
arms_crossed, dizzy → wobble ...), then a default rotation. A lead = cast `lead: true`, a `talk` beat, or a shot subject;
`lead: false` opts out, act `auto: false` turns it off. Explicit beats always win.

## Faces (`engine/faces.js`; proof sheet `node styles/stick-man/tools/shot.mjs --page styles/stick-man/faces.html --frames 12 --w 1600 --h 840 --out faces.jpg`)

Each face is drawn in code per figure (eye kind, flat or tilted lids, cheek push, tapered brows, mouth shape) with skin
marks painted on (blush, red veins, tears, dark sockets, gloom lines) and head-attached mark cards. Every face has an
open-mouth twin for talking. A face change lands 4 f before its word, with a body accent and a blink.

| `expr` | Look | Marks |
|---|---|---|
| neutral calm happy grin closed | the everyday range (dot eyes, smile, toothy grin, ^^ eyes) | |
| smug sly suspicious deadpan | half lids, one brow up, smirk / cat mouth / flat | |
| stern angry furious | brows in a hard V, gritted teeth, red veins; furious flushes violet | anger (+ steam) |
| worried nervous panic scream | brows up, wobble / teeth grin / wavy / screaming mouth, white eyes with tiny pupils, gloom lines | sweat |
| shock | white eyes, pupils, O mouth | ! for 26 f |
| manic | dark sockets, red glowing eyes, wide toothy grin, red veins | |
| blush proud excited | ^^ eyes with pink cheeks / big open smile / star eyes | sparkle (proud, excited) |
| sad cry pain | wet eyes or > < shut, tears running, wail / gritted mouth | sweat (pain) |
| dizzy confused disgust sleep | spiral eyes / one brow up, skew mouth / tongue out / shut | stars / ? / - / zzz |

## Prop verbs (`who` = a prop in the set)

| `do` | Params | Example |
|---|---|---|
| `move` | `to` or `by` (m), `dur`, `ease`, `turn` | `{ who: 'stack', do: 'move', by: [0, 0, 0.18], dur: 12 }` |
| `drive` | `to, dist, dur, rot, dir`: a car drives in and brakes | `{ who: 'police', do: 'drive', dist: 14, dur: 22, rot: 0, to: [-5.2, -4.85, -0.16] }` |
| `blink` | a sensor light blinks (beep cue) | `{ who: 'sensor', do: 'blink' }` |
| `glint` | a metal top flashes (ting cue) | `{ who: 'plate', do: 'glint' }` |

## Keyed values (`who` = an effect in `make`, a prop, or `'screen'`)

| `do` | Params | Example |
|---|---|---|
| `set` | `key, to, from, dur, ease` (smoother, linear, out, back) | `{ who: 'dial', do: 'set', key: 'count', to: 0, dur: 36, from: 10, ease: 'linear' }` |
| `pulse` | `key, amp, dur, n, gap` (added on top) | `{ who: 'glow', do: 'pulse', key: 'glow', amp: 0.8, dur: 9 }` |
| `shake` | `key, amp, dur` | `{ who: 'bag', do: 'shake', amp: 1, dur: 14 }` |
| `fire` | start an effect's clock | `{ who: 'burst', do: 'fire', sound: 'poof', strength: 1.0 }` |
| `flash` | `frames`: white flash (`who: 'screen'`) | `{ who: 'screen', do: 'flash', frames: 3 }` |
| `sound` | `name, strength`: a cue only | `{ who: 'screen', do: 'sound', name: 'scratch', strength: 0.5 }` |

## Effects (`make: { name: { kind, ... } }` in an act)

`at` = a place, `[x,y,z]`, `{ prop, off }` (m) or `{ head: actor, side, up, fwd }` (m from his head: side = toward his LEFT,
so + is screen right when he faces the camera; fwd = where he faces). A `flow` / `rays` anchor 0.3 m or more below the head
with no `fwd` gets `fwd: 0.2` (at 0 the torso hides it); a `shimmer` behind him takes `fwd: -0.18`. Sizes are metres; a standing figure is ~1.75 m, so 0.3 m reads at phone size in a two-shot.

| Kind | Keys / params (units) | Starts with |
|---|---|---|
| `bagGlow` | `bag`; key `glow` 0..1 | `set` / `pulse` glow |
| `burst` | `at, size` (cloud radius, m), `count, life` (s), `clear` (m kept free round the face), `smoke` | `fire` |
| `bills` | `at, n, scale` (x a 15.5 cm bill), `seed, push` (m/s at the lens); key `red` 0..1 | `fire` |
| `star` | `at, r` (m), `back` (m behind, from the camera), `frames` (life) | `fire` |
| `drops` | `at, n, seed, rs` (drop size x), `lens` (share thrown at the lens) | `fire` |
| `dial` | `at, r` (m), `of` (countdown from), `mount`; keys `show, count, tick` | `set` show |
| `spray` | `at, dir` ([x,y,z]), `n, reach` (m); key `on` 0..1 | `fire` + `set` on |
| `rings` | `from, to` (radio rings between two points), `dur, gap` (s), `r0, r1` (m) | `fire` |
| `thermo` | `at, scale`; keys `show` 0..1, `temp` (°F on a 50-420 scale: small real gaps do not read), `shake` | `set` show |
| `pack`, `bill`, `arm`, `prop` | dye pack; one red bill; a bare arm (`shoulder`, keys `hand`, `bend`); a set prop's keyed parts (`prop, keys, phaseRate`) | `set` |

## Explainer effects (`lib/props/explain.js`; proof sheet `films/stick-fxkit/review/fxkit_sheet.jpg`)

Use one on the key word of every line that describes a process, a number or a comparison. All are toon with an ink outline.
Defaults when a key is left out: rays `n 3, r 0.035, spread 0.22, grow 0.35 s, life ∞`; flow `r 0.035, pips 4, grow 0.7 s,
life ∞`; shimmer `w 0.5, h 0.7, n 3`; cutbox `r 0.28, h 0.8, th 0.035`; callout `r 0.22, h 0.15 (label), dir [1.6, 1.3]`;
bars `h 0.6, w 0.16`; split `h 2.2, gap 1.3, lh 0.26`; stamp `h 0.32, tilt -8, life ∞` (always give a stamp a `life`).

| Kind | Verb (what it shows) | Params (m, s) | Example (`make` entry, then the beat) |
|---|---|---|---|
| `rays` | sunlight shoots in and bounces off (`out`) or sinks in (`absorb: true`, orange spot) | `from, hit, out, absorb, n, r, spread, grow, life` | `bounce: { kind: 'rays', from: 'sun', hit: { head: 'wren', up: -0.42, fwd: 0.12 }, out: [0.7, -0.8, 3.3] }` · `{ ...at('l01', 'white'), who: 'bounce', do: 'fire' }` |
| `flow` | a curved arrow draws itself along a path, pips stream, then it runs out: air, cold, heat, water, money | `at, path` ([[x,y,z]] m from `at`), `medium, r, grow, life` | `air: { kind: 'flow', at: { head: 'bram', up: -0.55 }, medium: 'air', path: [[0.2,0,0],[0.42,0,0.35],[0.3,0,0.75],[0.48,0,1.05]] }` · `do: 'fire'` |
| `shimmer` | wavy heat lines rise off something hot | `at, w, h, n`; key `heat` 0..1 | `heat: { kind: 'shimmer', at: { head: 'bram', up: -0.7, fwd: -0.18 }, w: 1.0, h: 1.2 }` · `{ who: 'heat', do: 'set', key: 'heat', to: 1, dur: 10 }` |
| `cutbox` | a cylinder or box swings its front half open to show the inside (section edges, a core with a gap round it) | `at, shape` (cylinder / box), `r, w, d, h, th, coreR, shell, cut, core`; keys `open`, `show` | `cut: { kind: 'cutbox', at: 'bench_top', r: 0.22, h: 0.55 }` · `{ who: 'cut', do: 'set', key: 'open', to: 1, dur: 18 }` |
| `callout` | (banned in reels: use a `sign` plaque) a zoom ring round a detail with a leader and a label | `at, r, text, dir` ([x,y] in units of r), `h`; key `show` | `look: { kind: 'callout', at: [0.17, 0.85, 1.22], r: 0.11, text: 'AIR GAP', dir: [-2.4, 2] }` · `set show to 1, ease 'back'` |
| `bars` | a bar chart grows, values count up with the bars | `at, values, labels, colors, max, h, w, unit`; keys `show, grow, v0, v1...` | `chart: { kind: 'bars', at: 'bench_top', values: [41, 12], labels: ['TIGHT', 'LOOSE'], unit: '°' }` · `set show 1, then grow 1 (dur 24)` |
| `split` | two sides compared: an ink bar wipes in between them, a VS badge pops, labels slide in | `at, h, gap, labels, colors, lh, badge`; key `show` 0..1 | `vs: { kind: 'split', at: [0, -0.15, 0], h: 2.3, gap: 1.7, labels: ['WHITE', 'BLACK'] }` · `set show to 1, dur 24, ease 'linear'` |
| `stamp` | (banned in reels by the floating labels gate: use a `sign`) a big word or number slams in (`{n}` counts with key `n`); `tail: 'left'/'right'` makes it a speech bubble (quoted lines) | `at, text, h, color, tilt, frame, tail, life` | `same: { kind: 'stamp', at: [0, -0.5, 1.15], text: 'SAME', h: 0.55 }` · `do: 'fire'` |

Sound names (`styles/stick-man/tools/sound_bank.py` BANK): slide thud rustle ting ding whoosh step_l step_r step beep tick poof
hiss scratch pop snore clunk blip ping sizzle slide_whistle_up flutter wah siren sting.

## Shots (`shots: [...]` in an act)

| Key | Meaning |
|---|---|
| `f` or `line`/`on`/`offset` | when the shot starts |
| `shot` | two, ms, cu, insert, wide, follow |
| `of`, `with` | subjects; extra things to keep in frame |
| `angle`, `heading` | degrees around the subject; frame from the yaw he is about to face |
| `size`, `head`, `lens`, `kx` | figure height fraction; cu head size; mm; key x (cu: keep 0.5 so head x stays 45-55 %) |
| `dof` | depth of field 0-1 (defaults: cu 0.6, insert 1, others 0); stamps, callouts and labels blur under it: a close-up that shows one takes `dof: 0` |
| `push`, `drift`, `live` | slow push-in per frame; side drift; follow the live head (0-1) |
| `glide`, `cut` | frames to glide from the last shot (0 = cut); hard cut |
| `track: { s, delay, ramp }` | keep only part of the subject's travel, then catch up |
| `insert`: `at, from, dist, z, rise` | a prop close-up |

Example: `{ line: 'l02', on: 'she', shot: 'cu', of: ['teller'], angle: 8, head: 0.27, push: 0.0010, live: 0.35, kx: 0.52 }`.
