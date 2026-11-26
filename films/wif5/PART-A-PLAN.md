# Part a to a 720p cut (starts the minute #208 + #209 + #210 are in main)

Part a "Countdown", frames 0-504. One builder + one blind reader at a time. Kai sees part a before b-j start.

## 0. Base (director, 5 min)
- Merge origin/main into KineBeo/whatif1-v5; rebuild the Pro tree `~/v5-wif5` from that main (git archive), relink node_modules/.pixi.
- `fits.mjs films/wif5/parts/a` exit 0 with the new hand-prop rows; old dbg rows are stale (gate exit 2), so every still is re-rendered with `--dbg`.

## 1. Stills fix round (builder, Pro, 720p review tier)
Contacts re-shot against handgrip, with real kit hand props (no stand-ins):
| contact / fault | change |
|---|---|
| balloon string (a3-1) | kit balloon from #209 in the girl's hand, on a pose whose `hand|balloon|child|hand` row passes |
| dad-daughter hands, old couple hands | hand-to-hand: contact still at 230 / 250 checked by eye (handgrip covers props only) |
| vanish at 331 (a3-2) | balloon rises out of her opened hand; no women anywhere in frame, background included |
| 450 (a3-3) | dad's hand reaches up after the balloon, head inside frame, lower half filled (lamp pool, crowd legs, dropped things) |
| 300 board (a3-4) | board reads midnight clearly ("00:00"), clock 12, family larger, faces seen |
Gates on the stills' rows: handgrip, facegate, valuegate, shotfaults, fits all exit 0 (waivers only the existing 5 set-light ones).

## 2. Blind read 5, part a (verifier-medium, stills only)
Pass = every beat reads with no caption; open faults go to FAULTS.md. Two failed fixes on one beat = change the shot.

## 3. Motion (builder, Pro)
- Blocking pass of 0-504 at 270x480 (one job), then 720p review render `a_0-504_720.mp4` with `--dbg`.
- Clips: library first (walk, look-up `Gest_LookUpShade_Once` for the elders if it reads, give for a hand-over if staged); no new motion without a reason.
- Gates on the motion rows: handgrip every frame, facegate, valuegate, shotfaults, clothgate.

## 4. Sound
Fixed VO lines for 0-504; design: square crowd + countdown chant, cut to wind + snow at 330, one balloon rubber squeak, footsteps stop. Mix at the levels of `audio/`.

## 5. Cut and check
- 720p part a cut with VO + sound; blind reader watches once with sound off, once on: what happens, what is felt, any visible fault.
- chefkiss pass, then Studio shows Kai: page with the clip first, few words, FAULTS open/closed.

Budget: no extra review rounds; a reader's finding that does not change what a viewer sees is logged "ẩn".

## Rebuild note (26/11, #208)
- c: wif5_teacup steam and d: wif5_lantern2 shell/glow core must be marked non-solid in the film (additive / userData) so propBox and collide ignore them; d uses the kit lantern from #209 where it is held.
