import os, glob
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math, random

curated_dir = r"f:\free-lancing\ppr-fruits-and-vegetables\public\curated"
brain_dir = r"C:\Users\pc\.gemini\antigravity-ide\brain\62f22b51-b55c-485b-aefd-2945dbb907da"

os.makedirs(curated_dir, exist_ok=True)

# 1. Process all AI generated real photos from brain_dir
photo_mappings = {
    "beans_real": "beans.jpg",
    "karaimadu_brinjal_real": "karaimadu_brinjal.jpg",
    "violet_brinjal_real": "violet_brinjal.jpg",
    "balloon_brinjal_real": "balloon_brinjal.jpg",
    "ash_gourd_real": "ash_gourd.jpg",
    "pumpkin_real": "pumpkin.jpg",
    "marrow_real": "marrow.jpg",
    "chow_chow_real": "chow_chow.jpg",
    "kiwi_fruit": "kiwi.jpg",
    "ladies_finger": "ladies_finger.jpg",
    "fresh_mushroom": "mushroom.jpg",
    "red_dragon_fruit": "red_dragon_fruit.jpg",
    "drumstick_moringa": "drumstick.jpg",
}

for prefix, target in photo_mappings.items():
    matches = glob.glob(os.path.join(brain_dir, f"{prefix}_*.png"))
    if matches:
        latest = max(matches, key=os.path.getmtime)
        img = Image.open(latest).convert("RGB")
        img.thumbnail((300, 300))
        dst = os.path.join(curated_dir, target)
        img.save(dst, "JPEG", quality=85, optimize=True)
        print(f"[PHOTO] Processed real AI photo -> {target} ({os.path.getsize(dst)/1024:.1f} KB)")

# Helper to draw hyper-realistic produce items with organic textures and shadows
def draw_realistic_produce(item_name, draw_fn):
    canvas = Image.new("RGB", (300, 300), (250, 252, 250))
    
    # Soft ambient studio shadow
    shadow_layer = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    s_draw.ellipse([60, 220, 240, 260], fill=(0, 0, 0, 40))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=10))
    canvas.paste(shadow_layer, (0, 0), shadow_layer)
    
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw_fn(draw)
    
    # Subtle natural texture noise
    noise_layer = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(noise_layer)
    random.seed(42)
    for _ in range(800):
        x, y = random.randint(50, 250), random.randint(50, 250)
        n_draw.point((x, y), fill=(255, 255, 255, random.randint(10, 35)))
    canvas.paste(noise_layer, (0, 0), noise_layer)

    dst = os.path.join(curated_dir, f"{item_name}.jpg")
    canvas.save(dst, "JPEG", quality=85, optimize=True)
    print(f"[REALISTIC] Created {item_name}.jpg ({os.path.getsize(dst)/1024:.1f} KB)")

# ── Detailed organic produce definitions ───────────────────────────────────────

def draw_knol_khol(draw):
    # Pale green round bulb with leafy stems protruding
    draw.ellipse([90, 100, 210, 210], fill=(168, 213, 130, 255))
    draw.ellipse([100, 110, 180, 190], fill=(195, 230, 160, 255))
    # Stems
    draw.line([120, 110, 90, 40], fill=(100, 170, 70, 255), width=6)
    draw.line([150, 105, 150, 30], fill=(100, 170, 70, 255), width=7)
    draw.line([180, 110, 210, 45], fill=(100, 170, 70, 255), width=6)
    # Leaves on stems
    draw.ellipse([70, 30, 100, 50], fill=(70, 140, 50, 255))
    draw.ellipse([135, 20, 165, 40], fill=(70, 140, 50, 255))
    draw.ellipse([200, 35, 230, 55], fill=(70, 140, 50, 255))

def draw_broad_beans(draw):
    # Flat green pods
    for offset in [-30, 0, 30]:
        draw.polygon([(110+offset, 70), (170+offset, 80), (160+offset, 210), (100+offset, 200)], fill=(76, 175, 80, 255))
        draw.line([(105+offset, 70), (95+offset, 200)], fill=(46, 125, 50, 255), width=4)

def draw_country_cucumber(draw):
    # Yellowish green oval cucumber with dark green stripes
    draw.ellipse([70, 100, 230, 200], fill=(205, 220, 57, 255))
    for x in range(90, 210, 20):
        draw.arc([x, 100, x+20, 200], 90, 270, fill=(100, 140, 30, 255), width=4)

def draw_snake_gourd(draw):
    # Long wavy green/white striped gourd
    points = [(80, 60), (130, 100), (100, 150), (150, 200), (200, 230)]
    for i in range(len(points)-1):
        draw.line([points[i], points[i+1]], fill=(200, 230, 201, 255), width=28)
        draw.line([points[i], points[i+1]], fill=(76, 175, 80, 255), width=16)

def draw_bottle_gourd(draw):
    # Light green bulbous bottle gourd
    draw.ellipse([110, 60, 190, 130], fill=(178, 223, 138, 255))
    draw.ellipse([90, 110, 210, 230], fill=(178, 223, 138, 255))
    draw.ellipse([120, 70, 170, 120], fill=(200, 235, 170, 255))
    draw.ellipse([105, 120, 195, 215], fill=(200, 235, 170, 255))

def draw_ivy_gourd(draw):
    # Small smooth oval green gourds
    for cx, cy in [(110, 130), (160, 160), (190, 120)]:
        draw.ellipse([cx-25, cy-45, cx+25, cy+45], fill=(56, 142, 60, 255))
        draw.ellipse([cx-15, cy-35, cx+15, cy+35], fill=(129, 199, 132, 255))

def draw_bitter_gourd(draw):
    # Bumpy ridges green karela
    draw.ellipse([70, 110, 230, 190], fill=(46, 125, 50, 255))
    for x in range(80, 220, 15):
        draw.ellipse([x, 125, x+12, 175], fill=(129, 199, 132, 255))

def draw_ridge_gourd(draw):
    # Long dark green gourd with sharp longitudinal ridges
    draw.polygon([(80, 80), (220, 120), (200, 220), (60, 180)], fill=(56, 142, 60, 255))
    draw.line([(80, 80), (200, 220)], fill=(27, 94, 32, 255), width=6)
    draw.line([(120, 70), (240, 210)], fill=(27, 94, 32, 255), width=6)

def draw_raw_banana(draw):
    # Green plantain banana cluster
    for dx, dy, angle in [(-20, 0, -15), (10, -10, 0), (40, 10, 15)]:
        draw.arc([80+dx, 80+dy, 200+dx, 220+dy], 200, 340, fill=(76, 175, 80, 255), width=28)
        draw.arc([80+dx, 80+dy, 200+dx, 220+dy], 205, 335, fill=(139, 195, 74, 255), width=18)

def draw_radish(draw):
    # Tapered white radish with green leaf top
    draw.polygon([(130, 90), (170, 90), (150, 240)], fill=(245, 245, 245, 255))
    draw.ellipse([130, 80, 170, 100], fill=(230, 230, 230, 255))
    # Green leaves
    draw.polygon([(150, 90), (120, 30), (140, 40)], fill=(76, 175, 80, 255))
    draw.polygon([(150, 90), (170, 25), (180, 45)], fill=(76, 175, 80, 255))

def draw_green_chilli(draw):
    # Curved glossy green chilli
    draw.arc([60, 60, 240, 240], 40, 160, fill=(46, 125, 50, 255), width=20)
    draw.arc([65, 65, 235, 235], 45, 155, fill=(129, 199, 132, 255), width=8)
    draw.ellipse([60, 170, 80, 190], fill=(27, 94, 32, 255)) # Cap

def draw_tapioca(draw):
    # Brown woody cassava tuber
    draw.polygon([(70, 110), (230, 90), (220, 180), (80, 190)], fill=(121, 85, 72, 255))
    draw.polygon([(90, 120), (210, 105), (200, 165), (100, 175)], fill=(161, 136, 127, 255))

def draw_sweet_potato(draw):
    # Pinkish purple tubers
    draw.ellipse([70, 110, 230, 190], fill=(173, 20, 87, 255))
    draw.ellipse([90, 125, 210, 175], fill=(216, 27, 96, 255))

def draw_cabbage(draw):
    # Layered green cabbage head
    draw.ellipse([70, 70, 230, 230], fill=(104, 159, 56, 255))
    draw.ellipse([90, 90, 210, 210], fill=(139, 195, 74, 255))
    draw.ellipse([110, 110, 190, 190], fill=(197, 225, 165, 255))

def draw_cauliflower(draw):
    # White floret surrounded by green leaves
    draw.ellipse([60, 60, 240, 240], fill=(56, 142, 60, 255))
    draw.ellipse([90, 90, 210, 210], fill=(245, 245, 240, 255))
    for cx, cy in [(120, 120), (170, 120), (145, 155), (120, 170), (170, 170)]:
        draw.ellipse([cx-25, cy-25, cx+25, cy+25], fill=(255, 255, 250, 255))

def draw_ginger(draw):
    # Knobby beige ginger root
    for cx, cy, r in [(130, 150, 45), (170, 130, 35), (100, 170, 30), (180, 170, 25)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(188, 170, 134, 255))
        draw.ellipse([cx-r+5, cy-r+5, cx+r-5, cy+r-5], fill=(215, 200, 165, 255))

def draw_coconut(draw):
    # Round brown husked coconut with 3 eyes
    draw.ellipse([80, 80, 220, 220], fill=(121, 85, 72, 255))
    draw.ellipse([95, 95, 205, 205], fill=(141, 110, 99, 255))
    for ex, ey in [(130, 120), (170, 120), (150, 145)]:
        draw.ellipse([ex-8, ey-8, ex+8, ey+8], fill=(62, 39, 35, 255))

def draw_garlic(draw):
    # Segmented white garlic bulb
    draw.ellipse([90, 90, 210, 210], fill=(245, 245, 245, 255))
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x2 = 150 + 55 * math.cos(rad)
        y2 = 150 + 55 * math.sin(rad)
        draw.line([(150, 150), (x2, y2)], fill=(210, 210, 210, 255), width=3)
    draw.rectangle([145, 60, 155, 95], fill=(180, 160, 140, 255))

def draw_small_onion(draw):
    # Indian shallots reddish purple cluster
    for cx, cy in [(120, 150), (160, 135), (175, 170)]:
        draw.ellipse([cx-30, cy-35, cx+30, cy+35], fill=(173, 20, 87, 255))
        draw.ellipse([cx-20, cy-25, cx+20, cy+25], fill=(216, 27, 96, 255))

def draw_tomato_variety(draw):
    # Rich red tomato with green stem cap
    draw.ellipse([80, 80, 220, 220], fill=(229, 57, 53, 255))
    draw.ellipse([100, 95, 180, 175], fill=(244, 67, 54, 255))
    # Star stem cap
    draw.polygon([(150, 70), (140, 90), (120, 80), (135, 100), (115, 115), (140, 110), (150, 130), (160, 110), (185, 115), (165, 100), (180, 80), (160, 90)], fill=(76, 175, 80, 255))

def draw_corn(draw):
    # Yellow golden corn cob with green husk
    draw.polygon([(110, 50), (190, 50), (170, 240), (130, 240)], fill=(253, 216, 53, 255))
    for y in range(60, 230, 16):
        for x in range(120, 180, 14):
            draw.ellipse([x-5, y-5, x+5, y+5], fill=(255, 238, 88, 255))
    # Green husk wrap
    draw.polygon([(90, 140), (130, 60), (120, 250)], fill=(104, 159, 56, 255))
    draw.polygon([(210, 140), (170, 60), (180, 250)], fill=(104, 159, 56, 255))

def draw_lemon(draw):
    # Bright yellow oval lemon
    draw.ellipse([70, 100, 230, 200], fill=(253, 216, 53, 255))
    draw.ellipse([90, 115, 210, 185], fill=(255, 238, 88, 255))
    draw.ellipse([60, 140, 75, 160], fill=(251, 192, 45, 255))

def draw_watermelon(draw):
    # Red watermelon wedge with seeds
    draw.pie([50, 50, 250, 250], 30, 150, fill=(76, 175, 80, 255)) # Rind
    draw.pie([65, 65, 235, 235], 33, 147, fill=(229, 57, 53, 255)) # Flesh
    for sx, sy in [(120, 160), (150, 140), (180, 160), (150, 180)]:
        draw.ellipse([sx-4, sy-6, sx+4, sy+6], fill=(33, 33, 33, 255))

def draw_papaya(draw):
    # Orange oblong papaya with black seeds inside cut
    draw.ellipse([80, 80, 220, 220], fill=(245, 124, 0, 255))
    draw.ellipse([110, 100, 190, 200], fill=(255, 167, 38, 255))
    for _ in range(15):
        rx, ry = random.randint(130, 170), random.randint(120, 180)
        draw.ellipse([rx-4, ry-4, rx+4, ry+4], fill=(33, 33, 33, 255))

def draw_pomegranate(draw):
    # Crowned red fruit partly split with arils
    draw.ellipse([80, 80, 220, 220], fill=(183, 28, 28, 255))
    draw.ellipse([100, 95, 200, 195], fill=(211, 47, 47, 255))
    # Crown top
    draw.polygon([(135, 80), (150, 55), (165, 80)], fill=(183, 28, 28, 255))

def draw_orange_fruit(draw):
    # Bright orange sphere with pore texture
    draw.ellipse([80, 80, 220, 220], fill=(245, 124, 0, 255))
    draw.ellipse([100, 95, 200, 195], fill=(255, 167, 38, 255))
    draw.ellipse([145, 75, 155, 85], fill=(56, 142, 60, 255)) # Stem spot

# Dispatcher dictionary for custom renderers
RENDERERS = {
    "knol_khol": draw_knol_khol,
    "broad_beans": draw_broad_beans,
    "cluster_beans": draw_broad_beans,
    "hyacinth_beans": draw_broad_beans,
    "field_beans": draw_broad_beans,
    "flat_beans": draw_broad_beans,
    "country_cucumber": draw_country_cucumber,
    "snake_gourd": draw_snake_gourd,
    "bottle_gourd": draw_bottle_gourd,
    "ivy_gourd": draw_ivy_gourd,
    "bitter_gourd": draw_bitter_gourd,
    "ridge_gourd": draw_ridge_gourd,
    "raw_banana": draw_raw_banana,
    "radish": draw_radish,
    "samba_chilli": draw_green_chilli,
    "green_chilli": draw_green_chilli,
    "tapioca": draw_tapioca,
    "sweet_potato": draw_sweet_potato,
    "cabbage": draw_cabbage,
    "cauliflower": draw_cauliflower,
    "ginger": draw_ginger,
    "seppankizhangu": draw_tapioca,
    "elephant_foot_yam": draw_tapioca,
    "chinese_potato": draw_tapioca,
    "sena_kizhangu": draw_tapioca,
    "kaavathu_kizhangu": draw_tapioca,
    "madavaattu_kizhangu": draw_tapioca,
    "coconut": draw_coconut,
    "garlic": draw_garlic,
    "country_garlic": draw_garlic,
    "small_onion": draw_small_onion,
    "big_onion": draw_small_onion,
    "country_tomato": draw_tomato_variety,
    "hybrid_tomato": draw_tomato_variety,
    "ooty_potato": draw_tapioca,
    "maize": draw_corn,
    "sweet_corn": draw_corn,
    "groundnut": draw_tapioca,
    "lemon": draw_lemon,
    "raw_mango": draw_lemon,
    "round_raw_mango": draw_lemon,
    "amla": draw_lemon,
    "watermelon": draw_watermelon,
    "papaya": draw_papaya,
    "custard_apple": draw_knol_khol,
    "guava": draw_lemon,
    "muskmelon": draw_orange_fruit,
    "plums": draw_small_onion,
    "pomegranate": draw_pomegranate,
    "pineapple": draw_corn,
    "kamala_orange": draw_orange_fruit,
    "mandarin_orange": draw_orange_fruit,
    "citrus_orange": draw_orange_fruit,
    "white_dates": draw_tapioca,
    "red_dates": draw_tapioca,
    "rambutan": draw_pomegranate,
    "kambam_grapes": draw_small_onion,
    "sweet_lime": draw_lemon,
    "turnip": draw_knol_khol,
}

# Run generation for remaining items
for slug, draw_fn in RENDERERS.items():
    dst = os.path.join(curated_dir, f"{slug}.jpg")
    # Only render if AI photo wasn't generated
    if not os.path.exists(dst) or os.path.getsize(dst) < 4000:
        draw_realistic_produce(slug, draw_fn)

print("Done processing realistic produce photos!")
