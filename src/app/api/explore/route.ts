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
  const source = req.nextUrl.searchParams.get("source") ?? "";
  const originRegion = req.nextUrl.searchParams.get("originRegion") ?? "North America";
  const destRegion = req.nextUrl.searchParams.get("destRegion") ?? "";

  if (!programBySource(source)) {
    return NextResponse.json({ error: "Unknown program." }, { status: 400 });
  }
  const key = process.env.SEATS_AERO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Award data unavailable." }, { status: 503 });
  }

  const today = new Date();
  const end = new Date(today.getTime() + 60 * 86_400_000);
  const qs = new URLSearchParams({
    source,
    origin_region: originRegion,
    start_date: today.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    // Pull a broad sample, then keep only recently-seen (active) space below.
    take: "1000",
  });
  if (destRegion) qs.set("destination_region", destRegion);

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
      const cabins: Record<string, number | null> = {};
      for (const c of CABINS) {
        const available = Boolean(rec[`${c.key}Available`]);
        const miles = Number(rec[`${c.key}MileageCost`] ?? 0);
        cabins[c.label] = available && miles > 0 ? miles : null;
      }
      return {
        id: r.ID,
        date: r.Date,
        lastSeen: r.UpdatedAt,
        origin: r.Route.OriginAirport,
        destination: r.Route.DestinationAirport,
        ...cabins,
      };
    });

    // Keep only award space confirmed in the last 2 weeks ("active"), so we
    // don't show months-old phantom availability. Fall back to all if sparse.
    const FRESH_MS = 14 * 86_400_000;
    const now = Date.now();
    const fresh = mapped.filter(
      (r) => now - new Date(r.lastSeen).getTime() <= FRESH_MS,
    );
    const chosen = fresh.length >= 10 ? fresh : mapped;
    chosen.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ rows: chosen.slice(0, 200) });
  } catch (err) {
    console.error("[explore] failed", source, err);
    return NextResponse.json({ error: "Could not load award table." }, { status: 502 });
  }
}
