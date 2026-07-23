/**
 * Curated local image map.
 * Key: normalized English name (lowercase, trimmed).
 * Value: public path to the static image asset.
 *
 * When adding a new vegetable in the admin panel, this map is checked FIRST.
 * AI image generation is only triggered if the name is NOT in this map.
 */
export const CURATED_IMAGES: Record<string, string> = {
  tomato: "/curated/tomato.png",
  tomatoes: "/curated/tomato.png",
  onion: "/curated/onion.png",
  onions: "/curated/onion.png",
  "red onion": "/curated/onion.png",
  potato: "/curated/potato.png",
  potatoes: "/curated/potato.png",
  carrot: "/curated/carrot.png",
  carrots: "/curated/carrot.png",
  brinjal: "/curated/brinjal.png",
  eggplant: "/curated/brinjal.png",
  aubergine: "/curated/brinjal.png",
  "kathirikai": "/curated/brinjal.png",
  banana: "/curated/banana.png",
  bananas: "/curated/banana.png",
  mango: "/curated/mango.png",
  mangoes: "/curated/mango.png",
  mangos: "/curated/mango.png",
  spinach: "/curated/spinach.png",
  palak: "/curated/spinach.png",
  okra: "/curated/okra.png",
  "ladies finger": "/curated/okra.png",
  "lady's finger": "/curated/okra.png",
  bhindi: "/curated/okra.png",
  cucumber: "/curated/cucumber.png",
  cucumbers: "/curated/cucumber.png",
  coriander: "/curated/coriander.png",
  cilantro: "/curated/coriander.png",
  kothamalli: "/curated/coriander.png",
  beetroot: "/curated/beetroot.png",
  beet: "/curated/beetroot.png",
};

/**
 * Returns the curated image path for a given name, or null if not found.
 */
export function getCuratedImage(name_en: string): string | null {
  const normalized = name_en.toLowerCase().trim();
  return CURATED_IMAGES[normalized] ?? null;
}
