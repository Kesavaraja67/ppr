import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplier_requests } from "@/drizzle/schema";

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    phone?: string;
    veg_name?: string;
    approx_qty?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, phone, veg_name, approx_qty } = body;

  if (!name || !phone || !veg_name) {
    return NextResponse.json(
      { error: "name, phone, and veg_name are required" },
      { status: 400 }
    );
  }

  // Basic phone validation
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return NextResponse.json(
      { error: "Please enter a valid phone number" },
      { status: 400 }
    );
  }

  await db.insert(supplier_requests).values({
    name: name.trim(),
    phone: phoneDigits,
    veg_name: veg_name.trim(),
    approx_qty: approx_qty?.trim() || null,
    seen: false,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
