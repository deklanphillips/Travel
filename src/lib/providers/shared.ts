import type { Deal, SearchParams } from "@/lib/types";
import { allianceOf } from "@/lib/alliances";

// Parse an ISO-8601 duration like "PT13H35M" into total minutes.
export function parseIsoDuration(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
}

// Keeps only deals whose marketing carriers match the airline/alliance filter.
// Real-fare providers can't filter server-side, so we apply it after fetching.
export function matchesFilters(deal: Deal, params: SearchParams): boolean {
  const codes = deal.segments.map((s) => s.carrierCode);
  if (params.airline) {
    return codes.includes(params.airline);
  }
  if (params.alliance && params.alliance !== "any") {
    return codes.some((c) => allianceOf(c) === params.alliance);
  }
  return true;
}
