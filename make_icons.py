"""Generate the extension's PNG icons from pure Python (stdlib only).

Draws an original icon — a gradient badge with a white speech bubble and purple
audio bars — and supersamples it for smooth edges at 16/32/48/128 px.
Run:  python make_icons.py
"""

import os
import struct
import zlib

# --- Palette (all original; no third-party artwork) ---------------------------
C1 = (0x63, 0x66, 0xF1)      # gradient start (indigo)
C2 = (0xA8, 0x55, 0xF7)      # gradient end   (violet)
WHITE = (255, 255, 255)
PURPLE = (0x6D, 0x28, 0xD9)  # audio bars

SS = 4  # supersampling factor for anti-aliasing

# Geometry in a 128-unit design space (matches icon.svg):
BADGE = (0, 0, 128, 128, 28)          # x, y, w, h, radius
BUBBLE = (22, 26, 84, 54, 16)
TAIL = (38, 78, 38, 98, 60, 80)       # triangle: ax,ay,bx,by,cx,cy
BARS = [                               # x, y, w, h  (radius 4)
    (39, 44, 8, 18),
    (53, 38, 8, 30),
    (67, 42, 8, 22),
    (81, 47, 8, 12),
]


def rounded_rect_inside(px, py, x, y, w, h, r):
    # Signed-distance test for a rounded rectangle.
    qx = max(x + r - px, px - (x + w - r), 0.0)
    qy = max(y + r - py, py - (y + h - r), 0.0)
    return qx * qx + qy * qy <= r * r


def triangle_inside(px, py, ax, ay, bx, by, cx, cy):
    def sign(x1, y1, x2, y2, x3, y3):
        return (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)

    d1 = sign(px, py, ax, ay, bx, by)
    d2 = sign(px, py, bx, by, cx, cy)
    d3 = sign(px, py, cx, cy, ax, ay)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


def gradient(u, v):
    t = max(0.0, min(1.0, (u + v) / 256.0))
    return (
        round(C1[0] + (C2[0] - C1[0]) * t),
        round(C1[1] + (C2[1] - C1[1]) * t),
        round(C1[2] + (C2[2] - C1[2]) * t),
    )


def sample(u, v):
    """Return (r, g, b, a) for a point in 128-unit design space."""
    if not rounded_rect_inside(u, v, *BADGE):
        return (0, 0, 0, 0)  # transparent outside the badge

    rgb = gradient(u, v)

    if rounded_rect_inside(u, v, *BUBBLE, ) or triangle_inside(u, v, *TAIL):
        rgb = WHITE

    for (bx, by, bw, bh) in BARS:
        if rounded_rect_inside(u, v, bx, by, bw, bh, 4):
            rgb = PURPLE
            break

    return (rgb[0], rgb[1], rgb[2], 255)


def render(size):
    """Render at size*SS then box-downsample (alpha-weighted) to `size`."""
    hi = size * SS
    # Supersampled buffer.
    buf = [None] * (hi * hi)
    scale = 128.0 / hi
    for j in range(hi):
        v = (j + 0.5) * scale
        row = j * hi
        for i in range(hi):
            u = (i + 0.5) * scale
            buf[row + i] = sample(u, v)

    # Downsample.
    out = bytearray(size * size * 4)
    n = SS * SS
    for oy in range(size):
        for ox in range(size):
            ar = ag = ab = aa = 0
            for dy in range(SS):
                base = (oy * SS + dy) * hi + ox * SS
                for dx in range(SS):
                    r, g, b, a = buf[base + dx]
                    aa += a
                    ar += r * a
                    ag += g * a
                    ab += b * a
            oa = aa // n
            if aa > 0:
                r = ar // aa
                g = ag // aa
                b = ab // aa
            else:
                r = g = b = 0
            idx = (oy * size + ox) * 4
            out[idx] = r
            out[idx + 1] = g
            out[idx + 2] = b
            out[idx + 3] = oa
    return out


def write_png(path, size, rgba):
    def chunk(typ, data):
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA, 8-bit
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # no filter
        raw.extend(rgba[y * stride:(y + 1) * stride])
    idat = zlib.compress(bytes(raw), 9)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    for size in (16, 32, 48, 128):
        rgba = render(size)
        out = os.path.join(here, f"icon{size}.png")
        write_png(out, size, rgba)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
