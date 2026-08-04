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
  };

  const sortedVegs = vegsResult.sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) return catA - catB;
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
              phone_number: "8870187248",
              lat: 11.0915615,
              long: 76.9452854,
              delivery_radius_km: 3,
              covered_areas: DEFAULT_COVERED_AREAS,
            }
      }
    />
  );
}
