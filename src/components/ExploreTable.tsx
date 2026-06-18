"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { REGIONS } from "@/data/programs";
import { formatMiles } from "@/lib/format";
import { useEntitlement } from "@/lib/entitlement";
import { DaysSelect } from "./DaysSelect";

interface CabinInfo {
  miles: number;
  seats: number;
  direct: boolean;
  airlines: string;
}
type CabinKey = "economy" | "premium" | "business" | "first";
type SortKey = "date" | "lastSeen" | CabinKey;

interface Row {
  id: string;
  date: string;
  lastSeen: string;
  origin: string;
  destination: string;
  cabins: Record<CabinKey, CabinInfo | null>;
  airlines: string[];
}

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
  const { isPro, startCheckout } = useEntitlement();

  const [originRegion, setOriginRegion] = useState("North America");
  const [destRegion, setDestRegion] = useState("");
  const [days, setDays] = useState(90);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cabin, setCabin] = useState<"" | CabinKey>("");
  const [departs, setDeparts] = useState("");
  const [arrives, setArrives] = useState("");
  const [maxPoints, setMaxPoints] = useState("");
  const [airline, setAirline] = useState("");
  const [stops, setStops] = useState<"" | "nonstop">("");
  const [minSeats, setMinSeats] = useState("");
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

  function onDaysChange(val: number) {
    if (val === 365 && !isPro) {
      startCheckout(); // upgrade to unlock a full year
      return;
    }
    setDays(val);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "lastSeen" ? "desc" : "asc");
    }
  }

  // Airlines present in the loaded data (for the Airlines dropdown).
  const allAirlines = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.airlines.forEach((a) => s.add(a)));
    return [...s].sort();
  }, [rows]);

  const view = useMemo(() => {
    if (!rows) return [];
    const max = Number(maxPoints) || 0;
    const seatsMin = Number(minSeats) || 0;
    const cabinsOf = (r: Row): CabinInfo[] =>
      cabin ? [r.cabins[cabin]].filter((c): c is CabinInfo => !!c)
            : (Object.values(r.cabins).filter((c): c is CabinInfo => !!c));

    let v = rows.filter((r) => {
      if (cabin && !r.cabins[cabin]) return false;
      if (departs && !r.origin.startsWith(departs.toUpperCase())) return false;
      if (arrives && !r.destination.startsWith(arrives.toUpperCase())) return false;
      const cs = cabinsOf(r);
      if (cs.length === 0) return false;
      if (airline && !cs.some((c) => c.airlines.includes(airline))) return false;
      if (stops === "nonstop" && !cs.some((c) => c.direct)) return false;
      if (max > 0 && Math.min(...cs.map((c) => c.miles)) > max) return false;
      if (seatsMin > 0 && Math.max(...cs.map((c) => c.seats)) < seatsMin) return false;
      return true;
    });

    v = [...v].sort((a, b) => {
      if (sortKey === "date")
        return sortDir === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      if (sortKey === "lastSeen") {
        const av = new Date(a.lastSeen).getTime();
        const bv = new Date(b.lastSeen).getTime();
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = a.cabins[sortKey]?.miles ?? null;
      const bv = b.cabins[sortKey]?.miles ?? null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return v;
  }, [rows, cabin, departs, arrives, maxPoints, airline, stops, minSeats, sortKey, sortDir]);

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");
  const pill =
    "rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const hasFilters = departs || arrives || cabin || maxPoints || airline || stops || minSeats;

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DaysSelect value={days} onSelect={onDaysChange} />
        <input value={departs} onChange={(e) => setDeparts(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="Departs" className={`${pill} w-24 uppercase placeholder:normal-case placeholder:text-slate-500`} />
        <input value={arrives} onChange={(e) => setArrives(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="Arrives" className={`${pill} w-24 uppercase placeholder:normal-case placeholder:text-slate-500`} />
        <select value={cabin} onChange={(e) => setCabin(e.target.value as "" | CabinKey)} className={pill}>
          <option value="">All cabins</option>
          {CABIN_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={airline} onChange={(e) => setAirline(e.target.value)} className={pill}>
          <option value="">All airlines</option>
          {allAirlines.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={stops} onChange={(e) => setStops(e.target.value as "" | "nonstop")} className={pill}>
          <option value="">Direct + stops</option>
          <option value="nonstop">Nonstop only</option>
        </select>
        <input value={minSeats} onChange={(e) => setMinSeats(e.target.value.replace(/\D/g, ""))}
          placeholder="Min seats" className={`${pill} w-24 placeholder:text-slate-500`} />
        <input value={maxPoints} onChange={(e) => setMaxPoints(e.target.value.replace(/\D/g, ""))}
          placeholder="Max points" className={`${pill} w-28 placeholder:text-slate-500`} />
        {hasFilters && (
          <button
            onClick={() => { setDeparts(""); setArrives(""); setCabin(""); setMaxPoints(""); setAirline(""); setStops(""); setMinSeats(""); }}
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
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3"><button onClick={() => toggleSort("date")} className="hover:text-white">Date{arrow("date")}</button></th>
                <th className="px-4 py-3"><button onClick={() => toggleSort("lastSeen")} className="hover:text-white">Last seen{arrow("lastSeen")}</button></th>
                <th className="px-4 py-3">Departs</th>
                <th className="px-4 py-3">Arrives</th>
                {CABIN_COLS.map((c) => (
                  <th key={c.label} className="px-4 py-3">
                    <button onClick={() => toggleSort(c.key)} className="hover:text-white">{c.label}{arrow(c.key)}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {view.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="text-slate-200 transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(r.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{ago(r.lastSeen)}</td>
                  <td className="px-4 py-3"><Link href={`/explore/${source}/departing/${r.origin}`} className="font-medium text-brand-300 hover:underline">{r.origin}</Link></td>
                  <td className="px-4 py-3"><Link href={`/explore/${source}/arriving/${r.destination}`} className="font-medium text-brand-300 hover:underline">{r.destination}</Link></td>
                  {CABIN_COLS.map((c) => {
                    const ci = r.cabins[c.key];
                    return (
                      <td key={c.label} className="px-4 py-3 align-top">
                        {ci ? (
                          <>
                            <a href={`/api/award/book?id=${encodeURIComponent(r.id)}`} target="_blank" rel="noopener noreferrer"
                              title="Book on the program's site"
                              className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30">
                              {formatMiles(ci.miles)} pts<span aria-hidden className="text-[9px]">↗</span>
                            </a>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {ci.seats > 0 ? `${ci.seats} seat${ci.seats > 1 ? "s" : ""} · ` : ""}
                              {ci.direct ? "nonstop" : "1+ stop"}
                            </div>
                          </>
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
        <Link href="/" className="text-brand-300 hover:text-brand-200">Search it on the home page</Link>{" "}
        for cash and miles side by side.
      </p>
    </div>
  );
}
