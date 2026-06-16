// Airline directory with loyalty program + alliance membership.
// Used for filtering search results by alliance or specific carrier.

export type Alliance = "star" | "oneworld" | "skyteam" | "none";

export interface Airline {
  name: string;
  code: string; // IATA carrier code
  program: string; // loyalty program
  programCode: string; // program short code
  alliance: Alliance;
}

export const ALLIANCE_LABELS: Record<Alliance, string> = {
  star: "Star Alliance",
  oneworld: "Oneworld",
  skyteam: "SkyTeam",
  none: "Non-aligned",
};

export const AIRLINES: Airline[] = [
  // Star Alliance
  { name: "United Airlines", code: "UA", program: "MileagePlus", programCode: "UA", alliance: "star" },
  { name: "Lufthansa", code: "LH", program: "Miles & More", programCode: "LH", alliance: "star" },
  { name: "ANA", code: "NH", program: "ANA Mileage Club", programCode: "NH", alliance: "star" },
  { name: "Singapore Airlines", code: "SQ", program: "KrisFlyer", programCode: "SQ", alliance: "star" },
  { name: "Air Canada", code: "AC", program: "Aeroplan", programCode: "AC", alliance: "star" },
  // Oneworld
  { name: "American Airlines", code: "AA", program: "AAdvantage", programCode: "AA", alliance: "oneworld" },
  { name: "British Airways", code: "BA", program: "Avios", programCode: "BA", alliance: "oneworld" },
  { name: "Qatar Airways", code: "QR", program: "Privilege Club", programCode: "QR", alliance: "oneworld" },
  { name: "Cathay Pacific", code: "CX", program: "Asia Miles", programCode: "CX", alliance: "oneworld" },
  // SkyTeam
  { name: "Delta Air Lines", code: "DL", program: "SkyMiles", programCode: "DL", alliance: "skyteam" },
  { name: "Air France", code: "AF", program: "Flying Blue", programCode: "AF", alliance: "skyteam" },
  { name: "KLM", code: "KL", program: "Flying Blue", programCode: "AF", alliance: "skyteam" },
  // Non-aligned
  { name: "Emirates", code: "EK", program: "Skywards", programCode: "EK", alliance: "none" },
];

const BY_CODE = new Map(AIRLINES.map((a) => [a.code, a]));

export function getAirline(code: string): Airline | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function allianceOf(code: string): Alliance | undefined {
  return BY_CODE.get(code.toUpperCase())?.alliance;
}

export function airlinesByAlliance(alliance: Alliance | "any"): Airline[] {
  if (alliance === "any") return AIRLINES;
  return AIRLINES.filter((a) => a.alliance === alliance);
}
