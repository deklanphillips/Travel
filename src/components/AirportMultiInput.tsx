"use client";

import { useEffect, useRef, useState } from "react";
import type { Airport } from "@/lib/airports";

interface Props {
  label: string;
  values: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  max?: number;
}

// Multi-select airport picker: type a city/airport/code, pick several; each
// shows as a rounded chip you can remove.
export function AirportMultiInput({
  label,
  values,
  onChange,
  placeholder,
  max = 3,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/airports?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => active && setResults(d.airports ?? []))
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function add(code: string) {
    const c = code.toUpperCase();
    if (!values.includes(c) && values.length < max) onChange([...values, c]);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }
  function remove(code: string) {
    onChange(values.filter((v) => v !== code));
  }

  const atMax = values.length >= max;

  return (
    <div className="relative" ref={wrapRef}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className="flex min-h-[50px] flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-ink-800 px-2.5 py-2 transition hover:border-white/20 focus-within:ring-2 focus-within:ring-brand-500"
      >
        {values.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 py-1 pl-2.5 pr-1.5 text-sm font-semibold text-white"
          >
            {code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(code);
              }}
              className="text-slate-400 transition hover:text-white"
              aria-label={`Remove ${code}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) add(results[0].code);
            } else if (e.key === "Backspace" && !query && values.length) {
              remove(values[values.length - 1]);
            }
          }}
          placeholder={atMax ? "" : values.length ? "Add another" : placeholder ?? "City or airport"}
          disabled={atMax}
          className="min-w-[90px] flex-1 bg-transparent py-1 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {open && !atMax && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-2xl shadow-black/50">
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
                  onClick={() => add(a.code)}
                  disabled={values.includes(a.code)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5 disabled:opacity-40"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-white">
                      {a.city} <span className="text-slate-500">· {a.name}</span>
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
