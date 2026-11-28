---
name: verify
description: Prove a change to how a stick-man figure looks (body, hair, outfit, costume, palette, face in styles/stick-man/engine/ or kit/cast/) did not regress. Drives the golden look bench (tools/run/lookbench.html, every look's fingerprint as a tile), the hair-swap journey on the GPU, and the Mac Pro pixel sheets (wardrobe.html 90 cells, hairsheet.html type=mw, faces.html, rigtest --sheet) against the C1 baseline. Use before handing over any appearance-path PR, when a golden tile turns red, or when asked for before|after proof of a look.
---

# verify (stick-man looks)

The surface is how a figure looks. Two locks hold it, both taken at C1 before any edit:

| Lock | What | Where it runs |
|---|---|---|
| Golden fingerprint | 65 looks hashed headless: scene graph, geometry, materials, every canvas draw and every `putImageData` byte | any machine, CI (`test/unit/stick-look-golden.test.mjs`) |
| Pixel sheets | the four look sheets at review tier (720x1280), compared pixel by pixel | the Mac Pro only |

Kai's Mac runs node only: the fingerprint, the test, the scorecard. Every browser page (the bench screenshot, the hair swap, the sheets) runs on the Mac Pro, one heavy run at a time. This Mac has no Playwright browser, so a page run here fails at launch, by design.

Run every command from the repo root (the checkout under test).

## Launch

On the Mac Pro, in an Orca terminal on the paired env `mac-pro` (ssh cannot read `~/Desktop` there). Make a worktree of the head under test beside the Pro's checkout and link its setup, never touching the checkout itself:

```sh
orca terminal create --environment mac-pro --worktree path:/Users/kienbeovl/Desktop/kaiships/studio-reel --title "verify <pr>" --command zsh --json
# then send, in that terminal (orca terminal send --environment mac-pro --terminal <h> --text '...' --enter):
cd /Users/kienbeovl/Desktop/kaiships/studio-reel && git fetch origin <branch> && git worktree add --detach ~/stick-sync/verify-<pr> <head sha>
cd ~/stick-sync/verify-<pr> && ln -s /Users/kienbeovl/Desktop/kaiships/studio-reel/node_modules node_modules && ln -s /Users/kienbeovl/Desktop/kaiships/studio-reel/.pixi .pixi
node styles/stick-man/tools/run/lookbench.mjs serve --out /tmp/swarm-<pr>/bench
```

Ready when it prints `lookbench ready` (it prints its `pid` first: Cleanup stops that pid). The bench page is then at the printed `bench` URL; the scenarios below start their own short-lived server and browser, so `serve` is for looking, not required for driving.

## Doctor

```sh
node styles/stick-man/tools/run/lookbench.mjs doctor
```

Read-only. Prints the checked-out SHA and branch, the machine (pixel sheets only when it names the Mac Pro, `hermes-mac`), whether port 8765 is free, and the WebGL renderer (must say ANGLE ... Metal). `doctor: ready` or it names what is not. Compare the SHA with the head you meant to test before trusting any picture.

## Drive

Every journey writes to `--out`; use `/tmp/swarm-<pr>/<journey>/`.

| Journey | Command | Passes when |
|---|---|---|
| Golden bench | `node styles/stick-man/tools/run/lookbench.mjs golden --out /tmp/swarm-<pr>/golden` | exit 0, `bench.png` shows every tile `khớp`; `golden.json` lists `fails: []` |
| Golden, no browser | `node --test test/unit/stick-look-golden.test.mjs` | 5 pass (about 8 s); the coral control moves only `look:dress` |
| Hair swap | `node styles/stick-man/tools/run/lookbench.mjs hairswap --out /tmp/swarm-<pr>/hairswap` | one `hair-<style>.png` per toon hair (11), each showing that hair on the figure; `hairswap.json` has a build ms per style |
| Wardrobe sheet | `node styles/stick-man/tools/run/sheetbase.mjs capture --out /tmp/swarm-<pr>/sheets --only wardrobe` | 90 cells `wardrobe/c_<i>.png` (cells listed in `kit/cast/sheetcells.js`) |
| Hair sheet | `... capture --out /tmp/swarm-<pr>/sheets --only hair` | 110 frames `hair/h_<i>.png` (`type=mw`: 11 styles x 10 views) |
| Faces sheet | `... capture --out /tmp/swarm-<pr>/sheets --only faces` | `faces/faces.png`, the s2 expressions |
| Rig sheet | `... capture --out /tmp/swarm-<pr>/sheets --only rig` | `rig/rig-sheet.jpg`, one row per Mixamo clip, front / 3-4 / side / back |
| Against the baseline | `node styles/stick-man/tools/run/sheetbase.mjs compare --base ~/stick-sync/c1-baseline --head /tmp/swarm-<pr>/sheets --out /tmp/swarm-<pr>/compare` | exit 0 and `index.html` says all images match; else it lists each differing cell with before, after and a red diff |
| Scorecard | `node styles/stick-man/tools/run/codescore.mjs` | no `WORSE` line against `test/golden/codescore.json` |

A sheet capture without `--only` renders all four (about 180 images, the longest journey: run it with a timeout in the background and post a line when it ends). `--console` on `lookbench.mjs` prints the page console. A changed look is never fixed by editing `looks.json`: show Kai the `compare` page, and only his row in `test/golden/approvals.json` (`by: "Kai"`, `page` = that page's link) lets the new hash through.

## Evidence

Screenshots and JSON reports stay in `/tmp/swarm-<pr>/` (on the Pro; copy what the report needs back with `scp pro:/tmp/swarm-<pr>/<file> <here>`, which works because `/tmp` is not under `~/Desktop`). A proof names the head SHA (`SHA` file of a capture, `sha` in `golden.json`), shows the action and the end state (the bench before and after a change, the before|after page), and cites the command that made it.

The C1 baseline lives at `~/stick-sync/c1-baseline/` on the Pro: 90 wardrobe cells, 110 hair frames, the faces sheet, the rig sheet, `SHA` (the commit and its `main`) and `manifest.json` (a sha256 per image).

## Cleanup

Stop only what this run started: `kill <pid printed by serve>`. The scenarios close their own browser and server. Then `git -C /Users/kienbeovl/Desktop/kaiships/studio-reel worktree remove --force ~/stick-sync/verify-<pr>` (remove the two links first: `rm -f node_modules .pixi`). Never delete `/tmp/swarm-<pr>/` or `~/stick-sync/c1-baseline/`: they are the evidence.

## Feature map

`features/README.md` indexes the stick-man feature files that already live in the repo's verify skill (`.claude/skills/verify/features/stick-man-*.md`).
