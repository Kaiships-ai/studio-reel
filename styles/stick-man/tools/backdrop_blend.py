# Far backdrop pieces for the stick-man sets (KIT-DEPTH): rows of town blocks seen 20-60 m away, past a set's own walls.
# Detail that reads under lens blur and aerial haze: window grids with a few lit panes, cornices, shop bands, rooftop
# water tanks, AC boxes, antennas, a billboard. Grimy night palette (Kai 13/11: dusty, damp, not clean neon).
#   Blender -b --factory-startup --python styles/stick-man/tools/backdrop_blend.py -- --blend <out.blend>
# then export with tools/export_glb.py (GLB.md step 2): --pieces backdrop_skyline_a,backdrop_skyline_b,backdrop_roofline
# Kit origin: the facade line on y = 0, buildings in +y, the row centred on x = 0, ground at z = 0.
import bpy, sys, math, random

def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return {a[i].lstrip('-'): a[i + 1] for i in range(0, len(a) - 1, 2)}

MATS = {}
def mat(name, rgb, emit=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if emit:
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*rgb, 1); e.inputs['Strength'].default_value = emit
        nt.links.new(e.outputs[0], out.inputs[0])
    else:
        p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = (*rgb, 1); p.inputs['Roughness'].default_value = 0.85
        nt.links.new(p.outputs[0], out.inputs[0])
    MATS[name] = m; return m

WALLS = [(0.20, 0.090, 0.060), (0.13, 0.075, 0.055), (0.22, 0.20, 0.17), (0.36, 0.31, 0.23), (0.17, 0.15, 0.14), (0.27, 0.16, 0.10)]
LIT = [(1.0, 0.62, 0.28), (1.0, 0.80, 0.52), (0.70, 0.80, 0.78), (1.0, 0.50, 0.20)]

def box(col, lo, hi, m):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = [(h - l) for l, h in zip(lo, hi)]; o.location = [(l + h) / 2 for l, h in zip(lo, hi)]
    bpy.ops.object.transform_apply(scale=True, location=False)
    o.data.materials.append(m); relink(o, col); return o

def cyl(col, c, r, h, m, verts=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(c[0], c[1], c[2] + h / 2))
    o = bpy.context.active_object; o.data.materials.append(m); relink(o, col); return o

def cone(col, c, r, h, m):
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r, depth=h, location=(c[0], c[1], c[2] + h / 2))
    o = bpy.context.active_object; o.data.materials.append(m); relink(o, col); return o

def relink(o, col):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)

def building(col, q, x0, w, h, d=6.0):
    k = q.randrange(len(WALLS)); wall = mat(f'wall{k}', WALLS[k])
    box(col, (x0, 0, 0), (x0 + w, d, h), wall)
    trim = mat('trim', (0.10, 0.09, 0.08))
    box(col, (x0 - 0.15, -0.25, h - 0.45), (x0 + w + 0.15, d, h), trim)                     # cornice
    dark, frame = mat('pane_dark', (0.035, 0.04, 0.05)), mat('frame', (0.30, 0.28, 0.24))
    floors, cols = int((h - 3.4) // 3.0), max(1, int((w - 1.0) // 2.0))
    gx = (w - cols * 2.0) / 2 + 0.5
    for f in range(floors):
        z = 3.6 + f * 3.0
        for c in range(cols):
            x = x0 + gx + c * 2.0
            lit, k = q.random() < 0.16, q.randrange(len(LIT))
            m = mat(f'lit{k}', LIT[k], emit=2.0) if lit else dark
            box(col, (x - 0.08, -0.06, z - 0.08), (x + 1.08, 0.0, z + 1.48), frame)
            box(col, (x, -0.10, z), (x + 1.0, -0.02, z + 1.4), m)
            if not lit and q.random() < 0.25: box(col, (x, -0.12, z + 0.9), (x + 1.0, -0.10, z + 1.4), mat('blind', (0.30, 0.25, 0.17)))
    if q.random() < 0.6:                                                                   # ground floor shop band
        box(col, (x0 + 0.3, -0.12, 0), (x0 + w - 0.3, 0.0, 2.6), dark)
        k = q.randrange(len(LIT))
        box(col, (x0 + 0.6, -0.4, 2.75), (x0 + w - 0.6, -0.1, 3.3), mat(f'sign{k}', LIT[k], emit=1.5) if q.random() < 0.5 else trim)
    return h

def rooftop(col, q, x0, w, h, d=6.0):
    metal, tar = mat('metal', (0.16, 0.15, 0.14)), mat('tar', (0.05, 0.05, 0.05))
    if w > 4.5 and q.random() < 0.55:                                                      # water tank on legs
        cx, cy = x0 + q.uniform(1.5, w - 1.5), q.uniform(2, d - 2)
        for dx, dy in ((-0.7, -0.7), (0.7, -0.7), (-0.7, 0.7), (0.7, 0.7)): box(col, (cx + dx - 0.06, cy + dy - 0.06, h), (cx + dx + 0.06, cy + dy + 0.06, h + 1.6), metal)
        cyl(col, (cx, cy, h + 1.6), 1.1, 2.2, mat('wood', (0.24, 0.16, 0.10)), 12); cone(col, (cx, cy, h + 3.8), 1.2, 0.7, tar)
    for _ in range(q.randrange(0, 3)):                                                     # AC boxes
        ax = x0 + q.uniform(0.5, w - 1.5); box(col, (ax, 1.0, h), (ax + 1.0, 1.8, h + 0.8), metal)
    if q.random() < 0.4:                                                                   # antenna
        ax = x0 + q.uniform(0.5, w - 0.5); box(col, (ax - 0.04, 2.5, h), (ax + 0.04, 2.58, h + q.uniform(2.5, 5)), metal)
    if q.random() < 0.25:                                                                  # chimney
        ax = x0 + q.uniform(0.5, w - 1.0); box(col, (ax, 3.0, h), (ax + 0.6, 3.6, h + 1.4), mat('wall0', WALLS[0]))

def row(name, seed, hmin, hmax, width=32.0, tall=None):
    col = bpy.data.collections.new('KIT_' + name); bpy.context.scene.collection.children.link(col)
    q = random.Random(seed); x = -width / 2
    while x < width / 2 - 2:
        w = min(q.uniform(4.0, 8.5), width / 2 - x); h = q.uniform(hmin, hmax)
        if tall and abs(x + w / 2 - tall[0]) < w / 2: h = tall[1]
        building(col, q, x, w, h); rooftop(col, q, x, w, h); x += w + q.choice([0, 0, 0.6])
    return col

def roofline(name, seed, width=32.0):
    # the near-far layer: low rooftops, a billboard on a frame, power poles with sagging wires
    col = bpy.data.collections.new('KIT_' + name); bpy.context.scene.collection.children.link(col)
    q = random.Random(seed); x = -width / 2
    while x < width / 2 - 2:
        w = min(q.uniform(5, 9), width / 2 - x); h = q.uniform(3.5, 6.5)
        k = q.randrange(len(WALLS)); box(col, (x, 0, 0), (x + w, 5, h), mat(f'wall{k}', WALLS[k]))
        box(col, (x - 0.1, -0.2, h - 0.3), (x + w + 0.1, 5, h), mat('trim', (0.10, 0.09, 0.08))); rooftop(col, q, x, w, h, 5); x += w
    metal, ink = mat('metal', (0.16, 0.15, 0.14)), mat('cable', (0.03, 0.03, 0.03))
    bx = q.uniform(-6, 6)                                                                  # billboard: a faded panel on a frame
    for dx in (0.6, 5.4): box(col, (bx + dx - 0.1, 1.5, 5), (bx + dx + 0.1, 1.7, 9.0), metal)
    box(col, (bx, 1.2, 8.8), (bx + 6, 1.4, 11.8), mat('board', (0.42, 0.34, 0.22)))
    box(col, (bx + 0.3, 1.1, 9.1), (bx + 3.2, 1.2, 11.5), mat('board_ink', (0.30, 0.10, 0.07)))
    poles = [-width / 2 + 2 + i * 9.5 for i in range(4)]
    for px in poles:
        box(col, (px - 0.12, -1.5, 0), (px + 0.12, -1.26, 10.5), mat('pole', (0.12, 0.09, 0.07)))
        box(col, (px - 0.9, -1.5, 9.8), (px + 0.9, -1.3, 9.95), mat('pole', (0.12, 0.09, 0.07)))
    for a, b in zip(poles, poles[1:]):                                                     # wires as thin sagging segments
        for k in (-0.8, 0.0, 0.8):
            n = 8
            for i in range(n):
                t0, t1 = i / n, (i + 1) / n
                z0, z1 = 9.95 - 0.9 * 4 * t0 * (1 - t0), 9.95 - 0.9 * 4 * t1 * (1 - t1)
                xa, xb = a + (b - a) * t0, a + (b - a) * t1
                bpy.ops.mesh.primitive_cylinder_add(vertices=4, radius=0.025, depth=math.hypot(xb - xa, z1 - z0), location=((xa + xb) / 2, -1.4 + k * 0.1, (z0 + z1) / 2),
                                                    rotation=(0, math.pi / 2 - math.atan2(z1 - z0, xb - xa), 0))
                o = bpy.context.active_object; o.data.materials.append(ink); relink(o, col)
    return col

o = args()
bpy.ops.wm.read_factory_settings(use_empty=True)
row('backdrop_skyline_a', 7, 7.0, 15.0)
row('backdrop_skyline_b', 19, 9.0, 18.0, tall=(4.0, 27.0))
roofline('backdrop_roofline', 31)
bpy.ops.wm.save_as_mainfile(filepath=o['blend'])
print('backdrop_blend: wrote', o['blend'])
