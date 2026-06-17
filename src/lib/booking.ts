import type { CabinClass } from "./types";
import { getAirline } from "./alliances";

// Builds deep links that pre-fill the airline's own search page with the
// route/date/cabin — the same approach (and the same URL formats) seats.aero
// uses. The key is each airline's REAL query-parameter names.
//
// Verified carriers (formats confirmed against seats.aero deep links):
//   AA, UA, DL, B6 (JetBlue), AC (Aeroplan award), VA (Virgin Australia).
// Other carriers use a best-effort fallback until their exact format is added.
//
// These land the traveler on the pre-filled SEARCH (they pick the flight there).
// No outside link can build a specific airline checkout cart.

export interface BookingParams {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string;
  passengers: number;
  cabin: CabinClass;
}

export interface BookingLinks {
  cash: string;
  award: string;
}

/* --- date helpers --------------------------------------------------------- */

function mdySlash(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}
function mdyDash(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

/* --- verified per-airline builders (exact pre-filled search URLs) --------- */

// American Airlines
function american(p: BookingParams, award: boolean): string {
  const u = new URL("https://www.aa.com/booking/search");
  u.searchParams.set("type", p.returnDate ? "RoundTrip" : "OneWay");
  u.searchParams.set("searchType", award ? "Award" : "Revenue");
  u.searchParams.set("from", p.origin);
  u.searchParams.set("to", p.destination);
  u.searchParams.set("depart", p.departDate);
  if (p.returnDate) u.searchParams.set("return", p.returnDate);
  u.searchParams.set("adult", String(p.passengers));
  u.searchParams.set("pax", String(p.passengers));
  u.searchParams.set("cabin", "");
  u.searchParams.set("carriers", "ALL");
  u.searchParams.set("nearbyAirports", "true");
  u.searchParams.set("locale", "en_US");
  u.searchParams.set("pos", "US");
  return u.toString();
}

// United Airlines
function united(p: BookingParams, award: boolean): string {
  const u = new URL("https://www.united.com/en/us/fsr/choose-flights");
  u.searchParams.set("f", p.origin);
  u.searchParams.set("t", p.destination);
  u.searchParams.set("d", p.departDate);
  if (p.returnDate) u.searchParams.set("r", p.returnDate);
  u.searchParams.set("sc", "7");
  u.searchParams.set("st", "bestmatches");
  u.searchParams.set("cbm", "-1");
  u.searchParams.set("cbm2", "-1");
  u.searchParams.set("ft", "0");
  u.searchParams.set("cp", "0");
  u.searchParams.set("tt", p.returnDate ? "2" : "1"); // 1=one-way
  u.searchParams.set("at", "1");
  u.searchParams.set("rm", "1");
  u.searchParams.set("act", "0");
  u.searchParams.set("px", String(p.passengers));
  u.searchParams.set("taxng", "1");
  if (award) u.searchParams.set("clm", "7"); // miles toggle
  u.searchParams.set("tqp", "A");
  return u.toString();
}

// Delta Air Lines
function delta(p: BookingParams, award: boolean): string {
  const u = new URL("https://www.delta.com/flight-search/search");
  u.searchParams.set("action", "findFlights");
  u.searchParams.set("searchByCabin", "true");
  u.searchParams.set("deltaOnlySearch", "false");
  u.searchParams.set("deltaOnly", "off");
  u.searchParams.set("go", "Find Flights");
  u.searchParams.set("tripType", p.returnDate ? "ROUND_TRIP" : "ONE_WAY");
  u.searchParams.set("passengerInfo", `ADT:${p.passengers}`);
  u.searchParams.set("priceSchedule", "price");
  if (award) u.searchParams.set("awardTravel", "true");
  u.searchParams.set("originCity", p.origin);
  u.searchParams.set("destinationCity", p.destination);
  u.searchParams.set("departureDate", mdySlash(p.departDate));
  u.searchParams.set("returnDate", p.returnDate ? mdySlash(p.returnDate) : "");
  if (award) u.searchParams.set("forceMiles", "true");
  return u.toString();
}

// JetBlue
function jetblue(p: BookingParams, award: boolean): string {
  const u = new URL("https://www.jetblue.com/booking/flights");
  u.searchParams.set("from", p.origin);
  u.searchParams.set("to", p.destination);
  u.searchParams.set("depart", p.departDate);
  if (p.returnDate) u.searchParams.set("return", p.returnDate);
  u.searchParams.set("isMultiCity", "false");
  u.searchParams.set("noOfRoute", "1");
  u.searchParams.set("lang", "en");
  u.searchParams.set("adults", String(p.passengers));
  u.searchParams.set("children", "0");
  u.searchParams.set("infants", "0");
  u.searchParams.set("sharedMarket", "false");
  u.searchParams.set("roundTripFaresFlag", p.returnDate ? "false" : "true");
  u.searchParams.set("usePoints", award ? "true" : "false");
  return u.toString();
}

// Air Canada — Aeroplan award redemption (confirmed); cash uses booking page.
function airCanadaAward(p: BookingParams): string {
  const u = new URL(
    "https://www.aircanada.com/aeroplan/redeem/availability/outbound",
  );
  u.searchParams.set("org0", p.origin);
  u.searchParams.set("dest0", p.destination);
  u.searchParams.set("departureDate0", p.departDate);
  u.searchParams.set("lang", "en-CA");
  u.searchParams.set("tripType", p.returnDate ? "R" : "O");
  u.searchParams.set("ADT", String(p.passengers));
  u.searchParams.set("YTH", "0");
  u.searchParams.set("CHD", "0");
  u.searchParams.set("INF", "0");
  u.searchParams.set("INS", "0");
  u.searchParams.set("marketCode", "INT");
  return u.toString();
}

// Virgin Australia — hash-routed SPA, so the query lives after the #.
function virginAustralia(p: BookingParams, award: boolean): string {
  const vaClass: Record<CabinClass, string> = {
    economy: "Economy",
    premium_economy: "Premium",
    business: "Business",
    first: "First",
  };
  const qs = new URLSearchParams({
    journeyType: p.returnDate ? "return" : "one-way",
    activeMonth: mdyDash(p.departDate),
    awardBooking: award ? "true" : "false",
    class: vaClass[p.cabin],
    ADT: String(p.passengers),
    CHD: "0",
    INF: "0",
    origin: p.origin,
    destination: p.destination,
    date: mdyDash(p.departDate),
    promoCode: "",
  });
  return `https://book.virginaustralia.com/dx/VADX/#/flight-selection?${qs.toString()}`;
}

const BUILDERS: Record<
  string,
  { cash: (p: BookingParams) => string; award: (p: BookingParams) => string }
> = {
  AA: { cash: (p) => american(p, false), award: (p) => american(p, true) },
  UA: { cash: (p) => united(p, false), award: (p) => united(p, true) },
  DL: { cash: (p) => delta(p, false), award: (p) => delta(p, true) },
  B6: { cash: (p) => jetblue(p, false), award: (p) => jetblue(p, true) },
  VA: {
    cash: (p) => virginAustralia(p, false),
    award: (p) => virginAustralia(p, true),
  },
  AC: {
    cash: (p) =>
      withHints("https://www.aircanada.com/us/en/aco/home/book.html", p, false),
    award: (p) => airCanadaAward(p),
  },
};

/* --- best-effort fallbacks (booking page; some ignore params) ------------- */

const SITES: Record<string, { cash: string; award: string }> = {
  LH: { cash: "https://www.lufthansa.com/us/en/flight-search", award: "https://www.miles-and-more.com/us/en/spend/flights.html" },
  NH: { cash: "https://www.ana.co.jp/en/us/", award: "https://www.ana.co.jp/en/us/amc/international-flight-awards/" },
  SQ: { cash: "https://www.singaporeair.com/en_UK/us/home", award: "https://www.singaporeair.com/en_UK/us/ppsclub-krisflyer/use-miles/" },
  BA: { cash: "https://www.britishairways.com/travel/home/public/en_us", award: "https://www.britishairways.com/travel/redeem/execclub/_gf/en_us" },
  QR: { cash: "https://www.qatarairways.com/en-us/homepage.html", award: "https://www.qatarairways.com/en/Privilege-Club/spend-avios.html" },
  CX: { cash: "https://www.cathaypacific.com/cx/en_US.html", award: "https://www.cathaypacific.com/cx/en_US/asia-miles.html" },
  AF: { cash: "https://www.airfrance.us/", award: "https://www.airfrance.us/loyalty-program/flying-blue" },
  KL: { cash: "https://www.klm.com/", award: "https://www.klm.com/flying-blue/spend-miles" },
  EK: { cash: "https://www.emirates.com/us/english/", award: "https://www.emirates.com/us/english/skywards/" },
};

function withHints(base: string, p: BookingParams, award: boolean): string {
  try {
    const u = new URL(base);
    u.searchParams.set("from", p.origin);
    u.searchParams.set("to", p.destination);
    u.searchParams.set("depart", p.departDate);
    if (p.returnDate) u.searchParams.set("return", p.returnDate);
    u.searchParams.set("adults", String(p.passengers));
    if (award) u.searchParams.set("award", "true");
    return u.toString();
  } catch {
    return base;
  }
}

// Universal fallback for carriers without an exact template: a Kayak search
// pre-filled with route + dates and filtered to the specific airline. Unlike a
// bare meta-search, this shows live prices and is one click from the airline.
function kayak(carrierCode: string, p: BookingParams): string {
  const depart = p.departDate.slice(0, 10);
  const ret = p.returnDate ? `/${p.returnDate.slice(0, 10)}` : "";
  const path = `${p.origin}-${p.destination}/${depart}${ret}`;
  const qs = new URLSearchParams({ sort: "price_a" });
  if (carrierCode) qs.set("fs", `airlines=${carrierCode}`);
  return `https://www.kayak.com/flights/${path}?${qs.toString()}`;
}

export function bookingLinksFor(
  carrierCode: string,
  p: BookingParams,
): BookingLinks {
  const code = carrierCode.toUpperCase();

  const builder = BUILDERS[code];
  if (builder) {
    return { cash: builder.cash(p), award: builder.award(p) };
  }

  const site = SITES[code];
  if (site) {
    return {
      cash: withHints(site.cash, p, false),
      award: withHints(site.award, p, true),
    };
  }

  // Long-tail carriers: pre-filled, airline-filtered Kayak search (live prices).
  const fallback = kayak(code, p);
  return { cash: fallback, award: fallback };
}
