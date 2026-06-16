import type { Deal, FlightProvider, SearchParams, FlightSegment } from "@/lib/types";
import { bookingLinksFor } from "@/lib/booking";
import { matchesFilters, parseIsoDuration } from "./shared";

// Real flight pricing via the Duffel API (https://duffel.com).
// Duffel returns live CASH fares. It does not expose loyalty award (miles)
// availability, so `award` is left null here — wire a dedicated award source
// later if/when you add one. This keeps the same Deal shape as the mock provider.

const DUFFEL_API = "https://api.duffel.com/air";

interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: Array<{
    duration: string | null;
    segments: Array<{
      origin: { iata_code: string };
      destination: { iata_code: string };
      departing_at: string;
      arriving_at: string;
      marketing_carrier: { name: string; iata_code: string };
      marketing_carrier_flight_number: string;
    }>;
  }>;
}

const CABIN_MAP: Record<SearchParams["cabin"], string> = {
  economy: "economy",
  premium_economy: "premium_economy",
  business: "business",
  first: "first",
};

export class DuffelProvider implements FlightProvider {
  name = "duffel";

  constructor(private token: string) {}

  async search(params: SearchParams): Promise<Deal[]> {
    const slices = [
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departDate,
      },
    ];
    if (params.returnDate) {
      slices.push({
        origin: params.destination,
        destination: params.origin,
        departure_date: params.returnDate,
      });
    }

    const res = await fetch(`${DUFFEL_API}/offer_requests?return_offers=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: params.passengers }, () => ({
            type: "adult",
          })),
          cabin_class: CABIN_MAP[params.cabin],
        },
      }),
      // Duffel searches can take a few seconds.
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Duffel API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data: { offers: DuffelOffer[] } };
    const offers = json.data?.offers ?? [];

    const deals = offers.slice(0, 30).map((offer) => this.toDeal(offer, params));
    return deals.filter((deal) => matchesFilters(deal, params));
  }

  private toDeal(offer: DuffelOffer, params: SearchParams): Deal {
    const segments: FlightSegment[] = offer.slices.flatMap((slice) =>
      slice.segments.map((s) => ({
        from: s.origin.iata_code,
        to: s.destination.iata_code,
        departTime: s.departing_at,
        arriveTime: s.arriving_at,
        carrier: s.marketing_carrier.name,
        carrierCode: s.marketing_carrier.iata_code,
        flightNumber: s.marketing_carrier_flight_number,
      })),
    );

    const durationMinutes = offer.slices.reduce(
      (sum, s) => sum + parseIsoDuration(s.duration),
      0,
    );
    const stops = Math.max(0, segments.length - offer.slices.length);
    const carrierCode = segments[0]?.carrierCode ?? "";

    return {
      id: offer.id,
      origin: params.origin,
      destination: params.destination,
      segments,
      stops,
      durationMinutes,
      cabin: params.cabin,
      cashPrice: Math.round(Number(offer.total_amount)),
      award: null,
      cashBookingUrl: bookingLinksFor(carrierCode, params).cash,
      awardBookingUrl: null,
      seatsLeft: null,
      provider: this.name,
    };
  }
}
