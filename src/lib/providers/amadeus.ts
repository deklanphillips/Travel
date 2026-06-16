import type {
  Deal,
  FlightProvider,
  FlightSegment,
  SearchParams,
} from "@/lib/types";
import { getAirline } from "@/lib/alliances";
import { bookingLinksFor } from "@/lib/booking";
import { matchesFilters, parseIsoDuration } from "./shared";

// Real cash fares via the Amadeus Self-Service "Flight Offers Search" API.
// https://developers.amadeus.com — free instant credentials; the test
// environment returns real cached fares for most routes.
//
// Like all public fare APIs, Amadeus returns CASH prices only; loyalty award
// (miles) availability isn't exposed, so `award` is left null.

const TRAVEL_CLASS: Record<SearchParams["cabin"], string> = {
  economy: "ECONOMY",
  premium_economy: "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
};

interface AmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
}

interface AmadeusOffer {
  id: string;
  price: { grandTotal: string; currency: string };
  validatingAirlineCodes?: string[];
  itineraries: Array<{ duration: string; segments: AmadeusSegment[] }>;
}

interface AmadeusResponse {
  data?: AmadeusOffer[];
  dictionaries?: { carriers?: Record<string, string> };
  errors?: Array<{ title: string; detail?: string }>;
}

// Module-level token cache (persists across requests in a warm server process).
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export class AmadeusProvider implements FlightProvider {
  name = "amadeus";
  private base: string;

  constructor(
    private clientId: string,
    private clientSecret: string,
    env: string,
  ) {
    this.base =
      env === "production"
        ? "https://api.amadeus.com"
        : "https://test.api.amadeus.com";
  }

  private async getToken(): Promise<string> {
    const cached = tokenCache.get(this.clientId);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const res = await fetch(`${this.base}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Amadeus auth error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    tokenCache.set(this.clientId, {
      token: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    });
    return json.access_token;
  }

  async search(params: SearchParams): Promise<Deal[]> {
    const token = await this.getToken();

    const qs = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departDate,
      adults: String(params.passengers),
      travelClass: TRAVEL_CLASS[params.cabin],
      currencyCode: "USD",
      max: "30",
    });
    if (params.returnDate) qs.set("returnDate", params.returnDate);

    const res = await fetch(
      `${this.base}/v2/shopping/flight-offers?${qs.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      },
    );

    const json = (await res.json()) as AmadeusResponse;
    if (!res.ok) {
      const detail = json.errors?.[0]?.detail ?? json.errors?.[0]?.title;
      throw new Error(`Amadeus search error ${res.status}: ${detail ?? ""}`);
    }

    const carriers = json.dictionaries?.carriers ?? {};
    const offers = json.data ?? [];
    return offers
      .map((offer) => this.toDeal(offer, params, carriers))
      .filter((deal) => matchesFilters(deal, params));
  }

  private toDeal(
    offer: AmadeusOffer,
    params: SearchParams,
    carriers: Record<string, string>,
  ): Deal {
    const carrierName = (code: string) =>
      titleCase(carriers[code]) || getAirline(code)?.name || code;

    const segments: FlightSegment[] = offer.itineraries.flatMap((it) =>
      it.segments.map((s) => ({
        from: s.departure.iataCode,
        to: s.arrival.iataCode,
        departTime: s.departure.at,
        arriveTime: s.arrival.at,
        carrier: carrierName(s.carrierCode),
        carrierCode: s.carrierCode,
        flightNumber: s.number,
      })),
    );

    const durationMinutes = offer.itineraries.reduce(
      (sum, it) => sum + parseIsoDuration(it.duration),
      0,
    );
    const stops = Math.max(0, segments.length - offer.itineraries.length);
    const carrierCode =
      offer.validatingAirlineCodes?.[0] ?? segments[0]?.carrierCode ?? "";

    return {
      id: `amadeus-${offer.id}`,
      origin: params.origin,
      destination: params.destination,
      segments,
      stops,
      durationMinutes,
      cabin: params.cabin,
      cashPrice: Math.round(Number(offer.price.grandTotal)),
      award: null,
      cashBookingUrl: bookingLinksFor(carrierCode, params).cash,
      awardBookingUrl: null,
      seatsLeft: null,
      provider: this.name,
    };
  }
}

// Amadeus carrier names come in ALL CAPS ("BRITISH AIRWAYS") — tidy them up.
function titleCase(value: string | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
