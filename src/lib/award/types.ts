import type { CabinClass } from "@/lib/types";

// Award (miles) availability domain types. This is the data we cache from each
// loyalty program and surface alongside cash fares.

export interface AwardQuery {
  origin: string; // IATA
  destination: string; // IATA
  date: string; // YYYY-MM-DD
  cabin: CabinClass;
  passengers: number;
}

export interface AwardAvailability {
  program: string; // e.g. "Aeroplan"
  programCode: string; // e.g. "AC"
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  cabin: CabinClass;
  miles: number; // points required (per passenger)
  fees: number; // cash co-pay (taxes/fees) in USD
  seats: number | null; // seats available at this level, if known
  carrierCode: string; // operating/marketing carrier IATA
  lastSeen: string; // ISO timestamp this availability was observed
  source: string; // which scraper produced it
  availabilityId?: string; // source availability ID (for fetching booking links)
}

// A single loyalty program's award-search scraper. Each program implements this;
// results are written to the cache (DB) by a scheduled job, not fetched live
// per user request (too slow, and live scraping gets blocked).
export interface AwardSource {
  name: string; // human label, e.g. "Aeroplan"
  programCode: string; // e.g. "AC"
  search(query: AwardQuery): Promise<AwardAvailability[]>;
}
