import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/drizzle/schema";

// Use a module-level singleton to reuse connections across requests
// (important for serverless/edge environments like Vercel)
const globalForDb = globalThis as unknown as {
  _pgClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb._pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 1, // Neon serverless: keep connection count low
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });
