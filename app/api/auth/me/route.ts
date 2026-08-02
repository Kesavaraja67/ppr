import { NextResponse } from "next/server";
import { getCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { users, addresses } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/auth/me — return current authenticated customer profile & addresses
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }

  const [user] = await db
    .select({ name: users.name, phone_number: users.phone_number })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const userAddresses = await db
    .select({
      id: addresses.id,
      full_address: addresses.full_address,
      lat: addresses.lat,
      long: addresses.long,
      is_within_range: addresses.is_within_range,
    })
    .from(addresses)
    .where(eq(addresses.user_id, session.userId))
    .orderBy(desc(addresses.created_at));

  return NextResponse.json({
    loggedIn: true,
    userId: session.userId,
    name: user?.name ?? null,
    phone_number: user?.phone_number ?? null,
    addresses: userAddresses,
  });
}

// DELETE /api/auth/me — Sign out customer by clearing session cookie
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
