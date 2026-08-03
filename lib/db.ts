import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/drizzle/schema";

// Fallback to placeholder during build phase so next build static page collection does not crash
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

neonConfig.webSocketConstructor = ws;

// max: 1 — each serverless invocation uses at most one DB connection.
// Without this, the pool can open multiple connections per cold-start,
// quickly exhausting Neon's free-tier limit (5–20 connections).
const pool = new Pool({ connectionString, max: 1 });
export const db = drizzle(pool, { schema });
