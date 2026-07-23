import { NextRequest, NextResponse } from "next/server";
import { lookupTamilName } from "@/lib/tamil-dict";
import { headers } from "next/headers";

// GET /api/admin/vegetables-list?lookup=tomato
// Used by the admin Add New Vegetable form to auto-fill Tamil name
export async function GET(req: NextRequest) {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lookup = req.nextUrl.searchParams.get("lookup");
  if (!lookup) {
    return NextResponse.json({ tamil: null });
  }

  const tamil = lookupTamilName(lookup) ?? null;
  return NextResponse.json({ tamil });
}
