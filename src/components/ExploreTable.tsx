"use client";

import { useEffect, useState } from "react";
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

const CABIN_COLS: { key: keyof Row; label: string }[] = [
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

export function ExploreTable({ source }: { source: string }) {
  const [originRegion, setOriginRegion] = useState("North America");
  const [destRegion, setDestRegion] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ source, originRegion });
    if (destRegion) qs.set("destRegion", destRegion);
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
  }, [source, originRegion, destRegion]);

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-400">Show flights from</span>
        <select
          value={originRegion}
          onChange={(e) => setOriginRegion(e.target.value)}
          className="rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span className="text-slate-400">to</span>
        <select
          value={destRegion}
          onChange={(e) => setDestRegion(e.target.value)}
          className="rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Anywhere</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading award space…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {rows && rows.length === 0 && !loading && (
        <p className="text-sm text-slate-500">
          No award space found for this region in the next 60 days.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Departs</th>
                <th className="px-4 py-3">Arrives</th>
                {CABIN_COLS.map((c) => (
                  <th key={c.label} className="px-4 py-3">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r, i) => (
                <tr key={i} className="text-slate-200 transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(r.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {ago(r.lastSeen)}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.origin}</td>
                  <td className="px-4 py-3 font-medium">{r.destination}</td>
                  {CABIN_COLS.map((c) => {
                    const v = r[c.key] as number | null;
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
        Want cash prices for a specific date?{" "}
        <Link href="/" className="text-brand-300 hover:text-brand-200">
          Search it on the home page
        </Link>{" "}
        to see cash and miles side by side.
      </p>
    </div>
  );
}
