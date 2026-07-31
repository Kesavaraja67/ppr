import { NextRequest, NextResponse } from "next/server";
import { checkOTPRateLimit, normalizeIndianMobile } from "@/lib/otp";

/**
 * Pre-flight rate-limit check — called by the login page BEFORE the browser
 * triggers Firebase's RecaptchaVerifier + signInWithPhoneNumber.
 *
 * This preserves a best-effort server-side abuse guard without the server
 * initiating the SMS send. The primary SMS enforcement controls are Firebase
 * App Check, SMS region policy, and per-phone quotas configured in the
 * Firebase Console.
 *
 * POST { phone: "9876543210" }
 * → 200 { allowed: true }
 * → 429 { error: "Too many OTP requests…", limitedBy: "phone" | "ip" }
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const cleaned = normalizeIndianMobile(body.phone?.trim() ?? "");

  if (cleaned.length !== 10) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number" },
      { status: 400 }
    );
  }

  const rateCheck = checkOTPRateLimit(cleaned, ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many OTP requests. Please wait 10 minutes before trying again.",
        limitedBy: rateCheck.limitedBy,
      },
      { status: 429 }
    );
  }

  return NextResponse.json({ allowed: true });
}
