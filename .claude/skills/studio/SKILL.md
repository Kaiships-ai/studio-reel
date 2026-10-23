---
name: studio
description: Start here. Sets up Kaiships Studio on this computer the first time (installs pixi, then node, python, ffmpeg and the renderer inside this folder, then renders a test reel), writes workspace/brand.md, helps pick a style and a content type for the first reel from a rough idea, and on every later run checks the setup and says which command comes next. Use when the user types /studio, says "set up", "install", "get started", "which style", "my first reel", "what do I do next", or when any other command fails because the setup is missing.
---

# /studio

The buyer's one entry point. Be brief: the buyer sees ✓/✗ lines and one next step, never a stack trace.
Run every command from this folder (the one that holds `pixi.toml`). Shell-agnostic: the same commands work in
Git Bash, PowerShell, zsh and bash. Never ask for admin rights except the one Linux step named below.

## 1. pixi (the installer) — only if missing

Check in this order and use the first that answers `--version`:
`pixi`, then `~/.pixi/bin/pixi` (macOS/Linux) or `$env:USERPROFILE\.pixi\bin\pixi.exe` (Windows).

None found: tell the buyer "Installing pixi, the free tool that installs everything else into this folder (no admin
needed)", then run the line for your shell (version pinned; the second part turns off pixi's anonymous usage ping):

- Git Bash / macOS / Linux: `curl -fsSL https://pixi.sh/install.sh | PIXI_VERSION=v0.82.1 PIXI_NO_TELEMETRY=1 bash`
- PowerShell: `$env:PIXI_VERSION='v0.82.1'; $env:PIXI_NO_TELEMETRY='1'; irm -useb https://pixi.sh/install.ps1 | iex`

This session does not see the new PATH, so for the rest of the session call pixi by its full path from above.
Say once that new terminals will find `pixi` by name.

## 2. Setup and check

Run `pixi run studio doctor`.
- Every line ✓ → go to step 3.
- Any ✗ → run `pixi run studio install` (first time about 5 minutes and ~900 MB of downloads; tell the buyer before
  starting). It prints ✓/✗ and a `fix:` line for anything wrong. Do what the fix line says, then run install again.
  - Linux, browser libraries missing: the fix is `pixi run studio linux-deps`, which asks for the computer's
    password. Ask the buyer to run it themselves by typing `! pixi run studio linux-deps`, then run install again.
  - No internet, a proxy or antivirus blocking downloads: say so plainly; the setup needs internet once.
- Install passes but a reel later fails in rendering: run `pixi run studio doctor` again before anything else.

## 3. Brand (`workspace/brand.md`)

If `workspace/brand.md` is missing, ask in ONE message (the buyer can skip any): what the account is about, who it
talks to, what they sell or offer, the one word people should comment (CTA keyword), what the DM sends them (with a
link if they have one), their timezone, and two or three lines they would actually say on camera.
Write `workspace/brand.md` in the format of `workspace/README.md` with what they gave; leave the rest out.

## 4. First reel

Only when no film is finished yet (no `films/<name>/<name>.mp4`; `films/_studio-check/` is the setup test and does
not count), or when the buyer asks which style to use. Otherwise go to step 5.

1. Ask exactly this, alone: "What do you want your first reel to be about? A rough idea is fine."
2. Read `content-types/README.md` and `styles/catalog.md`. Propose ONE content type (its name and one line on why)
   and 2–3 styles, each with its name, one line on why it fits this idea, and its `showcase.jpg` path. Match the idea
   to each style's "Good for" and look, and pick from different categories. Propose an Evidence Films style only
   when the idea is about real data, places or objects, and say it needs the buyer's real material (imagery, data,
   scans). Offer to open the images: `open <path>`
   (macOS), `start "" <path>` (Windows), `xdg-open <path>` (Linux). The buyer picks one, names any style in
   `styles/README.md`, or asks for more (2–3 new ones, never a repeat).
3. In one message, propose the inputs: the script (you write it from the idea, or they paste theirs), a storyboard
   to review before animation (default no), and the mode: **cook** (you take the idea and go all out, no questions)
   or **direct** (they direct: their script word for word, their storyboard if they have one). Default cook for an
   idea, direct for a pasted script. If the reel needs facts only the buyer has (their menu and prices, the apps
   they use, their own numbers), ask for them in this same message: cook asks nothing later.
4. Run `/make-reel <idea, or the script in quotes> --style <slug> --type <type> --mode <cook|direct>`, adding
   `--storyboard` if they want to review it. Say where it lands: `films/<name>/<name>.mp4`, `<name>-cover.png` and
   `CAPTION.md`.

## 5. Next step

Look at what exists and say exactly one next command (and why, in one line):

| State | Next |
|---|---|
| no `workspace/plan.md` and `.claude/skills/ig-plan/` exists | `/ig-plan` |
| a plan slot has no `workspace/scripts/<slug>.md` | `/ig-reel slot <id>` |
| a script with `status: draft` | `/ig-human <slug>` |
| a script with no `films/<slug>/<slug>.mp4` | `/make-reel workspace/scripts/<slug>.md` |
| a reel with no `workspace/dm/<slug>.md` and the brand has a CTA keyword | `/ig-dm <slug>` |
| a reel with no `workspace/captions/<slug>.md` | `/ig-caption <slug>` |
| everything done, or the Starter edition (no ig-* skills) | `/make-reel <your topic>` |

If the buyer has not designed their presenter yet, mention once: open `character-designer.html` (double-click it),
pick the look, press "Copy for Claude", and paste the result here; `/make-reel` will use it.
