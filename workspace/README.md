# workspace/

Your content lives here. Each command writes one file and the next command reads it, so you never copy and paste
between steps. Every file is plain Markdown: open it, edit it by hand, and the next command uses your version.

```
/studio      -> brand.md                 who you are, who you talk to, what you sell, your CTA keyword
/ig-plan     -> plan.md                  the week: slots, angles, hook formulas, a CTA keyword per reel
/ig-viral    -> swipe.md                 (optional) what is working in your niche, from reels you collected
/ig-reel     -> scripts/<slug>.md        scored hooks, the spoken script, on-screen text, the CTA
/ig-human    -> scripts/<slug>.md        the same file, rewritten so it does not read like AI
                scripts/<slug>.orig.md   the version before the rewrite
/make-reel workspace/scripts/<slug>.md   -> films/<slug>/<slug>.mp4 + cover
/ig-dm       -> dm/<slug>.md             the comment -> DM flow (and the flow in ChatbotX, if connected)
/ig-caption  -> captions/<slug>.md       caption, first comment, hashtags
```

`<slug>` is a short lower-case name with dashes, e.g. `pricing-mistakes`. One reel = one slug in every folder.

No file is required. If one is missing, the command that needs it asks you for the missing bit (or uses a sensible
default) and tells you which command would have written it.

## brand.md

Written by `/studio`. Every field is optional; fill in what you know.

```markdown
# Brand

- niche: handmade soy candles
- audience: women 25-40 who buy gifts online
- offer: candle subscription, $29/month
- cta_keyword: SCENT
- deliverable: a free scent-pairing guide (what the DM sends)
- deliverable_url: https://example.com/guide
- timezone: America/New_York

## Voice

How you talk on camera. Words you never say. Two or three lines you would actually say.

## Pillars

- the 3 or 4 themes you want to be known for
```

## plan.md

Written by `/ig-plan`. One row per slot. The `slot` id (e.g. `w1-tue`) is what `/ig-reel slot w1-tue` looks up.

```markdown
# Plan · week of 2026-11-02

| slot | day | time | format | type | angle | hook | cta_keyword | slug |
|---|---|---|---|---|---|---|---|---|
| w1-tue | Tue | 19:30 | reel | proof | 40 hours to 4 with one template | #5 Time Collapse | SCENT | template-hours |
```

## scripts/<slug>.md

Written by `/ig-reel`, rewritten in place by `/ig-human`, read by `/make-reel`, `/ig-dm` and `/ig-caption`.
The `## Script` section is the exact spoken text, one beat per line, hook first and CTA last. `/make-reel` speaks it
word for word.

```markdown
---
slug: template-hours
slot: w1-tue
hook_formula: 5 Time Collapse
hook_score: 86
target_seconds: 30
cta_keyword: SCENT
campaign: template-hours # optional: the campaign key, copied into films/<slug>/job.json
status: draft            # draft -> humanized (after /ig-human)
---
# Template hours

## Hook options
- Proposals used to take me five hours. Twenty minutes now.
- ...

## Script
Proposals used to take me five hours. Twenty minutes now.
...
Comment SCENT and I'll send you the template.

## On-screen
- 0:00 5 HOURS -> 20 MIN
- ...

## CTA
keyword: SCENT
line: Comment SCENT and I'll send you the template.
```

## dm/<slug>.md

Written by `/ig-dm`. Front matter + one section per DM message. `flow.py` in `.claude/skills/ig-dm/` turns it into
ChatbotX nodes.

## captions/<slug>.md

Written by `/ig-caption`. `## Caption` is what you paste into Instagram; `## First comment` is optional.

## Other files

- `swipe.md`: written by `/ig-viral`, read by `/ig-plan` and `/ig-reel`.
- `viral/captured.tsv`: the reels you looked at for `/ig-viral` (account, followers, median, views, hook).
- `log.md`: `/ig-reel` appends one line per script you approve, so `/ig-plan` does not repeat a theme.
