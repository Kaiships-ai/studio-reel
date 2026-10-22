---
name: ig-viral
description: >-
  Find the reels that are working right now in the user's niche, rank them by
  how far each beat its own account's normal views, name the hook formula each
  used, and write workspace/swipe.md, which /ig-plan and /ig-reel read. Works
  from reels the user looks at in their own browser; no scraping, no login on
  their behalf. Use when the user types /ig-viral, says "find viral videos",
  "what's working in my niche", "reverse engineer this account", or "build me
  a swipe file".
argument-hint: <accounts to study, e.g. @rival1 @rival2 | nothing = suggest some>
---

# /ig-viral

The research step: everything else writes, this one looks. Run it monthly; formulas last a season. By Kaiships.

```
pixi run python .claude/skills/ig-viral/swipe.py workspace/viral/captured.tsv --out workspace/swipe.md
```

## The one idea

**Raw views are not evidence.** 400,000 views on a 2M-follower account is a quiet day; on a 4,000-follower account it
is a find. So everything ranks on the **outlier multiple**: views divided by that account's own recent median. Above
3x is a signal; below 1.5x teaches nothing. Study accounts within about 10x of the user's size.

## 1. Pick 6 to 12 accounts

From `$ARGUMENTS`, or propose them from `workspace/brand.md` (niche, audience) and get a yes:
4 direct (same niche, slightly ahead), 4 adjacent (different niche, same audience), 2 to 4 much bigger (format only).
Also ask the user to open their own **Saved** collection: the fastest relevant corpus there is.

## 2. Look, the way a person does

Use the browser tool this session has, driving the user's own logged-in browser with them present, or ask them to
paste what they see. Not negotiable:

- **Never log in to Instagram for the user and never ask for a password.**
- **Reading, not scraping**: about a dozen reels per account at human speed. No crawler, no scraping service, no
  background loop; volume collection breaks Instagram's terms and gets accounts blocked.
- **Copy the formula, never the video**: hook shape, structure, length. Not their script or edit. Keep the account
  on every row.

Per reel, capture: account, followers, median (eyeball the last 12 reels, take the middle), views, hook (first line,
verbatim). Save as tab-separated `workspace/viral/captured.tsv` with this header:

```
account	followers	median	views	hook
@someone	48000	11000	412000	nobody tells you your first 30 reels are supposed to flop
```

Instagram shows too little? YouTube Shorts in the same niche has public view counts and the same hook grammar; it is
a fair second corpus.

## 3. Rank

Run `swipe.py`. It computes the multiple, names the formula from `ig-reel/hooks.json`, scores each hook with
`ig-reel/hookscore.py`, and compares the top third with the bottom third.

## 4. Say what it means, carefully

Three things only:
1. **Formulas over-indexing** in the top third, with counts. Two formulas four times each across six accounts is a
   finding; one formula twice is not.
2. **What the top third share** that the bottom does not: hook length, visual payoff, a moving first frame, where the
   ask sits.
3. **Unclassified rows**: read them by hand. They are noise or a formula not in `hooks.json` yet.

State the sample size plainly: forty reels across six accounts supports a claim; twelve does not.

## 5. Turn it into something to shoot

For the top three formulas write **the user's version**: their story, their number, in the shape that works. Append
these under `## Your version` in `workspace/swipe.md`. A hook line they could say tomorrow, never "make one like this".

End with:

```
SWIPE READY  workspace/swipe.md   (N reels, M accounts)
next:  /ig-plan   (or /ig-reel <one of the hooks above>)
```

Nothing is posted, followed, liked or messaged. This skill reads.
