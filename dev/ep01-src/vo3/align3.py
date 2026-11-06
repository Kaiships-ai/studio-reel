# align3.py: script words (vo3/script3.json, as written) ↔ whisper words (vo3/vo3_tight.words.json) → vo3/words3.json [{w,s,e}] (times in the
# tight voice file, i.e. before the timeline offset). Whisper writes digits for spoken numbers: expanded first; unmatched words are interpolated.
import json, re, difflib
S = json.load(open('vo3/script3.json')); SW = ' '.join(S['paras']).split()
HW = json.load(open('vo3/vo3_tight.words.json'))
NUM = {'10': ['ten'], '12': ['twelve'], '11': ['eleven'], '26': ['twenty-six'], '41': ['forty-one'], '$0': ['zero', 'dollars'], '0': ['zero']}
H = []
for w, a, b in HW:
    k = w.strip().rstrip('.,?!')
    if k in NUM:
        ws = NUM[k]; H += [(x, a + (b - a) * i / len(ws), a + (b - a) * (i + 1) / len(ws)) for i, x in enumerate(ws)]
    else: H.append((w.strip(), a, b))
n = lambda w: {'replace': 'replays', 'two': 'too', 'real': 'reel', 'taxed': 'text'}.get(re.sub(r"[^a-z0-9]", '', w.lower()), re.sub(r"[^a-z0-9]", '', w.lower()))
# glue whisper's split words ("half" "-life", "follow" "up") when the script has them as one
G = []
for w, a, b in H:
    if G and n(G[-1][0]) + n(w) in {n(x) for x in SW} and n(G[-1][0]) not in {n(x) for x in SW} | {'half', 'follow'} or (G and (G[-1][0].lower(), w.lower().strip('.,')) in {('half', '-life'), ('follow', 'up'), ('follow', '-up')}):
        G[-1] = (G[-1][0] + w, G[-1][1], b)
    else: G.append((w, a, b))
m = difflib.SequenceMatcher(a=[n(w) for w in SW], b=[n(w) for w, _, _ in G], autojunk=False)
T = [None] * len(SW)
for blk in m.get_matching_blocks():
    for k in range(blk.size): T[blk.a + k] = (G[blk.b + k][1], G[blk.b + k][2])
miss = [SW[i] for i in range(len(SW)) if T[i] is None]
i = 0
while i < len(SW):                                  # interpolate runs of unmatched words between their neighbours
    if T[i] is None:
        j = i
        while j < len(SW) and T[j] is None: j += 1
        a = T[i - 1][1] if i else 0.0; b = T[j][0] if j < len(SW) else a + 0.4 * (j - i)
        for k in range(i, j): T[k] = (a + (b - a) * (k - i) / (j - i), a + (b - a) * (k - i + 1) / (j - i))
        i = j
    else: i += 1
# whisper small sometimes gives a phrase's first word zero length and stacks it on the next one ("Vanity" 51.60–51.62):
# move its start to the real speech onset after the previous word (10 ms frames above −33 dBFS at the mix level) and
# share the span with the next word by letters
import subprocess, numpy as np
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', 'vo3/vo3_tight.wav', '-f', 's16le', '-ac', '1', '-ar', '16000', '-']), np.int16).astype(np.float32) / 32768
hop = 160; db = 20 * np.log10(np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) for i in range(len(x) // hop)])) + 1e-9)
T = [list(t) for t in T]; fixed = []
for i in range(len(SW)):
    if T[i][1] - T[i][0] < 0.06:
        a0 = T[i - 1][1] if i else 0.0; f = int(T[i][0] * 100)
        if db[f] < -33:
            while f < len(db) - 1 and db[f] < -33: f += 1          # whisper start sits in the pause: forward to the voice
        else:
            while f - 1 > a0 * 100 and db[f - 1] >= -33: f -= 1   # inside the voice: back to where it began after the pause
        on = f / 100; j = i + 1 if i + 1 < len(SW) and abs(T[i + 1][0] - T[i][0]) < 0.06 else i
        end = T[j][1]; L = [len(re.sub(r'[^\w]', '', SW[k])) or 1 for k in range(i, j + 1)]; c = on
        for k, l in zip(range(i, j + 1), L): T[k] = [c, c + (end - on) * l / sum(L)]; c = T[k][1]
        fixed.append((SW[i], round(on, 2)))
print('fixed onsets:', fixed)
out = [{'w': w, 's': round(a, 3), 'e': round(b, 3)} for w, (a, b) in zip(SW, T)]
json.dump(out, open('vo3/words3.json', 'w'), indent=0)
print(len(out), 'words · unmatched (interpolated):', miss)
print(' '.join(f"{o['w']}@{o['s']:.2f}" for o in out))
