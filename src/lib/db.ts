import { neon } from "@neondatabase/serverless";

// Neon serverless Postgres client. `sql` is null when DATABASE_URL isn't
// configured, so the app runs fine without a database (features that need it
// degrade gracefully instead of crashing).
//
// Usage:  const rows = await sql`select * from alerts where active = true`;

const url = process.env.DATABASE_URL;

export const sql = url ? neon(url) : null;

export function hasDb(): boolean {
  return sql !== null;
}
