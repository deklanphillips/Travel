"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AirportInput } from "./AirportInput";
import { AirlineInput } from "./AirlineInput";
import { DealCard } from "./DealCard";
import { AlertForm } from "./AlertForm";
import {
  CABIN_LABELS,
  countDeals,
  flagDeals,
  sortDeals,
  type SortKey,
} from "@/lib/format";
import { useEntitlement } from "@/lib/entitlement";
import { ALL_CARDS, cardsForProgram, type CardName } from "@/data/transferPartners";
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
  const [anywhere, setAnywhere] = useState(false);
  const [tripType, setTripType] = useState<"oneway" | "roundtrip">("oneway");
  const [dateMode, setDateMode] = useState<"exact" | "month">("exact");
  const [departDate, setDepartDate] = useState(todayPlus(30));
  const [returnDate, setReturnDate] = useState(todayPlus(37));
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<CabinClass>("business");
  const [alliance, setAlliance] = useState<AllianceFilter>("any");
  const [airline, setAirline] = useState("");

  // Switch the date inputs between exact day (YYYY-MM-DD) and whole month (YYYY-MM).
  function changeDateMode(mode: "exact" | "month") {
    setDateMode(mode);
    if (mode === "month") {
      setDepartDate((d) => d.slice(0, 7));
      setReturnDate((d) => d.slice(0, 7));
    } else {
      setDepartDate((d) => (d.length === 7 ? `${d}-15` : d));
      setReturnDate((d) => (d.length === 7 ? `${d}-15` : d));
    }
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [sort, setSort] = useState<SortKey>("best");
  const [dealsOnly, setDealsOnly] = useState(false);
  const [payType, setPayType] = useState<"all" | "cash" | "miles">("all");
  const [cardFilter, setCardFilter] = useState<"all" | CardName>("all");
  const [showAlert, setShowAlert] = useState(false);

  // Which results are deals (below the route's typical price).
  const dealFlags = useMemo(
    () => (response ? flagDeals(response.deals) : new Map()),
    [response],
  );
  const dealCount = useMemo(() => countDeals(dealFlags), [dealFlags]);

  // Counts so the Cash/Miles toggle can show how many of each are available.
  // Presence-based: a merged card (cash + miles) counts in BOTH.
  const cashCount = useMemo(
    () => (response?.deals ?? []).filter((d) => d.cashPrice !== null).length,
    [response],
  );
  const milesCount = useMemo(
    () => (response?.deals ?? []).filter((d) => d.award !== null).length,
    [response],
  );

  const sortedDeals: Deal[] = useMemo(() => {
    if (!response) return [];
    let list = response.deals;
    // Filter by pay type so miles deals aren't buried under cheap cash fares.
    if (payType === "cash") list = list.filter((d) => d.cashPrice !== null);
    else if (payType === "miles") list = list.filter((d) => d.award !== null);
    // "I have <card> points" — keep cash, plus award space that card transfers to.
    if (cardFilter !== "all") {
      list = list.filter(
        (d) =>
          d.cashPrice !== null ||
          (d.award && cardsForProgram(d.award.programCode).includes(cardFilter)),
      );
    }
    const sorted = sortDeals(list, payType === "miles" ? "miles" : sort);
    if (dealsOnly && isPro) {
      return sorted.filter((d) => dealFlags.get(d.id)?.isDeal);
    }
    return sorted;
  }, [response, sort, dealsOnly, isPro, dealFlags, payType, cardFilter]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    setResponse(null);
    try {
      const qs = new URLSearchParams({
        origin,
        destination: anywhere ? "" : destination,
        departDate,
        passengers: String(passengers),
        cabin,
        alliance,
      });
      if (tripType === "roundtrip") qs.set("returnDate", returnDate);
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
        className="overflow-hidden rounded-3xl border border-white/10 bg-ink-800/70 shadow-2xl shadow-black/40 backdrop-blur"
      >
        {/* Search / Explore tabs */}
        <div className="flex border-b border-white/10 text-sm font-semibold">
          <span className="flex flex-1 items-center justify-center gap-2 bg-brand-500 px-4 py-3.5 text-white">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.329 3.328a.75.75 0 11-1.061 1.061l-3.328-3.329A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            Search
          </span>
          <Link
            href="/explore"
            className="flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-.943-.943l-3.5 1.167a.75.75 0 00-.474.474l-1.167 3.5a.75.75 0 00.943.943l3.5-1.167a.75.75 0 00.474-.474l1.167-3.5zM10 11a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
            </svg>
            Explore
          </Link>
        </div>

        <div className="p-4 sm:p-6">
        {/* Trip type / date mode / anywhere toggles */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white/5 p-1 text-xs font-medium">
            {(["oneway", "roundtrip"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTripType(t)}
                className={`rounded-full px-3 py-1.5 transition ${
                  tripType === t ? "bg-white text-ink-900" : "text-slate-300 hover:text-white"
                }`}
              >
                {t === "oneway" ? "One-way" : "Round-trip"}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-white/5 p-1 text-xs font-medium">
            {(["exact", "month"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeDateMode(m)}
                className={`rounded-full px-3 py-1.5 transition ${
                  dateMode === m ? "bg-white text-ink-900" : "text-slate-300 hover:text-white"
                }`}
              >
                {m === "exact" ? "Exact dates" : "Whole month"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAnywhere((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              anywhere ? "bg-brand-500 text-white" : "bg-white/5 text-slate-300 hover:text-white"
            }`}
          >
            🌍 Anywhere
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AirportInput label="From" value={origin} onChange={setOrigin} />

          {anywhere ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                To
              </label>
              <div className="flex h-[50px] items-center rounded-xl border border-brand-400/40 bg-brand-500/10 px-3.5 text-sm font-medium text-brand-200">
                🌍 Anywhere
              </div>
            </div>
          ) : (
            <AirportInput label="To" value={destination} onChange={setDestination} />
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {dateMode === "month" ? "Depart month" : "Depart"}
            </label>
            <input
              type={dateMode === "month" ? "month" : "date"}
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-3 text-sm text-white transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
            />
          </div>

          {tripType === "roundtrip" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                {dateMode === "month" ? "Return month" : "Return"}
              </label>
              <input
                type={dateMode === "month" ? "month" : "date"}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-3 text-sm text-white transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
              />
            </div>
          ) : (
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
          )}
        </div>

        {tripType === "roundtrip" && (
          <div className="mt-3 sm:w-1/2 lg:w-1/4">
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
        )}

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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
            {!loading && (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.329 3.328a.75.75 0 11-1.061 1.061l-3.328-3.329A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
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
                flights · {origin} → {destination}
                {response.provider === "mock" && (
                  <span className="ml-2 rounded bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                    sample data
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {/* Price-drop alert (Pro) */}
                <button
                  onClick={() =>
                    isPro ? setShowAlert((v) => !v) : startCheckout()
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  🔔 Alert me
                  {!isPro && (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                {/* Deals-only filter (Pro) */}
                <button
                  onClick={() => (isPro ? setDealsOnly((v) => !v) : startCheckout())}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    dealsOnly && isPro
                      ? "bg-emerald-500 text-white"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  🔥 Deals{dealCount ? ` (${dealCount})` : ""}
                  {!isPro && (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                {milesCount > 0 && (
                  <select
                    value={cardFilter}
                    onChange={(e) => setCardFilter(e.target.value as "all" | CardName)}
                    className="rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    title="Show award space your card transfers to"
                  >
                    <option value="all">All points</option>
                    {ALL_CARDS.map((c) => (
                      <option key={c} value={c}>
                        {c} points
                      </option>
                    ))}
                  </select>
                )}
                {milesCount > 0 && (
                  <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 text-xs">
                    {([
                      ["all", `All (${cashCount + milesCount})`],
                      ["cash", `Cash (${cashCount})`],
                      ["miles", `Miles (${milesCount})`],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setPayType(key)}
                        className={`rounded-full px-3 py-1.5 font-medium transition ${
                          payType === key
                            ? "bg-white text-ink-900"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
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
            </div>

            {showAlert && isPro && (
              <AlertForm
                origin={origin}
                destination={anywhere ? "" : destination}
                cabin={cabin}
                departDate={departDate}
                returnDate={tripType === "roundtrip" ? returnDate : undefined}
                onClose={() => setShowAlert(false)}
              />
            )}

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
                {locked && dealCount > 0 && (
                  <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
                        🔥
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {dealCount} deal{dealCount > 1 ? "s" : ""} found on this route
                        </p>
                        <p className="text-sm text-slate-400">
                          Go Pro to see which flights are priced below normal — and
                          get alerted when prices drop.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={startCheckout}
                      className="w-full shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-95 sm:w-auto"
                    >
                      Unlock deals
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {sortedDeals.map((deal, i) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      isBest={sort === "best" && i === 0}
                      dealFlag={dealFlags.get(deal.id)}
                      proLocked={locked}
                      onUpgrade={startCheckout}
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
