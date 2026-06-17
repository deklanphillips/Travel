import type { CabinClass } from "@/lib/types";
import type { AwardAvailability, AwardQuery, AwardSource } from "./types";

// Aeroplan (Air Canada) award-availability scraper — our first program because
// it doesn't require a logged-in account to search award space.
//
// HOW THIS WORKS (and what's left to wire up):
//   Air Canada's award search page calls an internal JSON availability endpoint.
//   The exact URL + headers must be captured from the browser DevTools "Network"
//   tab while doing a real Aeroplan award search (it changes periodically, and
//   includes anti-bot headers). Drop the captured request into `fetchRaw` below.
//
// PRODUCTION NOTES:
//   - Air Canada sits behind Akamai bot protection. From a plain server IP this
//     will often be challenged/blocked. Real operation needs residential/rotating
//     proxies (e.g. a proxy provider) and human-like headers.
//   - Never run this live per user request. A scheduled job scrapes popular
//     routes/dates and writes results to the DB cache; the app reads the cache.

const AEROPLAN_CABIN: Record<CabinClass, string> = {
  economy: "eco",
  premium_economy: "ecoPremium",
  business: "business",
  first: "first",
};

interface RawAeroplanBound {
  // Shape depends on the captured endpoint; filled in once the real response
  // is known. Kept minimal here so the mapping is obvious.
  segments: Array<{ marketingClass?: string }>;
}

export class AeroplanSource implements AwardSource {
  name = "Aeroplan";
  programCode = "AC";

  constructor(private proxyUrl?: string) {}

  async search(query: AwardQuery): Promise<AwardAvailability[]> {
    const raw = await this.fetchRaw(query);
    return this.map(raw, query);
  }

  // TODO: replace with the captured Aeroplan availability request.
  // Returns the raw availability payload for the route/date/cabin.
  private async fetchRaw(query: AwardQuery): Promise<unknown> {
    void AEROPLAN_CABIN[query.cabin];
    void this.proxyUrl;
    throw new Error(
      "AeroplanSource.fetchRaw not implemented — capture the live Aeroplan " +
        "availability endpoint (DevTools → Network) and wire it here, behind a proxy.",
    );
  }

  private map(_raw: unknown, _query: AwardQuery): AwardAvailability[] {
    // Map the raw payload into AwardAvailability[] once `fetchRaw` is wired.
    return [];
  }
}
