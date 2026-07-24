import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local so drizzle-kit CLI can pick up DATABASE_URL
config({ path: ".env.local" });

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
