#!/usr/bin/env python3
"""Build an outro picture: a 3x2 grid of the six scene images of a unit, no text.

Pillow only. Cells have rounded corners and are separated by thin gaps in the app's
soft lavender (#e9e4fb). Cells are 16:9 like the scenes, so the whole scene is shown
(at most a hairline is trimmed); the grid is centred vertically and the canvas keeps
lavender bands above and below. CENTERS only matters for sources that are not 16:9.

Run from the repo root:
  python tools/make-outro-grid.py --src DIR [--out FILE] [--names a,b,c,d,e,f] [--margin 28] [--gap 20] [--radius 24]

--src   folder holding <name>.png / .jpg / .jpeg / .webp for the six scenes
--out   output PNG, 1600x900, must end in .png and must not be one of the input files
        (when omitted, the default is <src>/obj-outro.png, allowed only with the default Unit 3 --names;
        with any other --names, --out is required)
--names row-major order of the six scene names (any unit); default is the Unit 3 list obj-table,obj-boxes,obj-bike,obj-cars,obj-lamp,obj-books
        e.g. Unit 4: --names scn-boat,scn-bridge,scn-trees,scn-mountains,scn-road,scn-harbor --out DIR/scn-outro.png
Then make the shipped webp files with:
  python tools/make-scenes.py --src DIR --unit l03 --names obj-outro   (Unit 4: --unit l04 --names scn-outro)
Writes only the --out file.
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw

W, H = 1600, 900
BG = (233, 228, 251)
NAMES = "obj-table,obj-boxes,obj-bike,obj-cars,obj-lamp,obj-books"
EXTS = (".png", ".jpg", ".jpeg", ".webp")
# horizontal centre (0..1) of the crop for scenes whose key object is off-centre
CENTERS = {"obj-bike": 0.52, "obj-books": 0.36}


def find(src, name):
    for e in EXTS:
        p = os.path.join(src, name + e)
        if os.path.isfile(p):
            return p
    return None


def cover(im, w, h, cx):
    s = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x = min(max(round(cx * im.width - w / 2), 0), im.width - w)
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default="")
    ap.add_argument("--names", default=NAMES)
    ap.add_argument("--margin", type=int, default=28)
    ap.add_argument("--gap", type=int, default=20)
    ap.add_argument("--radius", type=int, default=24)
    a = ap.parse_args()
    names = [n.strip() for n in a.names.split(",") if n.strip()]
    if len(names) != 6:
        print("need exactly 6 names", file=sys.stderr)
        return 1
    paths = [find(a.src, n) for n in names]
    miss = [n for n, p in zip(names, paths) if not p]
    if miss:
        print("missing source images in %s: %s" % (a.src, ", ".join(miss)), file=sys.stderr)
        return 3
    if not a.out and a.names != NAMES:
        print("--out is required when --names is not the default Unit 3 list", file=sys.stderr)
        return 1
    if min(a.margin, a.gap, a.radius) < 0:
        print("--margin, --gap and --radius must be >= 0", file=sys.stderr)
        return 1
    cw = (W - 2 * a.margin - 2 * a.gap) // 3
    ch = cw * 9 // 16
    top = (H - 2 * ch - a.gap) // 2
    if cw < 100 or top < 0 or a.radius * 2 > min(cw, ch):
        print("--margin/--gap/--radius leave no room for the grid (cells %dx%d, top %d)" % (cw, ch, top), file=sys.stderr)
        return 1
    SS = 3  # supersampled rounded-corner mask
    mask = Image.new("L", (cw * SS, ch * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw * SS - 1, ch * SS - 1), a.radius * SS, fill=255)
    mask = mask.resize((cw, ch), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), BG)
    for i, (n, p) in enumerate(zip(names, paths)):
        im = Image.open(p).convert("RGB")
        cell = cover(im, cw, ch, CENTERS.get(n, 0.5))
        x = a.margin + (i % 3) * (cw + a.gap)
        y = top + (i // 3) * (ch + a.gap)
        canvas.paste(cell, (x, y), mask)
    out = a.out or os.path.join(a.src, "obj-outro.png")
    if not out.lower().endswith(".png"):
        print("--out must end in .png", file=sys.stderr)
        return 1
    if os.path.abspath(out) in [os.path.abspath(p) for p in paths]:
        print("--out would overwrite an input image: " + out, file=sys.stderr)
        return 1
    canvas.save(out)
    print("wrote", out, canvas.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
