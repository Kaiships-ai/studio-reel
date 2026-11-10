# Beat keys and verbs (what a beat in `reel.js` accepts)

Source of truth: `styles/stick-man/engine/verbs.js` (`VERBS`), `verbs_fx.js` (`ACT`, `PROPV`, `keyTracks`, `MAKE`), `play.js`
(`buildAct`). An unknown `do` throws `unknown verb`. Examples are from `styles/stick-man/examples/dye-pack/`.

## Every beat

| Key | Meaning | Example |
|---|---|---|
| `line`, `on` | the spoken word the beat starts on (case and punctuation ignored) | `{ line: 'l01', on: 'robs', ... }` |
| `offset` | frames from the word's start (default -2: the body leads the word) | `offset: -8` |
| `nth` | which occurrence of `on` in the line (default 1) | `nth: 2` |
| `f` | an absolute frame instead of a word (set-up before the first word only) | `{ f: 0, who: 'kai', do: 'hold', ... }` |
| `who` | an actor in `cast`, a prop in the set, an effect in `make`, or `'screen'` | `who: 'teller'` |
| `expr` | face from here on: neutral smug stern shock happy closed worried sly sleep grin calm | `expr: 'grin'` |
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
| `gesture` | `kind`: nod, tilt (`deg`, `hold`), finger_wave, wave, fist_pump, shrug (`hand`); the hand must be empty | `{ who: 'teller', do: 'gesture', kind: 'tilt', deg: -7, hold: 30 }` |
| `talk` | mouth on every word of the beat's `line` | `{ who: 'teller', do: 'talk', look: 'kai' }` |
| `look_at` | `target` / `to` | `{ who: 'kai', do: 'look_at', to: 'bag' }` |
| `turn_to` | `yaw` (deg) or `to` / `target`, `dur` | `{ who: 'teller', do: 'turn_to', yaw: -80 }` |
| `walk_to` | `to`, `style` stroll/walk/brisk/run, `stride`, `step`, `cheat` (deg to camera), `carry` 'L'/'R', `turn`, `gait.stanceFlex` | `{ who: 'kai', do: 'walk_to', to: 'street', style: 'stroll', carry: 'R', cheat: 35 }` |
| `sling` | `prop, hand, dur`: swing a bag up onto the shoulder | `{ who: 'kai', do: 'sling', prop: 'bag', hand: 'R' }` |
| `place` | `to, yaw`: jump to a mark (off screen or between acts), no motion | `{ f: 0, who: 'kai', do: 'place', to: 'door', yaw: 0 }` |
| `startle` | `back` (m), `hold`: knocked back by a blast | `{ who: 'kai', do: 'startle', expr: 'shock', look: 'camera', hold: 20 }` |
| `cough` | `n, per, hand` | `{ who: 'kai', do: 'cough', expr: 'closed', n: 2, per: 6 }` |
| `step_back` | `from, dist, step, lead, hold`: face `from`, back off two steps | `{ who: 'otis', do: 'step_back', from: 'burst', dist: 0.5 }` |
| `point` | `to, hand, hold` | `{ who: 'otis', do: 'point', to: [1.15, -1.95, 2.0], hand: 'R', hold: 34 }` |
| `wave_small` | `hand, n, per` | `{ who: 'kai', do: 'wave_small', hand: 'L', n: 3, per: 6 }` |
| `slump` | `dur`: shoulders drop, held until the next body verb | `{ who: 'kai', do: 'slump', dur: 14 }` |
| `pluck` | `prop, from, hand, to, dur`: pull a prop out of a bag | `{ who: 'kai', do: 'pluck', prop: 'bill', from: 'bag', hand: 'L', dur: 9 }` |
| `let_fall` | `prop, hand, dur, ground`: open the hand, paper flutters down | `{ who: 'kai', do: 'let_fall', prop: 'bill', hand: 'L', dur: 40 }` |

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

`bagGlow` (bag) · `burst` (at, size, count, life, clear, smoke) · `bills` (at, n, scale, seed, push) · `star` (at, r, back,
frames) · `drops` (at, n, seed, rs, lens) · `dial` (at, r, of: countdown clock) · `spray` (at, dir, n, reach) · `rings` (radio
rings) · `thermo` (at, scale) · `pack` (dye pack) · `bill` (one bill, red) · `arm` · `prop` (a set prop's keyed parts: prop, keys,
phaseRate). `at` = a place, `[x,y,z]`, `{ prop, off }` or `{ head, side, up, fwd }`.

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
| `push`, `drift`, `live` | slow push-in per frame; side drift; follow the live head (0-1) |
| `glide`, `cut` | frames to glide from the last shot (0 = cut); hard cut |
| `track: { s, delay, ramp }` | keep only part of the subject's travel, then catch up |
| `insert`: `at, from, dist, z, rise` | a prop close-up |

Example: `{ line: 'l02', on: 'she', shot: 'cu', of: ['teller'], angle: 8, head: 0.27, push: 0.0010, live: 0.35, kx: 0.52 }`.
