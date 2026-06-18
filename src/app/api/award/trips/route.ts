import { NextRequest, NextResponse } from "next/server";

// Returns the individual award flights (with times, flight numbers, stops and
// per-flight miles) for a seats.aero availability — used by the "View flights"
// expander on award cards. One /trips call per expand.

interface RawTrip {
  ID: string;
  FlightNumbers: string;
  OriginAirport: string;
  DestinationAirport: string;
  DepartsAt: string;
  ArrivesAt: string;
  TotalDuration: number;
  Stops: number;
  Connections?: string[];
  Aircraft?: string[];
  Cabin: string;
  MileageCost: number;
  TotalTaxes: number;
}

export interface AwardFlight {
  flightNumbers: string;
  departsAt: string;
  arrivesAt: string;
  durationMinutes: number;
  stops: number;
  connections: string[];
  aircraft: string[];
  miles: number;
  fees: number;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const cabin = req.nextUrl.searchParams.get("cabin") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing availability id." }, { status: 400 });
  }

  const key = process.env.SEATS_AERO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Award details unavailable." }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://seats.aero/partnerapi/trips/${encodeURIComponent(id)}`,
      {
        headers: { "Partner-Authorization": key, Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`trips ${res.status}`);

    const json = (await res.json()) as { data?: RawTrip[] };
    const raw = (json.data ?? []).filter((t) => !cabin || t.Cabin === cabin);

    // Dedupe identical flights (snapshots differ in price) — keep cheapest.
    const byFlight = new Map<string, AwardFlight>();
    for (const t of raw) {
      const f: AwardFlight = {
        flightNumbers: t.FlightNumbers,
        departsAt: t.DepartsAt,
        arrivesAt: t.ArrivesAt,
        durationMinutes: t.TotalDuration,
        stops: t.Stops,
        connections: t.Connections ?? [],
        aircraft: t.Aircraft ?? [],
        miles: t.MileageCost,
        fees: Math.round((t.TotalTaxes ?? 0) / 100),
      };
      const k = `${t.FlightNumbers}-${t.DepartsAt}`;
      const cur = byFlight.get(k);
      if (!cur || f.miles < cur.miles) byFlight.set(k, f);
    }

    const flights = [...byFlight.values()]
      .sort((a, b) => new Date(a.departsAt).getTime() - new Date(b.departsAt).getTime())
      .slice(0, 30);

    return NextResponse.json({ flights });
  } catch (err) {
    console.error("[award/trips] failed", id, err);
    return NextResponse.json({ error: "Could not load flights." }, { status: 502 });
  }
}
