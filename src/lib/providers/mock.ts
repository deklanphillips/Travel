import type { CabinClass, Deal, FlightProvider, SearchParams } from "@/lib/types";
import { getAirport } from "@/lib/airports";
import { AIRLINES, type Airline } from "@/lib/alliances";

// A deterministic-ish mock provider so the UI looks real without any API key.
// It generates a spread of itineraries with both cash and award (miles) pricing.

type Carrier = Airline;

// Picks the pool of carriers to draw from, honoring airline/alliance filters.
function carrierPool(params: SearchParams): Carrier[] {
  if (params.airline) {
    const match = AIRLINES.filter((a) => a.code === params.airline);
    if (match.length) return match;
  }
  if (params.alliance && params.alliance !== "any") {
    const match = AIRLINES.filter((a) => a.alliance === params.alliance);
    if (match.length) return match;
  }
  return AIRLINES;
}

const CABIN_MULTIPLIER: Record<CabinClass, number> = {
  economy: 1,
  premium_economy: 1.7,
  business: 3.2,
  first: 5.5,
};

// Simple seeded pseudo-random so results are stable per search.
function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Rough great-circle-ish distance proxy from IATA codes (good enough for mock pricing).
function distanceProxy(origin: string, destination: string): number {
  const o = getAirport(origin);
  const d = getAirport(destination);
  if (!o || !d) return 3000;
  const cross = o.country !== d.country;
  const base = hashString(origin + destination) % 6000;
  return 800 + base + (cross ? 2500 : 0);
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export class MockProvider implements FlightProvider {
  name = "mock";

  async search(params: SearchParams): Promise<Deal[]> {
    const { origin, destination, departDate, cabin, passengers } = params;
    const seed = hashString(
      `${origin}-${destination}-${departDate}-${cabin}-${params.alliance ?? "any"}-${params.airline ?? ""}`,
    );
    const rng = makeRng(seed);
    const distance = distanceProxy(origin, destination);
    const cabinMult = CABIN_MULTIPLIER[cabin];
    const pool = carrierPool(params);

    const count = 6 + Math.floor(rng() * 5); // 6–10 results
    const deals: Deal[] = [];

    for (let i = 0; i < count; i++) {
      const carrier = pool[Math.floor(rng() * pool.length)];
      const stops = rng() < 0.55 ? 0 : rng() < 0.85 ? 1 : 2;

      const flightMinutes = Math.round(distance / 8 + stops * 90 + rng() * 120);
      const departHour = 6 + Math.floor(rng() * 14);
      const departIso = `${departDate}T${String(departHour).padStart(2, "0")}:${
        rng() < 0.5 ? "05" : "40"
      }:00.000Z`;

      const segments = buildSegments(
        origin,
        destination,
        departIso,
        flightMinutes,
        stops,
        carrier,
        rng,
      );

      // Cash pricing.
      const baseCash = (distance * 0.12 + 60) * cabinMult;
      const cashJitter = 0.8 + rng() * 0.5;
      const cashPrice =
        rng() < 0.92 ? Math.round(baseCash * cashJitter * passengers) : null;

      // Award pricing — miles roughly track distance + cabin, with program variance.
      const hasAward = rng() < 0.8;
      const baseMiles = (distance * 4.5 + 8000) * cabinMult;
      const milesJitter = 0.7 + rng() * 0.7;
      const award = hasAward
        ? {
            program: carrier.program,
            programCode: carrier.programCode,
            miles: Math.round((baseMiles * milesJitter * passengers) / 500) * 500,
            fees: Math.round((20 + rng() * 180) * cabinMult),
          }
        : null;

      // Guarantee at least one of cash / award exists.
      const finalCash = cashPrice ?? (award ? null : Math.round(baseCash * passengers));

      deals.push({
        id: `${carrier.code}-${i}-${seed}`,
        origin,
        destination,
        segments,
        stops,
        durationMinutes: flightMinutes,
        cabin,
        cashPrice: finalCash,
        award,
        seatsLeft: rng() < 0.4 ? 1 + Math.floor(rng() * 6) : null,
        provider: this.name,
      });
    }

    return deals;
  }
}

function buildSegments(
  origin: string,
  destination: string,
  departIso: string,
  totalMinutes: number,
  stops: number,
  carrier: Carrier,
  rng: () => number,
) {
  const hubs = ["IST", "DXB", "AMS", "FRA", "DOH", "SIN", "ORD"];
  const stopCodes: string[] = [];
  for (let i = 0; i < stops; i++) {
    stopCodes.push(hubs[Math.floor(rng() * hubs.length)]);
  }
  const points = [origin, ...stopCodes, destination];

  const legMinutes = Math.round(totalMinutes / points.length - 1);
  let cursor = departIso;
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const depart = cursor;
    const arrive = addMinutes(depart, legMinutes);
    segments.push({
      from: points[i],
      to: points[i + 1],
      departTime: depart,
      arriveTime: arrive,
      carrier: carrier.name,
      carrierCode: carrier.code,
      flightNumber: String(100 + Math.floor(rng() * 8900)),
    });
    // layover between 45 and 150 minutes
    cursor = addMinutes(arrive, 45 + Math.floor(rng() * 105));
  }
  return segments;
}
