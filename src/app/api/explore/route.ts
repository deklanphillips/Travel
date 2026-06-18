import { NextRequest, NextResponse } from "next/server";
import { programBySource } from "@/data/programs";

// Powers the per-program Explore table: pulls bulk award availability for one
// mileage program (optionally filtered by origin/destination region) from
// seats.aero and returns per-cabin lowest miles per route/date.

interface RawRow {
  ID: string;
  Date: string;
  UpdatedAt: string;
  Route: { OriginAirport: string; DestinationAirport: string };
  [key: string]: unknown;
}

const CABINS = [
  { key: "Y", label: "economy" },
  { key: "W", label: "premium" },
  { key: "J", label: "business" },
  { key: "F", label: "first" },
] as const;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const source = sp.get("source") ?? "";
  const originRegion = sp.get("originRegion") ?? "North America";
  const destRegion = sp.get("destRegion") ?? "";
  const originAirport = (sp.get("originAirport") ?? "").toUpperCase();
  const destAirport = (sp.get("destAirport") ?? "").toUpperCase();
  const airportMode = Boolean(originAirport || destAirport);

  if (!programBySource(source)) {
    return NextResponse.json({ error: "Unknown program." }, { status: 400 });
  }
  const key = process.env.SEATS_AERO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Award data unavailable." }, { status: 503 });
  }

  const today = new Date();
  const days = Math.min(Math.max(Number(sp.get("days") ?? "90") || 90, 7), 365);
  const end = new Date(today.getTime() + days * 86_400_000);
  const qs = new URLSearchParams({
    source,
    start_date: today.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    // Pull a broad sample, then keep only recently-seen (active) space below.
    take: "1000",
  });
  // Airport mode = "all flights to/from this airport"; otherwise filter by region.
  if (airportMode) {
    if (originAirport) qs.set("origin_airport", originAirport);
    if (destAirport) qs.set("destination_airport", destAirport);
  } else {
    qs.set("origin_region", originRegion);
    if (destRegion) qs.set("destination_region", destRegion);
  }

  try {
    const res = await fetch(
      `https://seats.aero/partnerapi/availability?${qs.toString()}`,
      {
        headers: { "Partner-Authorization": key, Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`availability ${res.status}`);
    const json = (await res.json()) as { data?: RawRow[] };

    const mapped = (json.data ?? []).map((r) => {
      const rec = r as Record<string, unknown>;
      const cabins: Record<string, {
        miles: number;
        seats: number;
        direct: boolean;
        airlines: string;
      } | null> = {};
      const airlineSet = new Set<string>();
      for (const c of CABINS) {
        const available = Boolean(rec[`${c.key}Available`]);
        const miles = Number(rec[`${c.key}MileageCost`] ?? 0);
        if (available && miles > 0) {
          const airlines = String(rec[`${c.key}Airlines`] ?? "");
          cabins[c.label] = {
            miles,
            seats: Number(rec[`${c.key}RemainingSeats`] ?? 0) || 0,
            direct: Boolean(rec[`${c.key}Direct`]),
            airlines,
          };
          airlines
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((a) => airlineSet.add(a));
        } else {
          cabins[c.label] = null;
        }
      }
      return {
        id: r.ID,
        date: r.Date,
        lastSeen: r.UpdatedAt,
        origin: r.Route.OriginAirport,
        destination: r.Route.DestinationAirport,
        cabins,
        airlines: [...airlineSet],
      };
    });

    // Belt-and-suspenders airport filter (in case the API ignores it).
    const filtered = airportMode
      ? mapped.filter(
          (r) =>
            (!originAirport || r.origin === originAirport) &&
            (!destAirport || r.destination === destAirport),
        )
      : mapped;

    // Keep only award space confirmed in the last 2 weeks ("active"), so we
    // don't show months-old phantom availability. Fall back to all if sparse.
    const FRESH_MS = 14 * 86_400_000;
    const now = Date.now();
    const fresh = filtered.filter(
      (r) => now - new Date(r.lastSeen).getTime() <= FRESH_MS,
    );
    const chosen = fresh.length >= 10 ? fresh : filtered;
    // Most recently-seen first.
    chosen.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    return NextResponse.json({ rows: chosen.slice(0, 200) });
  } catch (err) {
    console.error("[explore] failed", source, err);
    return NextResponse.json({ error: "Could not load award table." }, { status: 502 });
  }
}
