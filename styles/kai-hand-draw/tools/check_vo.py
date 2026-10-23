#!/usr/bin/env python3
"""check_vo.py: measure the voiceover against the style's voice rules (STYLE.md §7, VOICE.md). Run after make_vo.py:
   python check_vo.py <film>        (make.mjs <film> vo runs it for you)

Hard rules (exit 1):  rate ≤ +25 % on every line · ≤ 28 words per line · the CTA from "comment" to its end is said
                      in one go (every gap between words ≤ 0.05 s)
Warnings:             pace outside 5.0–6.4 syllables/s on a line · speech running longer than 5 s without a pause
                      (≥ 0.2 s) · the hook line ends after 3.5 s · no "Comment <KEYWORD>" in the last line
"""
import json, re, sys
from kitenv import path

RATE_MAX, WORDS_MAX, PACE = 25, 28, (5.0, 6.4)
RUN_MAX, BREATH, CTA_GAP, HOOK_MAX = 5.0, .2, .05, 3.5

def syllables(word):
    w = word.strip('.,!?…:;"()[]\'').strip()
    if not w: return 0
    if re.fullmatch(r'[0-9]+', w): return max(1, len(w))                 # rough: digits are rare in a script
    if re.fullmatch(r'(?:[A-Z]\.){2,6}|[A-Z]{2,3}', w): return len(re.sub(r'\W', '', w)) + w.count('W') * 2   # R.E.A., API (a keyword like PAINT is a word)
    w = w.lower()
    groups = re.findall(r'[aeiouy]+', w)
    n = len(groups)
    if w.endswith('e') and not w.endswith(('le', 'ee', 'ye')) and n > 1: n -= 1
    if w.endswith('ed') and not w.endswith(('ted', 'ded')) and n > 1: n -= 1
    return max(1, n)

def main():
    with open(path('vo', 'vo.json'), encoding='utf-8') as f: vo = json.load(f)
    hard, warn = [], []
    print(f"{'line':5s} {'rate':>5s} {'words':>5s} {'syl/s':>6s}  text")
    for L in vo['lines']:
        ws = [w for w in vo['words'] if w['line'] == L['id']]
        say = L.get('say', L['text'])
        n_words, syl = len(say.split()), sum(syllables(w) for w in say.split())
        # speaking time: the words plus the short gaps between them; a pause of 0.15 s or more (a comma, a full stop)
        # is a breath, not speech, so it doesn't slow the measured pace
        dur = sum(w['e'] - w['s'] for w in ws) + sum(max(0, b['s'] - a['e']) for a, b in zip(ws, ws[1:]) if b['s'] - a['e'] < .15)
        pace = syl / max(.01, dur)
        rate = int(re.sub(r'[^\d-]', '', str(L.get('rate', vo.get('rate', '+0%')))) or 0)
        flags = []
        if rate > RATE_MAX: hard.append(f"{L['id']}: rate {rate:+d}% > +{RATE_MAX}%"); flags.append('RATE')
        if n_words > WORDS_MAX: hard.append(f"{L['id']}: {n_words} words > {WORDS_MAX} (split the line)"); flags.append('WORDS')
        if not PACE[0] <= pace <= PACE[1]: warn.append(f"{L['id']}: {pace:.2f} syl/s outside {PACE[0]}–{PACE[1]}"); flags.append('pace')
        print(f"{L['id']:5s} {rate:+4d}% {n_words:5d} {pace:6.2f}  {L['text'][:64]}{'   ← ' + ', '.join(flags) if flags else ''}")

    # unbroken speech: consecutive words with gaps shorter than a breath
    words = vo['words']; run_s = words[0]['s'] if words else 0; longest = (0, 0, 0)
    for a, b in zip(words, words[1:] + [None]):
        if b is None or b['s'] - a['e'] >= BREATH:
            d = a['e'] - run_s
            if d > longest[0]: longest = (d, run_s, a['e'])
            if b: run_s = b['s']
    if longest[0] > RUN_MAX: warn.append(f"speech runs {longest[0]:.1f} s without a pause ({longest[1]:.2f}–{longest[2]:.2f} s), over {RUN_MAX} s")

    # the hook line must be said by ~3.5 s, so its picture can land inside the first 3 s (content-types/README.md)
    hook = vo['lines'][0]
    if hook['e'] > HOOK_MAX: warn.append(f"the hook line ({hook['id']}) ends at {hook['e']:.2f} s, over {HOOK_MAX} s: cut it to about 11 words")

    # the CTA: "comment <KEYWORD> …" said in one go
    last = vo['lines'][-1]; lw = [w for w in words if w['line'] == last['id']]
    k = next((i for i, w in enumerate(lw) if w['w'].lower().strip('.,!?') == 'comment'), None)
    keyword = None
    if k is None: warn.append(f"no \"Comment <KEYWORD>\" in the last line ({last['id']}): the reel needs one call to action")
    else:
        keyword = lw[k + 1]['w'].strip('.,!?"') if k + 1 < len(lw) else None
        gaps = [(lw[i]['w'], lw[i + 1]['w'], lw[i + 1]['s'] - lw[i]['e']) for i in range(k, len(lw) - 1)]
        bad = [g for g in gaps if g[2] > CTA_GAP]
        if bad: hard.append('CTA not said in one go: ' + ', '.join(f'"{a} {b}" gap {g * 1000:.0f} ms' for a, b, g in bad) + ' (remove the commas in that line)')

    total_syl = sum(syllables(w) for L in vo['lines'] for w in L.get('say', L['text']).split())
    speech = sum(w['e'] - w['s'] for w in words)
    print(f"\nreel {vo['duration']:.2f} s · {len(words)} words · {total_syl / max(.01, speech):.2f} syl/s while speaking · "
          f"longest run {longest[0]:.1f} s · keyword {keyword.upper() if keyword else '—'}")
    for m in warn: print('⚠ ' + m)
    for m in hard: print('✗ ' + m)
    if hard: sys.exit(1)
    print('✓ voice rules pass' + (' (with warnings)' if warn else ''))

if __name__ == '__main__':
    main()
