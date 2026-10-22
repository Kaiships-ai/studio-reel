# hidden-snap check (LISTICLE hard rule): reads camspeed.mjs output (f, chA, chB, median px/f, max px/f) from stdin.
# A snap = a frame inside one chapter whose median px/f > 40 and > 2.5 × both neighbours (a jump with no motion around it).
# usage: node review/ref-measure/camspeed.mjs | python3 review/snaps.py [t0 t1]
import sys
R = [l.split() for l in sys.stdin if l[:1].isdigit()]; R = [(int(a), int(b), int(c), float(d), float(e)) for a, b, c, d, e in R]
a, b = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (0, 1e9)
bad = []; sp = []
for j in range(1, len(R) - 1):
    f, ia, ib, m, mx = R[j]
    if not (a <= f / 30 < b) or ia != ib: continue
    sp.append(m)
    if m > 40 and m > 2.5 * max(R[j - 1][3], 0.1) and m > 2.5 * max(R[j + 1][3], 0.1): bad.append((f, m))
sp.sort(); print(f'frames {len(sp)}  median {sp[len(sp)//2] if sp else 0:.1f} px/f  max {sp[-1] if sp else 0:.1f}  snaps {len(bad)} {bad[:10]}')
