"use client";

import { useEffect, useRef, useState } from "react";
import type { Airline, Alliance } from "@/lib/alliances";

interface Props {
  value: string; // selected IATA code, or "" for any
  onChange: (code: string) => void;
  alliance: Alliance | "any"; // narrows the searchable pool
}

export function AirlineInput({ value, onChange, alliance }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Airline | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hydrate label for an externally-set code.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.code === value) return;
    let active = true;
    fetch(`/api/airlines?code=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((d) => active && d.airlines?.[0] && setSelected(d.airlines[0]))
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced search, scoped to the chosen alliance.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ q: query, alliance });
      fetch(`/api/airlines?${qs.toString()}`)
        .then((r) => r.json())
        .then((d) => active && setResults(d.airlines ?? []))
        .catch(() => {})
        .finally(() => active && setLoading(false));
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open, alliance]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(code: string, airline: Airline | null) {
    setSelected(airline);
    onChange(code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        Airline
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-left transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <span className="truncate text-sm">
          {selected ? (
            <span className="font-medium text-white">{selected.name}</span>
          ) : (
            <span className="text-slate-400">Any airline</span>
          )}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-slate-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-2xl shadow-black/50">
          <div className="border-b border-white/5 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search airlines…"
              className="w-full rounded-lg bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => pick("", null)}
                className="flex w-full items-center px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
              >
                Any airline
              </button>
            </li>
            {loading && results.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">Searching…</li>
            )}
            {!loading && results.length === 0 && query && (
              <li className="px-3 py-3 text-sm text-slate-500">No matches</li>
            )}
            {results.map((a) => (
              <li key={a.code}>
                <button
                  type="button"
                  onClick={() => pick(a.code, a)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-white">
                      {a.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {a.alliance !== "none"
                        ? `${a.program}`
                        : a.country || "Non-aligned"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-xs font-semibold text-brand-300">
                    {a.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
