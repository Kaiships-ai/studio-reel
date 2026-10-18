# Script voice

Read this before you write `vo/script.json`. **Scope: only scripts you write.** If the user gives a script, speak it
word for word. Don't tighten it, reorder it or "fix" it. If a line seems wrong (a claim you can't source, a word the
voice mispronounces), tell the user and ask.

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

Length: 90–120 spoken words, about 30–40 s (`"rate"` in `vo/script.json`: `+12%` default, `+20%` for fast listicles).

## Rules

- Short spoken sentences. One idea per sentence. Read it aloud: if you'd run out of breath, cut it.
- Everyday words. Explain jargon by what it does ("turns your prompts into app designs"), not what it is.
- Cut every word that doesn't change the meaning.
- Numbers only from the user's facts or a named source, said the way people say them ("fifty-four percent less code").
- Talk to one person: "you", "your".
- The tool is the subject, the viewer's problem is the object: "It turns your codebase into a knowledge graph."
- **Pace.** Each line lands at 5.0–6.4 syllables per second. No line runs more than ~5 s without a pause: split a
  long line at its middle comma (same words, two entries).
- **The CTA is one continuous breath.** No commas around the keyword ("Comment BUILD below", not "Comment, BUILD,
  below"): commas make the voice stop and it sounds robotic.

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

## Checklist (run before `node make.mjs vo`)

- [ ] Hook is one line and says who it's for + what they get
- [ ] Every item: name alone first, then the plain-words benefit
- [ ] A 13-year-old understands every line
- [ ] No banned phrase; no claim beyond the source
- [ ] Every number is in the facts list
- [ ] CTA says what to do and exactly what they'll get, with no commas around the keyword
- [ ] After `node make.mjs vo`: check `vo/word_times.txt`, every line is 5.0–6.4 syllables/s and none runs > 5 s unbroken
