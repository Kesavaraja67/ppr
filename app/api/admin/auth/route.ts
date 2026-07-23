import { NextRequest, NextResponse } from "next/server";
import { verifyPin, createSession, checkRateLimit, recordFailedAttempt, clearRateLimit, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Get client IP for rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many failed attempts. Try again later.",
        lockedUntil: rateCheck.lockedUntil,
      },
      { status: 429 }
    );
  }

  let body: { phone?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { phone, pin } = body;
  if (!phone || !pin) {
    return NextResponse.json(
      { error: "Phone and PIN are required" },
      { status: 400 }
    );
  }

  const admin = await verifyPin(phone, pin);

  if (!admin) {
    recordFailedAttempt(ip);
    const remaining = checkRateLimit(ip).remainingAttempts;
    return NextResponse.json(
      {
        error: "Invalid credentials",
        remainingAttempts: remaining,
      },
      { status: 401 }
    );
  }

  // Success — clear rate limit and issue session
  clearRateLimit(ip);
  const token = await createSession(admin.id);

  const response = NextResponse.json({ success: true, name: admin.name });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  return response;
}

export async function DELETE() {
  // Logout — clear session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
