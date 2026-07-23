import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const CUSTOMER_SESSION_COOKIE = "ppr_customer_session";
const SESSION_DURATION_DAYS = 75; // 60-90 day range per spec

const JWT_SECRET = new TextEncoder().encode(
  process.env.CUSTOMER_JWT_SECRET ?? "fallback-customer-secret-change-in-production"
);

// ─── Session management ──────────────────────────────────────────────────────

export async function createCustomerSession(userId: string): Promise<string> {
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );
  return new SignJWT({ sub: userId, type: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}

export async function verifyCustomerSession(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || payload.type !== "customer") return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
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
