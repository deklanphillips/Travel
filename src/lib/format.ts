import type { CabinClass, Deal } from "@/lib/types";

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

export function formatMiles(miles: number): string {
  if (miles >= 1000) return `${(miles / 1000).toFixed(miles % 1000 === 0 ? 0 : 1)}k`;
  return String(miles);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type SortKey = "best" | "cash" | "miles" | "duration";

// "Value score" used for the default sort — lower is better.
// Treats 1 mile as ~1.4 cents of value (a common award redemption benchmark).
const CENTS_PER_MILE = 1.4;

export function dealValueScore(deal: Deal): number {
  const cash = deal.cashPrice ?? Infinity;
  const award = deal.award
    ? (deal.award.miles * CENTS_PER_MILE) / 100 + deal.award.fees
    : Infinity;
  return Math.min(cash, award);
}

export function sortDeals(deals: Deal[], key: SortKey): Deal[] {
  const copy = [...deals];
  switch (key) {
    case "cash":
      return copy.sort(
        (a, b) => (a.cashPrice ?? Infinity) - (b.cashPrice ?? Infinity),
      );
    case "miles":
      return copy.sort(
        (a, b) => (a.award?.miles ?? Infinity) - (b.award?.miles ?? Infinity),
      );
    case "duration":
      return copy.sort((a, b) => a.durationMinutes - b.durationMinutes);
    case "best":
    default:
      return copy.sort((a, b) => dealValueScore(a) - dealValueScore(b));
  }
}
