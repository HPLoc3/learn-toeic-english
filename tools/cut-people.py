#!/usr/bin/env python3
"""Cut the owner-generated people pictures (flat light-grey background) into RGBA PNGs.

Colour-key cut (no ML): background = median grey of the picture, soft alpha from the distance to it,
background regions enclosed by the figure are kept as holes only when large (wheels, bench slats,
ladder steps ...), the rest is filled. Per-picture settings in CFG.

  python tools/cut-people.py [--src DIR] [--out DIR] [name ...]
Needs numpy, scipy, Pillow. Writes <out>/<name>.png (1376x768 RGBA) and preview composites.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

NAMES = ["l01-tf1", "l01-tf2", "l01-mc2", "l01-mc3", "l01-mc4", "l02-tf1", "l02-mc2", "l02-mc3"]
# hole: enclosed background areas of at least this many pixels stay transparent (smaller ones are filled)
# fill: polygons in which every enclosed hole is filled; keep: polygons forced to background
CFG = {
    "l01-tf1": {"hole": 100},
    "l01-tf2": {"hole": 150, "hole_zones": [([(680, 540), (1010, 540), (1010, 640), (680, 640)], 8), ([(440, 340), (480, 340), (480, 420), (440, 420)], 8)], "keep": [[(750, 408), (790, 404), (852, 500), (848, 542), (812, 546), (810, 604), (778, 604), (778, 546), (752, 440)]]},
    "l01-mc2": {"hole": 150},
    "l01-mc3": {"hole": 30, "neutral": [[(690, 380), (1056, 396), (1056, 572), (700, 584)]]},
    "l01-mc4": {"hole": 400, "fill": [[(716, 196), (770, 174), (830, 173), (850, 196), (852, 250), (842, 290), (790, 310), (766, 316), (746, 290), (742, 240), (720, 236)]], "protect": [[(708, 180), (760, 168), (852, 172), (860, 262), (848, 322), (758, 322), (742, 290), (712, 236)]]},
    "l02-tf1": {"hole": 1500},
    "l02-mc2": {"hole": 1500},
    "l02-mc3": {"hole": 1500, "recolor": [(742, 318, 800, 364)], "skin": (244, 211, 176)},
}


def polymask(shape, pts):
    pm = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(pm).polygon(pts, fill=255)
    return np.array(pm) > 127


def cut(src, cfg):
    rgb = np.array(src.convert("RGB")).astype(np.int16)
    border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    d = np.abs(rgb - bg).max(axis=2).astype(np.float32)
    d = ndi.uniform_filter(d, 3)
    t0, t1 = cfg.get("t0", 9), cfg.get("t1", 22)
    solid = d > cfg.get("t", 13)
    solid = ndi.binary_opening(solid, iterations=1)
    lab, n = ndi.label(solid)
    if n:
        sz = ndi.sum(solid, lab, range(1, n + 1))
        solid = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s > 60])
    # light-neutral halo that surrounds the figure (brighter than the page grey): peel it from the outside
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    light = (rgb.min(axis=2) >= cfg.get("lmin", 222)) & (sat <= 28)
    for pts in cfg.get("neutral", []):
        solid &= ~(polymask(solid.shape, pts) & light)
    lab, n = ndi.label(~solid)
    big = np.zeros_like(solid)
    if n:
        sz = ndi.sum(~solid, lab, range(1, n + 1))
        big = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= cfg.get("hole", 1500)])
    prot = np.zeros_like(solid)
    for pts in cfg.get("protect", []):
        prot |= polymask(solid.shape, pts)
    light &= ~prot
    for _ in range(cfg.get("peel", 4)):
        grow = ndi.binary_dilation(big, structure=np.ones((3, 3), bool)) & solid & light
        if not grow.any():
            break
        solid &= ~grow
        big |= grow
    inv = ~solid
    lab, n = ndi.label(inv)
    hole_min = cfg.get("hole", 1500)
    out_ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(inv, lab, range(1, n + 1)) if n else []
    zones = [(polymask(solid.shape, pts), mn) for pts, mn in cfg.get("hole_zones", [])]
    for i, s in enumerate(sizes):
        if (i + 1) in out_ids:
            continue
        comp = lab == i + 1
        mn = hole_min
        for zm, zmin in zones:
            if (comp & zm).any():
                mn = zmin
        if s < mn:
            solid[comp] = True
    for pts in cfg.get("fill", []):
        pm = polymask(solid.shape, pts)
        lab, n = ndi.label(~solid)
        for i in range(1, n + 1):
            comp = lab == i
            if (comp & pm).any() and i not in out_ids:
                solid[comp] = True
    for pts in cfg.get("keep", []):
        solid &= ~polymask(solid.shape, pts)
    core = ndi.binary_erosion(solid, iterations=1)
    ramp = np.where(light, 0.0, np.clip((d - t0) / (t1 - t0), 0, 1))
    near = ndi.binary_dilation(solid, iterations=1)
    a = np.where(core, 1.0, np.where(near, ramp, 0.0))
    a = ndi.gaussian_filter(a, 0.6)
    a = np.clip((a - 0.15) * 1.25, 0, 1)
    return a, bg


def decontaminate(rgb, a, bg):
    """Remove the grey background from rim pixels: C = (P - (1-a) bg) / a (a floored at 0.35)."""
    f = rgb.astype(np.float32)
    aa = np.clip(a, 0.35, 1)[..., None]
    c = (f - (1 - aa) * bg) / aa
    rim = ((a > 0) & (a < 1))[..., None]
    return np.clip(np.where(rim, c, f), 0, 255).astype(np.uint8)


def recolor_skin(rgb, box, skin):
    """Re-tint mauve skin (a hand drawn pink-grey) in box to the given skin colour, keeping its shading."""
    x0, y0, x1, y1 = box
    r = rgb[y0:y1, x0:x1].astype(np.float32)
    lum = r.mean(axis=2)
    m = ((r[..., 0] - r[..., 1]) >= 22) & ((r[..., 0] - r[..., 2]) >= 18) & (lum > 90)
    k = np.clip(lum / 171.0, 0.6, 1.1)[..., None]
    new = np.clip(np.array(skin, np.float32) * k, 0, 255)
    r[m] = new[m]
    out = rgb.copy()
    out[y0:y1, x0:x1] = r.astype(np.uint8)
    return out


def run(name, srcdir, outdir):
    src = Image.open(os.path.join(srcdir, name + ".png")).convert("RGB")
    cfg = CFG.get(name, {})
    a, bg = cut(src, cfg)
    rgb = decontaminate(np.array(src), a, bg)
    for (x0, y0, x1, y1) in cfg.get("recolor", []):
        rgb = recolor_skin(rgb, (x0, y0, x1, y1), cfg["skin"])
    im = Image.fromarray(rgb)
    im.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    im.save(os.path.join(outdir, name + ".png"))
    for tag, col in (("purple", (110, 80, 200)), ("cream", (250, 240, 215))):
        bgim = Image.new("RGB", im.size, col)
        bgim.paste(im, mask=im.split()[3])
        bgim.save(os.path.join(outdir, "_prev_%s_%s.png" % (name, tag)))
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.path.join("..", "nguon-hinh", "people", "agy-gen"))
    ap.add_argument("--out", default=os.path.join("..", "nguon-hinh", "people", "cut"))
    ap.add_argument("names", nargs="*")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for n in a.names or NAMES:
        run(n, a.src, a.out)
        print("cut", n)
    return 0


if __name__ == "__main__":
    sys.exit(main())
