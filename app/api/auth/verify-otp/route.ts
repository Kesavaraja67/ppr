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

  const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");
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

  // Find or create user
  const phoneWithCountry = `+91${cleaned}`;
  let [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone_number, phoneWithCountry))
    .limit(1);

  if (!existingUser) {
    const [newUser] = await db
      .insert(users)
      .values({ phone_number: phoneWithCountry })
      .returning({ id: users.id });
    existingUser = newUser;
  }

  const token = await createCustomerSession(existingUser.id);

  const response = NextResponse.json({ success: true, userId: existingUser.id });
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
