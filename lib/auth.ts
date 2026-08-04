import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { admins } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const SESSION_COOKIE = "ppr_session";
const SESSION_DURATION_DAYS = 30;

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.ADMIN_JWT_SECRET ||
    process.env.CUSTOMER_JWT_SECRET ||
    "ppr_admin_jwt_secret_fallback_2026_prod";
  return new TextEncoder().encode(secret);
}

// ─── Rate limiting (in-memory, per process) ───────────────────────────────────
// Simple map: IP → { count, lockedUntil }
const rateLimitMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: Date;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(entry.lockedUntil),
    };
  }

  // Lock expired — reset
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    rateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.count,
  };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { count: 0, lockedUntil: 0 };
  const newCount = entry.count + 1;

  if (newCount >= MAX_ATTEMPTS) {
    rateLimitMap.set(ip, { count: newCount, lockedUntil: now + LOCKOUT_MS });
  } else {
    rateLimitMap.set(ip, { count: newCount, lockedUntil: 0 });
  }
}

export function clearRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

// ─── PIN verification ────────────────────────────────────────────────────────
export async function verifyPin(
  phone: string,
  pin: string
): Promise<{ id: string; name: string; role: string } | null> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.phone, phone))
    .limit(1);

  if (!admin) return null;

  const valid = await bcrypt.compare(pin, admin.pin_hash);
  if (!valid) return null;

  return { id: admin.id, name: admin.name, role: admin.role };
}

// ─── Session management ──────────────────────────────────────────────────────
export async function createSession(adminId: string): Promise<string> {
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());

  return token;
}

export async function verifySession(
  token: string
): Promise<{ adminId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) return null;
    return { adminId: payload.sub };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ adminId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export { SESSION_COOKIE };
