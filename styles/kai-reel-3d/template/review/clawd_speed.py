# clawd_speed.py → review/clawd-speed.png: Clawd's motion channels per frame (from review/audit-page.json) + their speed, cuts and his lines
# marked. v2 rule: small readable beats, no float, no wobble (a clean beat = one bump in the speed trace, no ringing tail).
import json, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
P = json.load(open('review/audit-page.json')); R = P['rows']; t = np.array([r['f'] for r in R]) / 30
ch = {'body squash (no talk)': [r['cbody'] for r in R], 'squash incl. talk bob': [r['csq'] for r in R], 'yaw rad': [r['cy'] for r in R], 'arm raise': [r['carm'] for r in R],
      'height y m': [r['cpy'] for r in R], 'blink': [r['cb'] for r in R]}
fig, ax = plt.subplots(len(ch), 1, figsize=(16, 13), sharex=True)
for a, (k, v) in zip(ax, ch.items()):
    v = np.array(v); a.plot(t, v, lw=1.2, color='#d97757'); a2 = a.twinx(); a2.plot(t[1:], np.abs(np.diff(v)) * 30, lw=0.7, color='#5a6cff', alpha=0.7); a.set_ylabel(k, fontsize=9)
    for c in P['CUTS']: a.axvline(c, color='#999', lw=0.4)
    for l in P['lines']:
        if l['who'] != 'kai': a.axvspan(l['s'], l['e'], color='#f3c9b5', alpha=0.25)
ax[0].set_title("Clawd motion (orange = value, blue = speed per s) · grey = cuts · shaded = Clawd speaking")
ax[-1].set_xlabel('s'); plt.tight_layout(); plt.savefig('review/clawd-speed.png', dpi=80); print('review/clawd-speed.png')
