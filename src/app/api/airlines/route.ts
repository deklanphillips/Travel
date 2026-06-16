import { NextResponse } from "next/server";
import { searchAirlines, getAirline, type Alliance } from "@/lib/alliances";

const ALLIANCES: Alliance[] = ["star", "oneworld", "skyteam", "none"];

function parseAlliance(value: string | null): Alliance | "any" {
  if (value && (ALLIANCES as string[]).includes(value)) return value as Alliance;
  return "any";
}

// Autocomplete endpoint for the airline picker.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const airline = getAirline(code);
    return NextResponse.json({ airlines: airline ? [airline] : [] });
  }

  const q = searchParams.get("q") ?? "";
  const alliance = parseAlliance(searchParams.get("alliance"));
  return NextResponse.json({ airlines: searchAirlines(q, alliance, 8) });
}
