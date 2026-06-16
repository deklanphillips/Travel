import type { FlightProvider } from "@/lib/types";
import { MockProvider } from "./mock";
import { DuffelProvider } from "./duffel";

// Selects the active flight data provider based on environment configuration.
// Falls back to the mock provider (zero setup) if credentials are missing.
export function getProvider(): FlightProvider {
  const choice = (process.env.FLIGHT_PROVIDER ?? "mock").toLowerCase();

  if (choice === "duffel") {
    const token = process.env.DUFFEL_API_TOKEN;
    if (!token) {
      console.warn(
        "[providers] FLIGHT_PROVIDER=duffel but DUFFEL_API_TOKEN missing — falling back to mock.",
      );
      return new MockProvider();
    }
    return new DuffelProvider(token);
  }

  return new MockProvider();
}
