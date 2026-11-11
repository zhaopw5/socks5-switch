"""生成 SOCKS5 扩展图标（开 / 关 两套）。

开：蓝色渐变底 + 白色双向箭头
关：灰色渐变底 + 浅灰双向箭头（同一形状，只换配色，16px 也能一眼区分）

用法：python make_icon.py
输出：../icons/{16,32,48,128}.png（开）与 ../icons/off/{16,32,48,128}.png（关）
"""

import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
S = 1024

THEMES = {
    "on": {"bg": ((37, 99, 235), (22, 33, 74)), "fg": (255, 255, 255)},
    "off": {"bg": ((156, 163, 175), (75, 85, 99)), "fg": (226, 232, 240)},
}


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def gradient(size, top, bottom):
    g = Image.new("RGB", (1, size))
    for y in range(size):
        g.putpixel((0, y), lerp(top, bottom, y / (size - 1)))
    return g.resize((size, size))


def arrow_right(d, y, x0, x1, shaft, head_w, head_l, color):
    d.polygon(
        [
            (x0, y - shaft / 2),
            (x1 - head_l, y - shaft / 2),
            (x1 - head_l, y - head_w / 2),
            (x1, y),
            (x1 - head_l, y + head_w / 2),
            (x1 - head_l, y + shaft / 2),
            (x0, y + shaft / 2),
        ],
        fill=color,
    )


def arrow_left(d, y, x0, x1, shaft, head_w, head_l, color):
    d.polygon(
        [
            (x1, y - shaft / 2),
            (x0 + head_l, y - shaft / 2),
            (x0 + head_l, y - head_w / 2),
            (x0, y),
            (x0 + head_l, y + head_w / 2),
            (x0 + head_l, y + shaft / 2),
            (x1, y + shaft / 2),
        ],
        fill=color,
    )


def build(theme):
    bg = gradient(S, *theme["bg"]).convert("RGBA")
    bg.putalpha(rounded_mask(S, int(S * 0.225)))

    glyph = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(glyph)

    left, right = S * 0.185, S * 0.815
    shaft = S * 0.105
    head_w = S * 0.245
    head_l = S * 0.175
    color = theme["fg"]

    arrow_right(d, S * 0.355, left, right, shaft, head_w, head_l, color)
    arrow_left(d, S * 0.645, left, right, shaft, head_w, head_l, color)
    return Image.alpha_composite(bg, glyph)


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "off"), exist_ok=True)
    for name, theme in THEMES.items():
        icon = build(theme)
        target = ROOT if name == "on" else os.path.join(ROOT, "off")
        for size in (16, 32, 48, 128):
            icon.resize((size, size), Image.LANCZOS).save(os.path.join(target, f"{size}.png"))
        print("wrote", name)


if __name__ == "__main__":
    main()
