import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { call_taps, supplier_requests } from "@/drizzle/schema";

// ─── Call tap logging (POST /api/call-tap) ────────────────────────────────────
export async function POST() {
  // No personal data — just a timestamp
  await db.insert(call_taps).values({});
  return NextResponse.json({ ok: true });
}

// ─── Supplier form submission (POST /api/sell-to-us) ─────────────────────────
// (Handled separately below — see /api/sell-to-us/route.ts)
