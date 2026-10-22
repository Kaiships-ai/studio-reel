# SFX: production quality, not cheap

Kai (2026-10-15): SFX matter a lot; the bar is **industry production SFX**, not the cheap synth blips we have now. The library
grows reel by reel — each skit should leave it richer than it found it.

## The bar
- Real, recorded or professionally designed sounds (foley, UI, whooshes, impacts), layered — never a single raw synth beep for a hero hit.
- Each hero hit = 2–3 layers: transient (click/tick) + body (thump/whoosh) + tail/sweetener (shimmer, air). Short and tight.
- Sounds match the picture's material: Clawd is a small plastic/pixel toy (light taps, squeaky boings), keys are mechanical,
  screens are soft UI.
- Mix: SFX 3–6 dB under the voice, high-pass ~200 Hz (nothing muddy under the dialog), never on top of a spoken consonant;
  each hit lands 1 frame after its picture; music bed 15–18 dB under the dialog; master −14 LUFS.
- Silence is a sound: drop the music for the turn or the button.

## Where sounds come from (in order)
1. **Our library** `kaiship-business/assets/sfx/` (create it with the first skit; one folder per category: ui, foley, whoosh,
   impact, clawd, ambience) + a `LIBRARY.md` row per file: name · source · license · used in.
2. **Free licensed sources** with a clear license (CC0 or royalty-free for commercial use): Freesound (CC0 filter),
   Sonniss GDC bundles, Pixabay sound effects, Mixkit. Record the license in LIBRARY.md.
3. **Generated** with the `sound-effects` / ElevenLabs SFX skill when nothing fits (costs credits) — keep the good ones in the library.
4. `audio/synth.py` only for music beds and placeholder blips while blocking, never for the final hero hits.

## Workflow
- `window.__cues()` in `reel.js` lists every hit (t, kind) → `audio/cues.json`.
- Today `audio/score.py` only has synth SFX (chirp/pop/boing) and raises on an unknown `kind`. **The first skit's job:** write
  `audio/sfx.py` (cues.json → per kind a list of library wav layers with gain/offset, each hit 1 frame after its picture, ducked
  under spoken consonants → `audio/sfx.wav`), create `kaiship-business/assets/sfx/` + `LIBRARY.md`, then `make-template.sh` so
  every later skit starts with it.
- Mix sfx.wav + music + voice → `audio/mix.wav`.
- Check with `review/audio_audit.py` (SFX vs voice levels, LUFS) and by ear on a phone speaker.

## Library log (grow it)
| Kind | File | Source · license | First used in |
|---|---|---|---|
| prompt / enter / tap / land / land_big / toggle / rm / poof / poof_ui / sparkle / snap / stand / slump / card | see `kaiship-business/assets/sfx/LIBRARY.md` (17 files) and the KIT in `template/audio/sfx.py` | Pixabay licence (11) · ElevenLabs generated (6) | reel57-permission |
| alarm / bot / bots / timer / impact / drop / ping / flare / counter / poweroff / eyesoff / stamp / keypop / relief / check / chart … | +9 files (alarm-stinger, robot-blip, timer-tick, sonar-ping, counter-roll, low-boom, power-down, key-jingle, night-room-tone); KIT in reel58 `audio/sfx.py` | ElevenLabs generated (9) | reel58-api-key |

## Listicle mode levels (reel63 v2, Kai 100/10, 2026-10-18; skit mode unchanged)
- One narrator, so the SFX may sit closer: each hit's first 150 ms ≈ −6.5 dB under median speech (4–8 dB band), SFX stem ≈ −21 LUFS,
  voice ≈ −14.6, music ≈ −28 LUFS, master −14 LUFS on the MP4. Earshot SFX set by default (`SFX_SET=earshot`, Kai's pick).
- "Never on top of a consonant" = gain ONLY the consonant bins (STFT, 1–12 kHz) inside words; a broadband gain measured in 2–8 kHz is a
  full-band duck in disguise and buries every hit (reel63 v1). Code: `listicle/audio/sfx.py` `word_duck`; check: `listicle/review/levels.py`.
- Open for Kai: `template/audio/sfx.py` (skit) still uses the broadband-gain duck. Test an A/B on the next skit before changing it.
