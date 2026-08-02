import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { users, addresses } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * PATCH /api/auth/profile
 * Body: { name?: string; address_id?: string; full_address?: string }
 *
 * Allows updating customer profile name or editing a saved address text.
 */
export async function PATCH(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { name?: string; address_id?: string; full_address?: string };
  try {
    body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Type guards: ensure provided fields are strings
  if (
    (body.name !== undefined && typeof body.name !== "string") ||
    (body.address_id !== undefined && typeof body.address_id !== "string") ||
    (body.full_address !== undefined && typeof body.full_address !== "string")
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 1. Update name if provided
  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: "Name cannot exceed 100 characters" },
        { status: 400 }
      );
    }
    await db
      .update(users)
      .set({ name: trimmedName })
      .where(eq(users.id, session.userId));
  }

  // 2. Update existing address if provided
  if (body.address_id && body.full_address !== undefined) {
    const trimmedAddr = body.full_address.trim();
    if (!trimmedAddr) {
      return NextResponse.json({ error: "Address cannot be empty" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, body.address_id), eq(addresses.user_id, session.userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    await db
      .update(addresses)
      .set({ full_address: trimmedAddr })
      .where(and(eq(addresses.id, body.address_id), eq(addresses.user_id, session.userId)));
  }

  return NextResponse.json({ success: true });
}
