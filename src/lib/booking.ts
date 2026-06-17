import type { CabinClass } from "./types";
import { getAirline } from "./alliances";

// Builds deep links that pre-fill the airline's own search page with the
// route/date/cabin — the same approach seats.aero uses (e.g. AA's
// aa.com/booking/search?searchType=Award&from=JFK&to=SFO&depart=...).
//
// The trick is using each airline's REAL query-parameter names: a generic
// ?origin=&destination= is ignored, but ?from=&to=&depart= actually pre-fills
// AA's search. Each carrier has its own format, so verified ones live in
// BUILDERS; the rest fall back to a best-effort link until their exact format
// is confirmed (this is the same per-airline work seats.aero did over time).
//
// Note: these land the traveler on the pre-filled SEARCH (they pick the flight
// there). No site lets an outside link build a specific checkout cart.

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

/* -------------------------------------------------------------------------- */
/*  Verified per-airline builders (exact pre-filled search URLs)              */
/* -------------------------------------------------------------------------- */

// American Airlines — confirmed format (matches seats.aero's AA deep links).
function american(p: BookingParams, searchType: "Revenue" | "Award"): string {
  const u = new URL("https://www.aa.com/booking/search");
  u.searchParams.set("type", p.returnDate ? "RoundTrip" : "OneWay");
  u.searchParams.set("searchType", searchType);
  u.searchParams.set("from", p.origin);
  u.searchParams.set("to", p.destination);
  u.searchParams.set("depart", p.departDate);
  if (p.returnDate) u.searchParams.set("return", p.returnDate);
  u.searchParams.set("adult", String(p.passengers));
  u.searchParams.set("pax", String(p.passengers));
  u.searchParams.set("cabin", aaCabin(p.cabin));
  u.searchParams.set("carriers", "ALL");
  u.searchParams.set("nearbyAirports", "true");
  u.searchParams.set("locale", "en_US");
  u.searchParams.set("pos", "US");
  return u.toString();
}

function aaCabin(cabin: CabinClass): string {
  // AA pre-fills all cabins when blank; only narrow for premium cabins.
  switch (cabin) {
    case "business":
      return "BUSINESS";
    case "first":
      return "FIRST";
    case "premium_economy":
      return "PREMIUM_ECONOMY";
    default:
      return "";
  }
}

// United — uses fsr/choose-flights with f/t/d params.
function united(p: BookingParams, award: boolean): string {
  const u = new URL("https://www.united.com/en/us/fsr/choose-flights");
  u.searchParams.set("f", p.origin);
  u.searchParams.set("t", p.destination);
  u.searchParams.set("d", p.departDate);
  if (p.returnDate) u.searchParams.set("r", p.returnDate);
  u.searchParams.set("tt", p.returnDate ? "1" : "2"); // 1=RT, 2=OW
  u.searchParams.set("at", "1");
  u.searchParams.set("px", String(p.passengers));
  u.searchParams.set("taxng", "1");
  u.searchParams.set("idx", "1");
  if (award) u.searchParams.set("clm", "7"); // miles toggle
  return u.toString();
}

const BUILDERS: Record<
  string,
  { cash: (p: BookingParams) => string; award: (p: BookingParams) => string }
> = {
  AA: {
    cash: (p) => american(p, "Revenue"),
    award: (p) => american(p, "Award"),
  },
  UA: {
    cash: (p) => united(p, false),
    award: (p) => united(p, true),
  },
};

/* -------------------------------------------------------------------------- */
/*  Best-effort fallbacks (booking page; some sites ignore the params)        */
/* -------------------------------------------------------------------------- */

const SITES: Record<string, { cash: string; award: string }> = {
  LH: { cash: "https://www.lufthansa.com/us/en/flight-search", award: "https://www.miles-and-more.com/us/en/spend/flights.html" },
  NH: { cash: "https://www.ana.co.jp/en/us/", award: "https://www.ana.co.jp/en/us/amc/international-flight-awards/" },
  SQ: { cash: "https://www.singaporeair.com/en_UK/us/home", award: "https://www.singaporeair.com/en_UK/us/ppsclub-krisflyer/use-miles/" },
  AC: { cash: "https://www.aircanada.com/us/en/aco/home/book.html", award: "https://www.aircanada.com/us/en/aco/home/aeroplan.html" },
  BA: { cash: "https://www.britishairways.com/travel/home/public/en_us", award: "https://www.britishairways.com/travel/redeem/execclub/_gf/en_us" },
  QR: { cash: "https://www.qatarairways.com/en-us/homepage.html", award: "https://www.qatarairways.com/en/Privilege-Club/spend-avios.html" },
  CX: { cash: "https://www.cathaypacific.com/cx/en_US.html", award: "https://www.cathaypacific.com/cx/en_US/asia-miles.html" },
  DL: { cash: "https://www.delta.com/flight-search/book-a-flight", award: "https://www.delta.com/flight-search/book-a-flight" },
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

function googleFlights(p: BookingParams): string {
  const q = `Flights from ${p.origin} to ${p.destination} on ${p.departDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
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

  const airline = getAirline(code);
  const awardSearch = `https://www.google.com/search?q=${encodeURIComponent(
    `${airline?.program ?? carrierCode} award booking ${p.origin} to ${p.destination}`,
  )}`;
  return { cash: googleFlights(p), award: awardSearch };
}
