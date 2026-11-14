# Motion rules: what every stick-man movement must obey

The motion library's rule book, built once and reused by every film. Sources: Richard Williams, *The Animator's Survival
Kit* (the tables below; `L` = line numbers in the OCR text of the book, kept in Kai's notes, 24 fps converted to 30) and
Kai's walk-cycle research (gait mechanics + the 12 principles, layered: hips, legs, spine and shoulders, arms, head).
A rule here is checked by a tool or encoded in a generator; where it is neither yet, it says so.

## Where each rule lives

| Rule | Encoded in | Checked by |
|---|---|---|
| W3-W6 contact / down / passing / up: the weight goes down just after contact, up just after passing | `base.js` `gaitLoop`: the hips solved from the stance knee curve (`knees` per body in `bodies.js`) | rig: solved knee change a frame (`motionlib.mjs`, walks <= 27 deg/f in `stick-motionlib.test.mjs`) |
| Feet never slide; a foot leaves and lands straight | `gaitLoop` planted prints, swing foot eased onto both prints | `motionlib.mjs` slide < 1 mm/f |
| W9-W11 arms opposite the legs, widest at Down; no twinning | `gaitLoop` arms: phase lag `uD`, left/right amplitude and elbow differ (`asym`) | review |
| W12-W13 hips tilt (belt line, p147: the lifted leg's side up, the planted side down; Kai chose Williams over biomechanics, 2026-11-14), shift over the stance foot, turn; shoulders counter | `gaitLoop` `pelvis.roll/yaw`, `hip.x`, `spine.twist/side` | review |
| W6 Up: the stance heel peels so the toe lifts the body to its highest (p108) | `gaitLoop` walk heel curve `PS` from 0.55 of the step, then as the leg needs | review |
| W15 a foot picks up slowly, travels fast through the middle, puts down fast (p139) | `gaitLoop` walk swing clock `w0^2 (2 - w0)` | review |
| Run (p177, Kai's default "normal run"): 7-8 frames a step at 30 fps, the foot on the ground most of the step and both feet off for 1-3 frames; lands ahead of the hips, leaves with the leg straight out behind on the toe; the whole body leans from the feet, the back straight and curving opposite ways each step, straight at passing; arms bent, restricted | `bodies.js` run `T`, `ts`, `lean`; `gaitLoop` run `reach` 0.28, toe-off pitch 50, `curve` | review; solved knees ~28-35 deg/f in the loop (a real runner's swing knee turns ~30 deg a frame at 30 fps) |
| Head steadier than the hips | `gaitLoop` neck nod against the bob, turn against the shoulders | review |
| W2 tempo (frames a step at 30 fps: 15 brisk, 20 stroll, 25 elderly) | `bodies.js` `T` | review |
| R1-R3 a run has a flight (both feet up), the rise under half a head, gravity times it | `gaitLoop` run: ground time `ts`, `pos.2` on g = 9.8 | `motionlib.mjs` physics line |
| R6 fast run: arms restricted, bent | `bodies.js` run `swing`, `elbow` | review |
| Joints within range; no joint faster than 25 deg a frame after the dose | rig (`body.js` ROM), keys | `motionlib.mjs` joint gate (keys); solved joints printed per clip |
| A carrier: knees bent, lean away from the load, slower, feet barely lift | `carry()` base pose + carry `knees` | review |

Open (not yet encoded): W19 arms on a different period than the legs; W20 counteraction of soft masses; W25 long
cycles with varied passing positions; F2 successive breaking of joints in arm actions; character walks (sneak, double
bounce, strut) as named presets.

## T. Timing and spacing

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| T1 | Timing = when the accents/impacts land; spacing = distance between consecutive poses. Same duration with different spacing is a different action (coin crosses page in 1 s = 24 f @24 = 30 f @30 either way) | Per joint: key times (accent frames) and per-frame deltas are separate; review both | 1100-1114, 1153-1175 |
| T2 | Extremes first, then breakdown (passing) between them, then eases. An even chart for 5 drawings puts #3 at the exact middle, #2 and #4 at quarter points | Position at the mid frame of a move = 50% of the extremes' distance if linear | 1344-1348, 1394-1412 |
| T3 | Ease in/out = add inbetweens near the extreme ("cushioning"); snap out + cushion in = fast leave, slow arrive. More easing = slower, more relaxed move | Velocity curve: near zero at extremes, peak mid for eased; for snap-out/ease-in peak at the start and long taper | 1416-1441, 1473-1488 |
| T4 | Twos for normal action, ones for very fast action. Twos = 12 drawings/s @24. At 30 fps twos = 15 drawings/s (hold each pose 2 frames) | Count unique poses per second: normal = 15/s (hold 2 f), fast = 30/s (change every frame) | 2504-2509, 2655-2658 |
| T5 | Walks work on twos but look better on ones; runs and any very fast action are always on ones | Walk: change pose every frame; run: never hold a pose 2 frames | 2658, 6200, 6869 |
| T6 | Never move a character on twos while the camera pans on ones (stroboscopic jitter): pan on twos too | Camera key steps match character hold length | 2714-2715 |
| T7 | Paths follow arcs; straight lines only where power/impact is wanted. If an inbetween is not on the arc the move does not flow | Trajectory of hand/foot/head: curvature sign constant between extremes, no kinks at inbetweens | 3118-3135, 3172-3173 |
| T8 | A middle position in a perspective/rotation move is not the geometric middle: for a head turn or a spinning thing the inbetweens cluster at the ends of the arc (slow near extremes, fast through the middle). For fast moves put it at the technical cross point, for normal moves split the difference about half way | Head yaw: step per frame small at both ends, largest at the centre | 2871-2895, 2927-2953, 2959-2964 |
| T9 | On a head turn the person blinks en route (unless frightened) | Eyelid closes in the middle third of the turn | 2994-2997 |
| T10 | Hit exaggeration (Ken Harris): ~5 evenly spaced drawings over a fast approach, then add a drawing that just touches, then remove the pre-contact drawing and stretch the contact drawing, so the motion jumps a one-frame gap (not seen, felt) | Last approach frame to contact frame distance = 2x the previous step; no inbetween | 3223-3241 |
| T11 | Contact before squash: ball/frog/foot touches the ground (no squash) one frame, then squashes; only on landing, not on take-off. Keep at least one foot on the ground as the take-off starts | Landing: a frame with contact and rest shape before the squash frame; takeoff: foot/toe contact persists into first lift frames | 3272-3290, 3310-3319 |
| T12 | Too much action in too short a time (big arm/leg swing in a run) reads as a mess; remedy: go twice as slow (add drawings to slow, remove to speed) | Rig: arm swing amplitude x cycle rate cap (see R6) | 3438-3440 |
| T13 | An accent needs at least 6 frames @24 (0.25 s = 8 f @30) to read; 4 pointing accents in 1 s cannot work. Dance secondary beats under 4 f @24 (5 f @30) will not read | Min time between two held accents >= 8 f @30; small beats >= 5 f | 10208-10213, 9363-9367 |
| T14 | Alternate "slightly too fast" and "slightly too slow"; contrast of slow against fast is what holds the eye | Speed profile of a scene: no constant tempo for a whole shot (inferred as a check) | 10367-10370 |
| T15 | Visual accent a couple of frames ahead of the sound (rule of thumb: 2 f @24 = 2-3 f @30); better: animate level with the sound, then slide the picture earlier until it looks right; try 1-4 frames | Accent key frame - audio hit frame = -2..-3 @30 (adjustable) | 9400-9426 |
| T16 | Mass is conserved in squash/stretch (it would weigh the same); do not stretch/compress so far the volume is lost, but distortion inside a move is fine because only the end poses are seen | Segment lengths constant on a rigid rig; if scaling, product of scales ~ 1 | 8497-8498, 10045-10058 |

## W. Walk

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| W1 | Walking = a series of controlled falls: lean forward, throw a leg out just in time ("step, catch") | Torso leans forward at Down/Passing, foot placed ahead of CoM at contact | 3585-3590 |
| W2 | Tempo table, frames per STEP @24 -> @30 (steps/s): 4 -> 5 (6/s very fast run); 6 -> 7.5 (4/s run or very fast walk); 8 -> 10 (3/s slow run or cartoon walk); 12 -> 15 (2/s brisk, "natural", people on the street are "right on the nose" 12s); 16 -> 20 (1.5/s stroll); 20 -> 25 (1.2/s elderly or tired); 24 -> 30 (1/s slow step); 32 -> 40 (very slow) | Frames between successive foot contacts L/R, expect 15 +- 1 for adult normal | 3862-3908, 3921-3928 |
| W3 | Contact pose: heel just touches, no weight on it yet; legs straight; body/head at a middle height ("neither up nor down"); a dynamic pose | Front foot: toe up/heel down, ankle ahead of hips; hip height ~ mid between Down and Up | 3749-3751, 4176-4182 |
| W4 | Down pose (weight): just AFTER contact; the leg bends to absorb the force, body mass at its lowest. "The weight goes down just after the contact" | Hip/pelvis Y minimum 1-2 frames (@30: ~2-3) after contact on the support leg; knee flexion max here | 3751-3752, 3796-3800, 3843 |
| W5 | Passing: the supporting leg is straight, so body and head are slightly higher than the mid-point; the passing leg's foot swings through next to the support knee | Hip Y at pass above the mean of Down and Up; support knee ~ straight | 3773-3787 |
| W6 | Up pose: after passing the body is highest (supported leg pushing off on the ball/toe), then the leg is thrown out to catch at the next contact. "The weight goes UP just after the passing position" | Hip Y max 1-2 frames after pass; rear heel up, toe pushes | 3814-3824, 3844 |
| W7 | Weight is felt through the amount of up and down of body/head. A walk traced accurately from live action floats: increase the ups and downs | Vertical bob amplitude of pelvis/head; normal bob should be larger than a rotoscoped sample (inferred value: ~1.2-1.5x, book gives none) | 3731-3737, 3702-3703 |
| W8 | The amount of head up-down is the key to the walk's character: no bob (head level, "tightrope") reads as gliding/weightless/effeminate; lots of bob reads as macho/heavy | Head Y peak-to-peak per step | 3689-3703, 3718-3728 |
| W9 | Arms are always opposite to the legs, for balance and thrust | Right arm forward when left leg forward: phase offset 180 deg | 3762-3768 |
| W10 | In a "normal" walk the arm swing is widest at the Down pose, not at contact. Hand is at the lowest part of its arc while it passes the body | Arm swing angle peak 1-2 f after contact; hand Y min at pass | 3794-3797, 5213-5214, 5180-5181 |
| W11 | Arm paths are an arc or a figure 8, sometimes angular; shoulders mostly oppose hips (twist) | Shoulder yaw opposes pelvis yaw; wrist path curved | 5130-5133, 5200-5204, 5255 |
| W12 | Belt line (pelvis tilt): down with the foot that is down, up with the foot that is up; tilt the belt line favouring the leg that is lowest | Pelvis roll: low side = support leg at Down; hip raise side = swing leg at pass | 5159-5168, 5686 |
| W13 | Weight shifts foot to foot: raising one foot thrusts the body forward and sideways over the other foot | Pelvis lateral X over support foot at pass | 5130-5132 |
| W14 | Feet lift off the ground the bare minimum (that is why we stub toes) | Swing foot clearance low (inferred value: a few cm, book gives none) | 3593-3594 |
| W15 | Foot is secondary: heel leads, the foot drags behind then flops forward, the heel controls it. Heel flat on the ground for the feeling of weight. Keep the foot back until the last possible moment; toe leaves the ground at the very last instant | Heel path leads the toe on swing; toe stays planted through Up; ankle delay vs knee | 4813-4819, 5689-5690 |
| W16 | Pass position can be put anywhere (up, down, sideways, delayed): the same contacts with a different middle make a different walk | Pelvis Y and foot path at pass is a free parameter per style | 4003-4041, 4113-4119, 7313-7322 |
| W17 | Plan order: contacts first, then passing, then down and up positions (Kahl, Williams); alternative: Down positions first (Babbitt) gives a grid for eccentric walks | Keys: contacts -> pass -> down/up -> inbetweens | 4156-4235 |
| W18 | Do not make body/head cycles in circles or figure 8s; keep the mass mostly straight up-and-down (circles read as pigeon walk) | Pelvis/head XY trace: mostly vertical, little lateral loop | 4456-4467 |
| W19 | Different timings for legs, arms, head, body on the same walk: e.g. feet on 8s (3 steps/s @24) and arms on 16s = arm swing twice as slow as feet | Arm cycle period vs leg cycle period ratio; needs ones for fast arm/leg combos | 5366-5402, 5700-5701 |
| W20 | Counteraction: soft/loose masses move opposite to the main mass. When body goes down, belly (fat man), buttocks, breasts, hair, drapery go up and vice versa; restrain it, "just give some movement" | Secondary mass Y in antiphase with pelvis Y, smaller amplitude | 5409-5428, 5696-5697 |
| W21 | Limb ends are delayed: hands, drapery follow later than the main action | Wrist/hand lags elbow by 1-2 frames | 5434-5445 |
| W22 | Cartoon walk on 8s: reduced up-and-down because the bob is in a shorter time; 3 bumps per second | Bob period 10 f @30; amplitude smaller than a 12s walk | 3895-3898, 3904 |
| W23 | Bouncy walk on 8s (formula): HIGHEST on contacts, DOWN on the passing positions, rest straight inbetweens (an inversion of the normal walk) | Pelvis Y max at contact, min at pass | 5475-5487 |
| W24 | Starting a walk: foot is lifted fast and put down slowly, anticipation first; live-action mime, starting step 12 f @24 (15 @30) (OCR? the next step is read as 19) | Start step longer than steady steps | 5001-5021 |
| W25 | Avoid pure cycles: they read as cycles. A long cycle with varied extremes/passing positions stops the eye reading a loop | Cycle length >= several steps, vary amplitudes (inferred numbers) | 3957-3959, 6593-6597 |
| W26 | Keep walk planning simple: figure moves across the screen, not walk-in-place cycle first | Authoring note | 3946-3957 |

## Character walks

| name | what the book shows / numbers | L |
|---|---|---|
| Normal / brisk | 12 f @24 per step (15 @30); arms opposite; widest arm swing at Down | 3905, 3923 |
| Stroll | 16 f @24 per step = 20 @30 | 3906 |
| Elderly / tired | 20 f @24 per step = 25 @30; sad = much slower than 12; feet trail, "bends and lingers" (OCR?) | 3907, 5626-5637 |
| Slow step | 24 f @24 = 30 @30 | 3908 |
| Cartoon | 8 f @24 per step = 10 @30, 3 bumps/s, reduced bob | 3897-3904 |
| Very fast walk / run boundary | 6 f @24 = 7.5 @30 (4 steps/s); one foot always on ground = walk, both off = run | 3903, 6116-6139 |
| Double bounce ("can do" optimism, early 30s) | Two bounces per step; 16 f @24 step (20 @30) on ones; made by combining both methods: contacts straight-leg and low, passing as the highs in between, inbetweens on thirds | 4254-4318 |
| Strut / energetic superoptimist (Milt Kahl) | Contacts with straight legs first, then pass, then Downs, then Ups; loaded with vitality | 5710-5766 |
| Angry | Extremes on contacts, arm/elbow broken, back arch reverses each step; example on twos, 14 f @24 per step (17-18 @30) | 4557-4584 |
| Masculine | Legs well apart, lots of up and down on head and body | 3718-3719 |
| Feminine / effeminate | Short steps in a straight line, legs close, little up and down; head level as on a tightrope; crossing the feet turns masculine into effeminate | 3705-3728 |
| Sneak, slow | 32 f @24 per step (1.33 s = 40 @30) on twos, head slightly back, hands go back as head goes forward (counteraction); body goes back when foot lifts, forward when foot takes weight | 5837-5880, 5810-5822 |
| Sneak, average | 24 f @24 (30 @30): fear or mischief, on toes; fast version 16 f @24 (20 @30): sure of self | 5802-5803 |
| Sneak, very slow planning | 36 f @24 (45 @30) per step, 4 planning drawings | 5914 |
| Forward / sneaking-run | 10-14 f @24 (12-17 @30); really fast ones on 3s or 4s (OCR? "22 frames" nearby) | 5804-5806 |
| Fast sneak / "between walk, run, sneak" | versions on 5s (about 5 steps/s) and on 6s (4 steps/s); up in the air one frame; needs ones; feet flick, put down gingerly | 6022-6079 |
| Drunk | Many types listed (silly, lascivious, self-pitying, dignified, fighting, first-time...); whole point is regaining balance after almost falling | 5603-5666 |
| Sailor | Whole body rocks side to side; exaggerated foot action, legs lifted higher than normal | 5614-5623 |
| Hopping kid walk | Step, then pop up in the air for 4-6 f @24 (5-7 @30), click down, next step | 5490-5519 |
| Carrier (sack, heavy) | Body bent to counterbalance, knees bent, feet shuffle and splay, move more slowly, passing foot rises only slightly, body hardly leaves the ground; shoulders lower, arms stretch, head/neck down | 8809-8838 |
| Pigeon | Circular body/head cycles; avoid unless wanted | 4457-4459 |
| Box walk | Head floating level, butt/pelvis actively moving up/down and side to side gives the weight | 5529-5532 |
| Emotion list by speed/bob | sad, depressed (downstairs), sprightly (upstairs), young, lame, inhibited, militaristic: book names them but the OCR gives no numbers | 5626-5649 |

## R. Runs, jumps, skips

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| R1 | Walk: one foot always on the ground. Run: both feet off the ground at some point for 1, 2 or 3 positions (that is the walk/run distinction) | Flight frames count: walk 0, run >= 1 | 6116-6139 |
| R2 | Normal run on 6s = 4 steps/s @24 (7.5 f @30), feet off the ground for 1 frame @24; cartoon run on 6s: both feet off 2 positions + violent arm swing; "real" version: reduced arm action, hardly any up and down, both feet off for 2 frames | Flight 1-2 frames @24 (1-3 @30) | 6144-6173 |
| R3 | Raise the body on the Up position only 1/2 head, even less; never a whole head | Pelvis Y rise <= 0.5 head height (head = rig head unit) | 6186-6193 |
| R4 | Runs are always on ones; fast action cannot be done on twos | Pose changes every frame | 6200, 6869 |
| R5 | A walker on 12s might run on 6s: run step = half the walk step time. 8 f @24 = 3/s jog is a slow run | Run step <= 7.5-10 f @30 | 6183, 3902-3904 |
| R6 | Leg action should predominate in a fast run; arms (opposite legs) restricted, bent at the elbow. If arms pump every 4 f @24 (5 @30, 6/s) go on twos for arms: pumping on 12s | Arm swing amplitude small at >= 4 steps/s; arms never dominate silhouette | 6322-6349, 6369-6383 |
| R7 | Arms can swing at half or double the leg rate; arms swinging twice as fast as legs (feet on 16s, arms on 8s) is "very effective on a run" | Arm period = 0.5x or 2x leg period | 5380-5402, 6389-6397 |
| R8 | Long legs need at least 6 positions per stride for a fast run; heel moves in an arc, heel leads toe follows. Babbitt preferred 6-frame runs to 4-5 drawing ones | Drawings per step >= 6 for tall figure at 4 steps/s | 6296-6319 |
| R9 | Short-legged figures: 4-drawing formula (6 steps/s @24), arms stretched out front because there is no time to swing; 3-drawing runs and the fastest 2-drawing run (12 steps/s) are a cartoon cheat, avoid for realistic figures | n/a for realistic rig | 6516-6524, 6600-6726 |
| R10 | Vary silhouettes between steps so the eye does not read one leg/one arm going around; fast run: positions should overlap slightly; vary every other passing position (higher/lower), flip body concave/convex | Compare L and R step poses: not identical (small asymmetry) | 6255-6257, 6359-6371, 6416-6434 |
| R11 | Run body: head can go up/down, side/side, back/forth; body bends/twists opposite on extremes, kept straight on pass; lean forward; head slightly up on passing | Torso lean forward angle, pelvis/shoulder counter-twist | 6178-6222 |
| R12 | Heavy runner: the Down immediately follows the Up (he must lift himself every step), more up and down; head leans forward to push | Higher Y amplitude, shorter flight | 6459-6461 |
| R13 | Round a corner: lean toward the centre of the turn like a motorbike; lead with the hips; feet may skid (Chaplin hop-turn, skid ~1 s) | Torso roll toward turn, proportional to speed | 6483-6500, 9253-9269 |
| R14 | Jogger 6s (4 steps/s): both feet in air for just one frame, small strides, feet twist, arms pump in small circle, head just bobs. Young girl on 8s with one drawing off the ground | Flight 1 frame | 6439-6452 |
| R15 | Skip = two bounces on one foot: step-hop, step-hop; step usually takes twice as long as the hop; feet change each pair; foot skids a bit going forward. Rope-skipping girl: double bounce with accents; boxer hardly leaves the ground | Contact count: 2 per foot per skip; step:hop = 2:1 | 6992-7034 |
| R16 | Skipping walk example: contacts 8 f @24 apart (10 @30) = 3/s, Downs on the passes give 3 downs/s = triple bounce; arms widest on contacts 2 and 3 etc.; on twos | Pelvis Y: 3 minima per s | 7053-7090 |
| R17 | Jump from standing: ~1.25 s @24 (30 f @24 = 37 @30) for the whole jump; stretch in the air, big squash/anticipation before | Standing jump total ~ 37 f @30 | 7210-7239 |
| R18 | Broad jump: run turns into an anticipation (spine shape reverses); hurdle: progress pauses only long enough to clear, short anticipation, push head forward, reach, stretch, land, back to run | Anticipation short (a few frames) | 7131-7169 |
| R19 | Put lots of lean into the bodies; "when you think you have gone far enough, go twice" | Lean angles large in extremes | 7171-7181 |
| R20 | Weight on a jump: delay a leg (do not let everything leave together) to avoid floating | Trail leg leaves the ground 1-3 f later and lands later | 7192-7208 |

## F. Flexibility (breakdowns, overlap of joints)

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| F1 | Do not go straight A to B: go A to X to B. Where the middle goes sets character; favour A or B (close to one extreme) for a snappier move | Mid pose differs from mean of extremes; offset toward A or B | 7313-7322, 7544-7561 |
| F2 | Break joints successively: arm up = elbow leads, wrist and fingers drag; on return the elbow breaks the other way while the hand still goes up; each joint reverses in sequence; fingers last | Rotation peaks: shoulder, then elbow, then wrist each 1-2 f @30 later; each peak a local extreme with direction reversal | 7884-7920, 7988-8083 |
| F3 | Action starts at the hips in most big body actions (table slap: hips, then body, elbow, forearm, hand); then elbow leads on the downstroke while the hand drags; wrist leads, fingers/tip drag | Lag order pelvis -> spine -> shoulder -> elbow -> wrist -> fingers | 8019-8083, 8250 |
| F4 | A joint may bend backwards on a break frame; bones stay the same length; it is fine on screen because it lasts ~4 f @24 (1/6 s) and is felt, not seen | Break frames <= 5 f @30 (inferred conversion) | 4493-4518, 5321-5323 |
| F5 | Get a clear opposite pose between extremes (e.g. back arch fully concave then reverse to convex) | Spine curvature sign flips between consecutive extremes | 8612-8623 |
| F6 | Displace the hand at an impact so it does not just stop; when a hold of pressure is released, the fingers/hand drag and peel; open fingers straight on the way down | Contact frame: hand offset from the surface; one-frame displacement then settle | 8252-8272, 8341-8350 |
| F7 | Breakdown placement in the middle reduces stiffness; straight inbetweens everywhere = stiff as a board; ease with arcs | Mid pose off-line | 7950-7970 |

## O. Overlapping action and follow-through

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| O1 | Overlapping action: one part starts first, others follow; things do not start or end together | Joint start frames staggered, end frames staggered | 7690-7710, 7862-7868 |
| O2 | Turn example: hips/stomach start first, head delayed, blink last; head can lead instead (different character) | Pelvis yaw begins before head yaw by several frames (book: "delay the head") | 7755-7842, 7849-7860 |
| O3 | Follow-through is generated by the main action: clothes, hair, jowls, ears arrive after the main stops, overshoot then settle | Secondary chain peak 2-4 f @30 after main stop (inferred values), damped | 7700-7710, 9123-9148 |
| O4 | Main action also stops in parts, finishing at different times; there is no real action where all parts move uniformly | Stop frames differ per segment | 9144-9148 |
| O5 | Counteraction: one part forward while another goes back, one up while another down | Antiphase of neighbouring masses | 7873-7883 |
| O6 | Drapery speed follows action speed: a light coat/nightie blossoms and flaps violently at a sudden stop, then flops back and settles | Cloth/overshoot amplitude proportional to speed before stop | 9123-9144 |
| O7 | A foot that lands must be followed by something: weight on it, rock forward, or raise the other foot; never stop dead | After landing within a few frames: weight transfer or other foot lift | 9116-9120 |
| O8 | Face: change travels across (eyes then nose then mouth then hair, or reverse) with overlap | Facial channel start offsets (not needed on stick head, inferred) | 8536-8553 |
| O9 | Vibration/shake: interleave two drawing series (side-to-side formula) or stagger exposures back and forth to make shudder, laughter, crying, cold | Alternate poses A/B each 1-2 f | 10373-10523 |

## WT. Weight

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| WT1 | Know where the weight is on every drawing, where it comes from, where it is travelling | CoM over base on every key; verifiable plot | 8726-8731 |
| WT2 | Heavy walk feel: Down pose with leg bend absorbing force | Knee flexion at Down, pelvis drop | 8733-8736 |
| WT3 | To pick up weight you must anticipate it: look, size it up, walk around it, bend knees, get as close as possible, spine reverses its arch, head straightens, adjust feet for purchase; lift from the hips, not just arms | Body drops, back arches back, then lifts; crouch precedes hand contact | 8737-8806, 9022-9028 |
| WT4 | The weight shows in effort to start, change direction, or stop it; stopping is the hard part and shows weight; a heavy mass keeps going | Decel/stop time longer for heavier body | 9079-9083, 9094-9122 |
| WT5 | Carrying: body leans to counterbalance a sack, knees bent, feet shuffle and splay like a tripod, slower, passing foot rises slightly, body hardly leaves the ground; shoulders lower, arms stretched, head/neck down | Pelvis Y amplitude down, step length short, feet apart wider | 8809-8838 |
| WT6 | Heavy objects falling: hard ball/box bounces very slightly and rolls, no squash; tennis ball squashes; silk handkerchief and heavy overcoat fall differently (air catch) | Per-object bounce height and squash | 8914-8938, 9035-9059 |
| WT7 | Light object: reverse the feather/arm shape to make it lighter; a pencil is lifted from the elbow, a heavy thing from the hips | Source joint of the lift | 8889-8890, 9022-9028 |
| WT8 | Dance: it is the up and down of the body (weight) in rhythm, not the feet; block the body up/down first; accent either the down or the up; hips and shoulders counter each other | Pelvis Y keyed to the beat; shoulder/hip roll opposite | 9276-9390 |
| WT9 | Pushing: arms bend, feet slip, resistance comes from the object | Contact reaction of the pusher | 9065-9076 |
| WT10 | Weight by size and age (heavy, fat, old, thin): generalise; "no two characters walk the same"; per type change the up/down, spread, timing | Per body type: pelvis bob amplitude, step time, stance width (see inferred table below) | 5578-5600, 6886-6895 |

## A. Anticipation, takes, accents

| id | rule | how to measure on a keyed rig | L |
|---|---|---|---|
| A1 | Before going one way, first go the other way (back before forward, down before up, up before down) | Pre-roll pose in the opposite direction in the frames before the main move | 9481-9482, 9523-9529 |
| A2 | The anticipation is usually slower and less violent than the action ("slow anticipation... ZIP = fast action") | Anticipation duration > action duration | 9501-9502 |
| A3 | Whole-body action needs a whole-body anticipation (tremendous latent force); small movements get small understated anticipation (chair rise: back before forward, down before up; hand before writing) | Magnitude proportional to the action | 9494-9496, 9550-9551, 9646-9661 |
| A4 | Invisible anticipation: 1-2 frames in the opposite direction, too fast to see, felt as "snap" (@30: 1-2 f) | Opposite-direction key 1-2 f before the main move | 9793-9803 |
| A5 | Start of a walk: the obvious foot is wrong; lift the other foot / go back first | Pre-lean opposite to travel | 9570-9575 (OCR?) |
| A6 | Jump: go down before you go up; diving board: anticipate down | Crouch frames before take-off | 9616-9635 |
| A7 | Punch/hit: do not show the fist hitting the chin; show it after it passed, with the chin already displaced; sound on that frame | Contact frame skipped; displacement frame holds the sound | 9695-9714 |
| A8 | Anticipation can be corny; surprise when audience expects it. Do the unexpected | Authoring note | 9717-9726 |
| A9 | Anticipate the anticipation: a small up before the main down (double anticipation); a baseball catch then throw | Two opposite-sign pre-keys | 9871-9877, 9823-9829, 10152-10153 |
| A10 | Take = anticipation of an accent that then settles: sees something surprising -> goes down (anticipation) -> goes up (accent) -> settles | Three-phase curve on head/torso Y | 9851-9865 |
| A11 | Standard straight up-down take formula: down on twos, up on ones, down on twos; a double-take can use the same chart with head dragged side to side | Down 2 f spacing, up 1 f spacing (@30 convert x1.25) | 9895-9933, 10016-10030 |
| A12 | Hard accent recoils (bounces back); soft accent cushions into a hold. Sound lands on the bounce-back, one frame after the contact (hammer on nail) | Hard: overshoot then reverse; soft: ease into hold | 10216-10255 |
| A13 | Take shown without anticipation: Rathbone take = 8 f @24 (10 @30), accent reached in 3 f (4 @30), then cushions to a virtual hold; effective when the head is frozen in the centre of frame | Peak at frame 3 @24 then settle | 10172-10195 |
| A14 | Keep volume during a take; do not worry about distorted in-between frames | see T16 | 10045-10058 |
| A15 | Dialogue accents are mostly head accents UP | Head Y local max at stressed syllables (inferred from OCR) | 10343-10346 (OCR?) |

## Where the book disagrees with plain biomechanics (or says "exaggerate")

| # | book | plain biomechanics / usual rig default | L |
|---|---|---|---|
| D1 | Arm swing widest at the Down pose, not on contact ("a normal" walk) | In real gait peak arm swing is near heel strike | 3794-3797, 5213-5214 |
| D2 | Add ups and downs beyond a traced real walk, or it floats | A tracer would copy the capture amplitude | 3731-3737 |
| D3 | Pass pose may be placed anywhere, even DOWN (cartoon walk) or sideways | Hip is highest near mid-stance in a real walk | 4003-4032 |
| D4 | Contact is a mid-height, no-weight pose; the lowest point is the Down pose just after contact | Hip height at heel strike is near the low in double support, so book and biomechanics roughly agree for a normal walk, but the book does not use contact as the low in inverted/bouncy walks | 4176-4182, 3843, 5475-5487 |
| D5 | Bouncy walk: highest at contact, lowest at passing | Opposite of real | 5475-5487 |
| D6 | Joints can bend the wrong way on single frames; bones may "break" | Rigid bone limits | 4493-4518, 7918 |
| D7 | Foot swivelled backwards on contacts of the angry walk | Joint limits | 4582-4617 |
| D8 | Run: raise the body max half a head; passing used as the Down; both feet off the ground only 1-2 frames | Real runs have larger flight/bounce in absolute terms | 6186-6193, 6144-6173 |
| D9 | 2-drawing run at 12 steps/s | Humanly impossible | 6720-6778 |
| D10 | Anticipation 1-2 frames invisible | No physical equivalent | 9801-9803 |
| D11 | Heel leads, foot flops forward and drags | Real foot is not a passive follower | 4813-4819 |
| D12 | Everyone walks on 12s (2 steps/s) | Real cadence varies (~1.8-2 steps/s), height-dependent; the book's anecdote (Kahl) says "invariably 12 exposures" | 3921-3928 |

## Body types (inferred, none given as numbers)

The book gives no adult/heavy/thin/child/elder numbers. Directions it does state: heavy -> more up and down, Down immediately after Up in a run, slower passing foot (WT5, R12); elder/tired -> 20 f @24 per step (25 @30) (W2); child -> small stride, quick (short-legged figures: fast legs, 4 vs 6 drawings) (R9, 6511-6513); thin/athlete: shorter drawing counts not needed (R8). For the rig these ratios are (inferred): step time heavy 1.1x, thin 1.0x, child 0.8x, elder 1.6x of adult 15 f @30.

## Counts

T 16, W 26, Character walks 22 rows, R 20, F 7, O 9, WT 10, A 15, disagreements 12.
