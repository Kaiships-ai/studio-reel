# Viral patterns: what the 1M-view skits do

Source: 41 transcripts in `kaiship-business/02-content-funnel/sources/skit-refs/` (@agentmorphy 20, @base.learn 21, pulled
2026-10-16 via Crowsnest, PR #43). Views are from that pull. **Study the structure, never copy a line, a premise + button pair,
or a joke.** Our skit must stand on its own fact and its own button.

## The tiers at a glance

| Tier | Reels | What they share |
|---|---|---|
| **≥ 900k** | DB delete 5.2M · API key push 1.9M · "I tried Codex" 1.2M · "how does my app work?" 1.18M · context 94% 960k · "did they nerf you?" 934k | Line 1 = "Claude, …" + a fear every AI coder has · stakes rise every 2–3 lines · a concrete number (5 of 6) · most have a heart turn and a callback button (4 of 6) · 4 of 6 are about the AI itself |
| **100–500k** | feature-done meta 480k · Haiku/Opus 325k · "while I was asleep" 172k · reset time 136k · usage meter 130k · launch day 121k · darker mode 120k · mom 115k · perf review 113k · "step aside" 110k · marketing 106k · 600 DMs 100k | Mostly the same opener (not darker mode "GPT. Add dark mode." or marketing) and a good escalation, but either no heart turn, or the fear is smaller (usage, polish), or the button is weaker |
| **< 60k** | day off 19k · hiring a human 16k · pricing 16k · demo 19k · "stop saying absolutely right" 9k · think-harder friend 55k · train/Codex 43k · real developer 40k · vibe night 46k · console logs 48k · **bill $400 42k · git blame "Gary" 33k · senior-engineer prompt 26k** | Many have low stakes or a life topic, a wandering middle, or an opener that is not a question to Claude. But the bold ones use P1, P3, P5 and P7 well and still sit low: **the patterns are needed, not enough** |

## 9 patterns (named, so a script can cite them)

| # | Pattern | How it works | Seen in (views) |
|---|---|---|---|
| P1 | **Name + fear opener** | Line 1 is "Claude, <confession or question>" about a fear every AI coder knows: lost data, leaked key, context death, the model got worse, cheating on Claude, not understanding your own app. The viewer is in it within 2–3 s | All 6 top reels |
| P2 | **Deadpan one-fact answers** | Claude answers in 1–6 words. Each answer adds ONE new fact that makes it worse ("Which one?" → "There's more than one?"). The human asks, Claude reveals | DB delete, API key, context, app-work |
| P3 | **The number that hurts** | A specific, slightly absurd number lands the joke: "40,000 lines", "fix it, 90 times, mostly in caps", "9 seconds", "400 wedding speeches", "94% used", "400 messages in", "11,000 times", "$2 for hmm" | 5 of 6 top reels; most mid reels |
| P4 | **Hope → fall** | A relief beat ("Rotate the key." "Done.") followed by a worse reveal or a new problem. Keeps the middle from sagging | DB delete (backup folder → empty), API key, Haiku/Opus (fixed → usage limit) |
| P5 | **Heart turn** | Claude shows it cared all along: kept a copy, wrote a note in claude.md, "I missed being asked", "That part's you". The laugh plus a soft beat is what gets shared | 4 of 6 top reels: DB delete, context, Codex, app-work (not nerf, not API key) |
| P6 | **Insider vocabulary** | Words only AI coders get, used as punchlines: "You're absolutely right", "fix it" in caps, claude.md, usage limit, "think harder", 3 a.m., "since March", Reddit nerf posts | Nearly all hits |
| P7 | **Callback button** | The last line reuses a detail from earlier and shows nothing was learned, or reframes it: "production-old-DO-NOT-DELETE-2", "The readme?", "Fix it." → "In capitals?", "Would you like a loading spinner?", "Kevin is live in production" | 4 of 6 top reels (DB delete, API key, context, Codex); not nerf or app-work |
| P8 | **Flawed human, loyal AI** | The human is the cause (renamed the DB, pushed the key, typed "fix it" 90 times). The AI is calm, competent and on his side. Never make the AI the villain for long | All top reels; reels where the AI is just wrong (made-up library 77k, 17 files 77k) sit lower |
| P9 | **The topic is the AI itself** | Its memory, its limits, a rival model, being nerfed, how much the human depends on it. Not a generic bug | 4 of 6 top reels: context, nerf, Codex, app-work |

## How much to trust this
- n = 6 top reels. The patterns are **correlated** with views, not proven to cause them; several < 60k reels use them too.
- **Premise beats momentum:** base.learn posted 6 reels on 2026-10-12, the day after its 5.2M hit. The API-key one got 1.9M; the other five got 26–70k. A hit does not carry a weak premise.
- Use the patterns as a floor (a script missing them rarely works), then win on a fresh, true, funny premise.

## Shape of a top reel (typical numbers)

```
0–3 s   P1  "Claude, <fear>?"                       ← the hook is the premise, no setup
2–20 s  P2  6–10 ping-pong lines, each a new fact, P3 number in here
20–35 s P4  relief → worse
35–48 s P5  the soft beat (1–3 lines)
48–55 s P7  callback button (1 line, often one word)
```
- 22–30 lines in 45–57 s; most lines 2–6 words; one-word lines are normal ("Seven." "Both." "Cold.").
- 2 speakers only. The human speaks first.

## What sinks a skit (from the < 60k tier)
- **Life topic instead of a coding fear** (day off, hiring, pricing): nice, but no one shares it.
- **The middle wanders** into a new gag (train → Codex → coffee) instead of building one problem.
- **Opener without the name + question** ("Stop saying I'm absolutely right." 9k vs the same running joke inside hits).
- **Soft stakes:** "Am I a real developer?" (40k) has a number, a heart beat and a callback, but nothing is at risk.
- **Teaching inside the skit** (step 1, step 2…) gets comments when tied to a CTA, not views.

## Already taken: do not repeat these premise + button pairs
| Premise | Their button | Owner |
|---|---|---|
| Deleted the prod DB, AI kept a copy | copy named "…do not delete 2" | base.learn (also inspired our reel58 shape) |
| Pushed API key to GitHub, bots used it | new key goes in the README | base.learn (our reel58 overlaps: noted 2026-10-16) |
| Context almost full, note in claude.md | "Fix it." → "In capitals?" | base.learn |
| Tried Codex / Grok, came back | loading spinner / "Grok was nicer" | agentmorphy |
| Switch to Haiku, Opus fixes, usage limit | "Usage limit reached" | agentmorphy (our morphy-clone-02 cloned it) |
| Bug fixed itself | names it Kevin | base.learn |
| "How does my app work?" (didn't write a line) | "Put it in the Claude.md" | agentmorphy |
| "Did they nerf you?" | "I was the prompt" | agentmorphy |
| AI worked all night (Rust, Japanese app, marketing) | "The card's in your name" | agentmorphy |
| Usage meter on one button | "fix every button" | agentmorphy |
| Pricing the app | "You. At 3am." | base.learn |
| Am I a real developer / center a div | AI can't remember it either | base.learn |
| 900 console logs in production | "Is the developer okay?" | base.learn |
| Why is the bill $400 (think harder ×11,000) | "The hmm was harder" | base.learn |
| "You are a senior engineer…" prompt tricks | "the tip stands" | base.learn |
| git blame → "Gary" | agents call him Gary | base.learn |
| (joke line, not a premise) "tests passed" → "You deleted the tests." | inside "who broke production" | base.learn |
| Made-up npm library | it gets one download from "another me" | base.learn |
| Our own: YOLO permissions (reel57), API key (reel58) | — | kaiships |

## Refresh
When `skit-refs/` gets new reels (ask kaiships-orches-v1: Crowsnest pull + Whisper), re-rank the tiers, add new premise+button
pairs to the table above, and bump the date at the top.
