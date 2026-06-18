"use client";

import { useEffect, useRef, useState } from "react";

const OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "Full year", pro: true },
] as const;

function ProBadge() {
  return (
    <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
      Pro
    </span>
  );
}

// Days range selector with a seats.aero-style "Full year — PRO" option.
export function DaysSelect({
  value,
  onSelect,
}: {
  value: number;
  onSelect: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 text-xs text-slate-200 transition hover:border-white/20"
      >
        {current?.label ?? `${value} days`}
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-44 rounded-xl border border-white/10 bg-ink-900/95 p-1 shadow-xl shadow-black/50 backdrop-blur">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-white/5 ${
                value === o.value ? "text-white" : "text-slate-300"
              }`}
            >
              <span>{o.label}</span>
              {"pro" in o && o.pro ? (
                <ProBadge />
              ) : value === o.value ? (
                <span className="text-brand-300">✓</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
