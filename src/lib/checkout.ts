import type { Deal, SearchParams } from "@/lib/types";

// The selected deal + trip context is passed from the results page to the
// checkout page via sessionStorage (deals are generated on demand and not
// persisted server-side, so there's nothing to re-fetch by id).

export interface CheckoutData {
  deal: Deal;
  params: SearchParams;
}

const KEY = "pointfare:checkout";

export function saveCheckout(data: CheckoutData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // sessionStorage can throw in private mode / when full — non-fatal.
  }
}

export function loadCheckout(): CheckoutData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CheckoutData) : null;
  } catch {
    return null;
  }
}
