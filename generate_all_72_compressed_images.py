import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

# Derive the curated directory portably from this script's location so the
# script works on any machine / OS without hardcoded absolute paths.
_script_dir = os.path.dirname(os.path.abspath(__file__))
curated_dir = os.path.join(_script_dir, "public", "curated")
os.makedirs(curated_dir, exist_ok=True)

# Define color schemes and studio product photo composition params per item category
ITEMS = [
    # ── Vegetables ──────────────────────────────────────────────────────────────
    ("beans",                (46, 125, 50),   (200, 230, 201), "Beans"),
    ("karaimadu_brinjal",    (74, 20, 140),   (225, 190, 231), "Brinjal"),
    ("violet_brinjal",       (106, 27, 154),  (209, 196, 233), "Brinjal"),
    ("balloon_brinjal",      (92, 107, 192),  (197, 202, 233), "Brinjal"),
    ("ash_gourd",            (224, 224, 224), (245, 245, 245), "Gourd"),
    ("pumpkin",              (230, 81, 0),    (255, 224, 178), "Pumpkin"),
    ("marrow",               (56, 142, 60),   (200, 230, 201), "Marrow"),
    ("chow_chow",            (124, 179, 66),  (220, 237, 193), "Chow Chow"),
    ("knol_khol",            (139, 195, 74),  (220, 237, 193), "Knol Khol"),
    ("ladies_finger",        (43, 148, 62),   (198, 239, 206), "Ladies Finger"),
    ("broad_beans",          (67, 160, 71),   (200, 230, 201), "Beans"),
    ("cluster_beans",        (56, 142, 60),   (200, 230, 201), "Beans"),
    ("hyacinth_beans",       (104, 159, 56),  (220, 237, 193), "Beans"),
    ("country_cucumber",     (175, 180, 43),  (240, 244, 195), "Cucumber"),
    ("field_beans",          (85, 139, 47),   (220, 237, 193), "Beans"),
    ("flat_beans",           (76, 175, 80),   (200, 230, 201), "Beans"),
    ("snake_gourd",          (200, 230, 201), (235, 245, 235), "Gourd"),
    ("bottle_gourd",         (156, 204, 101), (220, 237, 193), "Gourd"),
    ("ivy_gourd",            (56, 142, 60),   (200, 230, 201), "Gourd"),
    ("bitter_gourd",         (46, 125, 50),   (200, 230, 201), "Bitter Gourd"),
    ("ridge_gourd",          (67, 160, 71),   (200, 230, 201), "Gourd"),
    ("raw_banana",           (104, 159, 56),  (220, 237, 193), "Raw Banana"),
    ("radish",               (238, 238, 238), (250, 250, 250), "Radish"),
    ("samba_chilli",         (198, 40, 40),   (255, 205, 210), "Chilli"),
    ("green_chilli",         (46, 125, 50),   (200, 230, 201), "Chilli"),
    ("tapioca",              (141, 110, 99),  (215, 204, 200), "Tapioca"),
    ("sweet_potato",         (173, 20, 87),   (248, 187, 208), "Sweet Potato"),
    ("cabbage",              (129, 199, 132), (232, 245, 233), "Cabbage"),
    ("cauliflower",          (245, 245, 240), (255, 255, 255), "Cauliflower"),
    ("ginger",               (188, 170, 134), (238, 232, 218), "Ginger"),
    ("seppankizhangu",       (141, 110, 99),  (215, 204, 200), "Root"),
    ("elephant_foot_yam",    (109, 76, 65),   (215, 204, 200), "Yam"),
    ("chinese_potato",       (93, 64, 55),    (215, 204, 200), "Koorka"),
    ("coconut",              (121, 85, 72),   (215, 204, 200), "Coconut"),
    ("turnip",               (171, 71, 188),  (243, 229, 245), "Turnip"),
    ("drumstick",            (56, 142, 60),   (200, 230, 201), "Drumstick"),
    ("sena_kizhangu",        (109, 76, 65),   (215, 204, 200), "Yam"),
    ("kaavathu_kizhangu",    (121, 85, 72),   (215, 204, 200), "Yam"),
    ("madavaattu_kizhangu",  (141, 110, 99),  (215, 204, 200), "Root"),
    ("garlic",               (245, 245, 245), (255, 255, 255), "Garlic"),
    ("country_garlic",       (238, 238, 238), (250, 250, 250), "Garlic"),
    ("big_onion",            (194, 24, 91),   (248, 187, 208), "Onion"),
    ("small_onion",          (173, 20, 87),   (248, 187, 208), "Shallot"),
    ("country_tomato",       (211, 47, 47),   (255, 205, 210), "Tomato"),
    ("hybrid_tomato",        (229, 57, 53),   (255, 205, 210), "Tomato"),
    ("ooty_potato",          (191, 144, 99),  (238, 222, 204), "Potato"),
    ("maize",                (253, 216, 53),  (255, 249, 196), "Corn"),
    ("sweet_corn",           (251, 192, 45),  (255, 249, 196), "Corn"),
    ("groundnut",            (161, 136, 127), (235, 222, 217), "Groundnut"),
    ("mushroom",             (245, 242, 235), (255, 255, 255), "Mushroom"),

    # ── Fruits ──────────────────────────────────────────────────────────────────
    ("lemon",                (253, 216, 53),  (255, 249, 196), "Lemon"),
    ("raw_mango",            (104, 159, 56),  (220, 237, 193), "Mango"),
    ("round_raw_mango",      (124, 179, 66),  (220, 237, 193), "Mango"),
    ("amla",                 (139, 195, 74),  (235, 245, 220), "Amla"),
    ("watermelon",           (198, 40, 40),   (255, 205, 210), "Watermelon"),
    ("papaya",               (245, 124, 0),   (255, 224, 178), "Papaya"),
    ("custard_apple",        (104, 159, 56),  (220, 237, 193), "Custard Apple"),
    ("guava",                (139, 195, 74),  (230, 245, 210), "Guava"),
    ("muskmelon",            (251, 140, 0),   (255, 224, 178), "Muskmelon"),
    ("plums",                (136, 14, 79),   (248, 187, 208), "Plum"),
    ("red_dragon_fruit",     (194, 24, 91),   (248, 187, 208), "Dragon Fruit"),
    ("pomegranate",          (183, 28, 28),   (255, 205, 210), "Pomegranate"),
    ("pineapple",            (245, 124, 0),   (255, 224, 178), "Pineapple"),
    ("kamala_orange",        (245, 124, 0),   (255, 224, 178), "Orange"),
    ("mandarin_orange",      (251, 140, 0),   (255, 224, 178), "Orange"),
    ("citrus_orange",        (255, 160, 0),   (255, 224, 178), "Orange"),
    ("white_dates",          (215, 204, 200), (245, 240, 235), "Dates"),
    ("red_dates",            (121, 85, 72),   (215, 204, 200), "Dates"),
    ("rambutan",             (198, 40, 40),   (255, 205, 210), "Rambutan"),
    ("kambam_grapes",        (74, 20, 140),   (225, 190, 231), "Grapes"),
    ("sweet_lime",           (192, 202, 51),  (240, 244, 195), "Sweet Lime"),
    ("kiwi",                 (114, 137, 32),  (230, 238, 190), "Kiwi"),
]

print(f"Creating product photo assets for {len(ITEMS)} items...")

for slug, primary_color, bg_color, label in ITEMS:
    out_path = os.path.join(curated_dir, f"{slug}.jpg")

    # Skip if a sufficiently large real JPG already exists (e.g., AI-generated photo)
    if os.path.exists(out_path) and os.path.getsize(out_path) >= 4000:
        print(f"  [SKIP] {slug}.jpg already exists ({os.path.getsize(out_path)/1024:.1f} KB)")
        continue

    # Check if a high-res AI generated PNG already exists for this slug
    existing_photo = os.path.join(curated_dir, f"{slug}.png")
    if os.path.exists(existing_photo):
        img = Image.open(existing_photo).convert('RGB')
        img.thumbnail((300, 300))
        img.save(out_path, 'JPEG', quality=82, optimize=True)
        print(f"  [OK] Processed photo {slug}.jpg ({os.path.getsize(out_path)/1024:.1f} KB)")
        continue

    # Generate a clean studio product photo representation (300x300)
    canvas = Image.new('RGB', (300, 300), bg_color)
    draw = ImageDraw.Draw(canvas)
    
    # Soft ambient studio background glow
    for r in range(120, 0, -10):
        alpha = int(25 * (1 - r/120))
        glow_color = tuple(min(255, c + alpha) for c in bg_color)
        draw.ellipse([150-r, 150-r, 150+r, 150+r], fill=glow_color)

    # Soft contact drop shadow below fruit
    draw.ellipse([80, 210, 220, 250], fill=(200, 200, 200))
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=8))
    draw = ImageDraw.Draw(canvas)

    # Main produce body (ellipse / organic shape)
    draw.ellipse([90, 80, 210, 200], fill=primary_color)

    # Highlight overlay for 3D studio lighting effect
    h_col = tuple(min(255, c + 70) for c in primary_color)
    draw.ellipse([110, 95, 160, 145], fill=h_col)

    # Save with JPEG compression, 82% quality, web optimized
    canvas.save(out_path, 'JPEG', quality=82, optimize=True)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"  [OK] Created {slug}.jpg ({size_kb:.1f} KB)")

print(f"Finished generating all {len(ITEMS)} low-storage compressed product images in public/curated/")
