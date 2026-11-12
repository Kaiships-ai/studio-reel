# allout: the reference-look build (ep 1 first)

Goal: a stick-man episode a viewer cannot tell from the reference. The kit's own sets, props, camera planner and gates
stay as they are; an act opts in with two keys.

| Key (act data) | What it does | File |
|---|---|---|
| `setModule: '/styles/stick-man/allout/sets/<name>.js'`, `setOpts` | builds the place from this folder instead of `lib/sets` | engine/play.js (hook) |
| `direct: [shots]` | hand-directed camera: every shot has `intent` + `why`, cuts are cuts, a move starts on a word | director.js |
| `make: { x: { kind: 'ao_anim', prop: 'x' } }` | keys a set prop's own animation (`set` beats) | fx.js |
| `make: { x: { kind: 'ao_follow', prop: 'x', at: { head: 'kip', up, fwd } } }` | a prop that rides an actor (the medal) | fx.js |
| reel `look: { ao, aoRadius, shadowRadius, shafts }` | GTAO contact shadows, softer sun shadow, light haze | engine/look.js (default off) |
| `import '/styles/stick-man/allout/handprops.js'` | glass beaker (with the bugs you can see), gold medal, culture bottle, stamp, 14-day blister, hanky hand props (no ink) | handprops.js |
| `import '/styles/stick-man/allout/acting.js'` | whole-body comedy poses (chug, slam_beaker, pat_belly, nod, belly_laugh, point_laugh, fan_nose, retch, wipe, wag_finger, thumb_self, feed_tube, gag_tube, dust_hands, pop_pill, peer, blow, cheer_fist, scope_twiddle, read_paper) and tumble verbs (faceplant, faint, topple: the figure tips about its soles, `deg`) | acting.js, engine/cast.js x_tumble |
| `make: { t: { kind: 'ao_tube', from, via, to } }` | a cable from a fixed point through a hand into a mouth (keys show, feed) | fx.js |
| `make: { f: { kind: 'ao_flies', at: { head: 'kip' } } }` | flies buzzing round a head (key on) | fx.js |
| shot `travel: 'rush'` | hold, then a crisp travel (no smear); 'land' arrives with a small settle | director.js |

Look rules the sets follow: physically lit standard materials (never toonified, never inked: only the cast is inked),
bevelled edges, an image-based fill per place (`envMap` panels = its windows and lamps), one warm key + practical
lamps against a cool fill, a painted self-lit backdrop for skies and streets, and story props built into the set
with their own keys.

Sets: `lab-night` (also `setOpts: { mode: 'day' }`), `perth`, `micro`, `hall`, `pigpen`, `kitchen`, `clinic`,
`stomach`, `nobel`, `canyon-edge` (two rival lines on a ledge: the blue gapped line, the purple tight line that buckles
over the lip; spread `EDGE_LOOK` for its approved light). Film: `films/sf-ep01-allout/` (local data).

Round 3 (ep 1): one acted gag per line, the doubter as a thread, one hard cut ("Wait."). Engine fix that came with it:
a director shot aimed at an actor used to re-pose the whole scene at the shot's first frame (bodies, props and effects
froze for the shot); `update()` in engine/play.js now poses the current frame again after the camera solve.

Finish kit (from the private master study, 11/11; each is opt-in, an act without it renders as before):

| Gap | Use | File |
|---|---|---|
| tone | act `grade: { shadow: { c, k }, shoulder, soft, grain }` (deep shade lifted toward a colour, ink untouched; highlight roll-off; soften; grain) | engine/look.js |
| haze | act `haze: { color, near, far }` (distance fog toward the sky) | engine/play.js |
| lens | shot `preset: 'hero' \| 'macro' \| 'wide'`; act `look.dofAuto: { below, gain }` | director.js |
| chase | shot `cam: { chase: { a, b, ax, ay, bx, by, back, up }, lens }` (two subjects pinned to two screen points) | director.js |
| motion blur | act `look.mblur: { px, k }` (only when the image travels faster than px per frame at 1080) | engine/play.js, look.js |
| light | act `light: { sunDir, camKey: { az, el } }` (a lower key; the key rides the camera so the face in shot is lit) | engine/play.js |
| soft fx | `make: { kind: 'ao_puff' }` (soft smoke / dust / fire sprites, no ink), `ao_aura` (flame tongues + a warm light), `ao_debris` (pebbles at the feet) | fx.js |
| costume | `import costume.js`; cast `costume: ['belt', 'holster', 'holster:L', 'hat:cowboy' \| 'hat:flat' \| 'hat:bowler']`; verb `lose_hat` (the hat flies off) | costume.js |
| acting | act `actingAmp` / cast `amp` (all pose sizes); faceplant legs kick, skid, spin (face to camera) | engine/poses.js, acting.js, engine/cast.js |
| sets | `K.planks`, `SURF.weathered`, `K.extras` (background people), `K.skyDome` (a sky that rides the camera), card `fog` | kit.js |
| preset | `LOOKS.sunnyExterior` / `withLook(name, act)` | looks.js |
| faces (proposal, off) | `import face_extras.js`; verb `face_extra` kind veins \| glow \| dirt \| sweat | face_extras.js |
