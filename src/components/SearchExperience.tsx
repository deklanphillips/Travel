"use client";

import { useMemo, useState } from "react";
import { AirportInput } from "./AirportInput";
import { AirlineInput } from "./AirlineInput";
import { DealCard } from "./DealCard";
import { CABIN_LABELS, sortDeals, type SortKey } from "@/lib/format";
import { useEntitlement } from "@/lib/entitlement";
import type {
  AllianceFilter,
  CabinClass,
  Deal,
  SearchResponse,
} from "@/lib/types";

const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

const ALLIANCES: { key: AllianceFilter; label: string }[] = [
  { key: "any", label: "Any alliance" },
  { key: "star", label: "Star Alliance" },
  { key: "oneworld", label: "Oneworld" },
  { key: "skyteam", label: "SkyTeam" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Best value" },
  { key: "cash", label: "Cheapest cash" },
  { key: "miles", label: "Fewest miles" },
  { key: "duration", label: "Shortest" },
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SearchExperience() {
  const { isPro, startCheckout } = useEntitlement();
  const locked = !isPro;
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LHR");
  const [departDate, setDepartDate] = useState(todayPlus(30));
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<CabinClass>("business");
  const [alliance, setAlliance] = useState<AllianceFilter>("any");
  const [airline, setAirline] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [sort, setSort] = useState<SortKey>("best");

  const sortedDeals: Deal[] = useMemo(() => {
    if (!response) return [];
    return sortDeals(response.deals, sort);
  }, [response, sort]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    setResponse(null);
    try {
      const qs = new URLSearchParams({
        origin,
        destination,
        departDate,
        passengers: String(passengers),
        cabin,
        alliance,
      });
      if (airline) qs.set("airline", airline);
      const res = await fetch(`/api/search?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.error || "Search failed");
      }
      setResponse(json as SearchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function changeAlliance(next: AllianceFilter) {
    setAlliance(next);
    // Reset the specific-airline filter when the alliance scope changes.
    setAirline("");
  }

  return (
    <div id="search" className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      {/* Search card */}
      <form
        onSubmit={runSearch}
        className="rounded-3xl border border-white/10 bg-ink-800/70 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-6"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AirportInput label="From" value={origin} onChange={setOrigin} />
          <AirportInput label="To" value={destination} onChange={setDestination} />

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Depart
            </label>
            <input
              type="date"
              value={departDate}
              min={todayPlus(0)}
              onChange={(e) => setDepartDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-3 text-sm text-white transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Passengers
            </label>
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-3 text-sm text-white transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "passenger" : "passengers"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CABINS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCabin(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                cabin === c
                  ? "bg-white text-ink-900"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {CABIN_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Alliance + airline filters */}
        <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Alliance
            </label>
            <div className="flex flex-wrap gap-2">
              {ALLIANCES.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => changeAlliance(a.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    alliance === a.key
                      ? "bg-brand-500 text-white"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:w-60">
            <AirlineInput value={airline} onChange={setAirline} alliance={alliance} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search deals"}
            {!loading && (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="mt-8">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && <ResultsSkeleton />}

        {response && !loading && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-white">
                  {response.deals.length}
                </span>{" "}
                deals · {origin} → {destination}
                {response.provider === "mock" && (
                  <span className="ml-2 rounded bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                    sample data
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 text-xs">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={`rounded-full px-3 py-1.5 font-medium transition ${
                      sort === opt.key
                        ? "bg-white text-ink-900"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {sortedDeals.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-ink-800/40 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-300">
                  No flights found for this search.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try different dates, a nearby airport, or loosen the alliance
                  and airline filters.
                </p>
              </div>
            ) : (
              <>
                {locked && (
                  <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-brand-400/30 bg-gradient-to-r from-brand-500/10 to-purple-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Prices are hidden
                        </p>
                        <p className="text-sm text-slate-400">
                          Go Pro to reveal every fare and book in one tap.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={startCheckout}
                      className="w-full shrink-0 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:opacity-95 sm:w-auto"
                    >
                      Unlock all prices
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {sortedDeals.map((deal, i) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      isBest={sort === "best" && i === 0}
                      locked={locked}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-white/5 bg-ink-800/40"
        />
      ))}
    </div>
  );
}
