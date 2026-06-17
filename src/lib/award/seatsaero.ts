import type { CabinClass } from "@/lib/types";
import type { AwardAvailability, AwardQuery, AwardSource } from "./types";

// seats.aero Partner API — cached award availability across many loyalty
// programs. https://developers.seats.aero
//
// IMPORTANT (licensing): the seats.aero API is PERSONAL / non-commercial use
// only. Commercial/production use requires their written approval. This is
// gated behind SEATS_AERO_API_KEY and off by default — only enable it for
// permitted use.

const BASE = "https://seats.aero/partnerapi";

// Maps our cabin to the seats.aero per-cabin field prefix (Y/W/J/F).
const CABIN_KEY: Record<CabinClass, "Y" | "W" | "J" | "F"> = {
  economy: "Y",
  premium_economy: "W",
  business: "J",
  first: "F",
};

// seats.aero "Source" (mileage program) -> display name + booking carrier code.
const PROGRAMS: Record<string, { name: string; code: string }> = {
  aeroplan: { name: "Aeroplan", code: "AC" },
  united: { name: "MileagePlus", code: "UA" },
  delta: { name: "SkyMiles", code: "DL" },
  american: { name: "AAdvantage", code: "AA" },
  alaska: { name: "Mileage Plan", code: "AS" },
  jetblue: { name: "TrueBlue", code: "B6" },
  virginatlantic: { name: "Flying Club", code: "VS" },
  flyingblue: { name: "Flying Blue", code: "AF" },
  lifemiles: { name: "LifeMiles", code: "AV" },
  aeromexico: { name: "Club Premier", code: "AM" },
  emirates: { name: "Skywards", code: "EK" },
  etihad: { name: "Etihad Guest", code: "EY" },
  qantas: { name: "Qantas FF", code: "QF" },
  velocity: { name: "Velocity", code: "VA" },
  connectmiles: { name: "ConnectMiles", code: "CM" },
  smiles: { name: "Smiles", code: "G3" },
  azul: { name: "TudoAzul", code: "AD" },
  singapore: { name: "KrisFlyer", code: "SQ" },
  qatar: { name: "Privilege Club", code: "QR" },
  ana: { name: "ANA Mileage Club", code: "NH" },
  british: { name: "Avios (BA)", code: "BA" },
  lufthansa: { name: "Miles & More", code: "LH" },
  turkish: { name: "Miles&Smiles", code: "TK" },
  saudia: { name: "AlFursan", code: "SV" },
  sas: { name: "EuroBonus", code: "SK" },
  finnair: { name: "Finnair Plus", code: "AY" },
  ethiopian: { name: "ShebaMiles", code: "ET" },
  frontier: { name: "Frontier Miles", code: "F9" },
};

interface RawRoute {
  OriginAirport: string;
  DestinationAirport: string;
  Distance: number;
}

interface RawRow {
  ID: string;
  Date: string;
  Source: string;
  UpdatedAt: string;
  Route: RawRoute;
  [key: string]: unknown;
}

export class SeatsAeroSource implements AwardSource {
  name = "seats.aero";
  programCode = "seatsaero";

  constructor(private apiKey: string) {}

  async search(query: AwardQuery): Promise<AwardAvailability[]> {
    const qs = new URLSearchParams({
      origin_airport: query.origin,
      destination_airport: query.destination,
      start_date: query.date,
      end_date: query.date,
      take: "100",
    });

    const res = await fetch(`${BASE}/search?${qs.toString()}`, {
      headers: {
        "Partner-Authorization": this.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`seats.aero error ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as { data?: RawRow[] };
    const rows = json.data ?? [];
    const key = CABIN_KEY[query.cabin];

    const out: AwardAvailability[] = [];
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const available = Boolean(r[`${key}Available`]);
      if (!available) continue;

      const miles = Number(r[`${key}MileageCost`] ?? 0);
      if (!miles) continue;

      const taxesCents = Number(r[`${key}TotalTaxes`] ?? 0); // cents of TaxesCurrency
      const seats = Number(r[`${key}RemainingSeats`] ?? 0) || null;
      const airlines = String(r[`${key}Airlines`] ?? "");
      const carrierCode = airlines.split(",")[0]?.trim().slice(0, 2) || "";

      const prog =
        PROGRAMS[row.Source] ??
        {
          name: row.Source.charAt(0).toUpperCase() + row.Source.slice(1),
          code: carrierCode,
        };

      out.push({
        program: prog.name,
        programCode: prog.code,
        origin: row.Route.OriginAirport,
        destination: row.Route.DestinationAirport,
        date: row.Date,
        cabin: query.cabin,
        miles,
        fees: Math.round(taxesCents / 100),
        seats,
        carrierCode: carrierCode || prog.code,
        lastSeen: row.UpdatedAt,
        source: this.name,
        availabilityId: row.ID,
      });
    }

    // Cheapest (fewest miles) first.
    return out.sort((a, b) => a.miles - b.miles);
  }
}
