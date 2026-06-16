import type {
  Deal,
  FlightProvider,
  FlightSegment,
  SearchParams,
} from "@/lib/types";
import { getAirline } from "@/lib/alliances";
import { matchesFilters } from "./shared";

// Real (cached) cash fares via the Travelpayouts / Aviasales Flight Data API.
// https://support.travelpayouts.com — "Prices for dates" (prices_for_dates v3).
//
// Returns the cheapest tickets Aviasales users found recently for a route/date.
// Each result carries an affiliate `link` that redirects the traveler to the
// seller (usually the airline, sometimes an OTA) and earns commission via your
// marker — so booking links monetize automatically.
//
// Notes / limitations of this data source:
//  - Cached lowest fares (not live seat-level availability).
//  - Economy pricing only; the cabin selector is ignored here.
//  - No segment-level detail beyond the operating carrier and stop count, so we
//    render a single origin -> destination leg with a separate "stops" label.
//  - Cash only; loyalty award (miles) data is not provided.

const API = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

interface TpItem {
  origin: string;
  destination: string;
  origin_airport?: string;
  destination_airport?: string;
  price: number;
  airline: string;
  flight_number: string | number;
  departure_at: string; // ISO datetime with offset
  return_at?: string;
  transfers: number;
  return_transfers?: number;
  duration?: number; // total minutes
  duration_to?: number; // outbound minutes
  duration_back?: number;
  link: string; // relative aviasales path, e.g. "/search/JFK0108LHR1?..."
}

interface TpResponse {
  success: boolean;
  data?: TpItem[];
  error?: string;
  currency?: string;
}

export class TravelpayoutsProvider implements FlightProvider {
  name = "travelpayouts";

  constructor(
    private token: string,
    private marker: string,
    private currency = "usd",
    private market = "us",
  ) {}

  async search(params: SearchParams): Promise<Deal[]> {
    const qs = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      departure_at: params.departDate,
      currency: this.currency,
      market: this.market,
      one_way: params.returnDate ? "false" : "true",
      sorting: "price",
      limit: "30",
      token: this.token,
    });
    if (params.returnDate) qs.set("return_at", params.returnDate);

    const res = await fetch(`${API}?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const json = (await res.json()) as TpResponse;
    if (!res.ok || json.success === false) {
      throw new Error(
        `Travelpayouts error ${res.status}: ${json.error ?? "request failed"}`,
      );
    }

    const items = json.data ?? [];
    return items
      .map((item) => this.toDeal(item, params))
      .filter((deal) => matchesFilters(deal, params));
  }

  private toDeal(item: TpItem, params: SearchParams): Deal {
    const code = (item.airline || "").toUpperCase();
    const carrierName = getAirline(code)?.name || code;
    const outboundMinutes = item.duration_to ?? item.duration ?? 0;
    const arriveTime = new Date(
      new Date(item.departure_at).getTime() + outboundMinutes * 60_000,
    ).toISOString();

    const segment: FlightSegment = {
      from: item.origin,
      to: item.destination,
      departTime: item.departure_at,
      arriveTime,
      carrier: carrierName,
      carrierCode: code,
      flightNumber: String(item.flight_number ?? ""),
    };

    return {
      id: `tp-${item.origin}-${item.destination}-${item.departure_at}-${code}-${item.flight_number}`,
      origin: params.origin,
      destination: params.destination,
      segments: [segment],
      stops: item.transfers ?? 0,
      durationMinutes: outboundMinutes,
      cabin: params.cabin,
      cashPrice: Math.round(item.price),
      award: null,
      cashBookingUrl: this.bookingLink(item.link),
      awardBookingUrl: null,
      seatsLeft: null,
      provider: this.name,
    };
  }

  // Turns the relative Aviasales path into an absolute, marker-tagged URL so
  // clicks are tracked and attributed for commission.
  private bookingLink(link: string): string {
    try {
      const u = new URL(`https://www.aviasales.com${link}`);
      if (this.marker) u.searchParams.set("marker", this.marker);
      return u.toString();
    } catch {
      return `https://www.aviasales.com${link}`;
    }
  }
}
