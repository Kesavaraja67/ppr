import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otp";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { createCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

const SESSION_DURATION_DAYS = 75;

export async function POST(req: NextRequest) {
  let body: { phone?: string; otp?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const phone = body.phone?.trim() ?? "";
  const otp = body.otp?.trim() ?? "";
  const sessionId = body.sessionId?.trim() ?? "";

  const raw = phone.replace(/\D/g, "");
  const cleaned = raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : raw;
  if (cleaned.length !== 10 || !otp || !sessionId) {
    return NextResponse.json(
      { error: "Phone, OTP, and session ID are required" },
      { status: 400 }
    );
  }

  // Verify with 2Factor.in
  const verifyResult = await verifyOTP(sessionId, otp);
  if (!verifyResult.success) {
    return NextResponse.json({ error: verifyResult.error }, { status: 401 });
  }

  // Upsert user — onConflictDoNothing prevents duplicate rows on concurrent verifications
  const phoneWithCountry = `+91${cleaned}`;
  const [upsertedUser] = await db
    .insert(users)
    .values({ phone_number: phoneWithCountry })
    .onConflictDoNothing({ target: users.phone_number })
    .returning({ id: users.id });

  // If onConflictDoNothing suppressed the insert, fetch the existing row
  const userId = upsertedUser?.id ?? (
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone_number, phoneWithCountry))
      .limit(1)
  ).then((rows) => rows[0]?.id);

  if (!userId) {
    return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
  }

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

// Customer logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
