import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { getAirline } from "@/lib/alliances";
import { getAwardSource } from "@/lib/award";
import { bookingLinksFor } from "@/lib/booking";
import type { AwardAvailability } from "@/lib/award/types";
import type {
  AllianceFilter,
  CabinClass,
  Deal,
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

  // Dates may be an exact day (YYYY-MM-DD) or a whole month (YYYY-MM).
  const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/;
  // Destination may be blank — that means "anywhere" from the origin.
  const anywhere = destination === "" || destination === "ANY";

  if (!/^[A-Z]{3}$/.test(origin)) return { error: "Invalid origin airport code." };
  if (!anywhere && !/^[A-Z]{3}$/.test(destination))
    return { error: "Invalid destination airport code." };
  if (!anywhere && origin === destination)
    return { error: "Origin and destination must differ." };
  if (!DATE_RE.test(departDate))
    return { error: "Invalid departure date." };
  if (returnDate && !DATE_RE.test(returnDate))
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
    destination: anywhere ? "" : destination,
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
    const cashDeals = await provider.search(parsed);

    // Merge in award (miles) availability if an award source is configured.
    const awardDeals = await fetchAwardDeals(parsed);

    // Attach the cheapest cash fare per destination to each award deal, so the
    // UI can show the cash-vs-points value (cents per mile).
    const cheapestCashByDest = new Map<string, number>();
    for (const d of cashDeals) {
      if (d.cashPrice === null) continue;
      const cur = cheapestCashByDest.get(d.destination);
      if (cur === undefined || d.cashPrice < cur) {
        cheapestCashByDest.set(d.destination, d.cashPrice);
      }
    }
    const awardWithCompare = awardDeals.map((d) => ({
      ...d,
      cashCompare: cheapestCashByDest.get(d.destination) ?? null,
    }));

    // Merge award availability onto a matching cash flight (same operating
    // carrier + cabin) so a single card can show BOTH cash and miles. Awards
    // with no matching cash flight stay as their own award-only cards.
    const usedAward = new Set<string>();
    for (const cash of cashDeals) {
      if (cash.award) continue;
      const carrier = cash.segments[0]?.carrierCode;
      if (!carrier) continue;
      let best: (typeof awardWithCompare)[number] | undefined;
      for (const a of awardWithCompare) {
        if (usedAward.has(a.id)) continue;
        if (a.cabin !== cash.cabin) continue;
        if (a.segments[0]?.carrierCode !== carrier) continue;
        if (!best || (a.award?.miles ?? Infinity) < (best.award?.miles ?? Infinity)) {
          best = a;
        }
      }
      if (best?.award) {
        cash.award = best.award;
        cash.awardBookingUrl = best.awardBookingUrl;
        usedAward.add(best.id);
      }
    }
    const remainingAward = awardWithCompare.filter((a) => !usedAward.has(a.id));

    const response: SearchResponse = {
      params: parsed,
      deals: [...cashDeals, ...remainingAward],
      // Generic label only — never expose the underlying data provider's name.
      provider: provider.name === "mock" ? "mock" : "live",
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[search] provider error", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "The site hit a refresh error — please search again.",
        // Technical detail is exposed only in local development so real users
        // never see internal errors (or which data provider we use) in production.
        ...(process.env.NODE_ENV === "development" ? { detail } : {}),
      },
      { status: 502 },
    );
  }
}

// Queries the configured award source and turns availability into award-only
// deals (no specific flight/time — they represent bookable award space).
async function fetchAwardDeals(params: SearchParams): Promise<Deal[]> {
  const source = getAwardSource();
  if (!source) return [];
  // Award lookups need a concrete destination + day (not anywhere/whole-month).
  if (!params.destination || !/^\d{4}-\d{2}-\d{2}$/.test(params.departDate)) return [];

  try {
    const availability = await source.search({
      origin: params.origin,
      destination: params.destination,
      date: params.departDate,
      cabin: params.cabin,
      passengers: params.passengers,
    });
    return availability.map((a) => awardToDeal(a, params));
  } catch (err) {
    // Award data is supplementary — never fail the whole search on it.
    console.error("[award] source error", err);
    return [];
  }
}

function awardToDeal(a: AwardAvailability, params: SearchParams): Deal {
  const carrier = getAirline(a.carrierCode)?.name || a.carrierCode;
  // Award booking goes to the PROGRAM you redeem with (e.g. United miles ->
  // united.com), even when another carrier operates the flight.
  const award = bookingLinksFor(a.programCode, { ...params, cabin: a.cabin }).award;
  return {
    id: `award-${a.source}-${a.programCode}-${a.date}-${a.cabin}-${a.miles}`,
    origin: a.origin,
    destination: a.destination,
    segments: [
      {
        from: a.origin,
        to: a.destination,
        departTime: `${a.date}T12:00:00`,
        arriveTime: `${a.date}T12:00:00`,
        carrier,
        carrierCode: a.carrierCode,
        flightNumber: "",
      },
    ],
    stops: 0,
    durationMinutes: 0,
    cabin: a.cabin,
    cashPrice: null,
    award: {
      program: a.program,
      programCode: a.programCode,
      miles: a.miles,
      fees: a.fees,
    },
    cashBookingUrl: null,
    awardBookingUrl: award,
    seatsLeft: a.seats,
    provider: "seatsaero",
    awardAvailabilityOnly: true,
  };
}
