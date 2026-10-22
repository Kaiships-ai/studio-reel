# voice-qa · morphy-clone-02 (v4: one acted performance, one voice per character)

Kai (2026-10-15): "single and repeated words must carry emotion; 'Okay. That's actually nice.' is broken; 'Yes, yes' must be continuous;
whisper a few places." v3 read every line flat (edge Brian, one rate) and built multi-part lines from separately synthesised parts.
v4: the whole dialogue is ONE ElevenLabs eleven_v3 text-to-dialogue performance with audio tags ([excited], [panicking], [whispers], …);
each line is cut whole (inner pauses are the actor's) and placed on Morphy's line onset. Voices by ECAPA vs Morphy: Kai = Will 0.73,
Haiku = Matilda 0.43, Opus = River 0.50 (scripts/v4_*_pick.py). Whispered: l10 "Haiku broke it.", l16 "…that's actually nice.", l21 (new).

**Gate: 10/10**

- PASS · native TTS only: no time-stretch, no pitch-shift on any part
- PASS · whisper hears every line word for word
- PASS · no clicks
- PASS · no buzzy/noisy line (spectral flatness of loud frames ≤ that voice's median + 6 dB, medians -44.1 / -47.7 / -49.8 dB; worst -41.8 dB)
- PASS · timing: every line starts on Morphy's measured onset (latest +0.33 s, ≤ 0.4) and each character's sentence pace (≥ 3 words) stays within ±25 % of Morphy's (Kai -3 %, Claude -22 %); the inner pauses are the actor's (1-2-word lines: Kai +6 %, Claude -19 %)
- PASS · loudness: line RMS spread 1.0 dB (≤ 3; the whispered l10/l21 sit 4 dB under on purpose)
- PASS · brand words heard as Claude / Haiku / Opus
- PASS · ONE voice per character for the whole reel, one acted eleven_v3 dialogue performance, emotion by audio tags only (no stretch, no pitch-shift): Kai = Will (take 11), Haiku = Matilda (take 11/23), Opus = River (take 23)
- PASS · consistent line to line, judged against Morphy's own acted voices on the same measure (ECAPA vs own centroid ≥ Morphy's − 0.02; f0 spread ≤ Morphy's + 3 st; shouted/whispered lines are acting, left out on both sides): Kai ours 0.358 / 6.3 st vs Morphy 0.34 / 6.9 st · Haiku ours 0.106 / 7.9 st vs Morphy 0.107 / 6.7 st · Opus ours 0.237 / 5.6 st vs Morphy 0.028 / 5.3 st
- PASS · the whispered button "Claude… I'm trying Codex." (l21, after the usage limit) is heard: "Ugh, Claude, I'm trying Codex."

| line | who | voice | take | whisper hears | = script | clicks | flatness dB | pace vs Morphy | RMS dBFS |
|---|---|---|---|---|---|---|---|---|---|
| l01 | kai | ElevenLabs Will | 11 | Claude, switch to Haiku 5 .5. | ✅ | 0 | -44.9 (Morphy -46.8) | +21% / -11% | -20.3 |
| l02 | haiku | ElevenLabs Matilda | 23 | Done | ✅ | 0 | -48.6 (Morphy -48.4) | -19% | -19.9 |
| l03 | kai | ElevenLabs Will | 11 | Polish the design. | ✅ | 0 | -44.2 (Morphy -46.5) | -13% | -20.1 |
| l04 | haiku | ElevenLabs Matilda | 11 | Perfect! It's polished! | ✅ | 0 | -46.7 (Morphy -40.5) | -6% / -22% | -19.7 |
| l05 | kai | ElevenLabs Will | 11 | The menu is on the logo. | ✅ | 0 | -47.8 (Morphy -50.2) | -35% | -20.1 |
| l06 | haiku | ElevenLabs Matilda | 11 | Fixed. | ✅ | 0 | -46.7 (Morphy -34.6) | -29% | -19.6 |
| l07 | kai | ElevenLabs Will | 11 | No, no, no, no. Not like that. Stop! | ✅ | 0 | -43.9 (Morphy -47.1) | +2% / +78% | -20.0 |
| l08 | haiku | ElevenLabs Matilda | 11 | Perfect. | ✅ | 0 | -52.9 (Morphy -46.4) | -31% | -19.8 |
| l09 | kai | ElevenLabs Will | 11 | Switch to Opus 5 .5. | ✅ | 0 | -47.1 (Morphy -46.3) | +3% | -20.2 |
| l10 | kai | ElevenLabs Will | 11 | Haiku broke it. | ✅ | 0 | -42.6 (Morphy -41.5) | -8% | -24.1 |
| l11 | kai | ElevenLabs Will | 11 | Fix it please | ✅ | 0 | -45.4 (Morphy -39.8) | -19% | -20.1 |
| l12 | clawd | ElevenLabs River | 23 | I see that. | ✅ | 0 | -48.6 (Morphy -43.8) | -38% | -20.2 |
| l13 | kai | ElevenLabs Will | 11 | Oh. Nice. | ✅ | 0 | -43.5 (Morphy -42.9) | -45% / +16% | -20.2 |
| l14 | kai | ElevenLabs Will | 11 | Now polish it. | ✅ | 0 | -47.2 (Morphy -45.9) | +23% | -20.3 |
| l15 | clawd | ElevenLabs River | 23 | Done. | ✅ | 0 | -50.9 (Morphy -48.6) | -19% | -20.0 |
| l16 | kai | ElevenLabs Will | 11 | Okay, that's actually nice. | ✅ | 0 | -42.5 (Morphy -45.7) | +1% / -8% / +8% | -20.3 |
| l17 | kai | ElevenLabs Will | 11 | Add a pricing page. | ✅ | 0 | -42.0 (Morphy -44.1) | +5% | -20.2 |
| l18 | clawd | ElevenLabs River | 23 | Done! | ✅ | 0 | -50.9 (Morphy -51.4) | -14% | -20.0 |
| l19 | kai | ElevenLabs Will | 11 | Yes, yes! Okay, and the on -board... | ✅ | 0 | -41.8 (Morphy -39.2) | -27% / +5% / +63% / +35% | -20.1 |
| l20 | clawd | ElevenLabs River | 23 | Usage limit reached. | ✅ | 0 | -45.9 (Morphy -50.2) | -6% | -20.6 |

## Brand words (said by Kai)

| word | line | heard | ours s | Morphy s | ours F1/F2 Hz | Morphy F1/F2 Hz |
|---|---|---|---|---|---|---|
| Claude | l01 | ✅ | 0.6 | 0.42 | 632 / 1037 | 700 / 1036 |
| Haiku | l01 | ✅ | 0.45 | 0.3 | 671 / 1578 | 698 / 1524 |
| Opus | l09 | ✅ | 0.46 | 0.32 | 634 / 1317 | 438 / 1619 |
| Haiku | l10 | ✅ | 0.38 | 0.52 | 254 / 1692 | 450 / 1697 |

"Claude" is synthesised as "Clawd" inside the whole sentence, then cut (the /klɔːd/ vowel; reel #1 found the isolated "Claude," came out as /kloːd/).

## Acting (the tags per line)

- l01 kai: `[casually] Clawd, switch to Haiku 5.5.`
- l02 haiku: `[cheerfully] Done!`
- l03 kai: `Polish the design.`
- l04 haiku: `[excited] Perfect! It's polished!`
- l05 kai: `[confused] ...The menu's on the logo.`
- l06 haiku: `[cheerfully] Fixed!`
- l07 kai: `[panicking] No no no no— not like that! [shouting] Stop!`
- l08 haiku: `[proudly] Perfect!`
- l09 kai: `[exasperated] Switch to Opus 5.5.`
- l10 kai: `[whispers] Haiku broke it.`
- l11 kai: `[pleading] Fix it, please.`
- l12 clawd: `[calmly] I see that.`
- l13 kai: `[surprised] Oh. [impressed] Nice.`
- l14 kai: `Now polish it.`
- l15 clawd: `[calmly] Done.`
- l16 kai: `[hesitant] Okay... [whispers] that's actually nice.`
- l17 kai: `[excited] Add a pricing page.`
- l18 clawd: `[calmly] Done.`
- l19 kai: `[excited] Yes, yes! Okay, and the onboard—`
- l20 clawd: `[flatly] Usage limit reached.`
- l21 kai: `[sighs] [whispers] Clawd... I'm trying Codex.`

## A/B
`review/voice-ab.wav`: 6 lines, each = Morphy (demucs vocal stem) → 0.4 s → ours (voice stem) → 0.9 s, levelled to the same RMS.
Lines: l04, l07, l13, l16, l19, l20
