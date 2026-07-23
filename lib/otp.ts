/**
 * 2Factor.in OTP integration + rate limiting.
 *
 * 2Factor.in API (prepaid credit model — no card on file):
 *   Send OTP:   GET https://2factor.in/API/V1/{apikey}/SMS/{phone}/AUTOGEN
 *   Verify OTP: GET https://2factor.in/API/V1/{apikey}/SMS/VERIFY/{sessionId}/{otp}
 *
 * Rate limit: max 3 OTP requests per phone number AND per IP per 10-minute window.
 * This is a non-negotiable safeguard against prepaid-credit abuse.
 */

const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY ?? "";
const TWOFACTOR_BASE = "https://2factor.in/API/V1";

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory per-process. Serverless resets are acceptable here — the window
// is short (10 min) and a reset just means a fresh window, not a security hole.
const MAX_OTP_REQUESTS = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const phoneRateMap = new Map<string, RateLimitEntry>();
const ipRateMap = new Map<string, RateLimitEntry>();

function checkAndRecord(map: Map<string, RateLimitEntry>, key: string): boolean {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    map.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }

  if (entry.count >= MAX_OTP_REQUESTS) {
    return false; // rate limited
  }

  entry.count += 1;
  return true; // allowed
}

export function checkOTPRateLimit(phone: string, ip: string): {
  allowed: boolean;
  limitedBy?: "phone" | "ip";
} {
  // Check phone first, then IP — both must pass
  const normalizedPhone = phone.replace(/\D/g, ""); // strip non-digits

  // Use peek-then-record: check without incrementing, then increment only if both pass
  const now = Date.now();
  const phoneEntry = phoneRateMap.get(normalizedPhone);
  const ipEntry = ipRateMap.get(ip);

  const phoneCount =
    phoneEntry && now - phoneEntry.windowStart <= WINDOW_MS ? phoneEntry.count : 0;
  const ipCount =
    ipEntry && now - ipEntry.windowStart <= WINDOW_MS ? ipEntry.count : 0;

  if (phoneCount >= MAX_OTP_REQUESTS) {
    return { allowed: false, limitedBy: "phone" };
  }
  if (ipCount >= MAX_OTP_REQUESTS) {
    return { allowed: false, limitedBy: "ip" };
  }

  // Both pass — record the attempt
  checkAndRecord(phoneRateMap, normalizedPhone);
  checkAndRecord(ipRateMap, ip);
  return { allowed: true };
}

// ─── 2Factor.in API calls ────────────────────────────────────────────────────

export type OTPSendResult = {
  success: true;
  sessionId: string;
} | {
  success: false;
  error: string;
};

export async function sendOTP(phone: string): Promise<{ success: true; sessionId: string } | { success: false; error: string }> {
  if (!TWOFACTOR_API_KEY) {
    console.error("TWOFACTOR_API_KEY is not set");
    return { success: false, error: "OTP service not configured" };
  }

  // Ensure 10-digit Indian mobile number
  const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");
  if (cleaned.length !== 10) {
    return { success: false, error: "Invalid phone number format" };
  }

  try {
    const url = `${TWOFACTOR_BASE}/${TWOFACTOR_API_KEY}/SMS/${cleaned}/AUTOGEN`;
    const res = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return { success: false, error: "OTP gateway error" };
    }

    const data = await res.json() as { Status: string; Details: string };

    if (data.Status !== "Success") {
      console.error("2Factor send error:", data);
      return { success: false, error: "Failed to send OTP" };
    }

    return { success: true, sessionId: data.Details };
  } catch (err) {
    console.error("2Factor fetch error:", err);
    return { success: false, error: "Network error sending OTP" };
  }
}

export async function verifyOTP(
  sessionId: string,
  otpCode: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!TWOFACTOR_API_KEY) {
    return { success: false, error: "OTP service not configured" };
  }

  // Clean the OTP code — digits only
  const cleaned = otpCode.replace(/\D/g, "");
  if (cleaned.length < 4 || cleaned.length > 8) {
    return { success: false, error: "Invalid OTP format" };
  }

  try {
    const url = `${TWOFACTOR_BASE}/${TWOFACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${cleaned}`;
    const res = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return { success: false, error: "OTP gateway error" };
    }

    const data = await res.json() as { Status: string; Details: string };

    if (data.Status === "Success" && data.Details === "OTP Matched") {
      return { success: true };
    }

    return { success: false, error: "Incorrect OTP. Please try again." };
  } catch (err) {
    console.error("2Factor verify error:", err);
    return { success: false, error: "Network error verifying OTP" };
  }
}
