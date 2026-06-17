import type { AwardSource } from "./types";
import { SeatsAeroSource } from "./seatsaero";

// Selects the active award (miles) data source from environment configuration.
// Returns null when no award source is configured (cash-only mode).
//
// AWARD_PROVIDER=seatsaero requires SEATS_AERO_API_KEY. Note seats.aero's API
// is personal/non-commercial use only unless you have their written approval.
export function getAwardSource(): AwardSource | null {
  const choice = (process.env.AWARD_PROVIDER ?? "").toLowerCase();

  if (choice === "seatsaero") {
    const key = process.env.SEATS_AERO_API_KEY;
    if (!key) {
      console.warn(
        "[award] AWARD_PROVIDER=seatsaero but SEATS_AERO_API_KEY missing — miles disabled.",
      );
      return null;
    }
    return new SeatsAeroSource(key);
  }

  return null;
}
