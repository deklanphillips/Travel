"use client";

import { useState } from "react";
import { formatMiles, formatUSD } from "@/lib/format";

interface AwardFlight {
  flightNumbers: string;
  departsAt: string;
  arrivesAt: string;
  durationMinutes: number;
  stops: number;
  connections: string[];
  aircraft: string[];
  miles: number;
  fees: number;
}

interface Props {
  availabilityId: string;
  cabin: string;
  cashCompare: number | null;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function AwardFlights({ availabilityId, cabin, cashCompare }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<AwardFlight[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (flights || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/award/trips?id=${encodeURIComponent(availabilityId)}&cabin=${cabin}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load flights");
      setFlights(json.flights as AwardFlight[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load flights");
    } finally {
      setLoading(false);
    }
  }

  const cpm = (miles: number, fees: number) =>
    cashCompare !== null && miles > 0 ? ((cashCompare - fees) / miles) * 100 : null;

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        type="button"
        onClick={toggle}
        className="text-xs font-semibold text-brand-300 transition hover:text-brand-200"
      >
        {open ? "Hide flights ▲" : "View flights ▾"}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {loading && <p className="text-xs text-slate-500">Loading flights…</p>}
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {flights && flights.length === 0 && (
            <p className="text-xs text-slate-500">No flight details available.</p>
          )}
          {flights?.map((f, i) => {
            const value = cpm(f.miles, f.fees);
            return (
              <div
                key={`${f.flightNumbers}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-ink-900/40 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-200">
                    {fmtTime(f.departsAt)} → {fmtTime(f.arrivesAt)}
                  </div>
                  <div className="truncate text-slate-500">
                    {f.flightNumbers} ·{" "}
                    {f.stops === 0
                      ? "Nonstop"
                      : `${f.stops} stop${f.stops > 1 ? "s" : ""}${
                          f.connections.length ? ` (${f.connections.join(", ")})` : ""
                        }`}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold text-white">{formatMiles(f.miles)} mi</div>
                  <div className="text-slate-500">
                    + {formatUSD(f.fees)}
                    {value !== null ? ` · ${value.toFixed(1)}¢/mi` : ""}
                  </div>
                </div>
              </div>
            );
          })}
          {flights && flights.length > 0 && cashCompare !== null && (
            <p className="pt-1 text-[11px] text-slate-500">
              Cash benchmark for this route: ~{formatUSD(cashCompare)} (cheapest fare). Per-flight
              cash pricing needs a flight-level fare API.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
