import { NextRequest, NextResponse } from "next/server";
import { normalizeIndianMobile } from "@/lib/auth-helpers";
import { verifyMsg91Otp } from "@/lib/msg91";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { createCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

const SESSION_DURATION_DAYS = 75;

/**
 * POST /api/auth/verify-otp
 *
 * Body: { phone: "9876543210", otp: "123456", name?: string }
 */
export async function POST(req: NextRequest) {
  try {
    let body: { phone?: string; otp?: string; name?: string };
    try {
      body = await req.json();
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body.name !== undefined && typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid name format" }, { status: 400 });
    }
    const submittedName = body.name?.trim() || undefined;
    if (submittedName && submittedName.length > 100) {
      return NextResponse.json(
        { error: "Name cannot exceed 100 characters" },
        { status: 400 }
      );
    }

    const phone = body.phone?.trim() ?? "";
    const otp = body.otp?.trim() ?? "";

    const cleaned = normalizeIndianMobile(phone);

    if (cleaned.length !== 10) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        { error: "OTP code is required" },
        { status: 400 }
      );
    }

    // ── 1. Verify OTP with MSG91 ──────────────────────────────────────────────
    const verifyResult = await verifyMsg91Otp(cleaned, otp);
    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error ?? "Invalid or expired OTP code" },
        { status: 401 }
      );
    }

    // ── 2. Upsert user in database ────────────────────────────────────────────
    const expectedPhone = `+91${cleaned}`;
    const [upsertedUser] = await db
      .insert(users)
      .values({
        phone_number: expectedPhone,
        name: submittedName || null,
      })
      .onConflictDoUpdate({
        target: users.phone_number,
        set: submittedName ? { name: submittedName } : { phone_number: expectedPhone },
      })
      .returning({ id: users.id });

    const userId = upsertedUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
    }

    // ── 3. Issue customer session cookie ──────────────────────────────────────
    const token = await createCustomerSession(userId);

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (globalErr: unknown) {
    console.error("verify-otp unhandled server error:", globalErr);
    return NextResponse.json(
      { error: "Server error during verification. Please check server logs." },
      { status: 500 }
    );
  }
}

// ── Customer logout ───────────────────────────────────────────────────────────
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
