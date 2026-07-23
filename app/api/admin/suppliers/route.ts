import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplier_requests } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(supplier_requests)
    .orderBy(desc(supplier_requests.created_at));

  return NextResponse.json({ requests: rows });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; seen?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, seen } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db
    .update(supplier_requests)
    .set({ seen: typeof seen === "boolean" ? seen : true })
    .where(eq(supplier_requests.id, id));

  return NextResponse.json({ success: true });
}
