/**
 * Auth helpers — phone normalisation + server-side OTP rate limiting.
 *
 * OTP send is driven entirely client-side by the MSG91 Widget SDK
 * (window.sendOtp / window.verifyOtp). Once the widget verifies the code it
 * issues an access-token which the browser forwards to
 * POST /api/auth/verify-otp for server-side confirmation via MSG91's
 * verifyAccessToken endpoint before we issue a session cookie.
 *
 * This module provides:
 *  1. `normalizeIndianMobile(input)` — shared phone-number normaliser used by
 *     client components and the verify-otp route.
 *  2. `checkOTPRateLimit(phone, ip)` — a best-effort server-side guard on the
 *     verify route so a stolen access-token cannot be replayed en-masse.
 *     Uses in-process Maps; resets on serverless cold-start — acceptable
 *     because MSG91's own widget abuse protection is the primary hard limit.
 *
 * Rate limit: max 3 verify attempts per phone number AND per IP per 10-min window.
 */

// ─── Phone normaliser ─────────────────────────────────────────────────────────
/**
 * Strips non-digits and removes the Indian country code (91) only when the
 * input is exactly 12 digits and starts with "91".
 *
 * Examples:
 *   "9876543210"    → "9876543210"   (10-digit, no change)
 *   "+919876543210" → "9876543210"   (strip +, then strip 91 prefix)
 *   "919876543210"  → "9876543210"   (12 digits starting with 91 — stripped)
 *   "9198765432"    → "9198765432"   (10 digits starting with 91 — not stripped)
 */
export function normalizeIndianMobile(input: string): string {
  const raw = input.replace(/\D/g, "");
  return raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : raw;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 3;
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
    map.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

export function checkOTPRateLimit(
  phone: string,
  ip: string
): { allowed: boolean; limitedBy?: "phone" | "ip" } {
  const normalizedPhone = phone.replace(/\D/g, "");
  const now = Date.now();

  const phoneEntry = phoneRateMap.get(normalizedPhone);
  const ipEntry = ipRateMap.get(ip);

  const phoneCount =
    phoneEntry && now - phoneEntry.windowStart <= WINDOW_MS ? phoneEntry.count : 0;
  const ipCount =
    ipEntry && now - ipEntry.windowStart <= WINDOW_MS ? ipEntry.count : 0;

  if (phoneCount >= MAX_ATTEMPTS) return { allowed: false, limitedBy: "phone" };
  if (ipCount >= MAX_ATTEMPTS) return { allowed: false, limitedBy: "ip" };

  checkAndRecord(phoneRateMap, normalizedPhone);
  checkAndRecord(ipRateMap, ip);
  return { allowed: true };
}
