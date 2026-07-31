/**
 * OTP rate limiting.
 *
 * The actual OTP send/verify flow now happens client-side via the Firebase
 * client SDK (RecaptchaVerifier + signInWithPhoneNumber + confirmationResult.confirm).
 * This module only provides the server-side rate limit guard, called from
 * POST /api/auth/check-rate-limit before the browser triggers Firebase.
 *
 * Rate limit: max 3 OTP requests per phone number AND per IP per 10-minute window.
 * This is a non-negotiable safeguard against SMS credit abuse.
 */

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
