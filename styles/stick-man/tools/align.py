# Word times for the narrator take: faster-whisper word stamps aligned to the script's own words, line by line.
#   python styles/stick-man/tools/align.py films/<slug> [vo/vo.wav]
# Writes vo/words.json [{line, i, word, t0, t1, est}] (est = whisper missed it, time spread between neighbours) and
# vo/voice-qa.md (a line under 80 % heard is marked ❌: re-take the voice, do not hand-fix times).
# Numbers: whisper writes "238", "$9,000", "1,"; the script says "two hundred thirty-eight". Digit tokens become words
# automatically (numwords.py); script.json "say": {"1980": "nineteen eighty", "$20s": "twenties"} overrides a token.
# Audio is decoded with ffmpeg to numpy here (faster-whisper's own PyAV loader fails in this env).
import json, os, re, sys, difflib, subprocess
import numpy as np
from faster_whisper import WhisperModel
from numwords import words as num_words

film = os.path.abspath(sys.argv[1]); os.chdir(film)
S = json.load(open('vo/script.json')); wav = sys.argv[2] if len(sys.argv) > 2 else 'vo/vo.wav'
NUM = {'20s': 'twenties', **S.get('say', {})}
norm = lambda w: re.sub(r"[^a-z0-9']", '', w.lower())
NUM = {norm(k): v for k, v in NUM.items()}
script = []
for l in S['lines']:
    for i, w in enumerate(re.sub(r'<[^>]+>', ' ', l['text']).replace('"', ' ').split()):
        if norm(w): script.append({'line': l['id'], 'i': i, 'word': w, 'n': norm(w)})
pcm = np.frombuffer(subprocess.check_output([os.environ.get('FFMPEG', 'ffmpeg'), '-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '16000', '-']),
                    np.int16).astype(np.float32) / 32768
segs, info = WhisperModel('small.en', device='cpu', compute_type='int8').transcribe(pcm, word_timestamps=True, vad_filter=False)
heard = []
for s in segs:
    for w in s.words:
        t = w.word.strip()
        for part in (NUM.get(norm(t)) or num_words(t) or t).split():
            if norm(part): heard.append({'n': norm(part), 't0': w.start, 't1': w.end, 'raw': t})
m = difflib.SequenceMatcher(None, [w['n'] for w in script], [w['n'] for w in heard], autojunk=False)
for a, b, n in m.get_matching_blocks():
    for k in range(n):
        script[a + k].update(t0=round(heard[b + k]['t0'], 3), t1=round(heard[b + k]['t1'], 3), est=False)
used = {b + k for a, b, n in m.get_matching_blocks() for k in range(n)}
i = 0
while i < len(script):
    if 't0' in script[i]: i += 1; continue
    j = i
    while j < len(script) and 't0' not in script[j]: j += 1
    lo = script[i - 1]['t1'] if i else 0.0
    hi = script[j]['t0'] if j < len(script) else heard[-1]['t1']
    for k in range(i, j):
        script[k].update(t0=round(lo + (hi - lo) * (k - i) / (j - i), 3), t1=round(lo + (hi - lo) * (k - i + 1) / (j - i), 3), est=True)
    i = j
for w in script: w.pop('n')
json.dump(script, open('vo/words.json', 'w'), indent=0)
rows = ['# voice QA (whisper small.en vs script)', '', '| line | words | heard | start | end | text |', '|---|---|---|---|---|---|']
bad = 0
for l in S['lines']:
    ws = [w for w in script if w['line'] == l['id']]; ok = sum(not w['est'] for w in ws)
    flag = '' if ok / len(ws) >= 0.8 else ' ❌'; bad += bool(flag)
    rows.append(f"| {l['id']} | {len(ws)} | {ok}{flag} | {ws[0]['t0']:.2f} | {ws[-1]['t1']:.2f} | {l['text'][:44]} |")
extra = [h['raw'] for k, h in enumerate(heard) if k not in used]
total = len(script)
rows += ['', f'extra speech (heard, not in script): {extra}',
         f'take length: {heard[-1]["t1"]:.2f} s · words {total} · {total / heard[-1]["t1"]:.2f} words/s · estimated {sum(w["est"] for w in script)} · lines under 80 %: {bad}',
         f'last frame at 30 fps: {round(heard[-1]["t1"] * 30)} (use it in reel.js / reel2.js frames)']
open('vo/voice-qa.md', 'w').write('\n'.join(rows) + '\n'); print('\n'.join(rows))
sys.exit(1 if bad else 0)
