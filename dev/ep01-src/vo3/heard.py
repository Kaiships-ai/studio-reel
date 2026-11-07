# heard.py <wav> [--json out]: faster-whisper small.en word stamps + pauses (gaps between words > 0.3 s) + words vs script.
import sys, json, re, subprocess, difflib, numpy as np
from faster_whisper import WhisperModel
src = sys.argv[1]
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', '16000', '-']), np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel('small.en', device='cpu', compute_type='int8').transcribe(x, word_timestamps=True, language='en')
W = [(w.word.strip(), round(w.start, 3), round(w.end, 3)) for s in segs for w in s.words]
S = json.load(open('vo3/script3.json')); script = ' '.join(S['paras']).split()
n = lambda w: re.sub(r"[^a-z0-9]", '', w.lower())
m = difflib.SequenceMatcher(a=[n(w) for w in script], b=[n(w) for w, _, _ in W], autojunk=False)
hit = sum(b.size for b in m.get_matching_blocks())
print(f'{len(x)/16000:.1f}s · heard {len(W)} words · {hit}/{len(script)} script words matched')
for op, a0, a1, b0, b1 in m.get_opcodes():
    if op != 'equal': print('  ', op, ' '.join(script[a0:a1]), '→', ' '.join(w for w, _, _ in W[b0:b1]))
gaps = [(W[i][0], W[i][2], round(W[i + 1][1] - W[i][2], 2)) for i in range(len(W) - 1) if W[i + 1][1] - W[i][2] > 0.3]
print('gaps > 0.3 s:', gaps)
if '--json' in sys.argv: json.dump(W, open(sys.argv[sys.argv.index('--json') + 1], 'w'))
