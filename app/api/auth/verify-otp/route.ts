import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { createCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

const SESSION_DURATION_DAYS = 75;

/**
 * POST /api/auth/verify-otp
 *
 * Body: { phone: "9876543210", idToken: "<Firebase ID token>" }
 *
 * Flow:
 *  1. Validate phone format.
 *  2. Verify the Firebase ID token with the Admin SDK.
 *  3. Assert the token's phone_number matches the submitted phone.
 *  4. Upsert the user row (first-time login creates the account).
 *  5. Issue a session cookie.
 */
export async function POST(req: NextRequest) {
  let body: { phone?: string; idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const phone = body.phone?.trim() ?? "";
  const idToken = body.idToken?.trim() ?? "";

  const raw = phone.replace(/\D/g, "");
  const cleaned = raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : raw;

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

  // ── 1. Verify Firebase ID token ───────────────────────────────────────────
  let decodedToken: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (err) {
    console.error("Firebase verifyIdToken error:", err);
    return NextResponse.json(
      { error: "Invalid or expired verification token. Please try again." },
      { status: 401 }
    );
  }

  // ── 2. Assert phone number matches ────────────────────────────────────────
  const expectedPhone = `+91${cleaned}`;
  if (decodedToken.phone_number !== expectedPhone) {
    console.error(
      `Phone mismatch: token has ${decodedToken.phone_number}, expected ${expectedPhone}`
    );
    return NextResponse.json(
      { error: "Phone number mismatch. Please try again." },
      { status: 401 }
    );
  }

  // ── 3. Upsert user ────────────────────────────────────────────────────────
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

  // ── 4. Issue session cookie ───────────────────────────────────────────────
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
}

// ── Customer logout ───────────────────────────────────────────────────────────
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
