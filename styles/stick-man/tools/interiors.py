# Four stick-man sets modelled in Blender (GLB.md "New sets from scratch"): diner, workshop, classroom, harbour.
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

# ================================================================ 1. diner (interior)
def diner():
    s = 'diner_room'
    room_shell('diner_room', BLACK, WHITE, CREAM, MINT, tile=0.6)
    s = 'diner_cupshelf'
    # back bar wall: shelves of cups and pies, a pass-through window to the kitchen, a menu board, a neon DINER sign
    for z in (1.55, 2.05):
        box(s, (-4.2, 3.0, z), (-0.6, 3.2, z + 0.04), WOODD)
        for i in range(9): cyl(s, (-4.0 + i * 0.4, 3.08, z + 0.1), 0.06, 0.13, (WHITE, RED, MINT)[i % 3], seg=8)
    s = 'diner_hatch'
    box(s, (0.2, 3.15, 1.3), (2.6, 3.21, 2.4), GREYD); box(s, (0.2, 3.1, 1.25), (2.6, 3.2, 1.32), STEEL)
    box(s, (0.4, 3.1, 1.32), (2.4, 3.12, 2.3), (0.98, 0.80, 0.50), emit=True)
    for x in (0.9, 1.6): cyl(s, (x, 3.05, 1.45), 0.12, 0.08, STEEL, seg=10)
    s = 'diner_menu'
    box(s, (2.9, 3.1, 1.4), (4.3, 3.2, 2.6), BLACK); text(s, 'MENU', (3.6, 3.08, 2.4), 0.22, WHITE)
    for i, t in enumerate(['PIE  3', 'SHAKE 4', 'FRIES 2', 'BURGER 6']): text(s, t, (3.6, 3.08, 2.15 - i * 0.2), 0.12, YELLOW)
    s = 'diner_neon'
    box(s, (-2.6, 3.12, 2.55), (-0.8, 3.2, 3.15), GREYD); text(s, 'DINER', (-1.7, 3.1, 2.85), 0.42, (1.0, 0.25, 0.35), emit=True)
    # left wall: three windows with blinds and sky; pendant lamps; ceiling fans; a red stripe round the room
    s = 'diner_windows'
    for y in (-4.6, -2.2, 0.2):
        box(s, (-4.62, y, 1.2), (-4.58, y + 1.6, 2.6), SKY)
        for z in (1.4, 1.7, 2.0, 2.3): box(s, (-4.56, y, z), (-4.52, y + 1.6, z + 0.06), WHITE)
        for yy in (y, y + 1.6): box(s, (-4.6, yy - 0.05, 1.15), (-4.5, yy + 0.05, 2.65), RED)
    s = 'diner_room'
    for x in (-4.6, 4.4): box(s, (x, -7.0, 1.14), (x + 0.2, 3.2, 1.24), RED)
    box(s, (-4.6, 2.98, 1.14), (4.6, 3.02, 1.24), RED)
    s = 'diner_lamps'
    for x in (-2.8, -0.6, 1.6, 3.6):
        cyl(s, (x, 1.6, 3.1), 0.01, 0.9, GREYD, seg=4); cyl(s, (x, 1.6, 2.6), 0.28, 0.25, RED, r2=0.06, seg=12); sph(s, (x, 1.6, 2.5), 0.1, (1.0, 0.92, 0.7), emit=True)
    s = 'diner_fans'
    for x in (-1.6, 2.2):
        cyl(s, (x, -2.0, 3.3), 0.12, 0.25, GREYD, seg=8)
        box(s, (x - 0.08, -2.7, 3.18), (x + 0.08, -1.3, 3.2), WOODL); box(s, (x - 0.7, -2.08, 3.18), (x + 0.7, -1.92, 3.2), WOODL)
    # right wall: a framed photo row and a clock
    s = 'diner_photos'
    for i, y in enumerate((-4.0, -2.5, -1.0)): box(s, (4.55, y, 1.8), (4.6, y + 0.9, 2.5), (WOODD)); box(s, (4.54, y + 0.08, 1.88), (4.55, y + 0.82, 2.42), (PINK, SKY, YELLOW)[i])
    s = 'diner_clock'
    cyl(s, (4.55, 1.2, 2.6), 0.3, 0.05, WHITE, axis='x', seg=16)
    # the counter (solid) along the back with a coffee machine, a pie stand, a till, napkins, ketchup
    c = 'diner_counter'
    box(c, (-4.4, 1.9, 0), (2.8, 2.5, 1.0), RED); box(c, (-4.5, 1.8, 1.0), (2.9, 2.55, 1.08), WHITE); box(c, (-4.4, 1.86, 0.0), (2.8, 1.9, 0.12), STEEL)
    for x in range(-4, 3): box(c, (x + 0.1, 1.88, 0.2), (x + 0.9, 1.9, 0.85), (0.70, 0.08, 0.06))
    box(c, (1.8, 2.1, 1.08), (2.4, 2.5, 1.7), STEEL); box(c, (1.9, 2.08, 1.3), (2.3, 2.1, 1.5), BLACK); cyl(c, (2.1, 2.1, 1.18), 0.06, 0.1, WHITE, seg=8)
    cyl(c, (-1.0, 2.2, 1.12), 0.25, 0.06, STEEL, seg=14); sph(c, (-1.0, 2.2, 1.2), 0.22, (0.95, 0.75, 0.40), sz=0.4); sph(c, (-1.0, 2.2, 1.18), 0.27, GLASS, sz=0.9)
    box(c, (-3.4, 2.1, 1.08), (-2.9, 2.5, 1.35), GREYD); box(c, (-3.35, 2.08, 1.2), (-2.95, 2.1, 1.3), (0.4, 1.0, 0.5), emit=True)
    for x, col_ in ((-2.2, RED), (-2.05, YELLOW), (0.2, RED), (0.35, YELLOW)): cyl(c, (x, 2.0, 1.16), 0.04, 0.16, col_, seg=8)
    box(c, (0.6, 2.0, 1.08), (0.8, 2.15, 1.22), STEEL)
    # one stool (placed in a row by the set)
    st = 'diner_stool'
    cyl(st, (0, 0, 0.36), 0.04, 0.72, STEEL, seg=8); cyl(st, (0, 0, 0.75), 0.22, 0.1, RED, seg=14); cyl(st, (0, 0, 0.03), 0.22, 0.06, STEEL, seg=12)
    # a booth: two red benches with high backs and a table between, a sugar pot and a menu card
    b = 'diner_booth'
    for s_ in (-1, 1):
        y0 = s_ * 0.75
        box(b, (-0.6, y0 - 0.25, 0), (0.6, y0 + 0.25, 0.45), RED); box(b, (-0.6, y0 + s_ * 0.18 - 0.07, 0.45), (0.6, y0 + s_ * 0.18 + 0.07, 1.25), RED)
        box(b, (-0.62, y0 + s_ * 0.18 - 0.08, 1.22), (0.62, y0 + s_ * 0.18 + 0.08, 1.28), WHITE)
    cyl(b, (0, 0, 0.36), 0.05, 0.72, STEEL, seg=8); box(b, (-0.55, -0.35, 0.72), (0.55, 0.35, 0.77), WHITE); box(b, (-0.56, -0.36, 0.74), (0.56, 0.36, 0.75), RED)
    cyl(b, (0.2, 0.1, 0.83), 0.05, 0.12, GLASS, seg=8); box(b, (-0.3, -0.05, 0.77), (-0.1, 0.0, 0.95), YELLOW)
    # a jukebox
    j = 'diner_jukebox'
    box(j, (-0.45, -0.3, 0), (0.45, 0.3, 1.2), WOODD); cyl(j, (0, 0, 1.2), 0.45, 0.6, (0.95, 0.55, 0.15), axis='y', seg=16)
    box(j, (-0.35, -0.32, 0.55), (0.35, -0.3, 1.15), (1.0, 0.85, 0.4), emit=True); box(j, (-0.3, -0.33, 0.2), (0.3, -0.31, 0.45), GREYD)
    for x in (-0.38, 0.38): box(j, (x - 0.04, -0.33, 0.1), (x + 0.04, -0.31, 1.4), (0.9, 0.2, 0.6), emit=True)

# ================================================================ 2. workshop / garage (interior)
def workshop():
    s = 'workshop_room'
    room_shell('workshop_room', CONC, (0.48, 0.48, 0.46), (0.62, 0.66, 0.70), (0.36, 0.40, 0.46), X=5.0, tile=1.0, ceiling=(0.40, 0.42, 0.45))
    for x in (-4.0, -2.5, -1.0, 2.0): box(s, (x, -7, 0.001), (x + 0.12, 3.2, 0.006), YELLOW)
    s = 'workshop_door'
    # back wall: a big roller door (slats), a pegboard of tools, a fuse box, pipes, a window row high up, a sign
    for z in range(10): box(s, (-0.8, 3.1, 0.05 + z * 0.3), (2.8, 3.18, 0.3 + z * 0.3), (0.70, 0.72, 0.74) if z % 2 else (0.62, 0.64, 0.66))
    box(s, (-0.95, 3.05, 0), (-0.8, 3.2, 3.15), YELLOW); box(s, (2.8, 3.05, 0), (2.95, 3.2, 3.15), YELLOW)
    s = 'workshop_pegboard'
    box(s, (-4.6, 3.12, 1.2), (-1.6, 3.2, 2.4), (0.78, 0.62, 0.42))
    for i in range(12):
        x = -4.4 + i * 0.24; box(s, (x - 0.015, 3.08, 1.5), (x + 0.015, 3.12, 2.2), GREYD); box(s, (x - 0.05, 3.06, 2.1), (x + 0.05, 3.1, 2.25), (RED, YELLOW, BLUE)[i % 3])
    s = 'workshop_fusebox'
    box(s, (3.4, 3.1, 1.4), (4.2, 3.2, 2.4), GREY); box(s, (3.5, 3.08, 1.5), (4.1, 3.1, 2.3), GREYD)
    s = 'workshop_pipes'
    for x in (-4.8, 4.8): cyl(s, (x, 3.05, 1.8), 0.06, 3.6, STEEL, seg=8)
    box(s, (-4.8, 3.05, 3.0), (4.8, 3.12, 3.1), STEEL)
    s = 'workshop_windows'
    for x in (-4.0, -1.8, 3.2, 4.4): box(s, (x, 3.1, 2.6), (x + 0.9, 3.15, 3.0), SKY)
    s = 'workshop_sign'
    box(s, (0.0, 3.1, 3.18), (2.0, 3.16, 3.5), RED); text(s, 'GARAGE', (1.0, 3.09, 3.34), 0.22, WHITE)
    # strip lights and a hanging sign
    s = 'workshop_lights'
    for x in (-2.5, 2.5):
        for y in (-3.0, 0.8): box(s, (x - 0.8, y - 0.12, 3.0), (x + 0.8, y + 0.12, 3.08), STEEL); box(s, (x - 0.75, y - 0.08, 2.99), (x + 0.75, y + 0.08, 3.0), (1.0, 0.98, 0.9), emit=True)
    # a car on blocks with its bonnet up (solid)
    c = 'workshop_car'
    box(c, (-2.0, -0.85, 0.35), (2.0, 0.85, 0.95), BLUE); box(c, (-1.1, -0.8, 0.95), (0.8, 0.8, 1.45), BLUE); box(c, (-1.0, -0.82, 1.0), (0.7, 0.82, 1.38), GLASS)
    for x in (-1.3, 1.3):
        for y in (-0.85, 0.85): cyl(c, (x, y, 0.32), 0.32, 0.22, BLACK, axis='y', seg=14); cyl(c, (x, y * 1.02, 0.32), 0.15, 0.22, STEEL, axis='y', seg=10)
    box(c, (1.0, -0.8, 1.6), (1.15, 0.8, 2.3), BLUE); box(c, (1.2, -0.7, 0.95), (1.9, 0.7, 1.05), GREYD); cyl(c, (1.5, 0, 1.15), 0.18, 0.3, STEEL, seg=10)
    box(c, (1.95, -0.7, 0.4), (2.05, 0.7, 0.75), STEEL); [box(c, (2.02, y - 0.18, 0.6), (2.06, y + 0.18, 0.75), (1.0, 0.95, 0.7), emit=True) for y in (-0.5, 0.5)]
    for x in (-1.3, 1.3): box(c, (x - 0.3, -0.3, 0), (x + 0.3, 0.3, 0.12), RED)
    # a workbench with a vice, a drill, a lamp, cans and rags (solid)
    w = 'workshop_bench'
    box(w, (-1.2, -0.4, 0.85), (1.2, 0.4, 0.95), WOODL)
    for x in (-1.1, 1.1):
        for y in (-0.33, 0.33): box(w, (x - 0.04, y - 0.04, 0), (x + 0.04, y + 0.04, 0.85), GREYD)
    box(w, (-1.1, -0.35, 0.25), (1.1, 0.35, 0.3), WOODD)
    box(w, (-1.0, -0.15, 0.95), (-0.7, 0.15, 1.15), GREYD); box(w, (-1.05, -0.3, 1.05), (-0.65, -0.15, 1.1), STEEL)
    box(w, (0.1, -0.1, 0.95), (0.4, 0.05, 1.15), YELLOW); box(w, (0.3, -0.03, 1.1), (0.55, 0.02, 1.14), GREY)
    cyl(w, (0.9, 0.2, 1.2), 0.02, 0.5, GREYD, seg=6); cyl(w, (0.85, 0.05, 1.45), 0.1, 0.15, GREEN, r2=0.05, seg=10)
    for i, col_ in enumerate((RED, BLUE, ORANGE)): cyl(w, (-0.3 + i * 0.13, 0.25, 1.03), 0.05, 0.16, col_, seg=8)
    box(w, (-0.5, -0.3, 0.95), (-0.2, -0.1, 0.97), (0.9, 0.3, 0.3))
    for i in range(3): box(w, (-0.9 + i * 0.6, -0.36, 0.05), (-0.4 + i * 0.6, 0.3, 0.25), (RED, GREYD, BLUE)[i])
    # a red tool chest
    t = 'workshop_chest'
    box(t, (-0.45, -0.3, 0.08), (0.45, 0.3, 1.1), RED)
    for z in (0.3, 0.55, 0.8, 1.0): box(t, (-0.4, -0.32, z - 0.08), (0.4, -0.3, z + 0.06), (0.70, 0.08, 0.06)); box(t, (-0.15, -0.34, z), (0.15, -0.32, z + 0.02), STEEL)
    for x in (-0.35, 0.35): cyl(t, (x, -0.2, 0.05), 0.05, 0.08, BLACK, axis='y', seg=8)
    # oil drums, a tyre stack, a gas bottle pair (one piece: the corner)
    d = 'workshop_drums'
    for i, (x, y, col_) in enumerate(((0, 0, ORANGE), (0.65, 0.1, BLUE), (0.3, 0.6, GREEN))):
        cyl(d, (x, y, 0.45), 0.3, 0.9, col_, seg=16)
        for z in (0.15, 0.45, 0.75): cyl(d, (x, y, z), 0.31, 0.04, GREYD, seg=16)
    for i in range(4): cyl(d, (-0.9, 0.2, 0.12 + i * 0.22), 0.33, 0.22, BLACK, seg=16); cyl(d, (-0.9, 0.2, 0.12 + i * 0.22), 0.16, 0.23, GREY, seg=10)
    for x in (1.3, 1.6): cyl(d, (x, 0.5, 0.6), 0.12, 1.2, (0.2, 0.6, 0.3) if x < 1.4 else RED, seg=10); sph(d, (x, 0.5, 1.22), 0.12, GREYD)

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

# ================================================================ 4. harbour (exterior)
def harbour():
    s = 'harbour_deck'
    # the pier deck (planks) from x -12..12, y -5..4, a warehouse wall behind with two big doors, a sign, pipes, lamps
    for i in range(22): box(s, (-12, -5.0 + i * 0.42, -0.1), (12, -5.0 + i * 0.42 + 0.4, 0.0), WOODL if i % 2 else (0.68, 0.46, 0.25))
    box(s, (-12, -5.2, -0.6), (12, -5.0, 0.0), WOODD)
    for x in range(-12, 13, 2): cyl(s, (x, -5.1, -1.0), 0.15, 2.0, WOODD, seg=8)
    s = 'harbour_warehouse'
    box(s, (-12, 4.0, 0), (12, 4.4, 5.0), (0.70, 0.30, 0.20)); box(s, (-12.2, 3.9, 5.0), (12.2, 4.5, 5.4), GREYD)
    for z in range(1, 10): box(s, (-12, 3.97, z * 0.5 - 0.02), (12, 4.0, z * 0.5 + 0.02), (0.55, 0.22, 0.14))
    s = 'harbour_doors'
    for x0 in (-7.5, 2.5):
        box(s, (x0, 3.9, 0), (x0 + 3.5, 4.0, 3.6), (0.20, 0.42, 0.40))
        for i in range(7): box(s, (x0 + 0.25 + i * 0.5, 3.88, 0.1), (x0 + 0.3 + i * 0.5, 3.9, 3.5), (0.14, 0.32, 0.30))
        box(s, (x0 - 0.15, 3.86, 0), (x0, 4.0, 3.75), WHITE); box(s, (x0 + 3.5, 3.86, 0), (x0 + 3.65, 4.0, 3.75), WHITE); box(s, (x0 - 0.15, 3.86, 3.6), (x0 + 3.65, 4.0, 3.75), WHITE)
    s = 'harbour_sign'
    box(s, (-2.6, 3.85, 3.9), (1.6, 3.95, 4.7), WHITE); text(s, 'PIER 9', (-0.5, 3.84, 4.3), 0.55, (0.10, 0.20, 0.45))
    s = 'harbour_windows'
    for x in (-10.5, -2.8, 6.8, 10.5): box(s, (x, 3.8, 2.6), (x + 1.0, 3.9, 3.4), SKY)
    s = 'harbour_lamps'
    for x in (-9.0, 0.8, 10.0):
        box(s, (x - 0.05, 3.7, 4.2), (x + 0.05, 4.0, 4.3), GREYD); cyl(s, (x, 3.6, 4.1), 0.15, 0.2, GREYD, r2=0.05, seg=8); sph(s, (x, 3.6, 4.0), 0.07, (1, 0.9, 0.6), emit=True)
    # a moored fishing boat (cabin, mast, a lifebuoy, nets)
    b = 'harbour_boat'
    box(b, (-3.0, -1.0, -0.6), (3.0, 1.0, 0.6), (0.85, 0.20, 0.15)); box(b, (-3.0, -1.02, 0.4), (3.0, 1.02, 0.6), WHITE)
    box(b, (-1.6, -0.7, 0.6), (0.4, 0.7, 1.9), WHITE); box(b, (-1.5, -0.72, 1.3), (0.3, 0.72, 1.7), GLASS); box(b, (-1.7, -0.8, 1.9), (0.5, 0.8, 2.0), (0.10, 0.20, 0.45))
    cyl(b, (1.6, 0, 2.2), 0.06, 3.2, WOODD, seg=8); cyl(b, (1.6, 0, 3.2), 0.03, 2.4, WOODD, axis='x', seg=6)
    cyl(b, (0.9, -1.04, 0.9), 0.3, 0.08, (1, 0.3, 0.2), axis='y', seg=16)
    box(b, (2.0, -0.6, 0.6), (2.8, 0.6, 0.9), (0.35, 0.45, 0.40)); text(b, 'MARY ANN', (-2.0, -1.03, 0.0), 0.28, WHITE)
    # a dock crane (tall, steel lattice)
    c = 'harbour_crane'
    box(c, (-0.6, -0.6, 0), (0.6, 0.6, 0.4), YELLOW)
    for dx in (-0.4, 0.4):
        for dy in (-0.4, 0.4): box(c, (dx - 0.06, dy - 0.06, 0.4), (dx + 0.06, dy + 0.06, 7.0), YELLOW)
    for z in range(1, 14): box(c, (-0.45, -0.45, z * 0.5), (0.45, 0.45, z * 0.5 + 0.05), YELLOW)
    box(c, (-0.6, -0.6, 7.0), (0.6, 0.6, 7.8), YELLOW); box(c, (-0.5, -0.65, 7.1), (0.5, -0.6, 7.6), GLASS)
    box(c, (-1.5, -0.15, 7.8), (5.5, 0.15, 8.1), YELLOW); box(c, (-1.6, -0.4, 7.4), (-0.8, 0.4, 7.9), GREYD)
    cyl(c, (4.5, 0, 5.6), 0.015, 4.4, GREYD, seg=4); box(c, (4.2, -0.3, 3.0), (4.8, 0.3, 3.4), (0.20, 0.42, 0.80))
    # a fish stall with a striped awning, ice trays, a scale and a price board
    f = 'harbour_stall'
    box(f, (-1.0, -0.45, 0), (1.0, 0.45, 0.9), WOODL); box(f, (-0.95, -0.5, 0.9), (0.95, 0.4, 0.95), WHITE)
    for i in range(7): sph(f, (-0.75 + i * 0.25, -0.15, 1.0), 0.12, (0.55, 0.65, 0.75), sz=0.35)
    for x in (-0.95, 0.95): box(f, (x - 0.04, 0.3, 0), (x + 0.04, 0.38, 2.2), WOODD)
    for i in range(8): box(f, (-1.1 + i * 0.275, -0.6, 2.15), (-1.1 + (i + 1) * 0.275, 0.45, 2.25), (0.15, 0.35, 0.80) if i % 2 else WHITE)
    box(f, (0.5, -0.2, 0.95), (0.8, 0.1, 1.2), STEEL); box(f, (-0.6, 0.36, 1.3), (0.4, 0.4, 1.9), BLACK); text(f, 'FISH 5', (-0.1, 0.35, 1.6), 0.18, WHITE)
    # stacked crates and barrels with a rope coil and a lifebuoy stand
    k = 'harbour_cargo'
    for (x, y, z, sz, col_) in ((0, 0, 0, 0.8, WOODL), (0.85, 0, 0, 0.8, WOODL), (0.4, 0, 0.8, 0.8, (0.62, 0.42, 0.22)), (-0.9, 0.2, 0, 0.6, (0.20, 0.42, 0.40))):
        box(k, (x - sz / 2, y - sz / 2, z), (x + sz / 2, y + sz / 2, z + sz), col_)
        for zz in (z + 0.05, z + sz - 0.05): box(k, (x - sz / 2 - 0.01, y - sz / 2 - 0.01, zz - 0.04), (x + sz / 2 + 0.01, y - sz / 2 + 0.01, zz + 0.04), WOODD)
    for (x, y, col_) in ((1.8, 0.1, BLUE), (2.4, 0.3, RED)): cyl(k, (x, y, 0.45), 0.3, 0.9, col_, seg=14)
    for i in range(3): cyl(k, (-1.6, -0.4, 0.04 + i * 0.06), 0.3 - i * 0.04, 0.05, (0.80, 0.70, 0.45), seg=14)
    box(k, (2.95, 0.2, 0), (3.05, 0.3, 1.6), WOODD); cyl(k, (3.0, 0.18, 1.3), 0.3, 0.1, (1, 0.25, 0.2), axis='y', seg=16)

diner(); workshop(); classroom(); harbour()
print('INTERIORS', ','.join(sorted(k for k in COL)))
