import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { getAirline } from "@/lib/alliances";
import type {
  AllianceFilter,
  CabinClass,
  SearchParams,
  SearchResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";
// Live providers (e.g. Travelpayouts realtime search) poll for several seconds.
export const maxDuration = 30;

const VALID_CABINS: CabinClass[] = [
  "economy",
  "premium_economy",
  "business",
  "first",
];

const VALID_ALLIANCES: AllianceFilter[] = ["any", "star", "oneworld", "skyteam"];

function parseParams(searchParams: URLSearchParams): SearchParams | { error: string } {
  const origin = (searchParams.get("origin") ?? "").toUpperCase().trim();
  const destination = (searchParams.get("destination") ?? "").toUpperCase().trim();
  const departDate = searchParams.get("departDate") ?? "";
  const returnDate = searchParams.get("returnDate") ?? undefined;
  const passengers = Number(searchParams.get("passengers") ?? "1");
  const cabin = (searchParams.get("cabin") ?? "economy") as CabinClass;
  const alliance = (searchParams.get("alliance") ?? "any") as AllianceFilter;
  const airlineParam = (searchParams.get("airline") ?? "").toUpperCase().trim();

  if (!/^[A-Z]{3}$/.test(origin)) return { error: "Invalid origin airport code." };
  if (!/^[A-Z]{3}$/.test(destination))
    return { error: "Invalid destination airport code." };
  if (origin === destination)
    return { error: "Origin and destination must differ." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departDate))
    return { error: "Invalid departure date." };
  if (returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(returnDate))
    return { error: "Invalid return date." };
  if (!Number.isFinite(passengers) || passengers < 1 || passengers > 9)
    return { error: "Passengers must be between 1 and 9." };
  if (!VALID_CABINS.includes(cabin)) return { error: "Invalid cabin class." };
  if (!VALID_ALLIANCES.includes(alliance))
    return { error: "Invalid alliance filter." };
  if (airlineParam && !getAirline(airlineParam))
    return { error: "Unknown airline." };

  return {
    origin,
    destination,
    departDate,
    returnDate: returnDate || undefined,
    passengers,
    cabin,
    alliance,
    airline: airlineParam || undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseParams(searchParams);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const provider = getProvider();

  try {
    const deals = await provider.search(parsed);
    const response: SearchResponse = {
      params: parsed,
      deals,
      provider: provider.name,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[search] provider error", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Search failed. Please try again.",
        // Surfaced to help diagnose provider/credential issues during setup.
        detail,
      },
      { status: 502 },
    );
  }
}
