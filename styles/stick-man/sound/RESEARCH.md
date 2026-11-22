# Sound and music research (KIT-SOUND, 18 November)

Kai's bar for a stick-man film is the three "Rick clip" shorts. Round 4 of Hot Money ep01 scored 7/10, and Kai and a
friend both named music and sound as a large part of the gap. This file holds what we measured, how, and what it means
for the next film. The numbers come from `styles/stick-man/tools/review/refbench.mjs` (method and limits in
`../bench/README.md`) and from listening runs by an audio model. Each claim names its source.

## What Rick does that we do not

| What | Rick median (band) | Our r4 v1 | Our r4, kit mixer + new music (A / B / C) | Source |
| --- | --- | --- | --- | --- |
| Loudness, whole film | -14.1 LUFS (-14.2 to -14.0) | -14.1 | -14.0 / -14.1 / -14.1 | ebur128 |
| Loudness, first 3 s | -14.1 LUFS (-14.4 to -13.9) | -12.8 | -12.7 / -12.8 / -12.8 | ebur128 on the first 3 s |
| Loudness range | 2.1 LU (1.7 to 2.2) | 5.4 | 5.1 / 5.2 / 5.3 | ebur128 LRA |
| Short-term spread, p90 - p10 | 1.7 LU (1.4 to 1.7) | 4.8 | 4.5 / 4.5 / 4.6 | 3 s short-term every 1 s |
| True peak in the mp4 | -2.2 dBTP | +2.3 | -1.1 / -1.2 / -1.3 | ebur128 peak=true |
| Speech share | 100 % | 69 % | 69 % | Silero VAD |
| Bed under the loud parts | 15.5 dB (15.4 to 17.3) | 18.2 | 17.5 / 19.2 / 17.5 | 50 ms blocks, 5 s sections |
| Biggest bed drop between sections | 4.0 dB (3.5 to 6.9) | 17.0 | 17.6 / 16.0 / 17.9 | same |
| Bed in the 2 s before the payoff, against the median bed | 3.2 dB (1.5 to 8.9) | 15.3 | 11.6 / 12.2 / 11.6 | same |
| Dip before the payoff | 2.0 dB (1.7 to 5.8) | -0.3 | 0.5 / 0.9 / 0.8 | short-term loudness, 3 s before the loudest moment |
| Effects a listener hears, per minute | 15.7 (15.6 to 23.5) | 12.7 | A: 23.3 and 19.3 (two runs) | listening count (below) |

Read as plain words:

1. **Rick never turns the music off.** The narration runs from the first frame to the last (speech 100 %), and the
   music runs under all of it. The listening model heard Rick's music cut out only once or twice a clip, for about a
   second, on a punchline (a record scratch on "Wait, what?", a cut when "nothing happens"). The largest drop between
   two 5 s sections is 4 dB. Our film turns the music fully off four times (17 dB drops) and has no voice for 31 % of
   its length.
2. **Rick is dense and level.** Its loudness range is 2.1 LU and its short-term spread 1.7 LU. Ours is 5.4 LU and 4.8 LU:
   loud hits, quiet gaps. A swap of the mixer or the music moves this only by 0.1 to 0.3 LU, because the range comes from
   the film's plan (its silences and its loud block), not from the mixer.
3. **Rick's effects are story foley, on the beat.** Clip 1: 11 of the 17 effects heard are foley (a paint roller,
   liquid pouring, a cell door, footsteps), and 15 of 17 land on a story moment. A rise and a bass drop sit in the last
   6 s, where the music also lifts to its highest energy.
4. **Rick opens at the film's level.** Its first 3 s sit at the film's -14.1. Ours open 1.3 LU louder and end 1.3 LU
   quieter.
5. **Rick's music sits about 15.5 dB under the loud parts.** Industry sources give 12 to 20 dB under the voice (W3C
   WCAG 1.4.7 asks for at least 20 dB for accessibility; practitioner guides give 12 to 14 dB for Reels and about 20 dB
   in general). Ours sits at 17.5 to 19.2 dB: in that range, a little quieter than Rick.

What the kit fixed in this unit: the true peak of the delivered mp4 (+2.3 dBTP on v1, because the AAC encode overshoots
the wav's -1.6 dBTP limit; now the mixer measures the mp4 and limits again until it is at or under -1.0), voice clarity
under hero hits (4 of 255 words under +6 dB, now 0), cue names that played the wrong sound (`bag_whoosh` and `bag_grab`
played a bag thump), and real music with a licence in place of the synthesised score.

What the kit cannot fix, and the film plan should (FILM-STORY): keep a music bed under the whole film and replace the
four music-out silences with dips of 4 to 7 dB; bring the first 3 s down to the film's level; narrow the loudness range
toward 2 to 3 LU; lift the music in the last seconds instead of fading it out.

## Effects per minute: how it was counted

Rick's clips have no stems, so effects cannot be found on the mixed track by machine. The best detector we tried
(spectral onsets outside the speech mask) reached a precision of 0.43 and a recall of 0.45 against our v1 effect stem
(`../bench/README.md`). So the rate is a **listening count**: `gemini-3.8-flash` (temperature 0.2) hears each whole clip
and lists every sound effect it hears with its time and kind. The rate uses the file's real duration, because the model
misread the length of our 90 s film as 130 s in two of four runs.

- Rick: 17 effects in 65.3 s (15.6 a minute), 22 in 56.1 s (23.5), 17 in 64.9 s (15.7).
- Ours, v1: 19 in 90.1 s (12.7). Ours, kit mixer with music A: 35 and 29 in two runs (23.3 and 19.3).
- The two runs on the same file differ by 4.0 a minute. That spread is the floor of this row: v1's gap of -3.0 is
  under it, so "we have fewer effects than Rick" is not proven.
- It counts what a listener hears. Our v1 places 225 cues; the model heard 19 of them.

The counts are in `../bench/listening.json`. The daily quota of the key is 20 calls, shared by every owner.

## Music Kai can post

Six tracks were checked (pages and licence pages opened, a fresh agent re-checked all of them). Only two sources were
reachable: incompetech.com and Freesound. Pixabay and filmmusic.io refused automated access, and FreePD closed in 2025.

| Candidate | Track | Licence | Credit needed | Fit to r4 (lane 7) |
| --- | --- | --- | --- | --- |
| A | "Black Vortex", Kevin MacLeod | CC BY 4.0 | yes | 15/15 section changes on the beat, largest gap 0.000 s |
| B | "Hitman", Kevin MacLeod | CC BY 4.0 | yes | 15/15, largest gap 0.046 s; the bar grid is a guess (weak downbeat) |
| C | "Crypto", with "Sneaky Snitch" under the bank scene (57.0 to 69.4 s), Kevin MacLeod | CC BY 4.0 | yes | 15/15, 0.000 s; Crypto is flat, so its last section sits about 9 dB under plan |

Not kept: "Unanswered Questions" and "Sneaky Snitch" as whole-film beds (flat, and Sneaky Snitch reads comic), and a
Freesound CC0 drum build (only the 64 kbps preview was reachable without a login; a good riser for 26.7 to 29.2 s).

- The CC BY 4.0 grant is worldwide and royalty free, with no NonCommercial term. The author's FAQ allows monetised
  videos with credit.
- The credit goes in the Instagram caption, with "edited" because the tracks are cut:
  `"<Title>" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0 · https://creativecommons.org/licenses/by/4.0/ · edited`.
- Risk: the author registers these tracks in YouTube Content ID, and claims follow a missing credit. Nothing we found
  says how Meta treats them. Kai decides whether that risk is acceptable.
- The fit: `styles/stick-man/tools/run/sound_fit.py` cuts a track on its bar lines so each section of the film's music arc
  starts on a downbeat, plays the louder parts under the louder states, and keeps the planned silences silent.

## Does a better track change retention?

No source we could read isolates music choice. The closest data is a summary of 10,110 Facebook Reels: speech in the
first 3 s lifted 10-second retention by about 25 % over music, and engagement by 5.6 % over music only
(socialmediatoday.com summary of an Emplifi report; the report itself was not read). A narrated film is already on the
stronger side of that comparison. The honest test is the same cut posted with two music beds and Instagram's own
retention graph.

## Sources

- Loudness delivery, about -14 LUFS and -1 dBTP; no platform publishes a number:
  https://dj-master-web.vercel.app/en/blog/instagram-reels-audio-en,
  https://engineering.fb.com/2023/04/11/video-engineering/high-quality-audio-xhe-aac-codec-meta/,
  https://productionadvice.co.uk/td1008/.
- Music under a narrator: https://www.w3.org/WAI/WCAG22/Understanding/low-or-no-background-audio.html,
  https://soundstripe.com/blogs/how-to-perfect-your-audio-levels.
- Hits on cuts, risers that peak on the impact, half a second of silence before the boom, "don't fill every second":
  https://violetrecording.com/sound-design-for-trailers/, https://fault-magazine.com/?p=107206.
- Retention: https://www.socialmediatoday.com/news/human-speech-and-presence-help-drive-reels-engagement/.
- Licences: https://incompetech.com/music/royalty-free/faq.html, https://incompetech.com/music/royalty-free/youtube-contentid.html,
  https://creativecommons.org/licenses/by/4.0/, and each effect's Freesound page in `CREDITS`.
