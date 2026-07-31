import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { normalizeIndianMobile } from "@/lib/otp";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { createCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

const SESSION_DURATION_DAYS = 75;

// ID tokens must be issued within the last 5 minutes to be accepted.
// This prevents replay attacks using tokens captured from old sign-in events.
const MAX_AUTH_AGE_SECONDS = 5 * 60;

/**
 * POST /api/auth/verify-otp
 *
 * Body: { phone: "9876543210", idToken: "<Firebase ID token>" }
 *
 * Flow:
 *  1. Validate phone format.
 *  2. Verify the Firebase ID token with the Admin SDK (revocation checked).
 *  3. Reject tokens older than 5 minutes.
 *  4. Assert the token's phone_number matches the submitted phone.
 *  5. Upsert the user row (first-time login creates the account).
 *  6. Issue a session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { phone?: string; idToken?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const phone = body.phone?.trim() ?? "";
    const idToken = body.idToken?.trim() ?? "";

    const cleaned = normalizeIndianMobile(phone);

    if (cleaned.length !== 10) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 }
      );
    }

    if (!idToken) {
      return NextResponse.json(
        { error: "Firebase ID token is required" },
        { status: 400 }
      );
    }

    // ── 1. Verify Firebase ID token (with revocation check) ───────────────────
    let decodedToken: Awaited<ReturnType<ReturnType<typeof getAdminAuth>["verifyIdToken"]>>;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken, /* checkRevoked= */ true);
    } catch (err) {
      console.error("Firebase verifyIdToken error:", err);
      return NextResponse.json(
        { error: "Invalid or expired verification token. Please try again." },
        { status: 401 }
      );
    }

    // ── 2. Reject stale tokens (older than 5 minutes) ─────────────────────────
    const authAge = Math.floor(Date.now() / 1000) - (decodedToken.auth_time ?? 0);
    if (authAge > MAX_AUTH_AGE_SECONDS) {
      return NextResponse.json(
        { error: "Verification token has expired. Please request a new OTP." },
        { status: 401 }
      );
    }

    // ── 3. Assert phone number matches ────────────────────────────────────────
    const expectedPhone = `+91${cleaned}`;
    if (decodedToken.phone_number !== expectedPhone) {
      // Log a generic mismatch without exposing PII (phone numbers)
      console.error("Phone mismatch between token and submitted phone number");
      return NextResponse.json(
        { error: "Phone number mismatch. Please try again." },
        { status: 401 }
      );
    }

    // ── 4. Upsert user ────────────────────────────────────────────────────────
    const [upsertedUser] = await db
      .insert(users)
      .values({ phone_number: expectedPhone })
      .onConflictDoNothing({ target: users.phone_number })
      .returning({ id: users.id });

    let userId = upsertedUser?.id;
    if (!userId) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone_number, expectedPhone))
        .limit(1);
      userId = existing?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
    }

    // ── 5. Issue session cookie ───────────────────────────────────────────────
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
      { error: "Server error during verification. Please check Vercel environment variables." },
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
