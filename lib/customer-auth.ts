import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const CUSTOMER_SESSION_COOKIE = "ppr_customer_session";
export const SESSION_DURATION_DAYS = 75; // 60-90 day range per spec


function getJwtSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) {
    // Allow Next.js static-build phase to proceed without secrets.
    // In real runtime (dev or prod) a missing secret is a hard misconfiguration.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return new TextEncoder().encode("__build_phase_placeholder__");
    }
    throw new Error(
      "CUSTOMER_JWT_SECRET environment variable is not set. " +
      "Add it to .env.local (dev) or Vercel environment variables (prod)."
    );
  }
  return new TextEncoder().encode(secret);
}

// ─── Session management ──────────────────────────────────────────────────────

export async function createCustomerSession(userId: string): Promise<string> {
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );
  return new SignJWT({ sub: userId, type: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());
}

export async function verifyCustomerSession(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || payload.type !== "customer") return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Like verifyCustomerSession but also returns the token's expiry time.
 * Used by the middleware to decide whether to slide the session window.
 */
export async function verifyCustomerSessionWithExp(
  token: string
): Promise<{ userId: string; exp: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || payload.type !== "customer" || !payload.exp) return null;
    return { userId: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

/** Mint a fresh 75-day token for the given userId (sliding window renewal). */
export async function renewCustomerSession(userId: string): Promise<string> {
  return createCustomerSession(userId);
}

export async function getCustomerSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerSession(token);
}

/**
 * Set the customer session cookie on a Response object.
 * Use in API route handlers after successful OTP verification.
 */
export function setCustomerSessionCookie(
  response: Response & { cookies: { set: (name: string, value: string, opts: object) => void } },
  token: string
) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}
