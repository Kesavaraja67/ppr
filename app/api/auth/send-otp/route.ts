import { NextRequest, NextResponse } from "next/server";
import { checkOTPRateLimit, sendOTP } from "@/lib/otp";

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

  const phone = body.phone?.trim() ?? "";
  const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");

  if (cleaned.length !== 10) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number" },
      { status: 400 }
    );
  }

  // Rate limit: max 3 OTP requests per phone + per IP per 10-minute window
  const rateCheck = checkOTPRateLimit(cleaned, ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many OTP requests. Please wait 10 minutes before trying again.",
        limitedBy: rateCheck.limitedBy,
      },
      { status: 429 }
    );
  }

  const result = await sendOTP(cleaned);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ sessionId: result.sessionId });
}
