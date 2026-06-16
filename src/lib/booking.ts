import type { CabinClass } from "./types";
import { getAirline } from "./alliances";

// Builds deep links to each airline's own booking site — a cash-fare booking
// page and an award (miles) booking page — mirroring how seats.aero hands you
// off to the program's award search.
//
// NOTE: airlines don't expose a public way to pre-select one exact flight in
// their cart, so these links land the traveler on the correct airline's booking
// search pre-filled with the route/date where the site accepts it. Pre-filling
// the precise flight + fare requires the airline's booking API (and, for award,
// live award inventory). Carriers we don't recognize fall back to Google Flights.

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

// Real booking domains per carrier: `cash` = revenue booking, `award` = miles.
const SITES: Record<string, { cash: string; award: string }> = {
  UA: { cash: "https://www.united.com/en/us/book-flight", award: "https://www.united.com/en/us/book-flight" },
  LH: { cash: "https://www.lufthansa.com/us/en/flight-search", award: "https://www.miles-and-more.com/us/en/spend/flights.html" },
  NH: { cash: "https://www.ana.co.jp/en/us/", award: "https://www.ana.co.jp/en/us/amc/international-flight-awards/" },
  SQ: { cash: "https://www.singaporeair.com/en_UK/us/home", award: "https://www.singaporeair.com/en_UK/us/ppsclub-krisflyer/use-miles/" },
  AC: { cash: "https://www.aircanada.com/us/en/aco/home/book.html", award: "https://www.aircanada.com/us/en/aco/home/aeroplan.html" },
  AA: { cash: "https://www.aa.com/booking/find-flights", award: "https://www.aa.com/booking/find-flights" },
  BA: { cash: "https://www.britishairways.com/travel/home/public/en_us", award: "https://www.britishairways.com/travel/redeem/execclub/_gf/en_us" },
  QR: { cash: "https://www.qatarairways.com/en-us/homepage.html", award: "https://www.qatarairways.com/en/Privilege-Club/spend-avios.html" },
  CX: { cash: "https://www.cathaypacific.com/cx/en_US.html", award: "https://www.cathaypacific.com/cx/en_US/asia-miles.html" },
  DL: { cash: "https://www.delta.com/flight-search/book-a-flight", award: "https://www.delta.com/flight-search/book-a-flight" },
  AF: { cash: "https://www.airfrance.us/", award: "https://www.airfrance.us/loyalty-program/flying-blue" },
  KL: { cash: "https://www.klm.com/", award: "https://www.klm.com/flying-blue/spend-miles" },
  EK: { cash: "https://www.emirates.com/us/english/", award: "https://www.emirates.com/us/english/skywards/" },
};

// Appends route/date/passenger hints. Sites that don't read these ignore them
// harmlessly; the traveler still lands on the right airline booking page.
function withHints(base: string, p: BookingParams, award: boolean): string {
  try {
    const u = new URL(base);
    u.searchParams.set("origin", p.origin);
    u.searchParams.set("destination", p.destination);
    u.searchParams.set("departureDate", p.departDate);
    if (p.returnDate) u.searchParams.set("returnDate", p.returnDate);
    u.searchParams.set("adults", String(p.passengers));
    u.searchParams.set("cabinClass", p.cabin);
    if (award) u.searchParams.set("awardTravel", "true");
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
  const site = SITES[carrierCode.toUpperCase()];
  if (!site) {
    const airline = getAirline(carrierCode);
    const awardSearch = `https://www.google.com/search?q=${encodeURIComponent(
      `${airline?.program ?? carrierCode} award booking`,
    )}`;
    return { cash: googleFlights(p), award: awardSearch };
  }
  return {
    cash: withHints(site.cash, p, false),
    award: withHints(site.award, p, true),
  };
}
