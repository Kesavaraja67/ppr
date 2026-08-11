import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vegetables } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";

/**
 * GET /api/vegetables
 * Public endpoint to fetch active vegetables catalog with live prices and stock state.
 */
export async function GET() {
  try {
    const vegs = await db
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
      .orderBy(asc(vegetables.name_en));

    return NextResponse.json({ vegetables: vegs });
  } catch (err) {
    console.error("[api/vegetables] Error fetching live prices:", err);
    return NextResponse.json({ error: "Failed to fetch vegetables" }, { status: 500 });
  }
}
