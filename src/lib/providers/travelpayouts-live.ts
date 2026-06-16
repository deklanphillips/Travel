import type {
  Deal,
  FlightProvider,
  FlightSegment,
  SearchParams,
} from "@/lib/types";
import { createHash } from "node:crypto";
import { getAirline } from "@/lib/alliances";
import { bookingLinksFor } from "@/lib/booking";
import { matchesFilters } from "./shared";

// LIVE real-time flight search via the Travelpayouts / Aviasales Flight Search
// API. Unlike the cached prices_for_dates endpoint, this performs a fresh live
// search and returns the full set of flights across airlines/agents.
//
// It's an asynchronous, signed API:
//   1. POST /v1/flight_search  (with an MD5 signature)  -> { search_id }
//   2. GET  /v1/flight_search_results?uuid=<id>  (poll until complete)
//
// Booking links point straight to the operating airline (via booking.ts).

const INIT_URL = "https://api.travelpayouts.com/v1/flight_search";
const RESULTS_URL = "https://api.travelpayouts.com/v1/flight_search_results";

const TRIP_CLASS: Record<SearchParams["cabin"], string> = {
  economy: "Y",
  premium_economy: "W",
  business: "C",
  first: "F",
};

interface TpFlight {
  departure: string;
  arrival: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  marketing_carrier: string;
  operating_carrier: string;
  number: string;
  duration?: number;
  local_departure_timestamp?: number;
  local_arrival_timestamp?: number;
}

interface TpProposal {
  terms: Record<string, { unified_price?: number; price?: number; currency?: string }>;
  segment: Array<{ flight: TpFlight[] }>;
  validating_carrier?: string;
}

interface TpChunk {
  search_id?: string;
  proposals?: TpProposal[];
}

export class TravelpayoutsLiveProvider implements FlightProvider {
  name = "travelpayouts-live";

  constructor(
    private token: string,
    private marker: string,
    private host = "localhost",
    private userIp = "127.0.0.1",
    private locale = "en",
  ) {}

  async search(params: SearchParams): Promise<Deal[]> {
    const searchId = await this.initSearch(params);
    const proposals = await this.collectResults(searchId);

    const deals = proposals
      .map((p) => this.toDeal(p, params))
      .filter((d): d is Deal => d !== null)
      .filter((d) => matchesFilters(d, params));

    // De-duplicate identical itineraries, keeping the cheapest.
    const byKey = new Map<string, Deal>();
    for (const d of deals) {
      const key = d.segments
        .map((s) => `${s.carrierCode}${s.flightNumber}`)
        .join("-");
      const existing = byKey.get(key);
      if (!existing || (d.cashPrice ?? Infinity) < (existing.cashPrice ?? Infinity)) {
        byKey.set(key, d);
      }
    }
    return [...byKey.values()];
  }

  private async initSearch(params: SearchParams): Promise<string> {
    const adults = params.passengers;
    const children = 0;
    const infants = 0;
    const tripClass = TRIP_CLASS[params.cabin];
    const segments = [
      {
        origin: params.origin,
        destination: params.destination,
        date: params.departDate,
      },
    ];
    if (params.returnDate) {
      segments.push({
        origin: params.destination,
        destination: params.origin,
        date: params.returnDate,
      });
    }

    // Signature: md5 of token + params joined by ":" in alphabetical key order.
    // host, locale, marker, passengers(adults,children,infants),
    // segments(date,destination,origin per segment), trip_class, user_ip.
    const segmentValues = segments
      .map((s) => `${s.date}:${s.destination}:${s.origin}`)
      .join(":");
    const signatureString = [
      this.token,
      this.host,
      this.locale,
      this.marker,
      adults,
      children,
      infants,
      segmentValues,
      tripClass,
      this.userIp,
    ].join(":");
    const signature = createHash("md5").update(signatureString).digest("hex");

    const res = await fetch(INIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        signature,
        marker: this.marker,
        host: this.host,
        user_ip: this.userIp,
        locale: this.locale,
        trip_class: tripClass,
        passengers: { adults, children, infants },
        segments,
      }),
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(
          "Live search API access not granted (Travelpayouts requires approval + 50k monthly active users). Use FLIGHT_PROVIDER=travelpayouts instead.",
        );
      }
      throw new Error(
        `Travelpayouts live init error ${res.status}: ${await res.text()}`,
      );
    }
    const json = (await res.json()) as { search_id?: string };
    if (!json.search_id) {
      throw new Error("Travelpayouts live: no search_id returned (check marker/signature).");
    }
    return json.search_id;
  }

  // Polls the results endpoint until the search completes (a chunk with no
  // proposals signals completion) or a time/attempt budget is exhausted.
  private async collectResults(searchId: string): Promise<TpProposal[]> {
    const proposals: TpProposal[] = [];
    const maxAttempts = 7;
    const deadline = Date.now() + 9_000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() > deadline) break;
      await sleep(attempt === 0 ? 800 : 1400);

      const res = await fetch(
        `${RESULTS_URL}?uuid=${encodeURIComponent(searchId)}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (!res.ok) continue;
      const chunks = (await res.json()) as TpChunk[];
      if (!Array.isArray(chunks)) continue;

      let complete = false;
      for (const chunk of chunks) {
        if (chunk.proposals && chunk.proposals.length) {
          proposals.push(...chunk.proposals);
        } else if (chunk.search_id && !chunk.proposals) {
          // Terminator chunk: search finished delivering results.
          complete = true;
        }
      }
      if (complete && proposals.length) break;
    }
    return proposals;
  }

  private toDeal(proposal: TpProposal, params: SearchParams): Deal | null {
    const flights = proposal.segment.flatMap((s) => s.flight ?? []);
    if (!flights.length) return null;

    const segments: FlightSegment[] = flights.map((f) => {
      const code = (f.marketing_carrier || f.operating_carrier || "").toUpperCase();
      return {
        from: f.departure,
        to: f.arrival,
        departTime: f.local_departure_timestamp
          ? new Date(f.local_departure_timestamp * 1000).toISOString()
          : `${f.departure_date}T${f.departure_time}:00`,
        arriveTime: f.local_arrival_timestamp
          ? new Date(f.local_arrival_timestamp * 1000).toISOString()
          : `${f.arrival_date}T${f.arrival_time}:00`,
        carrier: getAirline(code)?.name || code,
        carrierCode: code,
        flightNumber: String(f.number ?? ""),
      };
    });

    const first = flights[0];
    const last = flights[flights.length - 1];
    let durationMinutes = 0;
    if (first.local_departure_timestamp && last.local_arrival_timestamp) {
      durationMinutes = Math.round(
        (last.local_arrival_timestamp - first.local_departure_timestamp) / 60,
      );
    } else {
      durationMinutes = flights.reduce((sum, f) => sum + (f.duration ?? 0), 0);
    }

    // Cheapest term across agents.
    const price = Math.min(
      ...Object.values(proposal.terms).map(
        (t) => t.unified_price ?? t.price ?? Infinity,
      ),
    );
    if (!Number.isFinite(price)) return null;

    const carrierCode =
      (proposal.validating_carrier || segments[0].carrierCode).toUpperCase();
    const stops = Math.max(0, flights.length - proposal.segment.length);

    return {
      id: `tpl-${segments.map((s) => s.carrierCode + s.flightNumber).join("")}-${Math.round(price)}`,
      origin: params.origin,
      destination: params.destination,
      segments,
      stops,
      durationMinutes,
      cabin: params.cabin,
      cashPrice: Math.round(price),
      award: null,
      cashBookingUrl: bookingLinksFor(carrierCode, params).cash,
      awardBookingUrl: null,
      seatsLeft: null,
      provider: this.name,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
