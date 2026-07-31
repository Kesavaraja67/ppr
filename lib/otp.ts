/**
 * OTP utilities — shared normalisation + best-effort rate limiting.
 *
 * The actual OTP send/verify flow happens client-side via the Firebase
 * client SDK (RecaptchaVerifier + signInWithPhoneNumber + confirmationResult.confirm).
 * Firebase itself enforces SMS abuse through App Check, per-phone quotas,
 * and console-level SMS region policies — those are the primary enforcement
 * controls.
 *
 * This module provides:
 *  1. `normalizeIndianMobile(input)` — shared phone-number normaliser.
 *  2. `checkOTPRateLimit(phone, ip)` — a best-effort pre-flight guard that
 *     prevents a well-intentioned user from spamming the Firebase trigger
 *     from the app's own login UI. Because it uses in-process Maps, it resets
 *     per serverless instance and is NOT a security boundary on its own.
 *
 * Rate limit: max 3 OTP requests per phone number AND per IP per 10-minute window.
 */

// ─── Shared normaliser ────────────────────────────────────────────────────────
/**
 * Strips non-digits and removes the Indian country code (91) only when the
 * input is exactly 12 digits and starts with "91".
 *
 * Examples:
 *   "9876543210"    → "9876543210"   (10-digit, no country code)
 *   "+919876543210" → "9876543210"   (12 digits after stripping non-digits)
 *   "919876543210"  → "9876543210"   (12 digits starting with 91)
 *   "9198765432"    → "9198765432"   (10 digits starting with 91 — not stripped)
 */
export function normalizeIndianMobile(input: string): string {
  const raw = input.replace(/\D/g, "");
  return raw.length === 12 && raw.startsWith("91") ? raw.slice(2) : raw;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-process Maps. A serverless reset starts a fresh window — that is
// acceptable here because Firebase quotas are the real enforcement layer.
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
