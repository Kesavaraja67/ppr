import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/drizzle/schema";

// Fallback to placeholder during build phase so next build static page collection does not crash
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
