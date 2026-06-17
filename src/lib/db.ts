import { neon } from "@neondatabase/serverless";

// Neon serverless Postgres client. `sql` is null when DATABASE_URL isn't
// configured, so the app runs fine without a database (features that need it
// degrade gracefully instead of crashing).
//
// Usage:  const rows = await sql`select * from alerts where active = true`;

const url = process.env.DATABASE_URL;

// `fetchOptions: { cache: "no-store" }` is essential: without it, Next.js caches
// the neon query responses and serves stale data (e.g. the alerts list never
// reflects newly-added rows).
export const sql = url ? neon(url, { fetchOptions: { cache: "no-store" } }) : null;

export function hasDb(): boolean {
  return sql !== null;
}
