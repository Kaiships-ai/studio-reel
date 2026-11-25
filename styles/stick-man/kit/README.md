# kit: the sets, cast, props, acting and effects every stick-man film builds with

Live engine code, not a one-off study. Each file sits in the folder of what it is:

| Folder | What is in it |
|---|---|
| `sets/` | `kit.js` `createKit` (every set builds on it; how-to: `docs/SETS.md`), `rail.js` (railroad builders), `dress.js` toon dressing, `glb.js` Blender pieces, `canvas.js` painted textures, `backdrop.js` far town rows, and the set modules (`canyon-edge.js`) |
| `cast/` | what a figure wears or holds: `costume.js`, `wardrobe.js` (job uniforms and clothes, with `wear.js` and `drape.js`), `hoodie.js` with its `cloth.js` sim, `extras.js` background people, `handprops.js` (toon) and `handprops-lit.js` (the lit swap), `rail.js` (the railroad cast) |
| `props/` | story props that stand in the set: `story.js`, `dyepack.js`, and `sizes.js` (the real sizes `shotfaults.mjs` holds props to) |
| `acting/` | what plays over time: `keys.js` (the lead's acting keys), `director.js` (the hand-directed camera) |
| `camera/` | `flight.js`: `flyCam` (one continuous flight through waypoints, one `direct` entry a frame, never stops or cuts), `faceCam` (waypoints that arc round a turning figure at eye height so its face stays to the lens) and `pathOf` (a placed clip's or hand keys' path for it) |
| `fx/` | effects: `make.js` (the `ao_*` MAKE kinds), `physfx.js` (physical effects in the world), `explain.js` (explainer effects), `burst.js` (the burst), `lightbar.js` (a rotating light bar whose heads sweep, never blink) |
| `look/` | how a picture is lit: `highlights.js` (the light budget every film gets from `engine/look.js`: no prop whiter than albedo 0.8 or glowing unless it is a light, `grade.exp` on the linear scene, a highlight roll-off before the blooms and the tone mapper, the glow halo capped; `grade.shoulder` retired); `exposure.js` (`exposureWarnings`: `engine/play.js` warns on an act whose `grade.exp` is over 1.5: light the place instead) |

Code inside `styles/stick-man/` imports these by alias, `#kit/<folder>/<file>.js` (also `#engine/`, `#motion-lib/`,
`#tools/`): node reads `styles/stick-man/package.json` "imports", the pages (`reel.html`, `faces.html`, the camtry and
previs pages) carry the same importmap; `test/unit/stick-aliases.test.mjs` keeps the two in step. A film's reel files
load the kit by URL (`/styles/stick-man/kit/sets/kit.js`). `engine/play.js` loads the set module, `acting/director.js`
and `sets/backdrop.js` from here. An act or a cast entry opts in with the keys below; one without them renders as before.

| Key (act data) | What it does | File |
|---|---|---|
| `setModule: '/styles/stick-man/kit/sets/<name>.js'`, `setOpts` | builds the place from this folder (required) | engine/play.js (hook) |
| `direct: [shots]` | hand-directed camera: every shot has `intent` + `why`, cuts are cuts, a move starts on a word | director.js |
| `make: { x: { kind: 'ao_anim', prop: 'x' } }` | keys a set prop's own animation (`set` beats) | fx.js |
| `make: { x: { kind: 'ao_follow', prop: 'x', at: { head: 'kip', up, fwd } } }` | a prop that rides an actor (the medal) | fx.js |
| reel `look: { ao, aoRadius, shadowRadius, shafts }` | GTAO contact shadows, softer sun shadow, light haze | engine/look.js (default off) |
| `import '/styles/stick-man/kit/cast/handprops-lit.js'` | glass beaker (with the bugs you can see), gold medal, culture bottle, stamp, 14-day blister, hanky hand props (no ink) | handprops.js |
| `make: { t: { kind: 'ao_tube', from, via, to } }` | a cable from a fixed point through a hand into a mouth (keys show, feed) | fx.js |
| `make: { f: { kind: 'ao_flies', at: { head: 'kip' } } }` | flies buzzing round a head (key on) | fx.js |
| `backdrop: { rows: [{ piece, at, rot, tint, scale }], tint }` | far town rows 20-60 m past the set's walls (pieces `backdrop_skyline_a`, `backdrop_skyline_b`, `backdrop_roofline`); never collide, no ink, not dressing; `tint` darkens them for a night set | sets/backdrop.js, assets/backdrop/ (engine/play.js hook) |
| shot `travel: 'rush'` | hold, then a crisp travel (no smear); 'land' arrives with a small settle | director.js |
| `direct: flyCam(faceCam({ ...pathOf(placeClip(key, cur).keys), f0, f1, side, dist }), f0, f1)` | one flight that keeps the face to the lens while a library clip walks, turns or runs (H2 V2.1: faces, not the back of the hood); `pathOf` also reads hand keys | camera/flight.js |
| set `lightBar(stage, { at, colors, power, from, rise, spin, fade })` returned as a prop; `make: { bar: { kind: 'ao_anim', prop: 'bar' } }` | a siren or alarm bar that stands still and sweeps red and blue | fx/lightbar.js |
| act `grade.roll: { knee, ceil }` | this act's highlight roll-off (a close-up of the flat white head: `{ knee: 0.46, ceil: 0.70 }` as H2 V2.1's ending; wide shots kept 0.49 / 0.76); a ceiling at or under the knee is ignored with a `[kit]` warning | look/highlights.js `actRoll`, engine/look.js |

Look rules the sets follow: physically lit standard materials (never toonified, never inked: only the cast is inked),
bevelled edges, an image-based fill per place (`envMap` panels = its windows and lamps), one warm key + practical
lamps against a cool fill, a painted self-lit backdrop for skies and streets, and story props built into the set
with their own keys.

Sets: `canyon-edge` (two rival lines on a ledge: the blue gapped line, the purple tight line that buckles
over the lip; spread `EDGE_LOOK` for its approved light).

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
| costume | `import costume.js`; cast `costume: ['belt', 'holster', 'holster:L', 'hat:cowboy' \| 'hat:flat' \| 'hat:bowler' \| 'hat:top']` (each hat may add `:rrggbb`); verb `lose_hat` (the hat flies off) | costume.js |
| wardrobe | `import '/styles/stick-man/kit/cast/wardrobe.js'` (loads costume.js); cast or spec `costume: ['job:doctor']` (jobs: doctor nurse police pilot worker office manager chef student student-blazer florist) or layers one by one: garments `shirt[:office\|police\|work][:colour]` `scrubs` `coat[:doctor]` `jacket:pilot\|chef` `vest:hivis` `blazer` `cardigan` `sweater` `dress`, `skirt` `apron[:colour[:low]]` `scarf`, `tie[:stripe]` `stethoscope` `nametag` `pens` `badge:police\|id\|wings\|crest` `epaulettes` `dutybelt` `backpack`, hats `cap:police\|pilot\|scrub` `hat:hard\|toque`; a colour is a palette name (`outfit(i)` gives a crowd's: neighbours differ in value and hue), a `UNIFORM` name or `rrggbb`. Garments are painted on the torso, trims are rigid pieces on its shell bent with it, long sleeves are thin coloured tubes on the arm lines, only coat skirts, skirts, aprons and scarf ends are cloth (laid round the legs, then simulated; a seat is a solid, a hand stays outside), hats ride the head; sized from the spec's girth and leg length on every body. The sheet: `wardrobe.html` | wardrobe.js (presets, hook), garments.js, palette.js, hats.js, wear.js (shell), drape.js (cloth), sheetcells.js |
| hoodie | `import costume.js` then `hoodie.js`; cast or spec `costume: ['hoodie:grey']` (hood up) \| `['hoodie:grey:down']` (hood folded on the back); the hood is skinned between chest and head, its back peak springs and the cords swing (`PHYS.on`); a spec's own `costume` is worn by default | hoodie.js, cloth.js, assets/costume/hoodie_grey.glb |
| acting | act `actingAmp` / cast `amp` (all pose sizes) | engine/poses.js |
| sets | `K.planks`, `SURF.weathered`, `K.extras` (background people), `K.skyDome` (a sky that rides the camera), card `fog` | kit.js |
