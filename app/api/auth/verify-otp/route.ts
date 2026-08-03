import { NextRequest, NextResponse } from "next/server";
import { verifyMsg91AccessToken } from "@/lib/msg91";
import { checkOTPRateLimit, normalizeIndianMobile } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { createCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

const SESSION_DURATION_DAYS = 75;

/**
 * POST /api/auth/verify-otp
 * Body: { accessToken: string, name?: string }
 *
 * The OTP itself was already verified client-side by the MSG91 widget.
 * This endpoint verifies the resulting access-token server-side against
 * MSG91 before trusting the phone number and issuing a session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { accessToken?: string; name?: string };
    try {
      body = await req.json();
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const accessToken = body.accessToken?.trim() ?? "";
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
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

    // ── 1. Rate-limit guard (phone resolved later; use IP-only pre-flight) ─────
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    // ── 2. Verify access-token with MSG91 ─────────────────────────────────────
    const verifyResult = await verifyMsg91AccessToken(accessToken);
    if (!verifyResult.success) {
      return NextResponse.json({ error: verifyResult.error }, { status: 401 });
    }

    // MSG91 returns the verified phone as digits e.g. "919876543210"
    const tenDigit = normalizeIndianMobile(verifyResult.phone);
    if (tenDigit.length !== 10) {
      return NextResponse.json(
        { error: "Could not resolve verified phone number" },
        { status: 500 }
      );
    }

    // Apply rate limit using the now-resolved phone number
    const rateCheck = checkOTPRateLimit(tenDigit, clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    const expectedPhone = `+91${tenDigit}`;

    // ── 2. Upsert user in database ────────────────────────────────────────────
    const [upsertedUser] = await db
      .insert(users)
      .values({ phone_number: expectedPhone, name: submittedName || null })
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
