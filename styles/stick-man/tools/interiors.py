# The classroom stick-man set modelled in Blender (GLB.md "New sets from scratch").
# Headless, from a factory scene (no source .blend is touched). Each piece is a collection KIT_<set>_<piece>; the stock
# exporter then writes one .glb per piece:
#   Blender -b --factory-startup --python styles/stick-man/tools/interiors.py --python styles/stick-man/tools/export_glb.py \
#     -- --out styles/stick-man/assets/interiors --pieces <list printed by this script, or PIECES below>
# Blender metres: x right, y into the room (camera on y < 0), z up; a room's back wall is its far side. Low poly, flat toon
# colours (no textures): tiles, planks and bricks are real geometry strips so the ink line finds them. Our own designs.
import bpy, math

for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
MATS = {}
def mat(rgb, emit=False):
    key = (tuple(round(v, 3) for v in rgb), emit)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(f"{'e' if emit else 'm'}_{len(MATS)}"); m.use_nodes = True
    nt = m.node_tree
    if emit:
        for n in list(nt.nodes): nt.nodes.remove(n)
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*rgb, 1); e.inputs['Strength'].default_value = 2.0
        o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
    else:
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = 0.7
    MATS[key] = m; return m

COL = {}
def col(name):
    if name not in COL:
        c = bpy.data.collections.new('KIT_' + name); bpy.context.scene.collection.children.link(c); COL[name] = c
    return COL[name]
def link(o, c): col(c).objects.link(o); return o
def box(c, lo, hi, rgb, emit=False):
    me = bpy.data.meshes.new('b'); sx, sy, sz = [abs(hi[i] - lo[i]) / 2 for i in range(3)]; cx, cy, cz = [(hi[i] + lo[i]) / 2 for i in range(3)]
    v = [(cx + x * sx, cy + y * sy, cz + z * sz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me.from_pydata(v, [], f); me.materials.append(mat(rgb, emit)); return link(bpy.data.objects.new('b', me), c)
def cyl(c, at, r, h, rgb, axis='z', seg=12, r2=None, emit=False):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, location=at)
    o = bpy.context.active_object
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    if axis == 'y': o.rotation_euler = (math.pi / 2, 0, 0)
    o.data.materials.append(mat(rgb, emit))
    for cc in o.users_collection: cc.objects.unlink(o)
    return link(o, c)
def sph(c, at, r, rgb, sz=1.0, seg=10, emit=False):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(4, seg // 2), radius=r, location=at)
    o = bpy.context.active_object; o.scale = (1, 1, sz); o.data.materials.append(mat(rgb, emit))
    for cc in o.users_collection: cc.objects.unlink(o)
    return link(o, c)
def text(c, body, at, size, rgb, face='-y', emit=False, extrude=0.01):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = body; cu.size = size; cu.extrude = extrude; cu.resolution_u = 2
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = bpy.data.objects.new('t', cu); o.location = at
    if face == '-y': o.rotation_euler = (math.pi / 2, 0, 0)
    if face == '+x': o.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    cu.materials.append(mat(rgb, emit)); return link(o, c)

# palette (linear)
WHITE, CREAM, BLACK, RED, MINT, TEAL, YELLOW = (0.92, 0.91, 0.88), (0.93, 0.84, 0.64), (0.04, 0.04, 0.05), (0.80, 0.10, 0.08), (0.45, 0.80, 0.66), (0.10, 0.48, 0.50), (1.0, 0.75, 0.12)
STEEL, GREY, GREYD, WOOD, WOODL, WOODD, BLUE, ORANGE = (0.60, 0.64, 0.68), (0.45, 0.46, 0.48), (0.20, 0.21, 0.24), (0.50, 0.27, 0.10), (0.75, 0.52, 0.28), (0.28, 0.14, 0.05), (0.16, 0.36, 0.80), (1.0, 0.42, 0.08)
PINK, GLASS, GREEN, LEAF, SKY, CONC = (0.95, 0.50, 0.66), (0.55, 0.78, 0.92), (0.12, 0.32, 0.20), (0.22, 0.55, 0.20), (0.50, 0.74, 0.95), (0.52, 0.52, 0.50)

def room_shell(c, floor_a, floor_b, wall, wall_lo, X=4.6, Y0=-7.0, Y1=3.2, H=3.6, tile=0.8, ceiling=(0.86, 0.85, 0.82)):
    # floor tiles (checker), a back wall (lower band + upper), side walls, a ceiling with beams
    nx, ny = int(2 * X / tile), int((Y1 - Y0) / tile)
    for i in range(nx):
        for j in range(ny):
            x0, y0 = -X + i * tile, Y0 + j * tile
            box(c, (x0, y0, -0.02), (x0 + tile, y0 + tile, 0.0), floor_a if (i + j) % 2 else floor_b)
    box(c, (-X, Y1, 0), (X, Y1 + 0.2, 1.1), wall_lo); box(c, (-X, Y1, 1.1), (X, Y1 + 0.2, H), wall)
    box(c, (-X, Y1 - 0.04, 1.08), (X, Y1, 1.16), WOODD)
    for s in (-1, 1):
        x0, x1 = (s * X, s * (X + 0.2)) if s > 0 else (s * (X + 0.2), s * X)
        box(c, (x0, Y0, 0), (x1, Y1 + 0.2, 1.1), wall_lo); box(c, (x0, Y0, 1.1), (x1, Y1 + 0.2, H), wall)
    box(c, (-X - 0.2, Y0, H), (X + 0.2, Y1 + 0.2, H + 0.15), ceiling)
    for y in (Y0 + 2.0, (Y0 + Y1) / 2 + 0.6, Y1 - 0.6): box(c.replace('_room', '_beams'), (-X, y - 0.12, H - 0.25), (X, y + 0.12, H), WOODD)

# ================================================================ 3. classroom (interior)
def classroom():
    s = 'classroom_room'
    # plank floor
    for i in range(23): box(s, (-4.6, -7.0 + i * 0.44, -0.02), (4.6, -7.0 + i * 0.44 + 0.43, 0.0), WOODL if i % 2 else (0.70, 0.47, 0.24))
    box(s, (-4.6, 3.2, 0), (4.6, 3.4, 1.0), (0.55, 0.72, 0.86)); box(s, (-4.6, 3.2, 1.0), (4.6, 3.4, 3.6), (0.96, 0.90, 0.72))
    box(s, (-4.6, 3.16, 0.96), (4.6, 3.2, 1.04), WOODD)
    for sx in (-1, 1):
        x0, x1 = (4.6, 4.8) if sx > 0 else (-4.8, -4.6)
        box(s, (x0, -7.0, 0), (x1, 3.4, 1.0), (0.55, 0.72, 0.86)); box(s, (x0, -7.0, 1.0), (x1, 3.4, 3.6), (0.96, 0.90, 0.72))
    box(s, (-4.8, -7.0, 3.6), (4.8, 3.4, 3.75), (0.94, 0.94, 0.92))
    s = 'classroom_lights'
    for x in (-2.4, 0.0, 2.4):
        for y in (-3.0, 0.6): box(s, (x - 0.7, y - 0.15, 3.48), (x + 0.7, y + 0.15, 3.6), STEEL); box(s, (x - 0.65, y - 0.11, 3.47), (x + 0.65, y + 0.11, 3.48), (1.0, 0.98, 0.9), emit=True)
    # blackboard with chalk work, chalk tray, an alphabet strip, a clock, a flag, the class number
    s = 'classroom_board'
    box(s, (-2.2, 3.1, 1.1), (2.2, 3.2, 2.6), WOODD); box(s, (-2.1, 3.08, 1.2), (2.1, 3.1, 2.5), (0.10, 0.28, 0.18))
    box(s, (-2.1, 2.98, 1.14), (2.1, 3.1, 1.2), WOODD)
    for i in range(4): box(s, (-1.8 + i * 0.2, 3.0, 1.2), (-1.7 + i * 0.2, 3.04, 1.23), WHITE)
    text(s, '2+2=4', (-1.75, 3.07, 2.38), 0.09, WHITE, extrude=0.002); text(s, 'abc', (1.8, 3.07, 2.38), 0.09, WHITE, extrude=0.002)   # corners: the middle is for a reel's chalk
    s = 'classroom_alphabet'
    for i, ch in enumerate('ABCDEFGHIJKL'):
        x = -4.2 + i * 0.7; box(s, (x, 3.12, 2.8), (x + 0.5, 3.16, 3.2), (RED, YELLOW, BLUE, LEAF)[i % 4]); text(s, ch, (x + 0.25, 3.11, 3.0), 0.26, WHITE, extrude=0.004)
    s = 'classroom_clock'
    cyl(s, (3.2, 3.15, 2.5), 0.28, 0.05, WHITE, axis='y', seg=16); cyl(s, (3.2, 3.16, 2.5), 0.3, 0.04, BLACK, axis='y', seg=16)
    box(s, (3.18, 3.11, 2.5), (3.22, 3.13, 2.7), BLACK); box(s, (3.2, 3.11, 2.48), (3.35, 3.13, 2.52), BLACK)
    # left wall: three windows with sky and plants on the sill; right wall: a pinboard with drawings, cubbies with bags
    s = 'classroom_windows'
    for y in (-4.5, -2.0, 0.5):
        box(s, (-4.62, y, 1.2), (-4.58, y + 1.6, 2.7), SKY)
        for yy in (y, y + 0.8, y + 1.6): box(s, (-4.6, yy - 0.05, 1.15), (-4.5, yy + 0.05, 2.75), WHITE)
        for z in (1.15, 1.95, 2.75): box(s, (-4.6, y, z - 0.05), (-4.5, y + 1.6, z + 0.05), WHITE)
        box(s, (-4.6, y - 0.1, 1.1), (-4.35, y + 1.7, 1.18), WHITE); cyl(s, (-4.45, y + 0.8, 1.3), 0.1, 0.22, (0.78, 0.36, 0.20), r2=0.13, seg=10); sph(s, (-4.45, y + 0.8, 1.5), 0.15, LEAF)
    s = 'classroom_pinboard'
    box(s, (4.55, -4.0, 1.3), (4.6, -1.0, 2.6), (0.78, 0.60, 0.40))
    for i in range(6):
        y = -3.85 + (i % 3) * 0.95; z = 1.45 + (i // 3) * 0.6; box(s, (4.53, y, z), (4.55, y + 0.7, z + 0.45), (WHITE, (1.0, 0.95, 0.6), (0.85, 0.95, 1.0))[i % 3])
        sph(s, (4.52, y + 0.35, z + 0.25), 0.1, (RED, BLUE, YELLOW, LEAF, PINK, ORANGE)[i], sz=0.3)
    s = 'classroom_cubbies'
    for i in range(4):
        y = 0.0 + i * 0.6; box(s, (4.2, y, 0), (4.6, y + 0.55, 1.2), WOODL); box(s, (4.18, y + 0.05, 0.1), (4.2, y + 0.5, 1.1), WOODD)
        sph(s, (4.35, y + 0.27, 0.45), 0.2, (RED, BLUE, YELLOW, LEAF)[i], sz=1.2)
    # the teacher's desk with an apple, books, a mug and a desk lamp (solid)
    d = 'classroom_teacher'
    box(d, (-0.8, -0.4, 0.72), (0.8, 0.4, 0.78), WOOD); box(d, (-0.8, -0.38, 0), (-0.5, 0.38, 0.72), WOODD); box(d, (0.5, -0.38, 0), (0.8, 0.38, 0.72), WOODD)
    box(d, (-0.5, -0.38, 0.3), (0.5, -0.34, 0.72), WOODD)
    sph(d, (0.45, -0.1, 0.84), 0.06, RED); cyl(d, (0.45, -0.1, 0.92), 0.008, 0.04, WOODD, seg=4)
    for i, col_ in enumerate((BLUE, YELLOW, RED)): box(d, (-0.6, -0.1, 0.78 + i * 0.05), (-0.3, 0.12, 0.82 + i * 0.05), col_)
    cyl(d, (0.1, 0.15, 0.83), 0.05, 0.1, WHITE, seg=8); cyl(d, (0.6, 0.25, 0.95), 0.015, 0.35, GREYD, seg=6); cyl(d, (0.55, 0.2, 1.12), 0.1, 0.12, GREEN, r2=0.04, seg=10)
    # one pupil's desk with its chair, a book and a pencil (the set lays out rows)
    p = 'classroom_desk'
    box(p, (-0.4, -0.25, 0.66), (0.4, 0.25, 0.7), WOODL)
    for x in (-0.36, 0.36):
        for y in (-0.21, 0.21): box(p, (x - 0.02, y - 0.02, 0), (x + 0.02, y + 0.02, 0.66), STEEL)
    box(p, (-0.36, -0.2, 0.5), (0.36, 0.22, 0.53), STEEL)
    box(p, (-0.2, -0.12, 0.7), (0.05, 0.1, 0.72), WHITE); cyl(p, (0.2, -0.05, 0.71), 0.008, 0.16, YELLOW, axis='x', seg=6)
    box(p, (-0.2, -0.7, 0.4), (0.2, -0.32, 0.44), BLUE); box(p, (-0.2, -0.74, 0.44), (0.2, -0.7, 0.8), BLUE)
    for x in (-0.17, 0.17):
        for y in (-0.68, -0.35): box(p, (x - 0.015, y - 0.015, 0), (x + 0.015, y + 0.015, 0.4), STEEL)
    # a bookcase with a globe on top
    b = 'classroom_bookcase'
    box(b, (-0.8, 0, 0), (0.8, 0.35, 1.5), WOOD)
    for z in (0.05, 0.5, 0.95):
        box(b, (-0.75, -0.01, z), (0.75, 0.33, z + 0.03), WOODD)
        for i in range(10): box(b, (-0.7 + i * 0.14, 0.02, z + 0.03), (-0.6 + i * 0.14, 0.3, z + 0.3 + 0.08 * ((i * 7) % 3)), (RED, BLUE, YELLOW, LEAF, PINK)[i % 5])
    cyl(b, (0.4, 0.17, 1.55), 0.1, 0.06, WOODD, seg=8); sph(b, (0.4, 0.17, 1.8), 0.2, BLUE, seg=14); sph(b, (0.45, 0.1, 1.86), 0.1, LEAF, sz=0.6)

classroom()
print('INTERIORS', ','.join(sorted(k for k in COL)))
