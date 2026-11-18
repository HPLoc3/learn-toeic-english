#!/usr/bin/env python3
"""make-icons.py - sinh icon PNG cho PWA bang hinh hoc thuan (chi dung thu vien chuan).
Hinh: nen tim #4a2ad6 bo goc, 3 bac thang trang tang dan. Khong chu, khong tai san sach.
Chay: python tools/make-icons.py  (ghi vao assets/icons/)"""
import os, struct, zlib

BG = (0x4A, 0x2A, 0xD6)
FG = (255, 255, 255)
# Toa do chuan hoa 0..1 (nam trong vung an toan 20%..80% de dung duoc cho maskable)
STEPS = [(0.24, 0.40, 0.58), (0.42, 0.58, 0.44), (0.60, 0.76, 0.30)]  # (x0, x1, top)
BOTTOM = 0.74
STEP_R = 0.025
BG_R = 0.22


def in_round_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def sample(x, y, rounded):
    """Tra ve (r,g,b,a) 0..255 cho diem chuan hoa."""
    if rounded and not in_round_rect(x, y, 0, 0, 1, 1, BG_R):
        return (0, 0, 0, 0)
    for x0, x1, top in STEPS:
        if in_round_rect(x, y, x0, top, x1, BOTTOM, STEP_R):
            return FG + (255,)
    return BG + (255,)


def render(size, rounded):
    n = 3  # sieu lay mau n x n de khu rang cua
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = a = 0
            for sy in range(n):
                for sx in range(n):
                    cr, cg, cb, ca = sample((px + (sx + .5) / n) / size, (py + (sy + .5) / n) / size, rounded)
                    r += cr * ca
                    g += cg * ca
                    b += cb * ca
                    a += ca
            if a == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((round(r / a), round(g / a), round(b / a), round(a / (n * n))))
        rows.append(bytes(row))
    return b"".join(rows)


def png(size, rounded):
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = render(size, rounded)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "icons")
    os.makedirs(out, exist_ok=True)
    for name, size, rounded in (("icon-192.png", 192, True), ("icon-512.png", 512, True),
                                ("icon-maskable-512.png", 512, False), ("apple-touch-icon.png", 180, False)):
        with open(os.path.join(out, name), "wb") as f:
            f.write(png(size, rounded))
        print("ghi", name, size)


if __name__ == "__main__":
    main()
