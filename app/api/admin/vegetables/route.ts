import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vegetables } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { lookupTamilName } from "@/lib/tamil-dict";

// GET /api/admin/vegetables — list all vegetables for master list management
export async function GET() {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vegs = await db
    .select()
    .from(vegetables)
    .orderBy(asc(vegetables.name_en));

  return NextResponse.json({ vegetables: vegs });
}

// POST /api/admin/vegetables — add a new vegetable to the master list
// Accepts JSON with optional base64 image (resized client-side before upload)
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name_en: string;
    name_ta?: string; // optional — auto-filled from dict if not provided
    unit: string;
    category: "vegetable" | "fruit" | "grocery";
    allow_piece_mode?: boolean;
    image_data_url?: string; // base64 JPEG resized client-side, ~30-50KB
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name_en?.trim() || !body.unit?.trim() || !body.category) {
    return NextResponse.json(
      { error: "name_en, unit, and category are required" },
      { status: 400 }
    );
  }

  const ALLOWED_CATEGORIES = ["vegetable", "fruit", "grocery"];
  if (!ALLOWED_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (body.image_data_url && body.image_data_url.length > 500000) {
    return NextResponse.json({ error: "Image payload too large (max 500KB)" }, { status: 400 });
  }

  // Auto-fill Tamil name from static dictionary if not provided
  const nameTa =
    body.name_ta?.trim() ||
    lookupTamilName(body.name_en) ||
    body.name_en; // fallback: use English name if dictionary misses it

  const [newVeg] = await db
    .insert(vegetables)
    .values({
      name_en: body.name_en.trim(),
      name_ta: nameTa,
      unit: body.unit.trim(),
      category: body.category,
      allow_piece_mode: body.allow_piece_mode ?? false,
      current_price: "0",
      image_url: body.image_data_url ?? null,
      is_curated_image: false,
      updated_by: adminId,
    })
    .returning();

  revalidatePath("/");
  return NextResponse.json({ vegetable: newVeg }, { status: 201 });
}

// PATCH /api/admin/vegetables — update an existing vegetable
export async function PATCH(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id: string;
    name_en?: string;
    name_ta?: string;
    unit?: string;
    category?: "vegetable" | "fruit" | "grocery";
    allow_piece_mode?: boolean;
    image_data_url?: string;
    in_stock?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (body.category !== undefined && !["vegetable", "fruit", "grocery"].includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (body.image_data_url && body.image_data_url.length > 500000) {
    return NextResponse.json({ error: "Image payload too large (max 500KB)" }, { status: 400 });
  }

  await db
    .update(vegetables)
    .set({
      ...(body.name_en !== undefined && { name_en: body.name_en }),
      ...(body.name_ta !== undefined && { name_ta: body.name_ta }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.allow_piece_mode !== undefined && { allow_piece_mode: body.allow_piece_mode }),
      ...(body.image_data_url !== undefined && { image_url: body.image_data_url }),
      ...(body.in_stock !== undefined && { in_stock: body.in_stock }),
      updated_at: new Date(),
      updated_by: adminId,
    })
    .where(eq(vegetables.id, body.id));

  const [updated] = await db
    .select()
    .from(vegetables)
    .where(eq(vegetables.id, body.id))
    .limit(1);

  revalidatePath("/");
  return NextResponse.json({ vegetable: updated });
}

// DELETE /api/admin/vegetables — soft-remove (just mark in_stock false rather than delete)
// Hard delete is dangerous since order_items reference vegetables
export async function DELETE(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Mark as inactive (in_stock = false effectively hides it from catalog)
  await db
    .update(vegetables)
    .set({ in_stock: false, updated_at: new Date(), updated_by: adminId })
    .where(eq(vegetables.id, body.id));

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
