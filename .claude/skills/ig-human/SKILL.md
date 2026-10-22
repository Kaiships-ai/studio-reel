---
name: ig-human
description: >-
  Rewrite a reel script, caption or DM so it does not read like AI: strips em
  dashes, stock AI phrases and invisible watermark characters, flags the
  sentence shapes models default to, and scores the text on a five-check panel.
  Rewrites workspace/scripts/<slug>.md in place and keeps a .orig copy. Use
  when the user types /ig-human, says humanize, "does this sound like AI",
  "remove the em dashes", "de-slop this", or before any script, caption or DM
  is shown to the user.
argument-hint: <workspace/scripts/<slug>.md | any file | nothing = newest script>
---

# /ig-human

Strips the machine fingerprint out of a draft and proves it with a score. By Kaiships.

```
pixi run python .claude/skills/ig-human/humanize.py workspace/scripts/<slug>.md --in-place --report
pixi run python .claude/skills/ig-human/detect.py workspace/scripts/<slug>.orig.md workspace/scripts/<slug>.md
```

`--in-place` cleans only the `## Script` section (pass `--section Caption`, `--section "On-screen"` etc. for others,
repeatable), saves the untouched file as `<slug>.orig.md` on the first run, and sets `status: humanized`. Both tools
read `slop.json` in this folder: 154 stock words and phrases with plain replacements, 18 invisible character
classes, 11 typographic substitutions, 16 structural tells. It is meant to be edited: if it strips a word the user
always says, take it out.

## Input

`$ARGUMENTS`: a workspace script, a caption file, or any text file. Nothing given → the most recently modified
`workspace/scripts/*.md` that is not a `.orig.md`. No scripts at all → ask the user to paste the text, save it to
`workspace/scripts/<slug>.md` under a `## Script` heading, and mention `/ig-reel` writes these files.

## Order of operations

1. `humanize.py <file> --in-place --report`.
2. Read the **structural tells** in the report. They are flagged, never auto-fixed, because changing a sentence's
   shape needs judgement. Rewrite each flagged line yourself in the file, keeping the meaning and the user's voice
   (`workspace/brand.md`, Voice section, if it exists):
   "it's not just X, it's Y", rule-of-three triads, one-word question lines ("The result?"), video preambles, emoji
   bullet lists, three shouted words in a row, hashtag walls, reflex bait ("follow for more", "tag someone").
3. `detect.py <slug>.orig.md <slug>.md` for the before and after.
4. Not PASS → fix the weakest check it names, re-run. Two rounds is normal; five means the draft was written by
   formula and needs a new draft, not more passes.
5. A script's spoken words changed → keep the `## Hook options` winner and the `## CTA` line in sync with
   `## Script`, and re-run `ig-reel/beats.py` if lines got longer.

## The five checks (0-100, higher is more human)

| check | measures | machine looks like |
| --- | --- | --- |
| BURSTINESS | sentence-length variation | every sentence the same length |
| SPECIFICITY | numbers, names per 100 words | abstract nouns, no figures |
| SLOP DENSITY | lexicon hits per 100 words | stock vocabulary |
| FINGERPRINT | invisible chars, em dashes, curly quotes | typographically perfect |
| VOICE | contractions, person, structural tells | no contractions, staged reveals |

PASS needs 70+ overall with no check below 55 (the weakest check weighs 40%).

## Say this honestly

These are local heuristics; nothing is uploaded. They are not GPTZero, Originality or Turnitin, do not call them,
and cannot promise their verdict. Never tell the user their text is undetectable.

## Hand off

Show the cleaned text and the score, never the score alone. Then the next command:
- a script → `/make-reel workspace/scripts/<slug>.md` (or `/ig-dm <slug>` first to set up the comment keyword)
- a caption → paste it; a DM file → `/ig-dm` picks it up.
