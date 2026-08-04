import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

// Fallback to placeholder during build phase so next build static page collection does not crash
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
