# Motion library catalogue

The 75 clips of `styles/stick-man/motion-lib` (rules and use: its README.md). An anim key `{ f, clip, body, to?, times? }`
plays one (REEL_DATA.md). `frames` = one cycle or the whole one-off at 30 fps; `base` = the standard pose it starts (→ ends) on;
`props` = what the hands hold (`x_hp<L|R|B>_<prop>`, motion-lib/props.js and kit/cast/handprops.js; a film swaps its own with
the key's `swap`), on which hand; `set` = the set pieces it needs (the proof page builds them at the sizes the clip names in
`needs.marks`).

Made by `node styles/stick-man/tools/gates/motionlib.mjs --catalogue` from the clips themselves: do not edit by hand.

Proof: `node styles/stick-man/tools/gates/motionlib.mjs --proof <dir>` (every clip at 540x960, physics on and off, `shot.mjs --report`
numbers, one contact sheet per group).

Physics gates (every clip, physics on and off, through the real rig): a prop moves no more than its hand (times its attach
weight) and gravity allow plus 1 cm, also when it comes back after frames out of the scene; a declared prop is in the scene
every frame of the clip; the balance solve moves the pelvis at most 4 cm a frame (the pelvis with balance on minus off: the
raw pelvis speed is reported, not gated); the carried mass changes at most 35 % of its largest a frame.

## Idle

| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |
|---|---|---|---|---|---|---|---|
| `Idle_Breath_Loop` | child | loop | 60 | STAND | - | - | a child (big head, short legs, 25 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | elder | loop | 112 | STAND | - | - | an elder (stooped, 62 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | heavy | loop | 96 | STAND | - | - | a heavy body (girth 1.9, 115 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | teen | loop | 84 | STAND | - | - | a teen (85 % of the adult, a bit thinner, 50 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | thin | loop | 76 | STAND | - | - | a thin body (girth 0.6, 55 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_Breath_Loop` | toddler | loop | 48 | STAND | - | - | a toddler (70 % of the child, stubby legs, a big head, 11 kg) standing, breathing, the weight drifting to one foot and back |
| `Idle_CarryBag_Loop` | adult | loop | 327 | HUG | hugbag (both) | - | standing with a heavy duffel hugged to the chest in both arms, from motion capture (Mixamo "Carrying", ref/mixamo/carry_idle.js) on this body, every captured frame, opened and closed on HUG (the capture's own first frame) |
| `Idle_Fidget_Loop` | child | loop | 270 | STAND | - | - | a child (big head, short legs, 25 kg) standing and unable to wait: it turns at the waist to look about, the loose arms swinging after the chest, and shifts its weight on an uneven beat |
| `Idle_LookAround_Loop` | adult | loop | 161 | STAND | - | - | standing, looking round from side to side, wary, from motion capture (Mixamo "Look Around", ref/mixamo/look_around.js) on this body: a loop in place |
| `Idle_Sit_Loop` | adult | loop | 156 | SIT | - | seat | sitting at rest on a seat, shifting a little, from motion capture (Mixamo "Sitting Idle", ref/mixamo/sitting_idle.js) on this body, every captured frame |
| `Idle_Sit_Loop` | elder | loop | 218 | SIT | - | seat | seated, glancing side to side, Mixamo "Sitting" (ref/mixamo/sitting_side_look.js) on the elder body, every captured frame |
| `Idle_Sleep_Loop` | adult | loop | 265 | LIE | - | - | asleep on the floor, curled on one side, breathing (SH280), from motion capture (Mixamo "Sleeping Idle", ref/mixamo/sleeping_idle.js) on this body, every captured frame |
| `Idle_Stand_Loop` | adult | loop | 325 | STAND | - | - | standing at rest, breathing, the weight settling foot to foot, from motion capture (Mixamo "Breathing Idle", ref/mixamo/breathing_idle.js) on this body: a loop in place |
| `Idle_Stooped_Loop` | elder | loop | 393 | STAND | - | - | an old man standing stooped, a slight sway |

## Move

| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |
|---|---|---|---|---|---|---|---|
| `Move_CarryBag_Walk_Loop` | adult | loop | 86 | HUG | hugbag (both) | - | walking with a heavy duffel hugged to the chest in both arms, from motion capture (Mixamo "Walking" carrying, in place, ref/mixamo/carry_walk.js |
| `Move_OldWalk_Fwd_Loop` | elder | loop | 38 | STAND | - | - | an old man's shuffle, stooped, small steps, from motion capture (Mixamo "Old Man Walk", ref/mixamo/old_man_walk.js) on the elder body: planted feet pinned to their prints, the body travelling at the speed the captured feet slid back |
| `Move_PushHeavy_Loop` | adult | loop | 80 | STAND | crate (both) | - | pushing a heavy crate along, bent low, from motion capture (Quaternius UAL "Push_Loop", CC0, in place, ref/ual/push_loop.js) on this body: the feet pinned to their prints, the body travelling at the speed the captured feet slid back |
| `Move_Run_Fwd_Loop` | adult | loop | 19 | STAND | - | - | a run, from motion capture (Mixamo "Running", ref/mixamo/running.js) on this body: planted feet pinned to their prints, the body travelling at the speed the captured feet slid back |
| `Move_Run_Fwd_Loop` | child | loop | 16 | STAND | - | - | a scamper: quick steps, a little flight, arms pumping |
| `Move_Run_Fwd_Loop` | elder | loop | 22 | STAND | - | - | a slow shuffling jog: long contact, a tiny flight |
| `Move_Run_Fwd_Loop` | heavy | loop | 18 | STAND | - | - | a heavy jog: long ground contact, a short low flight, a big roll |
| `Move_Run_Fwd_Loop` | thin | loop | 16 | STAND | - | - | a long light run, a high quick stride |
| `Move_Sprint_Fwd_Loop` | adult | loop | 16 | STAND | - | - | a fast run, from motion capture (Mixamo "Fast Run", ref/mixamo/fast_run.js) on this body |
| `Move_TurnLeft_Once` | adult | once | 56 | STAND | - | - | a quarter turn to the left on the spot, from motion capture (Mixamo "Left Turn 90", ref/mixamo/left_turn_90.js) on this body, every captured frame |
| `Move_Walk_Fwd_Loop` | adult | loop | 31 | STAND | - | - | a walk, from motion capture (Mixamo "Walking", ref/mixamo/walking.js) on this body: planted feet pinned to their prints, the body travelling at the speed the captured feet slid back |
| `Move_Walk_Fwd_Loop` | child | loop | 20 | STAND | - | - | quick short steps with a lot of bounce, the head bobbing, arms swinging wide |
| `Move_Walk_Fwd_Loop` | elder | loop | 38 | STAND | - | - | short slow steps, feet barely off the floor, little bounce, arms close, head lifted to look ahead |
| `Move_Walk_Fwd_Loop` | heavy | loop | 36 | STAND | - | - | short slow steps on wide feet, the body rolling over each foot, arms out round the belly |
| `Move_Walk_Fwd_Loop` | thin | loop | 28 | STAND | - | - | long light steps on narrow feet, little roll |
| `Move_Walk_Fwd_Loop` | toddler | loop | 18 | STAND | - | - | quick short steps on wide-set feet, rocking from side to side, the arms held out |
| `Move_WalkFlashlight_Loop` | adult | loop | 34 | STAND | torch (L) | - | a cautious search walk with a flashlight held out in the left fist (the same hand as Act_TorchReady_Loop), waist high, the beam ahead |
| `Move_WalkFlashlight_Loop` | heavy | loop | 40 | STAND | torch (L) | - | the cautious search walk with a flashlight held out in the left fist (shared/extra/Move_WalkFlashlight_Loop_v01.js flashlightWalk) on the heavy body, from its own walk |
| `Move_WalkFlashlight_Loop` | thin | loop | 32 | STAND | torch (L) | - | the cautious search walk with a flashlight held out in the left fist (shared/extra/Move_WalkFlashlight_Loop_v01.js flashlightWalk) on the thin body, from its own walk |

## Act

| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |
|---|---|---|---|---|---|---|---|
| `Act_Consume_Once` | adult | once | 103 | STAND | hotdog (L) | - | bring food to the mouth, bite, chew, lower it, from motion capture (Quaternius UAL "Consume", CC0, ref/ual/consume.js) on this body, every captured frame |
| `Act_Drive_Loop` | adult | loop | 77 | SIT | - | seat | seated driving, both hands on the wheel, from motion capture (Quaternius UAL "Driving_Loop", CC0, ref/ual/driving_loop.js) on this body, every captured frame |
| `Act_DropInTrunk_Once` | any (adult, scaled) | once | 80 | CARRY → STAND | bag (both) | trunk | from CARRY, heave the bag over a car's trunk lip (0.68 m) and let it drop in |
| `Act_Give_Once` | elder | once | 233 | STAND | - | - | reach out and give, Mixamo "Reaching Out" (ref/mixamo/reaching_out.js) on the elder body, every captured frame |
| `Act_HandOver_Once` | adult | once | 87 | STAND | cash (L) | counter | reach forward and hand a bundle of cash over a counter, leaving it there, from motion capture (Quaternius UAL "Interact", CC0, ref/ual/interact.js) on this body, every captured frame |
| `Act_Jump_Once` | adult | once | 93 | STAND | - | - | a standing jump straight up (crouch, spring, tuck, land, absorb, stand), from motion capture (Mixamo "Jump", ref/mixamo/jump.js) on this body |
| `Act_Phone_Once` | adult | once | 349 | STAND | phone (R) | - | a call on a mobile: dial it at the chest, up to the ear, talk, put it away, from motion capture (Mixamo "Talking On A Cell Phone", ref/mixamo/talking_on_a_cell_phone.js: its first 203 frames and its last 114, the long middle of the call cut where the two match within 8 cm, joined by a 6-frame bridge) on this body |
| `Act_PickUp_Once` | adult | once | 315 | STAND → CARRY | bag (R) | - | bend down, pick the bag up off the floor in the right fist, stand up into CARRY, from motion capture (Mixamo "Picking Up", ref/mixamo/picking_up.js) on this body, every captured frame |
| `Act_PistolShoot_Once` | adult | once | 195 | STAND | pistol (L) | - | raise a handgun one-handed (the left: motion-lib/props.js pistol, x_hpL_pistol), fire, lower it, from motion capture (Mixamo "Shooting Gun", ref/mixamo/shooting_gun.js) on this body, every captured frame |
| `Act_PushBagOutWindow_Once` | any (adult, scaled) | once | 80 | CARRY → STAND | bag (both) | window | from CARRY, heave the bag up over a window's sill and push it out through the opening |
| `Act_PutDown_Once` | adult | once | 338 | CARRY → STAND | bag (R) | - | from CARRY (the bag in the right fist), bend and set it down on the floor, stand up, from motion capture (Mixamo "Putting Down", ref/mixamo/putting_down.js) on this body, every captured frame |
| `Act_TorchReady_Loop` | adult | loop | 65 | STAND | torch (L) | - | standing, a torch (flashlight) held out ahead in the left fist (motion-lib/props.js torch, the same hand as Move_WalkFlashlight_Loop), from motion capture (Quaternius UAL "Idle_Torch_Loop", CC0, ref/ual/idle_torch_loop.js) on this body, every captured frame |
| `Act_TorchReady_Loop` | heavy | loop | 65 | STAND | torch (L) | - | standing, a torch (flashlight) held out ahead in the left fist (motion-lib/props.js torch, the same hand as Move_WalkFlashlight_Loop), from motion capture (Quaternius UAL "Idle_Torch_Loop", CC0, ref/ual/idle_torch_loop.js) on the heavy body, every captured frame |
| `Act_TorchReady_Loop` | thin | loop | 65 | STAND | torch (L) | - | standing, a torch (flashlight) held out ahead in the left fist (motion-lib/props.js torch, the same hand as Move_WalkFlashlight_Loop), from motion capture (Quaternius UAL "Idle_Torch_Loop", CC0, ref/ual/idle_torch_loop.js) on the thin body, every captured frame |
| `Act_Type_Loop` | adult | loop | 182 | SIT | - | seat | seated, typing: the hands strike down and up on a keyboard in front (no desk or keyboard in the clip: put the film's under the hands, 0.58 m up, 0.43 m ahead of the hips) |

## Trans

| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |
|---|---|---|---|---|---|---|---|
| `Trans_GetUp_Once` | adult | once | 74 | LIE → STAND | - | - | get up off the floor from lying on the back, from motion capture (Quaternius UAL "LayToIdle", CC0, ref/ual/laytoidle.js) on this body, every captured frame |
| `Trans_JumpWindow_Once` | adult | once | 148 | STAND | bag (R) | window | a bag in the right fist, a sprint from standing and a flying leap out through a window (sill 0.80 m, top 2.0 m in the capture's metres |
| `Trans_LieDown_Once` | adult | once | 74 | STAND → LIE | - | - | lie down on the back on the floor, from motion capture (Quaternius UAL "LayToIdle" played backwards, CC0, ref/ual/laytoidle.js) on this body, every captured frame |
| `Trans_SitDown_Once` | adult | once | 95 | STAND → SIT | - | seat | sit down on a seat behind, from motion capture (Mixamo "Stand To Sit", ref/mixamo/stand_to_sit.js) on this body, every captured frame |
| `Trans_SitDown_Once` | elder | once | 254 | STAND → SIT | - | seat | sit down on a seat behind, Mixamo "Sitting" (ref/mixamo/sit_down_elder.js) on the elder body, every captured frame |
| `Trans_StandUp_Once` | adult | once | 96 | SIT → STAND | - | seat | stand up from a seat, from motion capture (Mixamo "Sit To Stand", ref/mixamo/sit_to_stand.js) on this body, every captured frame |

## React

| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |
|---|---|---|---|---|---|---|---|
| `React_Cry_Loop` | adult | loop | 224 | STAND | - | - | standing, crying: hunched, head down, hands to the chin and cheek, an arm thrown out, wiping (on this big head the hands do not reach the eyes) |
| `React_Defeated_Once` | adult | once | 182 | STAND | - | - | a frustrated slump after a loss: bends over, the fists swung down, then up, and the slump |
| `React_SitDisbelief_Once` | adult | once | 173 | SIT | - | seat | seated, in disbelief: the hands to the face, the body thrown back with the hands on the head, then upright again (needs a seat with room behind) |
| `React_Startle_Once` | adult | once | 137 | STAND | - | - | a start: surprised, looking off to the right, from motion capture (Mixamo "Reacting", ref/mixamo/reacting.js) on this body, every captured frame |
| `React_Surprise_Once` | adult | once | 60 | STAND | - | - | a start at something in front: the hands thrown up and the body back within half a second, a short beat held, then easing |
| `React_Terrified_Once` | adult | once | 187 | STAND | - | - | terrified on the spot: the hands fly up, the body hunches on bent knees, the head snaps round one way, then the other |

## Gest

| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |
|---|---|---|---|---|---|---|---|
| `Gest_Clap_Loop` | adult | loop | 85 | STAND | - | - | standing, clapping: the hands open wide and meet |
| `Gest_LookBack_Once` | adult | once | 140 | STAND | - | - | a quick nervous look over the right shoulder, from motion capture (Mixamo "Look Over Shoulder", ref/mixamo/look_over_shoulder.js) on this body, every captured frame |
| `Gest_LookBackCarry_Once` | adult | once | 140 | HUG | hugbag (both) | - | a quick nervous look over the right shoulder with the duffel hugged to the chest, from motion capture (Mixamo "Look Over Shoulder", ref/mixamo/look_over_shoulder.js) on this body, every captured frame, opened and closed on HUG: the capture's legs, head and turn (neck, the spine's twist, the pelvis), its arms and its lean the HUG pose's (they keep the bag, the motion-lib/props.js hugbag, 20 kg, turning with the chest |
| `Gest_LookUp_Once` | any (adult, scaled) | once | 70 | STAND | - | - | something above |
| `Gest_NodYes_Once` | adult | once | 106 | STAND | - | - | a plain yes nod |
| `Gest_PhoneCall_Loop` | adult | loop | 115 | STAND | phone (R) | - | standing, talking on a phone held to the ear, from motion capture (Quaternius UAL "Idle_TalkingPhone_Loop", CC0, ref/ual/idle_talkingphone_loop.js) on this body, every captured frame |
| `Gest_PhoneTalk_Loop` | adult | loop | 190 | STAND | phone (R) | - | standing, a phone in the right hand held to the ear, talking, the left hand with it |
| `Gest_Point_Once` | adult | once | 110 | STAND | - | - | standing, pointing ahead |
| `Gest_PointSeated_Loop` | adult | loop | 130 | SIT | - | seat | seated, pointing ahead with the right hand, from motion capture (Mixamo "Pointing (seated)", ref/mixamo/pointing_seated.js) on this body, every captured frame |
| `Gest_ShakeNo_Once` | adult | once | 104 | STAND | - | - | an annoyed no, the head shaking |
| `Gest_SitClap_Loop` | adult | loop | 104 | SIT | - | seat | seated, clapping in front of the chest |
| `Gest_SitTalk_Loop` | adult | loop | 212 | SIT | - | seat | seated, talking, small hand moves |
| `Gest_Talk_Loop` | adult | loop | 175 | STAND | - | - | standing, talking with both hands, from motion capture (Mixamo "Talking", ref/mixamo/talking.js) on this body: a loop in place |
| `Gest_Wave_Loop` | adult | loop | 92 | STAND | - | - | standing, waving one hand overhead, from motion capture (Mixamo "Waving", ref/mixamo/waving.js) on this body: a loop in place |
| `Gest_Yawn_Once` | adult | once | 207 | STAND | - | - | a tired stretch and yawn, a hand to the mouth |

## Body types

| Body | Rig (cast spec) | Mass | Walk: step, frames a step | Run: step, frames, on the ground |
|---|---|---|---|---|
| adult | {} | 70 kg | 0.55 m, 15 | 1 m, 8, 5 |
| heavy | {girth: 1.9} | 115 kg | 0.42 m, 18 | 0.62 m, 9, 8 |
| thin | {girth: 0.6} | 55 kg | 0.62 m, 14 | 1 m, 8, 5 |
| child | {scale: 0.62, headScale: 1.3, legScale: 0.8} | 25 kg | 0.3 m, 10 | 0.5 m, 8, 5 |
| teen | {scale: 0.826, girth: 0.88, headScale: 1.06, legScale: 1.02} | 50 kg | 0.49 m, 17 | 0.885 m, 9, 5 |
| toddler | {scale: 0.4468, headScale: 1.5, legScale: 0.6} | 11 kg | 0.12 m, 9 | 0.136 m, 8, 7 |
| elder | {scale: 0.96} | 62 kg | 0.3 m, 19 | 0.42 m, 11, 10 |
