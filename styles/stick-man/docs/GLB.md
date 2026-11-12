# Sets from Blender (.glb)

Blender is the asset workshop: model or reuse kit pieces there, export them once, dress a three.js set with them. The
reel engine never renders in Blender. Packs live in `styles/stick-man/assets/<pack>/` (none is kept in the kit today).

## Recipe (6 steps)

| # | Step | How |
|---|---|---|
| 1 | Pick objects | One piece = one kit master collection `KIT_<group>_<name>[_<variant>]` (or one object). Read the kit's README/PROGRESS for names. Work on a COPY of the .blend in `export/`; never save over the source. |
| 2 | Export | `Blender -b <copy.blend> --python styles/stick-man/tools/export_glb.py -- --out styles/stick-man/assets/<pack> --pieces facades_corner_shop,street_tree,...` Headless only. Writes `<name>.glb` per piece (group and variant hash dropped) + `manifest.json` (bytes, tris, bounds). |
| 3 | Load | In the set: `const g = glbKit(stage, '<pack>', COLLIDE); await g.load([...names])` inside `build()`. The loader awaits every file and texture before `build()` returns, so frames are deterministic and `__ready` comes after the load. |
| 4 | Toon | Automatic in `g.place(name, [x, y, z], rotDeg)`: every material becomes `look.js` `toon()`, the painted map (windows, brick, shelves, signs) times the toon ramp, or a flat colour; `_e_` materials keep a soft glow; ink line and shadows on. `{ ink: false }` for floors and far backdrops, `{ tint: [r, g, b] }` to warm a night-painted texture. |
| 5 | Collide | Automatic: `place()` pushes one box per piece into the set's `COLLIDE` from the triangles crossing the body band z 0.05-1.8 m (lamp arms and awnings overhead do not block the pavement). `{ solid: false }` for floors and backdrops; add hand boxes for code-built pieces. |
| 6 | Register | The set lives in `allout/sets/<name>.js` (an act's `setModule`), a row in SETS.md, `SHOTS` presets in the set (below), then prove it: two figures on the marks, `shot.mjs --frames ... --out` stills, `--report` with collisions none, frame YAVG 109-163. |

What the exporter does per piece: flattens collection instances, applies modifiers (evaluated mesh), meshes curves and
text, bakes world transforms, merges into one mesh, triangulates. A material whose colour comes from an image keeps it:
the Mapping node is baked into the UVs, the image is resized to <= `--tex` (512) px and stored as JPEG (q82) inside the
.glb. Other materials become flat colours. No Draco (the stock `GLTFLoader` reads it), metres, glTF +Y up. The kit's own
origin stays: buildings face -y with the facade on y = 0, vehicles point +x, the sidewalk's kerb is on y = 0 (0.16 m
high: sink it with the road so the pavement top is z = 0). A procedural (non-image) colour would need a Cycles bake to
an image first.

## Framing presets

A set exports `SHOTS = { wide, medium, close }` for an act's `shots` (`{ f, ...SHOTS.wide, of: [...] }`). The wide
keeps the figures at 25-30 % frame height and puts them low (lens 17, camera 1.7 m, `headY` 0.56) so the street or
square fills the top of the frame; `angle` turns it down the street.

## File size rules

| Rule | Limit |
|---|---|
| One .glb | <= 1.5 MB (the exporter decimates until it fits: `--max-kb`) |
| One pack (`assets/<pack>/`) | <= 10 MB |
| Textures | <= 512 px long side, JPEG inside the .glb (no alpha: grates and cut-outs come out opaque) |
| No third-party models without a note in `THIRD_PARTY_NOTICES.md` | |

No repo hook guards file size today; keep to these limits by hand (read `manifest.json`).
