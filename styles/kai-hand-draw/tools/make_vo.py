# make_vo.py: synthesize the voiceover one line at a time (edge-tts, with word timings), trim each line's silence,
# join the lines with chosen pauses, and write:
#   vo/vo.wav            the voiceover, padded to the reel's full length
#   src/vo.js            VO_LINES, VO_WORDS, VO_END, VO_DUR for the page (captions, vo(), voLine(), cutAfter())
#   vo/vo.json           the same data for make_audio.py and check_vo.py
#   vo/word_times.txt    every word with its start time, to read while storyboarding
#   vo/lines/<id>.wav    each trimmed line, and vo/lines.json, for the speech-to-text check (core/tts/asr_check.py)
# Input: vo/script.json in the film's folder:
#   { "voice": "en-US-BrianMultilingualNeural", "rate": "+20%", "pause": 0.25,
#     "lines": [ { "id": "l01", "text": "What the captions show.", "say": "optional: what is spoken, if it differs",
#                  "rate": "optional per-line rate", "pause": "optional pause after this line",
#                  "asr": "optional: what Whisper should hear, for names it spells its own way (core/tts/asr_check.py)" } ] }
#   "say" respells a word for the voice (R.E.A. → "Ree-ah") while the captions keep "text". Same word count, or the
#   captions fall back to the spoken words.
# Run:  node styles/kai-hand-draw/tools/make.mjs <film> vo      (needs an internet connection)
import asyncio, json, math, os, shutil, subprocess, sys, wave
import edge_tts
from kitenv import FFMPEG, path

SR, FPS = 48000, 30
LEAD = .12          # silence before the first word
TAIL = .7           # silence after the last word, so the last picture can land

DEFAULT_RATE = '+20%'   # the published reels' pace; check_vo.py refuses anything above +25%

def load_script():
    with open(path('vo', 'script.json'), encoding='utf-8') as f:
        s = json.load(f)
    rate = s.get('rate', DEFAULT_RATE)
    lines = []
    for i, l in enumerate(s['lines']):
        if isinstance(l, str): l = {'text': l}
        text = l['text'].strip()
        lines.append({'id': l.get('id') or f'l{i + 1:02d}', 'text': text, 'say': (l.get('say') or text).strip(),
                      'asr': l.get('asr'), 'rate': l.get('rate', rate), 'gap': float(l.get('pause', s.get('pause', .3)))})
    return s.get('voice', 'en-US-BrianMultilingualNeural'), rate, lines

def caption_words(words, text):
    # the spoken words, renamed to the caption's spelling when "say" respelled them (same count only)
    shown = text.split()
    if len(shown) != len(words): return words
    strip = lambda w: w.strip('.,!?…:;"()[]')
    return [{**w, 'w': strip(t) or w['w']} for w, t in zip(words, shown)]

async def synth(text, voice, rate, mp3):
    words = []
    c = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary')
    with open(mp3, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'w': ch['text'], 's': ch['offset'] / 1e7, 'e': (ch['offset'] + ch['duration']) / 1e7})
    return words

def ff(*a):
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', *a], check=True)

def wav_dur(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()

async def main():
    voice, rate, lines = load_script()
    tmp = path('vo', '_tmp'); shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    ldir = path('vo', 'lines'); shutil.rmtree(ldir, ignore_errors=True); os.makedirs(ldir)
    parts, t, out_lines, all_words = [('silence', LEAD)], LEAD, [], []
    for i, l in enumerate(lines):
        lid, text, gap = l['id'], l['text'], l['gap']
        mp3, wav, cut = (os.path.join(tmp, f'l{i:02d}.{x}') for x in ('mp3', 'wav', 'cut.wav'))
        try:
            words = await synth(l['say'], voice, l['rate'], mp3)
        except Exception as e:
            sys.exit(f'edge-tts failed on line {lid} ({type(e).__name__}: {e}). It needs an internet connection; check the voice name "{voice}" too.')
        if not words: sys.exit(f'edge-tts returned no word timings for line {lid}: "{l["say"]}"')
        if l['say'] != text: words = caption_words(words, text)
        ff('-i', mp3, '-ac', '1', '-ar', str(SR), wav)
        # keep [first word - 40 ms, last word + 90 ms], with tiny fades so the joins don't click
        a = max(0, words[0]['s'] - .04); b = min(wav_dur(wav), words[-1]['e'] + .09)
        ff('-i', wav, '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-af', 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.02,areverse', cut)
        shutil.copy(cut, os.path.join(ldir, f'{lid}.wav'))
        L = b - a
        out_lines.append({'id': lid, 'text': text, 'say': l['say'], 'asr': l['asr'] or (l['say'] if l['say'] != text else None),
                          'rate': l['rate'], 's': round(t, 3), 'e': round(t + L, 3)})
        all_words += [{'w': w['w'], 's': round(t + w['s'] - a, 3), 'e': round(t + w['e'] - a, 3), 'line': lid} for w in words]
        parts.append(('file', cut)); t += L
        if gap and i < len(lines) - 1: parts.append(('silence', gap)); t += gap
    end = t
    dur = math.ceil((end + TAIL) * FPS - 1e-6) / FPS          # a whole number of frames
    # join, with generated silences, then pad to the full length
    lst = os.path.join(tmp, 'concat.txt')
    with open(lst, 'w', encoding='utf-8') as f:
        for k, (kind, v) in enumerate(parts):
            if kind == 'silence':
                p = os.path.join(tmp, f's{k:02d}.wav')
                ff('-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', f'{v:.3f}', p)
                v = p
            f.write("file '" + v.replace('\\', '/').replace("'", "'\\''") + "'\n")
    ff('-f', 'concat', '-safe', '0', '-i', lst, '-af', 'apad', '-t', f'{dur:.4f}', '-ar', str(SR), '-ac', '1', '-c:a', 'pcm_s16le', path('vo', 'vo.wav'))
    shutil.rmtree(tmp, ignore_errors=True)

    data = {'voice': voice, 'rate': rate, 'lines': out_lines, 'words': all_words, 'end': round(end, 3), 'duration': round(dur, 4)}
    with open(path('vo', 'vo.json'), 'w', encoding='utf-8') as f: json.dump(data, f, indent=1)
    with open(os.path.join(ldir, 'lines.json'), 'w', encoding='utf-8') as f:
        json.dump([{'id': l['id'], 'text': l['text'], **({'asr': l['asr']} if l['asr'] else {})} for l in out_lines], f, indent=1)
    js = '// vo.js: generated by make_vo.py (make.mjs <film> vo). Voiceover line and word timings, in seconds of video time.\n'
    js += 'const VO_LINES = ' + json.dumps([{k: l[k] for k in ('id', 'text', 's', 'e')} for l in out_lines]) + ';\n'
    js += 'const VO_WORDS = ' + json.dumps(all_words) + ';\n'
    js += f'const VO_END = {end:.3f};   // the last word ends here\n'
    js += f'const VO_DUR = {dur:.4f};  // the reel\'s length: the voiceover plus a short tail\n'
    os.makedirs(path('src'), exist_ok=True)
    with open(path('src', 'vo.js'), 'w', encoding='utf-8') as f: f.write(js)
    with open(path('vo', 'word_times.txt'), 'w', encoding='utf-8') as f:
        f.write(f'# reel length {dur:.2f} s · last word ends {end:.2f} s · voice {voice} {rate}\n')
        for l in out_lines:
            f.write(f"{l['id']} {l['s']:.2f}-{l['e']:.2f}  {l['text']}\n  ")
            f.write(' '.join(f"{w['w']}@{w['s']:.2f}" for w in all_words if w['line'] == l['id']) + '\n')
    print(f'vo/vo.wav  {wav_dur(path("vo", "vo.wav")):.2f} s  (last word ends {end:.2f} s)')
    for l in out_lines: print(f"  {l['s']:6.2f}-{l['e']:6.2f}  {l['id']:5s} {l['text'][:70]}")
    print('wrote src/vo.js, vo/vo.json, vo/word_times.txt, vo/lines/')

asyncio.run(main())
