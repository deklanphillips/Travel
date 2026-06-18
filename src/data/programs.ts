// Canonical list of award programs we support — mirrors seats.aero's set.
// `source` must match seats.aero's source slug (used for bulk availability).

export interface Program {
  source: string; // seats.aero source slug
  code: string; // our program code (airline IATA) — keys transfer partners
  name: string;
}

export const PROGRAMS: Program[] = [
  { source: "aeromexico", code: "AM", name: "Aeromexico Club Premier" },
  { source: "aeroplan", code: "AC", name: "Air Canada Aeroplan" },
  { source: "flyingblue", code: "AF", name: "Air France/KLM Flying Blue" },
  { source: "alaska", code: "AS", name: "Alaska Atmos Rewards" },
  { source: "american", code: "AA", name: "American AAdvantage" },
  { source: "azul", code: "AD", name: "Azul Fidelidade" },
  { source: "delta", code: "DL", name: "Delta SkyMiles" },
  { source: "emirates", code: "EK", name: "Emirates Skywards" },
  { source: "ethiopian", code: "ET", name: "Ethiopian ShebaMiles" },
  { source: "etihad", code: "EY", name: "Etihad Guest" },
  { source: "finnair", code: "AY", name: "Finnair Plus" },
  { source: "frontier", code: "F9", name: "Frontier Airlines" },
  { source: "smiles", code: "G3", name: "GOL Smiles" },
  { source: "jetblue", code: "B6", name: "JetBlue TrueBlue" },
  { source: "lufthansa", code: "LH", name: "Lufthansa Miles & More" },
  { source: "qantas", code: "QF", name: "Qantas Frequent Flyer" },
  { source: "qatar", code: "QR", name: "Qatar Airways Privilege Club" },
  { source: "sas", code: "SK", name: "SAS EuroBonus" },
  { source: "saudia", code: "SV", name: "Saudia AlFursan" },
  { source: "singapore", code: "SQ", name: "Singapore Airlines KrisFlyer" },
  { source: "turkish", code: "TK", name: "Turkish Miles&Smiles" },
  { source: "united", code: "UA", name: "United MileagePlus" },
  { source: "virginatlantic", code: "VS", name: "Virgin Atlantic" },
  { source: "velocity", code: "VA", name: "Virgin Australia Velocity" },
];

export const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
] as const;

export function programBySource(source: string): Program | undefined {
  return PROGRAMS.find((p) => p.source === source);
}
