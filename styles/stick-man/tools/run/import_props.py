# Downloaded CC0 props -> stick-man kit .glb (GLB.md conventions, same as export_glb.py). Runs inside Blender, headless:
#   nice -n 10 Blender -b --factory-startup --python styles/stick-man/tools/run/import_props.py -- [--places street,hospital] [--ids a,b]
#       [--list styles/stick-man/assets/props/list.json] [--src films/kit-props-src] [--out styles/stick-man/assets/props]
# The list is tracked (ids, place, name, size, source, licence); the downloads are not: fetch each model from its source_url into
# <src>/<id>/ first (docs/PROPS.md). Per prop (one item of the list, its files in <src>/<id>/): import glTF/GLB/FBX/OBJ, bake every mesh's world transform,
# merge into ONE triangulated mesh, turn it so its long side matches the list's w x d (vehicles: long side on x, as the
# backdrop pack), scale to the real size (Poly Haven is already metres; Poly Pizza sizes are estimates, SIZE below
# corrects the odd ones), pivot = bottom centre on the floor (z = 0). Colours: every face takes its material's colour
# (photo textures sampled over the face, one colour per flat panel, times the factor and vertex colour), the colours are
# clustered into <= 8 flat materials (near ones merged), then clamped (max channel <= 0.90 sRGB, never pure black; near black
# only on BLACK). A texture is kept only where the picture IS the
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
    'q6i3XL52ge': (0.11, 'measuring jug ~0.11 m tall, its handle out to the side (the source is upright: -z cap 4.7 > open top 3.9)'),
    'yqbacXdPsg': (1.6, 'a full mic stand (the source is 1.63 m), not a hand mic: the list\'s 0.2 m fit shrank the stand to 20 cm'),
    '6u4c1kSsiP': (4.5, 'stage deck + truss rig: the 10 m fit left the truss 2.6 m high, figures would hit it'),
    'dGRAisemWy': (3.5, 'round stage with a backdrop truss: the 6 m fit left the truss 2.4 m high'),
    'j59k7ctnZM': (0.65, 'a scuba twin set, not a lab tank: real ~0.65 m tall'),
    '8G0qJ84VDS': (1.1, 'a sandwich board is ~1.1 m; the 2.5 m list size is a billboard'),
    'Fsk9PE6o74': (0.5, 'a 9 kg propane bottle with its collar is ~0.5 m; the list says 1 m'),
    'OgrROxABGT': (3.0, 'chunky food truck: a 5 m length fit made it 4.6 m tall; real food truck ~3 m'),
}
# id -> degrees about z, applied after import instead of the auto turn. Front to -y: the sources of these face +y (held by
# kit/props/sizes.js FRONT, tests and the front/back sheets of 25/11); a prop the auto turn had turned 90 says 270
ROT = {
    'RY93lbAIFg': 180, 'CKSz6PB1vO': 180, 'V5Qo141OcB': 180, 'GnbwSUiVty': 180,      # lounge chair, desk chair, screen, laptop
    '36ODvl4CIy': 180, 'vUsvf2HGDv': 180, 'kTJU2y4R15': 180,                          # fridge, microwave, stove
    'M2cJ5sVUgJ': 180, '3fFsumkkQD': 270, 'standing_picture_frame_01': 270,                              # books (spines), briefcase (clasp), picture frame
    'DGIM5HGISb': 90, 'SU28ptta34': 50,                                                                  # market stand: its long counter to the front; bottle: its label
}
# id -> ((axis, degrees), ...) turned in this order right after import, instead of the auto turn and the auto upright
# (the auto upright stands the long side up about y, which turned the phone's screen to +x)
ORIENT = {
    '4DRZmTs3jq': (('X', 90),),     # smartphone lies flat, screen +z, long side y: stand the long side up, screen to -y (front)
    'mBGTVozH1u': (('Y', 90),),     # screen rig: its truss lies along +x off the screen's side; truss down, screen on top
}
# id -> (axis, above, reason): faces whose centre lies above this source coordinate are cut before turning
CROP = {'mBGTVozH1u': (2, 0.21, 'the antenna pole over the screen: with the truss stood up it would stick 2.4 m out sideways')}
# id -> tris, where the size's budget shreds the model (a woven or many-part model decimated to the small budget)
BUDGET = {'wicker_basket_02': 4000, 'industrial_microscope': 3500, 'vintage_microscope': 3000,
          'plastic_thermos': 2500, 'standing_picture_frame_01': 1600,
          'bunsen_burner': 2000}
# id -> colours, where the photo's wear reads as patches of camouflage (the default is K)
COLOURS = {'wicker_basket_02': 1, 'tea_set_01': 1, 'hand_truck': 4, 'plastic_thermos': 3}
MERGE = {'3fFsumkkQD': 0.35}      # id -> sRGB distance instead of NEAR (a gradient painted over many small folds)
SKIP_MAT = {'standing_picture_frame_01': 'standing_picture_frame_01_glass'}     # id -> a material whose faces are left out (a glass pane in front of the picture)
OBJECTS = {'bunsen_burner': 'burner_stand'}     # id -> the only object of the file that is kept
# id -> reason: list items that are not imported (a code-built prop of kit/props/built.js replaces them); a re-import removes the file
DROP = {
    'y9mMoShXnI': 'reads as an upside-down stool (four posts on a plank), not a dish rack: kitchen-home/dishrack',
    'wall_clock': 'its hands and marks are a texture behind a glass mesh: a blank disc as flat colours: care-home/wall-clock',
    'fis2ugeLbn': 'two interpenetrating rings round a broken cup: office/mug',
    'f9my9iJZMv': 'one near-black colour, no rim or inside: kitchen-home/pan',
    'wALulTo6gm': 'a smooth slab, its slots and lever not modelled on the sides a camera sees: kitchen-home/toaster',
    '4mrO9ueiQr': 'a blank white board: street/construction-barrier',
    'security_camera_01': 'a hood whose lens is 2 % of it, hidden under the hood: supermarket/security-camera',
    'nNGtcp9qK2': 'one oven-like door under a solid top, no bowl: kitchen-home/kitchen-sink',
    'CFbvPTVVEl': 'tapers like a bucket: kitchen-home/stock-pot',
    '63CkYTkeQP': 'one pale colour, no lid or handle: supermarket/cooler-box',
    'vsqTUPFSw6': 'a tray with two flat patches, no keys: office/computer-keyboard',
    'clipboard': 'a board with no paper: hospital/clipboard',
    'cardboard_box_01': 'its photo texture is the box; as one colour a lumpy sack: misc/cardboard-box',
    'fancy_picture_frame_01': 'an empty frame: care-home/fancy-picture-frame',
    'XGe3q5zQ5s': 'an opaque grey pot, reads as a bin: street/jar',
    'FUSyrlibw0': 'a faceted carton with a handle: care-home/cup-tea',
    'wicker_basket_01': 'a 12 cm bread tray of loose twigs, not a shopping basket: supermarket/shopping-basket',
}
# id -> ((from sRGB 0-255, to sRGB 0-255), ...): the palette colour nearest to `from` becomes `to` (source colours the kit's
# contrast crushes to a black lump, kit/props/sizes.js DARK)
RECOLOUR = {
    'myd1WSucAz': (((36, 34, 39), (112, 126, 88)), ((70, 39, 32), (122, 78, 50))),       # armchair: moss green cloth, wood legs
    'X5kQPKzAWp': (((41, 41, 41), (98, 118, 146)), ((67, 59, 55), (122, 78, 50))),       # sofa: dusty blue cloth, wood legs
    'bfLOqIV5uP': (((47, 47, 47), (176, 98, 62)),),                                      # houseplant: terracotta pot
    'PvSjEbz11k': (((20, 20, 20), (66, 72, 84)),),                                       # monitor: dark grey, its one material is screen and case
    '77K2TCL5Lz': (((20, 20, 20), (96, 100, 108)),),                                     # printer: grey case
    'standing_picture_frame_01': (((22, 22, 22), (104, 66, 40)),),                       # picture frame: walnut
    '7DsKpns9FM': (((57, 31, 33), (128, 62, 54)),),                                      # suit-case: oxblood leather
    'SU28ptta34': (((30, 30, 30), (46, 88, 56)),),                                       # bottle: green glass
    'bunsen_burner': (((5, 6, 125), (150, 148, 142)),),                                  # tripod: the gauze's baked blue light
    'korean_fire_extinguisher_01': (((174, 126, 121), (206, 196, 180)), ((131, 101, 102), (206, 196, 180))),   # extinguisher: one label colour
    # a large part near black (sizes.js DARK.area): charcoal, slate or wood with form left in it
    'zOQOThSpuo': (((25, 25, 25), (70, 72, 80)), ((59, 59, 59), (92, 94, 102))),         # speaker cabinet
    'YohOCmn0hO': (((29, 29, 28), (74, 76, 84)),),                                       # spotlight can
    '6u4c1kSsiP': (((20, 20, 20), (74, 76, 88)), ((59, 59, 59), (96, 98, 110))),         # concert stage deck
    'dGRAisemWy': (((25, 25, 25), (74, 76, 88)), ((59, 59, 59), (96, 98, 110))),         # stage deck
    'yqbacXdPsg': (((20, 20, 20), (66, 68, 74)),),                                       # mic head and base
    '4DRZmTs3jq': (((20, 20, 20), (52, 66, 98)), ((26, 25, 50), (78, 80, 90))),          # smartphone: screen, case
    'k2kgBepoMU': (((45, 45, 45), (56, 72, 102)),),                                      # phone screen
    'UfKvrZBK6C': (((50, 50, 50), (72, 74, 82)),),                                       # office chair frame
    'BG0KAhmGDt': (((41, 41, 41), (66, 68, 76)),), 'u5PhZQ35XG': (((33, 33, 33), (66, 68, 76)),),   # hatchback, taxi: tyres and cabin
    '8G0qJ84VDS': (((44, 40, 40), (122, 78, 50)),),                                      # ad board: wood frame
    'standing_chalkboard_01': (((47, 47, 47), (62, 88, 80)), ((60, 40, 18), (104, 66, 36))),   # slate green
    'street_lamp_01': (((6, 6, 6), (52, 54, 60)),), 'QmYKHtUnxb': (((41, 41, 41), (98, 106, 106)), ((60, 60, 60), (82, 90, 92))),   # lamp head, dumpster lid
    'vintage_microscope': (((26, 30, 43), (56, 62, 82)),), 'tool_cart': (((53, 48, 36), (88, 82, 66)),),
    'TPqvwkyWdV': (((45, 45, 45), (58, 62, 72)),), 'OgrROxABGT': (((66, 66, 66), (84, 86, 94)),),   # radio case (then LIFT), sushi truck trim
    'medical_box': (((16, 65, 33), (46, 112, 66)),),                                     # medical box lid
    'U8yQZ9l0HZ': (((70, 39, 32), (122, 72, 50)),),                                      # corkboard frame
    'Hp80p6148W': (((115, 50, 48), (24, 116, 68)),),                                     # first-aid kit: white cross on green (a red cross on white is a protected emblem)
    'OlTLyyXoXY': (((20, 20, 20), (74, 98, 124)),),                                      # desk fan: blue-grey base
}
LIFT = {'Rockingchair_01': 1.8, '7cobkfclNv': 1.4, 'metal_office_desk': 1.35, 'street_lamp_01': 1.5, 'TPqvwkyWdV': 1.5,
        'industrial_storage_cart': 1.35, 'industrial_microscope': 1.3, 'chemistry_set': 1.4, '9N9rYOD8On': 1.4, 'ianC28eMOF': 1.25, '3VGWnZPXmG': 1.25, 'TvaOenUAni': 1.3, 'vF7TuXCPDH': 1.25, '3fFsumkkQD': 1.35}     # id -> gain on every palette colour (too dark for the kit's contrast)
BLACK = {'korean_fire_extinguisher_01'}   # really black things (sizes.js BLACK_OK); on every other prop a near-black colour is lifted to 0.16
TWO_SIDED = {'bfLOqIV5uP', 'OlTLyyXoXY'}     # open sheets (leaves, fan blades): a flipped copy, the kit draws front faces only
KEEP_TEX = {'WetFloorSign_01', 'PeM20xAT0V'}     # the printed picture is the prop (a sign)
SLUG = {'vPFSLYh6sg': 'street-light-2', 'mBGTVozH1u': 'screen-rig', 'AYQd5RQ8w4': 'truss-post', 'j59k7ctnZM': 'scuba-tanks', 'bunsen_burner': 'tripod-stand'}
PLACE = {'mBGTVozH1u': 'arena', 'j59k7ctnZM': 'misc'}   # the list's place is wrong for the model: the TV is a 3 m screen rig, the lab tank a scuba set
VEHICLE = re.compile(r'\b(taxi|car|truck|van|bus|hatchback)\b', re.I)
K = 8

def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = {'list': 'styles/stick-man/assets/props/list.json', 'src': 'films/kit-props-src', 'out': 'styles/stick-man/assets/props', 'places': '', 'ids': ''}
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
    """sRGB + alpha HxWx4 array (<= px) of an image, cached"""
    if img.name in _PX: return _PX[img.name]
    a = None
    try:
        w, h = img.size
        if w and h:
            c = img.copy()
            if max(w, h) > px: c.scale(max(1, round(w * px / max(w, h))), max(1, round(h * px / max(w, h))))
            W, H = c.size; p = np.empty(W * H * 4, dtype=np.float32); c.pixels.foreach_get(p)
            a = p.reshape(H, W, 4).copy()
            if img.is_float or not img.colorspace_settings.name.lower().startswith('srgb'): a[:, :, :3] = l2s(a[:, :, :3])
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
    col = np.zeros((n, 3)); noisy = np.zeros(n, dtype=bool)
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
            def at(t): return a[(np.mod(t[:, 1], 1) * H).astype(int).clip(0, H - 1), (np.mod(t[:, 0], 1) * W).astype(int).clip(0, W - 1)]
            # the face's colour: the mean of its opaque samples from the centre toward each corner. A cut-out card (leaves,
            # petals on an alpha atlas) has see-through samples whose black RGB turned the street flowers into black blobs;
            # a face with no opaque sample takes the picture's own opaque mean
            fsel = np.where(sel)[0]; lm = sel[owner]; lo_ = owner[lm]; sm = np.zeros((n, 3)); sq = np.zeros(n); cn = np.zeros(n)
            for t in (0.0, 0.2, 0.4, 0.6, 0.8):
                c = at(uv[lo_] * (1 - t) + u[lm] * t); ok = c[:, 3] >= 0.5
                np.add.at(sm, lo_[ok], c[ok, :3]); np.add.at(sq, lo_[ok], (c[ok, :3] ** 2).sum(1)); np.add.at(cn, lo_[ok], 1)
            wa = a[:, :, 3].reshape(-1); mean = (a[:, :, :3].reshape(-1, 3) * wa[:, None]).sum(0) / max(wa.sum(), 1e-6)
            m_ = sm[fsel] / np.maximum(cn[fsel, None], 1); rgb = np.where(cn[fsel, None] > 0, m_, mean)
            noisy[fsel] = np.sqrt(np.maximum(sq[fsel] / np.maximum(cn[fsel], 1) - (m_ ** 2).sum(1), 0)) > 0.02
            # a flat swatch keeps its exact colour (the mean of identical samples); a swatch edge must not blend in
            flat = ~noisy[fsel]; cc = at(uv[fsel]); rgb[flat & (cc[:, 3] >= 0.5)] = cc[flat & (cc[:, 3] >= 0.5), :3]
            col[sel] = s2l(rgb) * d['fac']
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
    return coplanar(me, col, mi, noisy), mi

def coplanar(me, col, mi, noisy):
    """one colour per flat panel: faces of one material that share an edge and lie in one plane (within 2 degrees) take the
    panel's area mean where a photo or gradient is sampled (`noisy`). Sampled face by face, a quad's two triangles got two
    colours: a picture, a desk top, a mirror split along its diagonal."""
    if not noisy.any(): return col
    n = len(me.polygons); nv = len(me.vertices)
    co = np.empty(nv * 3, dtype=np.float64); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    q = np.round(co / max(1e-9, (co.max(0) - co.min(0)).max() * 1e-5)).astype(np.int64)
    _, key = np.unique(q, axis=0, return_inverse=True); key = key.reshape(-1)          # a glTF import splits a vertex at every UV seam
    nrm = np.empty(n * 3, dtype=np.float32); me.polygons.foreach_get('normal', nrm); nrm = nrm.reshape(-1, 3)
    area = np.empty(n, dtype=np.float32); me.polygons.foreach_get('area', area)
    par = list(range(n))
    def find(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    edges = {}
    for f in me.polygons:
        vs = key[list(f.vertices)]
        for i in range(len(vs)):
            e = (min(vs[i], vs[i - 1]), max(vs[i], vs[i - 1])); edges.setdefault(e, []).append(f.index)
    for fs in edges.values():
        for a in fs[1:]:
            b = fs[0]
            if mi[a] == mi[b] and noisy[a] and noisy[b] and float(nrm[a] @ nrm[b]) > 0.9994: par[find(a)] = find(b)
    root = np.array([find(i) for i in range(n)]); w = area[:, None].astype(float) + 1e-12
    sm = np.zeros((n, 3)); ws = np.zeros((n, 1)); np.add.at(sm, root, l2s(col) * w); np.add.at(ws, root, w)
    out = col.copy(); out[noisy] = s2l(sm[root] / ws[root])[noisy]
    return out

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

def clamp(srgb, black=True):
    c = np.array(srgb, dtype=float); m = c.max()
    if m > 0.90: c *= 0.90 / m
    if not black and c.max() <= 0.11: c = np.full(3, 0.16) if c.max() <= 1e-6 else c * (0.16 / c.max())
    if c.max() < 0.08: c = np.full(3, 0.08) if c.max() <= 1e-6 else c * (0.08 / c.max())
    return c

NEAR = 0.075                # palette colours closer than this (sRGB distance) are one colour: a photo's wear is not eight browns
def near_merge(c, l, w, near=NEAR):
    c = [np.array(v, dtype=float) for v in c]; w = list(w); to = list(range(len(c))); live = set(to)
    while len(live) > 1:
        d, i, j = min((float(np.linalg.norm(c[i] - c[j])), i, j) for i in live for j in live if i < j)
        if d >= near: break
        c[i] = (c[i] * w[i] + c[j] * w[j]) / (w[i] + w[j]); w[i] += w[j]; live.discard(j); to = [i if t == j else t for t in to]
    ids = sorted(live); ren = {k: n for n, k in enumerate(ids)}
    return np.array([c[k] for k in ids]), np.array([ren[to[v]] for v in l], dtype=int)

def palette(it, col, emis, area):
    """cluster face colours (sRGB) -> (centres sRGB, label per face); emissive faces cluster on their own"""
    lab = np.zeros(len(col), dtype=int); cents, flags = [], []; pid = it['id']
    for e in (False, True):
        s = emis == e
        if not s.any(): continue
        x = l2s(col[s]); q = np.round(x * 255) / 255
        u, inv = np.unique(q, axis=0, return_inverse=True); inv = inv.reshape(-1); wu = np.bincount(inv, weights=area[s] + 1e-9)
        kk = COLOURS.get(pid, K) if not e else 3
        if len(u) <= kk: c, l = u, inv
        else: c, lu = kmeans(u, wu, kk); l = lu[inv]
        c, l = near_merge(c, l, np.bincount(l, weights=area[s] + 1e-9, minlength=len(c)), MERGE.get(pid, NEAR))
        lab[s] = l + len(cents); cents += list(c); flags += [e] * len(c)
    for old, new in RECOLOUR.get(pid, ()):
        k = min(range(len(cents)), key=lambda i: float(np.linalg.norm(cents[i] * 255 - np.array(old)))); cents[k] = np.array(new) / 255
    return [clamp(c * LIFT.get(pid, 1.0), pid in BLACK) for c in cents], flags, lab

def build(it, files):
    descs_all, meshes, kept = [], [], None
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    for inst in dg.object_instances:
        ob = inst.object
        if ob.type not in ('MESH', 'CURVE', 'FONT', 'SURFACE', 'META'): continue
        if it['id'] in OBJECTS and ob.name != OBJECTS[it['id']]: continue
        try: me = ob.to_mesh()
        except RuntimeError: continue
        if me is None or not len(me.polygons): ob.to_mesh_clear(); continue
        me = me.copy(); ob.to_mesh_clear()
        if it['id'] in SKIP_MAT:
            bm = bmesh.new(); bm.from_mesh(me); skip = [i for i, m in enumerate(me.materials) if m and m.name == SKIP_MAT[it['id']]]
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in skip], context='FACES'); bm.to_mesh(me); bm.free()
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
    if (~tex).any(): cents, flags, lab[~tex] = palette(it, col[~tex], emis[~tex], area[~tex])
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

def crop(me, ax, above):
    """cut the faces whose centre lies above `above` on axis ax"""
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median()[ax] > above], context='FACES')
    bm.to_mesh(me); bm.free()

def place(me, it, size, src):
    """turn, scale and put the pivot at the bottom centre; returns notes"""
    notes = []; lo, hi = bounds(me); d = hi - lo
    w, dd, h = size
    for ax, deg in ORIENT.get(it['id'], ()):
        me.transform(Matrix.Rotation(math.radians(deg), 4, ax)); notes.append(f'turned {deg} about {ax.lower()} (ORIENT)')
    if it['id'] in ORIENT: lo, hi = bounds(me); d = hi - lo
    rot = ROT.get(it['id'])
    if it['id'] in ORIENT: rot = 0
    elif rot is None:
        rot = 0
        if VEHICLE.search(it['name']):
            if d[1] > d[0] * 1.2: rot = 90; notes.append('turned 90: vehicle long side on x (backdrop pack)')
        elif (w > dd * 1.3 and d[1] > d[0] * 1.3) or (dd > w * 1.3 and d[0] > d[1] * 1.3):
            rot = 90; notes.append('turned 90 so the long side matches the list w x d')
    else: notes.append(f'turned {rot} (ROT)')
    if rot: me.transform(Matrix.Rotation(math.radians(rot), 4, 'Z')); lo, hi = bounds(me); d = hi - lo
    if it['id'] not in SIZE and it['id'] not in ORIENT and h > max(w, dd) and d[2] < 0.5 * max(d[0], d[1]):          # upright check: a tall prop that came in lying down
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
    # face-area weighted normals: plain averaging bends a big flat face's normals at its bevelled corners, and the toon ramp
    # then draws a false triangle of shade across it (the safe's door, the jar, the stock pot)
    scn = bpy.context.scene; ob = bpy.data.objects.new('wn', me); scn.collection.objects.link(ob)
    mod = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); mod.keep_sharp = True; mod.mode = 'FACE_AREA'; mod.weight = 100
    dg = bpy.context.evaluated_depsgraph_get(); dg.update(); nm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    scn.collection.objects.unlink(ob); bpy.data.objects.remove(ob); return nm

def two_sided(me):
    bm = bmesh.new(); bm.from_mesh(me)
    g = bmesh.ops.duplicate(bm, geom=list(bm.faces))['geom']; bmesh.ops.reverse_faces(bm, faces=[f for f in g if isinstance(f, bmesh.types.BMFace)])
    bm.to_mesh(me); bm.free()

def export(me, path):
    scn = bpy.context.scene
    for ob in list(scn.collection.all_objects): bpy.data.objects.remove(ob)
    ob = bpy.data.objects.new(os.path.splitext(os.path.basename(path))[0], me); scn.collection.objects.link(ob)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_active_scene=True, export_apply=True, export_yup=True,
        export_texcoords=True, export_normals=True, export_image_format='JPEG', export_jpeg_quality=82, export_materials='EXPORT',
        export_draco_mesh_compression_enable=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False)

def licenses(man, path):
    rows = sorted(man['props'].items(), key=lambda kv: (kv[1]['place'], kv[0]))
    L = ['# Third-party props (CC0)', '', 'Every model below is public domain (CC0); the Licence column is what its page states (tools/run/import_props.py list). Downloaded from Poly Haven (polyhaven.com, all assets CC0)',
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
        t0 = time.time(); s = slug[it['id']]; pl = PLACE.get(it['id'], it['place'])
        if it['id'] in DROP:
            for k in [k for k, v in man['props'].items() if v['id'] == it['id']]:
                fp = os.path.join(out, man['props'].pop(k)['file'])
                if os.path.exists(fp): os.remove(fp)
            man['failed'].pop(it['id'], None); print('DROP', it['id'], DROP[it['id']], flush=True)
            continue
        try:
            clear(); _PX.clear()
            f = model_file(os.path.join(root, o['src'], it['id']))
            if not f: raise RuntimeError('no model file downloaded')
            if not it['licence'].startswith('CC0'): raise RuntimeError(f'licence {it["licence"]!r} is not CC0')
            do_import(f)
            me, pal, kept = build(it, f)
            if it['id'] in CROP: ax, above, why = CROP[it['id']]; crop(me, ax, above)
            size, why = target(it)
            dims, notes, scale = place(me, it, size, it['source'])
            if it['id'] in CROP: notes.insert(0, f'cut faces above {"xyz"[CROP[it["id"]][0]]} {CROP[it["id"]][1]} (CROP): {CROP[it["id"]][2]}')
            limit, cat = budget(it, size)
            if it['id'] in BUDGET: limit, cat = BUDGET[it['id']], 'BUDGET'
            me, n0 = decimate(me, limit)
            me = finish(me, kept)
            if it['id'] in TWO_SIDED: two_sided(me); notes.append('two-sided (flipped copy of every face)')
            lo, hi = bounds(me); me.transform(Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))))
            for k in [k for k, v in man['props'].items() if v['id'] == it['id'] and v['file'] != f'{pl}/{s}.glb']:      # renamed or moved
                fp = os.path.join(out, man['props'].pop(k)['file'])
                if os.path.exists(fp): os.remove(fp)
            os.makedirs(os.path.join(out, pl), exist_ok=True); path = os.path.join(out, pl, s + '.glb')
            export(me, path)
            lo, hi = bounds(me)
            if n0 > limit: notes.append(f'decimated {n0} -> {len(me.polygons)} tris ({cat} budget {limit})')
            if kept: notes.append('kept its printed texture (256 px)')
            notes.insert(0, f'size {"x".join(str(v) for v in size)} m ({why}), scale x{scale}')
            man['props'][s] = {'id': it['id'], 'name': it['name'], 'place': pl, 'file': f'{pl}/{s}.glb', 'bytes': os.path.getsize(path),
                'tris': len(me.polygons), 'size': dims, 'lo': [round(float(x), 3) for x in lo], 'hi': [round(float(x), 3) for x in hi],
                'materials': len(me.materials), 'source_url': it['source_url'], 'licence': it['licence'], 'author': it.get('author', ''),
                'film_need': it.get('film_need', ''), 'notes': '; '.join(notes), 'sec': round(time.time() - t0, 2)}
            man['failed'].pop(it['id'], None)
            print('PROP', s, json.dumps(man['props'][s]), flush=True)
        except Exception as e:
            man['failed'][it['id']] = {'slug': s, 'place': pl, 'reason': f'{type(e).__name__}: {e}'[:300]}
            print('FAIL', it['id'], man['failed'][it['id']], flush=True)
        man['totals'] = {'props': len(man['props']), 'failed': len(man['failed']), 'bytes': sum(p['bytes'] for p in man['props'].values()),
                         'tris': sum(p['tris'] for p in man['props'].values())}
        with open(mp, 'w') as fh: json.dump(man, fh, indent=1)
    man['totals'] = {'props': len(man['props']), 'failed': len(man['failed']), 'bytes': sum(p['bytes'] for p in man['props'].values()),
                     'tris': sum(p['tris'] for p in man['props'].values())}
    with open(mp, 'w') as fh: json.dump(man, fh, indent=1)
    lic = {it['id']: it['licence'] for it in items}
    for v in man['props'].values(): v['licence'] = lic[v['id']]      # what the list says, for every prop
    with open(mp, 'w') as fh: json.dump(man, fh, indent=1)
    licenses(man, os.path.join(out, 'LICENSES.md'))
    print('PROPS total', man['totals'], flush=True)

main()
