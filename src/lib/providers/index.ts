import type { FlightProvider } from "@/lib/types";
import { MockProvider } from "./mock";
import { DuffelProvider } from "./duffel";
import { TravelpayoutsProvider } from "./travelpayouts";
import { TravelpayoutsLiveProvider } from "./travelpayouts-live";

// Selects the active flight data provider based on environment configuration.
// Falls back to the mock provider (zero setup) if credentials are missing.
export function getProvider(): FlightProvider {
  const choice = (process.env.FLIGHT_PROVIDER ?? "mock").toLowerCase();

  if (choice === "travelpayouts-live") {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER;
    if (!token || !marker) {
      console.warn(
        "[providers] FLIGHT_PROVIDER=travelpayouts-live needs TRAVELPAYOUTS_TOKEN and TRAVELPAYOUTS_MARKER — falling back to mock.",
      );
      return new MockProvider();
    }
    return new TravelpayoutsLiveProvider(
      token,
      marker,
      process.env.TRAVELPAYOUTS_HOST ?? "localhost",
      process.env.TRAVELPAYOUTS_USER_IP ?? "127.0.0.1",
    );
  }

  if (choice === "travelpayouts") {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    if (!token) {
      console.warn(
        "[providers] FLIGHT_PROVIDER=travelpayouts but TRAVELPAYOUTS_TOKEN missing — falling back to mock.",
      );
      return new MockProvider();
    }
    return new TravelpayoutsProvider(
      token,
      process.env.TRAVELPAYOUTS_CURRENCY ?? "usd",
      process.env.TRAVELPAYOUTS_MARKET ?? "us",
    );
  }

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
