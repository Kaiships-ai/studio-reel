---
name: ig-caption
description: >-
  Write the Instagram caption for a reel: the line that survives the "... more"
  cut, the body, one ask, search terms, up to five hashtags, and a first
  comment; then lint it. Reads workspace/scripts/<slug>.md, writes
  workspace/captions/<slug>.md. Use when the user types /ig-caption, says
  "write the caption", "caption this", "what do I put in the description", or
  asks about hashtags.
argument-hint: <slug | workspace/scripts/<slug>.md | nothing = newest script>
---

# /ig-caption

One caption, linted the way the feed shows it. By Kaiships.

```
pixi run python .claude/skills/ig-caption/caption.py workspace/captions/<slug>.md --keywords "term one,term two"
```

It lints the `## Caption` section and prints the first 125 characters in a box, the part the feed shows before
"... more". Read that box before anything else.

## Input (never stop on a missing file)

`$ARGUMENTS` is a slug or a script path. Nothing → the newest `workspace/scripts/*.md` (not `.orig.md`).
- From the script: the hook, the `## Script` body, `cta_keyword`. No script → ask the user what the reel says and what
  viewers should comment, in one message (and mention `/ig-reel` writes the script).
- From `workspace/brand.md`: niche and audience (for search terms), `cta_keyword` and `deliverable` if the script has
  none. Missing → ask for two or three phrases people would search to find this.
- From `workspace/dm/<slug>.md` if it exists: the keyword the DM flow listens for. The caption's keyword must match it
  exactly.

## Job A or Job B: decide first and say which

- **Job A, the reel carries the hook** (the normal case after `/ig-reel`). The caption is not a second hook. Line one
  is the ask, plainly: `Comment SCENT and I'll DM you the guide.` The body adds context and the search terms.
- **Job B, the caption is the content** (a photo or carousel). Line one is the hook: concrete, short, cut at a cliff.

## The shape

```
Line 1     within 125 characters. Job A: the ask. Job B: the hook. Never a greeting, hashtag or emoji first.
Body       2 to 6 short paragraphs, a blank line between. The search terms live here, as normal sentences.
The ask    one: comment the keyword, save, or DM. One.
Hashtags   up to five, specific, on the last line, or none. #viral #fyp #explorepage describe nothing.
```

Limit 2,200 characters; 300 to 600 is usually right.

## Rules

- **No link in the caption**: captions are not clickable. Link goes in the bio or the DM.
- **The keyword is one word people can type**, no spaces, no emoji, and the reel says it out loud too.
- **Search terms beat hashtags**: Instagram search reads caption text. Write "client proposals" in a sentence.
- **Never invent numbers.** Use only figures from the script or the user.

## Steps

1. Write `workspace/captions/<slug>.md` (create the folder if needed):

   ```
   ---
   slug: <slug>
   job: A
   cta_keyword: SCENT
   ---
   # Caption · <slug>

   ## Caption
   ...

   ## First comment
   optional; for Job A a short line that repeats the keyword
   ```
2. Clean it: `pixi run python .claude/skills/ig-human/humanize.py workspace/captions/<slug>.md --in-place --section Caption --report`.
   Short text makes slop loud. Rewrite any structural tell it flags.
3. Lint with the search terms. Fix every FAIL; decide each WARN out loud.
4. Print the caption in a copy-ready block, then:

```
CAPTION READY  workspace/captions/<slug>.md
job:       A, the reel carries the hook
visible:   92 of 125 characters before the cut
ask:       one, comment SCENT
hashtags:  3
search:    "client proposals" in line 3
linter:    READY
next:      post the reel, paste the caption; if you have not yet, /ig-dm <slug> so the keyword answers
```

Nothing is posted. The user pastes it.
