"""Join the Kokoro line takes of an episode into one voice track with timings (episode/make.mjs vo runs this).
  python episode/voice.py <episode folder>
Reads <ep>/vo/lines.json (the tts.py input, in beat order) and <ep>/vo/lines/<id>.wav.
Writes <ep>/vo/vo.wav (mono 24 kHz) and <ep>/vo/vo.json: {duration, lines: [{id, who, text, s, e}], words: [{w, s, e, line}]}.
Kokoro gives no word timings, so each word gets a share of its line's length by its letters (good enough for captions)."""
import sys, os, json
import numpy as np, soundfile as sf

ep = sys.argv[1]
LEAD, PAUSE, SR = 0.25, 0.32, 24000
lines = json.load(open(os.path.join(ep, 'vo', 'lines.json'), encoding='utf-8'))
parts, out_lines, words, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], [], [], LEAD
for L in lines:
    a, sr = sf.read(os.path.join(ep, 'vo', 'lines', L['id'] + '.wav'), dtype='float32')
    if sr != SR: sys.exit(f'voice.py: {L["id"]}.wav is {sr} Hz, expected {SR}')
    d = len(a) / SR
    out_lines.append({'id': L['id'], 'who': L.get('who'), 'text': L['text'], 's': round(t, 3), 'e': round(t + d, 3)})
    ws = L['text'].split()
    weights = [len(w) + 2 for w in ws]
    edge, span, acc = 0.06, d - 0.12, 0
    for w, k in zip(ws, weights):
        s = t + edge + span * acc / sum(weights); acc += k
        words.append({'w': w, 's': round(s, 3), 'e': round(t + edge + span * acc / sum(weights), 3), 'line': L['id']})
    parts += [a, np.zeros(int(PAUSE * SR), dtype=np.float32)]
    t += d + PAUSE
audio = np.concatenate(parts)
sf.write(os.path.join(ep, 'vo', 'vo.wav'), audio, SR)
json.dump({'duration': round(len(audio) / SR, 3), 'lines': out_lines, 'words': words}, open(os.path.join(ep, 'vo', 'vo.json'), 'w', encoding='utf-8'), indent=1)
print(f'vo.wav {len(audio) / SR:.2f} s, {len(out_lines)} lines, {len(words)} words')
