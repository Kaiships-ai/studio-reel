# caption-sync.py (dev only, not shipped): compare an episode's caption word times (vo/vo.json) with whisper.cpp word
# times measured on its voice. Needs whisper-cli and a ggml model on this machine.
#   pixi run python dev/caption-sync.py <episode folder> [--model ~/.cache/whisper/ggml-large-v3-turbo.bin]
# whisper's DTW word times sit a steady ~0.2 s late, so that bias (the median signed gap) is taken out first. Prints each word
# whose caption start is more than 0.15 s off after that, the bias and the max; exit 1 when any word is off by more than 0.3 s.
import json, os, re, statistics, subprocess, sys, tempfile
ep = sys.argv[1]; model = os.path.expanduser(sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else '~/.cache/whisper/ggml-large-v3-turbo.bin')
tmp = tempfile.mkdtemp(); wav = os.path.join(tmp, 'v16.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(ep, 'vo', 'vo.wav'), '-ar', '16000', '-ac', '1', wav], check=True)
subprocess.run(['whisper-cli', '-m', model, '-f', wav, '-ml', '1', '-sow', '-ojf', '-of', os.path.join(tmp, 'w'), '-t', '4', '-dtw', 'large.v3.turbo', '-nfa'], check=True, capture_output=True)
heard = []
for seg in json.load(open(os.path.join(tmp, 'w.json')))['transcription']:
    for tk in seg['tokens']:
        if tk['text'].startswith('[') or tk.get('t_dtw', -1) < 0: continue
        if tk['text'].startswith(' ') or not heard: heard.append([tk['text'].strip(), tk['t_dtw'] / 100])
        else: heard[-1][0] += tk['text']
norm = lambda s: re.sub(r'[^\w]', '', s).lower()
cap = json.load(open(os.path.join(ep, 'vo', 'vo.json')))['words']; j = 0; gaps = []
for w in cap:
    k = j
    while k < min(len(heard), j + 4) and norm(heard[k][0]) != norm(w['w']): k += 1
    if k < len(heard) and norm(heard[k][0]) == norm(w['w']): gaps.append((w['w'], round(w['s'] - heard[k][1], 2), round(w['s'], 2))); j = k + 1
bias = statistics.median(g[1] for g in gaps)
gaps = [(w, round(d - bias, 2), at) for w, d, at in gaps]
off = [g for g in gaps if abs(g[1]) > 0.15]; mx = max(abs(g[1]) for g in gaps)
print(json.dumps({'matched': len(gaps), 'of': len(cap), 'bias': round(bias, 3), 'max': mx, 'off': off}))
sys.exit(1 if mx > 0.3 else 0)
