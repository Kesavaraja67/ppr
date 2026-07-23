import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// GET /api/auth/me — check if the current user has a valid session
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return NextResponse.json({
    loggedIn: true,
    userId: session.userId,
    name: user?.name ?? null,
  });
}
