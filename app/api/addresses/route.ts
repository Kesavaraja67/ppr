import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getCustomerSession } from "@/lib/customer-auth";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.user_id, session.userId));

  return NextResponse.json({ addresses: userAddresses });
}
