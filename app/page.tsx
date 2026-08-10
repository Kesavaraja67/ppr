import { db } from "@/lib/db";
import { vegetables, shop_config } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";
import CatalogClient from "@/components/CatalogClient";

// Force dynamic rendering so CI build doesn't attempt DB static prerendering
export const dynamic = "force-dynamic";




export default async function CatalogPage() {
  const [vegsResult, configResult] = await Promise.all([
    db
      .select({
        id: vegetables.id,
        name_en: vegetables.name_en,
        name_ta: vegetables.name_ta,
        unit: vegetables.unit,
        category: vegetables.category,
        allow_piece_mode: vegetables.allow_piece_mode,
        current_price: vegetables.current_price,
        in_stock: vegetables.in_stock,
        image_url: vegetables.image_url,
      })
      .from(vegetables)
      .where(eq(vegetables.in_stock, true))
      .orderBy(asc(vegetables.name_en)),
    db.select().from(shop_config).limit(1),
  ]);

  const CATEGORY_ORDER: Record<string, number> = {
    vegetable: 1,
    fruit: 2,
    grocery: 3,
  };

  const TN_ITEM_PRIORITY: { pattern: RegExp; rank: number }[] = [
    // --- VEGETABLES ---
    // 1. Staples: Small Onion, Big Onion, Tomatoes, Potatoes, Garlic, Ginger, Chillies
    { pattern: /small onion|chinna/i, rank: 10 },
    { pattern: /big onion|onion/i, rank: 15 },
    { pattern: /country tomato/i, rank: 20 },
    { pattern: /hybrid tomato|tomato/i, rank: 25 },
    { pattern: /kolar potato|potato/i, rank: 30 },
    { pattern: /country garlic/i, rank: 40 },
    { pattern: /garlic/i, rank: 42 },
    { pattern: /ginger|inji/i, rank: 44 },
    { pattern: /green chilli|samba chilli|chilli/i, rank: 46 },

    // 2. Carrots, Beetroot, Radish
    { pattern: /carrot/i, rank: 50 },
    { pattern: /beetroot/i, rank: 52 },
    { pattern: /radish|mullangi/i, rank: 54 },

    // 3. All Beans
    { pattern: /beans/i, rank: 60 },

    // 4. Brinjals & Okra
    { pattern: /brinjal/i, rank: 70 },
    { pattern: /ladies finger|okra|vendakkai/i, rank: 75 },

    // 5. Cabbage, Cauliflower, Broccoli
    { pattern: /cabbage/i, rank: 80 },
    { pattern: /cauliflower/i, rank: 82 },
    { pattern: /broccoli/i, rank: 84 },

    // 6. Gourds & Cucumbers
    { pattern: /bottle gourd/i, rank: 90 },
    { pattern: /ridge gourd/i, rank: 92 },
    { pattern: /snake gourd/i, rank: 94 },
    { pattern: /bitter gourd/i, rank: 96 },
    { pattern: /ash gourd|pumpkin|marrow|chow chow/i, rank: 98 },
    { pattern: /cucumber/i, rank: 99 },

    // 7. Greens / Keerai
    { pattern: /spinach|keerai|coriander|mint|curry/i, rank: 100 },

    // 8. Tubers / Kizhangu & Other Vegs
    { pattern: /kizhangu|koorkka|chinese potato|yam|tapioca|sweet potato|turnip|knol khol/i, rank: 110 },
    { pattern: /drumstick|raw banana|coconut|groundnut|corn|maize|mushroom|capsicum|ivy gourd/i, rank: 120 },

    // --- FRUITS ---
    // 1. Bananas (Naadan, Rasthali, Poovan, Karpooravalli, Sevvaazhai, Glucose, Nendran, Virupakshi)
    { pattern: /naadan banana/i, rank: 200 },
    { pattern: /rasthali/i, rank: 202 },
    { pattern: /poovan/i, rank: 204 },
    { pattern: /karpooravalli/i, rank: 206 },
    { pattern: /sevvaazhai|red banana/i, rank: 208 },
    { pattern: /glucose banana/i, rank: 210 },
    { pattern: /nendran/i, rank: 212 },
    { pattern: /virupakshi/i, rank: 214 },
    { pattern: /banana/i, rank: 216 },

    // 2. Mangoes
    { pattern: /raw mango/i, rank: 230 },
    { pattern: /mango/i, rank: 235 },

    // 3. Citrus & Common TN Fruits
    { pattern: /lemon/i, rank: 250 },
    { pattern: /sweet lime|sathukudi/i, rank: 252 },
    { pattern: /orange/i, rank: 254 },
    { pattern: /watermelon/i, rank: 260 },
    { pattern: /muskmelon/i, rank: 262 },
    { pattern: /papaya/i, rank: 264 },
    { pattern: /guava/i, rank: 266 },
    { pattern: /pomegranate/i, rank: 268 },
    { pattern: /sapota/i, rank: 270 },
    { pattern: /apple/i, rank: 272 },

    // 4. Berries & Exotic Fruits
    { pattern: /strawberry/i, rank: 280 },
    { pattern: /grapes/i, rank: 282 },
    { pattern: /dragon fruit/i, rank: 284 },
    { pattern: /amla/i, rank: 286 },
    { pattern: /pear|plums|rambutan|dates|kiwi/i, rank: 288 },
  ];

  function getSortRank(item: { name_en: string }) {
    const name = item.name_en.toLowerCase();
    for (const group of TN_ITEM_PRIORITY) {
      if (group.pattern.test(name)) {
        return group.rank;
      }
    }
    return 500;
  }

  const sortedVegs = vegsResult.sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) return catA - catB;

    const rankA = getSortRank(a);
    const rankB = getSortRank(b);
    if (rankA !== rankB) return rankA - rankB;

    return a.name_en.localeCompare(b.name_en);
  });

  const DEFAULT_COVERED_AREAS = [
    "Thudiyalur",
    "Vadamadurai (K. Vadamadurai)",
    "Sengalipalayam",
    "Thoppampatti Pirivu",
    "Maruthi Nagar",
  ];

  const config = configResult[0] ?? null;

  return (
    <CatalogClient
      vegetables={sortedVegs}
      config={
        config
          ? {
              shop_name: config.shop_name,
              owner_name: config.owner_name,
              phone_number: config.phone_number,
              lat: Number(config.lat),
              long: Number(config.long),
              delivery_radius_km: Number(config.delivery_radius_km),
              covered_areas:
                Array.isArray(config.covered_areas) && config.covered_areas.length > 0
                  ? (config.covered_areas as string[])
                  : DEFAULT_COVERED_AREAS,
            }
          : {
              shop_name: "P.P.R. Fruits & Vegetables",
              owner_name: "Jayaraman P",
              phone_number: "6382366080",
              lat: 11.0915615,
              long: 76.9452854,
              delivery_radius_km: 3,
              covered_areas: DEFAULT_COVERED_AREAS,
            }
      }
    />
  );
}
