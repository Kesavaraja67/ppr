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
 *  2. `checkOTPRateLimit(phone, ip)` — combined phone+IP guard (kept for compat).
 *  3. `checkIpRateLimit(ip)` — IP-only pre-flight, call BEFORE the MSG91 request.
 *  4. `checkPhoneRateLimit(phone)` — phone-only check, call AFTER phone is resolved.
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

/** Sweep expired entries from a rate-limit map to bound memory growth. */
function evictExpired(map: Map<string, RateLimitEntry>): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (now - entry.windowStart > WINDOW_MS) map.delete(key);
  }
}

function checkAndRecord(map: Map<string, RateLimitEntry>, key: string): boolean {
  const now = Date.now();
  evictExpired(map);
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

/**
 * IP-only rate-limit check — call BEFORE the MSG91 verify request so a
 * flood of attempts does not consume MSG91 quota.
 */
export function checkIpRateLimit(
  ip: string
): { allowed: boolean } {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  const count = entry && now - entry.windowStart <= WINDOW_MS ? entry.count : 0;
  if (count >= MAX_ATTEMPTS) return { allowed: false };
  checkAndRecord(ipRateMap, ip);
  return { allowed: true };
}

/**
 * Phone-only rate-limit check — call AFTER the phone is resolved from MSG91
 * to guard against replayed access-tokens for a specific number.
 */
export function checkPhoneRateLimit(
  phone: string
): { allowed: boolean } {
  const normalizedPhone = phone.replace(/\D/g, "");
  const now = Date.now();
  const entry = phoneRateMap.get(normalizedPhone);
  const count = entry && now - entry.windowStart <= WINDOW_MS ? entry.count : 0;
  if (count >= MAX_ATTEMPTS) return { allowed: false };
  checkAndRecord(phoneRateMap, normalizedPhone);
  return { allowed: true };
}
