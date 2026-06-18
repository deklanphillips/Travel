"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { REGIONS } from "@/data/programs";
import { formatMiles } from "@/lib/format";

interface Row {
  id: string;
  date: string;
  lastSeen: string;
  origin: string;
  destination: string;
  economy: number | null;
  premium: number | null;
  business: number | null;
  first: number | null;
}

type CabinKey = "economy" | "premium" | "business" | "first";
type SortKey = "date" | "lastSeen" | CabinKey;

const CABIN_COLS: { key: CabinKey; label: string }[] = [
  { key: "economy", label: "Economy" },
  { key: "premium", label: "Premium" },
  { key: "business", label: "Business" },
  { key: "first", label: "First" },
];

const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export function ExploreTable({
  source,
  originAirport,
  destAirport,
}: {
  source: string;
  originAirport?: string;
  destAirport?: string;
}) {
  const airportMode = Boolean(originAirport || destAirport);
  const [originRegion, setOriginRegion] = useState("North America");
  const [destRegion, setDestRegion] = useState("");
  const [days, setDays] = useState(60);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters + sort (client-side over the fetched rows).
  const [cabin, setCabin] = useState<"" | CabinKey>("");
  const [departs, setDeparts] = useState("");
  const [arrives, setArrives] = useState("");
  const [maxPoints, setMaxPoints] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastSeen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ source, days: String(days) });
    if (airportMode) {
      if (originAirport) qs.set("originAirport", originAirport);
      if (destAirport) qs.set("destAirport", destAirport);
    } else {
      qs.set("originRegion", originRegion);
      if (destRegion) qs.set("destRegion", destRegion);
    }
    fetch(`/api/explore?${qs.toString()}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        if (!cancelled) setRows(json.rows as Row[]);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, originRegion, destRegion, days, originAirport, destAirport, airportMode]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "lastSeen" ? "desc" : "asc"); // cheapest/earliest first
    }
  }

  const view = useMemo(() => {
    if (!rows) return [];
    const max = Number(maxPoints) || 0;
    let v = rows.filter((r) => {
      if (cabin && r[cabin] == null) return false;
      if (departs && !r.origin.startsWith(departs.toUpperCase())) return false;
      if (arrives && !r.destination.startsWith(arrives.toUpperCase())) return false;
      if (max > 0) {
        const vals = (cabin ? [r[cabin]] : [r.economy, r.premium, r.business, r.first])
          .filter((x): x is number => x != null);
        const min = vals.length ? Math.min(...vals) : Infinity;
        if (min > max) return false;
      }
      return true;
    });
    v = [...v].sort((a, b) => {
      if (sortKey === "date") {
        return sortDir === "asc"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      }
      if (sortKey === "lastSeen") {
        const av = new Date(a.lastSeen).getTime();
        const bv = new Date(b.lastSeen).getTime();
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // unavailable always last
      if (bv == null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return v;
  }, [rows, cabin, departs, arrives, maxPoints, sortKey, sortDir]);

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const pill =
    "rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="mt-6">
      {!airportMode && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-400">Show flights from</span>
          <select value={originRegion} onChange={(e) => setOriginRegion(e.target.value)} className={pill}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-slate-400">to</span>
          <select value={destRegion} onChange={(e) => setDestRegion(e.target.value)} className={pill}>
            <option value="">Anywhere</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={pill}>
          {[30, 60, 90, 120].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
        <input
          value={departs}
          onChange={(e) => setDeparts(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="Departs"
          className={`${pill} w-24 uppercase placeholder:normal-case placeholder:text-slate-500`}
        />
        <input
          value={arrives}
          onChange={(e) => setArrives(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="Arrives"
          className={`${pill} w-24 uppercase placeholder:normal-case placeholder:text-slate-500`}
        />
        <select value={cabin} onChange={(e) => setCabin(e.target.value as "" | CabinKey)} className={pill}>
          <option value="">All cabins</option>
          {CABIN_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input
          value={maxPoints}
          onChange={(e) => setMaxPoints(e.target.value.replace(/\D/g, ""))}
          placeholder="Max points"
          className={`${pill} w-28 placeholder:text-slate-500`}
        />
        {(departs || arrives || cabin || maxPoints) && (
          <button
            onClick={() => { setDeparts(""); setArrives(""); setCabin(""); setMaxPoints(""); }}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading award space…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {rows && view.length === 0 && !loading && (
        <p className="text-sm text-slate-500">No award space matches these filters.</p>
      )}

      {view.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("date")} className="hover:text-white">
                    Date{arrow("date")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("lastSeen")} className="hover:text-white">
                    Last seen{arrow("lastSeen")}
                  </button>
                </th>
                <th className="px-4 py-3">Departs</th>
                <th className="px-4 py-3">Arrives</th>
                {CABIN_COLS.map((c) => (
                  <th key={c.label} className="px-4 py-3">
                    <button onClick={() => toggleSort(c.key)} className="hover:text-white">
                      {c.label}{arrow(c.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {view.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="text-slate-200 transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(r.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{ago(r.lastSeen)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/explore/${source}/departing/${r.origin}`} className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
                      {r.origin}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/explore/${source}/arriving/${r.destination}`} className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
                      {r.destination}
                    </Link>
                  </td>
                  {CABIN_COLS.map((c) => {
                    const v = r[c.key];
                    return (
                      <td key={c.label} className="px-4 py-3">
                        {v ? (
                          <a
                            href={`/api/award/book?id=${encodeURIComponent(r.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Book this on the program's site"
                            className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30 hover:text-emerald-200"
                          >
                            {formatMiles(v)} pts
                            <span aria-hidden className="text-[9px]">↗</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Showing {view.length} result{view.length === 1 ? "" : "s"}. Want cash prices for a date?{" "}
        <Link href="/" className="text-brand-300 hover:text-brand-200">
          Search it on the home page
        </Link>{" "}
        for cash and miles side by side.
      </p>
    </div>
  );
}
