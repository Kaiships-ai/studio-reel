"""Face detector for white stick-man heads at 540x960: white blob with dark rim and >=1 interior dark hole (eye).
Writes data/<name>.faces.json : per frame list of faces
[cx, cy, w, h, fill, rimdark, holes:[[cx,cy,w,h,area],...]] in 540x960 px."""
import sys, json, subprocess
import numpy as np
from scipy import ndimage as ndi

D = __import__("os").environ["FORENSIC_DATA"]
name = sys.argv[1]
W, H = 540, 960
cmd = ["ffmpeg", "-v", "error", "-i", f"{D}/{name}.mp4", "-vf", f"scale={W}:{H}:flags=area",
       "-pix_fmt", "yuv444p", "-f", "rawvideo", "-"]
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
FS = W * H * 3
CAP0, CAP1 = int(0.62 * H), int(0.78 * H)
out = []
st = ndi.generate_binary_structure(2, 1)
while True:
    buf = p.stdout.read(FS)
    if len(buf) < FS:
        break
    a = np.frombuffer(buf, np.uint8).reshape(3, H, W)
    Y = a[0].astype(np.int16); U = a[1].astype(np.int16) - 128; V = a[2].astype(np.int16) - 128
    sat = np.abs(U) + np.abs(V)
    white = (Y > 165) & (sat < 30)
    dark = Y < 75
    lab, nl = ndi.label(white, st)
    faces = []
    if nl:
        objs = ndi.find_objects(lab)
        sizes = ndi.sum_labels(np.ones_like(lab), lab, index=np.arange(1, nl + 1))
        for i, sl in enumerate(objs):
            if sizes[i] < 120:
                continue
            hh = sl[0].stop - sl[0].start; ww = sl[1].stop - sl[1].start
            if ww < 14 or hh < 10 or ww > W * 0.98:
                continue
            asp = hh / ww
            if not (0.45 < asp < 1.5):
                continue
            sub = lab[sl] == i + 1
            filled = ndi.binary_fill_holes(sub)
            area = filled.sum(); fill = area / (hh * ww)
            if not (0.55 < fill < 0.93):
                continue
            holes = filled & ~sub
            # holes must be dark (eyes / mouth / brows)
            hd = holes & dark[sl]
            hl, hn = ndi.label(hd, st)
            hs = []
            if hn:
                for j, hsl in enumerate(ndi.find_objects(hl)):
                    ar = int((hl[hsl] == j + 1).sum())
                    if ar < max(4, area * 0.0015):
                        continue
                    hy0, hx0 = hsl[0].start, hsl[1].start
                    hs.append([round((hsl[1].start + hsl[1].stop) / 2 + sl[1].start, 1), round((hsl[0].start + hsl[0].stop) / 2 + sl[0].start, 1),
                               hsl[1].stop - hsl[1].start, hsl[0].stop - hsl[0].start, ar])
            if not hs or len(hs) > 12:
                continue
            # caption glyph rejection: inside caption band and small
            cy = (sl[0].start + sl[0].stop) / 2
            if CAP0 <= cy <= CAP1 and hh < 40:
                continue
            # rim darkness on a ring around the filled blob
            pad = 5
            Y0 = max(0, sl[0].start - pad); X0 = max(0, sl[1].start - pad)
            Y1 = min(H, sl[0].stop + pad); X1 = min(W, sl[1].stop + pad)
            big = np.zeros((Y1 - Y0, X1 - X0), bool)
            big[sl[0].start - Y0:sl[0].start - Y0 + hh, sl[1].start - X0:sl[1].start - X0 + ww] = filled
            rg = ndi.binary_dilation(big, iterations=3) & ~ndi.binary_dilation(big, iterations=1)
            rimdark = float(dark[Y0:Y1, X0:X1][rg].mean()) if rg.any() else 0.0
            if rimdark < 0.35:
                continue
            faces.append([round((sl[1].start + sl[1].stop) / 2, 1), round(cy, 1), ww, hh, round(float(fill), 3),
                          round(rimdark, 2), hs])
    out.append(faces)
json.dump(out, open(f"{D}/{name}.faces.json", "w"))
print(name, len(out))
