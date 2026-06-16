// Comprehensive commercial airport dataset (3,200+ airports with IATA codes),
// sourced from the public-domain OurAirports dataset and filtered to
// large/medium airports with scheduled service. See scripts in the repo root.
//
// This module is server-side only (the dataset is ~300KB) — the client
// autocomplete talks to /api/airports instead of importing this directly.

import airportsData from "@/data/airports.json";

export interface Airport {
  code: string; // IATA
  city: string;
  name: string;
  country: string;
}

export const AIRPORTS: Airport[] = airportsData as Airport[];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

// Major global hubs — surfaced first for empty queries and ranked higher.
const POPULAR_CODES = [
  "JFK", "EWR", "LGA", "LAX", "SFO", "ORD", "ATL", "MIA", "BOS", "SEA",
  "DFW", "DEN", "IAD", "LHR", "LGW", "CDG", "AMS", "FRA", "MAD", "BCN",
  "FCO", "MUC", "ZRH", "IST", "DXB", "DOH", "AUH", "SIN", "HKG", "BKK",
  "NRT", "HND", "ICN", "PEK", "PVG", "SYD", "MEL", "YYZ", "YVR", "GRU",
  "MEX", "DEL", "BOM",
];

const POPULAR_RANK = new Map(POPULAR_CODES.map((c, i) => [c, i]));

export function getAirport(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}

function popularList(limit: number): Airport[] {
  const out: Airport[] = [];
  for (const code of POPULAR_CODES) {
    const a = BY_CODE.get(code);
    if (a) out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

// Ranked search across code, city, name, and country.
export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return popularList(limit);

  const scored: { a: Airport; score: number }[] = [];
  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    const country = a.country.toLowerCase();

    let score: number;
    if (code === q) score = 0;
    else if (code.startsWith(q)) score = 1;
    else if (city.startsWith(q)) score = 2;
    else if (city.includes(q) || name.includes(q)) score = 3;
    else if (code.includes(q) || country.includes(q)) score = 4;
    else continue;

    // Boost well-known hubs within the same score tier.
    const pop = POPULAR_RANK.has(a.code) ? -0.5 : 0;
    scored.push({ a, score: score + pop });
  }

  scored.sort(
    (x, y) => x.score - y.score || x.a.code.localeCompare(y.a.code),
  );
  return scored.slice(0, limit).map((s) => s.a);
}
