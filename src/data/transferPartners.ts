// Credit-card transferable-points partners for each award program — mirrors
// seats.aero's transfer matrix. Keyed by our program code (airline IATA).
// Source: seats.aero program/transfer-partner list.

export type CardName =
  | "Amex"
  | "Chase"
  | "Cap One"
  | "Citi"
  | "Bilt"
  | "Wells Fargo"
  | "Rove";

// Which transferable currencies move points into each program.
export const PROGRAM_CARDS: Record<string, CardName[]> = {
  AM: ["Amex", "Cap One", "Citi", "Rove"], // Aeromexico Club Premier
  AC: ["Amex", "Bilt", "Cap One", "Chase", "Rove"], // Aeroplan
  AF: ["Amex", "Bilt", "Cap One", "Chase", "Citi", "Rove", "Wells Fargo"], // Flying Blue
  AS: ["Bilt"], // Alaska Atmos/Mileage Plan
  AA: ["Citi"], // AAdvantage
  AD: [], // Azul Fidelidade
  DL: ["Amex"], // SkyMiles
  EK: ["Amex", "Bilt", "Cap One", "Citi"], // Emirates Skywards
  ET: [], // Ethiopian ShebaMiles
  EY: ["Amex", "Bilt", "Cap One", "Citi", "Rove"], // Etihad Guest
  AY: ["Cap One", "Rove"], // Finnair Plus
  F9: [], // Frontier
  G3: [], // GOL Smiles
  B6: ["Amex", "Cap One", "Chase", "Citi", "Wells Fargo"], // JetBlue TrueBlue
  LH: ["Rove"], // Miles & More
  QF: ["Amex", "Cap One"], // Qantas Frequent Flyer
  QR: ["Amex", "Bilt", "Cap One", "Citi", "Rove"], // Qatar Privilege Club
  SK: ["Rove"], // SAS EuroBonus
  SV: [], // Saudia AlFursan
  SQ: ["Amex", "Cap One", "Chase", "Citi"], // Singapore KrisFlyer
  TK: ["Bilt", "Cap One", "Citi", "Rove"], // Turkish Miles&Smiles
  UA: ["Bilt", "Chase"], // United MileagePlus
  VS: ["Amex", "Bilt", "Cap One", "Chase", "Citi", "Rove", "Wells Fargo"], // Virgin Atlantic
  VA: ["Amex"], // Virgin Australia Velocity
  BA: ["Amex", "Bilt", "Cap One", "Chase", "Wells Fargo"], // British Airways Avios
};

// Badge colours roughly matching each issuer's brand.
export const CARD_STYLE: Record<CardName, string> = {
  Amex: "bg-[#1174cf] text-white",
  Chase: "bg-[#5b6770] text-white",
  "Cap One": "bg-[#15b3b9] text-white",
  Citi: "bg-[#1d8a4c] text-white",
  Bilt: "bg-black text-white ring-1 ring-white/20",
  "Wells Fargo": "bg-[#d71e28] text-white",
  Rove: "bg-white/10 text-slate-200 ring-1 ring-white/20",
};

export const ALL_CARDS: CardName[] = [
  "Amex",
  "Chase",
  "Cap One",
  "Citi",
  "Bilt",
  "Wells Fargo",
  "Rove",
];

export function cardsForProgram(programCode: string): CardName[] {
  return PROGRAM_CARDS[programCode.toUpperCase()] ?? [];
}
