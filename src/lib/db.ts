import { neon } from "@neondatabase/serverless";

// Vercel's Neon integration may provide the connection string under
// different variable names depending on setup. Check the common ones.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

if (!connectionString) {
  // Don't throw at import time during build — only when actually queried,
  // so the app can still build without env vars set.
  console.warn(
    "No database connection string found (checked DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING). Auth routes will fail until one is configured."
  );
}

export const sql = neon(connectionString);
