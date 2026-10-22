---
name: ig-reel
description: >-
  Write one Instagram Reel script from a plan slot or a raw idea: three hook
  options from 26 formulas, scored; the spoken script; the on-screen text; the
  CTA; a timed beat sheet. Writes workspace/scripts/<slug>.md, which /make-reel
  can turn into the video. Use when the user types /ig-reel, wants a reel
  script, a hook, a voiceover, "make a reel about X", or "what should I say in
  this video".
argument-hint: <slot w1-tue | topic | nothing = next open slot in the plan>
---

# /ig-reel

Turns one idea into a script somebody finishes watching. By Kaiships.

Two tools live in this folder and both run. Use them; do not eyeball the hook or guess the length.

```
pixi run python .claude/skills/ig-reel/hookscore.py workspace/scripts/<slug>.md    # ranks "## Hook options"
pixi run python .claude/skills/ig-reel/hookscore.py --hook "one line"               # score one hook
pixi run python .claude/skills/ig-reel/beats.py workspace/scripts/<slug>.md --target 30   # times "## Script"
```

## 1. Gather (never stop on a missing file)

Input: `$ARGUMENTS`

- **`slot <id>`** → read that row of `workspace/plan.md` (angle, hook formula, CTA keyword, slug).
- **A topic** → use it. Take the CTA keyword from `brand.md`, else from the plan, else ask.
- **Nothing** → the first slot in `workspace/plan.md` whose `workspace/scripts/<slug>.md` does not exist yet. No plan:
  ask for a topic in one line, and say `/ig-plan` would have picked one.

Then read, if they exist:
- `workspace/brand.md`: audience, offer, `cta_keyword`, `deliverable`, and the **Voice** section. No brand file: ask in
  one message who the reel is for and what the viewer should comment, and mention `/studio` saves this for next time.
  No voice: write plainly, contractions, short lines.
- `workspace/swipe.md` (from `/ig-viral`): formulas that are working in the niche now. It outranks the defaults.
- `hooks.json` in this folder: 26 formulas, each with a template, example, on-screen version, use and trap.

If the idea is thin, do not pad it. Ask one batched question: what happened, to whom, what it cost or returned.

## 2. The shape

```
0:00 - 0:02   HOOK        the claim. Spoken line and on-screen line, written separately.
0:02 - 0:07   THE STAKE   why this matters to the viewer. One line.
0:07 - ...    THE BODY    one idea per beat; the picture changes every beat.
LAST 3s       THE PAYOFF  deliver what the hook promised, then the single ask.
LAST LINE     THE LOOP    echo one word from the hook so the replay lands clean.
```

15 to 45 seconds. Under 7 seconds inflates loops and nothing else.

## 3. The loop

1. **Three hooks, three different formulas** that fit the idea. Spoken line + on-screen line each.
2. **Write the file** `workspace/scripts/<slug>.md` in the format in `workspace/README.md` (front matter,
   `## Hook options`, `## Script`, `## On-screen`, `## CTA`). Create `workspace/scripts/` if needed. If the file exists,
   ask before overwriting.
3. **Score**: run `hookscore.py` on the file. Show the ranking. Under 50 at the top means there is no hook yet: write
   new options, do not polish these.
4. **Script** on the winner: `## Script` is the exact spoken text, one beat per line, hook first, CTA line last
   (e.g. `Comment SCENT and I'll send you the guide.`). Plain spoken language, no line they would have to rehearse.
5. **Time it**: `beats.py ... --target <seconds>`. Fix every flag (hook past 3 s, a beat over 4 s, three abstract beats
   in a row, no loop) and re-run until clean.
6. Fill the front matter: `hook_formula`, `hook_score`, `target_seconds`, `cta_keyword`, `status: draft`.

## Rules

- **One idea per reel.** Two ideas = two reels; say so.
- **Numbers over adjectives.** Unknown number → leave `{{your number}}` and flag it. Never invent metrics, clients,
  revenue or outcomes under the user's name.
- **Cut the intro.** No greeting, no "in this video", no name.
- **One ask at the end**: comment the keyword, save, or follow. One.
- **On-screen cards: six words or fewer**, the hook card up at frame 1, inside the safe zone of a 1080x1920 frame
  (nothing above y=230 or below y=1440, right 230 px clear).

## 4. Hand off

Print:

```
REEL SCRIPT READY  workspace/scripts/<slug>.md
hook:      #5 Time Collapse, 86 STRONG
length:    28.4s across 9 beats at 165 wpm
cta:       comment SCENT
next:      /ig-human workspace/scripts/<slug>.md   (then /make-reel workspace/scripts/<slug>.md)
```

On "yes", append one line to `workspace/log.md`: date, slug, hook formula, first line. Nothing is posted.
