"""
HArmony Logo Generator
Erzeugt das Logo in beliebiger Größe als PNG, Dark- oder Light-Version.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

POPPINS_BOLD = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"

# Markenfarben
BLUE = (26, 169, 229)        # cyan/blau Haus
BLUE_GLOW = (90, 210, 255)   # heller blauer Glow
YELLOW = (245, 185, 33)      # gold Haus  
YELLOW_GLOW = (255, 220, 100) # heller gelber Glow

THEMES = {
    "dark": {
        "tile_top": (42, 56, 78),       # tile gradient top
        "tile_bottom": (24, 32, 46),    # tile gradient bottom
        "letter": (255, 255, 255),       # H, A and HArmony
        "letter_glow": (255, 255, 255),
        "with_tile": True,
    },
    "light": {
        "tile_top": (255, 255, 255),
        "tile_bottom": (236, 240, 247),
        "letter": (20, 30, 50),          # dunkles Navy
        "letter_glow": (180, 200, 230),
        "with_tile": True,
    },
    "transparent": {                      # ohne tile, für flexible Verwendung
        "tile_top": None,
        "tile_bottom": None,
        "letter": (255, 255, 255),
        "letter_glow": (255, 255, 255),
        "with_tile": False,
    },
}


def draw_house(draw, cx, cy, w, h, color, stroke):
    """Zeichnet einen Haus-Umriss (Pentagon) mit Strichdicke."""
    half_w = w / 2
    half_h = h / 2
    roof_h = h * 0.32  # Dach-Höhe
    
    points = [
        (cx, cy - half_h),                  # Dachspitze
        (cx + half_w, cy - half_h + roof_h), # rechte Dachecke
        (cx + half_w, cy + half_h),          # rechts unten
        (cx - half_w, cy + half_h),          # links unten
        (cx - half_w, cy - half_h + roof_h), # linke Dachecke
    ]
    points.append(points[0])  # schließen
    
    # Strich
    draw.line(points, fill=color, width=stroke, joint="curve")
    # Ecken sauber abdecken
    for p in points:
        draw.ellipse([p[0]-stroke//2, p[1]-stroke//2,
                      p[0]+stroke//2, p[1]+stroke//2], fill=color)


def make_tile_gradient(size, top_rgb, bot_rgb):
    """Vertikaler Farbverlauf als Bild."""
    grad = Image.new("RGB", (1, size), top_rgb)
    px = grad.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(top_rgb[0] * (1-t) + bot_rgb[0] * t)
        g = int(top_rgb[1] * (1-t) + bot_rgb[1] * t)
        b = int(top_rgb[2] * (1-t) + bot_rgb[2] * t)
        px[0, y] = (r, g, b)
    return grad.resize((size, size))


def rounded_mask(size, radius):
    """Maske für gerundete Ecken."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    return mask


def render_logo(size: int, theme: str = "dark", show_text: bool = True) -> Image.Image:
    """
    Rendert das Logo in der gegebenen Größe und Theme.
    show_text=False für sehr kleine Icons (favicon 16/32) wo "HArmony" Text unleserlich wäre.
    """
    cfg = THEMES[theme]
    
    # Hochauflösend rendern, dann runterskalieren für glatte Kanten (4x supersampling)
    SS = 4 if size < 256 else 2
    N = size * SS
    
    canvas = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    
    # 1) Tile (gerundetes Quadrat mit Verlauf)
    if cfg["with_tile"]:
        radius = int(N * 0.20)
        grad = make_tile_gradient(N, cfg["tile_top"], cfg["tile_bottom"])
        mask = rounded_mask(N, radius)
        tile = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        tile.paste(grad, (0, 0), mask)
        canvas = Image.alpha_composite(canvas, tile)
    
    # 2) Häuser
    # Layout: zwei Häuser nebeneinander, leicht überlappend wirken sie verbunden
    if show_text:
        houses_cy = N * 0.40        # Häuser-Mitte vertikal
        houses_h = N * 0.46
    else:
        houses_cy = N * 0.50         # ohne Text: zentriert
        houses_h = N * 0.62
    
    house_w = houses_h * 0.92        # Häuser etwas schmaler als hoch
    stroke = max(int(N * 0.018), 2)
    gap = -int(stroke * 0.4)         # leichte Überlappung am Rand
    
    total_w = house_w * 2 + gap
    left_cx = N/2 - house_w/2 - gap/2
    right_cx = N/2 + house_w/2 + gap/2
    
    # Glow-Layer: Häuser dicker und unscharf für Neon-Effekt
    glow_layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    glow_stroke = stroke * 3
    draw_house(gd, left_cx, houses_cy, house_w, houses_h, BLUE_GLOW + (160,), glow_stroke)
    draw_house(gd, right_cx, houses_cy, house_w, houses_h, YELLOW_GLOW + (160,), glow_stroke)
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=N*0.012))
    canvas = Image.alpha_composite(canvas, glow_layer)
    
    # Solide Häuser-Umrisse drüber
    house_layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    hd = ImageDraw.Draw(house_layer)
    draw_house(hd, left_cx, houses_cy, house_w, houses_h, BLUE + (255,), stroke)
    draw_house(hd, right_cx, houses_cy, house_w, houses_h, YELLOW + (255,), stroke)
    canvas = Image.alpha_composite(canvas, house_layer)
    
    # 3) Buchstaben H und A in den Häusern
    # Schriftgröße proportional zur Haushöhe - im Hausinneren
    letter_size = int(houses_h * 0.50)
    letter_font = ImageFont.truetype(POPPINS_BOLD, letter_size)
    
    letter_layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ld = ImageDraw.Draw(letter_layer)
    
    letter_y = houses_cy + houses_h * 0.04  # leicht unter Häusermitte
    for cx, char in [(left_cx, "H"), (right_cx, "A")]:
        bbox = ld.textbbox((0, 0), char, font=letter_font, anchor="mm")
        ld.text((cx, letter_y), char, fill=cfg["letter"] + (255,),
                font=letter_font, anchor="mm")
    
    # Soft glow auf Buchstaben (für Neon-Look bei Dark)
    if theme == "dark":
        glow = letter_layer.filter(ImageFilter.GaussianBlur(radius=N*0.008))
        # Glow stärker machen
        glow_alpha = glow.split()[3].point(lambda x: min(255, int(x * 1.4)))
        glow.putalpha(glow_alpha)
        canvas = Image.alpha_composite(canvas, glow)
    canvas = Image.alpha_composite(canvas, letter_layer)
    
    # 4) "HArmony" Wortmarke
    if show_text:
        word_size = int(N * 0.115)
        word_font = ImageFont.truetype(POPPINS_BOLD, word_size)
        word_y = N * 0.80
        
        word_layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        wd = ImageDraw.Draw(word_layer)
        wd.text((N/2, word_y), "HArmony", fill=cfg["letter"] + (255,),
                font=word_font, anchor="mm")
        
        if theme == "dark":
            wglow = word_layer.filter(ImageFilter.GaussianBlur(radius=N*0.006))
            wglow_alpha = wglow.split()[3].point(lambda x: min(255, int(x * 1.2)))
            wglow.putalpha(wglow_alpha)
            canvas = Image.alpha_composite(canvas, wglow)
        canvas = Image.alpha_composite(canvas, word_layer)
    
    # Runterskalieren auf Zielgröße - LANCZOS für scharfe Kanten
    if SS > 1:
        canvas = canvas.resize((size, size), Image.LANCZOS)
    
    return canvas


if __name__ == "__main__":
    # Schnelltest
    out = Path("/home/claude/work")
    for theme in ["dark", "light"]:
        img = render_logo(512, theme)
        img.save(out / f"test_{theme}_512.png")
        print(f"Generated test_{theme}_512.png")
