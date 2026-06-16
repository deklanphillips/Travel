"use client";

import { useEffect, useRef, useState } from "react";
import type { Airport } from "@/lib/airports";

interface Props {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

export function AirportInput({ label, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Airport | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hydrate the label for the initial / externally-set code.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.code === value) return;
    let active = true;
    fetch(`/api/airports?code=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.airports?.[0]) setSelected(d.airports[0]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced search as the user types.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/airports?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) setResults(d.airports ?? []);
        })
        .catch(() => {})
        .finally(() => active && setLoading(false));
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(airport: Airport) {
    setSelected(airport);
    onChange(airport.code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-ink-800 px-3.5 py-3 text-left transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {selected ? (
          <span className="flex items-baseline gap-2 overflow-hidden">
            <span className="text-base font-semibold text-white">
              {selected.code}
            </span>
            <span className="truncate text-sm text-slate-400">
              {selected.city}
            </span>
          </span>
        ) : (
          <span className="text-sm text-slate-500">
            {placeholder ?? "Select airport"}
          </span>
        )}
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
              placeholder="Search any city, airport, or code…"
              className="w-full rounded-lg bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {loading && results.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">Searching…</li>
            )}
            {!loading && results.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">No matches</li>
            )}
            {results.map((a) => (
              <li key={`${a.code}-${a.name}`}>
                <button
                  type="button"
                  onClick={() => pick(a)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-white">
                      {a.city}{" "}
                      <span className="text-slate-500">· {a.name}</span>
                    </span>
                    <span className="text-xs text-slate-500">{a.country}</span>
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
