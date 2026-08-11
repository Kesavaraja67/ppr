/**
 * Static English → Tamil dictionary for common vegetables and fruits.
 * Covers ~100 common Indian produce items, covering the vast majority of real-world use.
 * Lookup is case-insensitive by normalized English name.
 *
 * Used by the admin "Add New Vegetable" form to auto-fill the Tamil name field.
 * If a name is not found here, the translate API route is called as a fallback.
 */

const DICT: Record<string, string> = {
  // ── Vegetables ─────────────────────────────────────────────────────────────
  tomato:               "தக்காளி",
  onion:                "வெங்காயம்",
  potato:               "உருளைக்கிழங்கு",
  carrot:               "கேரட்",
  brinjal:              "கத்திரிக்காய்",
  eggplant:             "கத்திரிக்காய்",
  "aubergine":          "கத்திரிக்காய்",
  okra:                 "வெண்டைக்காய்",
  "lady's finger":      "வெண்டைக்காய்",
  "ladies finger":      "வெண்டைக்காய்",
  "lady finger":        "வெண்டைக்காய்",
  cucumber:             "வெள்ளரிக்காய்",
  beetroot:             "பீட்ரூட்",
  cabbage:              "முட்டைகோஸ்",
  cauliflower:          "காலிஃப்ளவர்",
  broccoli:             "ப்ரோக்கோலி",
  "bitter gourd":       "பாகற்காய்",
  "bittergourd":        "பாகற்காய்",
  "bitter melon":       "பாகற்காய்",
  "bottle gourd":       "சுரைக்காய்",
  "bottlegourd":        "சுரைக்காய்",
  "snake gourd":        "புடலங்காய்",
  "ridge gourd":        "பீர்க்கங்காய்",
  "ash gourd":          "வெண்பூசணி",
  "white pumpkin":      "வெண்பூசணி",
  pumpkin:              "பூசணிக்காய்",
  beans:                "அவரைக்காய்",
  "flat beans":         "அவரைக்காய்",
  "cluster beans":      "கொத்தவரைக்காய்",
  "french beans":       "பீன்ஸ்",
  "green beans":        "பீன்ஸ்",
  "drumstick":          "முருங்கைக்காய்",
  "radish":             "முள்ளங்கி",
  capsicum:             "குடமிளகாய்",
  "bell pepper":        "குடமிளகாய்",
  "green pepper":       "பச்சை மிளகாய்",
  "green chili":        "பச்சை மிளகாய்",
  "green chilli":       "பச்சை மிளகாய்",
  garlic:               "பூண்டு",
  ginger:               "இஞ்சி",
  "spring onion":       "வெங்காயத்தாள்",
  "spring onions":      "வெங்காயத்தாள்",
  "green onion":        "வெங்காயத்தாள்",
  mushroom:             "காளான்",
  "raw banana":         "வாழைக்காய்",
  "raw plantain":       "வாழைக்காய்",
  yam:                  "சேனைக்கிழங்கு",
  "elephant yam":       "சேனைக்கிழங்கு",
  "sweet potato":       "சர்க்கரைவள்ளிக்கிழங்கு",
  colocasia:            "சேப்பங்கிழங்கு",
  taro:                 "சேப்பங்கிழங்கு",
  "raw mango":          "மாங்காய்",
  turnip:               "டர்னிப்",
  "pointed gourd":      "கோவைக்காய்",
  "ivy gourd":          "கோவைக்காய்",
  "kovakai":            "கோவைக்காய்",
  corn:                 "மக்காசோளம்",
  "sweet corn":         "இனிப்பு மக்காசோளம்",
  "baby corn":          "குழந்தை மக்காசோளம்",
  "green peas":         "பட்டாணி",
  peas:                 "பட்டாணி",
  "broad beans":        "அவரை",
  "raw papaya":         "பச்சை பப்பாளி",
  jackfruit:            "பலாக்காய்",
  "raw jackfruit":      "பலாக்காய்",
  "moringa":            "முருங்கை",

  // ── Leafy greens ──────────────────────────────────────────────────────────
  spinach:              "பசலைக் கீரை",
  palak:                "பாலக் கீரை",
  coriander:            "கொத்தமல்லி",
  cilantro:             "கொத்தமல்லி",
  mint:                 "புதினா",
  fenugreek:            "வெந்தயக் கீரை",
  methi:                "வெந்தயக் கீரை",
  "curry leaves":       "கறிவேப்பிலை",
  "curry leaf":         "கறிவேப்பிலை",
  amaranth:             "முளைக் கீரை",
  "drumstick leaves":   "முருங்கைக் கீரை",
  "moringa leaves":     "முருங்கைக் கீரை",
  "agathi leaves":      "அகத்திக் கீரை",
  "purslane":           "சாரணை கீரை",
  "water spinach":      "வெள்ளைக் கீரை",
  "murunga keerai":     "முருங்கைக் கீரை",
  "ponanganni":         "பொன்னாங்கண்ணி கீரை",

  // ── Fruits ────────────────────────────────────────────────────────────────
  banana:               "வாழைப்பழம்",
  mango:                "மாம்பழம்",
  apple:                "ஆப்பிள்",
  orange:               "ஆரஞ்சு",
  pomegranate:          "மாதுளம்பழம்",
  grapes:               "திராட்சை",
  watermelon:           "தர்பூசணி",
  pineapple:            "அன்னாசிப்பழம்",
  papaya:               "பப்பாளிப்பழம்",
  guava:                "கொய்யாப்பழம்",
  coconut:              "தேங்காய்",
  lemon:                "எலுமிச்சை",
  lime:                 "எலுமிச்சை",
  "sapota":             "சப்போட்டா",
  "chickoo":            "சப்போட்டா",
  "chikoo":             "சப்போட்டா",
  "custard apple":      "சீதாப்பழம்",
  "sitaphal":           "சீதாப்பழம்",
  dates:                "பேரீச்சம்பழம்",
  fig:                  "அத்திப்பழம்",
  pear:                 "பேரிக்காய்",
  kiwi:                 "கிவி",
  "dragon fruit":       "டிராகன் பழம்",
  avocado:              "வெண்ணெய் பழம்",
  strawberry:           "ஸ்ட்ராபெரி",
  plum:                 "பிளம்ஸ்",
  peach:                "பீச்",
  "wood apple":         "விளாம்பழம்",
  "tamarind":           "புளி",
};

// ── Reverse map (Tamil → English) built once at module load ──────────────────
// For Tamil names that map to multiple English names, the first English key wins.
const REVERSE_DICT: Record<string, string> = (() => {
  const rev: Record<string, string> = {};
  for (const [en, ta] of Object.entries(DICT)) {
    if (!rev[ta]) rev[ta] = en;
  }
  return rev;
})();

/**
 * Look up the Tamil name for an English vegetable/fruit name.
 * Case-insensitive, collapses extra whitespace.
 * Returns undefined if not found.
 */
export function lookupTamilName(nameEn: string): string | undefined {
  const key = nameEn.toLowerCase().trim().replace(/\s+/g, " ");
  return DICT[key];
}

/** Returns all entries for testing / admin preview. */
export function getAllDictEntries(): Record<string, string> {
  return { ...DICT };
}

/**
 * Look up the English name for a Tamil vegetable/fruit name.
 * Returns undefined if not found.
 */
export function lookupEnglishName(nameTa: string): string | undefined {
  // Normalize: trim and collapse internal whitespace to match REVERSE_DICT keys.
  const normalized = nameTa.trim().replace(/\s+/g, " ");
  return REVERSE_DICT[normalized];
}
