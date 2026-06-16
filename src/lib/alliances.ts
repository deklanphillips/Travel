// Airline directory: a comprehensive list of ~980 active airlines (from the
// OpenFlights database) enriched with curated alliance membership and loyalty
// program names for the major carriers.
//
// Server-side only (the dataset isn't huge, but the client autocomplete uses
// /api/airlines so we keep things consistent with the airport picker).

import airlinesData from "@/data/airlines.json";

export type Alliance = "star" | "oneworld" | "skyteam" | "none";

interface RawAirline {
  code: string;
  name: string;
  country: string;
}

export interface Airline {
  name: string;
  code: string; // IATA carrier code
  program: string; // loyalty program
  programCode: string; // program short code (for award booking links)
  alliance: Alliance;
  country: string;
}

export const ALLIANCE_LABELS: Record<Alliance, string> = {
  star: "Star Alliance",
  oneworld: "Oneworld",
  skyteam: "SkyTeam",
  none: "Non-aligned",
};

// Curated alliance membership by IATA code.
const ALLIANCE_MEMBERS: Record<string, Alliance> = {
  // Star Alliance
  A3: "star", AC: "star", CA: "star", AI: "star", NZ: "star", NH: "star",
  OZ: "star", OS: "star", AV: "star", SN: "star", CM: "star", MS: "star",
  ET: "star", BR: "star", LO: "star", LH: "star", SK: "star", ZH: "star",
  SQ: "star", SA: "star", LX: "star", TP: "star", TG: "star", TK: "star",
  UA: "star",
  // Oneworld
  AS: "oneworld", AA: "oneworld", BA: "oneworld", CX: "oneworld", AY: "oneworld",
  IB: "oneworld", JL: "oneworld", MH: "oneworld", QF: "oneworld", QR: "oneworld",
  RJ: "oneworld", UL: "oneworld", AT: "oneworld",
  // SkyTeam
  AR: "skyteam", AM: "skyteam", UX: "skyteam", AF: "skyteam", KL: "skyteam",
  AZ: "skyteam", CI: "skyteam", MU: "skyteam", DL: "skyteam", GA: "skyteam",
  KQ: "skyteam", KE: "skyteam", ME: "skyteam", SV: "skyteam", RO: "skyteam",
  VN: "skyteam", VS: "skyteam", MF: "skyteam",
};

// Loyalty program names for carriers we recognize (program, programCode).
const PROGRAMS: Record<string, [string, string]> = {
  UA: ["MileagePlus", "UA"], LH: ["Miles & More", "LH"], NH: ["ANA Mileage Club", "NH"],
  SQ: ["KrisFlyer", "SQ"], AC: ["Aeroplan", "AC"], A3: ["Miles+Bonus", "A3"],
  CA: ["PhoenixMiles", "CA"], AI: ["Flying Returns", "AI"], NZ: ["Airpoints", "NZ"],
  OZ: ["Asiana Club", "OZ"], OS: ["Miles & More", "LH"], AV: ["LifeMiles", "AV"],
  SN: ["Miles & More", "LH"], CM: ["ConnectMiles", "CM"], MS: ["EgyptAir Plus", "MS"],
  ET: ["ShebaMiles", "ET"], BR: ["Infinity MileageLands", "BR"], LO: ["Miles & More", "LH"],
  SK: ["EuroBonus", "SK"], ZH: ["PhoenixMiles", "CA"], SA: ["Voyager", "SA"],
  LX: ["Miles & More", "LH"], TP: ["Miles&Go", "TP"], TG: ["Royal Orchid Plus", "TG"],
  TK: ["Miles&Smiles", "TK"],
  AS: ["Mileage Plan", "AS"], AA: ["AAdvantage", "AA"], BA: ["Avios", "BA"],
  CX: ["Asia Miles", "CX"], AY: ["Finnair Plus", "AY"], IB: ["Iberia Plus", "IB"],
  JL: ["JAL Mileage Bank", "JL"], MH: ["Enrich", "MH"], QF: ["Qantas Frequent Flyer", "QF"],
  QR: ["Privilege Club", "QR"], RJ: ["Royal Plus", "RJ"], UL: ["FlySmiLes", "UL"],
  AT: ["Safar Flyer", "AT"],
  AR: ["Aerolíneas Plus", "AR"], AM: ["Club Premier", "AM"], UX: ["Air Europa SUMA", "UX"],
  AF: ["Flying Blue", "AF"], KL: ["Flying Blue", "AF"], AZ: ["Volare", "AZ"],
  CI: ["Dynasty Flyer", "CI"], MU: ["Eastern Miles", "MU"], DL: ["SkyMiles", "DL"],
  GA: ["GarudaMiles", "GA"], KQ: ["Asante Rewards", "KQ"], KE: ["SKYPASS", "KE"],
  ME: ["Cedar Miles", "ME"], SV: ["Alfursan", "SV"], RO: ["Flying Blue", "AF"],
  VN: ["Lotusmiles", "VN"], VS: ["Flying Club", "VS"], MF: ["Egret Miles", "MF"],
  // Notable independents
  EK: ["Skywards", "EK"], EY: ["Etihad Guest", "EY"], B6: ["TrueBlue", "B6"],
  WN: ["Rapid Rewards", "WN"], F9: ["Frontier Miles", "F9"], NK: ["Free Spirit", "NK"],
  HA: ["HawaiianMiles", "HA"], WS: ["WestJet Rewards", "WS"], G3: ["Smiles", "G3"],
  JJ: ["LATAM Pass", "LA"], LA: ["LATAM Pass", "LA"], AD: ["TudoAzul", "AD"],
};

function enrich(raw: RawAirline): Airline {
  const alliance = ALLIANCE_MEMBERS[raw.code] ?? "none";
  const prog = PROGRAMS[raw.code];
  return {
    name: raw.name,
    code: raw.code,
    country: raw.country,
    alliance,
    program: prog ? prog[0] : `${raw.name} miles`,
    programCode: prog ? prog[1] : raw.code,
  };
}

export const AIRLINES: Airline[] = (airlinesData as RawAirline[]).map(enrich);

const BY_CODE = new Map(AIRLINES.map((a) => [a.code, a]));

// Carriers used by the mock provider for realistic default results: every
// alliance member plus a few big independents that have a loyalty program.
const MAJOR = AIRLINES.filter(
  (a) => a.alliance !== "none" || PROGRAMS[a.code],
);

export function getAirline(code: string): Airline | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function allianceOf(code: string): Alliance | undefined {
  return BY_CODE.get(code.toUpperCase())?.alliance;
}

export function majorAirlines(): Airline[] {
  return MAJOR;
}

export function airlinesByAlliance(alliance: Alliance | "any"): Airline[] {
  if (alliance === "any") return AIRLINES;
  return AIRLINES.filter((a) => a.alliance === alliance);
}

// Ranked search across name, code, and country (for the airline picker).
export function searchAirlines(
  query: string,
  alliance: Alliance | "any" = "any",
  limit = 8,
): Airline[] {
  const pool = alliance === "any" ? AIRLINES : airlinesByAlliance(alliance);
  const q = query.trim().toLowerCase();
  if (!q) {
    // Surface recognizable carriers first when there's no query.
    return [...pool]
      .sort((a, b) => Number(b.alliance !== "none") - Number(a.alliance !== "none"))
      .slice(0, limit);
  }

  const scored: { a: Airline; score: number }[] = [];
  for (const a of pool) {
    const code = a.code.toLowerCase();
    const name = a.name.toLowerCase();
    const country = a.country.toLowerCase();
    let score: number;
    if (code === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (code.includes(q) || country.includes(q)) score = 3;
    else continue;
    // Prefer alliance members within a tier.
    scored.push({ a, score: score - (a.alliance !== "none" ? 0.5 : 0) });
  }
  scored.sort((x, y) => x.score - y.score || x.a.name.localeCompare(y.a.name));
  return scored.slice(0, limit).map((s) => s.a);
}
