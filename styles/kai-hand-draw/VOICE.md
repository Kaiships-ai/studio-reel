# Script voice

Read this before you write `<film>/vo/script.json`. **Scope: only scripts you write.** If the user gives a script
(their own, or a creator's posted reel), speak it word for word. Don't tighten it, reorder it, add teasers or "fix" it.
A word the voice mispronounces is respelled in that line's `"say"` only; the captions keep `"text"`. A line that seems
wrong (a claim you can't source, a keyword already used) goes to the user as a question; don't change it yourself.

The test: **a 13–16-year-old understands every line on first listen, and it sounds like a person talking at a
human pace.**

## Shape (listicle, the format that works best)

1. **Hook, one line.** Name who it's for and what they get. Patterns that worked on real reels:
   - "Don't start vibe coding with Claude Code until you've installed these four plugins." (92k views)
   - "Google has 15 AI tools that are completely free."
   - "Someone just turned Apple's entire design language into a Claude skill."
2. **Items.** The name first, alone and short ("One: Ponytail." / "The second is called Stitch."), then one or two
   lines on what it does for *you*, in plain words, with at most one number.
3. **CTA, one line.** What to do next and exactly what they get ("Comment CODING and I'll send you all four links").

Length: 70–120 spoken words, about 28–40 s. Voice `en-US-BrianMultilingualNeural`, `"rate": "+20%"` (the
published reels); a line may set its own `"rate"`, never above `+25%` (`check_vo.py` refuses it).

## Rules

- Short spoken sentences. One idea per sentence. Read it aloud: if you'd run out of breath, cut it.
- Everyday words. Explain jargon by what it does ("turns your prompts into app designs"), not what it is.
- Cut every word that doesn't change the meaning.
- Numbers only from the user's facts or a named source, said the way people say them ("fifty-four percent less code").
- Talk to one person: "you", "your".
- The tool is the subject, the viewer's problem is the object: "It turns your codebase into a knowledge graph."
- **Pace.** Each line lands at 5.0–6.4 syllables per second of speech. No line runs more than ~5 s without a pause,
  and no entry has more than 28 words: split a long line at its middle comma (same words, two entries).
- **The CTA is one continuous breath.** No commas around the keyword ("Comment BUILD below", not "Comment, BUILD,
  below"): commas make the voice stop and it sounds robotic. `check_vo.py` fails any gap over 0.05 s from "comment"
  to the end of the line.
- **The keyword** is one short word, easy to say and easy for Whisper to hear, and not used by an earlier reel.
  `make.mjs verify` checks that Whisper hears it in the final mix.

## Banned (AI-slop)

| Kind | Examples |
|---|---|
| Absolute promises | "runs 100% on your own machine", "zero setup", "free forever", "works with every model", "never again" |
| Taglines | "It's not just X, it's Y", "Faster. Cheaper. Smarter.", "This changes everything", "the only tool you'll ever need" |
| Hype words | seamlessly, effortlessly, supercharge, unlock, level up, game-changer, next level, revolutionary |
| Fake teasers | "The best part?", "Here's the kicker:", "But wait, there's more", "The secret?" |
| Overstated features | claiming more than the source says; turning "can" into "always", a range into a promise |

If a line could sit on a SaaS landing page, rewrite it the way you'd say it to a friend.

## Gold script (shipped, 92k views)

Don't start vibe coding with Claude Code until you've installed these four plugins. One: Ponytail. Claude Code
writes fifty-four percent less code, and it's twenty percent cheaper. Two: OmniRoute. When your usage limit runs
out, it jumps to the next best model, across over three hundred fifty providers. Up to one and a half billion free
tokens, every month. Three: Graphify. It turns your codebase into a knowledge graph, so your agent stops rereading
files, again and again. Four: Agent Skills, by Addy Osmani. Twenty-five skills to spec, plan, build, test and ship,
and it picks the right one at every stage. Comment CODING, and I'll send you all four links, plus the install commands.

Its hook (14 words, about 4 s) is older than the 3.5 s hook rule; written today it would be "Don't start Claude Code
until you've installed these four plugins."

## Checklist (run before `node styles/kai-hand-draw/tools/make.mjs <film> vo`)

- [ ] Hook is one line, says who it's for + what they get, and is spoken by 3.5 s (about 11 words)
- [ ] Every item: name alone first, then the plain-words benefit
- [ ] A 13-year-old understands every line
- [ ] No banned phrase; no claim beyond the source
- [ ] Every number is in the facts list
- [ ] CTA says what to do and exactly what they'll get, with no commas around the keyword
- [ ] After `node styles/kai-hand-draw/tools/make.mjs <film> vo`: `check_vo.py` passes (rate ≤ +25 %, ≤ 28 words a
  line, CTA in one breath), its pace warnings are read and fixed or accepted on purpose, and the Whisper check passes
  (a name Whisper spells its own way goes in that line's `"asr"`)
