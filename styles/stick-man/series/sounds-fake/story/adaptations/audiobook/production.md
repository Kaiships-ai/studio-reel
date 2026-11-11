---
title: Narration production notes
kind: adaptation-notes
---

# Narration production notes (adaptation skill, audiobook route adapted to a 60-80 s reel)

| Audiobook step | Reel version |
|---|---|
| Pronunciation guide | Ep 1 speaks no hard names ("Helicobacter pylori" and "Fremantle" are only printed in the set). TTS check on the take: "Perth", "Marshall", "Warren", "Nobel", "1982", "1984" (listen for each; respell only from a cited dictionary). Add `pronunciation:` with a source for any harder name a later episode says; never invent one. |
| Runtime estimate | The build assumes 155 words/min (78 s for 200 words). Achird measures 2.9-3.3 words/s, so ep 1 = 61-69 s of speech, ~63-72 s with pauses. Rescale with the real take. |
| Narrator | Gemini TTS, voice Achird, one narrator, delivery words in each line's `style` (`adaptations/reel/ep01.script.json`). |
| Reads badly aloud | Hook l01 ends on a two-word sentence ("On purpose."): keep the stop. Quoted line l08 is a fragment: style "sly", a beat of air before the quote. Numbers spoken as words ("ten percent", "Twenty-one"). |
| Retail sample, credits | Not used. Credits and sources go in the post caption (bible CTA slot). |
| AI narration disclosure | The post caption states the voice is AI (platform label on). |
