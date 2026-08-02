import { NextRequest, NextResponse } from "next/server";
import { normalizeIndianMobile } from "@/lib/auth-helpers";
import { sendMsg91Otp } from "@/lib/msg91";

export async function POST(req: NextRequest) {
  let body: { phone?: string };
  try {
    body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawPhone = body.phone ?? "";
  const cleanedPhone = normalizeIndianMobile(rawPhone);

  if (cleanedPhone.length !== 10) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit mobile number" },
      { status: 400 }
    );
  }

  const result = await sendMsg91Otp(cleanedPhone);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Failed to send OTP" }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "OTP sent successfully" });
}
