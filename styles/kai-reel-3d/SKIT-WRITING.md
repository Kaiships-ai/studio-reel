# Writing a skit for AI voices

The script is the only thing Kai approves, so it carries the reel. Write it **to go viral** (VIRAL-PATTERNS.md, learned from
41 reference reels up to 5.2M views) and **for Gemini TTS acting in one take**, not for a human voice actor.

## Before you write (5 min)
1. **Read VIRAL-PATTERNS.md** and 3–4 transcripts from the ≥ 900k tier in `kaiship-business/02-content-funnel/sources/skit-refs/`.
2. **Overlap check.** Read both `skit-refs/*/INDEX.md` and the "Already taken" table. If your premise + button pair matches one,
   change the angle or the button. Same topic is fine; the same joke is not.
   Then grep every transcript for the premise's key words (`grep -ril "<word>" skit-refs/*/D*.md`): the table lists premises only, a joke line inside another reel is not in it (2026-10-16: "you deleted the tests" sat in the Gary reel).
   Read the transcripts for **structure only**. Never reuse a reference line, number or punchline (the reviewer flags any match).
3. **Find the fact.** Every skit stands on a real event, number or widely known dev pain (Kai, `skit-idea-priority`): fresh
   Anthropic / Codex / Grok news first, coding pain second. Write the source in `BRIEF.md`.

## Shape (40–55 s, 20–28 lines)
1. **Line 1 = name + fear (P1).** Kai speaks first: "Clawd, <confession or question>", 4–8 words (the top openers are 4–8).
   The fear is one every AI coder knows. No setup line, no greeting. The hook IS the premise and lands in about 2–3 s.
   Strong topics are about the AI itself (its memory, limits, a rival model, how much we depend on it): 4 of the 6 top reels.
2. **Ping-pong reveals (P2).** Clawd answers in 1–6 words; each answer adds ONE new fact that makes it worse. Kai asks, Clawd reveals.
3. **One number that hurts (P3).** At least one specific, slightly absurd number of your own, often as a one-word answer. Invent it for this skit; never reuse a reference number.
4. **Hope → fall (P4).** A relief beat ("Fixed!" "Oh, thank god.") then a worse reveal.
5. **Heart turn (P5).** 1–3 soft lines: Clawd was on Kai's side all along, or a small kind moment inside the mess.
6. **Callback button (P7).** One short last line that reuses a detail from the first half (not the line just before it).
   Often one to three words. No CTA speech, no "follow".

Kai is the flawed vibe-coder who caused it; Clawd is calm, competent and loyal (P8). Use insider words as punchlines (P6):
the AI's own catchphrases, claude.md, usage limits, late-night commits, model names. Say them in your own words; the
reference punchlines (VIRAL-PATTERNS.md quotes) are taken.

## Viral scorecard (self-check, 10 points)
Score the draft before Kai sees it, with **one line of evidence per item** (the line numbers that earn it). **Below 8/10 →
rewrite, do not send.** The writer's own score runs high (a 10/10 self-score was re-scored 6/10), so one short verifier pass
re-scores it before the gate (script only, not a build review round); show the verifier's score at the gate. This "viral score" is separate from the reel's "hook score" (SKILL.md).

| # | Check | 1 point when |
|---|---|---|
| 1 | P1 opener | Line 1 starts "Clawd," + a fear/confession, 4–8 words |
| 2 | Universal fear | A 13–16-year-old who codes with AI would feel it (data, keys, money, limits, "my app broke") |
| 3 | Short lines | ≥ 70% of lines are ≤ 6 words; no line > 12 words |
| 4 | Escalation | Every 2–3 lines the stakes rise until the heart turn; the middle never switches to a new gag or goes soft early |
| 5 | Number | At least one concrete number that lands a laugh |
| 6 | Hope → fall | One relief beat followed by a worse reveal |
| 7 | Heart | One soft beat where Clawd shows it cares |
| 8 | Callback button | The last line reuses a detail from the first half of the script |
| 9 | Fact | A real event, number or dev pain is behind it, sourced in BRIEF.md |
| 10 | Fresh | Passes the overlap check: no taken premise + button pair, none of our own posted skits, no reused reference line or punchline |

## Lines that TTS can act
| Do | Don't |
|---|---|
| Put the emotion in the words: "Wait. Why is the menu on the logo?" | Rely on delivery alone: "The menu's on the logo." (flat in TTS) |
| Short sentences, one beat each. Questions and exclamations carry pitch for free | Stutter-acting "No no no no—" (TTS reads it evenly) |
| Interjections: "Oh.", "Okay.", "Seriously?", "Wait." | Long lines > 12 words (split them) |
| Vocal tags where a human would make the sound: `<gasp>`, `<sigh>`, `<laugh>`, `<short pause>` | Sound effects as tags (`<applause>`): SFX belong in the mix |
| CAPS for one stressed word: "That's even WORSE!" | CAPS on whole lines |
| `style` = 2–4 plain delivery words: "panicked, rising", "quiet, sneaky" | Long director's notes, or style words that read like dialogue ("whispered, tattling" was spoken aloud once) |
| Clawd's style from the VOICE.md palette (warm words); deadpan comes from short lines | "flat", "deadpan", "dry", "quiet" on Clawd (voice drifts across reels) |

## Characters
- **Kai**: the human, casual and quick, causes the mess and gets dragged into the chaos; Kai's reactions are the viewer's reactions.
- **Clawd**: ONE voice. Deadpan, competent, secretly caring. Different "modes" (a cheap model vs a smart one, a bug vs a fix) are acted
  through `role` + `style` + motion, never a second voice. Clawd's short lines ("Done!", "Seven.") are its comedy rhythm.
- Max 2 speakers per Gemini call: anyone else is on-screen text or SFX.

## Kai's taste (from the reviews)
- Engaging like Agent Morphy: single or repeated words must carry emotion; a whisper or two lands well.
- Our own content: an inspiration is a seed (topic, structure), never a line-for-line copy.
- A 13–16-year-old gets every line on first listen. Real tool names and versions are fine; no jargon without context.
- Jokes stand on a fact, a sad fact or a bad incident turned funny. No political or military news.

## Example (approved voice, 2026-10-15)
`template/vo/script.json` is "switch to Haiku" v5, 19 lines, 40.9 s. Read it for the JSON format and the TTS style. It predates the
viral shape above (no P1 fear opener, no heart turn), so take the shape from VIRAL-PATTERNS.md, not from it.

## What Kai sees at the gate
1. A table: `# · who · style · line`, plus a column naming the pattern a line serves (P1…P9) where it serves one.
2. The total length estimate: words ÷ 2.3 + 0.45 s per line (calibrated on the template: 40.9 s real). Over 55 s → cut lines.
3. One sentence on the idea, the fact behind it, and the button.
4. The viral score (x/10, with the evidence lines) and the closest reference reel (shortcode + views) with one line on how ours differs.
