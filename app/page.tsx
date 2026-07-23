import { db } from "@/lib/db";
import { vegetables, shop_config } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";
import CatalogClient from "@/components/CatalogClient";

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
        in_stock: vegetables.in_stock,
        image_url: vegetables.image_url,
      })
      .from(vegetables)
      .where(eq(vegetables.in_stock, true))
      .orderBy(asc(vegetables.name_en)),
    db.select().from(shop_config).limit(1),
  ]);

  const config = configResult[0] ?? null;

  return (
    <CatalogClient
      vegetables={vegsResult}
      config={
        config
          ? {
              shop_name: config.shop_name,
              owner_name: config.owner_name,
              phone_number: config.phone_number,
              lat: Number(config.lat),
              long: Number(config.long),
              delivery_radius_km: Number(config.delivery_radius_km),
              covered_areas: config.covered_areas ?? [],
            }
          : null
      }
    />
  );
}
