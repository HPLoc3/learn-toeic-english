#!/usr/bin/env python3
"""Build scene WebPs (800x450 precached, 1600x900 HD) for the image-scene player.

Run from the repo root:
  python tools/make-scenes.py [--src DIR] [--unit l01] [--names a,b] [--out800 DIR]
      [--outhd DIR] [--cap800 110000] [--cap1600 280000] [--crop NAME=cx,cy]
      [--placeholder] [--dry-run]

Exit codes: 0 ok, 1 bad arguments (own validation), 2 argparse usage error,
3 missing source images, 4 cap not reached (nothing is written in that case).
Only writes into the two output directories.
"""
import argparse
import hashlib
import io
import os
import sys

import re

from PIL import Image, ImageDraw, ImageFont, ImageOps

NAMES = "nam-pour,nam-wipe,mai-look,mai-type,hanh-wear,hanh-point,duo-cafe"
SIZES = ((800, 450), (1600, 900))
SLUG = re.compile(r"^[a-z0-9-]+$")
EXTS = (".png", ".jpg", ".jpeg")
QUALITIES = (82, 78, 74, 70, 66, 62, 60)
# Soft palette harmonising with #4a2ad6 (violet) and #f7c948 (yellow).
PALETTE = [(0xE9, 0xE4, 0xFB), (0xD6, 0xCC, 0xF7), (0xC3, 0xB6, 0xF2),
           (0xFB, 0xEE, 0xC2), (0xF9, 0xE0, 0x9A), (0xEF, 0xD8, 0xE8)]


def encode(img, cap):
    """WebP method=6, quality 82 stepping down to 60 until <= cap. Returns bytes or None."""
    for q in QUALITIES:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=6)  # no exif/icc/xmp passed = stripped
        data = buf.getvalue()
        if len(data) <= cap:
            return data
    return None


def crop169(img, center):
    w, h = img.size
    if w * 9 >= h * 16:  # wider than 16:9: trim width
        cw, ch = round(h * 16 / 9), h
    else:
        cw, ch = w, round(w * 9 / 16)
    x = min(max(round(center[0] * w - cw / 2), 0), w - cw)
    y = min(max(round(center[1] * h - ch / 2), 0), h - ch)
    return img.crop((x, y, x + cw, y + ch))


def placeholder(name, size):
    """Deterministic vertical gradient (colours from the name hash) with the scene name drawn."""
    d = hashlib.sha256(name.encode("ascii")).digest()
    c1, c2 = PALETTE[d[0] % 6], PALETTE[d[1] % 6]
    w, h = size
    col = Image.new("RGB", (1, h))
    col.putdata([tuple(round(c1[i] + (c2[i] - c1[i]) * y / (h - 1)) for i in range(3))
                 for y in range(h)])
    img = col.resize((w, h), Image.NEAREST)
    # Default bitmap font drawn small, then scaled up so the name is legible at any size.
    txt = name.upper()
    tmp = Image.new("L", (8 * len(txt) + 8, 16), 0)
    ImageDraw.Draw(tmp).text((2, 2), txt, fill=255, font=ImageFont.load_default())
    tmp = tmp.crop(tmp.getbbox() or (0, 0, 1, 1))
    scale = max(1, int(w * 0.5 // tmp.width))
    tmp = tmp.resize((tmp.width * scale, tmp.height * scale), Image.NEAREST)
    ink = Image.new("RGB", tmp.size, (0x4A, 0x2A, 0xD6))
    img.paste(ink, ((w - tmp.width) // 2, (h - tmp.height) // 2), tmp)
    return img


def find_src(src, name):
    for ext in EXTS:
        p = os.path.join(src, name + ext)
        if os.path.isfile(p):
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.path.join("..", "nguon-hinh", "agy-anh"))
    ap.add_argument("--unit", default="l01")
    ap.add_argument("--names", default=NAMES)
    ap.add_argument("--out800")
    ap.add_argument("--outhd")
    ap.add_argument("--cap800", type=int, default=110000)
    ap.add_argument("--cap1600", type=int, default=280000)
    ap.add_argument("--crop", action="append", default=[], metavar="NAME=cx,cy")
    ap.add_argument("--placeholder", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if not SLUG.match(a.unit):
        print("bad --unit, expected ^[a-z0-9-]+$", file=sys.stderr)
        return 1
    out800 = a.out800 or os.path.join("assets", "img", a.unit, "scene")
    outhd = a.outhd or os.path.join("assets", "img-hd", a.unit)
    names = [n.strip() for n in a.names.split(",")
             if n.strip() and not n.strip().endswith("-sheet")]
    if not names or not all(SLUG.match(n) for n in names):
        print("bad --names, each name must match ^[a-z0-9-]+$", file=sys.stderr)
        return 1
    crops = {}
    try:
        for c in a.crop:
            k, v = c.split("=", 1)
            cx, cy = (float(t) for t in v.split(","))
            crops[k] = (min(max(cx, 0.0), 1.0), min(max(cy, 0.0), 1.0))
    except ValueError:
        print("bad --crop, expected NAME=cx,cy", file=sys.stderr)
        return 1

    srcs = {}
    if not a.placeholder:
        missing = []
        for n in names:
            p = find_src(a.src, n)
            if p:
                srcs[n] = p
            else:
                missing.append(n)
        if missing:
            print("missing source images in %s: %s" % (a.src, ", ".join(missing)),
                  file=sys.stderr)
            return 3

    rows, total800, failed, pending = [], 0, [], []
    for n in names:
        base = None
        if not a.placeholder:
            im = Image.open(srcs[n])
            im.load()
            base = crop169(ImageOps.exif_transpose(im).convert("RGB"), crops.get(n, (0.5, 0.5)))
        for (w, h), outdir, suffix, cap in ((SIZES[0], out800, "800", a.cap800),
                                            (SIZES[1], outhd, "1600", a.cap1600)):
            img = placeholder(n, (w, h)) if a.placeholder else base.resize((w, h), Image.LANCZOS)
            data = encode(img, cap)
            path = os.path.join(outdir, "%s-%s.webp" % (n, suffix))
            if data is None:
                failed.append(path)
                continue
            pending.append((outdir, path, data))
            if suffix == "800":
                total800 += len(data)
            rows.append((path.replace("\\", "/"), "%dx%d" % (w, h), len(data)))
    if not failed and not a.dry_run:  # write only when every file met its cap
        for outdir, path, data in pending:
            os.makedirs(outdir, exist_ok=True)
            with open(path, "wb") as fh:
                fh.write(data)
    print("%-48s %-10s %s" % ("file", "WxH", "bytes"))
    for r in rows:
        print("%-48s %-10s %d" % r)
    print("total 800w: %d bytes%s" % (total800, " (dry run, nothing written)" if a.dry_run else ""))
    if failed:
        print("cap not reached at quality 60: " + ", ".join(failed) + " (nothing written)", file=sys.stderr)
        return 4
    return 0


if __name__ == "__main__":
    sys.exit(main())
