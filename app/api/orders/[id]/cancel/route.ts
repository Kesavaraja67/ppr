import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Customer self-cancellation is disabled. Please contact the shop owner directly to request any order changes or cancellation." },
    { status: 403 }
  );
}
