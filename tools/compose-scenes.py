#!/usr/bin/env python3
"""Compose the Unit 1 scene images: people cut-outs + flat backgrounds/props drawn here.

Pillow only (no rembg). People are original characters made by the site owner;
everything else (backgrounds, counters, desk, laptop, flower shelf) is drawn
procedurally by this script (2x supersampled, then downscaled).

Run from the repo root:
  python tools/compose-scenes.py [--cut DIR] [--out DIR] [--only NAME[,NAME]] [--contact FILE]

--cut  directory with <scene-id>.png RGBA cut-outs (1376x768)  default ../nguon-hinh/unit1-cut
--out  directory for composed 1600x900 PNGs (input of make-scenes.py) default ../nguon-hinh/agy-anh
Writes only into --out (and --contact when given).
"""
import argparse
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageOps

W, H, SS = 1600, 900, 2
SW, SH = 1376, 768
SC = H / SH                      # source -> canvas scale (900/768)
OL = (112, 80, 68, 255)          # thin dark-brown outline, like the line art
# palette (app: violet #4a2ad6, yellow #f7c948; soft lavender/cream bases)
CREAM = (251, 243, 224)
LAV1, LAV2, LAV3 = (233, 228, 251), (214, 204, 247), (195, 182, 242)
YEL = (247, 201, 72)
YEL_S = (251, 238, 194)
VIO = (74, 42, 214)
PINK = (239, 216, 232)
GREEN1, GREEN2, GREEN3 = (150, 187, 150), (118, 164, 128), (92, 140, 108)
WOOD_T = (214, 172, 134)         # table top
WOOD_L = (228, 192, 156)
WOOD_F = (172, 126, 98)          # front face
WOOD_D = (146, 104, 82)


class Cv:
    """RGBA canvas with 2x supersampling; every coordinate is in 1600x900 output pixels."""

    def __init__(self, fill=(0, 0, 0, 0)):
        self.im = Image.new("RGBA", (W * SS, H * SS), fill)
        self.d = ImageDraw.Draw(self.im)

    def P(self, pts):
        return [(x * SS, y * SS) for x, y in pts]

    def poly(self, pts, fill=None, ol=None, w=2):
        self.d.polygon(self.P(pts), fill=fill)
        if ol:
            self.d.line(self.P(list(pts) + [pts[0]]), fill=ol, width=max(1, int(w * SS)), joint="curve")

    def rect(self, x0, y0, x1, y1, fill=None, ol=None, w=2, r=0):
        box = [x0 * SS, y0 * SS, x1 * SS, y1 * SS]
        if r:
            self.d.rounded_rectangle(box, r * SS, fill=fill, outline=ol, width=max(1, int(w * SS)))
        else:
            self.d.rectangle(box, fill=fill, outline=ol, width=max(1, int(w * SS)))

    def ell(self, cx, cy, rx, ry, fill=None, ol=None, w=2):
        self.d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS],
                       fill=fill, outline=ol, width=max(1, int(w * SS)))

    def line(self, pts, fill, w=2):
        self.d.line(self.P(pts), fill=fill, width=max(1, int(w * SS)), joint="curve")

    def vgrad(self, x0, y0, x1, y1, c0, c1):
        n = int((y1 - y0) * SS)
        for i in range(n):
            t = i / max(1, n - 1)
            c = tuple(int(c0[k] + (c1[k] - c0[k]) * t) for k in range(3)) + (255,)
            y = y0 * SS + i
            self.d.line([(x0 * SS, y), (x1 * SS, y)], fill=c)

    def glow(self, cx, cy, r, col, alpha):
        m = Image.new("L", self.im.size, 0)
        ImageDraw.Draw(m).ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=alpha)
        m = m.filter(ImageFilter.GaussianBlur(r * SS * 0.45))
        lay = Image.new("RGBA", self.im.size, col + (0,))
        lay.putalpha(m)
        self.im = Image.alpha_composite(self.im, lay)
        self.d = ImageDraw.Draw(self.im)

    def out(self):
        return self.im.resize((W, H), Image.LANCZOS)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# ---------------------------------------------------------------- small drawables
def leaf(cv, x, y, ang, length, wd, col, ol=None):
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    left, right = [], []
    for i in range(0, 9):
        t = i / 8
        k = wd * math.sin(math.pi * t) ** 0.8
        px, py = x + dx * length * t, y + dy * length * t
        left.append((px + nx * k, py + ny * k))
        right.append((px - nx * k, py - ny * k))
    cv.poly(left + right[::-1], fill=col + (255,), ol=ol, w=1.5)


def plant(cv, x, y, s, pot=(201, 150, 120), leaves=GREEN2, ol=None):
    """Potted plant, base centre (x, y), s = height scale."""
    for ang, ln, wd, c in ((-100, 150, 20, leaves), (-70, 130, 18, GREEN1), (-130, 125, 18, GREEN1),
                           (-45, 100, 15, leaves), (-155, 100, 15, leaves), (-88, 110, 15, GREEN3)):
        leaf(cv, x, y - 28 * s, ang, ln * s, wd * s, c, ol)
    cv.poly([(x - 40 * s, y - 62 * s), (x + 40 * s, y - 62 * s), (x + 30 * s, y), (x - 30 * s, y)],
            fill=pot + (255,), ol=ol, w=1.5)
    cv.rect(x - 44 * s, y - 72 * s, x + 44 * s, y - 56 * s, fill=mix(pot, (255, 255, 255), .18) + (255,), ol=ol, w=1.5, r=3)


def flower(cv, x, y, r, col, ol=None, centre=YEL):
    pc = col + (255,)
    for i in range(6):
        a = math.pi * 2 * i / 6 + 0.3
        cv.ell(x + math.cos(a) * r * .62, y + math.sin(a) * r * .62, r * .55, r * .55, fill=pc, ol=ol, w=1)
    cv.ell(x, y, r * .42, r * .42, fill=centre + (255,), ol=ol, w=1)


def lily(cv, x, y, r, col, ol=None):
    pts = []
    for i in range(12):
        a = math.pi * 2 * i / 12 - math.pi / 2
        rr = r if i % 2 == 0 else r * .38
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    cv.poly(pts, fill=col + (255,), ol=ol, w=1.2)
    cv.ell(x, y, r * .16, r * .16, fill=(224, 124, 60, 255))


def bucket(cv, x, y, w, h, col=(201, 197, 222), ol=None):
    cv.poly([(x - w / 2, y - h), (x + w / 2, y - h), (x + w / 2 - w * .1, y), (x - w / 2 + w * .1, y)],
            fill=col + (255,), ol=ol, w=1.5)
    cv.rect(x - w / 2 - 4, y - h - 6, x + w / 2 + 4, y - h + 8, fill=mix(col, (255, 255, 255), .25) + (255,), ol=ol, w=1.5, r=3)
    cv.line([(x - w * .3, y - h * .55), (x + w * .3, y - h * .55)], fill=mix(col, (120, 110, 170), .4) + (255,), w=2)


def bouquet(cv, cx, base_y, spread, ol=None):
    """Flowers fanning up from (cx, base_y): stems, leaves, heads."""
    cols = [(155, 134, 224), YEL, (240, 169, 196), (251, 246, 236), (244, 162, 97), (183, 163, 240)]
    heads = [(-0.70, -0.95, 0), (-0.30, -1.15, 1), (0.15, -1.25, 2), (0.62, -1.02, 3), (0.92, -0.72, 3),
             (-0.95, -0.58, 5), (-0.48, -0.78, 3), (0.1, -0.88, 0), (0.50, -0.70, 2), (0.0, -1.05, 1)]
    for hx, hy, ci in heads:
        cv.line([(cx, base_y), (cx + hx * spread * .5, base_y + hy * spread * .5), (cx + hx * spread, base_y + hy * spread)],
                fill=GREEN3 + (255,), w=3)
    for ang in (-140, -40, -110, -70):
        leaf(cv, cx, base_y - 8, ang, spread * .5, spread * .09, GREEN2 if ang % 20 else GREEN1, ol)
    for k, (hx, hy, ci) in enumerate(heads):
        x, y = cx + hx * spread, base_y + hy * spread
        if ci == 4:
            lily(cv, x, y, spread * .17, (247, 214, 120), ol)
        else:
            flower(cv, x, y, spread * (.13 if k < 6 else .1), cols[ci], ol)


# ---------------------------------------------------------------- backgrounds
def cafe_bg(var):
    cv = Cv((0, 0, 0, 255))
    cv.vgrad(0, 0, W, H, (240, 233, 250), (247, 239, 228))
    # window
    wx = 70 if var == 0 else 1010 if var == 1 else 880
    cv.rect(wx, 70, wx + 400, 560, fill=(252, 246, 232, 255), r=8)
    cv.vgrad(wx + 18, 88, wx + 382, 542, (212, 224, 250), (240, 240, 252))
    for (cx, cy, r, c) in ((wx + 90, 440, 90, (186, 211, 186)), (wx + 250, 470, 110, (170, 202, 176)), (wx + 330, 410, 70, (200, 222, 196))):
        cv.ell(cx, cy, r, r * .9, fill=c + (255,))
    cv.rect(wx + 190, 88, wx + 210, 542, fill=(252, 246, 232, 255))
    cv.rect(wx + 18, 290, wx + 382, 310, fill=(252, 246, 232, 255))
    # menu board
    bx = 560 if var == 0 else 150 if var == 1 else 300
    cv.rect(bx, 60, bx + 330, 290, fill=(236, 226, 214, 255), r=6)
    cv.rect(bx + 12, 72, bx + 318, 278, fill=(98, 82, 128, 255), r=4)
    for i in range(6):
        yy = 105 + i * 26
        cv.line([(bx + 40, yy), (bx + 40 + 150 + (i * 37) % 70, yy)], fill=(236, 230, 246, 255), w=4)
        cv.line([(bx + 270, yy), (bx + 292, yy)], fill=YEL + (255,), w=4)
    # pendant lamps
    for lx, ly in ((1130 if var == 0 else 620, 170), (1310 if var == 0 else 760, 130)):
        cv.glow(lx, ly + 60, 120, (255, 238, 176), 150)
        cv.line([(lx, 0), (lx, ly)], fill=(120, 96, 90, 255), w=3)
        cv.poly([(lx - 26, ly + 44), (lx + 26, ly + 44), (lx + 14, ly), (lx - 14, ly)], fill=YEL + (255,))
        cv.ell(lx, ly + 46, 26, 6, fill=YEL_S + (255,))
    # wall shelves
    sx = 1020 if var == 0 else 60 if var == 1 else 1120
    for yy, items in ((300, 0), (440, 1)):
        cv.rect(sx, yy, sx + 520, yy + 14, fill=(190, 150, 118, 255))
        for bxx in (sx + 40, sx + 440):
            cv.poly([(bxx, yy + 14), (bxx + 22, yy + 14), (bxx, yy + 44)], fill=(160, 124, 100, 255))
        for k in range(4):
            x = sx + 70 + k * 105
            if items == 0:
                cv.rect(x, yy - 52, x + 54, yy, fill=(250, 248, 244, 255), r=6)   # cups
                cv.rect(x + 54, yy - 38, x + 66, yy - 14, fill=(250, 248, 244, 255), r=5)
            else:
                cv.rect(x, yy - 70, x + 62, yy, fill=(222, 212, 238, 255), r=8)    # jars
                cv.rect(x - 2, yy - 82, x + 64, yy - 66, fill=(190, 160, 130, 255), r=4)
        plant(cv, sx + 470, yy, .55, pot=(205, 160, 130))
    # back counter + machine
    cv.vgrad(0, 640, W, H, (190, 150, 124), (156, 118, 98))
    cv.rect(0, 628, W, 656, fill=(222, 184, 150, 255))
    for k in range(0, W, 210):
        cv.rect(k + 14, 682, k + 196, H, fill=(168, 128, 104, 255), r=6)
    mx = 300 if var == 0 else 1180 if var == 1 else 140
    cv.rect(mx, 470, mx + 200, 628, fill=(205, 198, 224, 255), r=10)
    cv.rect(mx + 14, 484, mx + 186, 520, fill=(176, 168, 206, 255), r=6)
    cv.rect(mx + 30, 540, mx + 70, 628, fill=(120, 106, 150, 255))
    cv.ell(mx + 150, 560, 16, 16, fill=YEL + (255,))
    for k in range(3):
        cv.rect(mx + 240 + k * 54, 570, mx + 280 + k * 54, 628, fill=(238, 226, 214, 255), r=5)
    plant(cv, mx + 460 if var != 1 else mx - 160, 628, .7)
    im = cv.out()
    im = im.filter(ImageFilter.GaussianBlur(3.2)).convert("RGB")
    return Image.blend(im, Image.new("RGB", (W, H), (246, 239, 236)), 0.22)


def office_bg(var):
    cv = Cv((0, 0, 0, 255))
    cv.vgrad(0, 0, W, H, (236, 232, 250), (246, 241, 247))
    wx = 430 if var == 0 else 400
    cv.rect(wx, 60, wx + 740, 600, fill=(250, 246, 238, 255), r=8)
    cv.vgrad(wx + 18, 78, wx + 722, 582, (206, 220, 250), (236, 238, 252))
    # skyline
    for (x, w, h, c) in ((30, 90, 200, (196, 189, 236)), (140, 70, 140, (210, 204, 242)), (230, 110, 250, (190, 182, 232)),
                         (360, 80, 170, (206, 200, 240)), (460, 120, 220, (194, 186, 234)), (600, 90, 150, (210, 204, 242)),
                         ):
        cv.rect(wx + 18 + x, 582 - h, wx + 18 + x + w, 582, fill=c + (255,))
    for i in range(0, 12):                                   # blinds (upper half closed)
        yy = 78 + i * 22
        cv.rect(wx + 18, yy, wx + 722, yy + 15, fill=(248, 242, 232, 255))
        cv.rect(wx + 18, yy + 15, wx + 722, yy + 19, fill=(214, 204, 220, 255))
    cv.rect(wx + 18, 340, wx + 722, 348, fill=(214, 204, 220, 255))
    cv.line([(wx + 680, 348), (wx + 680, 430)], fill=(190, 180, 205, 255), w=3)
    cv.ell(wx + 680, 436, 6, 6, fill=(190, 180, 205, 255))
    # wall poster
    px = 100 if var == 0 else 1220
    cv.rect(px, 110, px + 300, 400, fill=(250, 246, 238, 255), r=6)
    cv.rect(px + 16, 126, px + 284, 384, fill=LAV3 + (255,), r=4)
    cv.ell(px + 150, 235, 70, 70, fill=YEL + (255,))
    cv.poly([(px + 16, 384), (px + 120, 270), (px + 190, 340), (px + 240, 300), (px + 284, 384)], fill=VIO + (255,))
    # shelf with books
    sx = 1200 if var == 0 else 40
    cv.rect(sx, 420, sx + 340, 434, fill=(200, 164, 132, 255))
    bk = [(VIO, 100), (YEL, 78), (LAV2, 92), (CREAM, 70), (GREEN2, 86), (PINK, 74), (LAV3, 96)]
    x = sx + 18
    for c, h in bk:
        cv.rect(x, 420 - h, x + 34, 420, fill=c + (255,), r=3)
        x += 38
    plant(cv, sx + 300, 420, .5)
    # back desk + cabinet
    cv.vgrad(0, 700, W, H, (206, 190, 214), (184, 166, 198))
    cv.rect(0, 690, W, 712, fill=(226, 196, 164, 255))
    for k in range(0, W, 260):
        cv.rect(k + 16, 730, k + 244, H, fill=(196, 178, 208, 255), r=6)
    plant(cv, 1480 if var == 0 else 200, 690, .8)
    im = cv.out().filter(ImageFilter.GaussianBlur(3.2)).convert("RGB")
    return Image.blend(im, Image.new("RGB", (W, H), (242, 238, 246)), 0.22)


def flower_bg(var):
    cv = Cv((0, 0, 0, 255))
    cv.vgrad(0, 0, W, H, (240, 232, 250), (248, 240, 232))
    # awning stripes
    for i in range(0, 20):
        c = LAV3 if i % 2 == 0 else YEL_S
        cv.poly([(i * 90, 0), (i * 90 + 90, 0), (i * 90 + 90, 70), (i * 90, 70)], fill=c + (255,))
        cv.ell(i * 90 + 45, 70, 45, 22, fill=c + (255,))
    wx = 70 if var == 0 else 1050
    cv.rect(wx, 140, wx + 420, 620, fill=(252, 246, 232, 255), r=8)
    cv.vgrad(wx + 18, 158, wx + 402, 602, (214, 226, 250), (242, 240, 252))
    cv.ell(wx + 120, 560, 120, 80, fill=(190, 214, 190, 255))
    cv.ell(wx + 300, 570, 130, 90, fill=(176, 206, 182, 255))
    cv.rect(wx + 200, 158, wx + 220, 602, fill=(252, 246, 232, 255))
    # shelves with pots
    sx = 560 if var == 0 else 60
    for yy in (260, 430):
        cv.rect(sx, yy, sx + 460, yy + 14, fill=(196, 156, 122, 255))
        for k in range(4):
            x = sx + 50 + k * 105
            cv.poly([(x - 30, yy - 56), (x + 30, yy - 56), (x + 24, yy), (x - 24, yy)], fill=((236, 228, 240) if k % 2 else (226, 190, 160)) + (255,))
            flower(cv, x, yy - 72, 24, [(155, 134, 224), (240, 169, 196), YEL, (251, 246, 236)][(k + yy) % 4])
            leaf(cv, x, yy - 56, -120, 36, 8, GREEN2)
            leaf(cv, x, yy - 56, -60, 36, 8, GREEN2)
    # hanging plant
    hx = 1180 if var == 0 else 420
    cv.line([(hx, 0), (hx, 190)], fill=(140, 110, 100, 255), w=3)
    cv.ell(hx, 215, 46, 34, fill=(222, 196, 168, 255))
    for ang in (160, 130, 100, 70, 40, 20):
        leaf(cv, hx, 220, ang, 120, 14, GREEN2 if ang % 20 else GREEN1)
    # buckets of flowers on the floor shelf
    cols = [(155, 134, 224), YEL, (240, 169, 196), (251, 246, 236), (244, 162, 97), (183, 163, 240)]
    for i, bx in enumerate((200, 380, 560, 740, 920, 1100, 1280, 1460)):
        bucket(cv, bx, 700, 130, 110)
        for j in range(5):
            fx = bx - 40 + j * 20
            fy = 540 - ((i * 7 + j * 13) % 40)
            cv.line([(fx, 600), (fx, fy)], fill=GREEN3 + (255,), w=3)
            flower(cv, fx, fy, 22, cols[(i + j) % 6])
        leaf(cv, bx - 20, 600, -120, 60, 10, GREEN2)
        leaf(cv, bx + 20, 600, -60, 60, 10, GREEN2)
    cv.vgrad(0, 700, W, H, (214, 190, 170), (190, 160, 140))
    im = cv.out().filter(ImageFilter.GaussianBlur(3.4)).convert("RGB")
    return Image.blend(im, Image.new("RGB", (W, H), (246, 238, 238)), 0.2)


BG = {"cafe": cafe_bg, "office": office_bg, "flower": flower_bg}


# ---------------------------------------------------------------- scene specs
def mk_t(sc, ox, oy):
    return lambda x, y: (x * sc + ox, y * sc + oy)


def counter_plain(mid, fg, t, far, front, lip=12, x0=-200, x1=SW + 200, end=None):
    """Counter with a horizontal top plane (mid layer, behind person) and front face (fg, over person)."""
    xe = x1 if end is None else end
    top = [t(x0, far), t(xe, far), t(xe, front), t(x0, front)]
    mid.poly(top, fill=WOOD_T + (255,), ol=OL, w=1.6)
    for k in range(5):
        yy = far + (front - far) * (k + 1) / 6
        mid.line([t(x0, yy), t(xe, yy)], fill=mix(WOOD_T, WOOD_L, .6) + (255,), w=1.4)
    face = [t(x0, front), t(xe, front), t(xe, SH + 140), t(x0, SH + 140)]
    fg.poly(face, fill=WOOD_F + (255,), ol=OL, w=1.6)
    fg.poly([t(x0, front), t(xe, front), t(xe, front + lip), t(x0, front + lip)], fill=(232, 196, 160, 255), ol=OL, w=1.4)
    for k in range(-1, 8):
        px = 40 + k * 260
        fg.poly([t(px, front + lip + 26), t(px + 210, front + lip + 26), t(px + 210, SH + 140), t(px, SH + 140)],
                fill=WOOD_D + (255,), ol=OL, w=1.4)


def make_scene(name, cut_dir):
    mid, fg = Cv(), Cv()
    sc, ox, oy = SC, -6.0, 0.0
    bg = None
    if name == "nam-pour":
        bg = cafe_bg(0)
        t = mk_t(sc, ox, oy)
        counter_plain(mid, fg, t, 650, 714)
        cx, cy = t(860, 698)
        mid.ell(cx, cy, 70 * sc, 10 * sc, fill=(150, 104, 80, 120))
    elif name == "nam-wipe":
        bg = cafe_bg(1)
        t = mk_t(sc, ox, oy)
        slope = 0.194
        far = lambda x: 575 + slope * (x - 560)
        front = lambda x: 735 + slope * (x - 900)
        xa, xb = -200, SW + 200
        mid.poly([t(xa, far(xa)), t(xb, far(xb)), t(xb, front(xb)), t(xa, front(xa))], fill=WOOD_T + (255,), ol=OL, w=1.6)
        for k in range(1, 6):
            f = k / 6
            mid.line([t(xa, far(xa) + (front(xa) - far(xa)) * f), t(xb, far(xb) + (front(xb) - far(xb)) * f)],
                     fill=mix(WOOD_T, WOOD_L, .6) + (255,), w=1.4)
        fg.poly([t(xa, front(xa)), t(xb, front(xb)), t(xb, front(xb) + 400), t(xa, front(xa) + 400)],
                fill=WOOD_F + (255,), ol=OL, w=1.6)
        fg.poly([t(xa, front(xa)), t(xb, front(xb)), t(xb, front(xb) + 14), t(xa, front(xa) + 14)],
                fill=(232, 196, 160, 255), ol=OL, w=1.4)
    elif name == "mai-look":
        bg = office_bg(0)
        t = mk_t(sc, ox, oy)
        desk(fg, t, 722)
    elif name == "mai-type":
        bg = office_bg(1)
        t = mk_t(sc, ox, oy)
        desk_top(mid, t, 618, 716)
        laptop(mid, t)
        desk_front(fg, t, 716)
    elif name == "hanh-wear":
        bg = flower_bg(0)
        t = mk_t(sc, ox, oy)
        shop_counter(fg, t, 726)
    elif name == "hanh-point":
        bg = flower_bg(1)
        t = mk_t(sc, ox, oy)
        flower_shelf(mid, t)
        shop_counter(fg, t, 650)
    elif name == "duo-cafe":
        bg = cafe_bg(2)
        t = mk_t(sc, ox, oy)
        xe = 692
        top = [t(-200, 572), t(xe, 572), t(xe, 622), t(-200, 622)]
        fg.poly(top, fill=WOOD_T + (255,), ol=OL, w=1.6)
        for k in range(1, 4):
            yy = 572 + 50 * k / 4
            fg.line([t(-200, yy), t(xe, yy)], fill=mix(WOOD_T, WOOD_L, .6) + (255,), w=1.4)
        fg.poly([t(-200, 622), t(xe, 622), t(xe, SH + 140), t(-200, SH + 140)], fill=WOOD_F + (255,), ol=OL, w=1.6)
        fg.poly([t(-200, 622), t(xe, 622), t(xe, 636), t(-200, 636)], fill=(232, 196, 160, 255), ol=OL, w=1.4)
        for k in range(-1, 3):
            px = 20 + k * 240
            fg.poly([t(px, 660), t(px + 200, 660), t(px + 200, SH + 140), t(px, SH + 140)], fill=WOOD_D + (255,), ol=OL, w=1.4)
    else:
        raise SystemExit("unknown scene " + name)
    person = Image.open(os.path.join(cut_dir, name + ".png")).convert("RGBA")
    person = person.resize((int(round(SW * sc)), int(round(SH * sc))), Image.LANCZOS)
    out = bg.convert("RGBA")
    out = Image.alpha_composite(out, mid.out())
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(person, (int(round(ox)), int(round(oy))), person)
    out = Image.alpha_composite(out, layer)
    out = Image.alpha_composite(out, fg.out())
    return out.convert("RGB")


def desk_top(cv, t, far, front):
    cv.poly([t(-200, far), t(SW + 200, far), t(SW + 200, front), t(-200, front)], fill=WOOD_L + (255,), ol=OL, w=1.6)
    for k in range(1, 5):
        yy = far + (front - far) * k / 5
        cv.line([t(-200, yy), t(SW + 200, yy)], fill=mix(WOOD_L, WOOD_T, .5) + (255,), w=1.3)


def desk_front(cv, t, front):
    cv.poly([t(-200, front), t(SW + 200, front), t(SW + 200, SH + 140), t(-200, SH + 140)], fill=(190, 160, 190, 255), ol=OL, w=1.6)
    cv.poly([t(-200, front), t(SW + 200, front), t(SW + 200, front + 14), t(-200, front + 14)], fill=(232, 204, 172, 255), ol=OL, w=1.4)
    for k in range(-1, 6):
        px = 30 + k * 270
        cv.rect(*t(px, front + 40), *t(px + 230, SH + 140), fill=(172, 140, 176, 255), ol=OL, w=1.3, r=4)


def desk(cv, t, front):
    desk_front(cv, t, front)


def shop_counter(cv, t, top):
    cv.poly([t(-200, top), t(SW + 200, top), t(SW + 200, SH + 140), t(-200, SH + 140)], fill=(176, 140, 190, 255), ol=OL, w=1.6)
    cv.poly([t(-200, top), t(SW + 200, top), t(SW + 200, top + 16), t(-200, top + 16)], fill=(240, 210, 170, 255), ol=OL, w=1.4)
    for k in range(-1, 6):
        px = 30 + k * 280
        cv.rect(*t(px, top + 46), *t(px + 240, SH + 140), fill=(156, 120, 172, 255), ol=OL, w=1.3, r=4)


def laptop(cv, t0):
    """Laptop on the desk for mai-type: deck under the typing hands, screen standing behind-right."""
    t = lambda x, y: t0(x - 74, y)
    sc_poly = [(752, 655), (992, 650), (1026, 428), (792, 438)]
    cv.poly([t(*p) for p in sc_poly], fill=(86, 74, 130, 255), ol=OL, w=1.6)
    inner = [(768, 642), (978, 638), (1008, 446), (806, 454)]
    cv.poly([t(*p) for p in inner], fill=(226, 234, 252, 255))
    cv.poly([t(*p) for p in [(806, 454), (1008, 446), (1004, 494), (803, 501)]], fill=VIO + (255,))
    for k in range(5):
        y0 = 520 + k * 22
        cv.poly([t(820 + k * 3, y0), t(940 - k * 9, y0 - 1), t(940 - k * 9, y0 + 9), t(820 + k * 3, y0 + 10)],
                fill=((247, 201, 72) if k == 1 else (176, 168, 214)) + (255,))
    deck = [(656, 706), (924, 706), (990, 652), (722, 652)]
    cv.poly([t(*p) for p in deck], fill=(196, 190, 216, 255), ol=OL, w=1.6)
    cv.poly([t(656, 706), t(924, 706), t(924, 719), t(656, 719)], fill=(150, 142, 178, 255), ol=OL, w=1.4)

    def pt(u, v):
        return 656 + 66 * v + 268 * u, 706 - 54 * v
    for r in range(4):
        for c in range(8):
            u0, v0 = 0.05 + c * 0.115, 0.10 + r * 0.21
            u1, v1 = u0 + 0.09, v0 + 0.14
            cv.poly([t(*pt(u0, v0)), t(*pt(u1, v0)), t(*pt(u1, v1)), t(*pt(u0, v1))],
                    fill=(238, 234, 246, 255), ol=(150, 142, 178, 255), w=1)

def flower_shelf(cv, t):
    """Wooden flower shelf where Hanh's finger points, with a bouquet."""
    x0, x1 = 1055, 1376 + 160
    top, bot = 230, 660
    cv.poly([t(x0 - 24, top), t(x0, top), t(x0, bot), t(x0 - 24, bot)], fill=WOOD_F + (255,), ol=OL, w=1.6)
    for yy in (top + 24, 380, 540, 624):
        cv.poly([t(x0 - 24, yy), t(x1, yy), t(x1, yy + 22), t(x0 - 24, yy + 22)], fill=WOOD_T + (255,), ol=OL, w=1.6)
    # upper shelf: pots
    for k in range(3):
        px = 1100 + k * 120
        cv.poly([t(px - 26, 232), t(px + 26, 232), t(px + 20, 252), t(px - 20, 252)], fill=(236, 228, 240, 255), ol=OL, w=1.3)
    for k in range(3):
        px = 1140 + k * 130
        x, y = t(px, 380)
        cv.poly([(x - 30, y), (x + 30, y), (x + 24, y - 44), (x - 24, y - 44)], fill=((226, 190, 160) if k % 2 else (230, 224, 244)) + (255,), ol=OL, w=1.3)
        flower(cv, x, y - 58, 22, [(240, 169, 196), YEL, (155, 134, 224)][k], ol=OL)
    # middle shelf: big bouquet in a wrapped bucket, right where the finger points
    bx, by = t(1205, 488)
    bouquet(cv, bx, by, 172 * SC, ol=OL)
    cv.poly([(bx - 64, by - 4), (bx + 64, by - 4), (bx + 44, by + 62), (bx - 44, by + 62)], fill=(201, 197, 222, 255), ol=OL, w=1.5)
    cv.rect(bx - 70, by - 10, bx + 70, by + 6, fill=(220, 216, 236, 255), ol=OL, w=1.5, r=3)
    # lower shelf: small buckets with flowers
    for k in range(3):
        x, y = t(1125 + k * 105, 624)
        for j in range(3):
            fx = x - 18 + j * 18
            cv.line([(fx, y - 40), (fx, y - 66 - 6 * ((k + j) % 2))], fill=GREEN3 + (255,), w=2.5)
            flower(cv, fx, y - 70 - 6 * ((k + j) % 2), 12, [(155, 134, 224), YEL, (240, 169, 196)][(k + j) % 3], ol=OL)
        bucket(cv, x, y, 80, 46, ol=OL)


SCENES = ["nam-pour", "nam-wipe", "mai-look", "mai-type", "hanh-wear", "hanh-point", "duo-cafe"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cut", default=os.path.join("..", "nguon-hinh", "unit1-cut"))
    ap.add_argument("--out", default=os.path.join("..", "nguon-hinh", "agy-anh"))
    ap.add_argument("--only", default="")
    ap.add_argument("--contact", default="")
    a = ap.parse_args()
    names = [n for n in a.only.split(",") if n] or SCENES
    for n in names:
        if n not in SCENES:
            print("unknown scene: " + n, file=sys.stderr)
            return 1
        if not os.path.exists(os.path.join(a.cut, n + ".png")):
            print("missing cut-out: " + os.path.join(a.cut, n + ".png"), file=sys.stderr)
            return 3
    os.makedirs(a.out, exist_ok=True)
    done = []
    for n in names:
        im = make_scene(n, a.cut)
        p = os.path.join(a.out, n + ".png")
        im.save(p)
        done.append(im)
        print("wrote", p, im.size)
    if a.contact:
        cols = 2
        rows = (len(done) + 1) // 2
        sheet = Image.new("RGB", (cols * 800, rows * 450), (255, 255, 255))
        for i, im in enumerate(done):
            sheet.paste(im.resize((800, 450), Image.LANCZOS), ((i % cols) * 800, (i // cols) * 450))
        sheet.save(a.contact, quality=88)
    return 0


if __name__ == "__main__":
    sys.exit(main())
