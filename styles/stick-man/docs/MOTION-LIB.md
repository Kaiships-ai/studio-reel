# Motion library catalogue

The 45 clips of `styles/stick-man/motion-lib` (rules and use: its README.md). An anim key `{ f, clip, body, to?, times? }`
plays one (REEL_DATA.md). `frames` = one cycle or the whole one-off at 30 fps; `base` = the standard pose it starts (→ ends) on;
`needs` = hand props and set pieces (the proof page builds the set pieces at the sizes the clip names in `needs.marks`).

Proof: `node styles/stick-man/tools/motionlib.mjs --proof <dir>` (every clip at 540x960, physics on and off, `shot.mjs --report`
numbers, one contact sheet per group).

## Idle

| Clip | Body | Loop | Frames | Base | Needs | What |
|---|---|---|---|---|---|---|
| `Idle_Breath_Loop` | adult | loop | 80 | STAND | - | a grown-up of average build standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | child | loop | 60 | STAND | - | a child (big head, short legs, 25 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | elder | loop | 112 | STAND | - | an elder (stooped, 62 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | heavy | loop | 96 | STAND | - | a heavy body (girth 1.9, 115 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | thin | loop | 76 | STAND | - | a thin body (girth 0.6, 55 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Frozen_Loop` | adult | loop | 60 | STAND | - | frozen in fear |
| `Idle_Tired_Loop` | adult | loop | 90 | STAND | - | worn out |

## Move

| Clip | Body | Loop | Frames | Base | Needs | What |
|---|---|---|---|---|---|---|
| `Move_CarryHeavy_Run_Loop` | adult | loop | 24 | CARRY | bag | the same bag at a heavy run |
| `Move_CarryHeavy_Walk_Loop` | adult | loop | 36 | CARRY | bag | one 25 kg bag in the right fist |
| `Move_Run_Fwd_Loop` | adult | loop | 20 | STAND | - | a run: short ground contact, a flight on gravity, knees driving |
| `Move_Run_Fwd_Loop` | child | loop | 16 | STAND | - | a scamper: quick steps, a little flight, arms pumping |
| `Move_Run_Fwd_Loop` | elder | loop | 26 | STAND | - | a slow shuffling jog: long contact, a tiny flight |
| `Move_Run_Fwd_Loop` | heavy | loop | 24 | STAND | - | a heavy jog: long ground contact, a short low flight, a big roll |
| `Move_Run_Fwd_Loop` | thin | loop | 20 | STAND | - | a long light run, a high quick stride |
| `Move_Walk_Fwd_Loop` | adult | loop | 30 | STAND | - | an even walk, heel strike and roll, arms swinging opposite the legs |
| `Move_Walk_Fwd_Loop` | child | loop | 20 | STAND | - | quick short steps with a lot of bounce, the head bobbing, arms swinging wide |
| `Move_Walk_Fwd_Loop` | elder | loop | 38 | STAND | - | short slow steps, feet barely off the floor, little bounce, arms close, head lifted to look ahead |
| `Move_Walk_Fwd_Loop` | heavy | loop | 36 | STAND | - | short slow steps on wide feet, the body rolling over each foot, arms out round the belly |
| `Move_Walk_Fwd_Loop` | thin | loop | 28 | STAND | - | long light steps on narrow feet, little roll |
| `Move_WalkFlashlight_Loop` | adult | loop | 34 | STAND | torch | a cautious search walk with a flashlight held out in the right fist, waist high, the beam ahead; the light arm stays steady (the body bobs under it), the left arm swings small, the head slightly forward |

## Act

| Clip | Body | Loop | Frames | Base | Needs | What |
|---|---|---|---|---|---|---|
| `Act_DropInTrunk_Once` | any (adult, scaled) | once | 80 | CARRY → STAND | bag, trunk | from CARRY, heave the bag over a car's trunk lip (0.68 m) and let it drop in |
| `Act_EatBite_Loop` | any (adult, scaled) | loop | 48 | STAND | drumstick | food held at the chest goes up to the mouth, the head leans in for the bite and holds it, tears it off with a small nod, the hand drops back while the jaw chews |
| `Act_LiftHeavy_Once` | any (adult, scaled) | once | 88 | STAND → CARRY | bag | heave one 25 kg bag off the floor |
| `Act_Phone_Once` | any (adult, scaled) | once | 100 | STAND | phone | a call |
| `Act_PushThroughWindow_Once` | any (adult, scaled) | once | 82 | CARRY → STAND | bag, window | from CARRY, lift the bag to a window sill with both hands and shove it through |
| `Act_SlideCash_Once` | any (adult, scaled) | once | 76 | STAND | cash, counter | a bundle of notes from the pocket, laid on a counter and slid across, the hand stays on it a beat, lets go, comes back |
| `Act_WearCap_Once` | any (adult, scaled) | once | 76 | STAND | cap | a cap from the hip pocket onto the head, set from the side with the elbow high (the head tips away) |

## Trans

| Clip | Body | Loop | Frames | Base | Needs | What |
|---|---|---|---|---|---|---|
| `Trans_ClimbWindow_Once` | any (adult, scaled) | once | 100 | STAND | window | climb through a low window (sill 0.55 m) and stand on the far side: foot planted on the sill, weight onto it |
| `Trans_SitStand_Once` | any (adult, scaled) | once | 112 | STAND | seat | sit down on a seat behind and stand back up |

## React

| Clip | Body | Loop | Frames | Base | Needs | What |
|---|---|---|---|---|---|---|
| `React_FreezeInLight_Once` | any (adult, scaled) | once | 90 | STAND | - | caught in a light |

## Gest

| Clip | Body | Loop | Frames | Base | Needs | What |
|---|---|---|---|---|---|---|
| `Gest_LookUp_Once` | any (adult, scaled) | once | 70 | STAND | - | something above |
| `Gest_RaiseGun_Once` | any (adult, scaled) | once | 74 | STAND | - | the gun is implied, never shown: both fists come up together to eye line and push out at arm's length (a two-hand aim), hold, and come down |

## Body types

| Body | Rig (cast spec) | Mass | Walk: step, frames a step | Run: step, frames, on the ground |
|---|---|---|---|---|
| adult | {} | 70 kg | 0.55 m, 15 | 0.95 m, 10, 4 |
| heavy | {girth: 1.9} | 115 kg | 0.42 m, 18 | 0.62 m, 12, 7 |
| thin | {girth: 0.6} | 55 kg | 0.62 m, 14 | 1.05 m, 10, 4 |
| child | {scale: 0.62, headScale: 1.3, legScale: 0.8} | 25 kg | 0.3 m, 10 | 0.55 m, 8, 3 |
| elder | {scale: 0.96} | 62 kg | 0.3 m, 19 | 0.45 m, 13, 8 |
