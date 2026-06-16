import { NextResponse } from "next/server";
import { searchAirports, getAirport } from "@/lib/airports";

// Autocomplete endpoint for the airport pickers. Keeps the ~300KB dataset on
// the server; the client fetches only the handful of matches it needs.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const code = searchParams.get("code");

  // Resolve a single airport by exact IATA code (used to hydrate defaults).
  if (code) {
    const airport = getAirport(code);
    return NextResponse.json({ airports: airport ? [airport] : [] });
  }

  const airports = searchAirports(q, 8);
  return NextResponse.json({ airports });
}
