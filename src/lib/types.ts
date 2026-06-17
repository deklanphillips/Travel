// Shared domain types for flight + award search.

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export type AllianceFilter = "any" | "star" | "oneworld" | "skyteam";

export interface SearchParams {
  origin: string; // IATA code, e.g. "JFK"
  destination: string; // IATA code, e.g. "LHR"
  departDate: string; // ISO date "YYYY-MM-DD"
  returnDate?: string; // optional ISO date for round trips
  passengers: number;
  cabin: CabinClass;
  alliance?: AllianceFilter; // restrict to an alliance ("any" = no filter)
  airline?: string; // restrict to a single carrier IATA code (overrides alliance)
}

export interface FlightSegment {
  from: string; // IATA
  to: string; // IATA
  departTime: string; // ISO datetime
  arriveTime: string; // ISO datetime
  carrier: string; // e.g. "British Airways"
  carrierCode: string; // e.g. "BA"
  flightNumber: string; // e.g. "178"
}

export interface AwardPricing {
  program: string; // loyalty program, e.g. "Avios"
  programCode: string; // short code, e.g. "BA"
  miles: number; // miles/points required
  fees: number; // cash co-pay (taxes & fees) in USD
}

export interface Deal {
  id: string;
  origin: string;
  destination: string;
  segments: FlightSegment[];
  stops: number;
  durationMinutes: number;
  cabin: CabinClass;
  cashPrice: number | null; // total cash price in USD, null if award-only
  award: AwardPricing | null; // best award option, null if cash-only
  cashBookingUrl: string | null; // deep link to airline cash booking, null if no cash
  awardBookingUrl: string | null; // deep link to airline award booking, null if no award
  seatsLeft: number | null;
  provider: string; // which data source produced this deal
  awardAvailabilityOnly?: boolean; // true for award-space rows (no specific flight/time)
}

export interface SearchResponse {
  params: SearchParams;
  deals: Deal[];
  provider: string;
  generatedAt: string;
}

export interface FlightProvider {
  name: string;
  search(params: SearchParams): Promise<Deal[]>;
}
