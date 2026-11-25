# Downloaded CC0 props -> stick-man kit .glb (GLB.md conventions, same as export_glb.py). Runs inside Blender, headless:
#   nice -n 10 Blender -b --factory-startup --python styles/stick-man/tools/run/import_props.py -- [--places street,hospital] [--ids a,b]
#       [--list films/kit-props-list/manifest.json] [--src films/kit-props-src] [--out styles/stick-man/assets/props]
# Per prop (one item of the list, its files in <src>/<id>/): import glTF/GLB/FBX/OBJ, bake every mesh's world transform,
# merge into ONE triangulated mesh, turn it so its long side matches the list's w x d (vehicles: long side on x, as the
# backdrop pack), scale to the real size (Poly Haven is already metres; Poly Pizza sizes are estimates, SIZE below
# corrects the odd ones), pivot = bottom centre on the floor (z = 0). Colours: every face takes its material's colour
# (photo textures sampled at the face, times the factor and vertex colour), the colours are clustered into <= 8 flat
# materials, then clamped (max channel <= 0.90 sRGB, never pure black). A texture is kept only where the picture IS the
# prop (KEEP_TEX, <= 256 px JPEG). Decimated to the budget (small <= 2k tris, furniture <= 6k, vehicles/large <= 10k).
# Writes <out>/<place>/<slug>.glb, <out>/manifest.json (merged across calls) and <out>/LICENSES.md.
import bpy, bmesh, sys, os, json, re, math, time
import numpy as np
from mathutils import Matrix, Vector

# Poly Pizza sizes are estimates: these replace the list's size (w x d x h, m) where the estimate is off, with the reason
# (height in m, reason): scale so the model's height is this, instead of fitting its long side to the list's estimate
SIZE = {
    'wCUxgt2jSP': (0.8, 'it is a concrete jersey barrier (real ~0.8 m tall), not a 1 m crowd barrier'),
    'NBUxHir6FJ': (0.3, 'a scattered patch of single flowers, each ~0.3 m tall; fitting 0.4 m to the patch width left them 7 cm tall'),
    '41R2HTYj1O': (0.75, 'dining table height; the model is long and low, so the 1.2 m length fit left it 0.47 m tall'),
    'mBGTVozH1u': (3.0, 'a screen hung on a pole rig, not a set-top TV; 3 m rig keeps the screen ~0.9 m wide'),
    'u5PhZQ35XG': (1.7, 'chunky low-poly taxi: a 4.4 m length fit made it 2.0 m tall; 1.5 m car + roof sign'),
    'BG0KAhmGDt': (1.55, 'chunky low-poly hatchback: a 4.0 m length fit made it 1.8 m tall; real ~1.5 m'),
    'zpURbFzEbv': (0.9, 'counter height; the long low model fit to 1.0 m length was 0.48 m tall'),
    'ubNPKDn2yH': (0.12, 'a ROW of 12 small jars, each ~0.12 m; the 0.3 m fit made them 2 cm'),
    'q6i3XL52ge': (0.11, 'measuring jug ~0.11 m tall (it came in lying on its side, see UPRIGHT)'),
    '6u4c1kSsiP': (4.5, 'stage deck + truss rig: the 10 m fit left the truss 2.6 m high, figures would hit it'),
    'dGRAisemWy': (3.5, 'round stage with a backdrop truss: the 6 m fit left the truss 2.4 m high'),
    'OgrROxABGT': (3.0, 'chunky food truck: a 5 m length fit made it 4.6 m tall; real food truck ~3 m'),
}
UPRIGHT = {'q6i3XL52ge'}     # came in lying on its side: stand its longest axis up, closed end down
ROT = {}                    # id -> degrees about z, applied after import (when the auto turn is wrong)
KEEP_TEX = {'WetFloorSign_01', 'PeM20xAT0V'}     # the printed picture is the prop (a sign)
SLUG = {'vPFSLYh6sg': 'street-light-2'}
VEHICLE = re.compile(r'\b(taxi|car|truck|van|bus|hatchback)\b', re.I)
K = 8

def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = {'list': 'films/kit-props-list/manifest.json', 'src': 'films/kit-props-src', 'out': 'styles/stick-man/assets/props', 'places': '', 'ids': ''}
    for i in range(0, len(a) - 1, 2): o[a[i].lstrip('-')] = a[i + 1]
    return o

def s2l(c): c = np.clip(c, 0, 1); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def l2s(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)

def slugs(items):
    out, seen = {}, {}
    for it in items:
        s = SLUG.get(it['id']) or re.sub(r'-0\d$', '', re.sub(r'[^a-z0-9]+', '-', it['name'].lower()).strip('-'))
        n = seen.get(s, 0) + 1; seen[s] = n
        out[it['id']] = s if n == 1 else f'{s}-{n}'
    return out

def target(it):
    v = [float(x) for x in re.findall(r'\d+(?:\.\d+)?', it['size_m'])[:3]]
    return v, ('Poly Haven' if it['source'] == 'Poly Haven' else 'estimate (list)')

def budget(it, size):
    m = max(size)
    if (VEHICLE.search(it['name']) and 'hand' not in it['name'].lower()) or (m >= 4.0 and min(size) >= 1.0): return 5000, 'vehicle/large'
    if m <= 0.6: return 800, 'small'
    return 3000, 'furniture'

# real-world height ranges (m) by name: the sanity pass flags a prop outside its range (orchestrator 25/11)
REAL_H = [(r'\btable lamp\b', 0.3, 0.7), (r'\b(dining |kitchen )?table\b', 0.70, 0.80), (r'\bdesk\b(?! (chair|fan))', 0.70, 0.80),
    (r'\b(desk|office|lounge|rocking)?\s*chair\b|armchair|stool', 0.45, 1.20), (r'\bsofa\b', 0.65, 1.0), (r'\bbed\b', 0.4, 1.1),
    (r'\bbench\b', 0.40, 0.95), (r'fridge', 1.5, 2.0), (r'washing|stove|sink|counter', 0.85, 1.1), (r'street ?l(ight|amp)', 3.0, 6.0),
    (r'traffic light', 2.5, 5.0), (r'hand truck', 1.1, 1.5), (r'taxi|hatchback|\bcar\b', 1.35, 1.9), (r'truck', 2.4, 3.2),
    (r'bookcase|shelf tall|shelves', 1.6, 2.4), (r'scaffold', 2.0, 4.0), (r'mug|cup', 0.06, 0.13), (r'phone', 0.005, 0.2),
    (r'wheelchair', 0.85, 1.2), (r'coat rack', 1.6, 2.0), (r'trash|bin\b', 0.6, 1.3), (r'dumpster', 1.0, 1.7), (r'hydrant', 0.5, 1.0),
    (r'cone', 0.3, 0.9), (r'propane|gas', 0.4, 1.6), (r'plant', 0.2, 1.8)]
def real_h(name):
    for rx, lo, hi in REAL_H:
        if re.search(rx, name, re.I): return lo, hi
    return None

def clear():
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.cameras,
                 bpy.data.lights, bpy.data.curves, bpy.data.node_groups, bpy.data.actions, bpy.data.textures):
        bpy.data.batch_remove(list(coll))
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)

def model_file(d):
    names = sorted(os.listdir(d))
    for ext in ('.glb', '.gltf', '.fbx', '.obj'):
        for n in names:
            if n.lower().endswith(ext): return os.path.join(d, n)
    return None

def do_import(path):
    e = path.lower().rsplit('.', 1)[-1]
    if e in ('glb', 'gltf'): bpy.ops.import_scene.gltf(filepath=path)
    elif e == 'fbx': bpy.ops.import_scene.fbx(filepath=path)
    elif e == 'obj': bpy.ops.wm.obj_import(filepath=path)

_PX = {}
def pixels(img, px=256):
    """sRGB HxWx3 array (<= px) of an image, cached"""
    if img.name in _PX: return _PX[img.name]
    a = None
    try:
        w, h = img.size
        if w and h:
            c = img.copy()
            if max(w, h) > px: c.scale(max(1, round(w * px / max(w, h))), max(1, round(h * px / max(w, h))))
            W, H = c.size; p = np.empty(W * H * 4, dtype=np.float32); c.pixels.foreach_get(p)
            a = p.reshape(H, W, 4)[:, :, :3]
            if img.is_float or not img.colorspace_settings.name.lower().startswith('srgb'): a = l2s(a)
            bpy.data.images.remove(c)
    except Exception: a = None
    _PX[img.name] = a; return a

def upstream(sock, depth=5):
    """nodes feeding a socket (breadth first)"""
    out, todo = [], [(l.from_node, 1) for l in sock.links]
    while todo:
        n, d = todo.pop(0)
        if n in out: continue
        out.append(n)
        if d < depth: todo += [(l.from_node, d + 1) for i in n.inputs for l in i.links]
    return out

def describe(mat):
    """{'const': lin rgb, 'img': node image, 'fac': lin rgb, 'emis': bool} for a material"""
    r = {'const': np.array([0.6, 0.6, 0.6]), 'img': None, 'fac': np.ones(3), 'emis': False}
    if mat is None: return r
    if not (mat.use_nodes and mat.node_tree):
        r['const'] = np.array(mat.diffuse_color[:3]); return r
    b = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b is None:
        em = next((n for n in mat.node_tree.nodes if n.type == 'EMISSION'), None)
        if em: r['emis'] = True; r['const'] = np.array(em.inputs['Color'].default_value[:3])
        else: r['const'] = np.array(mat.diffuse_color[:3])
        return r
    bc = b.inputs['Base Color']
    if not bc.is_linked: r['const'] = np.array(bc.default_value[:3])
    else:
        for n in upstream(bc):
            if n.type == 'TEX_IMAGE' and n.image and r['img'] is None: r['img'] = n.image
            if n.type == 'MIX' and getattr(n, 'data_type', '') == 'RGBA':
                for i in n.inputs:
                    if i.type == 'RGBA' and not i.is_linked and i.enabled: r['fac'] = r['fac'] * np.array(i.default_value[:3])
            if n.type == 'RGB': r['fac'] = r['fac'] * np.array(n.outputs[0].default_value[:3])
        if r['img'] is None: r['const'] = r['fac'].copy(); r['fac'] = np.ones(3)
    es = b.inputs.get('Emission Strength'); ec = b.inputs.get('Emission Color')
    if es is not None and ec is not None and es.default_value > 0.05 and (ec.is_linked or max(ec.default_value[:3]) > 0.05): r['emis'] = True
    return r

def face_colours(me, descs):
    """per-face linear rgb (n x 3) from material colour, texture at the face's UV centre, and vertex colour"""
    n = len(me.polygons)
    mi = np.empty(n, dtype=np.int32); me.polygons.foreach_get('material_index', mi); mi = np.clip(mi, 0, max(0, len(descs) - 1))
    ls = np.empty(n, dtype=np.int32); me.polygons.foreach_get('loop_start', ls)
    lt = np.empty(n, dtype=np.int32); me.polygons.foreach_get('loop_total', lt)
    nl = len(me.loops); owner = np.repeat(np.arange(n), lt)
    col = np.zeros((n, 3))
    uv = None
    if me.uv_layers:
        u = np.empty(nl * 2, dtype=np.float32); me.uv_layers[0].data.foreach_get('uv', u); u = u.reshape(-1, 2)
        uv = np.zeros((n, 2)); np.add.at(uv, owner, u); uv /= lt[:, None]
    for k, d in enumerate(descs):
        sel = mi == k
        if not sel.any(): continue
        a = pixels(d['img']) if d['img'] is not None else None
        if a is not None and uv is not None:
            H, W = a.shape[:2]
            x = (np.mod(uv[sel, 0], 1) * W).astype(int).clip(0, W - 1); y = (np.mod(uv[sel, 1], 1) * H).astype(int).clip(0, H - 1)
            col[sel] = s2l(a[y, x]) * d['fac']
        else: col[sel] = d['const']
    ca = me.color_attributes[0] if len(me.color_attributes) else None
    if ca is not None and ca.domain in ('CORNER', 'POINT'):
        try:
            m = len(ca.data); v = np.empty(m * 4, dtype=np.float32); ca.data.foreach_get('color', v); v = v.reshape(-1, 4)[:, :3]
            if ca.domain == 'POINT':
                vi = np.empty(nl, dtype=np.int32); me.loops.foreach_get('vertex_index', vi); v = v[vi]
            fv = np.zeros((n, 3)); np.add.at(fv, owner, v); fv /= lt[:, None]
            col *= fv
        except Exception: pass
    return col, mi

def kmeans(x, w, k, seed=0):
    rng = np.random.default_rng(seed); c = [x[np.argmax(w)]]
    for _ in range(1, k):
        d = np.min(((x[:, None] - np.array(c)[None]) ** 2).sum(-1), 1) * w
        if d.sum() <= 0: break
        c.append(x[rng.choice(len(x), p=d / d.sum())])
    c = np.array(c)
    for _ in range(25):
        lab = np.argmin(((x[:, None] - c[None]) ** 2).sum(-1), 1)
        for j in range(len(c)):
            s = lab == j
            if s.any(): c[j] = (x[s] * w[s, None]).sum(0) / w[s].sum()
    return c, np.argmin(((x[:, None] - c[None]) ** 2).sum(-1), 1)

def clamp(srgb):
    c = np.array(srgb, dtype=float); m = c.max()
    if m > 0.90: c *= 0.90 / m
    if c.max() < 0.08: c = np.full(3, 0.08) if c.max() <= 1e-6 else c * (0.08 / c.max())
    return c

def palette(col, emis, area, k=K):
    """cluster face colours (sRGB) -> (centres sRGB, label per face); emissive faces cluster on their own"""
    lab = np.zeros(len(col), dtype=int); cents, flags = [], []
    for e in (False, True):
        s = emis == e
        if not s.any(): continue
        x = l2s(col[s]); q = np.round(x * 255) / 255
        u, inv = np.unique(q, axis=0, return_inverse=True); inv = inv.reshape(-1)
        kk = k if not e else 3
        if len(u) <= kk: c, l = u, inv
        else:
            wu = np.bincount(inv, weights=area[s] + 1e-9)
            c, lu = kmeans(u, wu, kk); l = lu[inv]
        lab[s] = l + len(cents); cents += [clamp(v) for v in c]; flags += [e] * len(c)
    return cents, flags, lab

def build(it, files):
    descs_all, meshes, kept = [], [], None
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    for inst in dg.object_instances:
        ob = inst.object
        if ob.type not in ('MESH', 'CURVE', 'FONT', 'SURFACE', 'META'): continue
        try: me = ob.to_mesh()
        except RuntimeError: continue
        if me is None or not len(me.polygons): ob.to_mesh_clear(); continue
        me = me.copy(); ob.to_mesh_clear()
        me.transform(Matrix(inst.matrix_world))
        if inst.matrix_world.determinant() < 0: me.flip_normals()
        mats = list(me.materials) or [None]
        descs = [describe(m) for m in mats]
        col, mi = face_colours(me, descs)
        emis = np.array([descs[i]['emis'] for i in mi], dtype=bool)
        area = np.empty(len(me.polygons), dtype=np.float32); me.polygons.foreach_get('area', area)
        tex = np.array([it['id'] in KEEP_TEX and descs[i]['img'] is not None for i in mi], dtype=bool)
        if tex.any() and kept is None: kept = next(d['img'] for d in descs if d['img'] is not None)
        meshes.append((me, col, emis, area.astype(float), tex))
    if not meshes: raise RuntimeError('no mesh in the file')
    col = np.concatenate([m[1] for m in meshes]); emis = np.concatenate([m[2] for m in meshes])
    area = np.concatenate([m[3] for m in meshes]); tex = np.concatenate([m[4] for m in meshes])
    lab = np.zeros(len(col), dtype=int); cents, flags = [], []
    if (~tex).any(): cents, flags, lab[~tex] = palette(col[~tex], emis[~tex], area[~tex])
    ti = len(cents)                                             # the kept-texture material comes last
    lab[tex] = ti
    bm = bmesh.new(); o = 0
    for me, c, *_ in meshes:
        n = len(me.polygons); me.polygons.foreach_set('material_index', lab[o:o + n].astype(np.int32)); o += n
        if not me.uv_layers: me.uv_layers.new(name='UVMap')
        for u in list(me.uv_layers)[1:]: me.uv_layers.remove(u)
        me.uv_layers[0].name = 'UVMap'
        bm.from_mesh(me); bpy.data.meshes.remove(me)
    out = bpy.data.meshes.new('prop'); bm.to_mesh(out); bm.free()
    for i, (c, e) in enumerate(zip(cents, flags)):
        lin = tuple(float(v) for v in s2l(c))
        m = bpy.data.materials.new(f'flat_{"e" if e else "s"}_{i}'); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (*lin, 1); b.inputs['Roughness'].default_value = 0.75; b.inputs['Metallic'].default_value = 0.0
        if e: b.inputs['Emission Color'].default_value = (*lin, 1); b.inputs['Emission Strength'].default_value = 1.0
        out.materials.append(m)
    if tex.any():
        img = kept.copy(); img.name = 'tex_' + it['id']; w, h = img.size
        if max(w, h) > 256: img.scale(max(1, round(w * 256 / max(w, h))), max(1, round(h * 256 / max(w, h))))
        p = np.empty(len(img.pixels), dtype=np.float32); img.pixels.foreach_get(p); p = p.reshape(-1, 4)
        mx = p[:, :3].max(1); f = np.where(mx > 0.90, 0.90 / np.maximum(mx, 1e-6), 1.0); p[:, :3] *= f[:, None]
        p[:, :3] = np.maximum(p[:, :3], 0.03); img.pixels.foreach_set(p.reshape(-1)); img.update()
        m = bpy.data.materials.new(f'tex_s_{ti}'); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Roughness'].default_value = 0.75
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color']); out.materials.append(m)
    return out, [list(np.round(c, 3)) for c in cents], bool(tex.any())

def bounds(me):
    v = np.empty(len(me.vertices) * 3, dtype=np.float64); me.vertices.foreach_get('co', v); v = v.reshape(-1, 3)
    return v.min(0), v.max(0)

def stand(me, ax):
    """rotation that turns horizontal axis ax (0 x, 1 y) up, with the end that has more cap area (the closed end) down"""
    v = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', v); v = v.reshape(-1, 3)
    lo, hi = v[:, ax].min(), v[:, ax].max(); band = (hi - lo) * 0.1; a = [0.0, 0.0]
    for p in me.polygons:
        c = p.center[ax]; n = p.normal[ax]
        if c < lo + band and n < -0.8: a[0] += p.area
        if c > hi - band and n > 0.8: a[1] += p.area
    down_is_max = a[1] > a[0]                                    # the closed end must end at -z
    if ax == 0: return Matrix.Rotation(math.radians(90 if down_is_max else -90), 4, 'Y')
    return Matrix.Rotation(math.radians(-90 if down_is_max else 90), 4, 'X')

def place(me, it, size, src):
    """turn, scale and put the pivot at the bottom centre; returns notes"""
    notes = []; lo, hi = bounds(me); d = hi - lo
    w, dd, h = size
    rot = ROT.get(it['id'])
    if rot is None:
        rot = 0
        if VEHICLE.search(it['name']):
            if d[1] > d[0] * 1.2: rot = 90; notes.append('turned 90: vehicle long side on x (backdrop pack)')
        elif (w > dd * 1.3 and d[1] > d[0] * 1.3) or (dd > w * 1.3 and d[0] > d[1] * 1.3):
            rot = 90; notes.append('turned 90 so the long side matches the list w x d')
    else: notes.append(f'turned {rot} (ROT)')
    if rot: me.transform(Matrix.Rotation(math.radians(rot), 4, 'Z')); lo, hi = bounds(me); d = hi - lo
    if it['id'] in UPRIGHT:
        ax = int(np.argmax(d[:2])); me.transform(stand(me, ax)); lo, hi = bounds(me); d = hi - lo
        notes.append(f'stood upright from lying along {"xy"[ax]} (UPRIGHT), closed end down')
    if it['id'] not in SIZE and h > max(w, dd) and d[2] < 0.5 * max(d[0], d[1]):          # upright check: a tall prop that came in lying down
        ax = 'Y' if d[0] >= d[1] else 'X'; me.transform(Matrix.Rotation(math.radians(90), 4, ax)); lo, hi = bounds(me); d = hi - lo
        notes.append(f'stood upright (was lying along {"x" if ax == "Y" else "y"}; list says it is tall)')
    tmax = max(size); mmax = max(d)
    s = tmax / mmax if mmax > 0 else 1.0
    if it['id'] in SIZE:
        hh, why = SIZE[it['id']]; s = hh / d[2]; h = hh; notes.append(f'size corrected to {hh} m tall: {why}')
    elif src == 'Poly Haven' and 0.8 <= s <= 1.25: s = 1.0
    elif src == 'Poly Haven': notes.append(f'Poly Haven model was {mmax:.2f} m on its long side, scaled x{s:.3f}')
    me.transform(Matrix.Scale(s, 4)); lo, hi = bounds(me)
    me.transform(Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))))
    lo, hi = bounds(me); d = hi - lo
    if h > 0.05 and not (0.6 <= d[2] / h <= 1.6): notes.append(f'CHECK height {d[2]:.2f} m vs list {h} m')
    r = real_h(it['name'])
    if r and not (r[0] <= d[2] <= r[1]): notes.append(f'CHECK real height {d[2]:.2f} m outside {r[0]}-{r[1]} m')
    return [round(float(x), 3) for x in d], notes, round(s, 5)

def decimate(me, limit):
    scn = bpy.context.scene; n0 = len(me.polygons)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-4); bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    tries = 0
    while len(me.polygons) > limit and tries < 6:
        tries += 1
        ob = bpy.data.objects.new('dec', me); scn.collection.objects.link(ob)
        mod = ob.modifiers.new('d', 'DECIMATE'); mod.ratio = min(1.0, limit / len(me.polygons) * 0.95)
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        nm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); scn.collection.objects.unlink(ob); bpy.data.objects.remove(ob)
        bm = bmesh.new(); bm.from_mesh(nm); bmesh.ops.triangulate(bm, faces=bm.faces); bm.to_mesh(nm); bm.free()
        old = me; me = nm
        if old.users == 0: bpy.data.meshes.remove(old)
    return me, n0

def finish(me, keep_uv):
    for a in [a.name for a in me.color_attributes]: me.color_attributes.remove(me.color_attributes[a])
    if not keep_uv:
        for u in list(me.uv_layers): me.uv_layers.remove(u)
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.set_sharp_from_angle(angle=math.radians(35))

def export(me, path):
    scn = bpy.context.scene
    for ob in list(scn.collection.all_objects): bpy.data.objects.remove(ob)
    ob = bpy.data.objects.new(os.path.splitext(os.path.basename(path))[0], me); scn.collection.objects.link(ob)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_active_scene=True, export_apply=True, export_yup=True,
        export_texcoords=True, export_normals=True, export_image_format='JPEG', export_jpeg_quality=82, export_materials='EXPORT',
        export_draco_mesh_compression_enable=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False)

def licenses(man, path):
    rows = sorted(man['props'].items(), key=lambda kv: (kv[1]['place'], kv[0]))
    L = ['# Third-party props (CC0)', '', 'Every model below is public domain (CC0 1.0). Downloaded from Poly Haven (polyhaven.com, all assets CC0)',
         'or Poly Pizza (poly.pizza, each model page states "Public Domain (CC0)"), then converted by',
         '`tools/run/import_props.py` (merged, rescaled, flat colours, decimated). Credit is not required; it is given here anyway.', '',
         '| File | Name | Source | Author | Licence |', '|---|---|---|---|---|']
    for s, p in rows: L.append(f"| `{p['file']}` | {p['name']} | {p['source_url']} | {p['author']} | {p['licence']} |")
    open(path, 'w').write('\n'.join(L) + '\n')

def main():
    o = args(); root = os.getcwd()
    lst = json.load(open(os.path.join(root, o['list']))); items = lst['items']; slug = slugs(items)
    places = [p for p in o['places'].split(',') if p]; ids = set(i for i in o['ids'].split(',') if i)
    pick = [it for it in items if (not ids or it['id'] in ids) and (not places or it['place'] in places)]
    if places and not ids: pick.sort(key=lambda it: places.index(it['place']))
    out = os.path.join(root, o['out']); os.makedirs(out, exist_ok=True); mp = os.path.join(out, 'manifest.json')
    man = json.load(open(mp)) if os.path.exists(mp) else {'props': {}, 'failed': {}}
    for it in pick:
        t0 = time.time(); s = slug[it['id']]; pl = it['place']
        try:
            clear(); _PX.clear()
            f = model_file(os.path.join(root, o['src'], it['id']))
            if not f: raise RuntimeError('no model file downloaded')
            do_import(f)
            me, pal, kept = build(it, f)
            size, why = target(it)
            dims, notes, scale = place(me, it, size, it['source'])
            limit, cat = budget(it, size)
            me, n0 = decimate(me, limit)
            finish(me, kept)
            lo, hi = bounds(me); me.transform(Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))))
            os.makedirs(os.path.join(out, pl), exist_ok=True); path = os.path.join(out, pl, s + '.glb')
            export(me, path)
            lo, hi = bounds(me)
            if n0 > limit: notes.append(f'decimated {n0} -> {len(me.polygons)} tris ({cat} budget {limit})')
            if kept: notes.append('kept its printed texture (256 px)')
            notes.insert(0, f'size {"x".join(str(v) for v in size)} m ({why}), scale x{scale}')
            man['props'][s] = {'id': it['id'], 'name': it['name'], 'place': pl, 'file': f'{pl}/{s}.glb', 'bytes': os.path.getsize(path),
                'tris': len(me.polygons), 'size': dims, 'lo': [round(float(x), 3) for x in lo], 'hi': [round(float(x), 3) for x in hi],
                'materials': len(me.materials), 'source_url': it['source_url'], 'licence': 'CC0 1.0', 'author': it.get('author', ''),
                'film_need': it.get('film_need', ''), 'notes': '; '.join(notes), 'sec': round(time.time() - t0, 2)}
            man['failed'].pop(it['id'], None)
            print('PROP', s, json.dumps(man['props'][s]), flush=True)
        except Exception as e:
            man['failed'][it['id']] = {'slug': s, 'place': pl, 'reason': f'{type(e).__name__}: {e}'[:300]}
            print('FAIL', it['id'], man['failed'][it['id']], flush=True)
        man['totals'] = {'props': len(man['props']), 'failed': len(man['failed']), 'bytes': sum(p['bytes'] for p in man['props'].values()),
                         'tris': sum(p['tris'] for p in man['props'].values())}
        with open(mp, 'w') as fh: json.dump(man, fh, indent=1)
    licenses(man, os.path.join(out, 'LICENSES.md'))
    print('PROPS total', man['totals'], flush=True)

main()
