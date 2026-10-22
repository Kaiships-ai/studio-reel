---
name: ig-plan
description: >-
  Plan the Instagram week (or several): which posts, which format, which day
  and time, the angle and hook formula for each reel, its CTA keyword, and a
  daily engagement list. Reads workspace/brand.md, writes workspace/plan.md,
  which /ig-reel works from. Use when the user types /ig-plan, says "plan my
  week", "what should I post", "content calendar", or "I have nothing to post
  about".
argument-hint: <e.g. "1 week" | "4 weeks, 3 reels a week">
---

# /ig-plan

The control room: everything else executes, this decides what gets executed. Run it once a week. By Kaiships.

## Input (never stop on a missing file)

`$ARGUMENTS`: how many weeks and reels per week. Default: 1 week, 3 reels.

Read, if they exist:
- `workspace/brand.md`: niche, audience, offer, `cta_keyword`, Voice, Pillars, timezone.
- `workspace/swipe.md` (from `/ig-viral`): the user's own evidence of which hook formulas land in their niche. It
  outranks the defaults below.
- `workspace/log.md` and `workspace/scripts/`: what was already made, so the plan does not repeat a theme from the
  last two weeks.
- `.claude/skills/ig-reel/hooks.json`: the 26 hook formulas (id + name).

No `brand.md` → ask these in one message, then continue (and mention `/studio` saves them):
1. What you sell, and to whom.
2. The three or four themes you want to be known for.
3. What actually happened this week: a client call, a number, a mistake, something you built. Posts come from here.
4. The one word viewers should comment to get your freebie (CTA keyword), and what the freebie is.

## What to post

Four to five posts a week, at least three of them reels (reels reach non-followers; carousels go deep with
followers). Never two of the same type back to back:

| type | per week | job |
| --- | --- | --- |
| Proof | 1 | something that happened, with a number. Reel. |
| Teach | 1-2 | one thing the viewer can do today. Reel or carousel. |
| Opinion | 1 | a position that could lose you followers. Reel. |
| Story | every other week | a scene with a cost. Reel. |
| Offer | every other week | what you sell, said plainly. Carousel or stories. |

Each slot gets an **angle, not a topic**. "Candles" is not a plan; "the $40 candle that burned in 6 hours and what I
changed" is a reel. Pick a hook formula from `hooks.json` that fits the angle; vary them across the week.

CTA keyword per reel: the brand keyword by default. A reel with its own freebie gets its own one-word keyword
(e.g. `GUIDE`, `PRICE`); say which, because `/ig-dm` builds one flow per keyword.

Never invent facts, numbers or clients for an angle. If the user gave none, leave `{{what happened}}` in the angle.

## When to post

Early evening in the audience's timezone for consumer audiences, early morning for business audiences. Say it
plainly: the hour matters far less than the first two seconds of the reel.

## Engagement round (20 minutes a day, before posting)

Ten accounts: 5 reach (bigger, the audience you want; comment early), 3 peers (same size, same field), 2 buyers
(could actually buy; comment for weeks before any DM, never pitch in a comment). Use accounts the user names. If they
named none, leave `{{account}}` placeholders and ask; never invent handles.

## Output

Write `workspace/plan.md` (create `workspace/` if needed; if a plan exists, ask whether to replace it or add the new
weeks below). The table format is fixed so `/ig-reel slot <id>` can find a row:

```markdown
# Plan · week of 2026-11-02

| slot | day | time | format | type | angle | hook | cta_keyword | slug |
|---|---|---|---|---|---|---|---|---|
| w1-tue | Tue | 19:30 | reel | proof | 40 hours to 4 with one template | #5 Time Collapse | SCENT | template-hours |
| w1-thu | Thu | 19:00 | carousel | teach | the 4-slide pricing breakdown | Job B caption | SCENT | pricing-slides |

## Stories
every day, 3 to 5 frames; question box on Thursday

## Engage (5 reach / 3 peers / 2 buyers)
- reach: ...
```

`slot` = `w<week>-<day>`; `slug` = lower-case words with dashes. Then print the week as a short calendar and end with:

```
PLAN READY  workspace/plan.md   (N reels, M other posts)
next:  /ig-reel slot w1-tue
```

Nothing is scheduled or posted. This is a plan; the user runs it.
